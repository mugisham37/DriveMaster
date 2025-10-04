"""Pydantic schemas for ML service API."""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid


class AttemptRecord(BaseModel):
    """Individual attempt record for ML processing."""
    
    item_id: str
    topic_ids: List[str]
    correct: bool
    quality: int = Field(ge=0, le=5, description="SM-2 quality score")
    time_taken_ms: int = Field(gt=0, description="Time taken in milliseconds")
    timestamp: datetime
    difficulty: Optional[float] = None
    hints_used: int = 0


class PredictionRequest(BaseModel):
    """Request for ML prediction."""
    
    user_id: str
    attempt_history: List[AttemptRecord] = Field(
        description="User's attempt history for sequence modeling"
    )
    candidate_items: List[str] = Field(
        description="Item IDs to predict performance for"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context (time of day, session type, etc.)"
    )
    model_version: Optional[str] = None
    explain: bool = False


class PredictionResponse(BaseModel):
    """Response from ML prediction."""
    
    predictions: Dict[str, float] = Field(
        description="Item ID to probability of correct response"
    )
    confidence_scores: Dict[str, float] = Field(
        description="Confidence intervals for predictions"
    )
    topic_mastery: Dict[str, float] = Field(
        default_factory=dict,
        description="Estimated mastery per topic"
    )
    feature_importance: Optional[Dict[str, float]] = None
    model_version: str
    inference_time_ms: float
    cached: bool = False


class BatchPredictionRequest(BaseModel):
    """Request for batch predictions."""
    
    requests: List[PredictionRequest]
    priority: str = Field(default="normal", regex="^(low|normal|high)$")
    callback_url: Optional[str] = None


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions."""
    
    batch_id: str
    responses: List[PredictionResponse]
    total_inference_time_ms: float
    items_processed: int


class ModelInfo(BaseModel):
    """Information about loaded model."""
    
    model_name: str
    version: str
    loaded_at: datetime
    parameters: Dict[str, Any]
    performance_metrics: Dict[str, float]
    is_active: bool


class HealthStatus(BaseModel):
    """Health check response."""
    
    status: str
    service: str
    version: str
    model_status: Dict[str, str]
    cache_status: str
    uptime_seconds: float
    memory_usage_mb: float


class ExplanationRequest(BaseModel):
    """Request for prediction explanation."""
    
    user_id: str
    item_id: str
    attempt_history: List[AttemptRecord]
    explanation_type: str = Field(default="shap", regex="^(shap|lime|attention)$")


class ExplanationResponse(BaseModel):
    """Response with prediction explanation."""
    
    user_id: str
    item_id: str
    prediction: float
    feature_importance: Dict[str, float]
    explanation_text: str
    visualization_data: Optional[Dict[str, Any]] = None