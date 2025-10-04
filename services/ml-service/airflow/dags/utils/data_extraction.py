"""
Data extraction utilities for ML training pipeline

This module provides utilities for extracting training data from Kafka topics
and data lake storage, with proper error handling and data validation.

Requirements: 6.5, 11.5
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import boto3
from kafka import KafkaConsumer, TopicPartition
from kafka.errors import KafkaError
import pyarrow.parquet as pq
import pyarrow as pa
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class KafkaDataExtractor:
    """
    Extracts training data from Kafka topics with time-based filtering
    """
    
    def __init__(self, bootstrap_servers: str, consumer_group_prefix: str = "ml_training"):
        self.bootstrap_servers = bootstrap_servers
        self.consumer_group_prefix = consumer_group_prefix
        
    def extract_topic_data(
        self,
        topic: str,
        start_time: datetime,
        end_time: datetime,
        run_id: str,
        max_records: int = 100000
    ) -> List[Dict[str, Any]]:
        """
        Extract data from a specific Kafka topic within time range
        
        Args:
            topic: Kafka topic name
            start_time: Start of extraction window
            end_time: End of extraction window
            run_id: Unique run identifier for consumer group
            max_records: Maximum number of records to extract
            
        Returns:
            List of extracted records
        """
        consumer_group = f"{self.consumer_group_prefix}_{topic}_{run_id}"
        
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=self.bootstrap_servers,
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            group_id=consumer_group,
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            consumer_timeout_ms=30000,  # 30 second timeout
            max_poll_records=1000
        )
        
        records = []
        processed_count = 0
        
        try:
            logger.info(f"Starting extraction from topic {topic} for time range {start_time} to {end_time}")
            
            for message in consumer:
                try:
                    record = message.value
                    
                    # Extract timestamp from record
                    record_timestamp = self._extract_timestamp(record)
                    
                    if record_timestamp is None:
                        logger.warning(f"No timestamp found in record: {record}")
                        continue
                    
                    # Check if record is within time window
                    if start_time <= record_timestamp <= end_time:
                        # Add metadata
                        record['_kafka_partition'] = message.partition
                        record['_kafka_offset'] = message.offset
                        record['_extraction_time'] = datetime.utcnow().isoformat()
                        
                        records.append(record)
                        
                        if len(records) >= max_records:
                            logger.warning(f"Reached max records limit ({max_records}) for topic {topic}")
                            break
                    
                    # Stop if we've gone past the end time
                    elif record_timestamp > end_time:
                        logger.info(f"Reached end of time window for topic {topic}")
                        break
                    
                    processed_count += 1
                    
                    if processed_count % 10000 == 0:
                        logger.info(f"Processed {processed_count} messages from {topic}")
                        
                except (json.JSONDecodeError, KeyError) as e:
                    logger.error(f"Error processing message from {topic}: {e}")
                    continue
                    
        except KafkaError as e:
            logger.error(f"Kafka error while extracting from {topic}: {e}")
            raise
        finally:
            consumer.close()
            
        logger.info(f"Extracted {len(records)} records from topic {topic}")
        return records
    
    def _extract_timestamp(self, record: Dict[str, Any]) -> Optional[datetime]:
        """
        Extract timestamp from record, handling different timestamp formats
        """
        timestamp_fields = ['timestamp', 'created_at', 'event_time', '@timestamp']
        
        for field in timestamp_fields:
            if field in record:
                timestamp_value = record[field]
                
                # Handle different timestamp formats
                if isinstance(timestamp_value, (int, float)):
                    # Assume milliseconds if > 1e10, otherwise seconds
                    if timestamp_value > 1e10:
                        return datetime.fromtimestamp(timestamp_value / 1000)
                    else:
                        return datetime.fromtimestamp(timestamp_value)
                        
                elif isinstance(timestamp_value, str):
                    # Try parsing ISO format
                    try:
                        return datetime.fromisoformat(timestamp_value.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                        
        return None


class DataLakeManager:
    """
    Manages data storage and retrieval from S3-based data lake
    """
    
    def __init__(self, bucket_name: str, aws_access_key_id: str = None, aws_secret_access_key: str = None):
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        if aws_access_key_id and aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key
            )
        else:
            # Use default credentials (IAM role, environment variables, etc.)
            self.s3_client = boto3.client('s3')
    
    def save_dataframe_to_parquet(
        self,
        df: pd.DataFrame,
        s3_key: str,
        partition_cols: Optional[List[str]] = None
    ) -> str:
        """
        Save DataFrame to S3 as Parquet with optional partitioning
        
        Args:
            df: DataFrame to save
            s3_key: S3 key path
            partition_cols: Columns to partition by
            
        Returns:
            Full S3 path of saved file
        """
        try:
            # Convert DataFrame to PyArrow Table
            table = pa.Table.from_pandas(df)
            
            # Create local temporary file
            local_path = f"/tmp/{s3_key.replace('/', '_')}"
            
            if partition_cols:
                # Write partitioned dataset
                pq.write_to_dataset(
                    table,
                    root_path=local_path,
                    partition_cols=partition_cols
                )
                
                # Upload directory to S3
                self._upload_directory_to_s3(local_path, s3_key)
            else:
                # Write single parquet file
                pq.write_table(table, local_path)
                
                # Upload to S3
                self.s3_client.upload_file(local_path, self.bucket_name, s3_key)
            
            s3_path = f"s3://{self.bucket_name}/{s3_key}"
            logger.info(f"Saved DataFrame to {s3_path}")
            
            return s3_path
            
        except ClientError as e:
            logger.error(f"Error saving DataFrame to S3: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error saving DataFrame: {e}")
            raise
    
    def load_dataframe_from_parquet(self, s3_key: str) -> pd.DataFrame:
        """
        Load DataFrame from S3 Parquet file
        
        Args:
            s3_key: S3 key path
            
        Returns:
            Loaded DataFrame
        """
        try:
            # Download file to local temp
            local_path = f"/tmp/{s3_key.replace('/', '_')}"
            self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            
            # Load DataFrame
            df = pd.read_parquet(local_path)
            logger.info(f"Loaded DataFrame with {len(df)} rows from s3://{self.bucket_name}/{s3_key}")
            
            return df
            
        except ClientError as e:
            logger.error(f"Error loading DataFrame from S3: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error loading DataFrame: {e}")
            raise
    
    def list_objects(self, prefix: str) -> List[str]:
        """
        List objects in S3 bucket with given prefix
        
        Args:
            prefix: S3 key prefix
            
        Returns:
            List of S3 keys
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            objects = []
            if 'Contents' in response:
                objects = [obj['Key'] for obj in response['Contents']]
            
            logger.info(f"Found {len(objects)} objects with prefix {prefix}")
            return objects
            
        except ClientError as e:
            logger.error(f"Error listing S3 objects: {e}")
            raise
    
    def _upload_directory_to_s3(self, local_dir: str, s3_prefix: str):
        """
        Upload entire directory to S3
        """
        import os
        
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_file_path, local_dir)
                s3_key = f"{s3_prefix}/{relative_path}".replace('\\', '/')
                
                self.s3_client.upload_file(local_file_path, self.bucket_name, s3_key)


