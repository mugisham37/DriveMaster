#!/bin/bash

# Monitoring Stack Deployment Script for Adaptive Learning Platform
# This script deploys Prometheus, Grafana, Alertmanager, Loki, and Promtail

set -e

# Configuration
NAMESPACE=${NAMESPACE:-adaptive-learning-monitoring}
KUBECTL_CONTEXT=${KUBECTL_CONTEXT:-}

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
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Set kubectl context if provided
    if [ -n "$KUBECTL_CONTEXT" ]; then
        kubectl config use-context "$KUBECTL_CONTEXT"
        log_info "Using kubectl context: $KUBECTL_CONTEXT"
    fi
    
    log_success "Prerequisites check passed"
}

# Create monitoring namespace
create_namespace() {
    log_info "Creating monitoring namespace..."
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    log_success "Monitoring namespace created/updated"
}

# Deploy Prometheus
deploy_prometheus() {
    log_info "Deploying Prometheus..."
    
    # Apply Prometheus configuration
    kubectl apply -f prometheus/prometheus-config.yaml
    kubectl apply -f prometheus/alerting-rules.yaml
    kubectl apply -f prometheus/prometheus-deployment.yaml
    
    log_success "Prometheus deployed"
}

# Deploy Grafana
deploy_grafana() {
    log_info "Deploying Grafana..."
    
    # Apply Grafana configuration and dashboards
    kubectl apply -f grafana/grafana-config.yaml
    kubectl apply -f grafana/dashboards.yaml
    kubectl apply -f grafana/grafana-deployment.yaml
    
    log_success "Grafana deployed"
}

# Deploy Alertmanager
deploy_alertmanager() {
    log_info "Deploying Alertmanager..."
    
    # Apply Alertmanager configuration
    kubectl apply -f alertmanager/alertmanager-config.yaml
    kubectl apply -f alertmanager/alertmanager-deployment.yaml
    
    log_success "Alertmanager deployed"
}

# Deploy Loki
deploy_loki() {
    log_info "Deploying Loki..."
    
    # Apply Loki deployment
    kubectl apply -f loki/loki-deployment.yaml
    
    log_success "Loki deployed"
}

# Deploy Promtail
deploy_promtail() {
    log_info "Deploying Promtail..."
    
    # Apply Promtail DaemonSet
    kubectl apply -f promtail/promtail-daemonset.yaml
    
    log_success "Promtail deployed"
}

# Wait for deployments to be ready
wait_for_deployments() {
    log_info "Waiting for monitoring stack to be ready..."
    
    # Wait for Prometheus
    log_info "Waiting for Prometheus..."
    kubectl wait --for=condition=available deployment/prometheus -n $NAMESPACE --timeout=300s
    
    # Wait for Grafana
    log_info "Waiting for Grafana..."
    kubectl wait --for=condition=available deployment/grafana -n $NAMESPACE --timeout=300s
    
    # Wait for Alertmanager
    log_info "Waiting for Alertmanager..."
    kubectl wait --for=condition=available deployment/alertmanager -n $NAMESPACE --timeout=300s
    
    # Wait for Loki
    log_info "Waiting for Loki..."
    kubectl wait --for=condition=available deployment/loki -n $NAMESPACE --timeout=300s
    
    # Wait for Promtail DaemonSet
    log_info "Waiting for Promtail..."
    kubectl rollout status daemonset/promtail -n $NAMESPACE --timeout=300s
    
    log_success "All monitoring components are ready"
}

# Create ingress for monitoring services
create_ingress() {
    log_info "Creating ingress for monitoring services..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: monitoring-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required - Monitoring'
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - prometheus.adaptivelearning.com
    - grafana.adaptivelearning.com
    - alertmanager.adaptivelearning.com
    secretName: monitoring-tls
  rules:
  - host: prometheus.adaptivelearning.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus
            port:
              number: 9090
  - host: grafana.adaptivelearning.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
  - host: alertmanager.adaptivelearning.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: alertmanager
            port:
              number: 9093
EOF

    # Create basic auth secret for monitoring access
    kubectl create secret generic monitoring-auth \
        --from-literal=auth=$(htpasswd -nb admin 'monitoring123!') \
        -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Monitoring ingress created"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying monitoring deployment..."
    
    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n $NAMESPACE
    
    # Check service status
    log_info "Service status:"
    kubectl get services -n $NAMESPACE
    
    # Check ingress status
    log_info "Ingress status:"
    kubectl get ingress -n $NAMESPACE
    
    # Check PVC status
    log_info "PVC status:"
    kubectl get pvc -n $NAMESPACE
    
    log_success "Monitoring deployment verification completed"
}

# Display access information
display_access_info() {
    log_info "Monitoring Stack Access Information:"
    echo ""
    echo "🔍 Prometheus:"
    echo "   URL: https://prometheus.adaptivelearning.com"
    echo "   Port-forward: kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE"
    echo ""
    echo "📊 Grafana:"
    echo "   URL: https://grafana.adaptivelearning.com"
    echo "   Port-forward: kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
    echo "   Default login: admin / admin123!@#"
    echo ""
    echo "🚨 Alertmanager:"
    echo "   URL: https://alertmanager.adaptivelearning.com"
    echo "   Port-forward: kubectl port-forward svc/alertmanager 9093:9093 -n $NAMESPACE"
    echo ""
    echo "📝 Loki:"
    echo "   Internal URL: http://loki:3100"
    echo "   Port-forward: kubectl port-forward svc/loki 3100:3100 -n $NAMESPACE"
    echo ""
    echo "🔐 Basic Auth (for ingress):"
    echo "   Username: admin"
    echo "   Password: monitoring123!"
    echo ""
    log_warning "Remember to:"
    log_warning "1. Update Grafana admin password after first login"
    log_warning "2. Configure Slack/email notifications in Alertmanager"
    log_warning "3. Update basic auth credentials for production"
    log_warning "4. Configure proper TLS certificates"
}

# Main deployment function
main() {
    log_info "Starting deployment of Monitoring Stack for Adaptive Learning Platform"
    log_info "Namespace: $NAMESPACE"
    
    # Parse command line arguments
    CREATE_INGRESS=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-ingress)
                CREATE_INGRESS=false
                shift
                ;;
            --help)
                echo "Usage: $0 [--no-ingress] [--help]"
                echo "  --no-ingress  Skip creating ingress resources"
                echo "  --help        Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    create_namespace
    deploy_prometheus
    deploy_grafana
    deploy_alertmanager
    deploy_loki
    deploy_promtail
    wait_for_deployments
    
    if [ "$CREATE_INGRESS" = true ]; then
        create_ingress
    fi
    
    verify_deployment
    display_access_info
    
    log_success "Monitoring stack deployment completed successfully!"
}

# Run main function
main "$@"