"""Real-time analytics dashboard API."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import structlog

from app.core.config import settings
from app.core.database import get_db_session
from app.core.redis_client import get_redis_client
from app.services.metrics_service import MetricsService
from app.services.websocket_manager import WebSocketManager
from app.api.routes import analytics, system, users
from app.models.analytics import (
    UserEngagementMetrics,
    LearningProgressMetrics,
    ContentPerformanceMetrics,
    SystemPerformanceMetrics
)

logger = structlog.get_logger(__name__)

# WebSocket manager for real-time updates
websocket_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting analytics dashboard service")
    
    # Start background tasks
    asyncio.create_task(metrics_updater())
    asyncio.create_task(alert_monitor())
    
    yield
    
    # Shutdown
    logger.info("Shutting down analytics dashboard service")

app = FastAPI(
    title="Analytics Dashboard API",
    description="Real-time analytics and monitoring dashboard for Adaptive Learning Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])

# Serve static files (React dashboard)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Analytics Dashboard",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        async with get_db_session() as db:
            await db.execute("SELECT 1")
        
        # Check Redis connection
        redis = await get_redis_client()
        await redis.ping()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy",
                "redis": "healthy"
            }
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics."""
    await websocket_manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "subscribe":
                # Handle subscription to specific metrics
                metrics_type = message.get("metrics_type", "all")
                await websocket_manager.subscribe(websocket, metrics_type)
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        websocket_manager.disconnect(websocket)


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts."""
    await websocket_manager.connect(websocket, channel="alerts")
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, channel="alerts")
    except Exception as e:
        logger.error("WebSocket alerts error", error=str(e))
        websocket_manager.disconnect(websocket, channel="alerts")


async def metrics_updater():
    """Background task to update metrics and broadcast to WebSocket clients."""
    metrics_service = MetricsService()
    
    while True:
        try:
            # Calculate current metrics
            current_time = datetime.utcnow()
            
            # User engagement metrics
            engagement_metrics = await metrics_service.get_user_engagement_metrics(
                time_window=timedelta(hours=1)
            )
            
            # Learning progress metrics
            progress_metrics = await metrics_service.get_learning_progress_metrics(
                time_window=timedelta(hours=24)
            )
            
            # Content performance metrics
            content_metrics = await metrics_service.get_content_performance_metrics(
                time_window=timedelta(hours=24)
            )
            
            # System performance metrics
            system_metrics = await metrics_service.get_system_performance_metrics()
            
            # Broadcast metrics to WebSocket clients
            metrics_update = {
                "timestamp": current_time.isoformat(),
                "engagement": engagement_metrics.dict(),
                "progress": progress_metrics.dict(),
                "content": content_metrics.dict(),
                "system": system_metrics.dict()
            }
            
            await websocket_manager.broadcast(
                json.dumps(metrics_update),
                channel="metrics"
            )
            
            # Store metrics in Redis for API access
            redis = await get_redis_client()
            await redis.setex(
                "current_metrics",
                300,  # 5 minutes TTL
                json.dumps(metrics_update, default=str)
            )
            
            logger.debug("Metrics updated and broadcasted")
            
        except Exception as e:
            logger.error("Error updating metrics", error=str(e))
        
        # Update every 30 seconds
        await asyncio.sleep(30)


async def alert_monitor():
    """Background task to monitor for alerts and anomalies."""
    metrics_service = MetricsService()
    
    while True:
        try:
            # Check for system alerts
            alerts = await metrics_service.check_system_alerts()
            
            if alerts:
                # Broadcast alerts to WebSocket clients
                alert_message = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "alerts": [alert.dict() for alert in alerts]
                }
                
                await websocket_manager.broadcast(
                    json.dumps(alert_message),
                    channel="alerts"
                )
                
                logger.warning("System alerts detected", alert_count=len(alerts))
            
        except Exception as e:
            logger.error("Error monitoring alerts", error=str(e))
        
        # Check every minute
        await asyncio.sleep(60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )