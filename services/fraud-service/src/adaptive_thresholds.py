import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os

from .database import DatabaseManager
from .models import FraudFlag, RiskLevel

logger = logging.getLogger(__name__)

class AdaptiveThresholdManager:
    """Manages adaptive thresholds for fraud detection"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.thresholds = {
            'fraud_score': 0.8,
            'anomaly_score': 0.7,
            'rate_limit': 30,
            'response_time_min': 1000,
            'accuracy_spike': 0.3,
            'device_changes': 3
        }
        
        # Historical performance tracking
        self.performance_history = deque(maxlen=1000)
        self.false_positive_rate = 0.05
        self.false_negative_rate = 0.02
        
        # Adaptive learning parameters
        self.learning_rate = 0.01
        self.adaptation_window = 100  # Number of samples for adaptation
        
    async def update_thresholds(self, feedback_data: List[Dict[str, Any]]):
        """Update thresholds based on feedback and performance"""
        if len(feedback_data) < 10:
            return
        
        # Calculate current performance metrics
        metrics = self._calculate_performance_metrics(feedback_data)
        
        # Adapt thresholds based on performance
        await self._adapt_fraud_score_threshold(metrics)
        await self._adapt_anomaly_threshold(metrics)
        await self._adapt_rate_limits(metrics)
        
        logger.info(f"Updated adaptive thresholds: {self.thresholds}")
    
    def _calculate_performance_metrics(self, feedback_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate performance metrics from feedback data"""
        if not feedback_data:
            return {}
        
        true_positives = sum(1 for item in feedback_data 
                           if item.get('predicted_fraud', False) and item.get('actual_fraud', False))
        false_positives = sum(1 for item in feedback_data 
                            if item.get('predicted_fraud', False) and not item.get('actual_fraud', False))
        true_negatives = sum(1 for item in feedback_data 
                           if not item.get('predicted_fraud', False) and not item.get('actual_fraud', False))
        false_negatives = sum(1 for item in feedback_data 
                            if not item.get('predicted_fraud', False) and item.get('actual_fraud', False))
        
        total = len(feedback_data)
        
        metrics = {
            'precision': true_positives / max(true_positives + false_positives, 1),
            'recall': true_positives / max(true_positives + false_negatives, 1),
            'false_positive_rate': false_positives / max(false_positives + true_negatives, 1),
            'false_negative_rate': false_negatives / max(false_negatives + true_positives, 1),
            'accuracy': (true_positives + true_negatives) / total
        }
        
        return metrics
    
    async def _adapt_fraud_score_threshold(self, metrics: Dict[str, float]):
        """Adapt fraud score threshold based on performance"""
        current_fpr = metrics.get('false_positive_rate', 0)
        current_fnr = metrics.get('false_negative_rate', 0)
        
        # If false positive rate is too high, increase threshold
        if current_fpr > self.false_positive_rate * 1.5:
            self.thresholds['fraud_score'] = min(0.95, self.thresholds['fraud_score'] + self.learning_rate)
        
        # If false negative rate is too high, decrease threshold
        elif current_fnr > self.false_negative_rate * 1.5:
            self.thresholds['fraud_score'] = max(0.3, self.thresholds['fraud_score'] - self.learning_rate)
    
    async def _adapt_anomaly_threshold(self, metrics: Dict[str, float]):
        """Adapt anomaly detection threshold"""
        # Similar logic to fraud score threshold
        current_fpr = metrics.get('false_positive_rate', 0)
        
        if current_fpr > self.false_positive_rate * 1.2:
            self.thresholds['anomaly_score'] = min(0.9, self.thresholds['anomaly_score'] + self.learning_rate)
        elif current_fpr < self.false_positive_rate * 0.8:
            self.thresholds['anomaly_score'] = max(0.4, self.thresholds['anomaly_score'] - self.learning_rate)
    
    async def _adapt_rate_limits(self, metrics: Dict[str, float]):
        """Adapt rate limiting thresholds"""
        # Adjust rate limits based on legitimate user behavior patterns
        # This would involve analyzing normal user request patterns
        pass
    
    def get_threshold(self, threshold_name: str) -> float:
        """Get current threshold value"""
        return self.thresholds.get(threshold_name, 0.5)
    
    def should_trigger_alert(self, score: float, threshold_name: str) -> bool:
        """Check if score exceeds adaptive threshold"""
        threshold = self.get_threshold(threshold_name)
        return score >= threshold

