import asyncio
import json
import logging
from typing import Dict, Any
from confluent_kafka import Consumer, KafkaError, KafkaException
from datetime import datetime

from .models import AttemptAnalysisRequest, SessionAnalysisRequest
from .fraud_detector import FraudDetector
from .config import Settings

logger = logging.getLogger(__name__)

class KafkaConsumerService:
    def __init__(self, fraud_detector: FraudDetector, settings: Settings):
        self.fraud_detector = fraud_detector
        self.settings = settings
        self.consumer = None
        self.is_running = False
        self.consumer_task = None
        
        # Kafka consumer configuration
        self.consumer_config = {
            'bootstrap.servers': settings.kafka_brokers,
            'group.id': settings.kafka_consumer_group,
            'auto.offset.reset': 'latest',
            'enable.auto.commit': True,
            'auto.commit.interval.ms': 1000,
            'max.poll.interval.ms': 300000,  # 5 minutes
            'session.timeout.ms': 30000,     # 30 seconds
        }
        
        # Topics to subscribe to
        self.topics = [
            settings.kafka_topic_attempts,
            settings.kafka_topic_sessions
        ]
    
    async def start_consuming(self):
        """Start consuming messages from Kafka"""
        if self.is_running:
            logger.warning("Kafka consumer is already running")
            return
        
        try:
            self.consumer = Consumer(self.consumer_config)
            self.consumer.subscribe(self.topics)
            self.is_running = True
            
            logger.info(f"Started Kafka consumer for topics: {self.topics}")
            
            # Run consumer in a separate task
            self.consumer_task = asyncio.create_task(self._consume_loop())
            
        except Exception as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            self.is_running = False
            raise
    
    async def stop(self):
        """Stop consuming messages"""
        if not self.is_running:
            return
        
        self.is_running = False
        
        if self.consumer_task:
            self.consumer_task.cancel()
            try:
                await self.consumer_task
            except asyncio.CancelledError:
                pass
        
        if self.consumer:
            self.consumer.close()
        
        logger.info("Kafka consumer stopped")
    
    async def _consume_loop(self):
        """Main consumer loop"""
        while self.is_running:
            try:
                # Poll for messages
                msg = self.consumer.poll(timeout=1.0)
                
                if msg is None:
                    continue
                
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        # End of partition event
                        continue
                    else:
                        logger.error(f"Kafka error: {msg.error()}")
                        continue
                
                # Process message
                await self._process_message(msg)
                
            except KafkaException as e:
                logger.error(f"Kafka exception: {e}")
                await asyncio.sleep(5)  # Wait before retrying
                
            except Exception as e:
                logger.error(f"Unexpected error in consumer loop: {e}")
                await asyncio.sleep(1)
    
    async def _process_message(self, msg):
        """Process a single Kafka message"""
        try:
            topic = msg.topic()
            value = msg.value()
            
            if not value:
                return
            
            # Parse JSON message
            try:
                data = json.loads(value.decode('utf-8'))
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON message: {e}")
                return
            
            # Route message based on topic
            if topic == self.settings.kafka_topic_attempts:
                await self._process_attempt_event(data)
            elif topic == self.settings.kafka_topic_sessions:
                await self._process_session_event(data)
            else:
                logger.warning(f"Unknown topic: {topic}")
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def _process_attempt_event(self, data: Dict[str, Any]):
        """Process an attempt event for fraud detection"""
        try:
            # Convert Kafka message to AttemptAnalysisRequest
            request = self._convert_attempt_data(data)
            
            if not request:
                return
            
            # Analyze attempt for fraud
            result = await self.fraud_detector.analyze_attempt(request)
            
            # Log high-risk results
            if result.fraud_score >= self.settings.fraud_score_threshold:
                logger.warning(
                    f"High fraud score detected for user {request.user_id}: "
                    f"score={result.fraud_score:.3f}, flags={[f.value for f in result.flags]}"
                )
            
            # Publish fraud alert if needed (to fraud.alerts topic)
            if result.risk_level.value in ['high', 'critical']:
                await self._publish_fraud_alert(result)
            
        except Exception as e:
            logger.error(f"Error processing attempt event: {e}")
    
    async def _process_session_event(self, data: Dict[str, Any]):
        """Process a session event for fraud detection"""
        try:
            # Convert Kafka message to SessionAnalysisRequest
            request = self._convert_session_data(data)
            
            if not request:
                return
            
            # Analyze session for fraud
            result = await self.fraud_detector.analyze_session(request)
            
            # Log high-risk results
            if result.fraud_score >= self.settings.fraud_score_threshold:
                logger.warning(
                    f"High fraud score detected for session {request.session_id}: "
                    f"score={result.fraud_score:.3f}, flags={[f.value for f in result.flags]}"
                )
            
            # Publish fraud alert if needed
            if result.risk_level.value in ['high', 'critical']:
                await self._publish_fraud_alert(result)
            
        except Exception as e:
            logger.error(f"Error processing session event: {e}")
    
    def _convert_attempt_data(self, data: Dict[str, Any]) -> AttemptAnalysisRequest:
        """Convert Kafka attempt data to AttemptAnalysisRequest"""
        try:
            # Handle timestamp conversion
            timestamp = data.get('timestamp')
            if isinstance(timestamp, (int, float)):
                timestamp = datetime.fromtimestamp(timestamp / 1000)  # Assume milliseconds
            elif isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                timestamp = datetime.utcnow()
            
            return AttemptAnalysisRequest(
                user_id=data.get('user_id', ''),
                item_id=data.get('item_id', ''),
                session_id=data.get('session_id', ''),
                client_attempt_id=data.get('client_attempt_id', ''),
                selected=data.get('selected', {}),
                correct=data.get('correct', False),
                time_taken_ms=data.get('time_taken_ms', 0),
                hints_used=data.get('hints_used', 0),
                device_type=data.get('device_type'),
                app_version=data.get('app_version'),
                ip_address=data.get('ip_address'),
                user_agent=data.get('user_agent'),
                timestamp=timestamp
            )
        except Exception as e:
            logger.error(f"Error converting attempt data: {e}")
            return None
    
    def _convert_session_data(self, data: Dict[str, Any]) -> SessionAnalysisRequest:
        """Convert Kafka session data to SessionAnalysisRequest"""
        try:
            # Handle timestamp conversions
            start_time = data.get('start_time')
            end_time = data.get('end_time')
            
            if isinstance(start_time, (int, float)):
                start_time = datetime.fromtimestamp(start_time / 1000)
            elif isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            else:
                start_time = datetime.utcnow()
            
            if isinstance(end_time, (int, float)):
                end_time = datetime.fromtimestamp(end_time / 1000)
            elif isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            else:
                end_time = datetime.utcnow()
            
            return SessionAnalysisRequest(
                session_id=data.get('session_id', ''),
                user_id=data.get('user_id', ''),
                start_time=start_time,
                end_time=end_time,
                items_attempted=data.get('items_attempted', 0),
                correct_count=data.get('correct_count', 0),
                total_time_ms=data.get('total_time_ms', 0),
                session_type=data.get('session_type', 'practice'),
                device_type=data.get('device_type'),
                app_version=data.get('app_version'),
                topics_practiced=data.get('topics_practiced', []),
                average_difficulty=data.get('average_difficulty', 0.0)
            )
        except Exception as e:
            logger.error(f"Error converting session data: {e}")
            return None
    
    async def _publish_fraud_alert(self, result):
        """Publish fraud alert to Kafka topic"""
        try:
            # In a real implementation, you would publish to the fraud.alerts topic
            # For now, we'll just log the alert
            alert_data = {
                'user_id': result.user_id,
                'analysis_id': result.analysis_id,
                'fraud_score': result.fraud_score,
                'risk_level': result.risk_level.value,
                'flags': [flag.value for flag in result.flags],
                'timestamp': result.timestamp.isoformat(),
                'recommendations': result.recommendations
            }
            
            logger.info(f"Fraud alert would be published: {json.dumps(alert_data)}")
            
            # TODO: Implement actual Kafka producer to publish to fraud.alerts topic
            
        except Exception as e:
            logger.error(f"Error publishing fraud alert: {e}")