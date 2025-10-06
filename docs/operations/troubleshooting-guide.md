# Troubleshooting Guide

## Overview

This guide provides step-by-step troubleshooting procedures for common issues in the Adaptive Learning Platform. It's organized by service and includes diagnostic commands, common solutions, and escalation procedures.

## General Troubleshooting Approach

### 1. Initial Assessment

- Identify affected services and users
- Check monitoring dashboards for anomalies
- Review recent deployments or changes
- Gather error messages and logs

### 2. Diagnostic Commands

```bash
# Check overall system health
kubectl get pods --all-namespaces | grep -v Running

# Check service endpoints
kubectl get endpoints -n adaptive-learning-production

# Check recent events
kubectl get events --sort-by=.metadata.creationTimestamp -n adaptive-learning-production

# Check resource usage
kubectl top pods -n adaptive-learning-production
```

### 3. Log Analysis

```bash
# View service logs
kubectl logs -f deployment/auth-service -n adaptive-learning-production --tail=100

# Search for errors
kubectl logs deployment/auth-service -n adaptive-learning-production | grep -i error

# Check multiple services
kubectl logs -l app=auth-service -n adaptive-learning-production --tail=50
```

## Service-Specific Troubleshooting

### Authentication Service Issues

#### Symptom: Users Cannot Log In

**Diagnostic Steps:**

```bash
# Check auth service status
kubectl get pods -l app=auth-service -n adaptive-learning-production

# Check auth service logs
kubectl logs deployment/auth-service -n adaptive-learning-production --tail=50

# Test auth endpoint
curl -f https://api.adaptivelearning.com/auth/health

# Check database connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432

# Check OAuth provider status
curl -f https://auth0.com/.well-known/openid_configuration
```

**Common Causes and Solutions:**

1. **Database Connection Issues**

   ```bash
   # Check database pod status
   kubectl get pods -l app=postgres -n infrastructure

   # Check connection pool
   kubectl exec -it postgres-0 -- psql -U postgres -c "
   SELECT count(*) as connections, state
   FROM pg_stat_activity
   GROUP BY state;"

   # Solution: Restart auth service or scale database
   kubectl rollout restart deployment/auth-service -n adaptive-learning-production
   ```

2. **OAuth Provider Issues**

   ```bash
   # Check external connectivity
   kubectl exec -it deployment/auth-service -n adaptive-learning-production -- curl -f https://auth0.com/health

   # Solution: Check OAuth configuration or use fallback
   kubectl patch configmap auth-config --patch '{"data":{"fallback_enabled":"true"}}'
   ```

3. **JWT Token Issues**

   ```bash
   # Check token signing key
   kubectl get secret jwt-signing-key -n adaptive-learning-production -o yaml

   # Solution: Rotate JWT keys if compromised
   kubectl delete secret jwt-signing-key -n adaptive-learning-production
   # Vault will regenerate automatically
   ```

#### Symptom: High Authentication Latency

**Diagnostic Steps:**

```bash
# Check response times
kubectl logs deployment/auth-service -n adaptive-learning-production | grep "response_time"

# Check database query performance
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%auth%'
ORDER BY mean_time DESC
LIMIT 10;"
```

**Solutions:**

```bash
# Scale auth service
kubectl scale deployment auth-service --replicas=5 -n adaptive-learning-production

# Enable Redis caching for tokens
kubectl patch configmap auth-config --patch '{"data":{"cache_enabled":"true"}}'

# Optimize database queries
kubectl exec -it postgres-0 -- psql -U postgres -c "REINDEX TABLE users;"
```

### User Service Issues

#### Symptom: Progress Not Updating

**Diagnostic Steps:**

```bash
# Check user service logs
kubectl logs deployment/user-service -n adaptive-learning-production | grep -i progress

# Check Kafka connectivity
kubectl exec -it deployment/user-service -n adaptive-learning-production -- nc -zv kafka 9092

# Check Redis connectivity
kubectl exec -it deployment/user-service -n adaptive-learning-production -- redis-cli -h redis ping
```

**Common Solutions:**

```bash
# Restart user service
kubectl rollout restart deployment/user-service -n adaptive-learning-production

# Clear Redis cache if corrupted
kubectl exec -it redis-0 -- redis-cli FLUSHDB

# Check Kafka consumer lag
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group user-service
```

