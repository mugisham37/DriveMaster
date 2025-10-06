# Service Outage Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to service outages in the Adaptive Learning Platform.

## Severity Assessment

### Complete Outage (P0)

- All services unavailable
- Users cannot access the platform
- No API responses

### Partial Outage (P1)

- Some services unavailable
- Degraded functionality
- Some users affected

### Service-Specific Outage (P2)

- Single service down
- Other services functioning
- Limited impact

## Immediate Response (First 15 minutes)

### 1. Acknowledge and Assess

```bash
# Check overall system health
kubectl get pods --all-namespaces | grep -v Running
kubectl get services --all-namespaces
kubectl get ingress --all-namespaces

# Check monitoring dashboards
# - Open Grafana: https://monitoring.adaptivelearning.com
# - Check Prometheus alerts: https://prometheus.adaptivelearning.com/alerts
# - Review error rates and response times
```

### 2. Initial Communication

- Post in #incidents Slack channel
- Create incident ticket in JIRA/ServiceNow
- Notify on-call manager if P0/P1

**Template Message:**

```
🚨 INCIDENT ALERT - P[X] Service Outage
Service: [Affected Services]
Impact: [User Impact Description]
Started: [Timestamp]
Investigating: [Your Name]
Status Page: [Update if applicable]
```

### 3. Quick Health Checks

```bash
# Check node health
kubectl get nodes
kubectl describe nodes | grep -E "Ready|MemoryPressure|DiskPressure"

# Check critical services
kubectl get pods -n adaptive-learning-production
kubectl get pods -n monitoring
kubectl get pods -n istio-system

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50
```

## Investigation Phase (15-60 minutes)

### 1. Service-Level Investigation

#### Authentication Service Down

```bash
# Check auth service status
kubectl get pods -n adaptive-learning-production -l app=auth-service
kubectl describe pod -n adaptive-learning-production -l app=auth-service
kubectl logs -n adaptive-learning-production -l app=auth-service --tail=100

# Check dependencies
kubectl get pods -n adaptive-learning-production -l app=postgres
kubectl get pods -n adaptive-learning-production -l app=redis

# Test database connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432
```

#### Database Issues

```bash
# Check PostgreSQL status
kubectl get pods -n adaptive-learning-production -l app=postgres
kubectl logs -n adaptive-learning-production -l app=postgres --tail=100

# Check database connectivity
kubectl port-forward svc/postgres 5432:5432 -n adaptive-learning-production &
psql -h localhost -U postgres -d adaptive_learning -c "SELECT 1;"

# Check database performance
psql -h localhost -U postgres -d adaptive_learning -c "
SELECT
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit
FROM pg_stat_database
WHERE datname = 'adaptive_learning';"
```

#### Load Balancer Issues

```bash
# Check ingress controller
kubectl get ingress -n adaptive-learning-production
kubectl describe ingress adaptive-learning-ingress -n adaptive-learning-production

# Check external load balancer
curl -I https://api.adaptivelearning.com/health
curl -I https://app.adaptivelearning.com/health

# Check DNS resolution
nslookup api.adaptivelearning.com
nslookup app.adaptivelearning.com
```

### 2. Infrastructure Investigation

#### Kubernetes Cluster Issues

```bash
# Check cluster events
kubectl get events --sort-by=.metadata.creationTimestamp --all-namespaces | tail -20

# Check resource usage
kubectl top nodes
kubectl top pods -n adaptive-learning-production

# Check for resource constraints
kubectl describe nodes | grep -A 5 "Allocated resources"
```

#### Network Issues

```bash
# Check network policies
kubectl get networkpolicies -n adaptive-learning-production

# Test inter-service connectivity
kubectl exec -it deployment/user-service -n adaptive-learning-production -- nc -zv auth-service 3001
kubectl exec -it deployment/scheduler-service -n adaptive-learning-production -- nc -zv postgres 5432

# Check DNS resolution within cluster
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nslookup postgres.adaptive-learning-production.svc.cluster.local
```

### 3. Application-Level Investigation

#### Check Application Logs

```bash
# Get recent error logs from all services
for service in auth-service user-service scheduler-service content-service; do
    echo "=== $service logs ==="
    kubectl logs -n adaptive-learning-production deployment/$service --tail=50 | grep -i error
done

# Check for common error patterns
kubectl logs -n adaptive-learning-production -l app=auth-service | grep -E "(timeout|connection|error|exception)" | tail -20
```

#### Check Configuration

