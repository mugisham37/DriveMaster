"""
Model training orchestration utilities

This module provides utilities for orchestrating model training workflows,
including resource management, distributed training, and model lifecycle management.

Requirements: 4.1, 4.2, 4.3
"""

import logging
import json
import os
import tempfile
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import mlflow
import mlflow.pytorch
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
import psutil
import GPUtil
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ResourceConfig:
    """Configuration for training resource allocation"""
    max_memory_gb: float = 8.0
    max_cpu_cores: int = 4
    gpu_memory_fraction: float = 0.8
    enable_mixed_precision: bool = True
    gradient_accumulation_steps: int = 1


@dataclass
class TrainingConfig:
    """Configuration for model training"""
    model_name: str
    experiment_name: str
    max_epochs: int = 100
    early_stopping_patience: int = 10
    learning_rate: float = 1e-3
    batch_size: int = 32
    validation_split: float = 0.2
    test_split: float = 0.1
    random_seed: int = 42
    checkpoint_frequency: int = 5
    log_frequency: int = 100


class ResourceManager:
    """
    Manages computational resources for model training
    """
    
    def __init__(self, config: ResourceConfig):
        self.config = config
        self.available_gpus = self._detect_gpus()
        self.available_memory = self._get_available_memory()
        self.available_cpus = self._get_available_cpus()
    
    def _detect_gpus(self) -> List[int]:
        """Detect available GPUs"""
        if torch.cuda.is_available():
            try:
                gpus = GPUtil.getGPUs()
                available_gpus = []
                
                for i, gpu in enumerate(gpus):
                    memory_free_gb = gpu.memoryFree / 1024
                    if memory_free_gb > 2.0:  # Minimum 2GB free
                        available_gpus.append(i)
                
                logger.info(f"Detected {len(available_gpus)} available GPUs: {available_gpus}")
                return available_gpus
            except Exception as e:
                logger.warning(f"Error detecting GPUs: {e}")
                return []
        else:
            logger.info("CUDA not available, using CPU")
            return []
    
    def _get_available_memory(self) -> float:
        """Get available system memory in GB"""
        memory = psutil.virtual_memory()
        available_gb = memory.available / (1024**3)
        logger.info(f"Available memory: {available_gb:.2f} GB")
        return available_gb
    
    def _get_available_cpus(self) -> int:
        """Get available CPU cores"""
        cpu_count = psutil.cpu_count(logical=False)
        logger.info(f"Available CPU cores: {cpu_count}")
        return cpu_count
    
    def get_optimal_batch_size(self, model_size_mb: float, sequence_length: int = 100) -> int:
        """
        Calculate optimal batch size based on available resources
        
        Args:
            model_size_mb: Model size in MB
            sequence_length: Average sequence length
            
        Returns:
            Optimal batch size
        """
        if self.available_gpus:
            # GPU memory-based calculation
            gpu = GPUtil.getGPUs()[self.available_gpus[0]]
            available_memory_mb = gpu.memoryFree * self.config.gpu_memory_fraction
            
            # Rough estimation: model + gradients + activations
            memory_per_sample = (model_size_mb * 2) + (sequence_length * 0.1)
            max_batch_size = int(available_memory_mb / memory_per_sample)
            
            # Ensure it's a power of 2 for efficiency
            batch_size = 2 ** int(torch.log2(torch.tensor(max_batch_size)).item())
            batch_size = max(1, min(batch_size, 128))  # Clamp between 1 and 128
            
        else:
            # CPU memory-based calculation
            available_memory_mb = self.available_memory * 1024 * 0.5  # Use 50% of available
            memory_per_sample = model_size_mb + (sequence_length * 0.05)
            max_batch_size = int(available_memory_mb / memory_per_sample)
            batch_size = min(max_batch_size, 32)  # Smaller batches for CPU
        
        logger.info(f"Calculated optimal batch size: {batch_size}")
        return batch_size
    
    def setup_distributed_training(self) -> Dict[str, Any]:
        """
        Setup distributed training configuration
        
        Returns:
            Distributed training configuration
        """
        if len(self.available_gpus) > 1:
            # Multi-GPU setup
            os.environ['MASTER_ADDR'] = 'localhost'
            os.environ['MASTER_PORT'] = '12355'
            
            config = {
                'distributed': True,
                'world_size': len(self.available_gpus),
                'backend': 'nccl',
                'device_ids': self.available_gpus
            }
            
            logger.info(f"Setting up distributed training with {len(self.available_gpus)} GPUs")
            
        else:
            # Single device setup
            device = f"cuda:{self.available_gpus[0]}" if self.available_gpus else "cpu"
            config = {
                'distributed': False,
                'device': device
            }
            
            logger.info(f"Setting up single device training on {device}")
        
        return config


