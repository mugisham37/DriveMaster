"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Analytics Dashboard"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # API
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/adaptive_learning"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_POOL_SIZE: int = 10
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: List[str] = ["localhost:9092"]
    KAFKA_CONSUMER_GROUP: str = "analytics-dashboard"
    
    # Metrics
    METRICS_UPDATE_INTERVAL: int = 30  # seconds
    METRICS_RETENTION_HOURS: int = 24
    
    # Alerting
    ALERT_CHECK_INTERVAL: int = 60  # seconds
    
    # Alert thresholds
    HIGH_ERROR_RATE_THRESHOLD: float = 0.05  # 5%
    HIGH_RESPONSE_TIME_THRESHOLD: float = 1000.0  # 1 second
    LOW_ACCURACY_THRESHOLD: float = 0.6  # 60%
    HIGH_MEMORY_USAGE_THRESHOLD: float = 0.85  # 85%
    HIGH_CPU_USAGE_THRESHOLD: float = 0.80  # 80%
    
    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # seconds
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()