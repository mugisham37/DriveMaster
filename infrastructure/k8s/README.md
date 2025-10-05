# Kubernetes Deployment for Adaptive Learning Platform

This directory contains Kubernetes manifests and Helm charts for deploying the Adaptive Learning Platform to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured to access your cluster
- Helm 3.x (for Helm-based deployment)
- Sufficient cluster resources:
  - At least 16 CPU cores
  - At least 32GB RAM
  - At least 500GB storage
  - GPU nodes (optional, for ML service)

## Quick Start

### Option 1: Deploy with kubectl

```bash
cd infrastructure/k8s

# Make the deploy script executable (Linux/Mac)
chmod +x deploy.sh

# Deploy the platform
./deploy.sh

# Or on Windows, run with bash
bash deploy.sh
```

### Option 2: Deploy with Helm

```bash
cd infrastructure/k8s

# Deploy using Helm
./deploy.sh --helm

# Or manually with Helm
helm upgrade --install adaptive-learning ../helm/adaptive-learning \
  --namespace adaptive-learning-prod \
  --create-namespace \
  --wait
```

## Directory Structure

```
k8s/
├── namespaces.yaml              # Kubernetes namespaces
├── secrets.yaml                 # Application secrets (update for production!)
├── configmaps.yaml             # Application configuration
├── deployments/                # Service deployments
│   ├── auth-service.yaml
│   ├── user-service.yaml
│   ├── content-service.yaml
│   ├── scheduler-service.yaml
│   ├── ml-service.yaml
│   ├── event-service.yaml
│   ├── notification-service.yaml
│   └── fraud-service.yaml
├── infrastructure/             # Infrastructure services
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── kafka.yaml
├── deploy.sh                   # Deployment script
└── README.md                   # This file
```

## Configuration

### Secrets Management

**⚠️ IMPORTANT**: The `secrets.yaml` file contains placeholder values. You MUST update these with real values before deploying to production:

```yaml
# Update these values in secrets.yaml
POSTGRES_PASSWORD: "your-secure-password"
REDIS_PASSWORD: "your-secure-password"
JWT_SECRET: "your-jwt-secret-key"
GOOGLE_CLIENT_ID: "your-google-oauth-client-id"
AWS_ACCESS_KEY_ID: "your-aws-access-key"
# ... and all other secrets
```

### Resource Requirements

Each service has configured resource requests and limits:

| Service              | CPU Request | Memory Request | CPU Limit | Memory Limit |
| -------------------- | ----------- | -------------- | --------- | ------------ |
| Auth Service         | 250m        | 256Mi          | 500m      | 512Mi        |
| User Service         | 500m        | 512Mi          | 1000m     | 1Gi          |
| Content Service      | 250m        | 256Mi          | 500m      | 512Mi        |
| Scheduler Service    | 500m        | 512Mi          | 1000m     | 1Gi          |
| ML Service           | 1000m       | 1Gi            | 2000m     | 2Gi          |
| Event Service        | 250m        | 256Mi          | 500m      | 512Mi        |
| Notification Service | 250m        | 256Mi          | 500m      | 512Mi        |
| Fraud Service        | 500m        | 512Mi          | 1000m     | 1Gi          |

### Auto-scaling Configuration

All services are configured with Horizontal Pod Autoscaler (HPA):

- **CPU Target**: 70% utilization
- **Memory Target**: 80% utilization
- **Min/Max Replicas**: Varies by service criticality

## Deployment Options

### Environment Variables

Set these environment variables to customize deployment:

```bash
export NAMESPACE=adaptive-learning-prod
export ENVIRONMENT=production
export KUBECTL_CONTEXT=my-cluster-context
```

### Deployment Methods

1. **kubectl-based deployment** (default):

   ```bash
   ./deploy.sh
   ```

2. **Helm-based deployment**:

   ```bash
   ./deploy.sh --helm
   ```

3. **With database migrations**:
   ```bash
   ./deploy.sh --migrate
   ```

## Post-Deployment

### Verify Deployment

```bash
# Check pod status
kubectl get pods -n adaptive-learning-prod

# Check services
kubectl get services -n adaptive-learning-prod

# Check ingress
kubectl get ingress -n adaptive-learning-prod

# Check HPA status
kubectl get hpa -n adaptive-learning-prod
```

