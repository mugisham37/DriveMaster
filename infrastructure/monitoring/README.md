# Monitoring and Observability Stack

This directory contains the complete monitoring and observability stack for the Adaptive Learning Platform, including Prometheus, Grafana, Alertmanager, Loki, and Promtail.

## Components

### 🔍 Prometheus

- **Purpose**: Metrics collection and storage
- **Port**: 9090
- **Features**:
  - Service discovery for all platform services
  - Custom alerting rules for business and technical metrics
  - 30-day retention policy
  - Automatic scraping of application metrics

### 📊 Grafana

- **Purpose**: Metrics visualization and dashboards
- **Port**: 3000
- **Features**:
  - Pre-configured dashboards for all services
  - Prometheus and Loki data sources
  - Alert notifications integration
  - Custom business metrics dashboards

### 🚨 Alertmanager

- **Purpose**: Alert routing and notification management
- **Port**: 9093
- **Features**:
  - Multi-channel notifications (Slack, Email)
  - Alert grouping and deduplication
  - Severity-based routing
  - Inhibition rules to reduce noise

### 📝 Loki

- **Purpose**: Log aggregation and storage
- **Port**: 3100
- **Features**:
  - Centralized log collection from all pods
  - Label-based log querying
  - Integration with Grafana for log visualization
  - Configurable retention policies

### 🔄 Promtail

- **Purpose**: Log shipping agent
- **Deployment**: DaemonSet on all nodes
- **Features**:
  - Automatic Kubernetes pod log discovery
  - Log parsing and labeling
  - Efficient log streaming to Loki

## Quick Start

### Deploy the Complete Stack

```bash
cd infrastructure/monitoring

# Make the script executable (Linux/Mac)
chmod +x deploy-monitoring.sh

# Deploy all monitoring components
./deploy-monitoring.sh

# Or on Windows
bash deploy-monitoring.sh
```

### Deploy Individual Components

```bash
# Deploy only Prometheus
kubectl apply -f prometheus/

# Deploy only Grafana
kubectl apply -f grafana/

# Deploy only Alertmanager
kubectl apply -f alertmanager/

# Deploy log aggregation (Loki + Promtail)
kubectl apply -f loki/
kubectl apply -f promtail/
```

## Access Information

### Local Access (Port Forwarding)

```bash
# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n adaptive-learning-monitoring

# Grafana
kubectl port-forward svc/grafana 3000:3000 -n adaptive-learning-monitoring

# Alertmanager
kubectl port-forward svc/alertmanager 9093:9093 -n adaptive-learning-monitoring

# Loki
kubectl port-forward svc/loki 3100:3100 -n adaptive-learning-monitoring
```

### Production Access (Ingress)

- **Prometheus**: https://prometheus.adaptivelearning.com
- **Grafana**: https://grafana.adaptivelearning.com
- **Alertmanager**: https://alertmanager.adaptivelearning.com

**Default Credentials:**

- Basic Auth: `admin` / `monitoring123!`
- Grafana: `admin` / `admin123!@#`

⚠️ **Change these credentials in production!**

## Configuration

### Prometheus Configuration

The Prometheus configuration includes:

- **Service Discovery**: Automatic discovery of all Kubernetes services
- **Scrape Configs**: Pre-configured for all platform services
- **Alerting Rules**: Comprehensive alerting for:
  - Service availability
  - Error rates and response times
  - Resource utilization
  - Business metrics
  - ML model performance

### Grafana Dashboards

Pre-configured dashboards include:

1. **Platform Overview**: High-level service health and performance
2. **Scheduler Service**: Detailed metrics for the adaptive learning algorithms
3. **ML Service**: Machine learning model performance and accuracy
4. **Infrastructure**: Node and cluster-level metrics
5. **Business Metrics**: User engagement and learning effectiveness

### Alert Rules

Alerting rules are organized by severity:

#### Critical Alerts

- Service down
- High error rates (>5%)
- Critical response times (>5s)
- Node failures
- ML model accuracy drops

#### Warning Alerts

- High resource utilization
- Elevated response times
- Database connection issues
- Kafka consumer lag
- Authentication failures

#### Business Alerts

- Low user engagement
- High churn rates
- Content performance issues

### Notification Channels

Configure these notification channels in `alertmanager-config.yaml`:

```yaml
# Slack Integration
slack_api_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Email Configuration
smtp_smarthost: "smtp.gmail.com:587"
smtp_from: "alerts@adaptivelearning.com"
smtp_auth_username: "alerts@adaptivelearning.com"
smtp_auth_password: "your-app-password"
```

## Monitoring Best Practices

### Service Instrumentation

Ensure all services expose metrics on `/metrics` endpoint:

```go
// Go services
import "github.com/prometheus/client_golang/prometheus/promhttp"

http.Handle("/metrics", promhttp.Handler())
```

```javascript
// Node.js services
const promClient = require("prom-client");
const register = new promClient.Registry();

app.get("/metrics", (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(register.metrics());
});
```

### Custom Metrics

Add these annotations to your service pods:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### Log Format

