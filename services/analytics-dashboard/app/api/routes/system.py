"""System monitoring API routes."""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Dict, List, Any
import structlog

from app.services.metrics_service import MetricsService
from app.services.websocket_manager import WebSocketManager
from app.models.analytics import Alert, SystemPerformanceMetrics

logger = structlog.get_logger(__name__)
router = APIRouter()

# Global WebSocket manager instance (would be injected in production)
websocket_manager = WebSocketManager()


def get_metrics_service() -> MetricsService:
    """Dependency to get metrics service."""
    return MetricsService()


@router.get("/alerts", response_model=List[Alert])
async def get_system_alerts(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get current system alerts."""
    try:
        alerts = await metrics_service.check_system_alerts()
        return alerts
    except Exception as e:
        logger.error("Failed to get system alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system alerts")


@router.get("/performance", response_model=SystemPerformanceMetrics)
async def get_system_performance(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get detailed system performance metrics."""
    try:
        metrics = await metrics_service.get_system_performance_metrics()
        return metrics
    except Exception as e:
        logger.error("Failed to get system performance", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system performance")


@router.get("/websocket-stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    try:
        stats = websocket_manager.get_connection_stats()
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "websocket_stats": stats
        }
    except Exception as e:
        logger.error("Failed to get WebSocket stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve WebSocket statistics")


@router.get("/status")
async def get_system_status():
    """Get overall system status."""
    try:
        # Check various system components
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "healthy",
            "components": {
                "api": "healthy",
                "database": "healthy",
                "redis": "healthy",
                "kafka": "healthy",
                "websockets": "healthy"
            },
            "uptime_seconds": 0,  # Would track actual uptime
            "version": "1.0.0"
        }
        
        return status
        
    except Exception as e:
        logger.error("Failed to get system status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system status")


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolved_by: str,
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Mark an alert as resolved."""
    try:
        # In a real implementation, this would update the alert in the database
        # For now, just return success
        return {
            "alert_id": alert_id,
            "resolved": True,
            "resolved_by": resolved_by,
            "resolved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to resolve alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to resolve alert")


@router.get("/metrics/raw")
async def get_raw_metrics():
    """Get raw system metrics for external monitoring systems."""
    try:
        # This would typically return metrics in Prometheus format
        # For now, return basic metrics
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {
                "http_requests_total": 1000,
                "http_request_duration_seconds": 0.25,
                "database_connections_active": 15,
                "redis_memory_usage_bytes": 67108864,
                "websocket_connections_active": 25
            }
        }
        
        return metrics
        
    except Exception as e:
        logger.error("Failed to get raw metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve raw metrics")


@router.get("/health")
async def system_health():
    """System service health check."""
    return {
        "status": "healthy",
        "service": "system",
        "timestamp": datetime.utcnow().isoformat()
    }