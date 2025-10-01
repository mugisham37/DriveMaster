# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the DriveMaster platform to production environments. It covers infrastructure setup, service deployment, and post-deployment validation.

## Prerequisites

### Required Tools

- **kubectl** (v1.28+)
- **helm** (v3.12+)
- **docker** (v24.0+)
- **terraform** (v1.5+) - for infrastructure provisioning
- **pnpm** (v9.0+) - for building applications

### Access Requirements

- **Kubernetes cluster** access with admin privileges
- **Container registry** push/pull access
- **DNS management** access for domain configuration
- **SSL certificate** management access

### Environment Variables

```bash
export KUBECONFIG=/path/to/production-kubeconfig
export DOCKER_REGISTRY=registry.drivemaster.com
export ENVIRONMENT=production
export NAMESPACE=drivemaster-prod
```

## Infrastructure Setup

### 1. Kubernetes Cluster Preparation

#### Create Namespace

```bash
kubectl create namespace drivemaster-prod
kubectl label namespace drivemaster-prod environment=production
```

#### Install Required Operators

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install Istio Service Mesh
curl -L https://istio.io/downloadIstio | sh -
istioctl install --set values.defaultRevision=default
kubectl label namespace drivemaster-prod istio-injection=enabled
```

### 2. Database Setup

#### PostgreSQL Cluster

```bash
# Deploy PostgreSQL with high availability
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgres bitnami/postgresql-ha \
  --namespace drivemaster-prod \
  --set postgresql.replicaCount=3 \
  --set postgresql.postgresqlDatabase=drivemaster_prod \
  --set postgresql.postgresqlUsername=drivemaster \
  --set postgresql.postgresqlPassword=${DB_PASSWORD} \
  --set persistence.size=100Gi \
  --set metrics.enabled=true
```

#### Redis Cluster

```bash
# Deploy Redis cluster
helm install redis bitnami/redis-cluster \
  --namespace drivemaster-prod \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  --set persistence.size=20Gi \
  --set metrics.enabled=true
```

#### Kafka Cluster

```bash
# Deploy Kafka cluster
helm repo add strimzi https://strimzi.io/charts/
helm install kafka strimzi/strimzi-kafka-operator \
  --namespace drivemaster-prod

# Apply Kafka cluster configuration
kubectl apply -f infra/k8s/infrastructure/kafka-cluster.yaml
```

### 3. Monitoring and Observability

#### Prometheus and Grafana

```bash
# Configure monitoring stack
kubectl apply -f infra/k8s/monitoring/prometheus-config.yaml
kubectl apply -f infra/k8s/monitoring/grafana-dashboards.yaml
kubectl apply -f infra/k8s/monitoring/alerting-rules.yaml
```

#### OpenTelemetry

```bash
# Deploy OpenTelemetry Collector
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install otel-collector open-telemetry/opentelemetry-collector \
  --namespace drivemaster-prod \
  --values infra/monitoring/otel/values.yaml
```

## Application Deployment

### 1. Build and Push Container Images

#### Build All Services

```bash
# Build all microservices
pnpm build

# Build and push Docker images
docker build --build-arg SERVICE_NAME=user-svc -t ${DOCKER_REGISTRY}/user-svc:${VERSION} .
docker build --build-arg SERVICE_NAME=adaptive-svc -t ${DOCKER_REGISTRY}/adaptive-svc:${VERSION} .
docker build --build-arg SERVICE_NAME=content-svc -t ${DOCKER_REGISTRY}/content-svc:${VERSION} .
docker build --build-arg SERVICE_NAME=analytics-svc -t ${DOCKER_REGISTRY}/analytics-svc:${VERSION} .
docker build --build-arg SERVICE_NAME=engagement-svc -t ${DOCKER_REGISTRY}/engagement-svc:${VERSION} .

# Push images to registry
docker push ${DOCKER_REGISTRY}/user-svc:${VERSION}
docker push ${DOCKER_REGISTRY}/adaptive-svc:${VERSION}
docker push ${DOCKER_REGISTRY}/content-svc:${VERSION}
docker push ${DOCKER_REGISTRY}/analytics-svc:${VERSION}
docker push ${DOCKER_REGISTRY}/engagement-svc:${VERSION}
```

### 2. Deploy Configuration

#### Secrets and ConfigMaps

```bash
# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=username=drivemaster \
  --from-literal=password=${DB_PASSWORD} \
  --namespace drivemaster-prod