class MLFraudDetector:
    """Machine learning-based fraud detection with continuous learning"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.model = None
        self.feature_columns = []
        self.model_path = "models/fraud_detection_model.joblib"
        self.retrain_threshold = 1000  # Retrain after this many new samples
        self.samples_since_retrain = 0
        
        # Initialize model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
    
    async def train_model(self, training_data: List[Dict[str, Any]]):
        """Train the ML model with labeled data"""
        if len(training_data) < 100:
            logger.warning("Insufficient training data for ML model")
            return
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(training_data)
            
            # Extract features and labels
            feature_columns = [col for col in df.columns if col not in ['user_id', 'is_fraud', 'timestamp']]
            X = df[feature_columns].fillna(0)
            y = df['is_fraud'].astype(int)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train model
            self.model.fit(X_train, y_train)
            self.feature_columns = feature_columns
            
            # Evaluate model
            y_pred = self.model.predict(X_test)
            y_pred_proba = self.model.predict_proba(X_test)[:, 1]
            
            auc_score = roc_auc_score(y_test, y_pred_proba)
            
            logger.info(f"ML model trained successfully. AUC: {auc_score:.3f}")
            logger.info(f"Classification report:\n{classification_report(y_test, y_pred)}")
            
            # Save model
            await self._save_model()
            
        except Exception as e:
            logger.error(f"Error training ML model: {e}")
    
    async def predict_fraud_probability(self, features: Dict[str, Any]) -> Tuple[float, float]:
        """Predict fraud probability for given features"""
        if not self.model or not self.feature_columns:
            return 0.5, 0.0  # Default prediction with low confidence
        
        try:
            # Prepare features
            feature_vector = []
            for col in self.feature_columns:
                feature_vector.append(features.get(col, 0))
            
            # Make prediction
            X = np.array(feature_vector).reshape(1, -1)
            fraud_probability = self.model.predict_proba(X)[0, 1]
            
            # Calculate confidence based on prediction certainty
            confidence = abs(fraud_probability - 0.5) * 2
            
            return fraud_probability, confidence
            
        except Exception as e:
            logger.error(f"Error in ML prediction: {e}")
            return 0.5, 0.0
    
    async def update_model(self, new_data: List[Dict[str, Any]]):
        """Update model with new labeled data"""
        self.samples_since_retrain += len(new_data)
        
        if self.samples_since_retrain >= self.retrain_threshold:
            # Retrain model with all available data
            all_data = await self._get_all_training_data()
            all_data.extend(new_data)
            await self.train_model(all_data)
            self.samples_since_retrain = 0
    
    async def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from the trained model"""
        if not self.model or not self.feature_columns:
            return {}
        
        try:
            importances = self.model.feature_importances_
            return dict(zip(self.feature_columns, importances))
        except Exception as e:
            logger.error(f"Error getting feature importance: {e}")
            return {}
    
    async def _save_model(self):
        """Save the trained model to disk"""
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_data = {
                'model': self.model,
                'feature_columns': self.feature_columns,
                'timestamp': datetime.utcnow()
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
    
    async def _load_model(self):
        """Load the trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.feature_columns = model_data['feature_columns']
                logger.info(f"Model loaded from {self.model_path}")
                return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
        return False
    
    async def _get_all_training_data(self) -> List[Dict[str, Any]]:
        """Get all available training data from database"""
        # This would query the database for historical fraud detection data
        # For now, return empty list
        return []

class FraudPreventionRecommendationEngine:
    """Generate fraud prevention recommendations"""
    
    def __init__(self):
        self.recommendation_rules = {
            FraudFlag.RAPID_RESPONSES: [
                "Implement CAPTCHA verification for rapid responses",
                "Add progressive delays for consecutive rapid attempts",
                "Require email verification for suspicious activity"
            ],
            FraudFlag.MECHANICAL_TIMING: [
                "Require additional identity verification",
                "Implement randomized question timing",
                "Add behavioral biometric verification"
            ],
            FraudFlag.ACCURACY_SPIKE: [
                "Review recent performance improvements manually",
                "Require video proctoring for high-stakes assessments",
                "Implement adaptive difficulty adjustment"
            ],
            FraudFlag.BOT_BEHAVIOR: [
                "Block automated access attempts",
                "Require human verification (CAPTCHA)",
                "Implement device fingerprinting"
            ],
            FraudFlag.SUSPICIOUS_DEVICE: [
                "Restrict access from suspicious devices",
                "Require device registration and verification",
                "Implement geolocation verification"
            ]
        }
    
    def generate_recommendations(self, fraud_score: float, flags: List[FraudFlag], 
                               user_history: Dict[str, Any]) -> List[str]:
        """Generate personalized fraud prevention recommendations"""
        recommendations = []
        
        # Flag-specific recommendations
        for flag in flags:
            if flag in self.recommendation_rules:
                recommendations.extend(self.recommendation_rules[flag])
        
        # Score-based recommendations
        if fraud_score >= 0.9:
            recommendations.extend([
                "Immediately suspend account pending investigation",
                "Require in-person identity verification",
                "Flag all associated accounts for review"
            ])
        elif fraud_score >= 0.7:
            recommendations.extend([
                "Require additional verification steps",
                "Limit access to high-value features",
                "Increase monitoring frequency"
            ])
        elif fraud_score >= 0.5:
            recommendations.extend([
                "Apply enhanced monitoring",
                "Require periodic re-authentication",
                "Implement soft rate limiting"
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)
        
        return unique_recommendations[:5]  # Limit to top 5 recommendations