# ML Training Pipeline with Apache Airflow

This directory contains a comprehensive Apache Airflow-based machine learning training pipeline for the Adaptive Learning Platform's Deep Knowledge Tracing (DKT) models.

## Overview

The ML training pipeline consists of three main DAGs that work together to provide end-to-end machine learning capabilities:

1. **Data Extraction Pipeline** (`ml_training_pipeline.py`) - Extracts and validates training data from Kafka and data lake
2. **Feature Engineering Pipeline** (`feature_engineering_pipeline.py`) - Processes raw data into ML-ready features
3. **Model Training & Evaluation Pipeline** (`model_training_evaluation.py`) - Trains, evaluates, and deploys DKT models

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Data Sources  │    │   Feature Store  │    │   Model Registry    │
│                 │    │                  │    │                     │
│ • Kafka Topics  │───▶│ • User Features  │───▶│ • Trained Models    │
│ • Data Lake     │    │ • Item Features  │    │ • Model Versions    │
│ • PostgreSQL    │    │ • Sequences      │    │ • Performance Metrics│
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Data Extraction │    │ Feature Engineer │    │ Model Training &    │
│ Pipeline        │    │ Pipeline         │    │ Evaluation Pipeline │
│                 │    │                  │    │                     │
│ • Extract Data  │    │ • User Behavior  │    │ • Hyperparameter    │
│ • Validate      │    │ • Item Difficulty│    │   Optimization      │
│ • Store Raw     │    │ • Sequences      │    │ • Cross Validation  │
└─────────────────┘    └──────────────────┘    │ • Model Training    │
                                                │ • Evaluation        │
                                                │ • Deployment        │
                                                └─────────────────────┘
```

## Components

### Core Utilities

#### `utils/data_extraction.py`

- **KafkaDataExtractor**: Extracts training data from Kafka topics with time-based filtering
- **DataLakeManager**: Manages data storage and retrieval from S3-based data lake
- **DataQualityValidator**: Validates data quality and completeness

#### `utils/feature_engineering.py`

- **UserBehaviorFeatureExtractor**: Extracts user behavior and learning pattern features
- **ItemDifficultyFeatureExtractor**: Extracts item difficulty and performance features
- **SequenceFeatureExtractor**: Creates sequence features for DKT training
- **FeatureStore**: Manages feature storage, versioning, and caching

#### `utils/model_training.py`

- **DKTModel**: PyTorch implementation of Deep Knowledge Tracing model
- **DKTTrainer**: Comprehensive training loop with early stopping and monitoring
- **HyperparameterOptimizer**: Optuna-based hyperparameter optimization
- **ModelEvaluator**: Model evaluation and cross-validation utilities

#### `utils/model_orchestration.py`

- **ModelTrainingOrchestrator**: High-level training workflow orchestration
- **ResourceManager**: Manages computational resources and optimization
- **ModelEvaluator**: Production model evaluation and comparison

#### `utils/monitoring.py`

- **SystemMonitor**: Monitors system resources and performance
- **TrainingMonitor**: Monitors ML training progress and issues
- **AlertManager**: Sends alerts through multiple channels
- **PipelineMonitor**: Overall pipeline health monitoring

### DAG Workflows

#### 1. Data Extraction Pipeline (`ml_training_pipeline.py`)

**Schedule**: Weekly
**Purpose**: Extract and validate training data

**Tasks**:

- `extract_kafka_data`: Extract data from Kafka topics (user.attempts, user.sessions, ml.training_events)
- `validate_data_quality`: Validate extracted data quality and completeness
- `engineer_features`: Basic feature engineering and preprocessing
- `train_dkt_model`: Train DKT model with hyperparameter optimization
- `evaluate_model`: Evaluate model performance and register to MLflow

#### 2. Feature Engineering Pipeline (`feature_engineering_pipeline.py`)

**Schedule**: Daily
**Purpose**: Process raw data into ML-ready features

**Tasks**:

- `load_raw_data`: Load raw data from data lake
- `extract_user_features`: Extract user behavior and learning pattern features
- `extract_item_features`: Extract item difficulty and performance features
- `extract_sequence_features`: Create sequence features for DKT training
- `validate_feature_quality`: Validate feature quality and detect drift
- `update_feature_metadata`: Update feature store metadata

#### 3. Model Training & Evaluation Pipeline (`model_training_evaluation.py`)

**Schedule**: Weekly
**Purpose**: Train, evaluate, and deploy production models

**Tasks**:

- `load_training_data`: Load features from feature store
- `optimize_hyperparameters`: Hyperparameter optimization using Optuna
- `perform_cross_validation`: K-fold cross-validation for model robustness
- `train_final_model`: Train final production model
- `evaluate_and_compare_models`: Compare with previous models
- `deploy_model`: Deploy model to production if criteria are met

## Setup and Configuration

### 1. Environment Setup

```bash
# Navigate to airflow directory
cd services/ml-service/airflow

