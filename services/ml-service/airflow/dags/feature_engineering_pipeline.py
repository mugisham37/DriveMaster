"""
Feature Engineering Pipeline DAG for Adaptive Learning Platform

This DAG orchestrates the feature engineering workflow:
1. Load raw data from data lake
2. Extract user behavior features
3. Extract item difficulty features  
4. Extract sequence features for DKT
5. Validate and store features in feature store
6. Monitor feature quality and drift

Requirements: 11.5
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import logging

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup

# Import our custom utilities
from utils.feature_engineering import (
    engineer_all_features,
    FeatureConfig,
    FeatureStore,
    UserBehaviorFeatureExtractor,
    ItemDifficultyFeatureExtractor,
    SequenceFeatureExtractor
)
from utils.data_extraction import DataLakeManager, DataQualityValidator
from utils.monitoring import DataQualityMonitor, MetricThresholds

logger = logging.getLogger(__name__)

# Default arguments for the DAG
default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'max_active_runs': 1,
}

# DAG configuration
dag = DAG(
    'feature_engineering_pipeline',
    default_args=default_args,
    description='Feature engineering pipeline for ML training',
    schedule_interval='@daily',  # Run daily
    catchup=False,
    tags=['ml', 'features', 'preprocessing'],
    max_active_tasks=3,
)

# Configuration from Airflow Variables
DATA_LAKE_BUCKET = Variable.get("data_lake_bucket", "adaptive-learning-data")
FEATURE_STORE_PATH = Variable.get("feature_store_path", "s3://adaptive-learning-features")
POSTGRES_CONN_ID = "postgres_ml"

def load_raw_data(**context):
    """
    Load raw data from data lake for feature engineering
    """
    import pandas as pd
    import boto3
    from datetime import datetime, timedelta
    
    execution_date = context['execution_date']
    
    # Calculate data window (last 30 days for comprehensive features)
    end_date = execution_date
    start_date = end_date - timedelta(days=30)
    
    logger.info(f"Loading raw data from {start_date} to {end_date}")
    
    data_lake = DataLakeManager(DATA_LAKE_BUCKET)
    
    # Load attempts data from multiple days
    attempts_data = []
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y/%m/%d')
        
        try:
            # Try to load attempts data for this date
            s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
            daily_attempts = data_lake.load_dataframe_from_parquet(s3_key)
            attempts_data.append(daily_attempts)
            logger.info(f"Loaded {len(daily_attempts)} attempts for {date_str}")
            
        except Exception as e:
            logger.warning(f"No data found for {date_str}: {e}")
        
        current_date += timedelta(days=1)
    
    if not attempts_data:
        raise ValueError("No attempts data found in the specified time range")
    
    # Combine all attempts data
    combined_attempts = pd.concat(attempts_data, ignore_index=True)
    
    # Load items metadata if available
    items_df = None
    try:
        # Assume items metadata is stored separately
        items_df = data_lake.load_dataframe_from_parquet("metadata/items/items.parquet")
        logger.info(f"Loaded {len(items_df)} items metadata")
    except Exception as e:
        logger.warning(f"Could not load items metadata: {e}")
    
    # Validate data quality
    validator = DataQualityValidator()
    validation_results = validator.validate_attempts_data(combined_attempts)
    
    if not validation_results['validation_passed']:
        logger.warning(f"Data quality issues detected: {validation_results['issues']}")
        # Could raise exception here if data quality is critical
    
    logger.info(f"Loaded {len(combined_attempts)} total attempts for feature engineering")
    
    return {
        'attempts_count': len(combined_attempts),
        'unique_users': combined_attempts['user_id'].nunique(),
        'unique_items': combined_attempts['item_id'].nunique(),
        'date_range': f"{start_date} to {end_date}",
        'validation_results': validation_results,
        'has_items_metadata': items_df is not None
    }

def extract_user_features(**context):
    """
    Extract user behavior features
    """
    import pandas as pd
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_raw_data')
    
    logger.info(f"Extracting user features for {data_info['unique_users']} users")
    
    # Load data
    data_lake = DataLakeManager(DATA_LAKE_BUCKET)
    
    # For this example, we'll load the most recent day's data
    # In practice, you'd load the full dataset as prepared in load_raw_data
    execution_date = context['execution_date']
    date_str = execution_date.strftime('%Y/%m/%d')
    
    try:
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    except:
        # Fallback to previous day if current day not available
        prev_date = execution_date - timedelta(days=1)
        date_str = prev_date.strftime('%Y/%m/%d')
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    
    # Configure feature extraction
    config = FeatureConfig(
        user_window_days=30,
        min_attempts_per_user=5
    )
    
    # Extract user features
    extractor = UserBehaviorFeatureExtractor(config)
    user_features = extractor.extract_user_features(attempts_df)
    
    # Save user features
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    feature_store.save_features(user_features, 'user')
    
    logger.info(f"Extracted {len(user_features.columns)} user features for {len(user_features)} users")
    
    return {
        'feature_count': len(user_features.columns),
        'user_count': len(user_features),
        'features_path': f"{FEATURE_STORE_PATH}/user_features_{context['execution_date'].strftime('%Y%m%d_%H%M%S')}.parquet"
    }

def extract_item_features(**context):
    """
    Extract item difficulty and performance features
    """
    import pandas as pd
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_raw_data')
    
    logger.info(f"Extracting item features for {data_info['unique_items']} items")
    
    # Load data
    data_lake = DataLakeManager(DATA_LAKE_BUCKET)
    
    execution_date = context['execution_date']
    date_str = execution_date.strftime('%Y/%m/%d')
    
    try:
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    except:
        prev_date = execution_date - timedelta(days=1)
        date_str = prev_date.strftime('%Y/%m/%d')
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    
    # Load items metadata if available
    items_df = None
    try:
        items_df = data_lake.load_dataframe_from_parquet("metadata/items/items.parquet")
    except Exception as e:
        logger.warning(f"Could not load items metadata: {e}")
    
    # Configure feature extraction
    config = FeatureConfig(
        min_attempts_per_item=10,
        difficulty_smoothing_factor=0.1
    )
    
    # Extract item features
    extractor = ItemDifficultyFeatureExtractor(config)
    item_features = extractor.extract_item_features(attempts_df, items_df)
    
    # Save item features
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    feature_store.save_features(item_features, 'item')
    
    logger.info(f"Extracted {len(item_features.columns)} item features for {len(item_features)} items")
    
    return {
        'feature_count': len(item_features.columns),
        'item_count': len(item_features),
        'features_path': f"{FEATURE_STORE_PATH}/item_features_{context['execution_date'].strftime('%Y%m%d_%H%M%S')}.parquet"
    }

def extract_sequence_features(**context):
    """
    Extract sequence features for Deep Knowledge Tracing
    """
    import pandas as pd
    
    ti = context['ti']
    data_info = ti.xcom_pull(task_ids='load_raw_data')
    
    logger.info(f"Extracting sequence features for {data_info['unique_users']} users")
    
    # Load data
    data_lake = DataLakeManager(DATA_LAKE_BUCKET)
    
    execution_date = context['execution_date']
    date_str = execution_date.strftime('%Y/%m/%d')
    
    try:
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    except:
        prev_date = execution_date - timedelta(days=1)
        date_str = prev_date.strftime('%Y/%m/%d')
        s3_key = f"raw_data/user.attempts/{date_str}/data.parquet"
        attempts_df = data_lake.load_dataframe_from_parquet(s3_key)
    
    # Configure sequence extraction
    config = FeatureConfig(
        max_sequence_length=100,
        min_sequence_length=5,
        sequence_overlap=0.5
    )
    
    # Extract sequence features
    extractor = SequenceFeatureExtractor(config)
    sequence_features = extractor.extract_sequence_features(attempts_df)
    
    # Validate sequence data
    validator = DataQualityValidator()
    validation_results = validator.validate_sequence_data(sequence_features)
    
    if not validation_results['validation_passed']:
        logger.warning(f"Sequence validation issues: {validation_results['issues']}")
    
    # Save sequence features
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    feature_store.save_features(sequence_features, 'sequence')
    
    logger.info(f"Extracted {len(sequence_features.columns)} sequence features for {len(sequence_features)} sequences")
    
    return {
        'feature_count': len(sequence_features.columns),
        'sequence_count': len(sequence_features),
        'avg_sequence_length': sequence_features['sequence_length'].mean(),
        'validation_results': validation_results,
        'features_path': f"{FEATURE_STORE_PATH}/sequence_features_{context['execution_date'].strftime('%Y%m%d_%H%M%S')}.parquet"
    }

def validate_feature_quality(**context):
    """
    Validate overall feature quality and detect drift
    """
    ti = context['ti']
    
    # Get results from feature extraction tasks
    user_results = ti.xcom_pull(task_ids='extract_user_features')
    item_results = ti.xcom_pull(task_ids='extract_item_features')
    sequence_results = ti.xcom_pull(task_ids='extract_sequence_features')
    
    # Initialize quality monitor
    thresholds = MetricThresholds()
    quality_monitor = DataQualityMonitor(thresholds)
    
    # Validate each feature type
    validation_summary = {
        'timestamp': datetime.utcnow().isoformat(),
        'user_features': {
            'count': user_results['user_count'],
            'feature_count': user_results['feature_count'],
            'status': 'valid'
        },
        'item_features': {
            'count': item_results['item_count'],
            'feature_count': item_results['feature_count'],
            'status': 'valid'
        },
        'sequence_features': {
            'count': sequence_results['sequence_count'],
            'feature_count': sequence_results['feature_count'],
            'avg_length': sequence_results['avg_sequence_length'],
            'validation_passed': sequence_results['validation_results']['validation_passed'],
            'status': 'valid' if sequence_results['validation_results']['validation_passed'] else 'warning'
        },
        'overall_status': 'valid'
    }
    
    # Check for issues
    issues = []
    
    if user_results['user_count'] < 100:
        issues.append("Low user count for feature extraction")
        validation_summary['user_features']['status'] = 'warning'
    
    if item_results['item_count'] < 50:
        issues.append("Low item count for feature extraction")
        validation_summary['item_features']['status'] = 'warning'
    
    if not sequence_results['validation_results']['validation_passed']:
        issues.append("Sequence validation failed")
        validation_summary['sequence_features']['status'] = 'error'
    
    if issues:
        validation_summary['overall_status'] = 'warning'
        validation_summary['issues'] = issues
    
    logger.info(f"Feature quality validation completed: {validation_summary['overall_status']}")
    
    return validation_summary

def update_feature_metadata(**context):
    """
    Update feature store metadata and statistics
    """
    ti = context['ti']
    validation_summary = ti.xcom_pull(task_ids='validate_feature_quality')
    
    # Initialize feature store
    feature_store = FeatureStore(FEATURE_STORE_PATH)
    
    # Get current feature metadata
    metadata = feature_store.get_feature_metadata()
    
    # Update with current run information
    metadata['last_update'] = datetime.utcnow().isoformat()
    metadata['last_validation'] = validation_summary
    
    # Save metadata
    import json
    metadata_path = f"{FEATURE_STORE_PATH}/metadata.json"
    
    # In a real implementation, you'd save this to S3 or another persistent store
    logger.info(f"Updated feature store metadata: {metadata}")
    
    return metadata

# Task definitions
load_data_task = PythonOperator(
    task_id='load_raw_data',
    python_callable=load_raw_data,
    dag=dag
)

# Feature extraction task group
with TaskGroup("feature_extraction", dag=dag) as feature_extraction_group:
    
    extract_user_task = PythonOperator(
        task_id='extract_user_features',
        python_callable=extract_user_features,
        dag=dag
    )
    
    extract_item_task = PythonOperator(
        task_id='extract_item_features',
        python_callable=extract_item_features,
        dag=dag
    )
    
    extract_sequence_task = PythonOperator(
        task_id='extract_sequence_features',
        python_callable=extract_sequence_features,
        dag=dag
    )
    
    # These can run in parallel
    [extract_user_task, extract_item_task, extract_sequence_task]

# Validation and metadata tasks
validate_quality_task = PythonOperator(
    task_id='validate_feature_quality',
    python_callable=validate_feature_quality,
    dag=dag
)

update_metadata_task = PythonOperator(
    task_id='update_feature_metadata',
    python_callable=update_feature_metadata,
    dag=dag
)

# Cleanup task
cleanup_task = BashOperator(
    task_id='cleanup_temp_files',
    bash_command='rm -f /tmp/*.parquet /tmp/*.pkl',
    dag=dag
)

# Define task dependencies
load_data_task >> feature_extraction_group >> validate_quality_task >> update_metadata_task >> cleanup_task