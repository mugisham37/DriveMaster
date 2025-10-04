"""Fallback mechanisms for model failures."""

import asyncio
import time
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import random

from app.models.schemas import PredictionRequest, PredictionResponse
from app.core.logging import get_logger
from app.config import settings

logger = get_logger(__name__)


class FallbackStrategy(Enum):
    SIMPLE_HEURISTIC = "simple_heuristic"
    CACHED_PREDICTION = "cached_prediction"
    STATISTICAL_MODEL = "statistical_model"
    RANDOM_BASELINE = "random_baseline"
    PREVIOUS_MODEL = "previous_model"


@dataclass
class FallbackConfig:
    """Configuration for fallback mechanisms."""
    
    strategy: FallbackStrategy
    enabled: bool = True
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout_threshold: float = 30.0  # seconds
    error_rate_threshold: float = 0.1  # 10%
    
    # Strategy-specific parameters
    heuristic_params: Dict[str, Any] = None
    cache_ttl: int = 3600  # 1 hour
    statistical_model_path: str = None
    
    def __post_init__(self):
        if self.heuristic_params is None:
            self.heuristic_params = {}


class FallbackManager:
    """Manages fallback mechanisms for model inference failures."""
    
    def __init__(self):
        self.fallback_configs: List[FallbackConfig] = []
        self.primary_inference_function: Optional[Callable] = None
        self.backup_inference_functions: List[Callable] = []
        
        # Failure tracking
        self.failure_count = 0
        self.total_requests = 0
        self.recent_failures: List[datetime] = []
        self.failure_window = timedelta(minutes=5)
        
        # Performance tracking
        self.fallback_usage_stats: Dict[str, int] = {}
        
        # Initialize default fallback strategies
        self._initialize_default_strategies()
    
    def _initialize_default_strategies(self) -> None:
        """Initialize default fallback strategies."""
        
        # Simple heuristic fallback
        self.fallback_configs.append(FallbackConfig(
            strategy=FallbackStrategy.SIMPLE_HEURISTIC,
            heuristic_params={
                'default_probability': 0.7,
                'topic_difficulty_adjustment': True,
                'user_history_weight': 0.3
            }
        ))
        
        # Cached prediction fallback
        self.fallback_configs.append(FallbackConfig(
            strategy=FallbackStrategy.CACHED_PREDICTION,
            cache_ttl=7200  # 2 hours
        ))
        
        # Random baseline fallback (last resort)
        self.fallback_configs.append(FallbackConfig(
            strategy=FallbackStrategy.RANDOM_BASELINE
        ))
    
    def set_primary_inference_function(self, inference_function: Callable) -> None:
        """Set the primary inference function."""
        self.primary_inference_function = inference_function
        logger.info("Primary inference function set")
    
    def add_backup_inference_function(self, inference_function: Callable) -> None:
        """Add a backup inference function."""
        self.backup_inference_functions.append(inference_function)
        logger.info("Backup inference function added", total_backups=len(self.backup_inference_functions))
    
    def add_fallback_strategy(self, config: FallbackConfig) -> None:
        """Add a custom fallback strategy."""
        self.fallback_configs.append(config)
        logger.info("Fallback strategy added", strategy=config.strategy.value)
    
    async def predict_with_fallback(
        self,
        request: PredictionRequest,
        timeout: float = None
    ) -> PredictionResponse:
        """Perform prediction with fallback mechanisms."""
        
        self.total_requests += 1
        timeout = timeout or settings.request_timeout
        
        # Try primary inference function first
        if self.primary_inference_function:
            try:
                response = await asyncio.wait_for(
                    self.primary_inference_function(request),
                    timeout=timeout
                )
                return response
                
            except Exception as e:
                self._record_failure()
                logger.warning(
                    "Primary inference failed, trying fallbacks",
                    error=str(e),
                    user_id=request.user_id
                )
        
        # Try backup inference functions
        for i, backup_function in enumerate(self.backup_inference_functions):
            try:
                response = await asyncio.wait_for(
                    backup_function(request),
                    timeout=timeout
                )
                
                self._record_fallback_usage(f"backup_model_{i}")
                logger.info(
                    "Backup inference succeeded",
                    backup_index=i,
                    user_id=request.user_id
                )
                return response
                
            except Exception as e:
                logger.warning(
                    "Backup inference failed",
                    backup_index=i,
                    error=str(e),
                    user_id=request.user_id
                )
                continue
        
        # Try fallback strategies
        for config in self.fallback_configs:
            if not config.enabled:
                continue
            
            try:
                response = await self._execute_fallback_strategy(request, config)
                
                self._record_fallback_usage(config.strategy.value)
                logger.info(
                    "Fallback strategy succeeded",
                    strategy=config.strategy.value,
                    user_id=request.user_id
                )
                return response
                
            except Exception as e:
                logger.warning(
                    "Fallback strategy failed",
                    strategy=config.strategy.value,
                    error=str(e),
                    user_id=request.user_id
                )
                continue
        
        # If all fallbacks fail, raise the last exception
        raise RuntimeError("All inference methods and fallbacks failed")
    
    async def _execute_fallback_strategy(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Execute a specific fallback strategy."""
        
        if config.strategy == FallbackStrategy.SIMPLE_HEURISTIC:
            return await self._simple_heuristic_fallback(request, config)
        
        elif config.strategy == FallbackStrategy.CACHED_PREDICTION:
            return await self._cached_prediction_fallback(request, config)
        
        elif config.strategy == FallbackStrategy.STATISTICAL_MODEL:
            return await self._statistical_model_fallback(request, config)
        
        elif config.strategy == FallbackStrategy.RANDOM_BASELINE:
            return await self._random_baseline_fallback(request, config)
        
        elif config.strategy == FallbackStrategy.PREVIOUS_MODEL:
            return await self._previous_model_fallback(request, config)
        
        else:
            raise ValueError(f"Unknown fallback strategy: {config.strategy}")
    
    async def _simple_heuristic_fallback(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Simple heuristic-based fallback."""
        
        params = config.heuristic_params
        default_prob = params.get('default_probability', 0.7)
        
        predictions = {}
        confidence_scores = {}
        
        for item_id in request.candidate_items:
            # Start with default probability
            prob = default_prob
            
            # Adjust based on user history if available
            if params.get('user_history_weight', 0) > 0 and request.attempt_history:
                recent_attempts = request.attempt_history[-10:]  # Last 10 attempts
                if recent_attempts:
                    recent_accuracy = sum(1 for a in recent_attempts if a.correct) / len(recent_attempts)
                    history_weight = params['user_history_weight']
                    prob = prob * (1 - history_weight) + recent_accuracy * history_weight
            
            # Add some randomness to avoid deterministic predictions
            prob += random.uniform(-0.1, 0.1)
            prob = max(0.1, min(0.9, prob))  # Clamp to reasonable range
            
            predictions[item_id] = prob
            confidence_scores[item_id] = 0.3  # Low confidence for heuristic
        
        return PredictionResponse(
            predictions=predictions,
            confidence_scores=confidence_scores,
            topic_mastery={},
            model_version="heuristic_fallback",
            inference_time_ms=1.0,  # Very fast
            cached=False
        )
    
    async def _cached_prediction_fallback(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Try to use cached predictions as fallback."""
        
        from app.core.cache import prediction_cache
        
        # Try to get cached prediction
        cached_result = await prediction_cache.get_prediction(
            user_id=request.user_id,
            candidate_items=request.candidate_items,
            attempt_history=[attempt.dict() for attempt in request.attempt_history],
            model_version="any"  # Accept any cached version
        )
        
        if cached_result:
            # Update metadata to indicate this is a fallback
            cached_result["model_version"] = f"cached_fallback_{cached_result.get('model_version', 'unknown')}"
            cached_result["cached"] = True
            return PredictionResponse(**cached_result)
        
        raise RuntimeError("No cached predictions available")
    
    async def _statistical_model_fallback(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Use a simple statistical model as fallback."""
        
        # This would typically load a lightweight statistical model
        # For now, implement a simple logistic regression-like approach
        
        predictions = {}
        confidence_scores = {}
        
        for item_id in request.candidate_items:
            # Simple features based on user history
            features = self._extract_simple_features(request.attempt_history)
            
            # Simple linear combination (mock statistical model)
            prob = 0.5  # Base probability
            
            if features['recent_accuracy'] is not None:
                prob += (features['recent_accuracy'] - 0.5) * 0.3
            
            if features['avg_response_time'] is not None:
                # Faster responses might indicate confidence
                normalized_time = min(features['avg_response_time'] / 60000, 1.0)  # Normalize to 1 minute
                prob += (1 - normalized_time) * 0.1
            
            prob = max(0.1, min(0.9, prob))
            
            predictions[item_id] = prob
            confidence_scores[item_id] = 0.5  # Medium confidence
        
        return PredictionResponse(
            predictions=predictions,
            confidence_scores=confidence_scores,
            topic_mastery={},
            model_version="statistical_fallback",
            inference_time_ms=5.0,
            cached=False
        )
    
    async def _random_baseline_fallback(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Random baseline fallback (last resort)."""
        
        predictions = {}
        confidence_scores = {}
        
        for item_id in request.candidate_items:
            # Random probability with slight bias toward correct
            prob = random.uniform(0.4, 0.8)
            predictions[item_id] = prob
            confidence_scores[item_id] = 0.1  # Very low confidence
        
        return PredictionResponse(
            predictions=predictions,
            confidence_scores=confidence_scores,
            topic_mastery={},
            model_version="random_baseline",
            inference_time_ms=0.1,
            cached=False
        )
    
    async def _previous_model_fallback(
        self,
        request: PredictionRequest,
        config: FallbackConfig
    ) -> PredictionResponse:
        """Use a previous model version as fallback."""
        
        # This would typically load and use a previous model version
        # For now, return a placeholder response
        
        predictions = {}
        confidence_scores = {}
        
        for item_id in request.candidate_items:
            prob = 0.65  # Slightly optimistic default
            predictions[item_id] = prob
            confidence_scores[item_id] = 0.4
        
        return PredictionResponse(
            predictions=predictions,
            confidence_scores=confidence_scores,
            topic_mastery={},
            model_version="previous_model_fallback",
            inference_time_ms=10.0,
            cached=False
        )
    
    def _extract_simple_features(self, attempt_history: List) -> Dict[str, Any]:
        """Extract simple features from attempt history."""
        
        if not attempt_history:
            return {
                'recent_accuracy': None,
                'avg_response_time': None,
                'total_attempts': 0
            }
        
        recent_attempts = attempt_history[-10:]  # Last 10 attempts
        
        recent_accuracy = sum(1 for a in recent_attempts if a.correct) / len(recent_attempts)
        avg_response_time = sum(a.time_taken_ms for a in recent_attempts) / len(recent_attempts)
        
        return {
            'recent_accuracy': recent_accuracy,
            'avg_response_time': avg_response_time,
            'total_attempts': len(attempt_history)
        }
    
    def _record_failure(self) -> None:
        """Record a failure for monitoring."""
        self.failure_count += 1
        self.recent_failures.append(datetime.now())
        
        # Clean old failures outside the window
        cutoff_time = datetime.now() - self.failure_window
        self.recent_failures = [f for f in self.recent_failures if f > cutoff_time]
    
    def _record_fallback_usage(self, strategy: str) -> None:
        """Record usage of a fallback strategy."""
        if strategy not in self.fallback_usage_stats:
            self.fallback_usage_stats[strategy] = 0
        self.fallback_usage_stats[strategy] += 1
    
    def get_failure_rate(self) -> float:
        """Get current failure rate."""
        if self.total_requests == 0:
            return 0.0
        return self.failure_count / self.total_requests
    
    def get_recent_failure_rate(self) -> float:
        """Get failure rate in the recent window."""
        return len(self.recent_failures) / max(1, self.total_requests)
    
    def get_fallback_stats(self) -> Dict[str, Any]:
        """Get fallback usage statistics."""
        return {
            'total_requests': self.total_requests,
            'total_failures': self.failure_count,
            'overall_failure_rate': self.get_failure_rate(),
            'recent_failure_rate': self.get_recent_failure_rate(),
            'recent_failures_count': len(self.recent_failures),
            'fallback_usage': self.fallback_usage_stats.copy(),
            'enabled_strategies': [
                config.strategy.value for config in self.fallback_configs if config.enabled
            ]
        }
    
    def reset_stats(self) -> None:
        """Reset failure and usage statistics."""
        self.failure_count = 0
        self.total_requests = 0
        self.recent_failures.clear()
        self.fallback_usage_stats.clear()
        logger.info("Fallback statistics reset")


# Global fallback manager
fallback_manager = FallbackManager()