# Install dependencies
pip install -r requirements.txt

# Set up Airflow database
airflow db init

# Create admin user
airflow users create \
    --username admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@company.com
```

### 2. Configuration

```bash
# Run setup script to configure variables and connections
python setup_airflow.py
```

### 3. Start Airflow Services

```bash
# Start with Docker Compose
docker-compose up -d

# Or start individual services
airflow webserver --port 8080 &
airflow scheduler &
```

## Configuration Files

### `config/airflow_variables.json`

Contains all Airflow variables including:

- Kafka and data lake configuration
- MLflow settings
- Training parameters
- Quality thresholds
- Resource limits

### `config/connections.json`

Defines Airflow connections for:

- PostgreSQL database
- AWS S3 data lake
- MLflow tracking server
- Kafka Connect
- Redis cache

### `config/airflow.cfg`

Main Airflow configuration file with:

- Executor settings
- Database connections
- Security configurations
- Performance tuning

## Monitoring and Alerting

### System Monitoring

- **CPU, Memory, GPU Usage**: Real-time resource monitoring
- **Training Progress**: Loss curves, accuracy metrics, convergence tracking
- **Data Quality**: Completeness, drift detection, validation results
- **Pipeline Health**: Task success rates, execution times, error tracking

### Alert Channels

- **Email**: Critical failures and quality issues
- **Slack**: Training completion and performance updates
- **Webhook**: Integration with external monitoring systems
- **Prometheus**: Metrics export for Grafana dashboards

### Key Metrics

- **Model Performance**: AUC, accuracy, F1-score, log loss
- **Training Efficiency**: Convergence speed, resource utilization
- **Data Quality**: Completeness, consistency, freshness
- **System Health**: Error rates, latency, throughput

## Model Lifecycle Management

### Training Workflow

1. **Data Extraction**: Pull latest data from production systems
2. **Feature Engineering**: Transform raw data into ML features
3. **Hyperparameter Optimization**: Find optimal model parameters
4. **Cross-Validation**: Validate model robustness
5. **Final Training**: Train production model with best parameters
6. **Evaluation**: Compare against previous models
7. **Deployment**: Automated deployment if quality criteria met

### Model Registry

- **Versioning**: Automatic model versioning with MLflow
- **Metadata**: Training parameters, performance metrics, data lineage
- **Staging**: Development → Staging → Production promotion workflow
- **Rollback**: Automatic rollback on performance degradation

### Quality Gates

- **Minimum Performance**: AUC > 0.75, Accuracy > 0.70
- **Improvement Threshold**: Must improve by >1% over previous model
- **Stability Check**: Cross-validation variance < 5%
- **Data Quality**: >95% completeness, <5% null values

## Troubleshooting

### Common Issues

#### 1. Data Extraction Failures

```bash
# Check Kafka connectivity
airflow tasks test ml_training_pipeline extract_kafka_data 2024-01-01

# Verify data lake access
aws s3 ls s3://adaptive-learning-data/
```

#### 2. Feature Engineering Issues

```bash
# Check feature store
python -c "from utils.feature_engineering import FeatureStore; fs = FeatureStore('s3://adaptive-learning-features'); print(fs.get_feature_metadata())"

# Validate feature quality
airflow tasks test feature_engineering_pipeline validate_feature_quality 2024-01-01
```

#### 3. Training Failures

```bash
# Check GPU availability
nvidia-smi

# Monitor training progress
mlflow ui --host 0.0.0.0 --port 5000

# Check resource usage
htop
```

#### 4. Deployment Issues

```bash
# Check MLflow model registry
mlflow models list

# Verify model serving
curl -X POST http://mlflow:5000/invocations -H 'Content-Type: application/json' -d '{"inputs": [[1, 2, 3]]}'
```

### Logs and Debugging

#### Airflow Logs

```bash
# View task logs
airflow tasks log ml_training_pipeline extract_kafka_data 2024-01-01

