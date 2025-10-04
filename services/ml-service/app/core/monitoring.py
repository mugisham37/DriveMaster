"""Performance monitoring and metrics collection."""

import time
import psutil
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from typing import Dict, Any
from datetime import datetime, timedelta
from app.core.logging import get_logger

logger = get_logger(__name__)

# Prometheus metrics
PREDICTION_REQUESTS = Counter(
    'ml_prediction_requests_total',
    'Total number of prediction requests',
    ['model_version', 'batch_size_range', 'cached']
)

PREDICTION_DURATION = Histogram(
    'ml_prediction_duration_seconds',
    'Time spent on predictions',
    ['model_version', 'batch_size_range'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

MODEL_LOAD_DURATION = Histogram(
    'ml_model_load_duration_seconds',
    'Time spent loading models',
    ['model_name', 'version']
)

CACHE_OPERATIONS = Counter(
    'ml_cache_operations_total',
    'Cache operations',
    ['operation', 'result']  # operation: get/set, result: hit/miss/success/error
)

ACTIVE_MODELS = Gauge(
    'ml_active_models',
    'Number of currently loaded models'
)

MEMORY_USAGE = Gauge(
    'ml_memory_usage_bytes',
    'Memory usage',
    ['type']  # type: system/gpu_allocated/gpu_cached
)

ERROR_COUNT = Counter(
    'ml_errors_total',
    'Total number of errors',
    ['error_type', 'model_version']
)


class PerformanceMonitor:
    """Performance monitoring and metrics collection."""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.request_count = 0
        self.error_count = 0
        self.total_inference_time = 0.0
    
    def record_prediction_request(
        self,
        model_version: str,
        batch_size: int,
        inference_time: float,
        cached: bool = False
    ) -> None:
        """Record a prediction request."""
        # Determine batch size range for metrics
        if batch_size == 1:
            batch_range = "single"
        elif batch_size <= 10:
            batch_range = "small"
        elif batch_size <= 50:
            batch_range = "medium"
        else:
            batch_range = "large"
        
        # Update Prometheus metrics
        PREDICTION_REQUESTS.labels(
            model_version=model_version,
            batch_size_range=batch_range,
            cached=str(cached)
        ).inc()
        
        PREDICTION_DURATION.labels(
            model_version=model_version,
            batch_size_range=batch_range
        ).observe(inference_time)
        
        # Update internal counters
        self.request_count += 1
        self.total_inference_time += inference_time
    
    def record_model_load(
        self,
        model_name: str,
        version: str,
        load_time: float
    ) -> None:
        """Record model loading time."""
        MODEL_LOAD_DURATION.labels(
            model_name=model_name,
            version=version
        ).observe(load_time)
    
    def record_cache_operation(
        self,
        operation: str,
        result: str
    ) -> None:
        """Record cache operation."""
        CACHE_OPERATIONS.labels(
            operation=operation,
            result=result
        ).inc()
    
    def record_error(
        self,
        error_type: str,
        model_version: str = "unknown"
    ) -> None:
        """Record an error."""
        ERROR_COUNT.labels(
            error_type=error_type,
            model_version=model_version
        ).inc()
        
        self.error_count += 1
    
    def update_system_metrics(self, loaded_models_count: int) -> None:
        """Update system-level metrics."""
        # Update active models count
        ACTIVE_MODELS.set(loaded_models_count)
        
        # Update memory usage
        process = psutil.Process()
        memory_info = process.memory_info()
        
        MEMORY_USAGE.labels(type="system").set(memory_info.rss)
        
        # GPU memory if available
        try:
            import torch
            if torch.cuda.is_available():
                for i in range(torch.cuda.device_count()):
                    allocated = torch.cuda.memory_allocated(i)
                    cached = torch.cuda.memory_reserved(i)
                    
                    MEMORY_USAGE.labels(type=f"gpu_{i}_allocated").set(allocated)
                    MEMORY_USAGE.labels(type=f"gpu_{i}_cached").set(cached)
        except ImportError:
            pass
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of performance metrics."""
        uptime = datetime.now() - self.start_time
        
        return {
            "uptime_seconds": uptime.total_seconds(),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1),
            "average_inference_time": (
                self.total_inference_time / max(self.request_count, 1)
            ),
            "requests_per_second": (
                self.request_count / max(uptime.total_seconds(), 1)
            )
        }
    
    def get_prometheus_metrics(self) -> str:
        """Get Prometheus metrics in text format."""
        return generate_latest()


class RequestTimer:
    """Context manager for timing requests."""
    
    def __init__(self, monitor: PerformanceMonitor, operation: str):
        self.monitor = monitor
        self.operation = operation
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            
            if exc_type is not None:
                self.monitor.record_error(
                    error_type=f"{self.operation}_error"
                )
            
            logger.debug(
                f"{self.operation}_completed",
                duration_seconds=duration,
                success=(exc_type is None)
            )


# Global performance monitor instance
performance_monitor = PerformanceMonitor()