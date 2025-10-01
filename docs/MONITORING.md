# DriveMaster Monitoring and Observability

This document provides comprehensive information about the monitoring, observability, and production readiness infrastructure for the DriveMaster platform.

## Overview

The DriveMaster platform implements a comprehensive monitoring stack that includes:

- **Metrics Collection**: Prometheus with custom application metrics
- **Visualization**: Grafana dashboards for system and business metrics
- **Distributed Tracing**: Jaeger with OpenTelemetry instrumentation
- **Log Aggregation**: Loki with structured logging
- **Alerting**: AlertManager with SLO-based alerts
- **Chaos Engineering**: Automated resilience testing
- **Health Monitoring**: Comprehensive health checks and readiness probes

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   OpenTelemetry │    │   Prometheus    │
│   Services      │───▶│   Collector     │───▶│   Server        │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │     Jaeger      │    │     Grafana     │
         │              │   (Tracing)     │    │  (Dashboards)   │
         │              └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Loki       │    │  AlertManager   │    │  Chaos Mesh     │
│   (Logging)     │    │   (Alerting)    │    │ (Resilience)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Metrics and KPIs

### Application Metrics

#### HTTP Metrics

- `http_requests_total`: Total HTTP requests by method, route, status
- `http_request_duration_seconds`: Request duration histogram
- `http_requests_in_flight`: Current number of requests being processed

#### Learning Metrics

- `learning_effectiveness_score`: Learning effectiveness (0-1)
- `user_session_duration_seconds`: Session duration histogram
- `questions_answered_total`: Questions answered by category/difficulty
- `questions_correct_total`: Correct answers by category/difficulty
- `dropout_risk_score`: User dropout risk prediction (0-1)
- `user_engagement_score`: User engagement score (0-1)

#### Algorithm Metrics

- `bkt_knowledge_probability`: Bayesian Knowledge Tracing probabilities
- `bandit_exploration_rate`: Multi-armed bandit exploration rate
- `spaced_repetition_retention_rate`: Spaced repetition effectiveness

#### Business Metrics

- `active_users_total`: Number of active users
- `learning_sessions_total`: Total learning sessions
- `content_interactions_total`: Content interaction events
- `notification_effectiveness_rate`: Notification click-through rates
- `user_retention_rate`: User retention by time period

### Infrastructure Metrics

#### Database (PostgreSQL)

- `pg_up`: Database availability
- `pg_stat_activity_count`: Active connections
- `pg_stat_database_blks_hit_ratio`: Cache hit ratio
- `pg_replication_lag_seconds`: Replication lag

#### Cache (Redis)

- `redis_up`: Redis availability
- `redis_memory_used_bytes`: Memory usage
- `redis_connected_clients`: Connected clients
- `redis_keyspace_hits_total`: Cache hits
- `redis_keyspace_misses_total`: Cache misses

#### Message Queue (Kafka)

- `kafka_server_brokertopicmetrics_messagesin_total`: Messages received
- `kafka_consumer_lag_sum`: Consumer lag

#### Search (Elasticsearch)

- `elasticsearch_cluster_health_up`: Cluster availability
- `elasticsearch_cluster_health_status`: Cluster health status
- `elasticsearch_filesystem_data_size_bytes`: Disk usage

## Service Level Objectives (SLOs)

### Availability SLO

- **Target**: 99.9% uptime
- **Error Budget**: 43.2 minutes downtime per month
- **Measurement**: `(successful_requests / total_requests) >= 0.999`

### Latency SLO

- **Target**: 95% of requests under 100ms
- **Measurement**: `histogram_quantile(0.95, http_request_duration_seconds) <= 0.1`

### Error Rate SLO

- **Target**: Less than 0.1% error rate
- **Measurement**: `(error_requests / total_requests) <= 0.001`

### Learning Effectiveness SLO

- **Target**: Maintain above 75% effectiveness
- **Measurement**: `avg(learning_effectiveness_score) >= 0.75`

### User Engagement SLO

- **Target**: Average session duration above 5 minutes
- **Measurement**: `avg(user_session_duration_seconds) >= 300`

## Dashboards

### Application Overview Dashboard

- Service health status
- Request rate and response times
- Error rates by service
- Active users and learning sessions
- Learning effectiveness metrics

### Infrastructure Overview Dashboard

- Database connection and performance metrics
- Cache hit ratios and memory usage
- Message queue throughput
- Search cluster health
- System resource utilization

### Learning Analytics Dashboard

- Learning effectiveness trends
- User engagement patterns
- Question success rates by category
- Adaptive algorithm performance
- Content interaction heatmaps

### SLO Dashboard

- Real-time SLI measurements
- Error budget consumption
- SLO breach alerts
- Trend analysis

## Alerting

### Critical Alerts (Immediate Response)

- Service down (30s threshold)
- High error rate (>5% for 1 minute)
- Database unavailable
- SLO breach (availability, error rate)

### Warning Alerts (Investigation Required)

- High response time (>100ms 95th percentile for 5 minutes)
- High memory usage (>80% for 5 minutes)
- Low cache hit ratio (<95% for 5 minutes)
- Learning effectiveness below target

### Alert Routing

- **Critical**: Slack + Email + PagerDuty
- **Warning**: Slack + Email
- **Info**: Slack only

## Distributed Tracing

### Instrumentation

All services are instrumented with OpenTelemetry to provide:

- Request flow visualization
- Performance bottleneck identification
- Error propagation tracking
- Service dependency mapping

### Trace Context