Use structured logging (JSON) for better parsing:

```json
{
  "timestamp": "2023-10-01T12:00:00Z",
  "level": "info",
  "service": "scheduler-service",
  "message": "Next item selected",
  "user_id": "user123",
  "item_id": "item456",
  "algorithm_score": 0.85,
  "response_time_ms": 45
}
```

## Troubleshooting

### Common Issues

1. **Prometheus not scraping targets**:

   ```bash
   # Check service discovery
   kubectl logs deployment/prometheus -n adaptive-learning-monitoring

   # Verify service annotations
   kubectl get pods -o yaml | grep -A 5 annotations
   ```

2. **Grafana dashboards not loading**:

   ```bash
   # Check Grafana logs
   kubectl logs deployment/grafana -n adaptive-learning-monitoring

   # Verify data source configuration
   kubectl exec -it deployment/grafana -n adaptive-learning-monitoring -- cat /etc/grafana/provisioning/datasources/datasources.yml
   ```

3. **Alerts not firing**:

   ```bash
   # Check Prometheus rules
   kubectl logs deployment/prometheus -n adaptive-learning-monitoring | grep -i rule

   # Verify Alertmanager configuration
   kubectl logs deployment/alertmanager -n adaptive-learning-monitoring
   ```

4. **Logs not appearing in Loki**:

   ```bash
   # Check Promtail logs
   kubectl logs daemonset/promtail -n adaptive-learning-monitoring

   # Verify Loki connectivity
   kubectl exec -it deployment/promtail -n adaptive-learning-monitoring -- wget -qO- http://loki:3100/ready
   ```

### Debug Commands

```bash
# Check all monitoring pods
kubectl get pods -n adaptive-learning-monitoring

# View resource usage
kubectl top pods -n adaptive-learning-monitoring

# Check persistent volumes
kubectl get pvc -n adaptive-learning-monitoring

# View service endpoints
kubectl get endpoints -n adaptive-learning-monitoring

# Check ingress status
kubectl describe ingress monitoring-ingress -n adaptive-learning-monitoring
```

## Scaling and Performance

### Resource Requirements

| Component    | CPU Request | Memory Request | Storage |
| ------------ | ----------- | -------------- | ------- |
| Prometheus   | 1000m       | 2Gi            | 100Gi   |
| Grafana      | 250m        | 512Mi          | 10Gi    |
| Alertmanager | 100m        | 256Mi          | 5Gi     |
| Loki         | 250m        | 512Mi          | 50Gi    |
| Promtail     | 100m        | 128Mi          | -       |

### High Availability

For production environments, consider:

1. **Prometheus HA**: Deploy multiple Prometheus instances with external storage
2. **Grafana HA**: Use external database and multiple replicas
3. **Alertmanager Cluster**: Deploy 3+ Alertmanager instances for clustering
4. **Loki Scaling**: Use object storage backend and multiple replicas

### Performance Tuning

1. **Prometheus**:

   - Adjust scrape intervals based on requirements
   - Use recording rules for expensive queries
   - Configure appropriate retention policies

2. **Grafana**:

   - Enable query caching
   - Optimize dashboard queries
   - Use appropriate refresh intervals

3. **Loki**:
   - Configure log retention policies
   - Use appropriate chunk sizes
   - Enable compression

## Security Considerations

1. **Network Policies**: Restrict access between monitoring components
2. **RBAC**: Use minimal required permissions for service accounts
3. **TLS**: Enable TLS for all inter-component communication
4. **Authentication**: Configure proper authentication for Grafana
5. **Secrets Management**: Use Kubernetes secrets for sensitive configuration

## Backup and Recovery

### Prometheus Data

```bash
# Create backup job
kubectl create job prometheus-backup --from=cronjob/prometheus-backup -n adaptive-learning-monitoring
```

### Grafana Configuration

```bash
# Export dashboards
kubectl exec deployment/grafana -n adaptive-learning-monitoring -- grafana-cli admin export-dashboard
```

### Alertmanager Configuration

```bash
# Backup configuration
kubectl get configmap alertmanager-config -n adaptive-learning-monitoring -o yaml > alertmanager-backup.yaml
```

## Maintenance

### Regular Tasks

1. **Update Images**: Regularly update to latest stable versions
2. **Clean Old Data**: Monitor storage usage and clean old metrics/logs
3. **Review Alerts**: Regularly review and tune alerting rules
4. **Dashboard Updates**: Keep dashboards updated with new metrics
5. **Performance Review**: Monitor monitoring stack performance

### Upgrade Procedure

1. **Backup Configuration**: Export all configurations and dashboards
2. **Update Images**: Update container images in deployment files
3. **Apply Changes**: Use rolling updates to minimize downtime
4. **Verify**: Ensure all components are working after upgrade
5. **Restore**: Restore configurations if needed

## Support

For monitoring-related issues:

1. Check the troubleshooting section above
2. Review component logs for error messages
3. Verify network connectivity between components
4. Check resource utilization and scaling requirements
5. Contact the platform team with detailed error information and logs
