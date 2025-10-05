# Fraud Detection Service

A comprehensive fraud detection and anomaly prevention service for the adaptive learning platform. This service uses advanced machine learning algorithms, behavioral analysis, and real-time stream processing to identify and prevent fraudulent activities.

## Features

### Core Fraud Detection

- **Real-time Analysis**: Analyzes user attempts and sessions in real-time
- **Anomaly Detection**: Uses Isolation Forest and One-Class SVM for anomaly detection
- **Pattern Recognition**: Identifies suspicious behavioral patterns
- **Rate Limiting**: Detects rapid response patterns and bot-like behavior
- **Device Analysis**: Monitors device consistency and suspicious device usage

### Advanced Features

- **Behavioral Analysis**: Deep behavioral profiling and anomaly detection
- **Machine Learning**: Continuous learning with Random Forest classifier
- **Adaptive Thresholds**: Self-adjusting thresholds based on performance feedback
- **Network Analysis**: Detects collusion and coordinated behavior
- **Fraud Prevention**: Generates actionable recommendations

### Real-time Processing

- **Kafka Integration**: Consumes events from user.attempts and user.sessions topics
- **Stream Processing**: Real-time fraud detection on streaming data
- **Alert System**: Automated fraud alerts with admin review workflow

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Kafka Topics  │    │  Fraud Detector  │    │   Database      │
│                 │    │                  │    │                 │
│ user.attempts   │───▶│ • Anomaly Det.   │───▶│ • Fraud Alerts  │
│ user.sessions   │    │ • Behavioral     │    │ • User Scores   │
│                 │    │ • ML Prediction  │    │ • Behavior Prof.│
└─────────────────┘    │ • Network Anal.  │    └─────────────────┘
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Admin API      │
                       │                  │
                       │ • Review Alerts  │
                       │ • Update Models  │
                       │ • View Insights  │
                       └──────────────────┘
```

## API Endpoints

### Analysis Endpoints

- `POST /analyze/attempt` - Analyze individual attempt for fraud
- `POST /analyze/session` - Analyze session for fraud patterns
- `POST /analyze/network` - Analyze network patterns for collusion
- `POST /analyze/collusion` - Detect coordinated behavior

### User Management

- `GET /fraud-score/{user_id}` - Get current fraud score for user
- `GET /alerts` - Get fraud alerts for admin review
- `POST /alerts/{alert_id}/review` - Review and take action on alerts

### Admin Endpoints

- `POST /admin/update-thresholds` - Update adaptive thresholds
- `POST /admin/retrain-model` - Retrain ML model with new data
- `GET /admin/model-insights` - Get model performance insights

### Health Check

- `GET /health` - Service health status
- `GET /` - Service information

## Fraud Detection Algorithms

### 1. Statistical Anomaly Detection

- **Isolation Forest**: Detects anomalies in high-dimensional feature space
- **One-Class SVM**: Identifies outliers in user behavior patterns
- **Z-Score Analysis**: Statistical outlier detection for response times

### 2. Behavioral Analysis

- **Response Time Patterns**: Detects mechanical timing and bot behavior
- **Accuracy Patterns**: Identifies impossible accuracy improvements
- **Device Consistency**: Monitors device usage patterns
- **Session Patterns**: Analyzes session duration and frequency

### 3. Machine Learning

- **Random Forest**: Supervised learning for fraud classification
- **Feature Engineering**: Comprehensive feature extraction from user data
- **Continuous Learning**: Model updates with new labeled data
- **Feature Importance**: Identifies most predictive fraud indicators

### 4. Network Analysis

- **IP Sharing Detection**: Identifies suspicious IP address sharing
- **Collusion Detection**: Finds coordinated behavior across users
- **Device Fingerprinting**: Tracks device usage patterns
- **Geolocation Analysis**: Monitors location-based anomalies

## Fraud Flags

The system detects various types of fraudulent behavior:

- `RAPID_RESPONSES` - Unusually fast response times
- `IDENTICAL_PATTERNS` - Identical response patterns across attempts
- `MECHANICAL_TIMING` - Mechanical, consistent timing patterns
- `ACCURACY_SPIKE` - Sudden, impossible accuracy improvements
- `BOT_BEHAVIOR` - Automated, bot-like behavior patterns
- `SUSPICIOUS_DEVICE` - Suspicious device or user agent
- `UNUSUAL_SESSION_PATTERN` - Abnormal session patterns

## Risk Levels

- `LOW` (0.0-0.3) - Normal behavior, minimal risk
- `MEDIUM` (0.3-0.6) - Some suspicious indicators, monitor closely
- `HIGH` (0.6-0.8) - High fraud probability, require verification
- `CRITICAL` (0.8-1.0) - Very high fraud probability, immediate action required

## Configuration

Key configuration parameters in `.env`:

```env
# Detection Thresholds
ANOMALY_THRESHOLD=0.7
FRAUD_SCORE_THRESHOLD=0.8
MAX_ATTEMPTS_PER_MINUTE=30
MIN_TIME_BETWEEN_ATTEMPTS_MS=1000
MAX_ACCURACY_SPIKE=0.3

