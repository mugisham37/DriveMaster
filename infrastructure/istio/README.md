# Istio Service Mesh Configuration

This directory contains the Istio service mesh configuration for the Adaptive Learning Platform.

## Overview

Istio provides:

- **Mutual TLS (mTLS)** between all services
- **Traffic management** with load balancing and circuit breaking
- **Security policies** with fine-grained authorization
- **Observability** with distributed tracing and metrics
- **Resilience** with retries, timeouts, and fault injection

## Architecture

```
Internet
    ↓
Istio Ingress Gateway
    ↓
Virtual Services (Routing Rules)
    ↓
Services with Envoy Sidecars
    ↓
Destination Rules (Load Balancing, Circuit Breaking)
```

## Components

### Core Configuration Files

1. **install-istio.sh**: Installation script for Istio control plane
2. **gateway.yaml**: Ingress gateway and virtual service routing
3. **destination-rules.yaml**: Traffic policies and circuit breaking
4. **security-policies.yaml**: mTLS and authorization policies
5. **telemetry.yaml**: Observability and tracing configuration

### Key Features

#### Traffic Management

- **Load Balancing**: Round-robin, least connection, and random algorithms
- **Circuit Breaking**: Automatic failure detection and traffic isolation
- **Retries**: Configurable retry policies with exponential backoff
- **Timeouts**: Service-specific timeout configurations
- **Traffic Splitting**: A/B testing and canary deployments

#### Security

- **Mutual TLS**: Automatic encryption between all services
- **Authorization Policies**: Fine-grained access control
- **JWT Validation**: Token-based authentication
- **Rate Limiting**: Request rate controls per service

#### Observability

- **Distributed Tracing**: Request flow across services
- **Metrics Collection**: Prometheus-compatible metrics
- **Access Logging**: Structured request logs
- **Service Topology**: Visual service mesh representation

## Installation

### Prerequisites

1. **Kubernetes Cluster**: Running cluster with kubectl access
2. **Sufficient Resources**: At least 4 CPU cores and 8GB RAM
3. **Network Connectivity**: Internet access for downloading Istio

### Quick Start

1. **Install Istio:**

   ```bash
   cd infrastructure/istio
   chmod +x install-istio.sh
   ./install-istio.sh
   ```

2. **Apply Configuration:**

   ```bash
   kubectl apply -f gateway.yaml
   kubectl apply -f destination-rules.yaml
   kubectl apply -f security-policies.yaml
   kubectl apply -f telemetry.yaml
   ```

3. **Verify Installation:**
   ```bash
   kubectl get pods -n istio-system
   kubectl get pods -n adaptive-learning
   ```

### Manual Installation Steps

If you prefer manual installation:

```bash
# Download and install Istio
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-1.19.3/bin:$PATH

# Install Istio control plane
istioctl install --set values.defaultRevision=default -y

# Enable sidecar injection
kubectl label namespace adaptive-learning istio-injection=enabled

# Install observability addons
kubectl apply -f istio-1.19.3/samples/addons/
```

## Service Configuration

### Gateway and Virtual Services

The gateway configuration provides:

- **HTTPS Termination**: SSL/TLS termination at the edge
- **Host-based Routing**: Different hosts for API and admin interfaces
- **Path-based Routing**: Service routing based on URL paths
- **Automatic HTTPS Redirect**: HTTP to HTTPS redirection

### Destination Rules

Each service has specific traffic policies:

#### Authentication Service

- **Load Balancer**: Least connection
- **Max Connections**: 100
- **Timeout**: 30s
- **Retries**: 3 attempts

#### User Service

- **Load Balancer**: Round robin
- **Max Connections**: 200
- **Timeout**: 30s
- **Retries**: 3 attempts

#### Content Service

- **Load Balancer**: Least connection
- **Max Connections**: 150
- **Timeout**: 60s (longer for content operations)
- **Retries**: 2 attempts

#### Scheduler Service

- **Load Balancer**: Round robin
- **Max Connections**: 300
- **Timeout**: 15s (fast response required)
- **Retries**: 3 attempts

#### ML Service

- **Load Balancer**: Least connection
- **Max Connections**: 50
- **Timeout**: 120s (ML inference can be slow)
- **Retries**: 2 attempts

#### Event Service

- **Load Balancer**: Round robin
- **Max Connections**: 500 (high throughput)
- **Timeout**: 10s
- **Retries**: 3 attempts

#### Notification Service

