"""Structured logging configuration for ML service."""

import structlog
import logging
import sys
from typing import Any, Dict
from app.config import settings


def configure_logging() -> None:
    """Configure structured logging for the application."""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.environment == "production"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a configured logger instance."""
    return structlog.get_logger(name)


class MLMetrics:
    """ML-specific metrics logging."""
    
    def __init__(self):
        self.logger = get_logger("ml_metrics")
    
    def log_prediction(
        self,
        user_id: str,
        model_version: str,
        inference_time_ms: float,
        batch_size: int,
        cached: bool = False
    ) -> None:
        """Log prediction metrics."""
        self.logger.info(
            "prediction_completed",
            user_id=user_id,
            model_version=model_version,
            inference_time_ms=inference_time_ms,
            batch_size=batch_size,
            cached=cached
        )
    
    def log_model_load(
        self,
        model_name: str,
        version: str,
        load_time_ms: float,
        parameters: Dict[str, Any]
    ) -> None:
        """Log model loading metrics."""
        self.logger.info(
            "model_loaded",
            model_name=model_name,
            version=version,
            load_time_ms=load_time_ms,
            parameters=parameters
        )
    
    def log_cache_hit(self, cache_key: str, hit: bool) -> None:
        """Log cache hit/miss."""
        self.logger.debug(
            "cache_access",
            cache_key=cache_key,
            hit=hit
        )
    
    def log_error(
        self,
        error_type: str,
        error_message: str,
        user_id: str = None,
        model_version: str = None
    ) -> None:
        """Log ML service errors."""
        self.logger.error(
            "ml_service_error",
            error_type=error_type,
            error_message=error_message,
            user_id=user_id,
            model_version=model_version
        )