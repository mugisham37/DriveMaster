#!/usr/bin/env python3
"""
Airflow Setup Script for ML Training Pipeline

This script initializes the Airflow environment with necessary variables,
connections, and configurations for the ML training pipeline.

Usage:
    python setup_airflow.py
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any

from airflow import settings
from airflow.models import Variable, Connection
from airflow.utils.db import create_default_connections

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_json_config(filepath: str) -> Dict[str, Any]:
    """Load JSON configuration file"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {filepath}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON file {filepath}: {e}")
        return {}


def setup_airflow_variables():
    """Setup Airflow variables from configuration"""
    logger.info("Setting up Airflow variables...")
    
    config_path = Path(__file__).parent / "config" / "airflow_variables.json"
    variables_config = load_json_config(config_path)
    
    if not variables_config:
        logger.warning("No variables configuration found")
        return
    
    # Set individual variables
    for key, value in variables_config.items():
        try:
            if isinstance(value, (dict, list)):
                # Store complex objects as JSON strings
                Variable.set(key, json.dumps(value))
            else:
                Variable.set(key, value)
            logger.info(f"Set variable: {key}")
        except Exception as e:
            logger.error(f"Error setting variable {key}: {e}")
    
    logger.info("Airflow variables setup completed")


def setup_airflow_connections():
    """Setup Airflow connections from configuration"""
    logger.info("Setting up Airflow connections...")
    
    config_path = Path(__file__).parent / "config" / "connections.json"
    connections_config = load_json_config(config_path)
    
    if not connections_config or 'connections' not in connections_config:
        logger.warning("No connections configuration found")
        return
    
    session = settings.Session()
    
    try:
        for conn_config in connections_config['connections']:
            conn_id = conn_config['conn_id']
            
            # Check if connection already exists
            existing_conn = session.query(Connection).filter(
                Connection.conn_id == conn_id
            ).first()
            
            if existing_conn:
                logger.info(f"Connection {conn_id} already exists, updating...")
                session.delete(existing_conn)
            
            # Create new connection
            new_conn = Connection(
                conn_id=conn_config['conn_id'],
                conn_type=conn_config['conn_type'],
                host=conn_config.get('host'),
                port=conn_config.get('port'),
                schema=conn_config.get('schema'),
                login=conn_config.get('login'),
                password=conn_config.get('password'),
                extra=json.dumps(conn_config.get('extra', {})) if conn_config.get('extra') else None,
                description=conn_config.get('description', '')
            )
            
            session.add(new_conn)
            logger.info(f"Added connection: {conn_id}")
        
        session.commit()
        logger.info("Airflow connections setup completed")
        
    except Exception as e:
        logger.error(f"Error setting up connections: {e}")
        session.rollback()
    finally:
        session.close()


def create_ml_experiment():
    """Create MLflow experiment for ML training"""
    logger.info("Setting up MLflow experiment...")
    
    try:
        import mlflow
        
        # Get MLflow tracking URI from variables
        tracking_uri = Variable.get("mlflow_tracking_uri", "http://mlflow:5000")
        experiment_name = Variable.get("mlflow_experiment", "dkt_production_training")
        
        mlflow.set_tracking_uri(tracking_uri)
        
        # Create experiment if it doesn't exist
        try:
            experiment = mlflow.get_experiment_by_name(experiment_name)
            if experiment is None:
                experiment_id = mlflow.create_experiment(
                    name=experiment_name,
                    tags={
                        "purpose": "production_training",
                        "model_type": "deep_knowledge_tracing",
                        "created_by": "airflow_setup"
                    }
                )
                logger.info(f"Created MLflow experiment: {experiment_name} (ID: {experiment_id})")
            else:
                logger.info(f"MLflow experiment already exists: {experiment_name}")
                
        except Exception as e:
            logger.warning(f"Could not create MLflow experiment: {e}")
            
    except ImportError:
        logger.warning("MLflow not available, skipping experiment creation")


def setup_directories():
    """Create necessary directories for the ML pipeline"""
    logger.info("Setting up directories...")
    
    directories = [
        "/opt/airflow/logs/ml_pipeline",
        "/opt/airflow/plugins/ml_utils",
        "/tmp/ml_training",
        "/tmp/model_artifacts"
    ]
    
    for directory in directories:
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {directory}")
        except Exception as e:
            logger.error(f"Error creating directory {directory}: {e}")


def validate_setup():
    """Validate that the setup was successful"""
    logger.info("Validating setup...")
    
    # Check variables
    required_variables = [
        "kafka_bootstrap_servers",
        "data_lake_bucket",
        "mlflow_tracking_uri"
    ]
    
    missing_variables = []
    for var_name in required_variables:
        try:
            Variable.get(var_name)
        except Exception:
            missing_variables.append(var_name)
    
    if missing_variables:
        logger.error(f"Missing required variables: {missing_variables}")
        return False
    
    # Check connections
    session = settings.Session()
    required_connections = ["postgres_ml", "aws_s3", "mlflow_tracking"]
    
    missing_connections = []
    for conn_id in required_connections:
        conn = session.query(Connection).filter(
            Connection.conn_id == conn_id
        ).first()
        if not conn:
            missing_connections.append(conn_id)
    
    session.close()
    
    if missing_connections:
        logger.error(f"Missing required connections: {missing_connections}")
        return False
    
    logger.info("Setup validation completed successfully")
    return True


def main():
    """Main setup function"""
    logger.info("Starting Airflow ML Pipeline setup...")
    
    try:
        # Setup components
        setup_directories()
        setup_airflow_variables()
        setup_airflow_connections()
        create_ml_experiment()
        
        # Validate setup
        if validate_setup():
            logger.info("Airflow ML Pipeline setup completed successfully!")
        else:
            logger.error("Setup validation failed. Please check the logs.")
            return 1
            
    except Exception as e:
        logger.error(f"Setup failed with error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())