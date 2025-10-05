# Analytics Service - ETL Pipeline

This service implements a comprehensive ETL (Extract, Transform, Load) pipeline for the Adaptive Learning Platform analytics data. It uses Apache Airflow to orchestrate data extraction from Kafka, transformation, quality validation, and loading into a data lake.

## Architecture Overview

```
Kafka Topics → Airflow ETL Pipeline → Data Lake (S3/GCS)
     ↓              ↓                      ↓
- user.attempts   Extract              Raw Data
- user.sessions   Transform            Processed Data
- ml.training     Validate             Aggregated Data
                  Load
                  Monitor
```

## Features

### Data Extraction

- **Kafka Integration**: Extracts data from multiple Kafka topics
- **Time-based Windowing**: Processes data in hourly windows
- **Partition Handling**: Efficiently processes data from all topic partitions
- **Idempotency**: Handles duplicate processing gracefully

### Data Transformation

- **Schema Normalization**: Standardizes data formats across topics
- **Feature Engineering**: Extracts ML features from algorithm states
- **Aggregation**: Creates daily summary statistics
- **Data Type Optimization**: Optimizes storage efficiency

### Data Quality Validation

- **Schema Compliance**: Validates required fields and data types
- **Business Rules**: Checks logical consistency (e.g., accuracy calculations)
- **Anomaly Detection**: Identifies statistical outliers
- **Quality Scoring**: Provides overall data quality metrics

### Data Lake Storage

- **Partitioned Storage**: Organizes data by year/month/day
- **Parquet Format**: Efficient columnar storage with compression
- **Metadata Management**: Stores processing metadata alongside data
- **Lifecycle Management**: Automated cleanup based on retention policies

## Directory Structure

```
services/analytics-service/
├── config/
│   └── data_lake_config.py      # Configuration classes
├── dags/
│   └── etl_pipeline_dag.py      # Main Airflow DAG
├── plugins/
│   ├── kafka_extractor.py       # Kafka data extraction
│   ├── data_transformer.py      # Data transformation logic
│   ├── data_quality.py          # Quality validation
│   └── data_lake_writer.py      # Data lake storage
├── scripts/
│   └── data_lake_manager.py     # Management utilities
├── Dockerfile                   # Container configuration
├── docker-compose.yml           # Service orchestration
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Configuration

### Environment Variables

```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka-1:9092,kafka-2:9092,kafka-3:9092

# Data Lake Configuration
DATA_LAKE_PROVIDER=s3  # or 'gcs'
DATA_LAKE_BUCKET=adaptive-learning-data-lake
AWS_DEFAULT_REGION=us-west-2

# Airflow Configuration
AIRFLOW__CORE__EXECUTOR=CeleryExecutor
AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres/airflow
```

### Data Lake Configuration

```python
# config/data_lake_config.py
DEFAULT_DATA_LAKE_CONFIG = DataLakeConfig(
    provider=StorageProvider.S3,
    bucket_name="adaptive-learning-data-lake",
    region="us-west-2",
    base_path="analytics",
    partition_columns=["year", "month", "day"],
    file_format="parquet",
    compression="snappy",
    raw_data_retention_days=90,
    processed_data_retention_days=365,
    aggregated_data_retention_days=1095
)
```

## Data Pipeline Flow

### 1. Extract Phase

- Connects to Kafka cluster
- Extracts data from configured topics within time window
- Handles multiple partitions in parallel
- Stores raw data temporarily for processing

### 2. Transform Phase

- Applies topic-specific transformations
- Extracts ML algorithm states (SM-2, BKT, IRT)
- Creates derived features (response time categories, time-based features)
- Generates daily aggregations

### 3. Validate Phase

- Runs comprehensive data quality checks
- Validates schema compliance
- Checks business logic rules
- Performs anomaly detection
- Generates quality reports

### 4. Load Phase

- Writes processed data to data lake in Parquet format
- Creates partitioned directory structure
- Stores metadata alongside data
- Implements proper compression and optimization

### 5. Cleanup Phase

- Removes expired data based on retention policies
- Manages storage costs
- Maintains data lake organization

## Data Schemas

### User Attempts (Transformed)

```python
{
    'user_id': str,
    'item_id': str,
    'session_id': str,
    'correct': bool,
    'time_taken_ms': int,
    'quality': int,  # 0-5 for SM-2
    'response_time_seconds': float,
    'response_time_category': str,  # very_fast, fast, normal, slow, very_slow
    'hour_of_day': int,
    'day_of_week': int,
    'is_weekend': bool,
    'sm2_easiness_factor_before': float,
    'sm2_interval_before': int,
    'bkt_prob_knowledge_before': float,
    'irt_ability_*_before': float,  # per topic
    'year': int,
    'month': int,
    'day': int
}
```

### User Sessions (Transformed)

```python
{
    'session_id': str,
    'user_id': str,
    'duration_minutes': float,
    'items_attempted': int,
    'correct_count': int,
    'accuracy': float,
    'items_per_minute': float,
    'topics_count': int,
    'session_type': str,  # practice, review, mock_test
    'start_hour': int,
    'year': int,
    'month': int,
    'day': int
}
```

### Daily Aggregations

```python
{
    'user_id': str,
    'year': int,
    'month': int,
    'day': int,
    'total_attempts': int,
    'correct_attempts': int,
    'accuracy': float,
    'avg_response_time_ms': float,
    'total_study_time_minutes': float,
    'unique_items_attempted': int,
    'total_sessions': int
}
```

## Deployment

### Using Docker Compose

```bash
# Start the analytics service
cd services/analytics-service
docker-compose up -d

