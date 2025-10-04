"""A/B testing framework for model deployment."""

import asyncio
import random
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import hashlib

from app.models.schemas import PredictionRequest, PredictionResponse
from app.core.logging import get_logger
from app.core.cache import prediction_cache

logger = get_logger(__name__)


class ExperimentStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


@dataclass
class ModelVariant:
    """Represents a model variant in an A/B test."""
    
    name: str
    model_version: str
    traffic_percentage: float
    inference_function: Callable
    description: str = ""
    is_control: bool = False
    
    # Performance metrics
    total_requests: int = 0
    total_inference_time: float = 0.0
    error_count: int = 0
    
    @property
    def average_inference_time(self) -> float:
        """Get average inference time in milliseconds."""
        if self.total_requests > 0:
            return self.total_inference_time / self.total_requests
        return 0.0
    
    @property
    def error_rate(self) -> float:
        """Get error rate as percentage."""
        if self.total_requests > 0:
            return (self.error_count / self.total_requests) * 100
        return 0.0


@dataclass
class ABExperiment:
    """Represents an A/B testing experiment."""
    
    id: str
    name: str
    description: str
    variants: List[ModelVariant]
    status: ExperimentStatus = ExperimentStatus.DRAFT
    
    # Experiment configuration
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_allocation_method: str = "hash"  # "hash", "random"
    allocation_seed: str = ""
    
    # Traffic control
    ramp_up_percentage: float = 100.0  # Percentage of users to include
    
    # Success metrics
    primary_metric: str = "accuracy"
    secondary_metrics: List[str] = field(default_factory=list)
    
    # Statistical configuration
    min_sample_size: int = 1000
    confidence_level: float = 0.95
    
    # Results tracking
    total_users: int = 0
    user_assignments: Dict[str, str] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate experiment configuration."""
        if not self.variants:
            raise ValueError("Experiment must have at least one variant")
        
        total_traffic = sum(v.traffic_percentage for v in self.variants)
        if abs(total_traffic - 100.0) > 0.01:
            raise ValueError(f"Traffic percentages must sum to 100%, got {total_traffic}")
        
        control_variants = [v for v in self.variants if v.is_control]
        if len(control_variants) != 1:
            raise ValueError("Experiment must have exactly one control variant")
    
    def assign_user_to_variant(self, user_id: str) -> str:
        """Assign a user to a variant based on the allocation method."""
        
        # Check if user already assigned
        if user_id in self.user_assignments:
            return self.user_assignments[user_id]
        
        # Check if user should be included in experiment
        if not self._should_include_user(user_id):
            # Assign to control variant
            control_variant = next(v for v in self.variants if v.is_control)
            self.user_assignments[user_id] = control_variant.name
            return control_variant.name
        
        # Assign based on method
        if self.user_allocation_method == "hash":
            variant_name = self._hash_based_assignment(user_id)
        else:  # random
            variant_name = self._random_assignment()
        
        self.user_assignments[user_id] = variant_name
        self.total_users += 1
        
        return variant_name
    
    def _should_include_user(self, user_id: str) -> bool:
        """Determine if user should be included in the experiment."""
        
        if self.ramp_up_percentage >= 100.0:
            return True
        
        # Use hash to determine inclusion
        hash_input = f"{self.id}_{user_id}_{self.allocation_seed}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        percentage = (hash_value % 10000) / 100.0  # 0-99.99
        
        return percentage < self.ramp_up_percentage
    
    def _hash_based_assignment(self, user_id: str) -> str:
        """Assign user to variant using consistent hashing."""
        
        hash_input = f"{self.id}_{user_id}_{self.allocation_seed}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        percentage = (hash_value % 10000) / 100.0  # 0-99.99
        
        cumulative_percentage = 0.0
        for variant in self.variants:
            cumulative_percentage += variant.traffic_percentage
            if percentage < cumulative_percentage:
                return variant.name
        
        # Fallback to last variant
        return self.variants[-1].name
    
    def _random_assignment(self) -> str:
        """Assign user to variant using random selection."""
        
        rand_value = random.random() * 100
        cumulative_percentage = 0.0
        
        for variant in self.variants:
            cumulative_percentage += variant.traffic_percentage
            if rand_value < cumulative_percentage:
                return variant.name
        
        return self.variants[-1].name
    
    def get_variant_by_name(self, name: str) -> Optional[ModelVariant]:
        """Get variant by name."""
        return next((v for v in self.variants if v.name == name), None)
    
    def is_active(self) -> bool:
        """Check if experiment is currently active."""
        if self.status != ExperimentStatus.ACTIVE:
            return False
        
        now = datetime.now()
        
        if self.start_date and now < self.start_date:
            return False
        
        if self.end_date and now > self.end_date:
            return False
        
        return True


class ABTestingManager:
    """Manages A/B testing experiments for model deployment."""
    
    def __init__(self):
        self.experiments: Dict[str, ABExperiment] = {}
        self.active_experiment: Optional[str] = None
        
        # Default inference function (fallback)
        self.default_inference_function: Optional[Callable] = None
        
        # Metrics collection
        self.experiment_metrics: Dict[str, Dict[str, Any]] = {}
    
    def create_experiment(
        self,
        experiment_id: str,
        name: str,
        description: str,
        variants: List[Dict[str, Any]],
        **kwargs
    ) -> ABExperiment:
        """Create a new A/B testing experiment."""
        
        # Convert variant dictionaries to ModelVariant objects
        model_variants = []
        for variant_config in variants:
            variant = ModelVariant(
                name=variant_config["name"],
                model_version=variant_config["model_version"],
                traffic_percentage=variant_config["traffic_percentage"],
                inference_function=variant_config["inference_function"],
                description=variant_config.get("description", ""),
                is_control=variant_config.get("is_control", False)
            )
            model_variants.append(variant)
        
        experiment = ABExperiment(
            id=experiment_id,
            name=name,
            description=description,
            variants=model_variants,
            **kwargs
        )
        
        self.experiments[experiment_id] = experiment
        self.experiment_metrics[experiment_id] = {}
        
        logger.info(
            "A/B experiment created",
            experiment_id=experiment_id,
            name=name,
            num_variants=len(model_variants)
        )
        
        return experiment
    
    def start_experiment(self, experiment_id: str) -> None:
        """Start an A/B testing experiment."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        
        if experiment.status != ExperimentStatus.DRAFT:
            raise ValueError(f"Can only start experiments in DRAFT status")
        
        experiment.status = ExperimentStatus.ACTIVE
        experiment.start_date = datetime.now()
        
        # Set as active experiment if none is active
        if self.active_experiment is None:
            self.active_experiment = experiment_id
        
        logger.info("A/B experiment started", experiment_id=experiment_id)
    
    def stop_experiment(self, experiment_id: str) -> None:
        """Stop an A/B testing experiment."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.COMPLETED
        experiment.end_date = datetime.now()
        
        if self.active_experiment == experiment_id:
            self.active_experiment = None
        
        logger.info("A/B experiment stopped", experiment_id=experiment_id)
    
    async def route_prediction_request(
        self,
        request: PredictionRequest
    ) -> PredictionResponse:
        """Route prediction request through A/B testing framework."""
        
        # If no active experiment, use default inference
        if not self.active_experiment or self.active_experiment not in self.experiments:
            if self.default_inference_function:
                return await self.default_inference_function(request)
            else:
                raise RuntimeError("No active experiment and no default inference function")
        
        experiment = self.experiments[self.active_experiment]
        
        # Check if experiment is still active
        if not experiment.is_active():
            if self.default_inference_function:
                return await self.default_inference_function(request)
            else:
                raise RuntimeError("Experiment is not active and no default inference function")
        
        # Assign user to variant
        variant_name = experiment.assign_user_to_variant(request.user_id)
        variant = experiment.get_variant_by_name(variant_name)
        
        if not variant:
            raise RuntimeError(f"Variant {variant_name} not found")
        
        # Record request
        variant.total_requests += 1
        
        try:
            # Perform inference
            start_time = asyncio.get_event_loop().time()
            
            # Add experiment metadata to request
            request_with_metadata = request.copy()
            if not hasattr(request_with_metadata, 'context'):
                request_with_metadata.context = {}
            
            request_with_metadata.context.update({
                'experiment_id': experiment.id,
                'variant_name': variant_name,
                'model_version': variant.model_version
            })
            
            response = await variant.inference_function(request_with_metadata)
            
            # Record metrics
            inference_time = (asyncio.get_event_loop().time() - start_time) * 1000
            variant.total_inference_time += inference_time
            
            # Add experiment metadata to response
            response.model_version = variant.model_version
            
            # Log experiment assignment
            logger.debug(
                "A/B test assignment",
                user_id=request.user_id,
                experiment_id=experiment.id,
                variant=variant_name,
                inference_time_ms=inference_time
            )
            
            return response
            
        except Exception as e:
            variant.error_count += 1
            logger.error(
                "A/B test inference error",
                user_id=request.user_id,
                experiment_id=experiment.id,
                variant=variant_name,
                error=str(e)
            )
            raise
    
    def get_experiment_results(self, experiment_id: str) -> Dict[str, Any]:
        """Get results and statistics for an experiment."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        
        results = {
            "experiment_id": experiment_id,
            "name": experiment.name,
            "status": experiment.status.value,
            "start_date": experiment.start_date.isoformat() if experiment.start_date else None,
            "end_date": experiment.end_date.isoformat() if experiment.end_date else None,
            "total_users": experiment.total_users,
            "variants": []
        }
        
        for variant in experiment.variants:
            variant_results = {
                "name": variant.name,
                "model_version": variant.model_version,
                "traffic_percentage": variant.traffic_percentage,
                "is_control": variant.is_control,
                "total_requests": variant.total_requests,
                "average_inference_time_ms": variant.average_inference_time,
                "error_rate_percent": variant.error_rate,
                "users_assigned": len([u for u, v in experiment.user_assignments.items() if v == variant.name])
            }
            results["variants"].append(variant_results)
        
        return results
    
    def set_default_inference_function(self, inference_function: Callable) -> None:
        """Set the default inference function for fallback."""
        self.default_inference_function = inference_function
        logger.info("Default inference function set for A/B testing")
    
    def get_user_assignment(self, experiment_id: str, user_id: str) -> Optional[str]:
        """Get the variant assignment for a specific user."""
        
        if experiment_id not in self.experiments:
            return None
        
        experiment = self.experiments[experiment_id]
        return experiment.user_assignments.get(user_id)
    
    def force_user_assignment(
        self,
        experiment_id: str,
        user_id: str,
        variant_name: str
    ) -> None:
        """Force assign a user to a specific variant (for testing)."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        variant = experiment.get_variant_by_name(variant_name)
        
        if not variant:
            raise ValueError(f"Variant {variant_name} not found")
        
        experiment.user_assignments[user_id] = variant_name
        
        logger.info(
            "User force-assigned to variant",
            experiment_id=experiment_id,
            user_id=user_id,
            variant=variant_name
        )


# Global A/B testing manager
ab_testing_manager = ABTestingManager()