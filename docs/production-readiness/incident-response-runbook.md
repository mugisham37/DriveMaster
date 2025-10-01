# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to incidents in the DriveMaster platform. It covers common scenarios, escalation procedures, and recovery steps.

## Incident Classification

### Severity Levels

#### P0 - Critical (Complete Service Outage)

- **Response Time:** 15 minutes
- **Examples:** Complete platform down, data loss, security breach
- **Escalation:** Immediate escalation to on-call engineer and management

#### P1 - High (Major Feature Impacted)

- **Response Time:** 1 hour
- **Examples:** Learning engine down, authentication issues, payment failures
- **Escalation:** On-call engineer, escalate to team lead if not resolved in 2 hours

#### P2 - Medium (Minor Feature Impacted)

- **Response Time:** 4 hours
- **Examples:** Notification delays, analytics issues, non-critical API errors
- **Escalation:** Assigned to next available engineer

#### P3 - Low (Cosmetic or Enhancement)

- **Response Time:** 24 hours
- **Examples:** UI glitches, performance optimization, feature requests
- **Escalation:** Standard development workflow

## Common Incident Scenarios

### 1. Service Unavailability

#### Symptoms

- Health check failures
- 5xx HTTP status codes
- Service discovery issues
- Circuit breaker activation

#### Immediate Actions

1. **Check Service Status**

   ```bash
   kubectl get pods -n drivemaster
   kubectl describe pod <pod-name> -n drivemaster
   kubectl logs <pod-name> -n drivemaster --tail=100
   ```

2. **Check Resource Usage**

   ```bash
   kubectl top pods -n drivemaster
   kubectl top nodes
   ```

3. **Check Dependencies**
   - Database connectivity
   - Redis availability
   - Kafka cluster status
   - External API dependencies

#### Recovery Steps

1. **Restart Service**

   ```bash
   kubectl rollout restart deployment/<service-name> -n drivemaster
   kubectl rollout status deployment/<service-name> -n drivemaster
   ```

2. **Scale Up if Resource Constrained**

   ```bash
   kubectl scale deployment/<service-name> --replicas=5 -n drivemaster
   ```

3. **Check and Fix Configuration**
   ```bash
   kubectl get configmap -n drivemaster
   kubectl describe configmap <config-name> -n drivemaster
   ```

### 2. Database Issues

#### Symptoms

- Connection timeouts
- Slow query performance
- Lock contention
- Replication lag

#### Immediate Actions

1. **Check Database Status**

   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   SELECT * FROM pg_stat_replication;
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

2. **Check Connection Pool**

   ```bash
   # Check PgBouncer status
   psql -h pgbouncer-host -p 6432 -U admin pgbouncer -c "SHOW POOLS;"
   psql -h pgbouncer-host -p 6432 -U admin pgbouncer -c "SHOW CLIENTS;"
   ```

3. **Monitor Resource Usage**
   ```sql
   SELECT * FROM pg_stat_database WHERE datname = 'drivemaster_prod';
   ```

#### Recovery Steps

