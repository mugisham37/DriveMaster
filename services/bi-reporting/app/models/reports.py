"""Business Intelligence reporting data models."""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import uuid


class ReportType(str, Enum):
    USER_RETENTION = "user_retention"
    LEARNING_EFFECTIVENESS = "learning_effectiveness"
    CONTENT_PERFORMANCE = "content_performance"
    REVENUE_ANALYTICS = "revenue_analytics"
    CHURN_ANALYSIS = "churn_analysis"
    PREDICTIVE_INSIGHTS = "predictive_insights"
    EXECUTIVE_SUMMARY = "executive_summary"
    CUSTOM_ANALYTICS = "custom_analytics"


class ReportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"
    HTML = "html"


class TimeGranularity(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class ChurnRisk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReportRequest(BaseModel):
    """Report generation request."""
    report_type: ReportType
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: date
    end_date: date
    filters: Dict[str, Any] = Field(default_factory=dict)
    format: ReportFormat = ReportFormat.PDF
    granularity: TimeGranularity = TimeGranularity.DAILY
    include_predictions: bool = False
    requested_by: str
    email_recipients: List[str] = Field(default_factory=list)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ReportResponse(BaseModel):
    """Report generation response."""
    report_id: str
    status: ReportStatus
    message: str
    estimated_completion_minutes: Optional[int] = None
    download_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReportMetadata(BaseModel):
    """Report metadata."""
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: ReportType
    title: str
    description: Optional[str] = None
    status: ReportStatus = ReportStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    requested_by: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None


class UserRetentionReport(BaseModel):
    """User retention analysis report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    cohort_analysis: List[Dict[str, Any]]
    retention_curves: Dict[str, List[float]]
    churn_analysis: Dict[str, Any]
    recommendations: List[str]


class LearningEffectivenessReport(BaseModel):
    """Learning effectiveness analysis report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    algorithm_performance: Dict[str, Dict[str, float]]
    topic_effectiveness: Dict[str, float]
    user_progress_analysis: Dict[str, Any]
    content_impact_analysis: Dict[str, Any]
    optimization_recommendations: List[str]


class ContentPerformanceReport(BaseModel):
    """Content performance analysis report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    item_performance_metrics: List[Dict[str, Any]]
    topic_analysis: Dict[str, Any]
    difficulty_calibration: Dict[str, Any]
    content_gaps: List[Dict[str, Any]]
    content_recommendations: List[str]


class RevenueAnalyticsReport(BaseModel):
    """Revenue and usage analytics report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    revenue_trends: List[Dict[str, Any]]
    user_value_analysis: Dict[str, Any]
    subscription_metrics: Dict[str, Any]
    conversion_funnel: List[Dict[str, Any]]
    revenue_predictions: Optional[Dict[str, Any]] = None


class ChurnAnalysisReport(BaseModel):
    """User churn analysis report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    churn_rate_trends: List[Dict[str, Any]]
    churn_risk_segments: Dict[ChurnRisk, int]
    churn_predictors: List[Dict[str, Any]]
    at_risk_users: List[Dict[str, Any]]
    retention_strategies: List[str]


class PredictiveInsightsReport(BaseModel):
    """Predictive analytics and insights report."""
    report_metadata: ReportMetadata
    summary: Dict[str, Any]
    user_behavior_predictions: Dict[str, Any]
    content_demand_forecast: Dict[str, Any]
    performance_predictions: Dict[str, Any]
    business_impact_forecast: Dict[str, Any]
    recommended_actions: List[Dict[str, Any]]


class ExecutiveSummaryReport(BaseModel):
    """Executive summary report."""
    report_metadata: ReportMetadata
    key_metrics: Dict[str, Any]
    performance_highlights: List[str]
    growth_trends: Dict[str, Any]
    user_insights: Dict[str, Any]
    content_insights: Dict[str, Any]
    financial_summary: Dict[str, Any]
    strategic_recommendations: List[str]


class CustomAnalyticsReport(BaseModel):
    """Custom analytics report."""
    report_metadata: ReportMetadata
    custom_metrics: Dict[str, Any]
    visualizations: List[Dict[str, Any]]
    analysis_results: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]


class UserSegment(BaseModel):
    """User segment definition."""
    segment_id: str
    name: str
    description: str
    criteria: Dict[str, Any]
    user_count: int
    percentage: float
    characteristics: Dict[str, float]


class CohortData(BaseModel):
    """Cohort analysis data."""
    cohort_date: date
    cohort_size: int
    retention_periods: List[Dict[str, Union[int, float]]]
    ltv_estimate: Optional[float] = None
    churn_rate: Optional[float] = None


class ContentGap(BaseModel):
    """Content gap identification."""
    topic: str
    jurisdiction: str
    gap_type: str
    severity: str
    current_items: int
    recommended_items: int
    user_demand_score: float
    priority_score: float
    estimated_impact: str


class PredictionModel(BaseModel):
    """Prediction model results."""
    model_type: str
    accuracy_score: float
    confidence_interval: tuple[float, float]
    feature_importance: Dict[str, float]
    predictions: List[Dict[str, Any]]
    model_metadata: Dict[str, Any]


class BusinessMetric(BaseModel):
    """Business metric definition."""
    metric_name: str
    current_value: float
    previous_value: Optional[float] = None
    change_percentage: Optional[float] = None
    trend: str  # "up", "down", "stable"
    target_value: Optional[float] = None
    unit: str
    description: str


class ReportSchedule(BaseModel):
    """Scheduled report configuration."""
    schedule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: ReportType
    title: str
    parameters: Dict[str, Any]
    cron_expression: str
    email_recipients: List[str]
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None


class InsightType(str, Enum):
    ANOMALY = "anomaly"
    TREND = "trend"
    CORRELATION = "correlation"
    PREDICTION = "prediction"
    RECOMMENDATION = "recommendation"


class BusinessInsight(BaseModel):
    """Business insight generated from data analysis."""
    insight_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    insight_type: InsightType
    title: str
    description: str
    impact_score: float  # 0-1 scale
    confidence_score: float  # 0-1 scale
    affected_metrics: List[str]
    data_points: Dict[str, Any]
    recommendations: List[str]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


class AnalyticsQuery(BaseModel):
    """Analytics query definition."""
    query_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    sql_query: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    visualization_config: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False


class DashboardConfig(BaseModel):
    """Dashboard configuration."""
    dashboard_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    filters: Dict[str, Any] = Field(default_factory=dict)
    refresh_interval: int = 300  # seconds
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False


class ExportRequest(BaseModel):
    """Data export request."""
    export_type: str
    data_source: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    format: ReportFormat
    include_metadata: bool = True
    requested_by: str