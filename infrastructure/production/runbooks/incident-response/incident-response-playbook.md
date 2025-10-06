# Incident Response Playbook

## Overview

This playbook provides step-by-step procedures for responding to production incidents in the Adaptive Learning Platform. It covers incident classification, escalation procedures, and resolution steps.

## Incident Classification

### Severity Levels

#### P0 - Critical (Complete Service Outage)

- **Definition**: Complete platform unavailability or data loss
- **Response Time**: Immediate (< 5 minutes)
- **Examples**:
  - All services down
  - Database corruption
  - Security breach
  - Data loss

#### P1 - High (Major Feature Unavailable)

- **Definition**: Core functionality severely impacted
- **Response Time**: < 15 minutes
- **Examples**:
  - Authentication service down
  - ML service unavailable
  - Payment processing failed
  - Major performance degradation

#### P2 - Medium (Minor Feature Impact)

- **Definition**: Non-critical features affected
- **Response Time**: < 1 hour
- **Examples**:
  - Notification delays
  - Content sync issues
  - Minor UI problems
  - Reporting delays

#### P3 - Low (Cosmetic Issues)

- **Definition**: Minor issues with workarounds
- **Response Time**: < 4 hours
- **Examples**:
  - UI styling issues
  - Non-critical logging errors
  - Documentation problems

## Incident Response Process

### 1. Detection and Alert

#### Automated Detection

- Monitoring alerts (Prometheus/Grafana)
- Health check failures
- Error rate thresholds exceeded
- Performance degradation alerts

#### Manual Detection

- User reports
- Support tickets
- Team member observations

### 2. Initial Response (First 5 Minutes)

```bash
# 1. Acknowledge the incident
echo "Incident acknowledged at $(date)" >> /tmp/incident.log

# 2. Check overall system status
kubectl get pods --all-namespaces | grep -v Running

# 3. Check service health endpoints
curl -f https://api.adaptivelearning.com/health
curl -f https://api.adaptivelearning.com/auth/health
curl -f https://api.adaptivelearning.com/users/health

# 4. Check recent deployments
kubectl rollout history deployment/auth-service -n adaptive-learning-production
```

### 3. Assessment and Classification

#### Quick Assessment Checklist

- [ ] Determine scope of impact (users affected, services down)
- [ ] Classify severity level (P0-P3)
- [ ] Identify potential root cause
- [ ] Check if recent changes could be related
- [ ] Estimate time to resolution

#### Impact Assessment Commands

```bash
# Check error rates
kubectl logs deployment/auth-service -n adaptive-learning-production --tail=100 | grep ERROR

# Check resource usage
kubectl top pods -n adaptive-learning-production

# Check database connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432

# Check external dependencies
curl -f https://auth0.com/health
```

### 4. Communication

#### Internal Communication

- **Slack Channel**: #incidents
- **War Room**: Create dedicated channel for P0/P1 incidents
- **Status Updates**: Every 15 minutes for P0/P1, hourly for P2/P3

#### External Communication

- **Status Page**: https://status.adaptivelearning.com
- **Customer Support**: Notify support team
- **Stakeholders**: Email updates for P0/P1 incidents

#### Communication Templates

**Initial Alert**:

```
🚨 INCIDENT ALERT - P[X]
Service: [Service Name]
Impact: [Brief description]
Started: [Timestamp]
Investigating: [Team Member]
Status Page: Updated
```

**Update Template**:

```
📊 INCIDENT UPDATE - P[X]
Service: [Service Name]
Status: [Investigating/Identified/Monitoring/Resolved]
Progress: [What's been done]
Next Steps: [What's next]
ETA: [Estimated resolution time]
```

### 5. Escalation Procedures

#### P0/P1 Escalation Chain

1. **On-Call Engineer** (Immediate)
2. **Engineering Manager** (15 minutes)
3. **VP Engineering** (30 minutes)
4. **CTO** (1 hour)