kubectl create secret generic jwt-secret \
  --from-literal=secret=${JWT_SECRET} \
  --namespace drivemaster-prod

kubectl create secret generic redis-credentials \
  --from-literal=password=${REDIS_PASSWORD} \
  --namespace drivemaster-prod

# Apply configuration
kubectl apply -f infra/k8s/services/configmaps/ -n drivemaster-prod
```

### 3. Deploy Services

#### Deploy Using Helm Charts

```bash
# Deploy User Service
helm install user-svc infra/helm/user-svc \
  --namespace drivemaster-prod \
  --set image.tag=${VERSION} \
  --set environment=production \
  --set replicas=3

# Deploy Adaptive Learning Service
helm install adaptive-svc infra/helm/adaptive-svc \
  --namespace drivemaster-prod \
  --set image.tag=${VERSION} \
  --set environment=production \
  --set replicas=3

# Deploy Content Service
helm install content-svc infra/helm/content-svc \
  --namespace drivemaster-prod \
  --set image.tag=${VERSION} \
  --set environment=production \
  --set replicas=3

# Deploy Analytics Service
helm install analytics-svc infra/helm/analytics-svc \
  --namespace drivemaster-prod \
  --set image.tag=${VERSION} \
  --set environment=production \
  --set replicas=3

# Deploy Engagement Service
helm install engagement-svc infra/helm/engagement-svc \
  --namespace drivemaster-prod \
  --set image.tag=${VERSION} \
  --set environment=production \
  --set replicas=3
```

### 4. Deploy API Gateway

#### Kong Gateway

```bash
# Deploy Kong
helm repo add kong https://charts.konghq.com
helm install kong kong/kong \
  --namespace drivemaster-prod \
  --set ingressController.enabled=true \
  --set admin.enabled=true \
  --set admin.http.enabled=true \
  --set proxy.type=LoadBalancer

# Apply Kong configuration
kubectl apply -f infra/kong/kong-config.yaml -n drivemaster-prod
```

## Database Migration and Seeding

### 1. Run Database Migrations

```bash
# Create migration job
kubectl create job db-migration \
  --image=${DOCKER_REGISTRY}/user-svc:${VERSION} \
  --namespace drivemaster-prod \
  -- pnpm db:migrate

# Wait for migration completion
kubectl wait --for=condition=complete job/db-migration -n drivemaster-prod --timeout=300s

# Check migration status
kubectl logs job/db-migration -n drivemaster-prod
```

### 2. Seed Initial Data

```bash
# Create seeding job
kubectl create job db-seed \
  --image=${DOCKER_REGISTRY}/user-svc:${VERSION} \
  --namespace drivemaster-prod \
  -- pnpm db:seed

# Monitor seeding progress
kubectl logs -f job/db-seed -n drivemaster-prod
```

## SSL/TLS Configuration

### 1. Certificate Management

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Apply certificate issuer
kubectl apply -f infra/k8s/infrastructure/cert-issuer.yaml
```

### 2. Ingress Configuration

```bash
# Apply ingress with SSL
kubectl apply -f infra/k8s/services/ingress.yaml -n drivemaster-prod
```

## Post-Deployment Validation

### 1. Health Checks

```bash
# Check all pods are running
kubectl get pods -n drivemaster-prod

# Check service health
kubectl exec -it deployment/user-svc -n drivemaster-prod -- curl http://localhost:3001/health
kubectl exec -it deployment/adaptive-svc -n drivemaster-prod -- curl http://localhost:3002/health
kubectl exec -it deployment/content-svc -n drivemaster-prod -- curl http://localhost:3003/health
kubectl exec -it deployment/analytics-svc -n drivemaster-prod -- curl http://localhost:3004/health
kubectl exec -it deployment/engagement-svc -n drivemaster-prod -- curl http://localhost:3005/health
```

### 2. Integration Tests

