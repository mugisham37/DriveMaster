# Business Intelligence Reporting Service

Advanced business intelligence, analytics, and reporting service for the Adaptive Learning Platform. This service provides comprehensive data analysis, predictive insights, automated report generation, and strategic business recommendations.

## Features

### Core Analytics Capabilities

- **User Retention Analysis**: Comprehensive cohort analysis with retention curves and churn prediction
- **Learning Effectiveness Measurement**: Algorithm performance analysis and optimization recommendations
- **Content Performance Analysis**: Content gap identification and performance optimization
- **Revenue and Usage Analytics**: Financial metrics, subscription analysis, and usage patterns
- **Predictive Analytics**: ML-powered forecasting and user behavior prediction
- **Business Intelligence Reporting**: Executive dashboards and strategic insights

### Advanced Features

- **Automated Report Generation**: Scheduled reports with PDF, Excel, and CSV export
- **Real-time Analytics**: Live dashboards with WebSocket updates
- **Anomaly Detection**: Statistical and ML-based anomaly identification
- **Custom Analytics**: Flexible query builder and custom analysis tools
- **Predictive Modeling**: Churn prediction, demand forecasting, and trend analysis
- **Business Insights**: Actionable recommendations and strategic guidance

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI API   │    │  Analytics       │    │   Data Sources  │
│                 │    │  Engine          │    │                 │
│ • Report API    │◄──►│                  │◄──►│ • PostgreSQL    │
│ • Analytics API │    │ • Retention      │    │ • Data Lake     │
│ • Insights API  │    │ • Effectiveness  │    │ • Kafka Streams │
│ • Scheduling    │    │ • Content Gaps   │    │ • Redis Cache   │
└─────────────────┘    │ • Churn Predict  │    │ • ML Models     │
                       │ • Forecasting    │    └─────────────────┘
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │  Report          │
                       │  Generator       │
                       │                  │
                       │ • PDF Reports    │
                       │ • Visualizations │
                       │ • Email Delivery │
                       │ • Scheduling     │
                       └──────────────────┘
```

## Quick Start

### Using Docker Compose

```bash
# Start the BI reporting service
cd services/bi-reporting
docker-compose up -d

# Access the API documentation
open http://localhost:8001/docs

# Check service health
curl http://localhost:8001/health
```

### Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/adaptive_learning"
export REDIS_URL="redis://localhost:6379/2"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Start the service
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

### Report Generation

```http
POST /api/v1/reports/generate
GET  /api/v1/reports/{report_id}/status
GET  /api/v1/reports/{report_id}/download
GET  /api/v1/reports/types
GET  /api/v1/reports/history
POST /api/v1/reports/schedule
```

### Analytics APIs

```http
GET  /api/v1/analytics/retention
GET  /api/v1/analytics/learning-effectiveness
GET  /api/v1/analytics/content-performance
GET  /api/v1/analytics/churn-prediction
GET  /api/v1/analytics/predictive-insights
GET  /api/v1/analytics/revenue-analytics
GET  /api/v1/analytics/user-segments
POST /api/v1/analytics/custom-analysis
```

### Business Insights

```http
GET  /api/v1/insights/dashboard
GET  /api/v1/insights/anomalies
GET  /api/v1/insights/trends
GET  /api/v1/insights/recommendations
GET  /api/v1/insights/alerts
GET  /api/v1/insights/forecasts
GET  /api/v1/insights/cohort-insights
POST /api/v1/insights/custom-insight
```

## Report Types

### 1. User Retention Analysis

Comprehensive cohort analysis with retention curves, churn prediction, and user lifecycle insights.

**Parameters:**

- `start_date`: Analysis start date
- `end_date`: Analysis end date
- `cohort_period`: Grouping period (daily, weekly, monthly)

**Outputs:**

- Cohort retention heatmaps
- Retention curve analysis
- Churn risk assessment
- Lifetime value calculations
- Actionable retention strategies

### 2. Learning Effectiveness Analysis

Algorithm performance analysis and learning outcome optimization.

**Parameters:**

- `start_date`: Analysis start date
- `end_date`: Analysis end date

**Outputs:**

- Algorithm performance comparison (SM-2, BKT, IRT)
- Topic effectiveness analysis
- User progress tracking
- Content impact assessment
- Optimization recommendations

### 3. Content Performance Analysis

Content gap identification and performance optimization recommendations.

**Parameters:**

- `start_date`: Analysis start date
- `end_date`: Analysis end date

**Outputs:**

- Item performance metrics
- Topic coverage analysis
- Difficulty calibration assessment
- Content gap identification
- Content development priorities

### 4. Churn Prediction Analysis

ML-powered churn prediction with risk segmentation and retention strategies.

**Parameters:**

- `prediction_horizon_days`: Prediction timeframe (default: 30)

**Outputs:**

- Churn risk scores by user
- Risk segment analysis
- Feature importance analysis
- At-risk user identification
- Targeted retention strategies

### 5. Comprehensive Business Intelligence

Executive-level comprehensive analysis across all business areas.

**Parameters:**

- `start_date`: Analysis start date
- `end_date`: Analysis end date

**Outputs:**

- Executive dashboard metrics
- Cross-functional insights
- Strategic recommendations
- Performance benchmarks
- Business forecasts

## Configuration

### Environment Variables

```bash
# Application
APP_NAME="BI Reporting Service"
DEBUG=false
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/adaptive_learning
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379/2
REDIS_POOL_SIZE=10

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CONSUMER_GROUP=bi-reporting

# Data Lake
DATA_LAKE_PROVIDER=s3
DATA_LAKE_BUCKET=adaptive-learning-data-lake
DATA_LAKE_REGION=us-west-2

# Reports
REPORTS_DIR=reports
REPORT_RETENTION_DAYS=30
MAX_REPORT_SIZE_MB=100
```

## License

This project is licensed under the MIT License.
