"""Analytics data models."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    SYSTEM_PERFORMANCE = "system_performance"
    DATA_QUALITY = "data_quality"
    USER_BEHAVIOR = "user_behavior"
    CONTENT_PERFORMANCE = "content_performance"


class MetricType(str, Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    RATE = "rate"


class UserEngagementMetrics(BaseModel):
    """User engagement metrics."""
    timestamp: datetime
    active_users_1h: int = Field(description="Active users in last hour")
    active_users_24h: int = Field(description="Active users in last 24 hours")
    new_users_24h: int = Field(description="New users in last 24 hours")
    sessions_started_1h: int = Field(description="Sessions started in last hour")
    avg_session_duration_minutes: float = Field(description="Average session duration")
    bounce_rate: float = Field(description="Percentage of single-item sessions")
    retention_rate_d1: float = Field(description="Day 1 retention rate")
    retention_rate_d7: float = Field(description="Day 7 retention rate")
    retention_rate_d30: float = Field(description="Day 30 retention rate")


class LearningProgressMetrics(BaseModel):
    """Learning progress and effectiveness metrics."""
    timestamp: datetime
    total_attempts_24h: int = Field(description="Total attempts in last 24 hours")
    avg_accuracy_24h: float = Field(description="Average accuracy in last 24 hours")
    mastery_improvements_24h: int = Field(description="Users with mastery improvements")
    avg_response_time_ms: float = Field(description="Average response time")
    completion_rate: float = Field(description="Session completion rate")
    streak_users: int = Field(description="Users with active learning streaks")
    avg_streak_length: float = Field(description="Average streak length")
    topics_mastered_24h: int = Field(description="Topics mastered in last 24 hours")
    difficulty_distribution: Dict[str, int] = Field(description="Distribution by difficulty")


class ContentPerformanceMetrics(BaseModel):
    """Content performance and effectiveness metrics."""
    timestamp: datetime
    total_items: int = Field(description="Total content items")
    items_attempted_24h: int = Field(description="Unique items attempted in 24h")
    avg_item_accuracy: float = Field(description="Average item accuracy")
    low_performing_items: int = Field(description="Items with <50% accuracy")
    high_performing_items: int = Field(description="Items with >90% accuracy")
    avg_time_per_item_ms: float = Field(description="Average time per item")
    items_by_topic: Dict[str, int] = Field(description="Item distribution by topic")
    difficulty_calibration_accuracy: float = Field(description="IRT difficulty accuracy")
    content_gaps: List[str] = Field(description="Topics with insufficient content")


class SystemPerformanceMetrics(BaseModel):
    """System performance and health metrics."""
    timestamp: datetime
    api_response_time_p95: float = Field(description="95th percentile API response time")
    api_error_rate: float = Field(description="API error rate")
    database_connections: int = Field(description="Active database connections")
    redis_memory_usage_mb: float = Field(description="Redis memory usage")
    kafka_consumer_lag: Dict[str, int] = Field(description="Kafka consumer lag by topic")
    cpu_usage_percent: float = Field(description="CPU usage percentage")
    memory_usage_percent: float = Field(description="Memory usage percentage")
    disk_usage_percent: float = Field(description="Disk usage percentage")
    active_websocket_connections: int = Field(description="Active WebSocket connections")


class Alert(BaseModel):
    """System alert model."""
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None


class MetricDataPoint(BaseModel):
    """Individual metric data point."""
    timestamp: datetime
    value: float
    labels: Dict[str, str] = Field(default_factory=dict)


class TimeSeries(BaseModel):
    """Time series data."""
    metric_name: str
    metric_type: MetricType
    data_points: List[MetricDataPoint]
    start_time: datetime
    end_time: datetime
    resolution: str  # e.g., "1m", "5m", "1h"


class DashboardConfig(BaseModel):
    """Dashboard configuration."""
    user_id: str
    dashboard_name: str
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    refresh_interval: int = 30
    created_at: datetime
    updated_at: datetime


class UserBehaviorInsight(BaseModel):
    """User behavior insight."""
    insight_type: str
    title: str
    description: str
    impact_score: float  # 0-1
    affected_users: int
    recommendation: str
    data: Dict[str, Any]
    generated_at: datetime


class ContentGapAnalysis(BaseModel):
    """Content gap analysis result."""
    topic: str
    jurisdiction: str
    gap_type: str  # "insufficient_content", "difficulty_gap", "quality_gap"
    severity: str  # "low", "medium", "high"
    current_items: int
    recommended_items: int
    avg_accuracy: float
    user_demand: int
    priority_score: float


class LearningEffectivenessReport(BaseModel):
    """Learning effectiveness analysis."""
    time_period: str
    total_users: int
    users_with_improvement: int
    avg_mastery_gain: float
    topics_analyzed: int
    effectiveness_by_topic: Dict[str, float]
    algorithm_performance: Dict[str, Dict[str, float]]  # SM-2, BKT, IRT metrics
    recommendations: List[str]
    generated_at: datetime


class RealtimeMetricsSnapshot(BaseModel):
    """Real-time metrics snapshot for WebSocket updates."""
    timestamp: datetime
    engagement: UserEngagementMetrics
    progress: LearningProgressMetrics
    content: ContentPerformanceMetrics
    system: SystemPerformanceMetrics
    alerts: List[Alert] = Field(default_factory=list)


class MetricsQuery(BaseModel):
    """Metrics query parameters."""
    metric_names: List[str]
    start_time: datetime
    end_time: datetime
    resolution: str = "5m"
    filters: Dict[str, str] = Field(default_factory=dict)
    aggregation: str = "avg"  # avg, sum, min, max, count


class MetricsResponse(BaseModel):
    """Metrics query response."""
    query: MetricsQuery
    time_series: List[TimeSeries]
    total_data_points: int
    execution_time_ms: float
    cached: bool = False