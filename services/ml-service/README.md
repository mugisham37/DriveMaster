# ML Inference Service

A production-ready machine learning inference service for the Adaptive Learning Platform, featuring Deep Knowledge Tracing (DKT) models, batch processing, A/B testing, and comprehensive explainability features.

## Features

### Core ML Capabilities

- **Deep Knowledge Tracing (DKT)** models with LSTM/Transformer architectures
- **Real-time inference** with sub-300ms response times
- **Batch prediction processing** with request queuing and prioritization
- **Model versioning and registry** integration with MLflow
- **Automatic model loading and switching**

### Production Features

- **A/B Testing Framework** for model deployment and experimentation
- **Fallback mechanisms** for model failures and high availability
- **Redis caching** for prediction results with intelligent invalidation
- **Comprehensive monitoring** with Prometheus metrics
- **Structured logging** with correlation IDs

### Explainability & Fairness

- **SHAP-based explanations** for individual predictions
- **Bias detection** across multiple fairness metrics
- **Personalized insights** generation for users
- **Model behavior analysis** and pattern detection

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   Model Manager  │    │   MLflow        │
│   REST API      │◄──►│   & Registry     │◄──►│   Registry      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Batch         │    │   Inference      │    │   Redis         │
│   Processor     │◄──►│   Service        │◄──►│   Cache         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   A/B Testing   │    │   Explanation    │    │   Monitoring    │
│   Manager       │    │   Service        │    │   & Metrics     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Redis server
- PostgreSQL (for training data)
- MLflow tracking server (optional)

### Installation

1. **Install dependencies:**

```bash
cd services/ml-service
pip install -r requirements.txt
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the service:**

```bash
python main.py
```

The service will be available at `http://localhost:8000`

### API Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## API Endpoints

### Core Inference

- `POST /api/v1/predict` - Single prediction
- `POST /api/v1/predict/batch` - Batch predictions
- `POST /api/v1/explain` - Prediction explanation

### Batch Processing

- `POST /api/v1/batch/submit` - Submit batch job
- `GET /api/v1/batch/{job_id}/status` - Get job status
- `GET /api/v1/batch/{job_id}/results` - Get job results

### Model Management

- `GET /api/v1/models` - List loaded models
- `POST /api/v1/models/{name}/load` - Load model version
- `POST /api/v1/models/{name}/activate` - Set active model

### A/B Testing

- `GET /api/v1/experiments` - List experiments
- `GET /api/v1/experiments/{id}/results` - Get experiment results
- `POST /api/v1/experiments/{id}/start` - Start experiment

### Explainability

- `GET /api/v1/insights/{user_id}` - Get user insights
- `POST /api/v1/bias/detect` - Detect model bias
- `GET /api/v1/model/{version}/behavior` - Model behavior analysis

### Monitoring

- `GET /api/v1/health` - Health check
- `GET /api/v1/metrics` - Prometheus metrics
- `GET /api/v1/stats` - Service statistics

## Training Models

### Generate Synthetic Data

```bash
python -c "
from app.training.dataset import generate_synthetic_data
df = generate_synthetic_data(num_users=1000, output_path='synthetic_data.csv')
print(f'Generated {len(df)} records')
"
```

### Train DKT Model

```bash
python train_model.py \
    --use-synthetic \
    --epochs 50 \
    --batch-size 32 \
    --learning-rate 0.001 \
    --output-dir ./trained_models
```

### Evaluate Model

```bash
python evaluate_model.py \
    --model-path ./trained_models/best_model.pt \
    --use-synthetic \
    --output-dir ./evaluation_results
```

## Configuration

### Environment Variables

```bash
# Server
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=adaptive-learning-dkt

# Model Configuration
DEFAULT_MODEL_VERSION=latest
BATCH_SIZE=32
MAX_SEQUENCE_LENGTH=100

# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_DB=2
PREDICTION_CACHE_TTL=900

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/adaptive_learning

# Performance
MAX_WORKERS=4
REQUEST_TIMEOUT=30
BATCH_TIMEOUT=5.0
```

### Model Configuration

Models are configured through MLflow registry. The service automatically loads models with the following naming convention:

- **Model Name:** `dkt_model`
- **Stages:** `Production`, `Staging`
- **Versions:** Semantic versioning (e.g., `1.0.0`, `1.1.0`)

## Deployment

### Docker

```bash
# Build image
docker build -t ml-inference-service .

# Run container
docker run -p 8000:8000 \
    -e REDIS_URL=redis://redis:6379 \
    -e DATABASE_URL=postgresql://user:pass@db:5432/adaptive_learning \
    ml-inference-service
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference-service
  template:
    metadata:
      labels:
        app: ml-inference-service
    spec:
      containers:
        - name: ml-service
          image: ml-inference-service:latest
          ports:
            - containerPort: 8000
          env:
            - name: REDIS_URL
              value: "redis://redis-service:6379"
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
```