# Check scheduler logs
tail -f $AIRFLOW_HOME/logs/scheduler/latest/*.log
```

#### MLflow Tracking

```bash
# Access MLflow UI
http://localhost:5000

# Query experiments programmatically
python -c "import mlflow; print(mlflow.list_experiments())"
```

#### System Monitoring

```bash
# Check Prometheus metrics
curl http://localhost:9091/metrics

# View Grafana dashboards
http://localhost:3000
```

## Performance Optimization

### Resource Management

- **GPU Utilization**: Automatic batch size optimization based on available memory
- **CPU Scaling**: Dynamic worker allocation based on workload
- **Memory Management**: Efficient data loading and caching strategies
- **Storage Optimization**: Parquet format with compression for large datasets

### Training Optimization

- **Mixed Precision**: Automatic mixed precision training for faster convergence
- **Gradient Accumulation**: Handle large effective batch sizes on limited hardware
- **Learning Rate Scheduling**: Cosine annealing and warm restarts
- **Early Stopping**: Prevent overfitting and reduce training time

### Pipeline Efficiency

- **Parallel Processing**: Concurrent feature extraction and validation
- **Caching**: Intelligent caching of intermediate results
- **Incremental Updates**: Only process new/changed data
- **Resource Pooling**: Shared resources across pipeline stages

## Security Considerations

### Data Protection

- **Encryption**: All data encrypted at rest and in transit
- **Access Control**: Role-based access to sensitive data
- **Audit Logging**: Complete audit trail of data access and modifications
- **Data Masking**: PII protection in non-production environments

### Model Security

- **Model Signing**: Cryptographic signatures for model integrity
- **Access Control**: Restricted access to production models
- **Vulnerability Scanning**: Regular security scans of dependencies
- **Secure Deployment**: Isolated deployment environments

### Infrastructure Security

- **Network Isolation**: VPC and security groups for component isolation
- **Secrets Management**: HashiCorp Vault for credential management
- **Container Security**: Minimal base images and security scanning
- **Monitoring**: Security event monitoring and alerting

## Scaling and Production Deployment

### Horizontal Scaling

- **Multi-Node Airflow**: Celery executor with Redis/RabbitMQ
- **Distributed Training**: Multi-GPU and multi-node training support
- **Load Balancing**: Automatic load distribution across workers
- **Auto-Scaling**: Dynamic scaling based on workload

### High Availability

- **Database Replication**: PostgreSQL master-slave setup
- **Service Redundancy**: Multiple instances of critical services
- **Failover**: Automatic failover for critical components
- **Backup Strategy**: Regular backups of models and data

### Production Deployment

- **Kubernetes**: Container orchestration with Helm charts
- **CI/CD Integration**: GitOps workflow with ArgoCD
- **Environment Management**: Separate dev/staging/prod environments
- **Blue-Green Deployment**: Zero-downtime model deployments

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with comprehensive tests
3. Update documentation and configuration
4. Submit pull request with detailed description
5. Code review and automated testing
6. Merge after approval and testing

### Testing

```bash
# Run unit tests
python -m pytest tests/

# Test DAGs
python -m pytest tests/dags/

# Integration tests
python -m pytest tests/integration/

# Load testing
python -m pytest tests/load/
```

### Code Quality

- **Linting**: Black, flake8, mypy for code quality
- **Documentation**: Comprehensive docstrings and type hints
- **Testing**: >90% test coverage requirement
- **Security**: Bandit security scanning

## Support and Maintenance

### Regular Maintenance

- **Dependency Updates**: Monthly security and feature updates
- **Performance Tuning**: Quarterly performance optimization
- **Capacity Planning**: Regular resource usage analysis
- **Documentation Updates**: Keep documentation current with changes

### Support Channels

- **Internal Wiki**: Detailed troubleshooting guides
- **Slack Channel**: #ml-pipeline-support for real-time help
- **Issue Tracking**: JIRA for bug reports and feature requests
- **On-Call Support**: 24/7 support for production issues

### Monitoring and Alerting

- **SLA Monitoring**: Track pipeline SLA compliance
- **Performance Metrics**: Monitor training time and resource usage
- **Quality Metrics**: Track model performance over time
- **Business Metrics**: Monitor impact on learning outcomes
