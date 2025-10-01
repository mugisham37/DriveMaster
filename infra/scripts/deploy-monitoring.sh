#!/bin/bash

# DriveMaster Monitoring Stack Deployment Script
# This script deploys the complete monitoring and observability infrastructure

set -euo pipefail

# Configuration
NAMESPACE="drivemaster"
MONITORING_NAMESPACE="drivemaster-monitoring"
HELM_RELEASE_NAME="drivemaster"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespaces for monitoring
    kubectl label namespace $NAMESPACE monitoring=enabled --overwrite
    kubectl label namespace $MONITORING_NAMESPACE monitoring=enabled --overwrite
    
    log_success "Namespaces created"
}

# Add Helm repositories
add_helm_repos() {
    log_info "Adding Helm repositories..."
    
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo add elastic https://helm.elastic.co
    helm repo add bitnami https://charts.bitnami.com/bitnami
    
    helm repo update
    
    log_success "Helm repositories added and updated"
}

# Deploy Prometheus stack
deploy_prometheus() {
    log_info "Deploying Prometheus monitoring stack..."
    
    # Create Prometheus configuration
    kubectl apply -f infra/monitoring/prometheus/alerts/ -n $MONITORING_NAMESPACE
    
    # Deploy Prometheus using Helm
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $MONITORING_NAMESPACE \
        --set prometheus.prometheusSpec.retention=200h \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=fast-ssd \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.adminPassword=admin123 \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.storageClassName=fast-ssd \
        --set grafana.persistence.size=10Gi \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.storageClassName=fast-ssd \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
        --values infra/monitoring/prometheus/values.yaml \
        --wait
    
    log_success "Prometheus stack deployed"
}

# Deploy Jaeger tracing
deploy_jaeger() {
    log_info "Deploying Jaeger tracing..."
    
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace $MONITORING_NAMESPACE \
        --set provisionDataStore.cassandra=false \
        --set provisionDataStore.elasticsearch=true \
        --set storage.type=elasticsearch \
        --set storage.elasticsearch.host=elasticsearch-master \
        --set storage.elasticsearch.port=9200 \
        --wait
    
    log_success "Jaeger deployed"
}

# Deploy Loki for log aggregation
deploy_loki() {
    log_info "Deploying Loki for log aggregation..."
    
    helm upgrade --install loki grafana/loki-stack \
        --namespace $MONITORING_NAMESPACE \
        --set loki.persistence.enabled=true \
        --set loki.persistence.storageClassName=fast-ssd \
        --set loki.persistence.size=50Gi \
        --set promtail.enabled=true \
        --wait
    
    log_success "Loki deployed"
}

# Deploy OpenTelemetry Collector
deploy_otel_collector() {
    log_info "Deploying OpenTelemetry Collector..."
    
    # Apply OpenTelemetry Collector configuration
    kubectl apply -f infra/monitoring/otel/ -n $MONITORING_NAMESPACE
    
    log_success "OpenTelemetry Collector deployed"
}

# Configure Grafana dashboards
configure_grafana_dashboards() {
    log_info "Configuring Grafana dashboards..."
    
    # Wait for Grafana to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n $MONITORING_NAMESPACE --timeout=300s
    
    # Create ConfigMaps for dashboards
    kubectl create configmap grafana-dashboards \
        --from-file=infra/monitoring/grafana/dashboards/ \
        -n $MONITORING_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Restart Grafana to pick up new dashboards
    kubectl rollout restart deployment/prometheus-grafana -n $MONITORING_NAMESPACE
    
    log_success "Grafana dashboards configured"
}

# Deploy SLO monitoring
deploy_slo_monitoring() {
    log_info "Deploying SLO monitoring..."
    
    kubectl apply -f infra/monitoring/slo/ -n $MONITORING_NAMESPACE
    
    log_success "SLO monitoring deployed"
}