# Access Airflow UI
open http://localhost:8080
# Username: admin, Password: admin

# Monitor Celery workers
open http://localhost:5555
```

### Manual Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Initialize Airflow database
airflow db init

# Create admin user
airflow users create \
    --username admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com

# Start services
airflow webserver --port 8080 &
airflow scheduler &
airflow celery worker &
```

## Monitoring and Management

### Data Lake Manager CLI

```bash
# Get storage summary
python scripts/data_lake_manager.py summary

# Clean up expired data (dry run)
python scripts/data_lake_manager.py cleanup --dry-run

# Validate data integrity
python scripts/data_lake_manager.py validate user_attempts --days 7

# Generate usage report
python scripts/data_lake_manager.py report --days 30
```

### Airflow Monitoring

- **Web UI**: http://localhost:8080 - DAG management and monitoring
- **Flower**: http://localhost:5555 - Celery worker monitoring
- **Logs**: Available in Airflow UI and `./logs/` directory

### Key Metrics to Monitor

1. **Pipeline Health**

   - DAG success rate
   - Task execution times
   - Data quality scores

2. **Data Volume**

   - Records processed per hour
   - Storage growth rate
   - Partition sizes

3. **Quality Metrics**
   - Validation failure rates
   - Anomaly detection alerts
   - Schema compliance

## Troubleshooting

### Common Issues

1. **Kafka Connection Failures**

   ```bash
   # Check Kafka connectivity
   docker exec -it analytics-service-airflow-worker-1 \
     kafka-console-consumer --bootstrap-server kafka-1:9092 --topic user.attempts --from-beginning --max-messages 1
   ```

2. **Data Lake Access Issues**

   ```bash
   # Verify AWS credentials
   aws s3 ls s3://adaptive-learning-data-lake/

   # Check GCS access
   gsutil ls gs://adaptive-learning-data-lake/
   ```

3. **Memory Issues**

   ```bash
   # Monitor memory usage
   docker stats

   # Adjust worker memory limits in docker-compose.yml
   ```

### Performance Tuning

1. **Kafka Consumer Optimization**

   - Adjust `max_poll_records` for batch size
   - Tune consumer group settings
   - Monitor consumer lag

2. **Airflow Optimization**

   - Scale Celery workers based on load
   - Adjust task concurrency limits
   - Optimize DAG scheduling intervals

3. **Storage Optimization**
   - Monitor Parquet file sizes
   - Adjust compression settings
   - Optimize partitioning strategy

## Data Quality Framework

### Validation Levels

1. **Critical**: Schema compliance, required fields
2. **Error**: Business logic violations, data consistency
3. **Warning**: High null percentages, duplicates
4. **Info**: Statistical anomalies, performance metrics

### Quality Metrics

- **Completeness**: Percentage of non-null values
- **Accuracy**: Business rule compliance
- **Consistency**: Cross-field validation
- **Timeliness**: Data freshness checks
- **Validity**: Format and range validation

## Security Considerations

1. **Data Encryption**

   - TLS for Kafka connections
   - Encryption at rest in data lake
   - Secure credential management

2. **Access Control**

   - IAM roles for cloud storage
   - Airflow RBAC configuration
   - Network security groups

3. **Data Privacy**
   - PII handling procedures
   - Data retention compliance
   - Audit logging

## Future Enhancements

1. **Real-time Processing**

   - Kafka Streams integration
   - Stream processing with Apache Flink

2. **Advanced Analytics**

   - Data lineage tracking
   - Automated data profiling
   - ML-based anomaly detection

3. **Cost Optimization**
   - Intelligent tiering strategies
   - Compression optimization
   - Query performance tuning
