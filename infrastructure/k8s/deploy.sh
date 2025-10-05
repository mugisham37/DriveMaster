#!/bin/bash

# Kubernetes Deployment Script for Adaptive Learning Platform
# This script deploys the entire platform to a Kubernetes cluster

set -e

# Configuration
NAMESPACE=${NAMESPACE:-adaptive-learning-prod}
ENVIRONMENT=${ENVIRONMENT:-production}
HELM_RELEASE_NAME=${HELM_RELEASE_NAME:-adaptive-learning}
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
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install Helm first."
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

# Create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    kubectl apply -f namespaces.yaml
    log_success "Namespaces created"
}

# Deploy infrastructure services
deploy_infrastructure() {
    log_info "Deploying infrastructure services..."
    
    # Deploy PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f infrastructure/postgres.yaml
    
    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f infrastructure/redis.yaml
    
    # Deploy Kafka and Zookeeper
    log_info "Deploying Kafka and Zookeeper..."
    kubectl apply -f infrastructure/kafka.yaml
    
    log_success "Infrastructure services deployed"
}

# Wait for infrastructure to be ready
wait_for_infrastructure() {
    log_info "Waiting for infrastructure services to be ready..."
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    # Wait for Zookeeper
    log_info "Waiting for Zookeeper..."
    kubectl wait --for=condition=ready pod -l app=zookeeper -n $NAMESPACE --timeout=300s
    
    # Wait for Kafka
    log_info "Waiting for Kafka..."
    kubectl wait --for=condition=ready pod -l app=kafka -n $NAMESPACE --timeout=300s
    
    log_success "Infrastructure services are ready"
}

# Deploy secrets and configmaps
deploy_config() {
    log_info "Deploying secrets and configmaps..."
    
    # Apply secrets (make sure to update with real values in production)
    kubectl apply -f secrets.yaml
    
    # Apply configmaps
    kubectl apply -f configmaps.yaml
    
    log_success "Configuration deployed"
}

# Deploy application services
deploy_services() {
    log_info "Deploying application services..."
    
    # Deploy all services
    for service_file in deployments/*.yaml; do
        service_name=$(basename "$service_file" .yaml)
        log_info "Deploying $service_name..."
        kubectl apply -f "$service_file"
    done
    
    log_success "Application services deployed"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for application services to be ready..."
    
    # List of services to wait for
    services=(
        "auth-service"
        "user-service"
        "content-service"
        "scheduler-service"
        "ml-service"
        "event-service"
        "notification-service"
        "fraud-service"
    )
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service..."
        kubectl wait --for=condition=ready pod -l app=$service -n $NAMESPACE --timeout=300s
    done
    
    log_success "All services are ready"
}

# Deploy using Helm (alternative method)
deploy_with_helm() {
    log_info "Deploying with Helm..."
    
    # Add required Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    # Install or upgrade the Helm release
    helm upgrade --install $HELM_RELEASE_NAME ../helm/adaptive-learning \
        --namespace $NAMESPACE \
        --create-namespace \
        --values ../helm/adaptive-learning/values.yaml \
        --set environment=$ENVIRONMENT \
        --wait \
        --timeout=20m
    
    log_success "Helm deployment completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n $NAMESPACE
    
    # Check service status
    log_info "Service status:"
    kubectl get services -n $NAMESPACE
    
    # Check ingress status
    log_info "Ingress status:"
    kubectl get ingress -n $NAMESPACE
    
    # Check HPA status
    log_info "HPA status:"
    kubectl get hpa -n $NAMESPACE
    
    log_success "Deployment verification completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a job to run migrations
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%s)
  namespace: $NAMESPACE
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
  backoffLimit: 3
EOF
    
    log_success "Database migration job created"
}

# Main deployment function
main() {
    log_info "Starting deployment of Adaptive Learning Platform"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    
    # Parse command line arguments
    DEPLOY_METHOD="kubectl"
    RUN_MIGRATIONS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --helm)
                DEPLOY_METHOD="helm"
                shift
                ;;
            --migrate)
                RUN_MIGRATIONS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--helm] [--migrate] [--help]"
                echo "  --helm     Use Helm for deployment instead of kubectl"
                echo "  --migrate  Run database migrations after deployment"
                echo "  --help     Show this help message"
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
    
    if [ "$DEPLOY_METHOD" = "helm" ]; then
        deploy_with_helm
    else
        create_namespaces
        deploy_infrastructure
        wait_for_infrastructure
        deploy_config
        deploy_services
        wait_for_services
    fi
    
    if [ "$RUN_MIGRATIONS" = true ]; then
        run_migrations
    fi
    
    verify_deployment
    
    log_success "Deployment completed successfully!"
    log_info "You can now access your services through the configured ingress or port-forwarding"
    log_info "To port-forward a service, use: kubectl port-forward svc/SERVICE_NAME LOCAL_PORT:SERVICE_PORT -n $NAMESPACE"
}

# Run main function
main "$@"