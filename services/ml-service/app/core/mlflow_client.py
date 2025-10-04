"""MLflow integration for model registry and versioning."""

import mlflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient
from typing import Dict, Any, Optional, List
import torch
import os
from pathlib import Path
from app.config import settings
from app.core.logging import get_logger, MLMetrics

logger = get_logger(__name__)
metrics = MLMetrics()


class MLflowModelRegistry:
    """MLflow model registry client for model management."""
    
    def __init__(self):
        self.client: Optional[MlflowClient] = None
        self.tracking_uri = settings.mlflow_tracking_uri
        self.experiment_name = settings.mlflow_experiment_name
        self.experiment_id: Optional[str] = None
    
    async def initialize(self) -> None:
        """Initialize MLflow client and experiment."""
        try:
            # Set tracking URI
            mlflow.set_tracking_uri(self.tracking_uri)
            self.client = MlflowClient(tracking_uri=self.tracking_uri)
            
            # Create or get experiment
            try:
                experiment = mlflow.get_experiment_by_name(self.experiment_name)
                if experiment is None:
                    self.experiment_id = mlflow.create_experiment(self.experiment_name)
                    logger.info("Created MLflow experiment", experiment_name=self.experiment_name)
                else:
                    self.experiment_id = experiment.experiment_id
                    logger.info("Using existing MLflow experiment", experiment_name=self.experiment_name)
            except Exception as e:
                logger.error("Failed to setup MLflow experiment", error=str(e))
                raise
            
            logger.info("MLflow client initialized", tracking_uri=self.tracking_uri)
            
        except Exception as e:
            logger.error("Failed to initialize MLflow client", error=str(e))
            raise
    
    def get_latest_model_version(self, model_name: str) -> Optional[str]:
        """Get the latest version of a registered model."""
        try:
            if not self.client:
                return None
            
            latest_versions = self.client.get_latest_versions(
                model_name,
                stages=["Production", "Staging"]
            )
            
            if latest_versions:
                # Prefer Production, fallback to Staging
                for version in latest_versions:
                    if version.current_stage == "Production":
                        return version.version
                return latest_versions[0].version
            
            return None
            
        except Exception as e:
            logger.error("Failed to get latest model version", error=str(e), model_name=model_name)
            return None
    
    def get_model_info(self, model_name: str, version: str) -> Optional[Dict[str, Any]]:
        """Get model information and metadata."""
        try:
            if not self.client:
                return None
            
            model_version = self.client.get_model_version(model_name, version)
            
            # Get run information for additional metadata
            run = self.client.get_run(model_version.run_id)
            
            return {
                "name": model_name,
                "version": version,
                "stage": model_version.current_stage,
                "description": model_version.description,
                "creation_timestamp": model_version.creation_timestamp,
                "last_updated_timestamp": model_version.last_updated_timestamp,
                "run_id": model_version.run_id,
                "source": model_version.source,
                "status": model_version.status,
                "metrics": run.data.metrics,
                "params": run.data.params,
                "tags": run.data.tags
            }
            
        except Exception as e:
            logger.error("Failed to get model info", error=str(e), model_name=model_name, version=version)
            return None
    
    def download_model(self, model_name: str, version: str, local_path: str) -> Optional[str]:
        """Download model artifacts to local path."""
        try:
            if not self.client:
                return None
            
            model_uri = f"models:/{model_name}/{version}"
            local_model_path = mlflow.pytorch.load_model(model_uri, map_location="cpu")
            
            # Save to specified path
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            torch.save(local_model_path.state_dict(), local_path)
            
            logger.info("Model downloaded", model_name=model_name, version=version, path=local_path)
            return local_path
            
        except Exception as e:
            logger.error("Failed to download model", error=str(e), model_name=model_name, version=version)
            return None
    
    def load_model_pytorch(self, model_name: str, version: str) -> Optional[torch.nn.Module]:
        """Load PyTorch model directly from MLflow."""
        try:
            if not self.client:
                return None
            
            model_uri = f"models:/{model_name}/{version}"
            model = mlflow.pytorch.load_model(model_uri, map_location="cpu")
            
            logger.info("Model loaded from MLflow", model_name=model_name, version=version)
            return model
            
        except Exception as e:
            logger.error("Failed to load model from MLflow", error=str(e), model_name=model_name, version=version)
            return None
    
    def register_model(
        self,
        model_path: str,
        model_name: str,
        description: str = None,
        tags: Dict[str, str] = None
    ) -> Optional[str]:
        """Register a new model version."""
        try:
            if not self.client:
                return None
            
            # Start MLflow run
            with mlflow.start_run(experiment_id=self.experiment_id) as run:
                # Log model
                mlflow.pytorch.log_model(
                    pytorch_model=torch.load(model_path),
                    artifact_path="model",
                    registered_model_name=model_name
                )
                
                # Add tags if provided
                if tags:
                    mlflow.set_tags(tags)
                
                run_id = run.info.run_id
            
            # Update model version description
            if description:
                latest_version = self.get_latest_model_version(model_name)
                if latest_version:
                    self.client.update_model_version(
                        model_name,
                        latest_version,
                        description=description
                    )
            
            logger.info("Model registered", model_name=model_name, run_id=run_id)
            return run_id
            
        except Exception as e:
            logger.error("Failed to register model", error=str(e), model_name=model_name)
            return None
    
    def transition_model_stage(
        self,
        model_name: str,
        version: str,
        stage: str,
        archive_existing_versions: bool = False
    ) -> bool:
        """Transition model to a different stage."""
        try:
            if not self.client:
                return False
            
            self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage,
                archive_existing_versions=archive_existing_versions
            )
            
            logger.info("Model stage transitioned", model_name=model_name, version=version, stage=stage)
            return True
            
        except Exception as e:
            logger.error("Failed to transition model stage", error=str(e), model_name=model_name, version=version, stage=stage)
            return False
    
    def get_model_performance_metrics(self, model_name: str, version: str) -> Dict[str, float]:
        """Get performance metrics for a model version."""
        try:
            model_info = self.get_model_info(model_name, version)
            if model_info and "metrics" in model_info:
                return model_info["metrics"]
            return {}
            
        except Exception as e:
            logger.error("Failed to get model metrics", error=str(e), model_name=model_name, version=version)
            return {}


# Global MLflow registry instance
mlflow_registry = MLflowModelRegistry()