from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Server
    port: int = 8004
    host: str = "0.0.0.0"
    debug: bool = True
    
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/adaptive_learning"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 3
    
    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_consumer_group: str = "fraud-detection-service"
    kafka_topic_attempts: str = "user.attempts"
    kafka_topic_sessions: str = "user.sessions"
    kafka_topic_fraud_alerts: str = "fraud.alerts"
    
    # ML Model Configuration
    anomaly_threshold: float = 0.7
    fraud_score_threshold: float = 0.8
    isolation_forest_contamination: float = 0.1
    min_samples_for_training: int = 1000
    
    # Detection Rules
    max_attempts_per_minute: int = 30
    min_time_between_attempts_ms: int = 1000
    max_accuracy_spike: float = 0.3
    suspicious_pattern_threshold: float = 0.9
    
    # Logging
    log_level: str = "INFO"
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

_settings = None

def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings