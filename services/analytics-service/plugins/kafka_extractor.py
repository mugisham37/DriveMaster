"""Kafka data extraction utilities for Airflow."""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Iterator
from dataclasses import dataclass

import pandas as pd
from kafka import KafkaConsumer, TopicPartition
from kafka.errors import KafkaError
import structlog

from config.data_lake_config import KafkaConfig


logger = structlog.get_logger(__name__)


@dataclass
class ExtractionResult:
    """Result of Kafka data extraction."""
    topic: str
    partition: int
    records_extracted: int
    start_offset: int
    end_offset: int
    extraction_time: datetime
    data_frame: pd.DataFrame


class KafkaExtractor:
    """Extracts data from Kafka topics for analytics processing."""
    
    def __init__(self, config: KafkaConfig):
        self.config = config
        self.consumer: Optional[KafkaConsumer] = None
        
    def __enter__(self):
        """Context manager entry."""
        self._connect()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self._disconnect()
        
    def _connect(self) -> None:
        """Establish Kafka consumer connection."""
        try:
            consumer_config = {
                'bootstrap_servers': self.config.bootstrap_servers,
                'group_id': self.config.consumer_group_id,
                'auto_offset_reset': self.config.auto_offset_reset,
                'enable_auto_commit': self.config.enable_auto_commit,
                'max_poll_records': self.config.max_poll_records,
                'value_deserializer': lambda x: json.loads(x.decode('utf-8')),
                'key_deserializer': lambda x: x.decode('utf-8') if x else None,
            }
            
            # Add security configuration if provided
            if self.config.security_protocol != "PLAINTEXT":
                consumer_config.update({
                    'security_protocol': self.config.security_protocol,
                    'sasl_mechanism': self.config.sasl_mechanism,
                    'sasl_plain_username': self.config.sasl_username,
                    'sasl_plain_password': self.config.sasl_password,
                })
            
            self.consumer = KafkaConsumer(**consumer_config)
            logger.info("Connected to Kafka", servers=self.config.bootstrap_servers)
            
        except Exception as e:
            logger.error("Failed to connect to Kafka", error=str(e))
            raise
            
    def _disconnect(self) -> None:
        """Close Kafka consumer connection."""
        if self.consumer:
            self.consumer.close()
            self.consumer = None
            logger.info("Disconnected from Kafka")
    
    def extract_topic_data(
        self,
        topic: str,
        start_time: datetime,
        end_time: datetime,
        partition: Optional[int] = None
    ) -> List[ExtractionResult]:
        """
        Extract data from a Kafka topic within a time range.
        
        Args:
            topic: Kafka topic name
            start_time: Start time for data extraction
            end_time: End time for data extraction
            partition: Specific partition to extract from (None for all)
            
        Returns:
            List of extraction results per partition
        """
        if not self.consumer:
            raise RuntimeError("Kafka consumer not connected")
            
        try:
            # Get topic partitions
            partitions = self._get_topic_partitions(topic, partition)
            results = []
            
            for tp in partitions:
                result = self._extract_partition_data(tp, start_time, end_time)
                if result.records_extracted > 0:
                    results.append(result)
                    
            logger.info(
                "Completed topic extraction",
                topic=topic,
                partitions=len(partitions),
                total_records=sum(r.records_extracted for r in results)
            )
            
            return results
            
        except Exception as e:
            logger.error("Failed to extract topic data", topic=topic, error=str(e))
            raise
    
    def _get_topic_partitions(self, topic: str, partition: Optional[int]) -> List[TopicPartition]:
        """Get topic partitions to process."""
        if partition is not None:
            return [TopicPartition(topic, partition)]
        
        # Get all partitions for the topic
        metadata = self.consumer.list_consumer_group_offsets()
        topic_partitions = []
        
        # Get partition info from cluster metadata
        cluster_metadata = self.consumer.list_consumer_groups()
        partitions_info = self.consumer.partitions_for_topic(topic)
        
        if partitions_info:
            for partition_id in partitions_info:
                topic_partitions.append(TopicPartition(topic, partition_id))
        
        return topic_partitions
    
    def _extract_partition_data(
        self,
        topic_partition: TopicPartition,
        start_time: datetime,
        end_time: datetime
    ) -> ExtractionResult:
        """Extract data from a specific partition within time range."""
        
        # Assign partition to consumer
        self.consumer.assign([topic_partition])
        
        # Find offsets for time range
        start_timestamp = int(start_time.timestamp() * 1000)
        end_timestamp = int(end_time.timestamp() * 1000)
        
        # Get offset for start time
        start_offsets = self.consumer.offsets_for_times({
            topic_partition: start_timestamp
        })
        start_offset = start_offsets[topic_partition].offset if start_offsets[topic_partition] else 0
        
        # Get offset for end time
        end_offsets = self.consumer.offsets_for_times({
            topic_partition: end_timestamp
        })
        end_offset = end_offsets[topic_partition].offset if end_offsets[topic_partition] else None
        
        # Seek to start offset
        self.consumer.seek(topic_partition, start_offset)
        
        # Extract records
        records = []
        current_offset = start_offset
        
        while True:
            message_batch = self.consumer.poll(timeout_ms=5000, max_records=self.config.max_poll_records)
            
            if not message_batch:
                break
                
            for tp, messages in message_batch.items():
                for message in messages:
                    # Check if we've reached the end time
                    if end_offset and message.offset >= end_offset:
                        break
                        
                    # Process message
                    record = self._process_message(message)
                    if record:
                        records.append(record)
                    
                    current_offset = message.offset + 1
                    
                if end_offset and current_offset >= end_offset:
                    break
        
        # Convert to DataFrame
        df = pd.DataFrame(records) if records else pd.DataFrame()
        
        return ExtractionResult(
            topic=topic_partition.topic,
            partition=topic_partition.partition,
            records_extracted=len(records),
            start_offset=start_offset,
            end_offset=current_offset - 1,
            extraction_time=datetime.utcnow(),
            data_frame=df
        )
    
    def _process_message(self, message) -> Optional[Dict[str, Any]]:
        """Process a Kafka message into a record."""
        try:
            record = {
                'offset': message.offset,
                'partition': message.partition,
                'timestamp': datetime.fromtimestamp(message.timestamp / 1000),
                'key': message.key,
                **message.value  # Unpack the JSON payload
            }
            
            return record
            
        except Exception as e:
            logger.warning(
                "Failed to process message",
                offset=message.offset,
                partition=message.partition,
                error=str(e)
            )
            return None
    
    def get_topic_lag(self, topic: str) -> Dict[int, int]:
        """Get consumer lag for each partition of a topic."""
        if not self.consumer:
            raise RuntimeError("Kafka consumer not connected")
            
        partitions = self._get_topic_partitions(topic, None)
        lag_info = {}
        
        for tp in partitions:
            # Get current offset
            current_offsets = self.consumer.committed(tp)
            current_offset = current_offsets if current_offsets else 0
            
            # Get high water mark (latest offset)
            end_offsets = self.consumer.end_offsets([tp])
            end_offset = end_offsets[tp]
            
            lag = end_offset - current_offset
            lag_info[tp.partition] = lag
            
        return lag_info