class DataQualityValidator:
    """
    Validates data quality for ML training datasets
    """
    
    @staticmethod
    def validate_attempts_data(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Validate attempts data quality
        
        Args:
            df: Attempts DataFrame
            
        Returns:
            Validation results dictionary
        """
        results = {
            'total_records': len(df),
            'validation_passed': True,
            'issues': []
        }
        
        # Required columns check
        required_columns = ['user_id', 'item_id', 'correct', 'timestamp']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            results['validation_passed'] = False
            results['issues'].append(f"Missing required columns: {missing_columns}")
        
        # Data type validation
        if 'correct' in df.columns:
            if not df['correct'].dtype in ['bool', 'int64']:
                results['issues'].append("'correct' column should be boolean or integer")
        
        # Null value checks
        null_counts = df.isnull().sum()
        critical_nulls = null_counts[null_counts > 0]
        
        if len(critical_nulls) > 0:
            results['issues'].append(f"Null values found: {critical_nulls.to_dict()}")
        
        # Duplicate check
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            results['issues'].append(f"Found {duplicate_count} duplicate records")
        
        # Time range validation
        if 'timestamp' in df.columns:
            try:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                time_range = df['timestamp'].max() - df['timestamp'].min()
                results['time_range_days'] = time_range.days
                
                if time_range.days > 365:
                    results['issues'].append(f"Time range too large: {time_range.days} days")
                    
            except Exception as e:
                results['issues'].append(f"Timestamp validation error: {e}")
        
        # User and item coverage
        if 'user_id' in df.columns:
            results['unique_users'] = df['user_id'].nunique()
            
        if 'item_id' in df.columns:
            results['unique_items'] = df['item_id'].nunique()
        
        # Response distribution
        if 'correct' in df.columns:
            correct_rate = df['correct'].mean()
            results['correct_rate'] = correct_rate
            
            if correct_rate < 0.1 or correct_rate > 0.9:
                results['issues'].append(f"Extreme correct rate: {correct_rate:.3f}")
        
        # Final validation status
        if results['issues']:
            results['validation_passed'] = False
        
        return results
    
    @staticmethod
    def validate_sequence_data(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Validate sequence data for DKT training
        
        Args:
            df: Sequence DataFrame
            
        Returns:
            Validation results dictionary
        """
        results = {
            'total_sequences': len(df),
            'validation_passed': True,
            'issues': []
        }
        
        # Required columns
        required_columns = ['user_id', 'item_sequence', 'response_sequence', 'sequence_length']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            results['validation_passed'] = False
            results['issues'].append(f"Missing required columns: {missing_columns}")
            return results
        
        # Sequence length validation
        if 'sequence_length' in df.columns:
            avg_length = df['sequence_length'].mean()
            min_length = df['sequence_length'].min()
            max_length = df['sequence_length'].max()
            
            results['avg_sequence_length'] = avg_length
            results['min_sequence_length'] = min_length
            results['max_sequence_length'] = max_length
            
            if min_length < 2:
                results['issues'].append(f"Sequences too short (min: {min_length})")
            
            if max_length > 1000:
                results['issues'].append(f"Sequences too long (max: {max_length})")
        
        # Sequence consistency validation
        for idx, row in df.head(100).iterrows():  # Sample validation
            try:
                item_seq = row['item_sequence']
                response_seq = row['response_sequence']
                seq_length = row['sequence_length']
                
                if len(item_seq) != len(response_seq):
                    results['issues'].append(f"Sequence length mismatch at index {idx}")
                    break
                
                if len(item_seq) != seq_length:
                    results['issues'].append(f"Declared length mismatch at index {idx}")
                    break
                    
            except Exception as e:
                results['issues'].append(f"Sequence validation error at index {idx}: {e}")
                break
        
        if results['issues']:
            results['validation_passed'] = False
        
        return results


def extract_and_validate_training_data(
    kafka_servers: str,
    data_lake_bucket: str,
    start_time: datetime,
    end_time: datetime,
    run_id: str
) -> Dict[str, Any]:
    """
    Main function to extract and validate training data
    
    Args:
        kafka_servers: Kafka bootstrap servers
        data_lake_bucket: S3 bucket for data lake
        start_time: Start of extraction window
        end_time: End of extraction window
        run_id: Unique run identifier
        
    Returns:
        Dictionary with extraction results and validation status
    """
    extractor = KafkaDataExtractor(kafka_servers)
    data_lake = DataLakeManager(data_lake_bucket)
    validator = DataQualityValidator()
    
    results = {
        'extraction_time': datetime.utcnow().isoformat(),
        'time_window': {
            'start': start_time.isoformat(),
            'end': end_time.isoformat()
        },
        'topics': {},
        'validation_passed': True
    }
    
    # Topics to extract
    topics_config = {
        'user.attempts': {
            'max_records': 100000,
            'validator': validator.validate_attempts_data
        },
        'user.sessions': {
            'max_records': 50000,
            'validator': None  # Add session validator if needed
        },
        'ml.training_events': {
            'max_records': 75000,
            'validator': None
        }
    }
    
    for topic, config in topics_config.items():
        try:
            logger.info(f"Processing topic: {topic}")
            
            # Extract data
            records = extractor.extract_topic_data(
                topic=topic,
                start_time=start_time,
                end_time=end_time,
                run_id=run_id,
                max_records=config['max_records']
            )
            
            if not records:
                logger.warning(f"No records extracted for topic {topic}")
                results['topics'][topic] = {
                    'records_count': 0,
                    'status': 'no_data'
                }
                continue
            
            # Convert to DataFrame
            df = pd.DataFrame(records)
            
            # Validate data if validator provided
            validation_results = None
            if config['validator']:
                validation_results = config['validator'](df)
                if not validation_results['validation_passed']:
                    results['validation_passed'] = False
            
            # Save to data lake
            partition_date = end_time.strftime('%Y/%m/%d')
            s3_key = f"raw_data/{topic}/{partition_date}/data.parquet"
            
            s3_path = data_lake.save_dataframe_to_parquet(df, s3_key)
            
            # Store results
            results['topics'][topic] = {
                'records_count': len(records),
                's3_path': s3_path,
                'validation_results': validation_results,
                'status': 'success'
            }
            
            logger.info(f"Successfully processed {len(records)} records for {topic}")
            
        except Exception as e:
            logger.error(f"Error processing topic {topic}: {e}")
            results['topics'][topic] = {
                'status': 'error',
                'error': str(e)
            }
            results['validation_passed'] = False
    
    return results