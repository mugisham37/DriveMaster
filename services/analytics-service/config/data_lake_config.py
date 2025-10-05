"""Data lake configuration and schemas."""

from typing import Dict, List, Optional
from pydantic import BaseModel
from enum import Enum


class StorageProvider(str, Enum):
    S3 = "s3"
    GCS = "gcs"


class DataLakeConfig(BaseModel):
    """Configuration for data lake storage."""
    provider: StorageProvider
    bucket_name: str
    region: Optional[str] = None
    base_path: str = "analytics"
    
    # Partitioning strategy
    partition_columns: List[str] = ["year", "month", "day"]
    
    # File format settings
    file_format: str = "parquet"
    compression: str = "snappy"
    max_file_size_mb: int = 128
    
    # Retention policies
    raw_data_retention_days: int = 90
    processed_data_retention_days: int = 365
    aggregated_data_retention_days: int = 1095  # 3 years


class KafkaConfig(BaseModel):
    """Kafka configuration for data extraction."""
    bootstrap_servers: List[str]
    security_protocol: str = "PLAINTEXT"
    sasl_mechanism: Optional[str] = None
    sasl_username: Optional[str] = None
    sasl_password: Optional[str] = None
    
    # Consumer settings
    consumer_group_id: str = "analytics-etl"
    auto_offset_reset: str = "earliest"
    enable_auto_commit: bool = False
    max_poll_records: int = 1000
    
    # Topics configuration
    topics: Dict[str, Dict] = {
        "user.attempts": {
            "partition_key": "user_id",
            "schema_version": "v1",
            "retention_hours": 720  # 30 days
        },
        "user.sessions": {
            "partition_key": "user_id", 
            "schema_version": "v1",
            "retention_hours": 2160  # 90 days
        },
        "ml.training_events": {
            "partition_key": "user_id",
            "schema_version": "v1", 
            "retention_hours": 8760  # 1 year
        }
    }


class DataQualityConfig(BaseModel):
    """Data quality validation configuration."""
    enable_validation: bool = True
    fail_on_validation_error: bool = False
    
    # Quality thresholds
    max_null_percentage: float = 0.05
    max_duplicate_percentage: float = 0.01
    min_record_count: int = 100
    
    # Anomaly detection
    enable_anomaly_detection: bool = True
    anomaly_threshold_std: float = 3.0


# Default configurations
DEFAULT_DATA_LAKE_CONFIG = DataLakeConfig(
    provider=StorageProvider.S3,
    bucket_name="adaptive-learning-data-lake",
    region="us-west-2"
)

DEFAULT_KAFKA_CONFIG = KafkaConfig(
    bootstrap_servers=["kafka-1:9092", "kafka-2:9092", "kafka-3:9092"]
)

DEFAULT_QUALITY_CONFIG = DataQualityConfig()