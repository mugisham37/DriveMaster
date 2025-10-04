"""Model explainability service using SHAP."""

import torch
import numpy as np
import shap
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

from app.models.schemas import (
    ExplanationRequest,
    ExplanationResponse,
    AttemptRecord
)
from app.core.model_manager import model_manager
from app.core.logging import get_logger
from app.services.inference import InferenceService
from app.explainability.bias_detection import BiasDetector, BiasMetric
from app.explainability.insights import insight_generator

logger = get_logger(__name__)


class ExplanationService:
    """Service for model explainability and insights."""
    
    def __init__(self, inference_service: InferenceService):
        self.inference_service = inference_service
        self.explainer_cache: Dict[str, Any] = {}
        self.background_samples: Optional[torch.Tensor] = None
        self.bias_detector = BiasDetector()
        
        # Cache for user insights
        self.user_insights_cache: Dict[str, Dict[str, Any]] = {}
        self.insights_cache_ttl = 3600  # 1 hour
    
    async def initialize(self) -> None:
        """Initialize the explanation service."""
        try:
            # Generate background samples for SHAP
            await self._generate_background_samples()
            logger.info("Explanation service initialized")
            
        except Exception as e:
            logger.error("Failed to initialize explanation service", error=str(e))
            raise
    
    async def explain_prediction(self, request: ExplanationRequest) -> ExplanationResponse:
        """Generate explanation for a prediction."""
        try:
            # Get the prediction first
            prediction_prob = await self._get_prediction_for_item(
                request.user_id,
                request.item_id,
                request.attempt_history
            )
            
            # Generate explanation based on type
            if request.explanation_type == "shap":
                feature_importance = await self._generate_shap_explanation(
                    request.user_id,
                    request.item_id,
                    request.attempt_history
                )
            else:
                raise ValueError(f"Unsupported explanation type: {request.explanation_type}")
            
            # Generate human-readable explanation
            explanation_text = self._generate_explanation_text(
                feature_importance,
                prediction_prob,
                request.item_id
            )
            
            # Create visualization data
            visualization_data = self._create_visualization_data(
                feature_importance,
                request.attempt_history
            )
            
            return ExplanationResponse(
                user_id=request.user_id,
                item_id=request.item_id,
                prediction=prediction_prob,
                feature_importance=feature_importance,
                explanation_text=explanation_text,
                visualization_data=visualization_data
            )
            
        except Exception as e:
            logger.error(
                "Explanation generation failed",
                error=str(e),
                user_id=request.user_id,
                item_id=request.item_id
            )
            raise
    
    async def _get_prediction_for_item(
        self,
        user_id: str,
        item_id: str,
        attempt_history: List[AttemptRecord]
    ) -> float:
        """Get prediction probability for a specific item."""
        try:
            # Create a prediction request for this single item
            from app.models.schemas import PredictionRequest
            
            pred_request = PredictionRequest(
                user_id=user_id,
                attempt_history=attempt_history,
                candidate_items=[item_id],
                context={}
            )
            
            # Get prediction
            result = await self.inference_service.predict_single(pred_request)
            return result.predictions.get(item_id, 0.5)
            
        except Exception as e:
            logger.error("Failed to get prediction for explanation", error=str(e))
            return 0.5  # Default probability
    
    async def _generate_shap_explanation(
        self,
        user_id: str,
        item_id: str,
        attempt_history: List[AttemptRecord]
    ) -> Dict[str, float]:
        """Generate SHAP-based feature importance."""
        try:
            model = model_manager.get_active_model()
            if not model:
                raise ValueError("No active model available")
            
            model_version = model_manager.get_active_model_info().version
            
            # Check if we have a cached explainer for this model
            explainer_key = f"shap_{model_version}"
            if explainer_key not in self.explainer_cache:
                await self._create_shap_explainer(model, explainer_key)
            
            explainer = self.explainer_cache[explainer_key]
            
            # Prepare input for explanation
            input_data = self.inference_service._prepare_input_data(
                attempt_history, [item_id]
            )
            
            # Create a wrapper function for SHAP
            def model_wrapper(x):
                # x is expected to be a numpy array of shape (batch_size, sequence_length)
                # Convert to appropriate tensor format
                batch_size = x.shape[0]
                seq_len = x.shape[1] // 3  # Assuming item_ids, topic_ids, responses concatenated
                
                item_ids = torch.tensor(x[:, :seq_len], dtype=torch.long)
                topic_ids = torch.tensor(x[:, seq_len:2*seq_len], dtype=torch.long)
                responses = torch.tensor(x[:, 2*seq_len:], dtype=torch.long)
                lengths = torch.tensor([seq_len] * batch_size, dtype=torch.long)
                
                with torch.no_grad():
                    next_correct_prob, _ = model(item_ids, topic_ids, responses, lengths)
                    # Return probability for the target item (simplified)
                    return next_correct_prob[:, -1, 0].cpu().numpy()
            
            # Prepare input array for SHAP
            item_ids = input_data["item_ids"].numpy()
            topic_ids = input_data["topic_ids"].numpy()
            responses = input_data["responses"].numpy()
            
            # Concatenate all features
            input_array = np.concatenate([
                item_ids.flatten(),
                topic_ids.flatten(),
                responses.flatten()
            ]).reshape(1, -1)
            
            # Generate SHAP values
            shap_values = explainer.shap_values(input_array)
            
            # Convert to feature importance dictionary
            feature_importance = self._process_shap_values(
                shap_values, attempt_history, item_id
            )
            
            return feature_importance
            
        except Exception as e:
            logger.error("SHAP explanation failed", error=str(e))
            # Return default feature importance
            return self._get_default_feature_importance(attempt_history)
    
    async def _create_shap_explainer(self, model: torch.nn.Module, explainer_key: str) -> None:
        """Create and cache SHAP explainer."""
        try:
            # For now, use a simple explainer with background samples
            # In production, you'd want to use more sophisticated explainers
            
            if self.background_samples is None:
                await self._generate_background_samples()
            
            # Create a simple explainer (placeholder)
            # In practice, you'd use shap.DeepExplainer or shap.KernelExplainer
            explainer = shap.KernelExplainer(
                lambda x: np.random.random((x.shape[0],)),  # Placeholder function
                self.background_samples.numpy() if self.background_samples is not None else np.zeros((10, 100))
            )
            
            self.explainer_cache[explainer_key] = explainer
            logger.info("SHAP explainer created", explainer_key=explainer_key)
            
        except Exception as e:
            logger.error("Failed to create SHAP explainer", error=str(e))
            raise
    
    async def _generate_background_samples(self) -> None:
        """Generate background samples for SHAP explainer."""
        try:
            # Generate synthetic background data
            # In practice, you'd use a representative sample from your training data
            num_samples = 100
            seq_length = 50
            
            # Random item IDs, topic IDs, and responses
            item_ids = torch.randint(0, 1000, (num_samples, seq_length))
            topic_ids = torch.randint(0, 20, (num_samples, seq_length))
            responses = torch.randint(0, 2, (num_samples, seq_length))
            
            # Concatenate features
            self.background_samples = torch.cat([
                item_ids.flatten(1),
                topic_ids.flatten(1),
                responses.flatten(1)
            ], dim=1).float()
            
            logger.info("Background samples generated", num_samples=num_samples)
            
        except Exception as e:
            logger.error("Failed to generate background samples", error=str(e))
            raise
    
    def _process_shap_values(
        self,
        shap_values: np.ndarray,
        attempt_history: List[AttemptRecord],
        item_id: str
    ) -> Dict[str, float]:
        """Process SHAP values into interpretable feature importance."""
        try:
            # This is a simplified version - in practice you'd have more sophisticated processing
            feature_importance = {}
            
            # Recent performance importance
            if len(attempt_history) > 0:
                recent_attempts = attempt_history[-5:]  # Last 5 attempts
                recent_accuracy = sum(1 for a in recent_attempts if a.correct) / len(recent_attempts)
                feature_importance["recent_performance"] = float(recent_accuracy * 0.3)
            
            # Response time patterns
            if len(attempt_history) > 0:
                avg_time = np.mean([a.time_taken_ms for a in attempt_history])
                time_consistency = 1.0 / (1.0 + np.std([a.time_taken_ms for a in attempt_history]) / 1000)
                feature_importance["response_time_pattern"] = float(time_consistency * 0.2)
            
            # Topic familiarity
            item_topics = self.inference_service.item_topics.get(item_id, [])
            if item_topics:
                topic_attempts = [a for a in attempt_history if any(t in item_topics for t in self.inference_service.item_topics.get(a.item_id, []))]
                if topic_attempts:
                    topic_accuracy = sum(1 for a in topic_attempts if a.correct) / len(topic_attempts)
                    feature_importance["topic_familiarity"] = float(topic_accuracy * 0.25)
            
            # Difficulty progression
            difficulties = [self.inference_service.item_difficulty.get(a.item_id, 0) for a in attempt_history]
            if difficulties:
                difficulty_trend = np.polyfit(range(len(difficulties)), difficulties, 1)[0] if len(difficulties) > 1 else 0
                feature_importance["difficulty_progression"] = float(difficulty_trend * 0.15)
            
            # Learning momentum
            if len(attempt_history) >= 3:
                recent_trend = sum(1 for a in attempt_history[-3:] if a.correct) / 3
                feature_importance["learning_momentum"] = float(recent_trend * 0.1)
            
            return feature_importance
            
        except Exception as e:
            logger.error("Failed to process SHAP values", error=str(e))
            return self._get_default_feature_importance(attempt_history)
    
    def _get_default_feature_importance(self, attempt_history: List[AttemptRecord]) -> Dict[str, float]:
        """Get default feature importance when SHAP fails."""
        if not attempt_history:
            return {
                "recent_performance": 0.5,
                "response_time_pattern": 0.5,
                "topic_familiarity": 0.5,
                "difficulty_progression": 0.5,
                "learning_momentum": 0.5
            }
        
        recent_accuracy = sum(1 for a in attempt_history[-5:] if a.correct) / min(len(attempt_history), 5)
        
        return {
            "recent_performance": float(recent_accuracy),
            "response_time_pattern": 0.5,
            "topic_familiarity": 0.5,
            "difficulty_progression": 0.5,
            "learning_momentum": 0.5
        }
    
    def _generate_explanation_text(
        self,
        feature_importance: Dict[str, float],
        prediction_prob: float,
        item_id: str
    ) -> str:
        """Generate human-readable explanation text."""
        try:
            # Determine prediction confidence
            confidence = "high" if abs(prediction_prob - 0.5) > 0.3 else "moderate" if abs(prediction_prob - 0.5) > 0.15 else "low"
            outcome = "correct" if prediction_prob > 0.5 else "incorrect"
            
            explanation_parts = [
                f"The model predicts with {confidence} confidence that you will answer this question {outcome} (probability: {prediction_prob:.2f})."
            ]
            
            # Find most important factors
            sorted_features = sorted(feature_importance.items(), key=lambda x: abs(x[1]), reverse=True)
            
            if sorted_features:
                top_feature, importance = sorted_features[0]
                
                if top_feature == "recent_performance" and importance > 0.6:
                    explanation_parts.append("Your recent performance on similar questions strongly supports this prediction.")
                elif top_feature == "topic_familiarity" and importance > 0.6:
                    explanation_parts.append("Your familiarity with this topic is a key factor in this prediction.")
                elif top_feature == "learning_momentum" and importance > 0.6:
                    explanation_parts.append("Your current learning momentum indicates strong performance.")
                elif importance < 0.4:
                    explanation_parts.append("This prediction is based on mixed signals from your learning history.")
            
            # Add recommendations
            if prediction_prob < 0.4:
                explanation_parts.append("Consider reviewing related topics before attempting this question.")
            elif prediction_prob > 0.8:
                explanation_parts.append("You appear well-prepared for this question type.")
            
            return " ".join(explanation_parts)
            
        except Exception as e:
            logger.error("Failed to generate explanation text", error=str(e))
            return f"Prediction probability: {prediction_prob:.2f}. Unable to generate detailed explanation."
    
    def _create_visualization_data(
        self,
        feature_importance: Dict[str, float],
        attempt_history: List[AttemptRecord]
    ) -> Dict[str, Any]:
        """Create data for visualization components."""
        try:
            # Feature importance chart data
            features = list(feature_importance.keys())
            values = list(feature_importance.values())
            
            # Recent performance trend
            recent_attempts = attempt_history[-10:] if len(attempt_history) >= 10 else attempt_history
            performance_trend = [1 if a.correct else 0 for a in recent_attempts]
            
            # Response time trend
            time_trend = [a.time_taken_ms / 1000 for a in recent_attempts]  # Convert to seconds
            
            return {
                "feature_importance": {
                    "labels": features,
                    "values": values
                },
                "performance_trend": {
                    "attempts": list(range(len(performance_trend))),
                    "correct": performance_trend
                },
                "response_time_trend": {
                    "attempts": list(range(len(time_trend))),
                    "time_seconds": time_trend
                },
                "summary_stats": {
                    "total_attempts": len(attempt_history),
                    "recent_accuracy": sum(performance_trend) / len(performance_trend) if performance_trend else 0,
                    "avg_response_time": np.mean(time_trend) if time_trend else 0
                }
            }
            
        except Exception as e:
            logger.error("Failed to create visualization data", error=str(e))
            return {}
    
    async def generate_user_insights(
        self,
        user_id: str,
        attempt_history: List[AttemptRecord],
        topic_mastery: Dict[str, float] = None,
        item_metadata: Dict[str, Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive user insights."""
        
        try:
            # Check cache first
            cache_key = f"insights_{user_id}"
            if cache_key in self.user_insights_cache:
                cached_data = self.user_insights_cache[cache_key]
                if (datetime.now() - cached_data["timestamp"]).seconds < self.insights_cache_ttl:
                    return cached_data["insights"]
            
            # Generate recent predictions for insight context
            recent_predictions = []
            if len(attempt_history) > 0:
                try:
                    from app.models.schemas import PredictionRequest
                    
                    # Get recent items for prediction
                    recent_items = list(set([a.item_id for a in attempt_history[-10:]]))[:5]
                    
                    pred_request = PredictionRequest(
                        user_id=user_id,
                        attempt_history=attempt_history[-20:],  # Last 20 attempts
                        candidate_items=recent_items,
                        context={}
                    )
                    
                    prediction = await self.inference_service.predict_single(pred_request)
                    recent_predictions = [prediction]
                    
                except Exception as e:
                    logger.warning("Failed to generate predictions for insights", error=str(e))
            
            # Generate insights
            insights = insight_generator.generate_user_insights(
                user_id=user_id,
                attempt_history=attempt_history,
                recent_predictions=recent_predictions,
                topic_mastery=topic_mastery,
                item_metadata=item_metadata
            )
            
            # Convert insights to dict format
            insights_data = {
                "user_id": user_id,
                "generated_at": datetime.now().isoformat(),
                "insights": [insight.to_dict() for insight in insights],
                "summary": {
                    "total_insights": len(insights),
                    "high_priority": len([i for i in insights if i.priority == "high"]),
                    "medium_priority": len([i for i in insights if i.priority == "medium"]),
                    "low_priority": len([i for i in insights if i.priority == "low"])
                }
            }
            
            # Cache the results
            self.user_insights_cache[cache_key] = {
                "insights": insights_data,
                "timestamp": datetime.now()
            }
            
            logger.info(
                "User insights generated",
                user_id=user_id,
                num_insights=len(insights),
                high_priority_count=insights_data["summary"]["high_priority"]
            )
            
            return insights_data
            
        except Exception as e:
            logger.error("Failed to generate user insights", error=str(e), user_id=user_id)
            return {
                "user_id": user_id,
                "generated_at": datetime.now().isoformat(),
                "insights": [],
                "summary": {"total_insights": 0, "high_priority": 0, "medium_priority": 0, "low_priority": 0},
                "error": "Failed to generate insights"
            }
    
    async def detect_model_bias(
        self,
        predictions: List[float],
        targets: List[float],
        protected_attributes: Dict[str, List[Any]],
        metrics: List[str] = None
    ) -> Dict[str, Any]:
        """Detect bias in model predictions."""
        
        try:
            # Convert string metrics to BiasMetric enums
            bias_metrics = []
            if metrics:
                for metric_name in metrics:
                    try:
                        bias_metrics.append(BiasMetric(metric_name))
                    except ValueError:
                        logger.warning(f"Unknown bias metric: {metric_name}")
            
            # Convert inputs to numpy arrays
            predictions_array = np.array(predictions)
            targets_array = np.array(targets)
            
            # Convert protected attributes to numpy arrays
            protected_attrs_arrays = {}
            for attr_name, attr_values in protected_attributes.items():
                protected_attrs_arrays[attr_name] = np.array(attr_values)
            
            # Detect bias
            bias_results = self.bias_detector.detect_bias(
                predictions=predictions_array,
                targets=targets_array,
                protected_attributes=protected_attrs_arrays,
                metrics=bias_metrics
            )
            
            # Generate comprehensive report
            bias_report = self.bias_detector.generate_bias_report(bias_results)
            
            logger.info(
                "Bias detection completed",
                num_predictions=len(predictions),
                bias_detected=bias_report["summary"]["overall_bias_detected"],
                risk_level=bias_report["risk_level"]
            )
            
            return bias_report
            
        except Exception as e:
            logger.error("Bias detection failed", error=str(e))
            return {
                "summary": {
                    "total_metrics_evaluated": 0,
                    "bias_detected_count": 0,
                    "overall_bias_detected": False
                },
                "metrics": [],
                "recommendations": ["Bias detection failed - manual review recommended"],
                "risk_level": "unknown",
                "error": str(e)
            }
    
    async def explain_model_behavior(
        self,
        model_version: str,
        sample_predictions: List[Dict[str, Any]],
        feature_importance_global: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """Explain overall model behavior and patterns."""
        
        try:
            # Analyze prediction patterns
            prediction_values = [pred.get("prediction", 0.5) for pred in sample_predictions]
            confidence_values = [pred.get("confidence", 0.5) for pred in sample_predictions]
            
            # Calculate statistics
            pred_stats = {
                "mean_prediction": np.mean(prediction_values),
                "std_prediction": np.std(prediction_values),
                "min_prediction": np.min(prediction_values),
                "max_prediction": np.max(prediction_values),
                "mean_confidence": np.mean(confidence_values),
                "std_confidence": np.std(confidence_values)
            }
            
            # Analyze prediction distribution
            prediction_bins = np.histogram(prediction_values, bins=10, range=(0, 1))
            
            # Generate model behavior insights
            behavior_insights = []
            
            if pred_stats["mean_prediction"] > 0.7:
                behavior_insights.append({
                    "type": "optimistic_bias",
                    "description": "Model tends to predict high success rates",
                    "recommendation": "Monitor for overconfidence in predictions"
                })
            elif pred_stats["mean_prediction"] < 0.3:
                behavior_insights.append({
                    "type": "pessimistic_bias",
                    "description": "Model tends to predict low success rates",
                    "recommendation": "Check if training data is representative"
                })
            
            if pred_stats["std_confidence"] < 0.1:
                behavior_insights.append({
                    "type": "low_confidence_variance",
                    "description": "Model shows consistent confidence levels",
                    "recommendation": "Good calibration, but monitor edge cases"
                })
            elif pred_stats["std_confidence"] > 0.3:
                behavior_insights.append({
                    "type": "high_confidence_variance",
                    "description": "Model confidence varies significantly",
                    "recommendation": "Review calibration and uncertainty estimation"
                })
            
            # Feature importance analysis
            feature_analysis = {}
            if feature_importance_global:
                sorted_features = sorted(
                    feature_importance_global.items(),
                    key=lambda x: abs(x[1]),
                    reverse=True
                )
                
                feature_analysis = {
                    "top_features": sorted_features[:5],
                    "feature_count": len(feature_importance_global),
                    "importance_concentration": np.std(list(feature_importance_global.values()))
                }
            
            return {
                "model_version": model_version,
                "analyzed_at": datetime.now().isoformat(),
                "sample_size": len(sample_predictions),
                "prediction_statistics": pred_stats,
                "prediction_distribution": {
                    "bins": prediction_bins[1].tolist(),
                    "counts": prediction_bins[0].tolist()
                },
                "behavior_insights": behavior_insights,
                "feature_analysis": feature_analysis,
                "recommendations": [
                    "Regular monitoring of prediction patterns",
                    "Periodic bias detection analysis",
                    "Calibration assessment on new data"
                ]
            }
            
        except Exception as e:
            logger.error("Model behavior explanation failed", error=str(e))
            return {
                "model_version": model_version,
                "analyzed_at": datetime.now().isoformat(),
                "error": str(e),
                "recommendations": ["Manual model review recommended"]
            }
    
    def clear_insights_cache(self, user_id: str = None) -> None:
        """Clear insights cache for a specific user or all users."""
        
        if user_id:
            cache_key = f"insights_{user_id}"
            if cache_key in self.user_insights_cache:
                del self.user_insights_cache[cache_key]
                logger.info("User insights cache cleared", user_id=user_id)
        else:
            self.user_insights_cache.clear()
            logger.info("All insights cache cleared")