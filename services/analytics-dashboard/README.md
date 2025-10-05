# Analytics Dashboard Service

Real-time analytics dashboard for the Adaptive Learning Platform. Provides comprehensive metrics, monitoring, and insights through a FastAPI backend and React frontend.

## Features

### Real-time Metrics

- **User Engagement**: Active users, session metrics, retention rates
- **Learning Progress**: Accuracy trends, mastery improvements, response times
- **Content Performance**: Item effectiveness, difficulty calibration, content gaps
- **System Performance**: API metrics, resource usage, alert monitoring

### Interactive Dashboard

- **Live Updates**: WebSocket-powered real-time data updates
- **Customizable Views**: Configurable dashboards and time ranges
- **Alert System**: Real-time notifications for system issues
- **Data Export**: Export metrics and reports for further analysis

### Advanced Analytics

- **User Behavior Insights**: Pattern recognition and recommendations
- **Content Gap Analysis**: Identify missing or underperforming content
- **Learning Effectiveness**: Algorithm performance and optimization suggestions
- **Cohort Analysis**: User retention and engagement tracking

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   FastAPI API    │    │   Data Sources  │
│                 │    │                  │    │                 │
│ • Dashboard     │◄──►│ • Metrics API    │◄──►│ • PostgreSQL    │
│ • Charts        │    │ • WebSocket      │    │ • Redis Cache   │
│ • Real-time     │    │ • Background     │    │ • Kafka Streams │
│   Updates       │    │   Tasks          │    │ • Monitoring    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### Using Docker Compose

```bash
# Start the analytics dashboard
cd services/analytics-dashboard
docker-compose up -d

# Access the dashboard
open http://localhost:3000

# Access the API
open http://localhost:8000/docs
```

### Manual Setup

```bash
# Backend setup
cd services/analytics-dashboard
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000

# Frontend setup (in another terminal)
cd dashboard-ui
npm install
npm start
```

## API Endpoints

### Analytics Endpoints

```http
GET /api/v1/analytics/engagement?hours=24
GET /api/v1/analytics/progress?hours=24
GET /api/v1/analytics/content?hours=24
GET /api/v1/analytics/system
GET /api/v1/analytics/snapshot
POST /api/v1/analytics/query
```

### User Analytics

```http
GET /api/v1/users/engagement/hourly?days=7
GET /api/v1/users/retention/cohort?weeks=12
GET /api/v1/users/segments
GET /api/v1/users/journey
GET /api/v1/users/behavior/patterns?days=30
```

### System Monitoring

```http
GET /api/v1/system/alerts
GET /api/v1/system/performance
GET /api/v1/system/websocket-stats
GET /api/v1/system/status
POST /api/v1/system/alerts/{alert_id}/resolve
```

### WebSocket Endpoints

```javascript
// Real-time metrics
const socket = io("ws://localhost:8000/ws/metrics");

// Real-time alerts
const alertSocket = io("ws://localhost:8000/ws/alerts");
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/adaptive_learning
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Redis
REDIS_URL=redis://localhost:6379/1
REDIS_POOL_SIZE=10

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CONSUMER_GROUP=analytics-dashboard

# Application
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=["http://localhost:3000"]

# Metrics
METRICS_UPDATE_INTERVAL=30
METRICS_RETENTION_HOURS=24

# Alert Thresholds
HIGH_ERROR_RATE_THRESHOLD=0.05
HIGH_RESPONSE_TIME_THRESHOLD=1000.0
LOW_ACCURACY_THRESHOLD=0.6
HIGH_MEMORY_USAGE_THRESHOLD=0.85
HIGH_CPU_USAGE_THRESHOLD=0.80
```

## Dashboard Components

### Main Dashboard

- **Overview Cards**: Key metrics at a glance
- **Real-time Charts**: Live updating visualizations
- **Alert Panel**: Current system alerts
- **Quick Actions**: Common administrative tasks

### User Analytics

- **Engagement Heatmap**: Activity by hour/day
- **Cohort Retention**: User retention analysis
- **User Segments**: Behavioral segmentation
- **Journey Analysis**: User flow and drop-off points

### Content Analytics

- **Performance Metrics**: Item accuracy and timing
- **Difficulty Analysis**: IRT calibration accuracy
- **Content Gaps**: Missing or underperforming content
- **Topic Distribution**: Content coverage by topic