- **Load Balancer**: Round robin
- **Max Connections**: 100
- **Timeout**: 30s
- **Retries**: 3 attempts

### Security Policies

#### Mutual TLS

- **Mode**: STRICT (required for all communication)
- **Scope**: All services in adaptive-learning namespace
- **Certificates**: Automatically managed by Istio

#### Authorization Policies

- **Auth Service**: Public access (no authentication required)
- **Other Services**: JWT authentication required
- **Internal Communication**: Service account-based authorization

### Circuit Breaking

Circuit breaker settings per service:

- **Consecutive Errors**: 5 errors trigger circuit opening
- **Interval**: 30s monitoring window
- **Base Ejection Time**: 30s minimum ejection period
- **Max Ejection Percent**: 50% maximum unhealthy instances

## Observability

### Accessing Dashboards

```bash
# Kiali (Service Mesh Visualization)
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Access: http://localhost:20001

# Grafana (Metrics Dashboard)
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Access: http://localhost:3000

# Jaeger (Distributed Tracing)
kubectl port-forward -n istio-system svc/jaeger 16686:16686
# Access: http://localhost:16686

# Prometheus (Metrics Collection)
kubectl port-forward -n istio-system svc/prometheus 9090:9090
# Access: http://localhost:9090
```

### Key Metrics

Monitor these important metrics:

- **Request Rate**: Requests per second per service
- **Error Rate**: 4xx and 5xx error percentages
- **Response Time**: P50, P95, P99 latencies
- **Circuit Breaker Status**: Open/closed state
- **Connection Pool**: Active connections and queue depth

### Distributed Tracing

Traces include:

- **Request Flow**: Complete request path through services
- **Timing Information**: Time spent in each service
- **Error Information**: Detailed error context
- **Custom Tags**: User ID, service version, request ID

## Troubleshooting

### Common Issues

1. **Sidecar Not Injected**

   ```bash
   # Check namespace label
   kubectl get namespace adaptive-learning --show-labels

   # Re-label if needed
   kubectl label namespace adaptive-learning istio-injection=enabled --overwrite
   ```

2. **mTLS Connection Issues**

   ```bash
   # Check peer authentication
   kubectl get peerauthentication -n adaptive-learning

   # Verify destination rules
   kubectl get destinationrule -n adaptive-learning
   ```

3. **Gateway Not Working**

   ```bash
   # Check gateway status
   kubectl get gateway -n adaptive-learning

   # Verify virtual service
   kubectl get virtualservice -n adaptive-learning
   ```

4. **High Error Rates**
   ```bash
   # Check circuit breaker status
   kubectl exec -n adaptive-learning deployment/scheduler-service -c istio-proxy -- pilot-agent request GET stats/config_dump | grep circuit_breakers
   ```

### Health Checks

```bash
# Istio control plane health
kubectl get pods -n istio-system

# Sidecar injection status
kubectl get pods -n adaptive-learning -o jsonpath='{.items[*].spec.containers[*].name}'

# Configuration validation
istioctl analyze -n adaptive-learning

# Proxy configuration
istioctl proxy-config cluster <pod-name> -n adaptive-learning
```

## Performance Tuning

### Resource Allocation

Recommended resource limits:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

### Connection Pool Tuning

Adjust based on service characteristics:

- **High Throughput Services**: Increase max connections
- **CPU Intensive Services**: Reduce connections per service
- **I/O Bound Services**: Increase connection timeout

### Circuit Breaker Tuning

Fine-tune based on service behavior:

- **Stable Services**: Higher error thresholds
- **Experimental Services**: Lower error thresholds
- **Critical Path Services**: Faster recovery times

## Security Best Practices

1. **Principle of Least Privilege**: Minimal required permissions
2. **Service Account Isolation**: Unique service accounts per service
3. **Network Policies**: Additional network-level restrictions
4. **Regular Updates**: Keep Istio version current
5. **Certificate Rotation**: Automatic certificate management

## Production Considerations

### High Availability

- **Multi-zone Deployment**: Distribute across availability zones
- **Control Plane Redundancy**: Multiple Istio control plane instances
- **Data Plane Resilience**: Circuit breakers and retries

### Monitoring and Alerting

- **SLI/SLO Definition**: Service level indicators and objectives
- **Alert Rules**: Proactive monitoring and alerting
- **Runbook Documentation**: Incident response procedures

### Capacity Planning

- **Resource Monitoring**: CPU, memory, and network usage
- **Scaling Policies**: Horizontal pod autoscaling
- **Load Testing**: Regular performance validation