#### Symptom: Database Deadlocks

**Diagnostic Steps:**

```bash
# Check for deadlocks
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"
```

**Solutions:**

```bash
# Kill blocking queries
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
AND query_start < now() - interval '5 minutes';"

# Optimize locking strategy
kubectl patch configmap user-service-config --patch '{"data":{"lock_timeout":"30s"}}'
```

### Scheduler Service Issues

#### Symptom: Slow Item Selection

**Diagnostic Steps:**

```bash
# Check scheduler service performance
kubectl logs deployment/scheduler-service -n adaptive-learning-production | grep "selection_time"

# Check Redis latency
kubectl exec -it redis-0 -- redis-cli --latency-history -i 1

# Check ML service connectivity
kubectl exec -it deployment/scheduler-service -n adaptive-learning-production -- nc -zv ml-service 3005
```

**Solutions:**

```bash
# Scale scheduler service
kubectl scale deployment scheduler-service --replicas=3 -n adaptive-learning-production

# Warm Redis cache
kubectl exec -it deployment/scheduler-service -n adaptive-learning-production -- curl -X POST http://localhost:3003/cache/warm

# Use fallback algorithm if ML service slow
kubectl patch configmap scheduler-config --patch '{"data":{"fallback_enabled":"true"}}'
```

#### Symptom: Algorithm Errors

**Diagnostic Steps:**

```bash
# Check algorithm errors
kubectl logs deployment/scheduler-service -n adaptive-learning-production | grep -i "algorithm\|sm2\|bkt\|irt"

# Check user state consistency
kubectl exec -it redis-0 -- redis-cli GET "scheduler:user_123"
```

**Solutions:**

```bash
# Reset user state if corrupted
kubectl exec -it deployment/scheduler-service -n adaptive-learning-production -- curl -X POST http://localhost:3003/users/user_123/reset-state

# Rollback to previous algorithm version
kubectl patch deployment scheduler-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"scheduler-service","env":[{"name":"ALGORITHM_VERSION","value":"v1.0.0"}]}]}}}}'
```

### ML Service Issues

#### Symptom: Model Loading Failures

**Diagnostic Steps:**

```bash
# Check ML service logs
kubectl logs deployment/ml-service -n adaptive-learning-production | grep -i "model\|loading"

# Check MLflow connectivity
kubectl exec -it deployment/ml-service -n adaptive-learning-production -- curl -f http://mlflow:5000/health

# Check GPU resources
kubectl describe nodes | grep -A 5 "nvidia.com/gpu"
```

**Solutions:**

```bash
# Restart ML service
kubectl rollout restart deployment/ml-service -n adaptive-learning-production

# Rollback to previous model
kubectl patch deployment ml-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"ml-service","env":[{"name":"MODEL_VERSION","value":"v1.2.0"}]}]}}}}'

# Scale up if resource constrained
kubectl scale deployment ml-service --replicas=3 -n adaptive-learning-production
```

#### Symptom: Prediction Timeouts

**Diagnostic Steps:**

```bash
# Check prediction latency
kubectl logs deployment/ml-service -n adaptive-learning-production | grep "prediction_time"

# Check model size and complexity
kubectl exec -it deployment/ml-service -n adaptive-learning-production -- python -c "
import torch
model = torch.load('/models/current.pt')
print(f'Model parameters: {sum(p.numel() for p in model.parameters())}')"
```

**Solutions:**

```bash
# Enable prediction caching
kubectl patch configmap ml-service-config --patch '{"data":{"cache_predictions":"true"}}'

# Use smaller model variant
kubectl patch deployment ml-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"ml-service","env":[{"name":"MODEL_VARIANT","value":"small"}]}]}}}}'

# Increase timeout
kubectl patch configmap ml-service-config --patch '{"data":{"prediction_timeout":"10s"}}'
```

### Database Issues

#### Symptom: High Database Load

**Diagnostic Steps:**

```bash
# Check database metrics
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    temp_files,
    temp_bytes
FROM pg_stat_database
WHERE datname = 'adaptive_learning';"

# Check slow queries
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Check connection count
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT count(*) as connections, state, usename
FROM pg_stat_activity
GROUP BY state, usename
ORDER BY connections DESC;"
```

**Solutions:**