#### Contact Information

```bash
# Get on-call rotation
curl -s "https://api.pagerduty.com/oncalls" -H "Authorization: Token token=YOUR_TOKEN"

# Emergency contacts
echo "Primary On-Call: $(cat /etc/oncall/primary)"
echo "Secondary On-Call: $(cat /etc/oncall/secondary)"
```

## Common Incident Scenarios

### Scenario 1: Authentication Service Down

#### Symptoms

- Users cannot log in
- 500 errors on /auth endpoints
- High error rate alerts

#### Investigation Steps

```bash
# 1. Check auth service status
kubectl get pods -l app=auth-service -n adaptive-learning-production

# 2. Check logs for errors
kubectl logs deployment/auth-service -n adaptive-learning-production --tail=50

# 3. Check database connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432

# 4. Check OAuth provider status
curl -f https://auth0.com/.well-known/openid_configuration
```

#### Resolution Steps

```bash
# 1. Restart auth service if needed
kubectl rollout restart deployment/auth-service -n adaptive-learning-production

# 2. Scale up replicas if resource issue
kubectl scale deployment auth-service --replicas=5 -n adaptive-learning-production

# 3. Rollback if recent deployment issue
kubectl rollout undo deployment/auth-service -n adaptive-learning-production

# 4. Check and fix database issues if needed
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT 1;"
```

### Scenario 2: Database Performance Issues

#### Symptoms

- Slow response times
- Database connection timeouts
- High database CPU/memory usage

#### Investigation Steps

```bash
# 1. Check database metrics
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 2. Check connection count
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT count(*) as connections, state
FROM pg_stat_activity
GROUP BY state;"

# 3. Check slow queries
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"
```

#### Resolution Steps

```bash
# 1. Kill long-running queries if needed
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes';"

# 2. Scale up database resources
kubectl patch statefulset postgres -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgres","resources":{"requests":{"cpu":"2","memory":"4Gi"}}}]}}}}'

# 3. Enable connection pooling if not active
kubectl patch configmap postgres-config --patch '{"data":{"max_connections":"200"}}'
```

### Scenario 3: ML Service Prediction Failures

#### Symptoms

- ML prediction errors in logs
- Fallback algorithms being used
- User experience degradation

#### Investigation Steps

```bash
# 1. Check ML service status
kubectl get pods -l app=ml-service -n adaptive-learning-production

# 2. Check model loading errors
kubectl logs deployment/ml-service -n adaptive-learning-production | grep "model"

# 3. Check MLflow model registry
curl -f http://mlflow:5000/api/2.0/mlflow/registered-models/list

# 4. Check GPU resources if applicable
kubectl describe nodes | grep -A 5 "nvidia.com/gpu"
```

#### Resolution Steps

```bash
# 1. Restart ML service
kubectl rollout restart deployment/ml-service -n adaptive-learning-production

# 2. Rollback to previous model version
kubectl patch deployment ml-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"ml-service","env":[{"name":"MODEL_VERSION","value":"v1.2.0"}]}]}}}}'

# 3. Scale up ML service replicas
kubectl scale deployment ml-service --replicas=3 -n adaptive-learning-production
```

### Scenario 4: High Traffic / DDoS Attack

#### Symptoms

- Extremely high request rates
- Resource exhaustion
- Legitimate users unable to access service

#### Investigation Steps

```bash
# 1. Check request rates by IP
kubectl logs deployment/kong-gateway | awk '{print $1}' | sort | uniq -c | sort -nr | head -20

# 2. Check rate limiting status
kubectl get configmap kong-config -o yaml | grep rate-limit

# 3. Check resource usage
kubectl top pods --all-namespaces | sort -k 3 -nr
```

#### Resolution Steps

