import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import numpy as np

from src.behavioral_analyzer import BehavioralAnalyzer
from src.adaptive_thresholds import AdaptiveThresholdManager, MLFraudDetector, FraudPreventionRecommendationEngine
from src.models import FraudFlag, RiskLevel

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.get_user_behavior_profile = AsyncMock(return_value=None)
    db.save_user_behavior_profile = AsyncMock()
    return db

@pytest.fixture
def behavioral_analyzer(mock_db):
    return BehavioralAnalyzer(mock_db)

@pytest.fixture
def threshold_manager(mock_db):
    return AdaptiveThresholdManager(mock_db)

@pytest.fixture
def ml_detector(mock_db):
    return MLFraudDetector(mock_db)

@pytest.fixture
def recommendation_engine():
    return FraudPreventionRecommendationEngine()

@pytest.mark.asyncio
async def test_behavioral_analysis(behavioral_analyzer):
    """Test behavioral analysis functionality"""
    # Create sample attempt data
    attempts = []
    base_time = datetime.utcnow()
    
    for i in range(20):
        attempts.append({
            'timestamp': base_time + timedelta(minutes=i),
            'time_taken_ms': 3000 + np.random.randint(-500, 500),
            'correct': np.random.choice([True, False], p=[0.7, 0.3]),
            'device_type': 'mobile',
            'ip_address': '192.168.1.1'
        })
    
    score, flags = await behavioral_analyzer.analyze_user_behavior("user123", attempts)
    
    assert 0.0 <= score <= 1.0
    assert isinstance(flags, list)

@pytest.mark.asyncio
async def test_behavioral_features_extraction(behavioral_analyzer):
    """Test behavioral feature extraction"""
    attempts = [
        {
            'timestamp': datetime.utcnow(),
            'time_taken_ms': 3000,
            'correct': True,
            'device_type': 'mobile'
        },
        {
            'timestamp': datetime.utcnow() + timedelta(minutes=1),
            'time_taken_ms': 3200,
            'correct': False,
            'device_type': 'mobile'
        }
    ]
    
    features = behavioral_analyzer._extract_behavioral_features(attempts)
    
    assert 'avg_response_time' in features
    assert 'response_time_std' in features
    assert 'accuracy_rate' in features
    assert 'device_consistency' in features
    assert isinstance(features['avg_response_time'], float)

def test_adaptive_threshold_updates(threshold_manager):
    """Test adaptive threshold management"""
    # Test threshold updates
    feedback_data = [
        {'predicted_fraud': True, 'actual_fraud': True},
        {'predicted_fraud': True, 'actual_fraud': False},
        {'predicted_fraud': False, 'actual_fraud': False},
        {'predicted_fraud': False, 'actual_fraud': True}
    ]
    
    metrics = threshold_manager._calculate_performance_metrics(feedback_data)
    
    assert 'precision' in metrics
    assert 'recall' in metrics
    assert 'false_positive_rate' in metrics
    assert 'false_negative_rate' in metrics
    assert 0.0 <= metrics['precision'] <= 1.0

def test_threshold_trigger_logic(threshold_manager):
    """Test threshold trigger logic"""
    # Test with default threshold
    assert threshold_manager.should_trigger_alert(0.9, 'fraud_score')
    assert not threshold_manager.should_trigger_alert(0.5, 'fraud_score')
    
    # Test threshold retrieval
    threshold = threshold_manager.get_threshold('fraud_score')
    assert isinstance(threshold, float)
    assert 0.0 <= threshold <= 1.0

@pytest.mark.asyncio
async def test_ml_fraud_prediction(ml_detector):
    """Test ML-based fraud prediction"""
    features = {
        'time_taken_ms': 2000.0,
        'correct': 1.0,
        'hints_used': 0.0,
        'hour_of_day': 14.0,
        'accuracy_rate_20': 0.8
    }
    
    fraud_prob, confidence = await ml_detector.predict_fraud_probability(features)
    
    assert 0.0 <= fraud_prob <= 1.0
    assert 0.0 <= confidence <= 1.0

def test_recommendation_generation(recommendation_engine):
    """Test fraud prevention recommendation generation"""
    flags = [FraudFlag.RAPID_RESPONSES, FraudFlag.MECHANICAL_TIMING]
    fraud_score = 0.8
    user_history = {'recent_attempts': 50}
    
    recommendations = recommendation_engine.generate_recommendations(
        fraud_score, flags, user_history
    )
    
    assert isinstance(recommendations, list)
    assert len(recommendations) > 0
    assert all(isinstance(rec, str) for rec in recommendations)

def test_behavior_similarity_calculation(behavioral_analyzer):
    """Test behavioral similarity calculation"""
    behavior1 = {
        'avg_response_time': 3000.0,
        'accuracy_rate': 0.8,
        'session_length': 20.0
    }
    
    behavior2 = {
        'avg_response_time': 3100.0,
        'accuracy_rate': 0.82,
        'session_length': 22.0
    }
    
    similarity = behavioral_analyzer._calculate_behavior_similarity(behavior1, behavior2)
    
    assert 0.0 <= similarity <= 1.0
    assert similarity > 0.9  # Should be high similarity

def test_user_similarity_graph(behavioral_analyzer):
    """Test user similarity graph construction"""
    user_behaviors = {
        'user1': {'avg_response_time': 3000.0, 'accuracy_rate': 0.8},
        'user2': {'avg_response_time': 3050.0, 'accuracy_rate': 0.82},
        'user3': {'avg_response_time': 5000.0, 'accuracy_rate': 0.6}
    }
    
    similarity_graph = behavioral_analyzer.build_user_similarity_graph(user_behaviors)
    
    assert isinstance(similarity_graph, dict)
    # user1 and user2 should be similar, user3 should be different

@pytest.mark.asyncio
async def test_network_anomaly_detection(behavioral_analyzer):
    """Test network anomaly detection"""
    user_connections = [
        {'user_id': 'user1', 'ip_address': '192.168.1.1'},
        {'user_id': 'user2', 'ip_address': '192.168.1.1'},
        {'user_id': 'user3', 'ip_address': '192.168.1.1'},
        # Many users from same IP
    ] * 5  # Simulate 15 users from same IP
    
    score, anomalies = await behavioral_analyzer.detect_network_anomalies(user_connections)
    
    assert 0.0 <= score <= 1.0
    assert isinstance(anomalies, list)

def test_fraud_score_based_recommendations(recommendation_engine):
    """Test recommendations based on fraud score levels"""
    # Test critical score recommendations
    critical_recs = recommendation_engine.generate_recommendations(0.95, [], {})
    assert any('suspend' in rec.lower() for rec in critical_recs)
    
    # Test medium score recommendations
    medium_recs = recommendation_engine.generate_recommendations(0.6, [], {})
    assert any('verification' in rec.lower() for rec in medium_recs)
    
    # Test low score recommendations
    low_recs = recommendation_engine.generate_recommendations(0.3, [], {})
    assert len(low_recs) > 0

if __name__ == "__main__":
    pytest.main([__file__])