1. **Kill Long-Running Queries**

   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
   ```

2. **Restart Connection Pool**

   ```bash
   kubectl rollout restart deployment/pgbouncer -n drivemaster
   ```

3. **Failover to Read Replica (if needed)**
   ```bash
   # Update service to point to read replica
   kubectl patch service postgres-service -n drivemaster -p '{"spec":{"selector":{"app":"postgres-replica"}}}'
   ```

### 3. High Memory Usage

#### Symptoms

- OOMKilled pods
- Slow response times
- Memory alerts firing

#### Immediate Actions

1. **Check Memory Usage**

   ```bash
   kubectl top pods -n drivemaster --sort-by=memory
   kubectl describe node <node-name>
   ```

2. **Check for Memory Leaks**
   ```bash
   kubectl exec -it <pod-name> -n drivemaster -- ps aux --sort=-%mem
   ```

#### Recovery Steps

1. **Restart High-Memory Pods**

   ```bash
   kubectl delete pod <high-memory-pod> -n drivemaster
   ```

2. **Scale Down Non-Critical Services**

   ```bash
   kubectl scale deployment/analytics-svc --replicas=1 -n drivemaster
   ```

3. **Increase Memory Limits (if needed)**
   ```yaml
   # Update deployment with higher memory limits
   resources:
     limits:
       memory: '2Gi'
     requests:
       memory: '1Gi'
   ```

### 4. High CPU Usage

#### Symptoms

- CPU throttling
- Slow response times
- CPU alerts firing

#### Immediate Actions

1. **Check CPU Usage**

   ```bash
   kubectl top pods -n drivemaster --sort-by=cpu
   kubectl top nodes
   ```

2. **Identify CPU-Intensive Processes**
   ```bash
   kubectl exec -it <pod-name> -n drivemaster -- top
   ```

#### Recovery Steps

1. **Scale Up Services**

   ```bash
   kubectl scale deployment/<service-name> --replicas=5 -n drivemaster
   ```

2. **Check for Infinite Loops or Inefficient Code**
   - Review recent deployments
   - Check application logs for errors
   - Monitor specific endpoints causing high CPU

### 5. Network Issues

#### Symptoms

- Connection timeouts
- DNS resolution failures
- Service mesh issues

#### Immediate Actions

1. **Check Network Connectivity**

   ```bash
   kubectl exec -it <pod-name> -n drivemaster -- nslookup <service-name>
   kubectl exec -it <pod-name> -n drivemaster -- curl -I http://<service-name>:3000/health
   ```

2. **Check Service Mesh Status**
   ```bash
   kubectl get pods -n istio-system
   istioctl proxy-status
   ```

#### Recovery Steps

1. **Restart Network Components**

   ```bash
   kubectl rollout restart daemonset/istio-proxy -n istio-system
   ```

2. **Check and Update Network Policies**
   ```bash
   kubectl get networkpolicies -n drivemaster
   ```

## Escalation Procedures

### On-Call Rotation

- **Primary On-Call:** Available 24/7, responds within 15 minutes
- **Secondary On-Call:** Backup support, escalated after 30 minutes
- **Engineering Manager:** Escalated for P0 incidents or after 1 hour for P1

### Contact Information

```
Primary On-Call: +1-XXX-XXX-XXXX (PagerDuty)
Secondary On-Call: +1-XXX-XXX-XXXX (PagerDuty)
Engineering Manager: +1-XXX-XXX-XXXX
DevOps Lead: +1-XXX-XXX-XXXX
```

### Escalation Timeline

- **0-15 minutes:** Primary on-call responds
- **15-30 minutes:** If no response, escalate to secondary on-call
- **30-60 minutes:** Escalate to engineering manager
- **60+ minutes:** Escalate to VP of Engineering

## Communication Procedures

### Internal Communication

1. **Create Incident Channel**

   ```
   #incident-YYYY-MM-DD-brief-description
   ```

2. **Post Initial Update**

   ```
   🚨 INCIDENT DETECTED
   Severity: P1
   Impact: User authentication failing
   Started: 2025-01-01 14:30 UTC
   Assigned: @engineer-name
   ```

3. **Regular Updates (every 15 minutes for P0/P1)**
   ```
   UPDATE: Still investigating authentication issues
   Actions taken: Restarted auth service, checking database
   Next steps: Reviewing recent deployments
   ETA: 15 minutes
   ```

### External Communication

1. **Status Page Updates**
   - Update status.drivemaster.com
   - Post on social media if widespread impact

2. **Customer Communication**
   - Email notifications for extended outages
   - In-app notifications when service restored

## Post-Incident Procedures

### Immediate Post-Incident (within 24 hours)

1. **Service Restoration Confirmation**
   - Verify all services are healthy
   - Run smoke tests
   - Monitor for 2 hours post-resolution

2. **Initial Timeline Documentation**
   - Document incident timeline
   - Identify root cause
   - List actions taken

### Post-Incident Review (within 1 week)

1. **Conduct Blameless Post-Mortem**
   - What happened?
   - What went well?
   - What could be improved?
   - Action items with owners and deadlines

2. **Update Runbooks and Procedures**
   - Document new scenarios
   - Update escalation procedures
   - Improve monitoring and alerting

## Monitoring and Alerting

### Key Metrics to Monitor

- **Response Time:** P95 < 100ms
- **Error Rate:** < 0.1%
- **Uptime:** > 99.99%
- **CPU Usage:** < 70%
- **Memory Usage:** < 80%
- **Database Connections:** < 80% of pool

### Alert Channels

- **PagerDuty:** P0 and P1 incidents
- **Slack:** All incidents and warnings
- **Email:** Daily summaries and P2+ incidents

### Grafana Dashboards

- **System Overview:** http://grafana.drivemaster.com/d/system-overview
- **Service Health:** http://grafana.drivemaster.com/d/service-health
- **Database Metrics:** http://grafana.drivemaster.com/d/database-metrics

## Tools and Access

### Required Tools

- **kubectl:** Kubernetes cluster access
- **psql:** Database access
- **redis-cli:** Redis access
- **istioctl:** Service mesh management

### Access Requirements

- **VPN:** Required for production access
- **MFA:** Multi-factor authentication enabled
- **SSH Keys:** Registered SSH keys for server access

### Emergency Access

- **Break-Glass Account:** emergency@drivemaster.com
- **Emergency Contacts:** Stored in password manager
- **Backup Access:** Secondary authentication methods

---

**Last Updated:** 2025-01-01  
**Next Review:** 2025-04-01  
**Owner:** DevOps Team