```bash
# 1. Enable aggressive rate limiting
kubectl patch configmap kong-config --patch '{"data":{"rate-limit":"10"}}'

# 2. Block suspicious IPs
kubectl patch configmap kong-config --patch '{"data":{"blocked-ips":"1.2.3.4,5.6.7.8"}}'

# 3. Scale up services
kubectl scale deployment auth-service --replicas=10 -n adaptive-learning-production
kubectl scale deployment user-service --replicas=10 -n adaptive-learning-production

# 4. Enable CDN caching if not active
# Update ingress annotations for caching
```

## Recovery Procedures

### Service Recovery Checklist

- [ ] Service is responding to health checks
- [ ] Error rates back to normal levels
- [ ] Response times within acceptable range
- [ ] All dependent services functioning
- [ ] User-facing functionality verified
- [ ] Monitoring alerts cleared

### Data Recovery Procedures

#### Database Recovery

```bash
# 1. Stop application services
kubectl scale deployment auth-service --replicas=0 -n adaptive-learning-production

# 2. Restore from backup
kubectl exec -it postgres-0 -- pg_restore -U postgres -d adaptive_learning /backups/latest.dump

# 3. Verify data integrity
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT COUNT(*) FROM users;"

# 4. Restart services
kubectl scale deployment auth-service --replicas=3 -n adaptive-learning-production
```

#### Cache Recovery

```bash
# 1. Clear corrupted cache
kubectl exec -it redis-0 -- redis-cli FLUSHALL

# 2. Warm cache with critical data
kubectl exec -it deployment/user-service -- curl -X POST http://localhost:3002/cache/warm
```

## Post-Incident Activities

### Immediate (0-2 hours after resolution)

- [ ] Confirm all services are stable
- [ ] Update status page with resolution
- [ ] Send resolution communication
- [ ] Document timeline and actions taken

### Short-term (2-24 hours)

- [ ] Conduct post-incident review meeting
- [ ] Create incident report
- [ ] Identify root cause
- [ ] Plan preventive measures

### Long-term (1-7 days)

- [ ] Implement preventive measures
- [ ] Update monitoring and alerting
- [ ] Update runbooks and procedures
- [ ] Share lessons learned with team

## Incident Report Template

```markdown
# Incident Report - [Date] - [Brief Description]

## Summary

- **Incident ID**: INC-YYYY-MMDD-XXX
- **Severity**: P[X]
- **Duration**: [Start Time] - [End Time] ([Duration])
- **Services Affected**: [List of services]
- **Users Impacted**: [Number/percentage]

## Timeline

- **[Time]**: Incident detected
- **[Time]**: Initial response started
- **[Time]**: Root cause identified
- **[Time]**: Fix implemented
- **[Time]**: Service restored
- **[Time]**: Incident closed

## Root Cause

[Detailed explanation of what caused the incident]

## Resolution

[What was done to resolve the incident]

## Impact Assessment

- **User Impact**: [Description]
- **Business Impact**: [Revenue/reputation impact]
- **Data Impact**: [Any data loss or corruption]

## Lessons Learned

### What Went Well

- [List positive aspects of response]

### What Could Be Improved

- [List areas for improvement]

## Action Items

- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]

## Prevention Measures

[Steps to prevent similar incidents in the future]
```

## Tools and Resources

### Monitoring Dashboards

- **Grafana**: https://monitoring.adaptivelearning.com
- **Prometheus**: https://prometheus.adaptivelearning.com
- **Jaeger Tracing**: https://tracing.adaptivelearning.com

### Log Aggregation

- **ELK Stack**: https://logs.adaptivelearning.com
- **Kubectl Logs**: `kubectl logs -f deployment/[service] -n adaptive-learning-production`

### Communication Tools

- **Slack**: #incidents channel
- **PagerDuty**: https://adaptivelearning.pagerduty.com
- **Status Page**: https://status.adaptivelearning.com

### Documentation

- **Runbooks**: `/infrastructure/production/runbooks/`
- **Architecture Docs**: `/docs/architecture/`
- **API Docs**: https://api-docs.adaptivelearning.com
