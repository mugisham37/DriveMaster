"""Configuration management for ML service."""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings."""
    
    # Server configuration
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"
    
    # MLflow configuration
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "adaptive-learning-dkt"
    model_registry_uri: str = "s3://ml-models-bucket/"
    default_model_version: str = "latest"
    
    # Model configuration
    batch_size: int = 32
    max_sequence_length: int = 100
    num_items: int = 10000  # Will be updated from database
    num_topics: int = 50    # Will be updated from database
    hidden_size: int = 128
    num_layers: int = 2
    
    # Redis configuration
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 2
    prediction_cache_ttl: int = 900  # 15 minutes
    
    # Database configuration
    database_url: str = "postgresql://user:password@localhost:5432/adaptive_learning"
    
    # Monitoring
    prometheus_port: int = 8001
    log_level: str = "INFO"
    
    # Performance settings
    max_workers: int = 4
    request_timeout: int = 30
    batch_timeout: int = 5.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()