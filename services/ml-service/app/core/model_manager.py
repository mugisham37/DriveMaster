"""Model loading and versioning system."""

import torch
import asyncio
from typing import Dict, Optional, Any, List
from datetime import datetime
import psutil
import os
from pathlib import Path
from app.config import settings
from app.core.logging import get_logger, MLMetrics
from app.core.mlflow_client import mlflow_registry
from app.models.schemas import ModelInfo

logger = get_logger(__name__)
metrics = MLMetrics()


class ModelManager:
    """Manages model loading, versioning, and lifecycle."""
    
    def __init__(self):
        self.loaded_models: Dict[str, Dict[str, Any]] = {}
        self.active_model: Optional[str] = None
        self.model_cache_dir = Path("./model_cache")
        self.model_cache_dir.mkdir(exist_ok=True)
        self._lock = asyncio.Lock()
    
    async def initialize(self) -> None:
        """Initialize model manager and load default model."""
        try:
            await mlflow_registry.initialize()
            
            # Load default model
            await self.load_model(
                model_name="dkt_model",
                version=settings.default_model_version
            )
            
            logger.info("Model manager initialized")
            
        except Exception as e:
            logger.error("Failed to initialize model manager", error=str(e))
            raise
    
    async def load_model(
        self,
        model_name: str,
        version: str = "latest",
        set_active: bool = True
    ) -> bool:
        """Load a model version into memory."""
        async with self._lock:
            try:
                start_time = datetime.now()
                
                # Resolve version if "latest"
                if version == "latest":
                    resolved_version = mlflow_registry.get_latest_model_version(model_name)
                    if not resolved_version:
                        logger.error("No model versions found", model_name=model_name)
                        return False
                    version = resolved_version
                
                model_key = f"{model_name}:{version}"
                
                # Check if already loaded
                if model_key in self.loaded_models:
                    if set_active:
                        self.active_model = model_key
                    logger.info("Model already loaded", model_key=model_key)
                    return True
                
                # Get model info from MLflow
                model_info = mlflow_registry.get_model_info(model_name, version)
                if not model_info:
                    logger.error("Model info not found", model_name=model_name, version=version)
                    return False
                
                # Load model from MLflow
                model = mlflow_registry.load_model_pytorch(model_name, version)
                if not model:
                    logger.error("Failed to load model", model_name=model_name, version=version)
                    return False
                
                # Set model to evaluation mode
                model.eval()
                
                # Move to appropriate device
                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                model = model.to(device)
                
                # Store model and metadata
                self.loaded_models[model_key] = {
                    "model": model,
                    "device": device,
                    "loaded_at": datetime.now(),
                    "info": model_info,
                    "parameters": self._count_parameters(model),
                    "memory_usage_mb": self._get_model_memory_usage(model)
                }
                
                if set_active:
                    self.active_model = model_key
                
                load_time = (datetime.now() - start_time).total_seconds() * 1000
                
                metrics.log_model_load(
                    model_name=model_name,
                    version=version,
                    load_time_ms=load_time,
                    parameters={"param_count": self.loaded_models[model_key]["parameters"]}
                )
                
                logger.info(
                    "Model loaded successfully",
                    model_key=model_key,
                    load_time_ms=load_time,
                    device=str(device),
                    parameters=self.loaded_models[model_key]["parameters"]
                )
                
                return True
                
            except Exception as e:
                logger.error("Failed to load model", error=str(e), model_name=model_name, version=version)
                return False
    
    def get_active_model(self) -> Optional[torch.nn.Module]:
        """Get the currently active model."""
        if not self.active_model or self.active_model not in self.loaded_models:
            return None
        return self.loaded_models[self.active_model]["model"]
    
    def get_active_model_info(self) -> Optional[ModelInfo]:
        """Get information about the active model."""
        if not self.active_model or self.active_model not in self.loaded_models:
            return None
        
        model_data = self.loaded_models[self.active_model]
        info = model_data["info"]
        
        return ModelInfo(
            model_name=info["name"],
            version=info["version"],
            loaded_at=model_data["loaded_at"],
            parameters={
                "param_count": model_data["parameters"],
                "memory_usage_mb": model_data["memory_usage_mb"],
                "device": str(model_data["device"])
            },
            performance_metrics=info.get("metrics", {}),
            is_active=True
        )
    
    def get_loaded_models(self) -> List[ModelInfo]:
        """Get information about all loaded models."""
        models = []
        for model_key, model_data in self.loaded_models.items():
            info = model_data["info"]
            models.append(ModelInfo(
                model_name=info["name"],
                version=info["version"],
                loaded_at=model_data["loaded_at"],
                parameters={
                    "param_count": model_data["parameters"],
                    "memory_usage_mb": model_data["memory_usage_mb"],
                    "device": str(model_data["device"])
                },
                performance_metrics=info.get("metrics", {}),
                is_active=(model_key == self.active_model)
            ))
        return models
    
    async def unload_model(self, model_name: str, version: str) -> bool:
        """Unload a model from memory."""
        async with self._lock:
            try:
                model_key = f"{model_name}:{version}"
                
                if model_key not in self.loaded_models:
                    logger.warning("Model not loaded", model_key=model_key)
                    return False
                
                # Clear model from memory
                del self.loaded_models[model_key]
                
                # Clear active model if it was the unloaded one
                if self.active_model == model_key:
                    self.active_model = None
                
                # Force garbage collection
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
                
                logger.info("Model unloaded", model_key=model_key)
                return True
                
            except Exception as e:
                logger.error("Failed to unload model", error=str(e), model_name=model_name, version=version)
                return False
    
    async def switch_active_model(self, model_name: str, version: str) -> bool:
        """Switch the active model to a different loaded model."""
        model_key = f"{model_name}:{version}"
        
        if model_key not in self.loaded_models:
            # Try to load the model first
            success = await self.load_model(model_name, version, set_active=True)
            return success
        
        self.active_model = model_key
        logger.info("Active model switched", model_key=model_key)
        return True
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics."""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        gpu_memory = {}
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                gpu_memory[f"gpu_{i}"] = {
                    "allocated_mb": torch.cuda.memory_allocated(i) / 1024 / 1024,
                    "cached_mb": torch.cuda.memory_reserved(i) / 1024 / 1024
                }
        
        return {
            "system_memory_mb": memory_info.rss / 1024 / 1024,
            "virtual_memory_mb": memory_info.vms / 1024 / 1024,
            "gpu_memory": gpu_memory,
            "loaded_models": len(self.loaded_models)
        }
    
    def _count_parameters(self, model: torch.nn.Module) -> int:
        """Count the number of parameters in a model."""
        return sum(p.numel() for p in model.parameters())
    
    def _get_model_memory_usage(self, model: torch.nn.Module) -> float:
        """Estimate model memory usage in MB."""
        param_size = sum(p.numel() * p.element_size() for p in model.parameters())
        buffer_size = sum(b.numel() * b.element_size() for b in model.buffers())
        return (param_size + buffer_size) / 1024 / 1024


# Global model manager instance
model_manager = ModelManager()