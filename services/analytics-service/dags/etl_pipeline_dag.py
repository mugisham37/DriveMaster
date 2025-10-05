"""Main ETL pipeline DAG for analytics data processing."""

from datetime import datetime, timedelta
from typing import Dict, Any

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.dates import days_ago
from airflow.models import Variable
import pandas as pd

# Import custom plugins
import sys
import os
sys.path.append('/opt/airflow/plugins')

from kafka_extractor import KafkaExtractor
from data_transformer import DataTransformer
from data_quality import DataQualityValidator
from data_lake_writer import DataLakeWriter
from config.data_lake_config import (
    DEFAULT_DATA_LAKE_CONFIG,
    DEFAULT_KAFKA_CONFIG,
    DEFAULT_QUALITY_CONFIG
)

# DAG configuration
DEFAULT_ARGS = {
    'owner': 'analytics-team',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'catchup': False
}

# Create DAG
dag = DAG(
    'analytics_etl_pipeline',
    default_args=DEFAULT_ARGS,
    description='ETL pipeline for analytics data processing',
    schedule_interval=timedelta(hours=1),  # Run hourly
    max_active_runs=1,
    tags=['analytics', 'etl', 'kafka', 'data-lake']
)


def extract_kafka_data(**context) -> Dict[str, Any]:
    """Extract data from Kafka topics."""
    
    # Get execution date and time window
    execution_date = context['execution_date']
    start_time = execution_date
    end_time = execution_date + timedelta(hours=1)
    
    extraction_results = {}
    
    # Topics to process
    topics = ['user.attempts', 'user.sessions', 'ml.training_events']
    
    with KafkaExtractor(DEFAULT_KAFKA_CONFIG) as extractor:
        for topic in topics:
            try:
                results = extractor.extract_topic_data(topic, start_time, end_time)
                
                # Combine results from all partitions
                if results:
                    combined_df = pd.concat([r.data_frame for r in results], ignore_index=True)
                    
                    # Store in XCom for next task
                    extraction_results[topic] = {
                        'record_count': len(combined_df),
                        'partitions_processed': len(results),
                        'extraction_time': datetime.utcnow().isoformat()
                    }
                    
                    # Save DataFrame to temporary location for processing
                    temp_path = f"/tmp/{topic}_{execution_date.strftime('%Y%m%d_%H')}.parquet"
                    combined_df.to_parquet(temp_path, compression='snappy')
                    extraction_results[topic]['temp_path'] = temp_path
                    
                else:
                    extraction_results[topic] = {
                        'record_count': 0,
                        'partitions_processed': 0,
                        'extraction_time': datetime.utcnow().isoformat()
                    }
                    
            except Exception as e:
                print(f"Failed to extract data from topic {topic}: {str(e)}")
                extraction_results[topic] = {
                    'error': str(e),
                    'record_count': 0
                }
    
    return extraction_results


def transform_data(**context) -> Dict[str, Any]:
    """Transform extracted data."""
    
    # Get extraction results from previous task
    extraction_results = context['task_instance'].xcom_pull(task_ids='extract_kafka_data')
    
    transformer = DataTransformer()
    transformation_results = {}
    
    for topic, result in extraction_results.items():
        if result.get('record_count', 0) == 0 or 'temp_path' not in result:
            transformation_results[topic] = {'record_count': 0, 'skipped': True}
            continue
        
        try:
            # Load data from temporary file
            df = pd.read_parquet(result['temp_path'])
            
            # Transform data
            transformed_df = transformer.transform_topic_data(topic, df)
            
            # Create daily aggregations
            daily_agg_df = transformer.create_daily_aggregations(transformed_df, topic)
            
            # Save transformed data
            execution_date = context['execution_date']
            transformed_path = f"/tmp/{topic}_transformed_{execution_date.strftime('%Y%m%d_%H')}.parquet"
            transformed_df.to_parquet(transformed_path, compression='snappy')
            
            # Save aggregated data
            if not daily_agg_df.empty:
                agg_path = f"/tmp/{topic}_daily_agg_{execution_date.strftime('%Y%m%d_%H')}.parquet"
                daily_agg_df.to_parquet(agg_path, compression='snappy')
            else:
                agg_path = None
            
            transformation_results[topic] = {
                'record_count': len(transformed_df),
                'aggregated_record_count': len(daily_agg_df) if not daily_agg_df.empty else 0,
                'transformed_path': transformed_path,
                'aggregated_path': agg_path,
                'transformation_time': datetime.utcnow().isoformat()
            }
            
            # Clean up original temp file
            os.remove(result['temp_path'])
            
        except Exception as e:
            print(f"Failed to transform data for topic {topic}: {str(e)}")
            transformation_results[topic] = {
                'error': str(e),
                'record_count': 0
            }
    
    return transformation_results