```bash
# Verify ConfigMaps
kubectl get configmaps -n adaptive-learning-production
kubectl describe configmap app-config -n adaptive-learning-production

# Verify Secrets
kubectl get secrets -n adaptive-learning-production
# Note: Don't expose secret values in logs
```

## Resolution Actions

### 1. Service Restart

```bash
# Restart specific service
kubectl rollout restart deployment/auth-service -n adaptive-learning-production
kubectl rollout status deployment/auth-service -n adaptive-learning-production

# Restart all services (if needed)
kubectl rollout restart deployment -n adaptive-learning-production
```

### 2. Scale Services

```bash
# Scale up replicas for high load
kubectl scale deployment auth-service --replicas=5 -n adaptive-learning-production
kubectl scale deployment user-service --replicas=3 -n adaptive-learning-production

# Check scaling status
kubectl get hpa -n adaptive-learning-production
```

### 3. Database Recovery

```bash
# If database is unresponsive, check connections
kubectl exec -it deployment/postgres -n adaptive-learning-production -- psql -U postgres -c "
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE state = 'active';"

# Kill long-running queries if needed (carefully!)
kubectl exec -it deployment/postgres -n adaptive-learning-production -- psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
AND query_start < NOW() - INTERVAL '5 minutes'
AND query NOT LIKE '%pg_stat_activity%';"
```

### 4. Traffic Routing

```bash
# Switch to backup environment (blue-green)
kubectl patch service auth-service-active -n adaptive-learning-production -p '{"spec":{"selector":{"deployment-slot":"green"}}}'

# Or route traffic away temporarily
kubectl patch ingress adaptive-learning-ingress -n adaptive-learning-production --type='json' -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "maintenance-page"}]'
```

## Verification Steps

### 1. Health Check Verification

```bash
# Test all critical endpoints
curl -f https://api.adaptivelearning.com/health
curl -f https://api.adaptivelearning.com/auth/health
curl -f https://api.adaptivelearning.com/users/health
curl -f https://api.adaptivelearning.com/scheduler/health
curl -f https://api.adaptivelearning.com/content/health

# Check response times
time curl -s https://api.adaptivelearning.com/health
```

### 2. End-to-End Testing

```bash
# Run automated smoke tests
kubectl apply -f tests/smoke-tests.yaml
kubectl wait --for=condition=complete job/smoke-tests --timeout=300s
kubectl logs job/smoke-tests
```

### 3. Monitor Recovery

- Watch Grafana dashboards for 15 minutes
- Check error rates return to normal
- Verify user traffic is flowing
- Monitor resource utilization

## Communication Updates

### During Resolution

**Update Template:**

```
🔧 INCIDENT UPDATE - P[X] Service Outage
Service: [Affected Services]
Status: [Investigating/Identified/Resolving/Monitoring]
Actions: [Current actions being taken]
ETA: [Estimated resolution time]
Next Update: [Time for next update]
```

### Resolution Communication

**Resolution Template:**

```
✅ INCIDENT RESOLVED - P[X] Service Outage
Service: [Affected Services]
Resolution: [What was done to fix it]
Duration: [Total outage time]
Root Cause: [Brief explanation]
Follow-up: [Any follow-up actions needed]
Post-mortem: [If P0/P1, when post-mortem will be conducted]
```

## Post-Incident Actions

### Immediate (Within 24 hours)

1. Update incident ticket with full timeline
2. Gather all relevant logs and metrics
3. Notify stakeholders of resolution
4. Schedule post-mortem if P0/P1

### Short-term (Within 1 week)

1. Conduct post-mortem meeting
2. Document root cause analysis
3. Create action items for prevention
4. Update monitoring and alerting if needed

### Long-term (Within 1 month)

1. Implement preventive measures
2. Update runbooks based on learnings
3. Conduct training if needed
4. Review and update incident response procedures

## Escalation Triggers

### Escalate to L2 if:

- Issue not resolved within 30 minutes
- Root cause not identified within 15 minutes
- Multiple services affected
- Database or infrastructure issues suspected

### Escalate to L3 if:

- Issue not resolved within 1 hour
- Customer communication needed
- Significant business impact
- External vendor involvement required

### Escalate to L4 if:

- Issue not resolved within 2 hours
- Media attention or regulatory concerns
- Major customer impact
- Executive decision making required

## Prevention Checklist

After resolution, consider:

- [ ] Are monitoring alerts adequate?
- [ ] Should we add more health checks?
- [ ] Do we need better error handling?
- [ ] Should we improve our deployment process?
- [ ] Do we need more redundancy?
- [ ] Should we update our capacity planning?
- [ ] Do we need better documentation?
- [ ] Should we conduct additional training?