- `user.id`: User identifier
- `session.id`: Learning session identifier
- `service.component`: Service component name
- `algorithm.name`: ML algorithm used
- `content.id`: Content identifier

## Log Aggregation

### Structured Logging

All services use structured JSON logging with:

- Timestamp
- Log level
- Service name
- User ID (when applicable)
- Request ID for correlation
- Custom metadata

### Log Retention

- **Application Logs**: 30 days
- **Security Logs**: 90 days
- **Audit Logs**: 1 year

## Health Checks

### Liveness Probes

- Simple endpoint that returns 200 if service is alive
- Used by Kubernetes to restart unhealthy pods

### Readiness Probes

- Comprehensive check of service dependencies
- Includes database, cache, and external service connectivity
- Used by Kubernetes for load balancing decisions

### Startup Probes

- Extended timeout for service initialization
- Prevents premature restarts during startup

## Chaos Engineering

### Automated Experiments

- **Network Latency**: Inject 100ms latency every hour
- **Pod Failures**: Kill 25% of pods every 6 hours
- **CPU Stress**: 80% CPU load for 3 minutes every 4 hours
- **Memory Stress**: 512MB memory pressure every 8 hours
- **Database Partitions**: 1-minute database isolation every 12 hours

### Experiment Conditions

- Only run when system health is above threshold
- Automatic rollback on SLO breach
- Comprehensive monitoring during experiments

## Deployment

### Prerequisites

- Kubernetes cluster with sufficient resources
- Helm 3.x installed
- kubectl configured for cluster access
- Storage class `fast-ssd` available

### Quick Start

```bash
# Deploy monitoring stack
./infra/scripts/deploy-monitoring.sh

# Verify deployment
./infra/scripts/deploy-monitoring.sh verify

# Get access information
./infra/scripts/deploy-monitoring.sh access
```

### Manual Deployment

```bash
# Create namespaces
kubectl create namespace drivemaster
kubectl create namespace drivemaster-monitoring

# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Deploy Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace drivemaster-monitoring \
  --values infra/monitoring/prometheus/values.yaml

# Deploy Jaeger
helm install jaeger jaegertracing/jaeger \
  --namespace drivemaster-monitoring

# Apply custom configurations
kubectl apply -f infra/monitoring/prometheus/alerts/
kubectl apply -f infra/monitoring/slo/
```

## Access Information

### Port Forwarding

```bash
# Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n drivemaster-monitoring

# Grafana (admin/admin123)
kubectl port-forward svc/prometheus-grafana 3000:80 -n drivemaster-monitoring

# AlertManager
kubectl port-forward svc/prometheus-kube-prometheus-alertmanager 9093:9093 -n drivemaster-monitoring

# Jaeger
kubectl port-forward svc/jaeger-query 16686:16686 -n drivemaster-monitoring
```

### Ingress (Production)

- Grafana: https://grafana.drivemaster.com
- Prometheus: https://prometheus.drivemaster.com (internal only)
- AlertManager: https://alerts.drivemaster.com (internal only)
- Jaeger: https://tracing.drivemaster.com (internal only)

## Testing

### Monitoring Tests

```bash
# Run comprehensive monitoring tests
cd infra/monitoring/tests
npm install
npm test
```

### Load Testing

```bash
# Generate load for testing
kubectl apply -f infra/monitoring/tests/load-test.yaml
```

### Chaos Testing

```bash
# Run chaos experiments
kubectl apply -f infra/monitoring/chaos/chaos-experiments.yaml
```

## Troubleshooting

### Common Issues

#### Prometheus Not Scraping Targets

1. Check service annotations for `prometheus.io/scrape: "true"`
2. Verify network policies allow Prometheus access
3. Check service discovery configuration

#### Grafana Dashboards Not Loading

1. Verify ConfigMap with dashboards exists
2. Check Grafana provisioning configuration
3. Restart Grafana deployment

#### High Memory Usage

1. Check retention policies
2. Verify metric cardinality
3. Consider metric sampling

#### Missing Traces

1. Verify OpenTelemetry configuration
2. Check Jaeger collector connectivity
3. Validate trace sampling rates

### Performance Tuning

#### Prometheus

- Adjust retention period based on storage capacity
- Configure recording rules for frequently queried metrics
- Use federation for multi-cluster setups

#### Grafana

- Enable query caching
- Optimize dashboard queries
- Use template variables for dynamic dashboards

#### Jaeger

- Configure appropriate sampling rates
- Use Elasticsearch for production storage
- Implement trace archival policies

## Security Considerations

### Access Control

- RBAC for Kubernetes resources
- Network policies for service isolation
- Authentication for monitoring tools

### Data Privacy

- Scrub sensitive data from logs and traces
- Implement data retention policies
- Encrypt data in transit and at rest

### Compliance

- Audit logging for all access
- Data anonymization for analytics
- GDPR compliance for user data

## Maintenance

### Regular Tasks

- Review and update alert thresholds
- Analyze SLO performance and adjust targets
- Update dashboards based on new requirements
- Conduct chaos engineering experiments
- Review and optimize resource usage

### Backup and Recovery

- Prometheus data backup to object storage
- Grafana configuration backup
- Alert rule version control
- Dashboard export and import procedures

## Integration with CI/CD

### Automated Deployment

- Helm chart updates through GitOps
- Configuration validation in CI pipeline
- Automated testing of monitoring stack
- Rollback procedures for failed deployments

### Monitoring as Code

- Alert rules in version control
- Dashboard definitions in Git
- Infrastructure as Code for monitoring resources
- Automated compliance checking