def validate_data_quality(**context) -> Dict[str, Any]:
    """Validate data quality."""
    
    # Get transformation results from previous task
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_data')
    
    validator = DataQualityValidator(DEFAULT_QUALITY_CONFIG.dict())
    validation_results = {}
    
    for topic, result in transformation_results.items():
        if result.get('record_count', 0) == 0 or 'transformed_path' not in result:
            validation_results[topic] = {'skipped': True}
            continue
        
        try:
            # Load transformed data
            df = pd.read_parquet(result['transformed_path'])
            
            # Run validation
            quality_report = validator.validate_dataset(df, topic)
            
            # Generate quality metrics
            quality_metrics = validator.generate_quality_metrics(df)
            
            validation_results[topic] = {
                'overall_score': quality_report.overall_score,
                'passed_checks': quality_report.passed_checks,
                'failed_checks': quality_report.failed_checks,
                'has_critical_issues': quality_report.has_critical_issues,
                'has_errors': quality_report.has_errors,
                'quality_metrics': quality_metrics,
                'validation_time': datetime.utcnow().isoformat()
            }
            
            # Fail task if critical issues found
            if quality_report.has_critical_issues:
                raise ValueError(f"Critical data quality issues found in {topic}")
            
        except Exception as e:
            print(f"Failed to validate data quality for topic {topic}: {str(e)}")
            validation_results[topic] = {
                'error': str(e),
                'validation_failed': True
            }
            # Re-raise if it's a critical validation failure
            if "Critical data quality issues" in str(e):
                raise
    
    return validation_results


def write_to_data_lake(**context) -> Dict[str, Any]:
    """Write processed data to data lake."""
    
    # Get transformation and validation results
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_data')
    validation_results = context['task_instance'].xcom_pull(task_ids='validate_data_quality')
    
    writer = DataLakeWriter(DEFAULT_DATA_LAKE_CONFIG)
    write_results = {}
    
    execution_date = context['execution_date']
    
    for topic, transform_result in transformation_results.items():
        if transform_result.get('record_count', 0) == 0 or 'transformed_path' not in transform_result:
            write_results[topic] = {'skipped': True}
            continue
        
        # Skip if validation failed
        validation_result = validation_results.get(topic, {})
        if validation_result.get('validation_failed', False):
            write_results[topic] = {'skipped': True, 'reason': 'validation_failed'}
            continue
        
        try:
            # Load and write transformed data
            df = pd.read_parquet(transform_result['transformed_path'])
            
            # Write raw processed data
            processed_path = writer.write_dataset(
                df, topic.replace('.', '_'), execution_date, 'processed'
            )
            
            # Write aggregated data if available
            aggregated_path = None
            if transform_result.get('aggregated_path'):
                agg_df = pd.read_parquet(transform_result['aggregated_path'])
                aggregated_path = writer.write_dataset(
                    agg_df, f"{topic.replace('.', '_')}_daily", execution_date, 'aggregated'
                )
            
            # Write metadata
            metadata = {
                'topic': topic,
                'execution_date': execution_date.isoformat(),
                'record_count': len(df),
                'validation_score': validation_result.get('overall_score', 0),
                'quality_metrics': validation_result.get('quality_metrics', {}),
                'processing_pipeline_version': '1.0.0'
            }
            
            metadata_path = writer.write_metadata(
                topic.replace('.', '_'), execution_date, metadata
            )
            
            write_results[topic] = {
                'processed_path': processed_path,
                'aggregated_path': aggregated_path,
                'metadata_path': metadata_path,
                'record_count': len(df),
                'write_time': datetime.utcnow().isoformat()
            }
            
            # Clean up temporary files
            os.remove(transform_result['transformed_path'])
            if transform_result.get('aggregated_path'):
                os.remove(transform_result['aggregated_path'])
            
        except Exception as e:
            print(f"Failed to write data to data lake for topic {topic}: {str(e)}")
            write_results[topic] = {
                'error': str(e),
                'write_failed': True
            }
    
    return write_results


