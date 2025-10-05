"""Advanced analytics engine for business intelligence."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
import structlog
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
from sklearn.preprocessing import StandardScaler, LabelEncoder
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

from app.core.database import get_db_session
from app.models.reports import (
    UserSegment, CohortData, ContentGap, PredictionModel,
    BusinessInsight, InsightType, ChurnRisk
)

logger = structlog.get_logger(__name__)


class AnalyticsEngine:
    """Advanced analytics engine for business intelligence reporting."""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
    
    async def analyze_user_retention(
        self,
        start_date: date,
        end_date: date,
        cohort_period: str = "monthly"
    ) -> Dict[str, Any]:
        """Analyze user retention with cohort analysis."""
        
        try:
            async with get_db_session() as db:
                # Get user registration and activity data
                user_data = await self._get_user_activity_data(db, start_date, end_date)
                
                if user_data.empty:
                    return {"error": "No user data available for the specified period"}
                
                # Perform cohort analysis
                cohort_data = self._calculate_cohort_retention(user_data, cohort_period)
                
                # Calculate retention metrics
                retention_metrics = self._calculate_retention_metrics(cohort_data)
                
                # Identify retention patterns
                patterns = self._identify_retention_patterns(cohort_data)
                
                return {
                    "cohort_data": cohort_data,
                    "retention_metrics": retention_metrics,
                    "patterns": patterns,
                    "analysis_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "cohort_period": cohort_period
                    }
                }
                
        except Exception as e:
            logger.error("Failed to analyze user retention", error=str(e))
            raise
    
    async def analyze_learning_effectiveness(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze learning effectiveness across different dimensions."""
        
        try:
            async with get_db_session() as db:
                # Get learning data
                learning_data = await self._get_learning_data(db, start_date, end_date)
                
                if learning_data.empty:
                    return {"error": "No learning data available for the specified period"}
                
                # Algorithm performance analysis
                algorithm_performance = self._analyze_algorithm_performance(learning_data)
                
                # Topic effectiveness analysis
                topic_effectiveness = self._analyze_topic_effectiveness(learning_data)
                
                # User progress analysis
                user_progress = self._analyze_user_progress(learning_data)
                
                # Content impact analysis
                content_impact = self._analyze_content_impact(learning_data)
                
                # Generate recommendations
                recommendations = self._generate_learning_recommendations(
                    algorithm_performance, topic_effectiveness, user_progress, content_impact
                )
                
                return {
                    "algorithm_performance": algorithm_performance,
                    "topic_effectiveness": topic_effectiveness,
                    "user_progress": user_progress,
                    "content_impact": content_impact,
                    "recommendations": recommendations,
                    "analysis_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error("Failed to analyze learning effectiveness", error=str(e))
            raise
    
    async def analyze_content_performance(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Analyze content performance and identify gaps."""
        
        try:
            async with get_db_session() as db:
                # Get content performance data
                content_data = await self._get_content_data(db, start_date, end_date)
                
                if content_data.empty:
                    return {"error": "No content data available for the specified period"}
                
                # Item performance analysis
                item_performance = self._analyze_item_performance(content_data)
                
                # Topic coverage analysis
                topic_analysis = self._analyze_topic_coverage(content_data)
                
                # Difficulty calibration analysis
                difficulty_analysis = self._analyze_difficulty_calibration(content_data)
                
                # Content gap identification
                content_gaps = self._identify_content_gaps(content_data)
                
                # Generate content recommendations
                recommendations = self._generate_content_recommendations(
                    item_performance, topic_analysis, difficulty_analysis, content_gaps
                )
                
                return {
                    "item_performance": item_performance,
                    "topic_analysis": topic_analysis,
                    "difficulty_analysis": difficulty_analysis,
                    "content_gaps": content_gaps,
                    "recommendations": recommendations,
                    "analysis_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error("Failed to analyze content performance", error=str(e))
            raise
    
    async def predict_user_churn(
        self,
        prediction_horizon_days: int = 30
    ) -> Dict[str, Any]:
        """Predict user churn using machine learning."""
        
        try:
            async with get_db_session() as db:
                # Get user behavior data for churn prediction
                user_features = await self._get_user_churn_features(db)
                
                if user_features.empty:
                    return {"error": "Insufficient data for churn prediction"}
                
                # Prepare features for ML model
                X, y, feature_names = self._prepare_churn_features(user_features)
                
                # Train churn prediction model
                model, accuracy, feature_importance = self._train_churn_model(X, y, feature_names)
                
                # Make predictions for active users
                active_users = await self._get_active_users_for_prediction(db)
                predictions = self._predict_churn_for_users(model, active_users, feature_names)
                
                # Analyze churn risk segments
                risk_segments = self._analyze_churn_risk_segments(predictions)
                
                # Generate retention strategies
                retention_strategies = self._generate_retention_strategies(
                    feature_importance, risk_segments
                )
                
                return {
                    "model_performance": {
                        "accuracy": accuracy,
                        "feature_importance": feature_importance
                    },
                    "predictions": predictions,
                    "risk_segments": risk_segments,
                    "retention_strategies": retention_strategies,
                    "prediction_horizon_days": prediction_horizon_days
                }
                
        except Exception as e:
            logger.error("Failed to predict user churn", error=str(e))
            raise
    
    async def generate_predictive_insights(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Generate predictive insights for business planning."""
        
        try:
            async with get_db_session() as db:
                # Get historical data for predictions
                historical_data = await self._get_historical_business_data(db, start_date, end_date)
                
                # User behavior predictions
                user_predictions = await self._predict_user_behavior(historical_data)
                
                # Content demand forecasting
                content_forecast = await self._forecast_content_demand(historical_data)
                
                # Performance predictions
                performance_predictions = await self._predict_performance_metrics(historical_data)
                
                # Business impact forecast
                business_forecast = await self._forecast_business_impact(historical_data)
                
                # Generate actionable recommendations
                recommendations = self._generate_predictive_recommendations(
                    user_predictions, content_forecast, performance_predictions, business_forecast
                )
                
                return {
                    "user_behavior_predictions": user_predictions,
                    "content_demand_forecast": content_forecast,
                    "performance_predictions": performance_predictions,
                    "business_impact_forecast": business_forecast,
                    "recommended_actions": recommendations,
                    "forecast_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error("Failed to generate predictive insights", error=str(e))
            raise
    
    async def detect_anomalies(
        self,
        metric_data: pd.DataFrame,
        metric_name: str,
        sensitivity: float = 2.0
    ) -> List[BusinessInsight]:
        """Detect anomalies in business metrics."""
        
        try:
            insights = []
            
            # Statistical anomaly detection using z-score
            z_scores = np.abs(stats.zscore(metric_data[metric_name]))
            anomalies = metric_data[z_scores > sensitivity]
            
            for _, anomaly in anomalies.iterrows():
                insight = BusinessInsight(
                    insight_type=InsightType.ANOMALY,
                    title=f"Anomaly detected in {metric_name}",
                    description=f"Unusual value of {anomaly[metric_name]} detected on {anomaly.get('date', 'unknown date')}",
                    impact_score=min(z_scores[anomaly.name] / 5.0, 1.0),
                    confidence_score=0.8,
                    affected_metrics=[metric_name],
                    data_points={
                        "anomaly_value": float(anomaly[metric_name]),
                        "z_score": float(z_scores[anomaly.name]),
                        "date": str(anomaly.get('date', ''))
                    },
                    recommendations=[
                        f"Investigate the cause of unusual {metric_name} value",
                        "Check for data quality issues or external factors",
                        "Monitor trend continuation"
                    ]
                )
                insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error("Failed to detect anomalies", metric=metric_name, error=str(e))
            return []
    
    # Helper methods for data retrieval and analysis
    async def _get_user_activity_data(self, db, start_date: date, end_date: date) -> pd.DataFrame:
        """Get user activity data for retention analysis."""
        # Placeholder - would execute actual SQL query
        return pd.DataFrame({
            'user_id': range(1000),
            'registration_date': pd.date_range(start_date, end_date, periods=1000),
            'last_activity_date': pd.date_range(start_date, end_date, periods=1000),
            'total_sessions': np.random.randint(1, 50, 1000),
            'total_attempts': np.random.randint(10, 500, 1000)
        })
    
    def _calculate_cohort_retention(self, user_data: pd.DataFrame, period: str) -> List[CohortData]:
        """Calculate cohort retention rates."""
        cohorts = []
        
        # Group users by registration period
        user_data['cohort_period'] = user_data['registration_date'].dt.to_period(period[0].upper())
        
        for cohort_period, cohort_users in user_data.groupby('cohort_period'):
            cohort_size = len(cohort_users)
            
            # Calculate retention for each period
            retention_periods = []
            for i in range(12):  # 12 periods
                # Simulate retention calculation
                retention_rate = max(0.1, 1.0 - (i * 0.1) - np.random.normal(0, 0.05))
                retention_periods.append({
                    "period": i,
                    "retention_rate": round(retention_rate, 3),
                    "retained_users": int(cohort_size * retention_rate)
                })
            
            cohorts.append(CohortData(
                cohort_date=cohort_period.start_time.date(),
                cohort_size=cohort_size,
                retention_periods=retention_periods,
                ltv_estimate=np.random.uniform(50, 200),
                churn_rate=1 - retention_periods[-1]["retention_rate"]
            ))
        
        return cohorts
    
    def _calculate_retention_metrics(self, cohort_data: List[CohortData]) -> Dict[str, float]:
        """Calculate overall retention metrics."""
        if not cohort_data:
            return {}
        
        # Calculate average retention rates
        avg_retention_1 = np.mean([c.retention_periods[1]["retention_rate"] for c in cohort_data if len(c.retention_periods) > 1])
        avg_retention_7 = np.mean([c.retention_periods[7]["retention_rate"] for c in cohort_data if len(c.retention_periods) > 7])
        avg_ltv = np.mean([c.ltv_estimate for c in cohort_data if c.ltv_estimate])
        avg_churn = np.mean([c.churn_rate for c in cohort_data if c.churn_rate])
        
        return {
            "avg_retention_period_1": round(avg_retention_1, 3),
            "avg_retention_period_7": round(avg_retention_7, 3),
            "avg_lifetime_value": round(avg_ltv, 2),
            "avg_churn_rate": round(avg_churn, 3)
        }
    
    def _identify_retention_patterns(self, cohort_data: List[CohortData]) -> List[str]:
        """Identify patterns in retention data."""
        patterns = []
        
        if not cohort_data:
            return patterns
        
        # Analyze retention curve shapes
        early_retention = [c.retention_periods[1]["retention_rate"] for c in cohort_data if len(c.retention_periods) > 1]
        late_retention = [c.retention_periods[-1]["retention_rate"] for c in cohort_data]
        
        if np.mean(early_retention) < 0.6:
            patterns.append("High early churn - focus on onboarding improvements")
        
        if np.std(late_retention) > 0.1:
            patterns.append("Inconsistent long-term retention across cohorts")
        
        if len(cohort_data) > 3:
            recent_ltv = np.mean([c.ltv_estimate for c in cohort_data[-3:] if c.ltv_estimate])
            older_ltv = np.mean([c.ltv_estimate for c in cohort_data[:-3] if c.ltv_estimate])
            
            if recent_ltv > older_ltv * 1.1:
                patterns.append("Improving user lifetime value in recent cohorts")
            elif recent_ltv < older_ltv * 0.9:
                patterns.append("Declining user lifetime value in recent cohorts")
        
        return patterns
    
    # Additional helper methods would be implemented similarly...
    async def _get_learning_data(self, db, start_date: date, end_date: date) -> pd.DataFrame:
        """Get learning effectiveness data."""
        # Placeholder implementation
        return pd.DataFrame({
            'user_id': np.repeat(range(500), 10),
            'topic': np.tile(['traffic_signs', 'right_of_way', 'parking', 'speed_limits', 'road_markings'], 1000),
            'accuracy': np.random.beta(2, 1, 5000),
            'response_time': np.random.lognormal(3, 0.5, 5000),
            'mastery_gain': np.random.normal(0.1, 0.05, 5000),
            'algorithm': np.tile(['SM-2', 'BKT', 'IRT'], 1667)[:5000]
        })
    
    def _analyze_algorithm_performance(self, learning_data: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Analyze performance of different learning algorithms."""
        performance = {}
        
        for algorithm in learning_data['algorithm'].unique():
            algo_data = learning_data[learning_data['algorithm'] == algorithm]
            
            performance[algorithm] = {
                "avg_accuracy": float(algo_data['accuracy'].mean()),
                "avg_response_time": float(algo_data['response_time'].mean()),
                "avg_mastery_gain": float(algo_data['mastery_gain'].mean()),
                "user_satisfaction": float(np.random.uniform(0.7, 0.9))  # Placeholder
            }
        
        return performance
    
    def _analyze_topic_effectiveness(self, learning_data: pd.DataFrame) -> Dict[str, float]:
        """Analyze effectiveness by topic."""
        topic_effectiveness = {}
        
        for topic in learning_data['topic'].unique():
            topic_data = learning_data[learning_data['topic'] == topic]
            
            # Calculate effectiveness score based on accuracy and mastery gain
            effectiveness = (topic_data['accuracy'].mean() + topic_data['mastery_gain'].mean()) / 2
            topic_effectiveness[topic] = float(effectiveness)
        
        return topic_effectiveness
    
    def _train_churn_model(self, X: np.ndarray, y: np.ndarray, feature_names: List[str]) -> Tuple[Any, float, Dict[str, float]]:
        """Train churn prediction model."""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train Random Forest model
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Calculate accuracy
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Get feature importance
        feature_importance = dict(zip(feature_names, model.feature_importances_))
        
        return model, accuracy, feature_importance