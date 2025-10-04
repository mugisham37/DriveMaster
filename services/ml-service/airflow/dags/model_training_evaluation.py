"""
Model Training and Evaluation Pipeline DAG

This DAG orchestrates the complete model training and evaluation workflow:
1. Load preprocessed features from feature store
2. Prepare training datasets with proper splits
3. Hyperparameter optimization using Optuna
4. Cross-validation for model robustness
5. Final model training with best parameters
6. Comprehensive model evaluation
7. Model comparison and selection
8. Automated model deployment pipeline

Requirements: 4.1, 4.2, 4.3
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup

# Import our custom utilities
from utils.model_training import (
    train_dkt_model_with_optimization,
    DKTDataset,
    DKTModel,
    DKTTrainer,
    ModelConfig,
    HyperparameterOptimizer,
    ModelEvaluator
)
from utils.feature_engineering import FeatureStore
from utils.model_orchestration import ModelTrainingOrchestrator, ResourceConfig
from utils.monitoring import PipelineMonitor, MetricThresholds, AlertConfig

logger = logging.getLogger(__name__)

# Default arguments for the DAG
default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=10),
    'max_active_runs': 1,
}

# DAG configuration
dag = DAG(
    'model_training_evaluation',
    default_args=default_args,
    description='Complete model training and evaluation pipeline',
    schedule_interval='@weekly',  # Run weekly
    catchup=False,
    tags=['ml', 'training', 'evaluation', 'dkt'],
    max_active_tasks=2,
)

# Configuration from Airflow Variables
FEATURE_STORE_PATH = Variable.get("feature_store_path", "s3://adaptive-learning-features")
MODEL_REGISTRY_URL = Variable.get("mlflow_tracking_uri", "http://mlflow:5000")
EXPERIMENT_NAME = Variable.get("mlflow_experiment", "dkt_production_training")

def load_training_data(**context):
    """
    Load and prepare training data from feature store
    """
    import pandas as pd
    import mlflow
    
    execution_date = context['execution_date']
    
    logger.info("Loading training data from feature store")
    
    # Initialize feature store
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    
    # Load sequence features (primary data for DKT)
    sequence_features = feature_store.load_features('sequence')
    
    if sequence_features is None or len(sequence_features) == 0:
        raise ValueError("No sequence features found in feature store")
    
    # Load user and item features for enrichment
    user_features = feature_store.load_features('user')
    item_features = feature_store.load_features('item')
    
    # Data quality checks
    data_quality = {
        'sequence_count': len(sequence_features),
        'unique_users': sequence_features['user_id'].nunique() if 'user_id' in sequence_features.columns else 0,
        'avg_sequence_length': sequence_features['sequence_length'].mean() if 'sequence_length' in sequence_features.columns else 0,
        'has_user_features': user_features is not None,
        'has_item_features': item_features is not None
    }
    
    # Filter sequences by quality criteria
    min_sequence_length = 5
    max_sequence_length = 200
    
    if 'sequence_length' in sequence_features.columns:
        valid_sequences = sequence_features[
            (sequence_features['sequence_length'] >= min_sequence_length) &
            (sequence_features['sequence_length'] <= max_sequence_length)
        ]
        
        logger.info(f"Filtered {len(sequence_features)} -> {len(valid_sequences)} sequences")
        sequence_features = valid_sequences
    
    # Prepare sequences for DKT training
    sequences = []
    for _, row in sequence_features.iterrows():
        try:
            sequence = {
                'user_id': row['user_id'],
                'sequence_id': row.get('sequence_id', f"{row['user_id']}_{len(sequences)}"),
                'item_sequence': row['item_sequence'],
                'response_sequence': row['response_sequence'],
                'sequence_length': row['sequence_length']
            }
            
            # Add optional fields if available
            for field in ['time_sequence', 'quality_sequence', 'timestamp_sequence']:
                if field in row:
                    sequence[field] = row[field]
            
            sequences.append(sequence)
            
        except Exception as e:
            logger.warning(f"Error processing sequence {row.get('sequence_id', 'unknown')}: {e}")
            continue
    
    if len(sequences) < 100:
        raise ValueError(f"Insufficient training data: only {len(sequences)} valid sequences")
    
    # Set up MLflow experiment
    mlflow.set_tracking_uri(MODEL_REGISTRY_URL)
    mlflow.set_experiment(EXPERIMENT_NAME)
    
    logger.info(f"Prepared {len(sequences)} sequences for training")
    
    return {
        'sequence_count': len(sequences),
        'data_quality': data_quality,
        'feature_store_metadata': feature_store.get_feature_metadata()
    }

def optimize_hyperparameters(**context):
    """
    Perform hyperparameter optimization using Optuna
    """
    import mlflow
    import optuna
    from utils.feature_engineering import FeatureStore
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_training_data')
    
    logger.info(f"Starting hyperparameter optimization for {data_info['sequence_count']} sequences")
    
    # Load sequence data
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    sequence_features = feature_store.load_features('sequence')
    
    # Prepare sequences
    sequences = []
    for _, row in sequence_features.iterrows():
        try:
            sequences.append({
                'user_id': row['user_id'],
                'item_sequence': row['item_sequence'],
                'response_sequence': row['response_sequence'],
                'sequence_length': row['sequence_length']
            })
        except:
            continue
    
    # Create dataset for optimization
    dataset = DKTDataset(sequences, max_length=100)
    
    # Split for optimization (smaller splits for speed)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    
    from torch.utils.data import random_split
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    # Run optimization
    optimizer = HyperparameterOptimizer(
        train_dataset=train_dataset,
        val_dataset=val_dataset,
        n_trials=30  # Reduced for faster execution
    )
    
    optimization_results = optimizer.optimize()
    
    # Log results to MLflow
    with mlflow.start_run(run_name="hyperparameter_optimization"):
        mlflow.log_params(optimization_results['best_params'])
        mlflow.log_metric('best_validation_loss', optimization_results['best_value'])
        
        # Log optimization history
        study = optimization_results['study']
        for trial in study.trials:
            if trial.state == optuna.trial.TrialState.COMPLETE:
                mlflow.log_metric('trial_value', trial.value, step=trial.number)
    
    logger.info(f"Hyperparameter optimization completed. Best loss: {optimization_results['best_value']:.4f}")
    
    return {
        'best_params': optimization_results['best_params'],
        'best_value': optimization_results['best_value'],
        'n_trials': len(study.trials),
        'optimization_time_minutes': 60  # Placeholder
    }

def perform_cross_validation(**context):
    """
    Perform cross-validation to assess model robustness
    """
    import mlflow
    from utils.feature_engineering import FeatureStore
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_training_data')
    optimization_results = ti.xcom_pull(task_ids='optimize_hyperparameters')
    
    logger.info("Starting cross-validation")
    
    # Load sequence data
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    sequence_features = feature_store.load_features('sequence')
    
    # Prepare sequences
    sequences = []
    for _, row in sequence_features.iterrows():
        try:
            sequences.append({
                'user_id': row['user_id'],
                'item_sequence': row['item_sequence'],
                'response_sequence': row['response_sequence'],
                'sequence_length': row['sequence_length']
            })
        except:
            continue
    
    # Create dataset
    dataset = DKTDataset(sequences, max_length=100)
    
    # Create model config from best parameters
    best_params = optimization_results['best_params']
    config = ModelConfig(**best_params)
    
    # Perform cross-validation
    evaluator = ModelEvaluator()
    cv_results = evaluator.cross_validate(
        dataset=dataset,
        config=config,
        k_folds=5
    )
    
    # Log results to MLflow
    with mlflow.start_run(run_name="cross_validation"):
        mlflow.log_params(best_params)
        
        # Log aggregated CV metrics
        for metric, stats in cv_results['aggregated_metrics'].items():
            mlflow.log_metric(f"cv_{metric}_mean", stats['mean'])
            mlflow.log_metric(f"cv_{metric}_std", stats['std'])
            mlflow.log_metric(f"cv_{metric}_min", min(stats['values']))
            mlflow.log_metric(f"cv_{metric}_max", max(stats['values']))
    
    # Determine if model is stable enough for production
    auc_mean = cv_results['aggregated_metrics']['auc']['mean']
    auc_std = cv_results['aggregated_metrics']['auc']['std']
    
    model_stable = auc_mean > 0.75 and auc_std < 0.05
    
    logger.info(f"Cross-validation completed. AUC: {auc_mean:.4f} ± {auc_std:.4f}")
    logger.info(f"Model stability: {'PASS' if model_stable else 'FAIL'}")
    
    return {
        'cv_metrics': cv_results['aggregated_metrics'],
        'model_stable': model_stable,
        'stability_threshold_met': auc_mean > 0.75,
        'variance_threshold_met': auc_std < 0.05
    }

def train_final_model(**context):
    """
    Train the final production model with best parameters
    """
    import mlflow
    import torch
    from torch.utils.data import DataLoader, random_split
    from utils.feature_engineering import FeatureStore
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_training_data')
    optimization_results = ti.xcom_pull(task_ids='optimize_hyperparameters')
    cv_results = ti.xcom_pull(task_ids='perform_cross_validation')
    
    logger.info("Training final production model")
    
    # Check if we should proceed based on CV results
    if not cv_results['model_stable']:
        logger.warning("Model failed stability checks, but proceeding with training")
    
    # Load sequence data
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    sequence_features = feature_store.load_features('sequence')
    
    # Prepare sequences
    sequences = []
    for _, row in sequence_features.iterrows():
        try:
            sequences.append({
                'user_id': row['user_id'],
                'item_sequence': row['item_sequence'],
                'response_sequence': row['response_sequence'],
                'sequence_length': row['sequence_length']
            })
        except:
            continue
    
    # Create dataset
    dataset = DKTDataset(sequences, max_length=100)
    
    # Create final train/val/test splits
    train_size = int(0.7 * len(dataset))
    val_size = int(0.15 * len(dataset))
    test_size = len(dataset) - train_size - val_size
    
    train_dataset, val_dataset, test_dataset = random_split(
        dataset, [train_size, val_size, test_size]
    )
    
    # Create model config from best parameters
    best_params = optimization_results['best_params']
    config = ModelConfig(
        **best_params,
        max_epochs=100,  # Full training epochs
        early_stopping_patience=15
    )
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False, num_workers=2)
    test_loader = DataLoader(test_dataset, batch_size=config.batch_size, shuffle=False, num_workers=2)
    
    # Start MLflow run for final training
    with mlflow.start_run(run_name="final_model_training"):
        # Log configuration
        mlflow.log_params(best_params)
        mlflow.log_param('train_size', train_size)
        mlflow.log_param('val_size', val_size)
        mlflow.log_param('test_size', test_size)
        
        # Create and train model
        model = DKTModel(num_items=dataset.num_items, config=config)
        trainer = DKTTrainer(model, config)
        
        # Train model
        training_history = trainer.train(
            train_loader=train_loader,
            val_loader=val_loader,
            mlflow_run_id=mlflow.active_run().info.run_id
        )
        
        # Evaluate on test set
        evaluator = ModelEvaluator()
        test_metrics = evaluator.evaluate_model(model, test_loader)
        
        # Log test metrics
        for metric, value in test_metrics.items():
            mlflow.log_metric(f"test_{metric}", value)
        
        # Log model artifacts
        mlflow.pytorch.log_model(
            pytorch_model=model,
            artifact_path="model",
            registered_model_name="DKT_Production_Model"
        )
        
        # Save additional artifacts
        import json
        
        # Save training configuration
        config_dict = {
            'model_config': best_params,
            'dataset_info': {
                'num_items': dataset.num_items,
                'vocab_size': len(dataset.item_vocab),
                'train_size': train_size,
                'val_size': val_size,
                'test_size': test_size
            },
            'training_metrics': {
                'best_val_loss': trainer.best_val_loss,
                'epochs_trained': len(training_history),
                'early_stopped': trainer.epochs_without_improvement >= config.early_stopping_patience
            }
        }
        
        mlflow.log_dict(config_dict, "training_config.json")
        
        # Save item vocabulary
        mlflow.log_dict(dataset.item_vocab, "item_vocabulary.json")
        
        model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
        
        logger.info(f"Final model training completed. Test AUC: {test_metrics.get('auc', 0):.4f}")
        
        return {
            'model_uri': model_uri,
            'test_metrics': test_metrics,
            'training_epochs': len(training_history),
            'best_val_loss': trainer.best_val_loss,
            'dataset_info': config_dict['dataset_info']
        }

def evaluate_and_compare_models(**context):
    """
    Evaluate final model and compare with previous versions
    """
    import mlflow
    from mlflow.tracking import MlflowClient
    
    ti = context['ti']
    training_results = ti.xcom_pull(task_ids='train_final_model')
    
    logger.info("Evaluating and comparing models")
    
    # Initialize MLflow client
    mlflow.set_tracking_uri(MODEL_REGISTRY_URL)
    client = MlflowClient()
    
    current_model_uri = training_results['model_uri']
    current_metrics = training_results['test_metrics']
    
    # Get previous production model for comparison
    try:
        production_models = client.get_latest_versions(
            name="DKT_Production_Model",
            stages=["Production"]
        )
        
        if production_models:
            previous_model = production_models[0]
            previous_run = client.get_run(previous_model.run_id)
            previous_metrics = {
                key.replace('test_', ''): value 
                for key, value in previous_run.data.metrics.items() 
                if key.startswith('test_')
            }
        else:
            previous_metrics = None
            
    except Exception as e:
        logger.warning(f"Could not retrieve previous production model: {e}")
        previous_metrics = None
    
    # Compare models
    comparison_results = {
        'current_model': {
            'uri': current_model_uri,
            'metrics': current_metrics
        },
        'improvement_over_previous': {},
        'deployment_recommendation': 'deploy'  # Default
    }
    
    if previous_metrics:
        # Calculate improvements
        for metric in ['auc', 'accuracy', 'f1']:
            if metric in current_metrics and metric in previous_metrics:
                current_val = current_metrics[metric]
                previous_val = previous_metrics[metric]
                improvement = current_val - previous_val
                improvement_pct = (improvement / previous_val) * 100 if previous_val > 0 else 0
                
                comparison_results['improvement_over_previous'][metric] = {
                    'current': current_val,
                    'previous': previous_val,
                    'improvement': improvement,
                    'improvement_pct': improvement_pct
                }
        
        # Deployment decision logic
        auc_improvement = comparison_results['improvement_over_previous'].get('auc', {}).get('improvement', 0)
        
        if auc_improvement < -0.02:  # Significant degradation
            comparison_results['deployment_recommendation'] = 'reject'
        elif auc_improvement < 0.01:  # Minimal improvement
            comparison_results['deployment_recommendation'] = 'review'
        else:  # Good improvement
            comparison_results['deployment_recommendation'] = 'deploy'
    
    # Model quality checks
    quality_checks = {
        'auc_threshold': current_metrics.get('auc', 0) > 0.75,
        'accuracy_threshold': current_metrics.get('accuracy', 0) > 0.70,
        'f1_threshold': current_metrics.get('f1', 0) > 0.65
    }
    
    all_checks_passed = all(quality_checks.values())
    
    if not all_checks_passed:
        comparison_results['deployment_recommendation'] = 'reject'
    
    comparison_results['quality_checks'] = quality_checks
    comparison_results['all_quality_checks_passed'] = all_checks_passed
    
    # Log comparison results
    with mlflow.start_run(run_name="model_evaluation_comparison"):
        mlflow.log_metrics(current_metrics)
        
        if previous_metrics:
            for metric, comparison in comparison_results['improvement_over_previous'].items():
                mlflow.log_metric(f"improvement_{metric}", comparison['improvement'])
                mlflow.log_metric(f"improvement_pct_{metric}", comparison['improvement_pct'])
        
        mlflow.log_param('deployment_recommendation', comparison_results['deployment_recommendation'])
        mlflow.log_params(quality_checks)
    
    logger.info(f"Model evaluation completed. Recommendation: {comparison_results['deployment_recommendation']}")
    
    return comparison_results

def deploy_model(**context):
    """
    Deploy model to production if it meets criteria
    """
    import mlflow
    from mlflow.tracking import MlflowClient
    
    ti = context['ti']
    training_results = ti.xcom_pull(task_ids='train_final_model')
    evaluation_results = ti.xcom_pull(task_ids='evaluate_and_compare_models')
    
    deployment_recommendation = evaluation_results['deployment_recommendation']
    
    logger.info(f"Processing deployment with recommendation: {deployment_recommendation}")
    
    if deployment_recommendation == 'reject':
        logger.warning("Model deployment rejected due to quality issues")
        return {
            'deployed': False,
            'reason': 'Quality checks failed or significant performance degradation'
        }
    
    if deployment_recommendation == 'review':
        logger.info("Model requires manual review before deployment")
        return {
            'deployed': False,
            'reason': 'Manual review required - minimal improvement over previous model'
        }
    
    # Proceed with deployment
    mlflow.set_tracking_uri(MODEL_REGISTRY_URL)
    client = MlflowClient()
    
    try:
        # Get the model version
        model_name = "DKT_Production_Model"
        latest_version = client.get_latest_versions(model_name, stages=["None"])[0]
        
        # Transition to Production stage
        client.transition_model_version_stage(
            name=model_name,
            version=latest_version.version,
            stage="Production",
            archive_existing_versions=True
        )
        
        # Add deployment metadata
        client.set_model_version_tag(
            name=model_name,
            version=latest_version.version,
            key="deployment_date",
            value=datetime.utcnow().isoformat()
        )
        
        client.set_model_version_tag(
            name=model_name,
            version=latest_version.version,
            key="deployment_pipeline",
            value="airflow_automated"
        )
        
        # Update model description
        test_auc = training_results['test_metrics'].get('auc', 0)
        description = f"DKT model deployed on {datetime.utcnow().strftime('%Y-%m-%d')} with test AUC: {test_auc:.4f}"
        
        client.update_model_version(
            name=model_name,
            version=latest_version.version,
            description=description
        )
        
        logger.info(f"Model version {latest_version.version} successfully deployed to Production")
        
        return {
            'deployed': True,
            'model_version': latest_version.version,
            'deployment_time': datetime.utcnow().isoformat(),
            'test_metrics': training_results['test_metrics']
        }
        
    except Exception as e:
        logger.error(f"Error during model deployment: {e}")
        return {
            'deployed': False,
            'reason': f'Deployment error: {str(e)}'
        }

# Task definitions
load_data_task = PythonOperator(
    task_id='load_training_data',
    python_callable=load_training_data,
    dag=dag
)

# Model development task group
with TaskGroup("model_development", dag=dag) as model_development_group:
    
    optimize_hyperparams_task = PythonOperator(
        task_id='optimize_hyperparameters',
        python_callable=optimize_hyperparameters,
        dag=dag
    )
    
    cross_validate_task = PythonOperator(
        task_id='perform_cross_validation',
        python_callable=perform_cross_validation,
        dag=dag
    )
    
    train_final_task = PythonOperator(
        task_id='train_final_model',
        python_callable=train_final_model,
        dag=dag
    )
    
    # Sequential execution within the group
    optimize_hyperparams_task >> cross_validate_task >> train_final_task

# Model evaluation and deployment
evaluate_models_task = PythonOperator(
    task_id='evaluate_and_compare_models',
    python_callable=evaluate_and_compare_models,
    dag=dag
)

deploy_model_task = PythonOperator(
    task_id='deploy_model',
    python_callable=deploy_model,
    dag=dag
)

# Cleanup task
cleanup_task = BashOperator(
    task_id='cleanup_temp_files',
    bash_command='rm -f /tmp/*.pth /tmp/*.pkl /tmp/*.json',
    dag=dag
)

# Define task dependencies
load_data_task >> model_development_group >> evaluate_models_task >> deploy_model_task >> cleanup_task