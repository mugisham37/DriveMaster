import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.fraud_detector import FraudDetector
from src.models import AttemptAnalysisRequest, SessionAnalysisRequest, RiskLevel, FraudFlag
from src.config import Settings

@pytest.fixture
def settings():
    return Settings(
        database_url="postgresql://test:test@localhost:5432/test",
        fraud_score_threshold=0.8,
        max_attempts_per_minute=30,
        min_time_between_attempts_ms=1000
    )

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.initialize = AsyncMock()
    db.save_fraud_alert = AsyncMock()
    db.save_user_fraud_score = AsyncMock()
    db.log_fraud_event = AsyncMock()
    return db

@pytest.fixture
async def fraud_detector(mock_db, settings):
    detector = FraudDetector(mock_db, settings)
    await detector.initialize()
    return detector

@pytest.mark.asyncio
async def test_analyze_attempt_normal_behavior(fraud_detector):
    """Test fraud analysis for normal user behavior"""
    request = AttemptAnalysisRequest(
        user_id="user123",
        item_id="item456",
        session_id="session789",
        client_attempt_id="attempt001",
        selected={"answer": "A"},
        correct=True,
        time_taken_ms=5000,
        hints_used=0,
        device_type="mobile",
        timestamp=datetime.utcnow()
    )
    
    result = await fraud_detector.analyze_attempt(request)
    
    assert result.user_id == "user123"
    assert result.fraud_score >= 0.0
    assert result.fraud_score <= 1.0
    assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert isinstance(result.flags, list)
    assert isinstance(result.recommendations, list)

@pytest.mark.asyncio
async def test_analyze_attempt_rapid_responses(fraud_detector):
    """Test fraud detection for rapid responses"""
    # Simulate rapid attempts
    for i in range(35):  # Exceed max_attempts_per_minute
        request = AttemptAnalysisRequest(
            user_id="user123",
            item_id=f"item{i}",
            session_id="session789",
            client_attempt_id=f"attempt{i}",
            selected={"answer": "A"},
            correct=True,
            time_taken_ms=500,  # Very fast response
            hints_used=0,
            device_type="mobile",
            timestamp=datetime.utcnow()
        )
        
        result = await fraud_detector.analyze_attempt(request)
    
    # Last result should have fraud flags
    assert FraudFlag.RAPID_RESPONSES in result.flags
    assert result.fraud_score > 0.3

@pytest.mark.asyncio
async def test_analyze_session_normal(fraud_detector):
    """Test session analysis for normal behavior"""
    request = SessionAnalysisRequest(
        session_id="session123",
        user_id="user456",
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow(),
        items_attempted=10,
        correct_count=7,
        total_time_ms=600000,  # 10 minutes
        session_type="practice",
        device_type="mobile"
    )
    
    result = await fraud_detector.analyze_session(request)
    
    assert result.user_id == "user456"
    assert result.fraud_score >= 0.0
    assert result.fraud_score <= 1.0
    assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]

@pytest.mark.asyncio
async def test_fraud_score_calculation(fraud_detector):
    """Test fraud score calculation logic"""
    # Test with various component scores
    scores = [0.1, 0.3, 0.5, 0.7, 0.9]
    result = fraud_detector._calculate_fraud_score(scores)
    
    assert 0.0 <= result <= 1.0
    
    # Test with empty scores
    result = fraud_detector._calculate_fraud_score([])
    assert result == 0.0

def test_risk_level_determination(fraud_detector):
    """Test risk level determination"""
    assert fraud_detector._determine_risk_level(0.1) == RiskLevel.LOW
    assert fraud_detector._determine_risk_level(0.4) == RiskLevel.MEDIUM
    assert fraud_detector._determine_risk_level(0.7) == RiskLevel.HIGH
    assert fraud_detector._determine_risk_level(0.9) == RiskLevel.CRITICAL

def test_feature_extraction(fraud_detector):
    """Test feature extraction for ML models"""
    request = AttemptAnalysisRequest(
        user_id="user123",
        item_id="item456",
        session_id="session789",
        client_attempt_id="attempt001",
        selected={"answer": "A"},
        correct=True,
        time_taken_ms=5000,
        hints_used=1,
        device_type="mobile",
        timestamp=datetime.utcnow()
    )
    
    features = fraud_detector._extract_features(request)
    
    assert isinstance(features, list)
    assert len(features) > 0
    assert all(isinstance(f, float) for f in features)

if __name__ == "__main__":
    pytest.main([__file__])