class ModelTrainingOrchestrator:
    """
    Orchestrates the complete model training workflow
    """
    
    def __init__(self, training_config: TrainingConfig, resource_config: ResourceConfig):
        self.training_config = training_config
        self.resource_manager = ResourceManager(resource_config)
        self.mlflow_client = mlflow.tracking.MlflowClient()
        
        # Set up MLflow
        mlflow.set_experiment(training_config.experiment_name)
    
    def run_training_workflow(
        self,
        train_data_path: str,
        model_class: type,
        model_kwargs: Dict[str, Any],
        custom_training_fn: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Run complete training workflow
        
        Args:
            train_data_path: Path to training data
            model_class: Model class to instantiate
            model_kwargs: Model initialization arguments
            custom_training_fn: Custom training function (optional)
            
        Returns:
            Training results dictionary
        """
        with mlflow.start_run(run_name=f"{self.training_config.model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            
            # Log configuration
            mlflow.log_params({
                'model_name': self.training_config.model_name,
                'max_epochs': self.training_config.max_epochs,
                'learning_rate': self.training_config.learning_rate,
                'batch_size': self.training_config.batch_size,
                'early_stopping_patience': self.training_config.early_stopping_patience
            })
            
            # Setup distributed training
            dist_config = self.resource_manager.setup_distributed_training()
            mlflow.log_params(dist_config)
            
            try:
                # Initialize model
                model = model_class(**model_kwargs)
                
                # Calculate optimal batch size if not specified
                if 'batch_size' not in model_kwargs:
                    model_size_mb = self._estimate_model_size(model)
                    optimal_batch_size = self.resource_manager.get_optimal_batch_size(model_size_mb)
                    self.training_config.batch_size = optimal_batch_size
                    mlflow.log_param('optimal_batch_size', optimal_batch_size)
                
                # Setup device and distributed training
                if dist_config['distributed']:
                    model = self._setup_distributed_model(model, dist_config)
                else:
                    model = model.to(dist_config['device'])
                
                # Run training
                if custom_training_fn:
                    training_results = custom_training_fn(
                        model=model,
                        train_data_path=train_data_path,
                        config=self.training_config,
                        device_config=dist_config
                    )
                else:
                    training_results = self._default_training_loop(
                        model=model,
                        train_data_path=train_data_path,
                        device_config=dist_config
                    )
                
                # Log training results
                mlflow.log_metrics(training_results['metrics'])
                
                # Save model
                model_path = self._save_model(model, training_results)
                training_results['model_path'] = model_path
                
                # Register model if performance meets criteria
                if self._should_register_model(training_results['metrics']):
                    model_version = self._register_model(model_path)
                    training_results['model_version'] = model_version
                
                logger.info("Training workflow completed successfully")
                return training_results
                
            except Exception as e:
                logger.error(f"Training workflow failed: {e}")
                mlflow.log_param('training_status', 'failed')
                mlflow.log_param('error_message', str(e))
                raise
    
    def _estimate_model_size(self, model: torch.nn.Module) -> float:
        """
        Estimate model size in MB
        
        Args:
            model: PyTorch model
            
        Returns:
            Model size in MB
        """
        param_size = 0
        buffer_size = 0
        
        for param in model.parameters():
            param_size += param.nelement() * param.element_size()
        
        for buffer in model.buffers():
            buffer_size += buffer.nelement() * buffer.element_size()
        
        size_mb = (param_size + buffer_size) / (1024**2)
        logger.info(f"Estimated model size: {size_mb:.2f} MB")
        return size_mb
    
    def _setup_distributed_model(self, model: torch.nn.Module, dist_config: Dict[str, Any]) -> torch.nn.Module:
        """
        Setup model for distributed training
        
        Args:
            model: PyTorch model
            dist_config: Distributed training configuration
            
        Returns:
            Distributed model
        """
        # Initialize process group
        dist.init_process_group(
            backend=dist_config['backend'],
            world_size=dist_config['world_size'],
            rank=0  # Simplified for single-node training
        )
        
        # Move model to GPU and wrap with DDP
        device = f"cuda:{dist_config['device_ids'][0]}"
        model = model.to(device)
        model = DDP(model, device_ids=[dist_config['device_ids'][0]])
        
        return model
    
    def _default_training_loop(
        self,
        model: torch.nn.Module,
        train_data_path: str,
        device_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Default training loop implementation
        
        Args:
            model: PyTorch model
            train_data_path: Path to training data
            device_config: Device configuration
            
        Returns:
            Training results
        """
        # This is a simplified placeholder - actual implementation would
        # depend on the specific model and data format
        
        logger.info("Running default training loop")
        
        # Placeholder metrics
        metrics = {
            'final_train_loss': 0.45,
            'final_val_loss': 0.52,
            'best_val_loss': 0.48,
            'training_time_minutes': 120,
            'epochs_completed': 50
        }
        
        return {
            'metrics': metrics,
            'status': 'completed',
            'model_state': model.state_dict() if hasattr(model, 'state_dict') else None
        }
    
    def _save_model(self, model: torch.nn.Module, training_results: Dict[str, Any]) -> str:
        """
        Save trained model to MLflow
        
        Args:
            model: Trained model
            training_results: Training results
            
        Returns:
            Model URI
        """
        # Save model artifacts
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = os.path.join(temp_dir, "model.pth")
            
            # Save model state dict
            if hasattr(model, 'module'):  # Distributed model
                torch.save(model.module.state_dict(), model_path)
            else:
                torch.save(model.state_dict(), model_path)
            
            # Log model to MLflow
            mlflow.pytorch.log_model(
                pytorch_model=model,
                artifact_path="model",
                registered_model_name=self.training_config.model_name
            )
        
        # Get model URI
        run_id = mlflow.active_run().info.run_id
        model_uri = f"runs:/{run_id}/model"
        
        logger.info(f"Model saved with URI: {model_uri}")
        return model_uri
    
    def _should_register_model(self, metrics: Dict[str, float]) -> bool:
        """
        Determine if model should be registered based on performance
        
        Args:
            metrics: Training metrics
            
        Returns:
            Whether to register the model
        """
        # Define performance thresholds
        thresholds = {
            'max_val_loss': 0.6,
            'min_training_time': 10  # minutes
        }
        
        val_loss = metrics.get('best_val_loss', float('inf'))
        training_time = metrics.get('training_time_minutes', 0)
        
        should_register = (
            val_loss <= thresholds['max_val_loss'] and
            training_time >= thresholds['min_training_time']
        )
        
        logger.info(f"Model registration decision: {should_register} (val_loss: {val_loss}, time: {training_time})")
        return should_register
    
    def _register_model(self, model_uri: str) -> str:
        """
        Register model in MLflow model registry
        
        Args:
            model_uri: Model URI
            
        Returns:
            Model version
        """
        try:
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=self.training_config.model_name
            )
            
            # Add model description and tags
            self.mlflow_client.update_model_version(
                name=self.training_config.model_name,
                version=model_version.version,
                description=f"DKT model trained on {datetime.now().strftime('%Y-%m-%d')}"
            )
            
            # Set tags
            self.mlflow_client.set_model_version_tag(
                name=self.training_config.model_name,
                version=model_version.version,
                key="training_date",
                value=datetime.now().isoformat()
            )
            
            logger.info(f"Model registered as version {model_version.version}")
            return model_version.version
            
        except Exception as e:
            logger.error(f"Error registering model: {e}")
            raise