```bash
# Run integration tests against production
cd services/integration-tests
export API_GATEWAY_URL=https://api.drivemaster.com
pnpm test:integration
pnpm test:e2e
```

### 3. Load Testing

```bash
# Run baseline load test
cd services/integration-tests
export API_GATEWAY_URL=https://api.drivemaster.com
pnpm test:load
```

### 4. Security Validation

```bash
# Run security tests
pnpm test:security

# Run vulnerability scan
kubectl exec -it deployment/user-svc -n drivemaster-prod -- npm audit
```

## Monitoring Setup

### 1. Configure Alerts

```bash
# Apply alerting rules
kubectl apply -f infra/monitoring/prometheus/alerts/ -n monitoring

# Configure notification channels
kubectl apply -f infra/monitoring/alertmanager/config.yaml -n monitoring
```

### 2. Dashboard Setup

```bash
# Import Grafana dashboards
kubectl apply -f infra/monitoring/grafana/dashboards/ -n monitoring
```

### 3. Log Aggregation

```bash
# Deploy Fluentd for log collection
kubectl apply -f infra/monitoring/logging/fluentd.yaml -n drivemaster-prod
```

## Backup Configuration

### 1. Database Backups

```bash
# Configure automated backups
kubectl apply -f infra/k8s/infrastructure/backup-cronjob.yaml -n drivemaster-prod
```

### 2. Configuration Backups

```bash
# Backup Kubernetes configurations
kubectl get all,configmaps,secrets -n drivemaster-prod -o yaml > backup/k8s-config-$(date +%Y%m%d).yaml
```

## Scaling Configuration

### 1. Horizontal Pod Autoscaler

```bash
# Configure HPA for all services
kubectl apply -f infra/k8s/services/hpa.yaml -n drivemaster-prod
```

### 2. Vertical Pod Autoscaler

```bash
# Install VPA (if not already installed)
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-release.yaml

# Configure VPA
kubectl apply -f infra/k8s/services/vpa.yaml -n drivemaster-prod
```

## Rollback Procedures

### 1. Application Rollback

```bash
# Rollback specific service
helm rollback user-svc 1 --namespace drivemaster-prod

# Or using kubectl
kubectl rollout undo deployment/user-svc -n drivemaster-prod
```

### 2. Database Rollback

```bash
# Restore from backup (if needed)
kubectl create job db-restore \
  --image=${DOCKER_REGISTRY}/user-svc:${PREVIOUS_VERSION} \
  --namespace drivemaster-prod \
  -- pnpm db:rollback
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n drivemaster-prod

# Check logs
kubectl logs <pod-name> -n drivemaster-prod --previous

# Check resource constraints
kubectl top pods -n drivemaster-prod
kubectl describe nodes
```

#### Service Discovery Issues

```bash
# Check service endpoints
kubectl get endpoints -n drivemaster-prod

# Test service connectivity
kubectl exec -it <pod-name> -n drivemaster-prod -- nslookup <service-name>
```

#### Database Connection Issues

```bash
# Check database pod status
kubectl get pods -l app=postgresql -n drivemaster-prod

# Test database connectivity
kubectl exec -it deployment/user-svc -n drivemaster-prod -- \
  psql -h postgres-service -U drivemaster -d drivemaster_prod -c "SELECT 1;"
```

### Emergency Procedures

#### Complete Service Restart

```bash
# Restart all services
kubectl rollout restart deployment -n drivemaster-prod
```

#### Scale Down for Maintenance

```bash
# Scale down all services
kubectl scale deployment --all --replicas=0 -n drivemaster-prod

# Scale back up
kubectl scale deployment --all --replicas=3 -n drivemaster-prod
```

## Maintenance Windows

### Planned Maintenance

1. **Schedule:** Sundays 2:00-4:00 AM UTC
2. **Notification:** 48 hours advance notice
3. **Procedure:** Blue-green deployment with health checks

### Emergency Maintenance

1. **Authorization:** Engineering Manager approval required
2. **Communication:** Immediate status page update
3. **Documentation:** Post-incident review required

---

**Last Updated:** 2025-01-01  
**Next Review:** 2025-04-01  
**Owner:** DevOps Team
