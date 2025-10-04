"""User-specific insights generation from ML predictions."""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from app.models.schemas import AttemptRecord, PredictionResponse
from app.core.logging import get_logger

logger = get_logger(__name__)


class InsightType(Enum):
    LEARNING_MOMENTUM = "learning_momentum"
    TOPIC_MASTERY = "topic_mastery"
    DIFFICULTY_PROGRESSION = "difficulty_progression"
    RESPONSE_PATTERNS = "response_patterns"
    OPTIMAL_TIMING = "optimal_timing"
    KNOWLEDGE_GAPS = "knowledge_gaps"
    STRENGTH_AREAS = "strength_areas"
    IMPROVEMENT_SUGGESTIONS = "improvement_suggestions"


@dataclass
class UserInsight:
    """Represents a personalized insight for a user."""
    
    insight_type: InsightType
    title: str
    description: str
    confidence: float  # 0-1
    priority: str  # "high", "medium", "low"
    actionable_recommendations: List[str]
    supporting_data: Dict[str, Any]
    visualization_data: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert insight to dictionary format."""
        return {
            "type": self.insight_type.value,
            "title": self.title,
            "description": self.description,
            "confidence": self.confidence,
            "priority": self.priority,
            "recommendations": self.actionable_recommendations,
            "supporting_data": self.supporting_data,
            "visualization_data": self.visualization_data
        }


class InsightGenerator:
    """Generates personalized insights from user learning data."""
    
    def __init__(self):
        self.min_attempts_for_insights = 10
        self.recent_window_days = 7
        self.topic_mastery_threshold = 0.8
        self.learning_momentum_window = 5
    
    def generate_user_insights(
        self,
        user_id: str,
        attempt_history: List[AttemptRecord],
        recent_predictions: List[PredictionResponse],
        topic_mastery: Dict[str, float] = None,
        item_metadata: Dict[str, Dict[str, Any]] = None
    ) -> List[UserInsight]:
        """Generate comprehensive insights for a user."""
        
        if len(attempt_history) < self.min_attempts_for_insights:
            return [self._insufficient_data_insight()]
        
        insights = []
        
        # Generate different types of insights
        try:
            insights.append(self._analyze_learning_momentum(attempt_history))
        except Exception as e:
            logger.error("Failed to generate learning momentum insight", error=str(e))
        
        try:
            if topic_mastery:
                insights.extend(self._analyze_topic_mastery(topic_mastery, attempt_history))
        except Exception as e:
            logger.error("Failed to generate topic mastery insights", error=str(e))
        
        try:
            insights.append(self._analyze_difficulty_progression(attempt_history, item_metadata))
        except Exception as e:
            logger.error("Failed to generate difficulty progression insight", error=str(e))
        
        try:
            insights.append(self._analyze_response_patterns(attempt_history))
        except Exception as e:
            logger.error("Failed to generate response patterns insight", error=str(e))
        
        try:
            insights.append(self._analyze_optimal_timing(attempt_history))
        except Exception as e:
            logger.error("Failed to generate optimal timing insight", error=str(e))
        
        try:
            if recent_predictions:
                insights.extend(self._analyze_prediction_insights(recent_predictions, attempt_history))
        except Exception as e:
            logger.error("Failed to generate prediction insights", error=str(e))
        
        # Filter out None insights and sort by priority
        valid_insights = [i for i in insights if i is not None]
        return self._prioritize_insights(valid_insights)
    
    def _analyze_learning_momentum(self, attempt_history: List[AttemptRecord]) -> UserInsight:
        """Analyze learning momentum and trajectory."""
        
        # Get recent attempts
        recent_attempts = attempt_history[-self.learning_momentum_window:]
        
        if len(recent_attempts) < 3:
            return None
        
        # Calculate accuracy trend
        accuracies = [1 if attempt.correct else 0 for attempt in recent_attempts]
        
        # Simple linear trend
        x = np.arange(len(accuracies))
        if len(x) > 1:
            trend = np.polyfit(x, accuracies, 1)[0]
        else:
            trend = 0
        
        current_accuracy = np.mean(accuracies)
        
        # Determine momentum
        if trend > 0.1:
            momentum_type = "positive"
            title = "Strong Learning Momentum 📈"
            description = f"You're on a roll! Your accuracy has been improving consistently over your last {len(recent_attempts)} attempts."
            priority = "high"
            recommendations = [
                "Keep up the great work with your current study routine",
                "Consider tackling slightly more challenging topics",
                "Maintain your current practice schedule"
            ]
        elif trend < -0.1:
            momentum_type = "negative"
            title = "Learning Momentum Declining 📉"
            description = f"Your performance has been declining in recent attempts. This might indicate fatigue or need for review."
            priority = "high"
            recommendations = [
                "Take a short break to avoid burnout",
                "Review fundamental concepts",
                "Consider studying in shorter, more focused sessions"
            ]
        else:
            momentum_type = "stable"
            title = "Steady Learning Progress 📊"
            description = f"Your performance has been consistent with {current_accuracy:.1%} accuracy in recent attempts."
            priority = "medium"
            recommendations = [
                "Your current approach is working well",
                "Consider gradually increasing difficulty",
                "Focus on areas where you want to improve"
            ]
        
        supporting_data = {
            "trend_slope": trend,
            "current_accuracy": current_accuracy,
            "recent_attempts_count": len(recent_attempts),
            "momentum_type": momentum_type
        }
        
        visualization_data = {
            "type": "line_chart",
            "data": {
                "x": list(range(len(accuracies))),
                "y": accuracies,
                "trend_line": [trend * i + accuracies[0] for i in range(len(accuracies))]
            },
            "title": "Recent Performance Trend"
        }
        
        return UserInsight(
            insight_type=InsightType.LEARNING_MOMENTUM,
            title=title,
            description=description,
            confidence=0.8,
            priority=priority,
            actionable_recommendations=recommendations,
            supporting_data=supporting_data,
            visualization_data=visualization_data
        )
    
    def _analyze_topic_mastery(
        self,
        topic_mastery: Dict[str, float],
        attempt_history: List[AttemptRecord]
    ) -> List[UserInsight]:
        """Analyze topic mastery levels and identify strengths/gaps."""
        
        insights = []
        
        # Sort topics by mastery level
        sorted_topics = sorted(topic_mastery.items(), key=lambda x: x[1], reverse=True)
        
        # Identify strong topics
        strong_topics = [(topic, score) for topic, score in sorted_topics 
                        if score >= self.topic_mastery_threshold]
        
        if strong_topics:
            top_topics = strong_topics[:3]
            title = "Your Strongest Topics 🌟"
            description = f"You've mastered {len(strong_topics)} topics! Your top areas are: {', '.join([t[0] for t in top_topics])}"
            
            insights.append(UserInsight(
                insight_type=InsightType.STRENGTH_AREAS,
                title=title,
                description=description,
                confidence=0.9,
                priority="medium",
                actionable_recommendations=[
                    "Use these strong areas to build confidence",
                    "Help others in these topics to reinforce your knowledge",
                    "Connect new concepts to these well-understood areas"
                ],
                supporting_data={
                    "strong_topics": strong_topics,
                    "mastery_threshold": self.topic_mastery_threshold
                },
                visualization_data={
                    "type": "bar_chart",
                    "data": {
                        "topics": [t[0] for t in top_topics],
                        "scores": [t[1] for t in top_topics]
                    },
                    "title": "Top Mastered Topics"
                }
            ))
        
        # Identify knowledge gaps
        weak_topics = [(topic, score) for topic, score in sorted_topics 
                      if score < 0.5]
        
        if weak_topics:
            bottom_topics = weak_topics[-3:]  # Bottom 3
            title = "Knowledge Gaps to Address 🎯"
            description = f"Focus on these {len(weak_topics)} topics where you need more practice: {', '.join([t[0] for t in bottom_topics])}"
            
            insights.append(UserInsight(
                insight_type=InsightType.KNOWLEDGE_GAPS,
                title=title,
                description=description,
                confidence=0.85,
                priority="high",
                actionable_recommendations=[
                    "Dedicate extra study time to these topics",
                    "Break down complex topics into smaller concepts",
                    "Seek additional resources or explanations",
                    "Practice with easier questions first, then progress"
                ],
                supporting_data={
                    "weak_topics": weak_topics,
                    "improvement_needed": len(weak_topics)
                },
                visualization_data={
                    "type": "bar_chart",
                    "data": {
                        "topics": [t[0] for t in bottom_topics],
                        "scores": [t[1] for t in bottom_topics]
                    },
                    "title": "Topics Needing Attention"
                }
            ))
        
        return insights
    
    def _analyze_difficulty_progression(
        self,
        attempt_history: List[AttemptRecord],
        item_metadata: Dict[str, Dict[str, Any]] = None
    ) -> UserInsight:
        """Analyze how user performs across different difficulty levels."""
        
        if not item_metadata:
            return None
        
        # Group attempts by difficulty
        difficulty_performance = {}
        
        for attempt in attempt_history:
            item_info = item_metadata.get(attempt.item_id, {})
            difficulty = item_info.get('difficulty', 'medium')
            
            if difficulty not in difficulty_performance:
                difficulty_performance[difficulty] = []
            
            difficulty_performance[difficulty].append(1 if attempt.correct else 0)
        
        # Calculate accuracy by difficulty
        difficulty_accuracy = {}
        for difficulty, results in difficulty_performance.items():
            if len(results) >= 3:  # Minimum attempts for reliable metric
                difficulty_accuracy[difficulty] = np.mean(results)
        
        if len(difficulty_accuracy) < 2:
            return None
        
        # Analyze progression
        sorted_difficulties = sorted(difficulty_accuracy.items(), key=lambda x: x[1], reverse=True)
        best_difficulty = sorted_difficulties[0]
        worst_difficulty = sorted_difficulties[-1]
        
        # Determine if user is ready for harder content
        easy_accuracy = difficulty_accuracy.get('easy', 0)
        medium_accuracy = difficulty_accuracy.get('medium', 0)
        hard_accuracy = difficulty_accuracy.get('hard', 0)
        
        if easy_accuracy > 0.8 and medium_accuracy > 0.7:
            title = "Ready for Advanced Challenges 🚀"
            description = "Your performance on easier content is strong. Time to tackle more challenging material!"
            priority = "medium"
            recommendations = [
                "Gradually increase question difficulty",
                "Focus on advanced topics in your strong areas",
                "Challenge yourself with complex scenarios"
            ]
        elif easy_accuracy < 0.6:
            title = "Focus on Fundamentals 📚"
            description = "Strengthen your foundation with easier content before advancing."
            priority = "high"
            recommendations = [
                "Spend more time on basic concepts",
                "Use easier practice questions to build confidence",
                "Ensure you understand prerequisites"
            ]
        else:
            title = "Balanced Difficulty Approach 📊"
            description = "You're handling different difficulty levels appropriately."
            priority = "low"
            recommendations = [
                "Continue with your current mix of difficulties",
                "Gradually increase challenge as you improve"
            ]
        
        return UserInsight(
            insight_type=InsightType.DIFFICULTY_PROGRESSION,
            title=title,
            description=description,
            confidence=0.75,
            priority=priority,
            actionable_recommendations=recommendations,
            supporting_data=difficulty_accuracy,
            visualization_data={
                "type": "bar_chart",
                "data": {
                    "difficulties": list(difficulty_accuracy.keys()),
                    "accuracies": list(difficulty_accuracy.values())
                },
                "title": "Performance by Difficulty Level"
            }
        )
    
    def _analyze_response_patterns(self, attempt_history: List[AttemptRecord]) -> UserInsight:
        """Analyze response time patterns and efficiency."""
        
        response_times = [attempt.time_taken_ms / 1000 for attempt in attempt_history]  # Convert to seconds
        
        avg_time = np.mean(response_times)
        time_std = np.std(response_times)
        
        # Analyze time vs accuracy correlation
        accuracies = [1 if attempt.correct else 0 for attempt in attempt_history]
        
        if len(response_times) > 5:
            correlation = np.corrcoef(response_times, accuracies)[0, 1]
        else:
            correlation = 0
        
        # Determine pattern
        if avg_time < 30 and np.mean(accuracies) > 0.7:
            title = "Efficient and Accurate ⚡"
            description = f"You're both fast (avg: {avg_time:.1f}s) and accurate ({np.mean(accuracies):.1%}). Great efficiency!"
            priority = "low"
            recommendations = [
                "Your current pace is excellent",
                "Consider tackling more challenging content"
            ]
        elif avg_time > 120:
            title = "Take Your Time, But Consider Efficiency ⏰"
            description = f"Your average response time is {avg_time:.1f}s. While accuracy matters most, efficiency is also important."
            priority = "medium"
            recommendations = [
                "Practice with time limits to improve speed",
                "Focus on pattern recognition",
                "Review concepts to increase familiarity"
            ]
        elif correlation < -0.3:
            title = "Slow Down for Better Accuracy 🎯"
            description = "You tend to be more accurate when you take more time. Don't rush!"
            priority = "medium"
            recommendations = [
                "Take time to read questions carefully",
                "Double-check your answers",
                "Focus on accuracy over speed initially"
            ]
        else:
            title = "Balanced Response Timing ⚖️"
            description = f"Your response timing (avg: {avg_time:.1f}s) seems appropriate for your accuracy level."
            priority = "low"
            recommendations = [
                "Continue with your current approach",
                "Gradually work on improving both speed and accuracy"
            ]
        
        return UserInsight(
            insight_type=InsightType.RESPONSE_PATTERNS,
            title=title,
            description=description,
            confidence=0.7,
            priority=priority,
            actionable_recommendations=recommendations,
            supporting_data={
                "avg_response_time": avg_time,
                "time_std": time_std,
                "time_accuracy_correlation": correlation
            },
            visualization_data={
                "type": "scatter_plot",
                "data": {
                    "x": response_times[-20:],  # Last 20 attempts
                    "y": accuracies[-20:],
                    "x_label": "Response Time (seconds)",
                    "y_label": "Accuracy"
                },
                "title": "Response Time vs Accuracy"
            }
        )
    
    def _analyze_optimal_timing(self, attempt_history: List[AttemptRecord]) -> UserInsight:
        """Analyze when user performs best (time of day, day of week)."""
        
        # Extract timing information
        performance_by_hour = {}
        
        for attempt in attempt_history:
            hour = attempt.timestamp.hour
            if hour not in performance_by_hour:
                performance_by_hour[hour] = []
            performance_by_hour[hour].append(1 if attempt.correct else 0)
        
        # Find best performing hours
        hour_accuracy = {}
        for hour, results in performance_by_hour.items():
            if len(results) >= 3:  # Minimum attempts
                hour_accuracy[hour] = np.mean(results)
        
        if len(hour_accuracy) < 2:
            return None
        
        best_hour = max(hour_accuracy.items(), key=lambda x: x[1])
        worst_hour = min(hour_accuracy.items(), key=lambda x: x[1])
        
        # Format time
        def format_hour(hour):
            if hour == 0:
                return "12 AM"
            elif hour < 12:
                return f"{hour} AM"
            elif hour == 12:
                return "12 PM"
            else:
                return f"{hour - 12} PM"
        
        best_time = format_hour(best_hour[0])
        worst_time = format_hour(worst_hour[0])
        
        title = f"Peak Performance Time: {best_time} 🕐"
        description = f"You perform best around {best_time} ({best_hour[1]:.1%} accuracy) and struggle more around {worst_time} ({worst_hour[1]:.1%} accuracy)."
        
        recommendations = [
            f"Schedule important study sessions around {best_time}",
            f"Avoid challenging material around {worst_time}",
            "Consider your energy levels and daily routine",
            "Use peak hours for learning new concepts"
        ]
        
        return UserInsight(
            insight_type=InsightType.OPTIMAL_TIMING,
            title=title,
            description=description,
            confidence=0.6,
            priority="medium",
            actionable_recommendations=recommendations,
            supporting_data=hour_accuracy,
            visualization_data={
                "type": "line_chart",
                "data": {
                    "x": list(hour_accuracy.keys()),
                    "y": list(hour_accuracy.values()),
                    "x_label": "Hour of Day",
                    "y_label": "Accuracy"
                },
                "title": "Performance by Time of Day"
            }
        )
    
    def _analyze_prediction_insights(
        self,
        recent_predictions: List[PredictionResponse],
        attempt_history: List[AttemptRecord]
    ) -> List[UserInsight]:
        """Generate insights from recent ML predictions."""
        
        insights = []
        
        # Analyze prediction confidence patterns
        if recent_predictions:
            avg_confidence = np.mean([
                np.mean(list(pred.confidence_scores.values())) 
                for pred in recent_predictions 
                if pred.confidence_scores
            ])
            
            if avg_confidence > 0.8:
                title = "High Prediction Confidence 🎯"
                description = "The AI is very confident about your performance predictions. Your learning patterns are clear!"
                priority = "low"
                recommendations = [
                    "Trust the system's recommendations",
                    "You're on a predictable learning path"
                ]
            elif avg_confidence < 0.4:
                title = "Unpredictable Learning Pattern 🔄"
                description = "Your learning pattern is less predictable. This could indicate you're in a growth phase!"
                priority = "medium"
                recommendations = [
                    "Focus on consistent study habits",
                    "This variability is normal during learning",
                    "Keep practicing regularly"
                ]
            else:
                return insights  # No insight needed for medium confidence
            
            insights.append(UserInsight(
                insight_type=InsightType.IMPROVEMENT_SUGGESTIONS,
                title=title,
                description=description,
                confidence=0.6,
                priority=priority,
                actionable_recommendations=recommendations,
                supporting_data={"avg_confidence": avg_confidence}
            ))
        
        return insights
    
    def _insufficient_data_insight(self) -> UserInsight:
        """Generate insight when there's insufficient data."""
        
        return UserInsight(
            insight_type=InsightType.IMPROVEMENT_SUGGESTIONS,
            title="Keep Practicing for Personalized Insights 📈",
            description=f"Complete at least {self.min_attempts_for_insights} practice attempts to unlock personalized learning insights.",
            confidence=1.0,
            priority="medium",
            actionable_recommendations=[
                "Continue practicing regularly",
                "Try different types of questions",
                "Focus on understanding concepts, not just memorizing"
            ],
            supporting_data={"min_attempts_needed": self.min_attempts_for_insights}
        )
    
    def _prioritize_insights(self, insights: List[UserInsight]) -> List[UserInsight]:
        """Sort insights by priority and confidence."""
        
        priority_order = {"high": 3, "medium": 2, "low": 1}
        
        return sorted(
            insights,
            key=lambda x: (priority_order.get(x.priority, 0), x.confidence),
            reverse=True
        )


# Global insight generator
insight_generator = InsightGenerator()