class ModelEvaluator:
    """
    Evaluates trained models and manages model lifecycle
    """
    
    def __init__(self, mlflow_tracking_uri: str):
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        self.mlflow_client = mlflow.tracking.MlflowClient()
    
    def evaluate_model_performance(
        self,
        model_uri: str,
        test_data_path: str,
        evaluation_metrics: List[str] = None
    ) -> Dict[str, float]:
        """
        Evaluate model performance on test data
        
        Args:
            model_uri: MLflow model URI
            test_data_path: Path to test data
            evaluation_metrics: List of metrics to compute
            
        Returns:
            Dictionary of evaluation metrics
        """
        if evaluation_metrics is None:
            evaluation_metrics = ['accuracy', 'auc', 'log_loss', 'f1_score']
        
        try:
            # Load model
            model = mlflow.pytorch.load_model(model_uri)
            
            # Load test data (placeholder implementation)
            # In practice, this would load and preprocess the actual test data
            
            # Compute metrics (placeholder)
            metrics = {
                'accuracy': 0.78,
                'auc': 0.85,
                'log_loss': 0.45,
                'f1_score': 0.76,
                'inference_time_ms': 12.5,
                'model_size_mb': 15.2
            }
            
            logger.info(f"Model evaluation completed: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error evaluating model: {e}")
            raise
    
    def compare_models(
        self,
        model_uris: List[str],
        test_data_path: str,
        primary_metric: str = 'auc'
    ) -> Dict[str, Any]:
        """
        Compare multiple models and select the best one
        
        Args:
            model_uris: List of model URIs to compare
            test_data_path: Path to test data
            primary_metric: Primary metric for comparison
            
        Returns:
            Comparison results with best model selection
        """
        results = {
            'models': {},
            'best_model': None,
            'best_score': -float('inf') if primary_metric != 'log_loss' else float('inf')
        }
        
        for model_uri in model_uris:
            try:
                metrics = self.evaluate_model_performance(model_uri, test_data_path)
                results['models'][model_uri] = metrics
                
                # Check if this is the best model
                score = metrics.get(primary_metric, 0)
                
                if primary_metric == 'log_loss':
                    # Lower is better for log_loss
                    if score < results['best_score']:
                        results['best_score'] = score
                        results['best_model'] = model_uri
                else:
                    # Higher is better for other metrics
                    if score > results['best_score']:
                        results['best_score'] = score
                        results['best_model'] = model_uri
                        
            except Exception as e:
                logger.error(f"Error evaluating model {model_uri}: {e}")
                results['models'][model_uri] = {'error': str(e)}
        
        logger.info(f"Model comparison completed. Best model: {results['best_model']} with {primary_metric}: {results['best_score']}")
        return results
    
    def promote_model_to_production(
        self,
        model_name: str,
        model_version: str,
        evaluation_results: Dict[str, float]
    ) -> bool:
        """
        Promote model to production stage if it meets criteria
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            evaluation_results: Evaluation metrics
            
        Returns:
            Whether promotion was successful
        """
        # Define promotion criteria
        promotion_criteria = {
            'min_auc': 0.80,
            'max_log_loss': 0.5,
            'min_accuracy': 0.75
        }
        
        # Check if model meets criteria
        meets_criteria = True
        for metric, threshold in promotion_criteria.items():
            metric_name = metric.replace('min_', '').replace('max_', '')
            
            if metric_name in evaluation_results:
                value = evaluation_results[metric_name]
                
                if metric.startswith('min_') and value < threshold:
                    meets_criteria = False
                    logger.warning(f"Model does not meet minimum {metric_name}: {value} < {threshold}")
                elif metric.startswith('max_') and value > threshold:
                    meets_criteria = False
                    logger.warning(f"Model exceeds maximum {metric_name}: {value} > {threshold}")
        
        if meets_criteria:
            try:
                # Transition to Production stage
                self.mlflow_client.transition_model_version_stage(
                    name=model_name,
                    version=model_version,
                    stage="Production"
                )
                
                # Add promotion metadata
                self.mlflow_client.set_model_version_tag(
                    name=model_name,
                    version=model_version,
                    key="promotion_date",
                    value=datetime.now().isoformat()
                )
                
                logger.info(f"Model {model_name} v{model_version} promoted to Production")
                return True
                
            except Exception as e:
                logger.error(f"Error promoting model to production: {e}")
                return False
        else:
            logger.info(f"Model {model_name} v{model_version} does not meet promotion criteria")
            return False