### Access Services

#### Port Forwarding (for testing)

```bash
# Auth Service
kubectl port-forward svc/auth-service 3000:3000 -n adaptive-learning-prod

# User Service
kubectl port-forward svc/user-service 8080:8080 -n adaptive-learning-prod

# Scheduler Service
kubectl port-forward svc/scheduler-service 8081:8081 -n adaptive-learning-prod
```

#### Ingress (for production)

Configure your DNS to point to the ingress controller's external IP:

```bash
# Get ingress IP
kubectl get ingress -n adaptive-learning-prod
```

### Database Migrations

Run database migrations after initial deployment:

```bash
# Create migration job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: adaptive-learning-prod
spec:
  template:
    spec:
      containers:
      - name: migration
        image: adaptive-learning/user-service:latest
        command: ["./migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DATABASE_URL
      restartPolicy: Never
EOF
```

## Monitoring and Observability

### Health Checks

All services expose health check endpoints:

- `/health` - Liveness probe
- `/ready` - Readiness probe

### Metrics

Services expose Prometheus metrics on `/metrics` endpoint.

### Logs

View service logs:

```bash
# View logs for a specific service
kubectl logs -f deployment/auth-service -n adaptive-learning-prod

# View logs for all pods with a label
kubectl logs -f -l app=scheduler-service -n adaptive-learning-prod
```

## Scaling

### Manual Scaling

```bash
# Scale a specific service
kubectl scale deployment auth-service --replicas=5 -n adaptive-learning-prod
```

### Auto-scaling

HPA is configured for all services. Monitor scaling:

```bash
# Watch HPA status
kubectl get hpa -w -n adaptive-learning-prod
```

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**:

   - Check resource availability: `kubectl describe nodes`
   - Check storage class: `kubectl get storageclass`

2. **Services not starting**:

   - Check logs: `kubectl logs deployment/SERVICE_NAME -n adaptive-learning-prod`
   - Check secrets: `kubectl get secrets -n adaptive-learning-prod`

3. **Database connection issues**:

   - Verify PostgreSQL is running: `kubectl get pods -l app=postgres -n adaptive-learning-prod`
   - Check database credentials in secrets

4. **Redis connection issues**:
   - Verify Redis cluster: `kubectl get pods -l app=redis -n adaptive-learning-prod`
   - Check Redis password in secrets

### Debug Commands

```bash
# Get detailed pod information
kubectl describe pod POD_NAME -n adaptive-learning-prod

# Execute commands in a pod
kubectl exec -it POD_NAME -n adaptive-learning-prod -- /bin/bash

# Check resource usage
kubectl top pods -n adaptive-learning-prod
kubectl top nodes
```

## Security Considerations

1. **Update all secrets** in `secrets.yaml` before production deployment
2. **Enable RBAC** and create service accounts with minimal permissions
3. **Use network policies** to restrict inter-pod communication
4. **Enable pod security policies** or pod security standards
5. **Regularly update container images** for security patches
6. **Use sealed secrets** or external secret management for production

## Backup and Recovery

### Database Backup

```bash
# Create database backup job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: adaptive-learning-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              pg_dump \$DATABASE_URL > /backup/backup-\$(date +%Y%m%d-%H%M%S).sql
              # Upload to S3 or other storage
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: DATABASE_URL
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
EOF
```

## Performance Tuning

### Database Optimization

1. **Connection Pooling**: Configure appropriate connection pool sizes
2. **Indexing**: Ensure proper database indexes are created
3. **Query Optimization**: Monitor slow queries and optimize

### Redis Optimization

1. **Memory Management**: Configure appropriate maxmemory and eviction policies
2. **Persistence**: Balance between performance and durability
3. **Clustering**: Use Redis cluster for high availability

### Application Optimization

1. **Resource Limits**: Fine-tune CPU and memory limits based on actual usage
2. **Caching**: Implement appropriate caching strategies
3. **Connection Pooling**: Configure HTTP and database connection pools

## Support

For deployment issues or questions:

1. Check the logs first: `kubectl logs deployment/SERVICE_NAME -n adaptive-learning-prod`
2. Review the troubleshooting section above
3. Check Kubernetes events: `kubectl get events -n adaptive-learning-prod`
4. Contact the platform team with detailed error information