# ML Model Settings
ISOLATION_FOREST_CONTAMINATION=0.1
MIN_SAMPLES_FOR_TRAINING=1000

# Kafka Settings
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_ATTEMPTS=user.attempts
KAFKA_TOPIC_SESSIONS=user.sessions
```

## Database Schema

### Fraud Alerts

```sql
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    fraud_score FLOAT NOT NULL,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT
);
```

### User Fraud Scores

```sql
CREATE TABLE user_fraud_scores (
    user_id UUID PRIMARY KEY,
    score FLOAT NOT NULL DEFAULT 0.0,
    confidence FLOAT NOT NULL DEFAULT 0.0,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    active_flags JSONB DEFAULT '[]',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### User Behavior Profiles

```sql
CREATE TABLE user_behavior_profiles (
    user_id UUID PRIMARY KEY,
    avg_response_time FLOAT NOT NULL,
    response_time_std FLOAT NOT NULL,
    accuracy_rate FLOAT NOT NULL,
    session_frequency FLOAT NOT NULL,
    typical_session_duration FLOAT NOT NULL,
    common_devices JSONB DEFAULT '[]',
    common_times JSONB DEFAULT '[]',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    sample_size INTEGER DEFAULT 0
);
```

## Installation and Setup

1. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Service**

   ```bash
   python main.py
   ```

4. **Run Tests**
   ```bash
   pytest tests/
   ```

## Usage Examples

### Analyze an Attempt

```python
import httpx

response = httpx.post("http://localhost:8004/analyze/attempt", json={
    "user_id": "user123",
    "item_id": "item456",
    "session_id": "session789",
    "client_attempt_id": "attempt001",
    "selected": {"answer": "A"},
    "correct": True,
    "time_taken_ms": 3000,
    "device_type": "mobile"
})

result = response.json()
print(f"Fraud Score: {result['fraud_score']}")
print(f"Risk Level: {result['risk_level']}")
print(f"Flags: {result['flags']}")
```

### Get User Fraud Score

```python
response = httpx.get("http://localhost:8004/fraud-score/user123")
score_data = response.json()
print(f"Current fraud score: {score_data['fraud_score']}")
```

## Monitoring and Alerting

The service provides comprehensive monitoring:

- **Performance Metrics**: Tracks detection accuracy and response times
- **Alert Management**: Admin interface for reviewing and managing alerts
- **Model Insights**: Feature importance and model performance metrics
- **Adaptive Learning**: Automatic threshold adjustment based on feedback

## Security Considerations

- **Data Privacy**: All PII is handled securely and can be anonymized
- **Access Control**: Admin endpoints require proper authentication
- **Audit Logging**: All fraud detection events are logged for compliance
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all fraud detection logic is explainable and auditable

## License

This fraud detection service is part of the adaptive learning platform and follows the same licensing terms.