```bash
# Kill long-running queries
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes'
AND state = 'active';"

# Scale up database resources
kubectl patch statefulset postgres -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgres","resources":{"requests":{"cpu":"4","memory":"8Gi"}}}]}}}}'

# Enable connection pooling
kubectl patch configmap postgres-config --patch '{"data":{"max_connections":"200","shared_preload_libraries":"pg_stat_statements,pg_bouncer"}}'
```

#### Symptom: Database Connectivity Issues

**Diagnostic Steps:**

```bash
# Check database pod status
kubectl get pods -l app=postgres -n infrastructure

# Check database logs
kubectl logs postgres-0 -n infrastructure --tail=50

# Test connectivity from services
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv postgres 5432
```

**Solutions:**

```bash
# Restart database if needed (careful!)
kubectl delete pod postgres-0 -n infrastructure

# Check network policies
kubectl get networkpolicies -n adaptive-learning-production

# Verify service discovery
kubectl get endpoints postgres -n infrastructure
```

### Redis Issues

#### Symptom: Cache Misses

**Diagnostic Steps:**

```bash
# Check Redis stats
kubectl exec -it redis-0 -- redis-cli INFO stats

# Check memory usage
kubectl exec -it redis-0 -- redis-cli INFO memory

# Check key patterns
kubectl exec -it redis-0 -- redis-cli --scan --pattern "user:*" | head -10
```

**Solutions:**

```bash
# Warm cache
kubectl exec -it deployment/user-service -n adaptive-learning-production -- curl -X POST http://localhost:3002/cache/warm

# Increase memory if needed
kubectl patch statefulset redis -p '{"spec":{"template":{"spec":{"containers":[{"name":"redis","resources":{"requests":{"memory":"4Gi"}}}]}}}}'

# Clear corrupted cache
kubectl exec -it redis-0 -- redis-cli FLUSHDB
```

### Kafka Issues

#### Symptom: High Consumer Lag

**Diagnostic Steps:**

```bash
# Check consumer lag
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups

# Check topic details
kubectl exec -it kafka-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic user.attempts

# Check broker health
kubectl exec -it kafka-0 -- kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

**Solutions:**

```bash
# Scale up consumers
kubectl scale deployment user-service --replicas=5 -n adaptive-learning-production

# Increase partition count
kubectl exec -it kafka-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --alter --topic user.attempts --partitions 12

# Reset consumer group if needed
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group user-service --reset-offsets --to-latest --all-topics --execute
```

## Network and Connectivity Issues

### Symptom: Service-to-Service Communication Failures

**Diagnostic Steps:**

```bash
# Check service mesh status
kubectl get pods -n istio-system

# Check network policies
kubectl get networkpolicies -n adaptive-learning-production

# Test connectivity between services
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nc -zv user-service 3002
```

**Solutions:**

```bash
# Restart Istio components
kubectl rollout restart deployment/istiod -n istio-system

# Check and fix network policies
kubectl describe networkpolicy allow-auth-service -n adaptive-learning-production

# Verify service discovery
kubectl get endpoints -n adaptive-learning-production
```

### Symptom: External API Failures

**Diagnostic Steps:**

```bash
# Test external connectivity
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- curl -f https://auth0.com/health

# Check DNS resolution
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- nslookup auth0.com

# Check firewall rules
kubectl get networkpolicies -n adaptive-learning-production -o yaml
```

**Solutions:**

```bash
# Update network policies for external access
kubectl patch networkpolicy allow-auth-service -p '{"spec":{"egress":[{"to":[],"ports":[{"protocol":"TCP","port":443}]}]}}'

# Use alternative endpoints
kubectl patch configmap auth-config --patch '{"data":{"oauth_endpoint":"https://backup-auth0.com"}}'
```

## Performance Issues

### Symptom: High Response Times

**Diagnostic Steps:**

```bash
# Check service response times
kubectl logs deployment/auth-service -n adaptive-learning-production | grep "response_time" | tail -20

# Check resource usage
kubectl top pods -n adaptive-learning-production

# Check database performance
kubectl exec -it postgres-0 -- psql -U postgres -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;"
```

**Solutions:**

```bash
# Scale services horizontally
kubectl scale deployment auth-service --replicas=5 -n adaptive-learning-production