## Monitoring & Observability

### Metrics

The service exposes Prometheus metrics at `/api/v1/metrics`:

- `ml_prediction_requests_total` - Total prediction requests
- `ml_prediction_duration_seconds` - Prediction latency
- `ml_model_load_duration_seconds` - Model loading time
- `ml_cache_operations_total` - Cache hit/miss rates
- `ml_active_models` - Number of loaded models
- `ml_memory_usage_bytes` - Memory usage
- `ml_errors_total` - Error counts by type

### Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "logger": "ml_service.inference",
  "message": "prediction_completed",
  "user_id": "user_123",
  "model_version": "1.2.0",
  "inference_time_ms": 45.2,
  "trace_id": "abc123"
}
```

### Health Checks

- **Liveness:** `/api/v1/health`
- **Readiness:** Model loaded and cache connected
- **Dependencies:** Redis, MLflow, Database

## A/B Testing

### Creating Experiments

```python
from app.serving.ab_testing import ab_testing_manager

# Create experiment
experiment = ab_testing_manager.create_experiment(
    experiment_id="dkt_v2_test",
    name="DKT v2.0 Performance Test",
    description="Compare DKT v1.5 vs v2.0",
    variants=[
        {
            "name": "control",
            "model_version": "1.5.0",
            "traffic_percentage": 50.0,
            "inference_function": model_v1_inference,
            "is_control": True
        },
        {
            "name": "treatment",
            "model_version": "2.0.0",
            "traffic_percentage": 50.0,
            "inference_function": model_v2_inference,
            "is_control": False
        }
    ]
)

# Start experiment
ab_testing_manager.start_experiment("dkt_v2_test")
```

### Monitoring Results

```bash
curl http://localhost:8000/api/v1/experiments/dkt_v2_test/results
```

## Explainability Features

### SHAP Explanations

Generate feature importance for individual predictions:

```python
explanation = await explanation_service.explain_prediction(
    ExplanationRequest(
        user_id="user_123",
        item_id="item_456",
        attempt_history=user_attempts,
        explanation_type="shap"
    )
)
```

### Bias Detection

Detect fairness issues across demographic groups:

```python
bias_report = await explanation_service.detect_model_bias(
    predictions=[0.8, 0.6, 0.9, 0.4],
    targets=[1, 0, 1, 0],
    protected_attributes={
        "age_group": ["young", "young", "old", "old"],
        "gender": ["M", "F", "M", "F"]
    },
    metrics=["demographic_parity", "equalized_odds"]
)
```

### User Insights

Generate personalized learning insights:

```python
insights = await explanation_service.generate_user_insights(
    user_id="user_123",
    attempt_history=user_attempts,
    topic_mastery={"algebra": 0.85, "geometry": 0.62},
    item_metadata=item_info
)
```

## Performance Optimization

### Caching Strategy

- **Prediction Cache:** 15-minute TTL for identical requests
- **Model Cache:** Keep 2-3 model versions in memory
- **Insights Cache:** 1-hour TTL for user insights
- **Cache Warming:** Proactive loading of popular predictions

### Batch Processing

- **Queue Prioritization:** High/Normal/Low priority queues
- **Dynamic Batching:** Combine similar requests
- **Parallel Processing:** Configurable worker pool
- **Backpressure Handling:** Circuit breakers and timeouts

### Memory Management

- **Model Rotation:** Automatic unloading of unused models
- **GPU Memory:** Efficient CUDA memory management
- **Garbage Collection:** Periodic cleanup of caches

## Troubleshooting

### Common Issues

**Model Loading Failures:**

```bash
# Check MLflow connectivity
curl http://localhost:5000/api/2.0/mlflow/experiments/list

# Verify model registry
python -c "import mlflow; print(mlflow.list_registered_models())"
```

**Cache Connection Issues:**

```bash
# Test Redis connectivity
redis-cli -h localhost -p 6379 ping

# Check cache stats
curl http://localhost:8000/api/v1/stats | jq '.cache'
```

**Performance Issues:**

```bash
# Monitor metrics
curl http://localhost:8000/api/v1/metrics | grep ml_prediction_duration

# Check memory usage
curl http://localhost:8000/api/v1/stats | jq '.memory'
```

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
python main.py
```

## Contributing

### Development Setup

```bash
# Install development dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio black flake8 mypy

# Run tests
pytest tests/

# Format code
black app/
flake8 app/

# Type checking
mypy app/
```

### Adding New Models

1. Implement model class inheriting from `torch.nn.Module`
2. Add model factory function
3. Register with MLflow
4. Update inference service
5. Add tests and documentation

### Adding Explainability Methods

1. Implement explanation method in `ExplanationService`
2. Add API endpoint
3. Update schemas if needed
4. Add tests and examples

## License

This project is part of the Adaptive Learning Platform and follows the same licensing terms.
