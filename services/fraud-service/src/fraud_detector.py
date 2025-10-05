import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
import logging
import uuid
from collections import defaultdict, deque

from .models import (
    AttemptAnalysisRequest, SessionAnalysisRequest, FraudAnalysisResponse,
    FraudScore, FraudAlert, UserBehaviorProfile, AnomalyDetectionResult,
    RiskLevel, FraudFlag
)
from .database import DatabaseManager
from .config import Settings
from .behavioral_analyzer import BehavioralAnalyzer
from .adaptive_thresholds import AdaptiveThresholdManager, MLFraudDetector, FraudPreventionRecommendationEngine

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self, db_manager: DatabaseManager, settings: Settings):
        self.db = db_manager
        self.settings = settings
        
        # Anomaly detection models
        self.isolation_forest = None
        self.one_class_svm = None
        self.scaler = StandardScaler()
        
        # Advanced fraud detection components
        self.behavioral_analyzer = BehavioralAnalyzer(db_manager)
        self.threshold_manager = AdaptiveThresholdManager(db_manager)
        self.ml_detector = MLFraudDetector(db_manager)
        self.recommendation_engine = FraudPreventionRecommendationEngine()
        
        # In-memory caches for real-time analysis
        self.user_sessions = defaultdict(lambda: deque(maxlen=100))  # Recent sessions per user
        self.user_attempts = defaultdict(lambda: deque(maxlen=1000))  # Recent attempts per user
        self.user_profiles = {}  # Cached behavior profiles
        
        # Rate limiting tracking
        self.user_attempt_counts = defaultdict(lambda: deque(maxlen=100))
        
        # Pattern detection
        self.response_patterns = defaultdict(list)  # Track response patterns
        
        # Network analysis for collusion detection
        self.user_connections = defaultdict(list)  # Track user connections
        
        self.initialized = False
    
    async def initialize(self):
        """Initialize fraud detection models and load user profiles"""
        logger.info("Initializing fraud detection service...")
        
        # Initialize anomaly detection models
        self.isolation_forest = IsolationForest(
            contamination=self.settings.isolation_forest_contamination,
            random_state=42,
            n_estimators=100
        )
        
        self.one_class_svm = OneClassSVM(
            kernel='rbf',
            gamma='scale',
            nu=self.settings.isolation_forest_contamination
        )
        
        # Load existing user behavior profiles
        await self._load_user_profiles()
        
        # Train models if we have enough data
        await self._train_models()
        
        self.initialized = True
        logger.info("Fraud detection service initialized successfully")
    
    async def analyze_attempt(self, request: AttemptAnalysisRequest) -> FraudAnalysisResponse:
        """Analyze a single attempt for fraud indicators"""
        analysis_id = str(uuid.uuid4())
        flags = []
        details = {}
        recommendations = []
        
        # Store attempt for pattern analysis
        self.user_attempts[request.user_id].append({
            'timestamp': request.timestamp,
            'time_taken_ms': request.time_taken_ms,
            'correct': request.correct,
            'item_id': request.item_id,
            'device_type': request.device_type,
            'ip_address': request.ip_address
        })
        
        # Rate limiting check
        rate_limit_score, rate_flags = await self._check_rate_limiting(request)
        flags.extend(rate_flags)
        details['rate_limiting'] = {'score': rate_limit_score}
        
        # Response time analysis
        timing_score, timing_flags = await self._analyze_response_timing(request)
        flags.extend(timing_flags)
        details['timing'] = {'score': timing_score, 'time_taken_ms': request.time_taken_ms}
        
        # Pattern analysis
        pattern_score, pattern_flags = await self._analyze_response_patterns(request)
        flags.extend(pattern_flags)
        details['patterns'] = {'score': pattern_score}
        
        # Device and IP analysis
        device_score, device_flags = await self._analyze_device_behavior(request)
        flags.extend(device_flags)
        details['device'] = {'score': device_score}
        
        # Anomaly detection using ML models
        anomaly_result = await self._detect_anomalies(request)
        if anomaly_result.is_anomaly:
            flags.append(FraudFlag.BOT_BEHAVIOR)
        details['anomaly'] = {
            'is_anomaly': anomaly_result.is_anomaly,
            'score': anomaly_result.anomaly_score,
            'confidence': anomaly_result.confidence
        }
        
        # Advanced behavioral analysis
        user_attempts_list = list(self.user_attempts[request.user_id])
        behavioral_score, behavioral_flags = await self.behavioral_analyzer.analyze_user_behavior(
            request.user_id, user_attempts_list
        )
        flags.extend(behavioral_flags)
        details['behavioral'] = {'score': behavioral_score}
        
        # ML-based fraud prediction
        ml_features = self._extract_ml_features(request, user_attempts_list)
        ml_fraud_prob, ml_confidence = await self.ml_detector.predict_fraud_probability(ml_features)
        details['ml_prediction'] = {
            'fraud_probability': ml_fraud_prob,
            'confidence': ml_confidence
        }
        
        # Calculate overall fraud score with advanced components
        fraud_score = self._calculate_fraud_score([
            rate_limit_score, timing_score, pattern_score, 
            device_score, anomaly_result.anomaly_score,
            behavioral_score, ml_fraud_prob
        ])
        
        # Determine risk level and confidence
        risk_level = self._determine_risk_level(fraud_score)
        confidence = self._calculate_confidence(fraud_score, len(flags))
        
        # Generate advanced recommendations
        user_history = {'recent_attempts': len(user_attempts_list)}
        recommendations = self.recommendation_engine.generate_recommendations(
            fraud_score, flags, user_history
        )
        
        # Update user fraud score
        user_score = FraudScore(
            score=fraud_score,
            confidence=confidence,
            risk_level=risk_level,
            last_updated=datetime.utcnow(),
            active_flags=flags
        )
        await self.db.save_user_fraud_score(request.user_id, user_score)
        
        # Create alert using adaptive threshold
        if self.threshold_manager.should_trigger_alert(fraud_score, 'fraud_score'):
            await self._create_fraud_alert(request.user_id, "high_fraud_score", 
                                         fraud_score, flags, details)
        
        # Log the event
        await self.db.log_fraud_event(
            request.user_id, "attempt", 
            request.dict(), fraud_score, [flag.value for flag in flags]
        )
        
        return FraudAnalysisResponse(
            user_id=request.user_id,
            analysis_id=analysis_id,
            fraud_score=fraud_score,
            confidence=confidence,
            risk_level=risk_level,
            flags=flags,
            details=details,
            recommendations=recommendations
        )
    
    async def analyze_session(self, request: SessionAnalysisRequest) -> FraudAnalysisResponse:
        """Analyze a session for fraud indicators"""
        analysis_id = str(uuid.uuid4())
        flags = []
        details = {}
        recommendations = []
        
        # Store session for analysis
        session_data = {
            'session_id': request.session_id,
            'start_time': request.start_time,
            'end_time': request.end_time,
            'duration_ms': request.total_time_ms,
            'items_attempted': request.items_attempted,
            'accuracy': request.correct_count / max(request.items_attempted, 1),
            'device_type': request.device_type
        }
        self.user_sessions[request.user_id].append(session_data)
        
        # Session duration analysis
        duration_score, duration_flags = await self._analyze_session_duration(request)
        flags.extend(duration_flags)
        details['duration'] = {'score': duration_score}
        
        # Accuracy spike detection
        accuracy_score, accuracy_flags = await self._analyze_accuracy_patterns(request)
        flags.extend(accuracy_flags)
        details['accuracy'] = {'score': accuracy_score}
        
        # Session frequency analysis
        frequency_score, frequency_flags = await self._analyze_session_frequency(request)
        flags.extend(frequency_flags)
        details['frequency'] = {'score': frequency_score}
        
        # Calculate overall fraud score
        fraud_score = self._calculate_fraud_score([
            duration_score, accuracy_score, frequency_score
        ])
        
        risk_level = self._determine_risk_level(fraud_score)
        confidence = self._calculate_confidence(fraud_score, len(flags))
        recommendations = self._generate_recommendations(flags, fraud_score)
        
        # Update user fraud score
        user_score = FraudScore(
            score=fraud_score,
            confidence=confidence,
            risk_level=risk_level,
            last_updated=datetime.utcnow(),
            active_flags=flags
        )
        await self.db.save_user_fraud_score(request.user_id, user_score)
        
        # Create alert if needed
        if fraud_score >= self.settings.fraud_score_threshold:
            await self._create_fraud_alert(request.user_id, "suspicious_session", 
                                         fraud_score, flags, details)
        
        # Log the event
        await self.db.log_fraud_event(
            request.user_id, "session", 
            request.dict(), fraud_score, [flag.value for flag in flags]
        )
        
        return FraudAnalysisResponse(
            user_id=request.user_id,
            analysis_id=analysis_id,
            fraud_score=fraud_score,
            confidence=confidence,
            risk_level=risk_level,
            flags=flags,
            details=details,
            recommendations=recommendations
        )
    
    async def get_user_fraud_score(self, user_id: str) -> FraudScore:
        """Get current fraud score for a user"""
        score = await self.db.get_user_fraud_score(user_id)
        if not score:
            # Return default score for new users
            score = FraudScore(
                score=0.0,
                confidence=0.0,
                risk_level=RiskLevel.LOW,
                last_updated=datetime.utcnow(),
                active_flags=[]
            )
        return score
    
    async def get_fraud_alerts(self, limit: int = 50, offset: int = 0) -> List[FraudAlert]:
        """Get fraud alerts for admin review"""
        return await self.db.get_fraud_alerts(limit, offset)
    
    async def review_alert(self, alert_id: str, action: str, reviewer_id: str, notes: str = ""):
        """Review and take action on a fraud alert"""
        await self.db.update_fraud_alert(alert_id, action, reviewer_id, notes)
        logger.info(f"Alert {alert_id} reviewed by {reviewer_id}: {action}")
    
    # Private methods for fraud detection logic
    
    async def _check_rate_limiting(self, request: AttemptAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Check if user is making attempts too quickly"""
        now = datetime.utcnow()
        user_attempts = self.user_attempt_counts[request.user_id]
        
        # Add current attempt
        user_attempts.append(now)
        
        # Count attempts in last minute
        one_minute_ago = now - timedelta(minutes=1)
        recent_attempts = sum(1 for attempt_time in user_attempts if attempt_time > one_minute_ago)
        
        score = min(recent_attempts / self.settings.max_attempts_per_minute, 1.0)
        flags = []
        
        if recent_attempts > self.settings.max_attempts_per_minute:
            flags.append(FraudFlag.RAPID_RESPONSES)
        
        return score, flags
    
    async def _analyze_response_timing(self, request: AttemptAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze response timing patterns"""
        flags = []
        
        # Check for suspiciously fast responses
        if request.time_taken_ms < self.settings.min_time_between_attempts_ms:
            flags.append(FraudFlag.RAPID_RESPONSES)
        
        # Check for mechanical timing (too consistent)
        user_attempts = list(self.user_attempts[request.user_id])
        if len(user_attempts) >= 5:
            recent_times = [attempt['time_taken_ms'] for attempt in user_attempts[-5:]]
            std_dev = np.std(recent_times)
            mean_time = np.mean(recent_times)
            
            # If standard deviation is very low, timing might be mechanical
            if std_dev < mean_time * 0.1 and mean_time < 5000:  # Less than 10% variation
                flags.append(FraudFlag.MECHANICAL_TIMING)
        
        # Calculate score based on timing anomalies
        score = len(flags) * 0.3  # Each flag contributes 0.3 to score
        
        return min(score, 1.0), flags
    
    async def _analyze_response_patterns(self, request: AttemptAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze response patterns for suspicious behavior"""
        flags = []
        
        # Track response patterns
        pattern_key = f"{request.user_id}_{request.item_id}"
        self.response_patterns[pattern_key].append({
            'selected': request.selected,
            'correct': request.correct,
            'timestamp': request.timestamp
        })
        
        # Check for identical patterns across different users
        # This is a simplified version - in production, you'd want more sophisticated analysis
        user_attempts = list(self.user_attempts[request.user_id])
        if len(user_attempts) >= 10:
            # Check for too many identical response times
            recent_times = [attempt['time_taken_ms'] for attempt in user_attempts[-10:]]
            unique_times = len(set(recent_times))
            
            if unique_times < 3:  # Too few unique response times
                flags.append(FraudFlag.IDENTICAL_PATTERNS)
        
        score = len(flags) * 0.4
        return min(score, 1.0), flags
    
    async def _analyze_device_behavior(self, request: AttemptAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze device and IP behavior"""
        flags = []
        score = 0.0
        
        # Check for suspicious device patterns
        if request.device_type and request.device_type.lower() in ['bot', 'crawler', 'automated']:
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
            score += 0.5
        
        # Check user agent patterns (simplified)
        if request.user_agent and ('bot' in request.user_agent.lower() or 
                                  'crawler' in request.user_agent.lower()):
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
            score += 0.3
        
        return min(score, 1.0), flags
    
    async def _detect_anomalies(self, request: AttemptAnalysisRequest) -> AnomalyDetectionResult:
        """Use ML models to detect anomalies"""
        if not self.initialized or not self.isolation_forest:
            return AnomalyDetectionResult(
                is_anomaly=False,
                anomaly_score=0.0,
                confidence=0.0,
                features_analyzed=[]
            )
        
        # Extract features for anomaly detection
        features = self._extract_features(request)
        
        if len(features) == 0:
            return AnomalyDetectionResult(
                is_anomaly=False,
                anomaly_score=0.0,
                confidence=0.0,
                features_analyzed=[]
            )
        
        try:
            # Reshape for single prediction
            features_array = np.array(features).reshape(1, -1)
            
            # Scale features
            features_scaled = self.scaler.transform(features_array)
            
            # Predict using isolation forest
            anomaly_pred = self.isolation_forest.predict(features_scaled)[0]
            anomaly_score = self.isolation_forest.decision_function(features_scaled)[0]
            
            # Convert to probability (0-1 scale)
            anomaly_prob = max(0, -anomaly_score) / 2  # Rough conversion
            
            is_anomaly = anomaly_pred == -1
            confidence = min(abs(anomaly_score), 1.0)
            
            return AnomalyDetectionResult(
                is_anomaly=is_anomaly,
                anomaly_score=anomaly_prob,
                confidence=confidence,
                features_analyzed=['response_time', 'accuracy', 'session_context']
            )
        
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return AnomalyDetectionResult(
                is_anomaly=False,
                anomaly_score=0.0,
                confidence=0.0,
                features_analyzed=[]
            )
    
    def _extract_features(self, request: AttemptAnalysisRequest) -> List[float]:
        """Extract features for ML analysis"""
        features = []
        
        # Basic features
        features.append(float(request.time_taken_ms))
        features.append(float(request.correct))
        features.append(float(request.hints_used))
        
        # Time-based features
        hour = request.timestamp.hour
        features.append(float(hour))
        features.append(float(request.timestamp.weekday()))
        
        # User history features (if available)
        user_attempts = list(self.user_attempts[request.user_id])
        if user_attempts:
            recent_times = [attempt['time_taken_ms'] for attempt in user_attempts[-10:]]
            features.append(float(np.mean(recent_times)) if recent_times else 0.0)
            features.append(float(np.std(recent_times)) if len(recent_times) > 1 else 0.0)
            
            recent_accuracy = [attempt['correct'] for attempt in user_attempts[-10:]]
            features.append(float(np.mean(recent_accuracy)) if recent_accuracy else 0.0)
        else:
            features.extend([0.0, 0.0, 0.0])
        
        return features
    
    def _extract_ml_features(self, request: AttemptAnalysisRequest, user_attempts: List[Dict[str, Any]]) -> Dict[str, float]:
        """Extract comprehensive features for ML model"""
        features = {}
        
        # Basic attempt features
        features['time_taken_ms'] = float(request.time_taken_ms)
        features['correct'] = float(request.correct)
        features['hints_used'] = float(request.hints_used)
        features['hour_of_day'] = float(request.timestamp.hour)
        features['day_of_week'] = float(request.timestamp.weekday())
        
        # User history features
        if user_attempts:
            recent_times = [attempt['time_taken_ms'] for attempt in user_attempts[-20:]]
            recent_correct = [attempt['correct'] for attempt in user_attempts[-20:]]
            
            features['avg_response_time_20'] = float(np.mean(recent_times)) if recent_times else 0.0
            features['std_response_time_20'] = float(np.std(recent_times)) if len(recent_times) > 1 else 0.0
            features['accuracy_rate_20'] = float(np.mean(recent_correct)) if recent_correct else 0.0
            features['total_attempts'] = float(len(user_attempts))
            
            # Consistency features
            if len(recent_times) > 5:
                cv = np.std(recent_times) / max(np.mean(recent_times), 1)
                features['response_time_cv'] = float(cv)
            else:
                features['response_time_cv'] = 0.0
            
            # Trend features
            if len(user_attempts) >= 10:
                first_half = user_attempts[:len(user_attempts)//2]
                second_half = user_attempts[len(user_attempts)//2:]
                
                first_accuracy = np.mean([a['correct'] for a in first_half])
                second_accuracy = np.mean([a['correct'] for a in second_half])
                features['accuracy_trend'] = float(second_accuracy - first_accuracy)
            else:
                features['accuracy_trend'] = 0.0
        else:
            # Default values for new users
            features.update({
                'avg_response_time_20': 0.0,
                'std_response_time_20': 0.0,
                'accuracy_rate_20': 0.0,
                'total_attempts': 0.0,
                'response_time_cv': 0.0,
                'accuracy_trend': 0.0
            })
        
        # Device and context features
        features['is_mobile'] = 1.0 if request.device_type and 'mobile' in request.device_type.lower() else 0.0
        features['has_user_agent'] = 1.0 if request.user_agent else 0.0
        
        return features
    
    async def _analyze_session_duration(self, request: SessionAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze session duration patterns"""
        flags = []
        
        # Check for unusually short or long sessions
        duration_hours = request.total_time_ms / (1000 * 60 * 60)
        
        if duration_hours > 8:  # More than 8 hours
            flags.append(FraudFlag.UNUSUAL_SESSION_PATTERN)
        elif duration_hours < 0.01:  # Less than 36 seconds
            flags.append(FraudFlag.UNUSUAL_SESSION_PATTERN)
        
        score = len(flags) * 0.3
        return min(score, 1.0), flags
    
    async def _analyze_accuracy_patterns(self, request: SessionAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze accuracy patterns for sudden spikes"""
        flags = []
        
        current_accuracy = request.correct_count / max(request.items_attempted, 1)
        
        # Get user's historical accuracy
        user_sessions = list(self.user_sessions[request.user_id])
        if len(user_sessions) >= 3:
            historical_accuracies = [
                session['accuracy'] for session in user_sessions[-5:-1]  # Exclude current
            ]
            avg_historical = np.mean(historical_accuracies)
            
            # Check for sudden accuracy spike
            if current_accuracy - avg_historical > self.settings.max_accuracy_spike:
                flags.append(FraudFlag.ACCURACY_SPIKE)
        
        score = len(flags) * 0.4
        return min(score, 1.0), flags
    
    async def _analyze_session_frequency(self, request: SessionAnalysisRequest) -> Tuple[float, List[FraudFlag]]:
        """Analyze session frequency patterns"""
        flags = []
        
        # Check for too many sessions in a short time
        user_sessions = list(self.user_sessions[request.user_id])
        if len(user_sessions) >= 10:
            recent_sessions = [s for s in user_sessions if 
                             (request.start_time - s['start_time']).total_seconds() < 3600]  # Last hour
            
            if len(recent_sessions) > 5:  # More than 5 sessions in an hour
                flags.append(FraudFlag.UNUSUAL_SESSION_PATTERN)
        
        score = len(flags) * 0.3
        return min(score, 1.0), flags
    
    def _calculate_fraud_score(self, component_scores: List[float]) -> float:
        """Calculate overall fraud score from component scores"""
        if not component_scores:
            return 0.0
        
        # Weighted average with emphasis on higher scores
        weights = [1.0] * len(component_scores)
        weighted_sum = sum(score * weight for score, weight in zip(component_scores, weights))
        total_weight = sum(weights)
        
        base_score = weighted_sum / total_weight
        
        # Apply non-linear scaling to emphasize higher scores
        return min(base_score ** 0.8, 1.0)
    
    def _determine_risk_level(self, fraud_score: float) -> RiskLevel:
        """Determine risk level based on fraud score"""
        if fraud_score >= 0.8:
            return RiskLevel.CRITICAL
        elif fraud_score >= 0.6:
            return RiskLevel.HIGH
        elif fraud_score >= 0.3:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _calculate_confidence(self, fraud_score: float, num_flags: int) -> float:
        """Calculate confidence in fraud score"""
        # Higher confidence with more flags and extreme scores
        flag_confidence = min(num_flags * 0.2, 0.8)
        score_confidence = abs(fraud_score - 0.5) * 2  # Higher confidence for extreme scores
        
        return min((flag_confidence + score_confidence) / 2, 1.0)
    
    def _generate_recommendations(self, flags: List[FraudFlag], fraud_score: float) -> List[str]:
        """Generate recommendations based on fraud analysis"""
        recommendations = []
        
        if FraudFlag.RAPID_RESPONSES in flags:
            recommendations.append("Implement additional verification for rapid responses")
        
        if FraudFlag.MECHANICAL_TIMING in flags:
            recommendations.append("Require CAPTCHA verification for mechanical timing patterns")
        
        if FraudFlag.ACCURACY_SPIKE in flags:
            recommendations.append("Review recent performance improvements for authenticity")
        
        if FraudFlag.SUSPICIOUS_DEVICE in flags:
            recommendations.append("Block or restrict access from suspicious devices")
        
        if fraud_score >= 0.8:
            recommendations.append("Temporarily suspend account pending manual review")
        elif fraud_score >= 0.6:
            recommendations.append("Require additional identity verification")
        elif fraud_score >= 0.3:
            recommendations.append("Increase monitoring and apply rate limiting")
        
        return recommendations
    
    async def _create_fraud_alert(self, user_id: str, alert_type: str, fraud_score: float, 
                                flags: List[FraudFlag], details: Dict[str, Any]):
        """Create a fraud alert for admin review"""
        alert = FraudAlert(
            id=str(uuid.uuid4()),
            user_id=user_id,
            alert_type=alert_type,
            severity=self._determine_risk_level(fraud_score),
            fraud_score=fraud_score,
            description=f"Fraud detected: {', '.join([flag.value for flag in flags])}",
            details=details,
            created_at=datetime.utcnow()
        )
        
        await self.db.save_fraud_alert(alert)
        logger.warning(f"Fraud alert created for user {user_id}: {alert.description}")
    
    async def _load_user_profiles(self):
        """Load existing user behavior profiles"""
        # This would load profiles from database
        # For now, we'll start with empty profiles
        logger.info("Loading user behavior profiles...")
    
    async def _train_models(self):
        """Train anomaly detection models with historical data"""
        logger.info("Training anomaly detection models...")
        
        # In a real implementation, you would:
        # 1. Load historical attempt data
        # 2. Extract features
        # 3. Train the models
        # 4. Validate performance
        
        # For now, we'll create dummy training data
        try:
            # Generate some dummy training data
            np.random.seed(42)
            n_samples = 1000
            n_features = 8
            
            # Normal behavior data
            normal_data = np.random.normal(0, 1, (n_samples, n_features))
            
            # Fit the scaler
            self.scaler.fit(normal_data)
            
            # Transform data
            normal_data_scaled = self.scaler.transform(normal_data)
            
            # Train models
            self.isolation_forest.fit(normal_data_scaled)
            self.one_class_svm.fit(normal_data_scaled)
            
            logger.info("Anomaly detection models trained successfully")
            
        except Exception as e:
            logger.error(f"Error training models: {e}")
            # Continue without trained models
    
    async def analyze_network_patterns(self, user_id: str, ip_address: str, device_info: Dict[str, Any]) -> Tuple[float, List[FraudFlag]]:
        """Analyze network patterns for collusion detection"""
        flags = []
        score = 0.0
        
        if not ip_address:
            return score, flags
        
        # Track user connections
        connection_info = {
            'user_id': user_id,
            'ip_address': ip_address,
            'device_info': device_info,
            'timestamp': datetime.utcnow()
        }
        self.user_connections[ip_address].append(connection_info)
        
        # Analyze IP sharing patterns
        ip_connections = self.user_connections[ip_address]
        unique_users = set(conn['user_id'] for conn in ip_connections[-100:])  # Last 100 connections
        
        if len(unique_users) > 10:  # Too many users from same IP
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
            score += 0.4
        
        # Analyze simultaneous connections
        recent_connections = [
            conn for conn in ip_connections 
            if (datetime.utcnow() - conn['timestamp']).total_seconds() < 3600  # Last hour
        ]
        
        if len(set(conn['user_id'] for conn in recent_connections)) > 5:
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
            score += 0.3
        
        return min(score, 1.0), flags
    
    async def detect_coordinated_behavior(self, user_ids: List[str]) -> Dict[str, Any]:
        """Detect coordinated behavior patterns across multiple users"""
        if len(user_ids) < 2:
            return {'coordinated': False, 'confidence': 0.0}
        
        # Analyze behavioral similarity
        user_behaviors = {}
        for user_id in user_ids:
            attempts = list(self.user_attempts[user_id])
            if attempts:
                features = self.behavioral_analyzer._extract_behavioral_features(attempts)
                user_behaviors[user_id] = features
        
        if len(user_behaviors) < 2:
            return {'coordinated': False, 'confidence': 0.0}
        
        # Build similarity graph
        similarity_graph = self.behavioral_analyzer.build_user_similarity_graph(user_behaviors)
        
        # Check for highly connected components (potential collusion)
        max_connections = max(len(connections) for connections in similarity_graph.values()) if similarity_graph else 0
        
        coordinated = max_connections >= 3  # 3 or more similar users
        confidence = min(max_connections / 10.0, 1.0)  # Normalize confidence
        
        return {
            'coordinated': coordinated,
            'confidence': confidence,
            'similarity_graph': similarity_graph,
            'max_connections': max_connections
        }
    
    async def update_adaptive_thresholds(self, feedback_data: List[Dict[str, Any]]):
        """Update adaptive thresholds based on feedback"""
        await self.threshold_manager.update_thresholds(feedback_data)
    
    async def retrain_ml_model(self, training_data: List[Dict[str, Any]]):
        """Retrain ML model with new data"""
        await self.ml_detector.train_model(training_data)
    
    async def get_model_insights(self) -> Dict[str, Any]:
        """Get insights from the ML model"""
        feature_importance = await self.ml_detector.get_feature_importance()
        
        return {
            'feature_importance': feature_importance,
            'current_thresholds': self.threshold_manager.thresholds,
            'model_performance': {
                'false_positive_rate': self.threshold_manager.false_positive_rate,
                'false_negative_rate': self.threshold_manager.false_negative_rate
            }
        }