### System Monitoring

- **Performance Metrics**: API response times, error rates
- **Resource Usage**: CPU, memory, disk utilization
- **Service Health**: Component status and connectivity
- **Alert Management**: Alert resolution and tracking

## Data Models

### Metrics Response Format

```typescript
interface UserEngagementMetrics {
  timestamp: string;
  active_users_1h: number;
  active_users_24h: number;
  new_users_24h: number;
  sessions_started_1h: number;
  avg_session_duration_minutes: number;
  bounce_rate: number;
  retention_rate_d1: number;
  retention_rate_d7: number;
  retention_rate_d30: number;
}

interface Alert {
  id: string;
  type:
    | "system_performance"
    | "data_quality"
    | "user_behavior"
    | "content_performance";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}
```

### WebSocket Message Format

```typescript
interface MetricsUpdate {
  timestamp: string;
  engagement: UserEngagementMetrics;
  progress: LearningProgressMetrics;
  content: ContentPerformanceMetrics;
  system: SystemPerformanceMetrics;
}

interface AlertMessage {
  timestamp: string;
  alerts: Alert[];
}
```

## Monitoring and Alerting

### Alert Types

1. **System Performance**

   - High API error rate (>5%)
   - Slow response times (>1s p95)
   - High resource usage (>85% memory/CPU)
   - Kafka consumer lag (>1000 messages)

2. **Data Quality**

   - Missing data partitions
   - High null value percentages
   - Schema validation failures
   - Duplicate data detection

3. **User Behavior**

   - Sudden engagement drops
   - Unusual accuracy patterns
   - High bounce rates
   - Retention anomalies

4. **Content Performance**
   - Items with very low accuracy
   - Content gaps in topics
   - Difficulty calibration issues
   - High response time items

### Alert Resolution

```bash
# Resolve alert via API
curl -X POST http://localhost:8000/api/v1/system/alerts/{alert_id}/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolved_by": "admin"}'
```

## Development

### Backend Development

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Format code
black app/
isort app/

# Type checking
mypy app/
```

### Frontend Development

```bash
# Install dependencies
cd dashboard-ui
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Adding New Metrics

1. **Define the metric model** in `app/models/analytics.py`
2. **Implement calculation logic** in `app/services/metrics_service.py`
3. **Add API endpoint** in appropriate route file
4. **Update WebSocket broadcasts** in `app/main.py`
5. **Add frontend components** in `dashboard-ui/src/`

### Custom Dashboards

```typescript
// Create custom dashboard configuration
const customDashboard = {
  name: "Custom Dashboard",
  layout: {
    rows: 3,
    columns: 4,
  },
  widgets: [
    {
      type: "metric_card",
      position: { row: 0, col: 0 },
      config: {
        metric: "active_users_24h",
        title: "Active Users",
      },
    },
    {
      type: "line_chart",
      position: { row: 1, col: 0, span: 2 },
      config: {
        metrics: ["accuracy", "response_time"],
        timeRange: "24h",
      },
    },
  ],
};
```

## Performance Optimization

### Caching Strategy

- **Redis caching** for frequently accessed metrics (5-minute TTL)
- **Background updates** every 30 seconds
- **WebSocket broadcasting** for real-time updates
- **Query optimization** with database indexes

### Scaling Considerations

- **Horizontal scaling** with multiple API instances
- **Database read replicas** for analytics queries
- **Redis clustering** for cache distribution
- **CDN integration** for static assets

## Security

### Authentication

- JWT token-based authentication
- Role-based access control (RBAC)
- API rate limiting
- CORS configuration

### Data Protection

- Sensitive data masking in logs
- Encrypted connections (TLS)
- Input validation and sanitization
- SQL injection prevention

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**

   ```bash
   # Check WebSocket endpoint
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     http://localhost:8000/ws/metrics
   ```

2. **High Memory Usage**

   ```bash
   # Monitor Redis memory
   redis-cli info memory

   # Check application memory
   docker stats analytics-dashboard
   ```

3. **Slow Query Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

### Debugging

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Check application logs
docker logs analytics-dashboard -f

# Monitor WebSocket connections
curl http://localhost:8000/api/v1/system/websocket-stats
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.