# Deploy chaos engineering tools
deploy_chaos_engineering() {
    log_info "Deploying chaos engineering tools..."
    
    # Install Chaos Mesh (optional, requires CRDs)
    if kubectl get crd podchaos.chaos-mesh.org &> /dev/null; then
        kubectl apply -f infra/monitoring/chaos/ -n $NAMESPACE
        log_success "Chaos engineering experiments deployed"
    else
        log_warning "Chaos Mesh CRDs not found, skipping chaos experiments"
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying monitoring deployment..."
    
    # Check Prometheus
    if kubectl get pods -l app.kubernetes.io/name=prometheus -n $MONITORING_NAMESPACE | grep -q Running; then
        log_success "Prometheus is running"
    else
        log_error "Prometheus is not running properly"
        return 1
    fi
    
    # Check Grafana
    if kubectl get pods -l app.kubernetes.io/name=grafana -n $MONITORING_NAMESPACE | grep -q Running; then
        log_success "Grafana is running"
    else
        log_error "Grafana is not running properly"
        return 1
    fi
    
    # Check AlertManager
    if kubectl get pods -l app.kubernetes.io/name=alertmanager -n $MONITORING_NAMESPACE | grep -q Running; then
        log_success "AlertManager is running"
    else
        log_error "AlertManager is not running properly"
        return 1
    fi
    
    # Check Jaeger
    if kubectl get pods -l app.kubernetes.io/name=jaeger -n $MONITORING_NAMESPACE | grep -q Running; then
        log_success "Jaeger is running"
    else
        log_warning "Jaeger is not running properly"
    fi
    
    log_success "Monitoring stack verification completed"
}

# Get access information
get_access_info() {
    log_info "Getting access information..."
    
    echo ""
    echo "=== Monitoring Stack Access Information ==="
    echo ""
    
    # Prometheus
    PROMETHEUS_PORT=$(kubectl get svc prometheus-kube-prometheus-prometheus -n $MONITORING_NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    echo "Prometheus: kubectl port-forward svc/prometheus-kube-prometheus-prometheus $PROMETHEUS_PORT:$PROMETHEUS_PORT -n $MONITORING_NAMESPACE"
    echo "Then access: http://localhost:$PROMETHEUS_PORT"
    echo ""
    
    # Grafana
    GRAFANA_PORT=$(kubectl get svc prometheus-grafana -n $MONITORING_NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    echo "Grafana: kubectl port-forward svc/prometheus-grafana $GRAFANA_PORT:$GRAFANA_PORT -n $MONITORING_NAMESPACE"
    echo "Then access: http://localhost:$GRAFANA_PORT"
    echo "Username: admin"
    echo "Password: admin123"
    echo ""
    
    # AlertManager
    ALERTMANAGER_PORT=$(kubectl get svc prometheus-kube-prometheus-alertmanager -n $MONITORING_NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    echo "AlertManager: kubectl port-forward svc/prometheus-kube-prometheus-alertmanager $ALERTMANAGER_PORT:$ALERTMANAGER_PORT -n $MONITORING_NAMESPACE"
    echo "Then access: http://localhost:$ALERTMANAGER_PORT"
    echo ""
    
    # Jaeger
    if kubectl get svc jaeger-query -n $MONITORING_NAMESPACE &> /dev/null; then
        JAEGER_PORT=$(kubectl get svc jaeger-query -n $MONITORING_NAMESPACE -o jsonpath='{.spec.ports[0].port}')
        echo "Jaeger: kubectl port-forward svc/jaeger-query $JAEGER_PORT:$JAEGER_PORT -n $MONITORING_NAMESPACE"
        echo "Then access: http://localhost:$JAEGER_PORT"
        echo ""
    fi
    
    echo "=== End Access Information ==="
    echo ""
}

# Run monitoring tests
run_tests() {
    log_info "Running monitoring tests..."
    
    # Check if test dependencies are available
    if command -v npm &> /dev/null && [ -f "infra/monitoring/tests/package.json" ]; then
        cd infra/monitoring/tests
        npm install
        npm test
        cd - > /dev/null
        log_success "Monitoring tests completed"
    else
        log_warning "Test dependencies not found, skipping tests"
    fi
}

# Main deployment function
main() {
    log_info "Starting DriveMaster monitoring stack deployment..."
    
    check_prerequisites
    create_namespaces
    add_helm_repos
    deploy_prometheus
    deploy_jaeger
    deploy_loki
    deploy_otel_collector
    configure_grafana_dashboards
    deploy_slo_monitoring
    deploy_chaos_engineering
    verify_deployment
    get_access_info
    
    if [ "${RUN_TESTS:-false}" = "true" ]; then
        run_tests
    fi
    
    log_success "DriveMaster monitoring stack deployment completed successfully!"
    log_info "You can now access the monitoring tools using the port-forward commands above"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "verify")
        verify_deployment
        ;;
    "access")
        get_access_info
        ;;
    "test")
        run_tests
        ;;
    "help")
        echo "Usage: $0 [deploy|verify|access|test|help]"
        echo "  deploy  - Deploy the complete monitoring stack (default)"
        echo "  verify  - Verify the deployment status"
        echo "  access  - Show access information for monitoring tools"
        echo "  test    - Run monitoring tests"
        echo "  help    - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac