from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudFlag(str, Enum):
    RAPID_RESPONSES = "rapid_responses"
    IDENTICAL_PATTERNS = "identical_patterns"
    MECHANICAL_TIMING = "mechanical_timing"
    ACCURACY_SPIKE = "accuracy_spike"
    BOT_BEHAVIOR = "bot_behavior"
    SUSPICIOUS_DEVICE = "suspicious_device"
    UNUSUAL_SESSION_PATTERN = "unusual_session_pattern"

class AttemptAnalysisRequest(BaseModel):
    user_id: str
    item_id: str
    session_id: str
    client_attempt_id: str
    selected: Dict[str, Any]
    correct: bool
    time_taken_ms: int
    hints_used: int = 0
    device_type: Optional[str] = None
    app_version: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SessionAnalysisRequest(BaseModel):
    session_id: str
    user_id: str
    start_time: datetime
    end_time: datetime
    items_attempted: int
    correct_count: int
    total_time_ms: int
    session_type: str
    device_type: Optional[str] = None
    app_version: Optional[str] = None
    topics_practiced: List[str] = []
    average_difficulty: float = 0.0

class FraudScore(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="Fraud probability score")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the score")
    risk_level: RiskLevel
    last_updated: datetime
    active_flags: List[FraudFlag] = []

class FraudAnalysisResponse(BaseModel):
    user_id: str
    analysis_id: str
    fraud_score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    risk_level: RiskLevel
    flags: List[FraudFlag] = []
    details: Dict[str, Any] = {}
    recommendations: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FraudAlert(BaseModel):
    id: str
    user_id: str
    alert_type: str
    severity: RiskLevel
    fraud_score: float
    description: str
    details: Dict[str, Any] = {}
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    status: str = "pending"  # pending, dismissed, confirmed, investigating
    notes: Optional[str] = None

class UserBehaviorProfile(BaseModel):
    user_id: str
    avg_response_time: float
    response_time_std: float
    accuracy_rate: float
    session_frequency: float
    typical_session_duration: float
    common_devices: List[str] = []
    common_times: List[int] = []  # hours of day
    last_updated: datetime
    sample_size: int

class AnomalyDetectionResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    confidence: float
    features_analyzed: List[str]
    outlier_features: List[str] = []