def cleanup_old_data(**context) -> Dict[str, Any]:
    """Clean up old data based on retention policies."""
    
    writer = DataLakeWriter(DEFAULT_DATA_LAKE_CONFIG)
    cleanup_results = {}
    
    # Define retention policies per data type
    retention_policies = {
        'raw': DEFAULT_DATA_LAKE_CONFIG.raw_data_retention_days,
        'processed': DEFAULT_DATA_LAKE_CONFIG.processed_data_retention_days,
        'aggregated': DEFAULT_DATA_LAKE_CONFIG.aggregated_data_retention_days
    }
    
    topics = ['user_attempts', 'user_sessions', 'ml_training_events']
    
    for topic in topics:
        for data_type, retention_days in retention_policies.items():
            try:
                deleted_count = writer.cleanup_old_data(
                    f"{data_type}/{topic}", retention_days
                )
                
                cleanup_results[f"{topic}_{data_type}"] = {
                    'deleted_files': deleted_count,
                    'retention_days': retention_days,
                    'cleanup_time': datetime.utcnow().isoformat()
                }
                
            except Exception as e:
                print(f"Failed to cleanup {data_type}/{topic}: {str(e)}")
                cleanup_results[f"{topic}_{data_type}"] = {
                    'error': str(e),
                    'cleanup_failed': True
                }
    
    return cleanup_results


def send_pipeline_notification(**context) -> None:
    """Send notification about pipeline completion."""
    
    # Get results from all tasks
    extraction_results = context['task_instance'].xcom_pull(task_ids='extract_kafka_data')
    transformation_results = context['task_instance'].xcom_pull(task_ids='transform_data')
    validation_results = context['task_instance'].xcom_pull(task_ids='validate_data_quality')
    write_results = context['task_instance'].xcom_pull(task_ids='write_to_data_lake')
    cleanup_results = context['task_instance'].xcom_pull(task_ids='cleanup_old_data')
    
    # Calculate summary statistics
    total_records_processed = sum(
        result.get('record_count', 0) 
        for result in transformation_results.values()
    )
    
    topics_processed = len([
        topic for topic, result in write_results.items()
        if not result.get('skipped', False) and not result.get('write_failed', False)
    ])
    
    # Log pipeline summary
    print(f"ETL Pipeline completed successfully:")
    print(f"- Total records processed: {total_records_processed}")
    print(f"- Topics processed: {topics_processed}")
    print(f"- Execution date: {context['execution_date']}")
    
    # Here you would typically send notifications via email, Slack, etc.
    # For now, we'll just log the completion


# Define tasks
extract_task = PythonOperator(
    task_id='extract_kafka_data',
    python_callable=extract_kafka_data,
    dag=dag
)

transform_task = PythonOperator(
    task_id='transform_data',
    python_callable=transform_data,
    dag=dag
)

validate_task = PythonOperator(
    task_id='validate_data_quality',
    python_callable=validate_data_quality,
    dag=dag
)

write_task = PythonOperator(
    task_id='write_to_data_lake',
    python_callable=write_to_data_lake,
    dag=dag
)

cleanup_task = PythonOperator(
    task_id='cleanup_old_data',
    python_callable=cleanup_old_data,
    dag=dag
)

notify_task = PythonOperator(
    task_id='send_pipeline_notification',
    python_callable=send_pipeline_notification,
    dag=dag
)

# Define task dependencies
extract_task >> transform_task >> validate_task >> write_task >> cleanup_task >> notify_task