# Increase resource limits
kubectl patch deployment auth-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","resources":{"limits":{"cpu":"2","memory":"4Gi"}}}]}}}}'

# Enable caching
kubectl patch configmap auth-config --patch '{"data":{"cache_enabled":"true","cache_ttl":"300"}}'
```

### Symptom: Memory Leaks

**Diagnostic Steps:**

```bash
# Check memory usage over time
kubectl top pods -n adaptive-learning-production --sort-by=memory

# Check for memory leaks in logs
kubectl logs deployment/auth-service -n adaptive-learning-production | grep -i "memory\|leak\|gc"

# Get detailed memory stats
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- curl http://localhost:3001/metrics | grep memory
```

**Solutions:**

```bash
# Restart affected services
kubectl rollout restart deployment/auth-service -n adaptive-learning-production

# Increase memory limits temporarily
kubectl patch deployment auth-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","resources":{"limits":{"memory":"8Gi"}}}]}}}}'

# Enable memory profiling
kubectl patch deployment auth-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","env":[{"name":"ENABLE_PROFILING","value":"true"}]}]}}}}'
```

## Security Issues

### Symptom: Suspicious Activity Detected

**Diagnostic Steps:**

```bash
# Check Falco alerts
kubectl logs daemonset/falco -n falco-system | grep -i suspicious

# Check authentication logs
kubectl logs deployment/auth-service -n adaptive-learning-production | grep -i "failed\|suspicious\|blocked"

# Check rate limiting
kubectl logs deployment/kong-gateway -n kong | grep -i "rate.limit"
```

**Solutions:**

```bash
# Block suspicious IPs
kubectl patch configmap kong-config --patch '{"data":{"blocked_ips":"1.2.3.4,5.6.7.8"}}'

# Enable stricter rate limiting
kubectl patch configmap kong-config --patch '{"data":{"rate_limit":"10","rate_limit_window":"60"}}'

# Force password reset for affected users
kubectl exec -it deployment/auth-service -n adaptive-learning-production -- curl -X POST http://localhost:3001/admin/force-password-reset -d '{"user_ids":["user1","user2"]}'
```

## Escalation Procedures

### When to Escalate

1. **Immediate Escalation (P0)**:

   - Complete service outage
   - Data loss or corruption
   - Security breach
   - Multiple services affected

2. **Escalate within 30 minutes (P1)**:

   - Single service down
   - Performance severely degraded
   - Authentication failures
   - Database issues

3. **Escalate within 2 hours (P2)**:
   - Minor service issues
   - Performance slightly degraded
   - Non-critical features affected

### Escalation Contacts

```yaml
On-Call Rotation:
  Primary: DevOps Engineer (Slack: @devops-oncall)
  Secondary: Platform Engineer (Slack: @platform-oncall)
  Manager: Engineering Manager (Phone: +1-XXX-XXX-XXXX)

Specialist Teams:
  Database: DBA Team (Slack: #database-support)
  Security: Security Team (Slack: #security-incidents)
  ML/AI: ML Engineering Team (Slack: #ml-support)
```

### Escalation Information to Provide

1. **Incident Summary**: Brief description of the issue
2. **Impact Assessment**: Services and users affected
3. **Timeline**: When the issue started
4. **Steps Taken**: What troubleshooting has been attempted
5. **Current Status**: Is the issue ongoing or resolved
6. **Logs and Evidence**: Relevant log snippets and error messages

## Recovery Procedures

### Service Recovery Checklist

After resolving an issue:

- [ ] Verify all services are healthy
- [ ] Check monitoring dashboards
- [ ] Run smoke tests
- [ ] Verify user-facing functionality
- [ ] Clear any alerts
- [ ] Document the incident
- [ ] Schedule post-incident review

### Health Check Commands

```bash
# Overall system health
kubectl get pods --all-namespaces | grep -v Running

# Service endpoints
curl -f https://api.adaptivelearning.com/health
curl -f https://api.adaptivelearning.com/auth/health
curl -f https://api.adaptivelearning.com/users/health

# Database connectivity
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT 1;"

# Cache connectivity
kubectl exec -it redis-0 -- redis-cli ping

# Message queue
kubectl exec -it kafka-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --list
```

This troubleshooting guide should be updated regularly based on new issues encountered and lessons learned from incidents.
