"""Configuration settings for BI reporting service."""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "BI Reporting Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # API
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/adaptive_learning"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/2"
    REDIS_POOL_SIZE: int = 10
    REDIS_TIMEOUT: int = 30
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_CONSUMER_GROUP: str = "bi-reporting"
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"
    
    # Data Lake
    DATA_LAKE_PROVIDER: str = "s3"  # s3 or gcs
    DATA_LAKE_BUCKET: str = "adaptive-learning-data-lake"
    DATA_LAKE_REGION: str = "us-west-2"
    DATA_LAKE_BASE_PATH: str = "analytics"
    
    # AWS (if using S3)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-west-2"
    
    # GCP (if using GCS)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None
    
    # Report Generation
    REPORTS_DIR: str = "reports"
    TEMP_DIR: str = "temp"
    MAX_REPORT_SIZE_MB: int = 100
    REPORT_RETENTION_DAYS: int = 30
    
    # ML Models
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MODEL_REGISTRY_NAME: str = "adaptive-learning-models"
    
    # Monitoring
    METRICS_ENABLED: bool = True
    METRICS_PORT: int = 9090
    HEALTH_CHECK_INTERVAL: int = 30
    
    # Email (for report delivery)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/3"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/3"
    
    # Analytics
    ANALYTICS_BATCH_SIZE: int = 1000
    ANALYTICS_PROCESSING_INTERVAL: int = 300  # seconds
    ANOMALY_DETECTION_SENSITIVITY: float = 2.0
    
    # Caching
    CACHE_TTL_SECONDS: int = 3600
    CACHE_MAX_SIZE: int = 1000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()