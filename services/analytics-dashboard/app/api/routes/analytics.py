"""Analytics API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import structlog

from app.services.metrics_service import MetricsService
from app.models.analytics import (
    UserEngagementMetrics,
    LearningProgressMetrics,
    ContentPerformanceMetrics,
    SystemPerformanceMetrics,
    RealtimeMetricsSnapshot,
    MetricsQuery,
    MetricsResponse,
    TimeSeries,
    UserBehaviorInsight,
    ContentGapAnalysis,
    LearningEffectivenessReport
)

logger = structlog.get_logger(__name__)
router = APIRouter()


def get_metrics_service() -> MetricsService:
    """Dependency to get metrics service."""
    return MetricsService()


@router.get("/engagement", response_model=UserEngagementMetrics)
async def get_user_engagement_metrics(
    hours: int = Query(1, ge=1, le=168, description="Time window in hours"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get user engagement metrics."""
    try:
        time_window = timedelta(hours=hours)
        metrics = await metrics_service.get_user_engagement_metrics(time_window)
        return metrics
    except Exception as e:
        logger.error("Failed to get engagement metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve engagement metrics")


@router.get("/progress", response_model=LearningProgressMetrics)
async def get_learning_progress_metrics(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get learning progress metrics."""
    try:
        time_window = timedelta(hours=hours)
        metrics = await metrics_service.get_learning_progress_metrics(time_window)
        return metrics
    except Exception as e:
        logger.error("Failed to get progress metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve progress metrics")


@router.get("/content", response_model=ContentPerformanceMetrics)
async def get_content_performance_metrics(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get content performance metrics."""
    try:
        time_window = timedelta(hours=hours)
        metrics = await metrics_service.get_content_performance_metrics(time_window)
        return metrics
    except Exception as e:
        logger.error("Failed to get content metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve content metrics")


@router.get("/system", response_model=SystemPerformanceMetrics)
async def get_system_performance_metrics(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get system performance metrics."""
    try:
        metrics = await metrics_service.get_system_performance_metrics()
        return metrics
    except Exception as e:
        logger.error("Failed to get system metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system metrics")


@router.get("/snapshot", response_model=RealtimeMetricsSnapshot)
async def get_realtime_snapshot(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get a complete real-time metrics snapshot."""
    try:
        # Get all metrics concurrently
        import asyncio
        
        engagement_task = metrics_service.get_user_engagement_metrics(timedelta(hours=1))
        progress_task = metrics_service.get_learning_progress_metrics(timedelta(hours=24))
        content_task = metrics_service.get_content_performance_metrics(timedelta(hours=24))
        system_task = metrics_service.get_system_performance_metrics()
        alerts_task = metrics_service.check_system_alerts()
        
        engagement, progress, content, system, alerts = await asyncio.gather(
            engagement_task, progress_task, content_task, system_task, alerts_task
        )
        
        snapshot = RealtimeMetricsSnapshot(
            timestamp=datetime.utcnow(),
            engagement=engagement,
            progress=progress,
            content=content,
            system=system,
            alerts=alerts
        )
        
        return snapshot
        
    except Exception as e:
        logger.error("Failed to get metrics snapshot", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics snapshot")


@router.post("/query", response_model=MetricsResponse)
async def query_metrics(
    query: MetricsQuery,
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Query historical metrics data."""
    try:
        # Validate time range
        if query.end_time <= query.start_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        time_range = query.end_time - query.start_time
        if time_range > timedelta(days=30):
            raise HTTPException(status_code=400, detail="Time range cannot exceed 30 days")
        
        # Execute query (placeholder implementation)
        time_series = []
        execution_start = datetime.utcnow()
        
        # This would typically query a time-series database like InfluxDB or Prometheus
        # For now, return empty time series
        for metric_name in query.metric_names:
            time_series.append(TimeSeries(
                metric_name=metric_name,
                metric_type="gauge",
                data_points=[],
                start_time=query.start_time,
                end_time=query.end_time,
                resolution=query.resolution
            ))
        
        execution_time = (datetime.utcnow() - execution_start).total_seconds() * 1000
        
        response = MetricsResponse(
            query=query,
            time_series=time_series,
            total_data_points=0,
            execution_time_ms=execution_time,
            cached=False
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to query metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to query metrics")


@router.get("/insights/behavior", response_model=List[UserBehaviorInsight])
async def get_user_behavior_insights(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of insights"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get user behavior insights."""
    try:
        # Placeholder implementation - would analyze user behavior patterns
        insights = [
            UserBehaviorInsight(
                insight_type="engagement_drop",
                title="Decreased Evening Engagement",
                description="User engagement drops by 30% after 8 PM",
                impact_score=0.7,
                affected_users=1250,
                recommendation="Consider sending reminder notifications in the evening",
                data={"time_period": "20:00-23:59", "engagement_drop": 0.3},
                generated_at=datetime.utcnow()
            ),
            UserBehaviorInsight(
                insight_type="difficulty_preference",
                title="Users Prefer Medium Difficulty",
                description="85% of successful sessions use medium difficulty items",
                impact_score=0.6,
                affected_users=2100,
                recommendation="Increase medium difficulty content in recommendations",
                data={"preferred_difficulty": "medium", "success_rate": 0.85},
                generated_at=datetime.utcnow()
            )
        ]
        
        return insights[:limit]
        
    except Exception as e:
        logger.error("Failed to get behavior insights", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve behavior insights")


@router.get("/insights/content-gaps", response_model=List[ContentGapAnalysis])
async def get_content_gap_analysis(
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get content gap analysis."""
    try:
        # Placeholder implementation - would analyze content gaps
        gaps = [
            ContentGapAnalysis(
                topic="traffic_signs",
                jurisdiction="CA",
                gap_type="insufficient_content",
                severity="high",
                current_items=15,
                recommended_items=30,
                avg_accuracy=0.45,
                user_demand=500,
                priority_score=0.85
            ),
            ContentGapAnalysis(
                topic="parking_rules",
                jurisdiction="NY",
                gap_type="difficulty_gap",
                severity="medium",
                current_items=25,
                recommended_items=35,
                avg_accuracy=0.72,
                user_demand=300,
                priority_score=0.65
            )
        ]
        
        # Apply filters
        if jurisdiction:
            gaps = [gap for gap in gaps if gap.jurisdiction == jurisdiction]
        if severity:
            gaps = [gap for gap in gaps if gap.severity == severity]
        
        return gaps[:limit]
        
    except Exception as e:
        logger.error("Failed to get content gap analysis", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve content gap analysis")


@router.get("/reports/effectiveness", response_model=LearningEffectivenessReport)
async def get_learning_effectiveness_report(
    days: int = Query(30, ge=7, le=90, description="Report period in days"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get learning effectiveness report."""
    try:
        # Placeholder implementation - would analyze learning effectiveness
        report = LearningEffectivenessReport(
            time_period=f"{days} days",
            total_users=5000,
            users_with_improvement=3750,
            avg_mastery_gain=0.15,
            topics_analyzed=25,
            effectiveness_by_topic={
                "traffic_signs": 0.78,
                "right_of_way": 0.82,
                "parking_rules": 0.65,
                "speed_limits": 0.88,
                "road_markings": 0.71
            },
            algorithm_performance={
                "SM-2": {
                    "retention_accuracy": 0.85,
                    "optimal_intervals": 0.78,
                    "user_satisfaction": 0.82
                },
                "BKT": {
                    "mastery_prediction": 0.79,
                    "knowledge_tracking": 0.83,
                    "convergence_rate": 0.76
                },
                "IRT": {
                    "ability_estimation": 0.81,
                    "difficulty_calibration": 0.77,
                    "item_discrimination": 0.84
                }
            },
            recommendations=[
                "Increase content for traffic_signs topic",
                "Adjust BKT parameters for better convergence",
                "Review parking_rules content quality"
            ],
            generated_at=datetime.utcnow()
        )
        
        return report
        
    except Exception as e:
        logger.error("Failed to get effectiveness report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve effectiveness report")


@router.get("/health")
async def analytics_health():
    """Analytics service health check."""
    return {
        "status": "healthy",
        "service": "analytics",
        "timestamp": datetime.utcnow().isoformat()
    }