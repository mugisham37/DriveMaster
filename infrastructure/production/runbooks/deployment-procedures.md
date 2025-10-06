# Production Deployment Procedures

## Overview

This document outlines the standard operating procedures for deploying the Adaptive Learning Platform to production using blue-green deployment strategy.

## Prerequisites

### Required Tools

- `kubectl` (v1.25+)
- `helm` (v3.10+)
- `docker` (v20.10+)
- Access to production Kubernetes cluster
- Access to Docker registry

### Required Permissions

- Kubernetes cluster admin access
- Docker registry push permissions
- Vault access for secrets management

## Deployment Process

### 1. Pre-Deployment Checklist

- [ ] All tests passing in CI/CD pipeline
- [ ] Security scan completed with no critical issues
- [ ] Database migrations tested in staging
- [ ] Rollback plan prepared
- [ ] Stakeholders notified of deployment window
- [ ] Monitoring dashboards accessible
- [ ] On-call engineer available

### 2. Standard Deployment

```bash
# 1. Navigate to project root
cd /path/to/adaptive-learning-platform

# 2. Set deployment version
export VERSION="v1.2.3"

# 3. Run deployment script
./infrastructure/production/scripts/deploy-production.sh $VERSION

# 4. Monitor deployment progress
kubectl get pods -n adaptive-learning-green -w

# 5. Verify health checks
./infrastructure/production/scripts/deploy-production.sh health-check green

# 6. Switch traffic when ready
./infrastructure/production/scripts/deploy-production.sh switch green
```

### 3. Emergency Rollback

```bash
# Immediate rollback to previous environment
./infrastructure/production/scripts/deploy-production.sh rollback

# Verify rollback success
kubectl get namespace -l active=true
```

## Blue-Green Deployment Strategy

### Environment States

- **Blue Environment**: Currently serving production traffic
- **Green Environment**: Staging area for new deployments
- **Active Environment**: Environment currently receiving traffic

### Traffic Switching Process

1. Deploy new version to inactive environment
2. Run comprehensive health checks
3. Perform smoke tests
4. Switch traffic routing
5. Monitor metrics for 15 minutes
6. Scale down old environment if successful

### Rollback Triggers

Automatic rollback occurs if:

- Health checks fail
- Error rate > 5% for 2 minutes
- Response time P95 > 2 seconds for 5 minutes
- Any critical service unavailable

## Database Migrations

### Migration Process

```bash
# 1. Run migration in staging first
kubectl exec -it postgres-staging -- psql -U postgres -d adaptive_learning -f /migrations/v1.2.3.sql

# 2. Backup production database
kubectl exec -it postgres-prod -- pg_dump -U postgres adaptive_learning > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Run migration in production
kubectl exec -it postgres-prod -- psql -U postgres -d adaptive_learning -f /migrations/v1.2.3.sql

# 4. Verify migration success
kubectl exec -it postgres-prod -- psql -U postgres -d adaptive_learning -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### Migration Rollback

```bash
# Restore from backup if needed
kubectl exec -it postgres-prod -- psql -U postgres -d adaptive_learning < backup_YYYYMMDD_HHMMSS.sql
```

## Configuration Management

### Environment Variables

Production configurations are managed through:

- Kubernetes ConfigMaps for non-sensitive data
- Kubernetes Secrets for sensitive data
- Vault for dynamic secrets

### Updating Configuration

```bash
# Update ConfigMap
kubectl patch configmap app-config -n adaptive-learning-production --patch '{"data":{"NEW_CONFIG":"value"}}'

# Update Secret (from Vault)
vault kv put secret/adaptive-learning/production key=value

# Restart deployments to pick up changes
kubectl rollout restart deployment/auth-service -n adaptive-learning-production
```

## Monitoring During Deployment

### Key Metrics to Watch

1. **Application Metrics**

   - Request rate and error rate
   - Response time percentiles
   - Active user sessions
   - Database connection pool usage

2. **Infrastructure Metrics**

   - CPU and memory usage
   - Network I/O
   - Disk usage
   - Pod restart count

3. **Business Metrics**
   - User login success rate
   - Practice session completion rate
   - ML model prediction accuracy

### Monitoring Commands

```bash
# Watch pod status
kubectl get pods -n adaptive-learning-production -w

# Check service endpoints
kubectl get endpoints -n adaptive-learning-production

# View recent logs
kubectl logs -f deployment/auth-service -n adaptive-learning-production --tail=100

# Check resource usage
kubectl top pods -n adaptive-learning-production
```

## Security Considerations

### Pre-Deployment Security Checks

- [ ] Container images scanned for vulnerabilities
- [ ] Secrets rotation completed
- [ ] Network policies validated
- [ ] RBAC permissions reviewed
- [ ] Compliance requirements met

### Post-Deployment Security Verification

```bash
# Verify network policies
kubectl get networkpolicies -n adaptive-learning-production

# Check pod security context
kubectl get pods -n adaptive-learning-production -o jsonpath='{.items[*].spec.securityContext}'

# Validate TLS certificates
kubectl get certificates -n adaptive-learning-production
```

## Troubleshooting Common Issues

### Deployment Failures

**Issue**: Pod fails to start

```bash
# Check pod events
kubectl describe pod <pod-name> -n adaptive-learning-production

# Check logs
kubectl logs <pod-name> -n adaptive-learning-production --previous
```

**Issue**: Health checks failing

```bash
# Test health endpoint directly
kubectl port-forward service/auth-service 3001:3001 -n adaptive-learning-production
curl http://localhost:3001/health
```

**Issue**: Database connection errors

```bash
# Check database connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432

# Check database logs
kubectl logs deployment/postgres -n infrastructure
```

### Traffic Switching Issues

**Issue**: Services not receiving traffic after switch

```bash
# Verify service selectors
kubectl get service auth-service-active -n adaptive-learning-production -o yaml

# Check ingress configuration
kubectl get ingress -n adaptive-learning-production -o yaml
```

## Post-Deployment Tasks

### Immediate (0-15 minutes)

- [ ] Verify all services are healthy
- [ ] Check error rates in monitoring
- [ ] Validate critical user journeys
- [ ] Monitor resource utilization

### Short-term (15 minutes - 2 hours)

- [ ] Review application logs for errors
- [ ] Check ML model performance metrics
- [ ] Validate data pipeline processing
- [ ] Monitor user feedback channels

### Long-term (2+ hours)

- [ ] Scale down inactive environment
- [ ] Update deployment documentation
- [ ] Schedule post-deployment review
- [ ] Plan next deployment improvements

## Emergency Contacts

### On-Call Rotation

- **Primary**: DevOps Engineer (Slack: @devops-oncall)
- **Secondary**: Platform Engineer (Slack: @platform-oncall)
- **Escalation**: Engineering Manager (Phone: +1-XXX-XXX-XXXX)

### Service Contacts

- **Database Issues**: DBA Team (Slack: #database-support)
- **Security Issues**: Security Team (Slack: #security-incidents)
- **Infrastructure**: Cloud Team (Slack: #infrastructure)

## Documentation Updates

After each deployment:

1. Update this runbook with lessons learned
2. Document any new procedures or fixes
3. Update monitoring dashboards if needed
4. Share deployment summary with team

## Compliance and Audit

### Required Documentation

- Deployment approval records
- Change management tickets
- Security scan results
- Performance test results
- Rollback procedures validation

### Audit Trail

All deployment activities are logged in:

- Kubernetes audit logs
- CI/CD pipeline logs
- Monitoring system events
- Change management system
