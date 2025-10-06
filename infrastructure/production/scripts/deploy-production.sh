#!/bin/bash

# Production Deployment Script
# Deploys the Adaptive Learning Platform to production using blue-green deployment strategy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_BLUE="adaptive-learning-blue"
NAMESPACE_GREEN="adaptive-learning-green"
NAMESPACE_PROD="adaptive-learning-production"
HELM_RELEASE="adaptive-learning"
DOCKER_REGISTRY="your-registry.com"
TIMEOUT="600s"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check required tools
    for tool in kubectl helm docker; do
        if ! command -v $tool &> /dev/null; then
            print_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check kubectl context
    current_context=$(kubectl config current-context)
    if [[ "$current_context" != *"production"* ]]; then
        print_warning "Current kubectl context: $current_context"
        read -p "Are you sure you want to deploy to this context? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Function to determine current active environment
get_active_environment() {
    local active_env=$(kubectl get namespace -l active=true -o jsonpath='{.items[0].metadata.labels.deployment-slot}' 2>/dev/null)
    if [[ -z "$active_env" ]]; then
        echo "blue"  # Default to blue if no active environment
    else
        echo "$active_env"
    fi
}

# Function to get inactive environment
get_inactive_environment() {
    local active_env=$(get_active_environment)
    if [[ "$active_env" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to build and push Docker images
build_and_push_images() {
    local version=$1
    print_info "Building and pushing Docker images for version $version..."
    
    services=("auth-service" "user-service" "scheduler-service" "content-service" "ml-service" "event-service" "notification-service" "fraud-service")
    
    for service in "${services[@]}"; do
        print_info "Building $service..."
        
        # Build image
        docker build -t "${DOCKER_REGISTRY}/${service}:${version}" "services/${service}/"
        if [[ $? -ne 0 ]]; then
            print_error "Failed to build $service"
            exit 1
        fi
        
        # Push image
        docker push "${DOCKER_REGISTRY}/${service}:${version}"
        if [[ $? -ne 0 ]]; then
            print_error "Failed to push $service"
            exit 1
        fi
        
        print_success "Built and pushed $service:$version"
    done
}

# Function to deploy to inactive environment
deploy_to_inactive() {
    local version=$1
    local inactive_env=$(get_inactive_environment)
    local namespace="adaptive-learning-${inactive_env}"
    
    print_info "Deploying version $version to $inactive_env environment..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace
    kubectl label namespace "$namespace" environment=production deployment-slot="$inactive_env" active=false --overwrite
    
    # Deploy using Helm
    helm upgrade --install "$HELM_RELEASE-$inactive_env" infrastructure/helm/adaptive-learning \
        --namespace "$namespace" \
        --set image.tag="$version" \
        --set environment="$inactive_env" \
        --set global.registry="$DOCKER_REGISTRY" \
        --timeout="$TIMEOUT" \
        --wait
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to deploy to $inactive_env environment"
        exit 1
    fi
    
    print_success "Deployed to $inactive_env environment successfully"
}

# Function to run health checks
run_health_checks() {
    local environment=$1
    local namespace="adaptive-learning-${environment}"
    
    print_info "Running health checks for $environment environment..."
    
    # Wait for all deployments to be ready
    services=("auth-service" "user-service" "scheduler-service" "content-service" "ml-service" "event-service" "notification-service" "fraud-service")
    
    for service in "${services[@]}"; do
        print_info "Checking $service readiness..."
        
        kubectl wait --for=condition=available --timeout=300s "deployment/${service}" -n "$namespace"
        if [[ $? -ne 0 ]]; then
            print_error "$service failed readiness check"
            return 1
        fi
        
        # Check service endpoints
        local endpoint_ready=$(kubectl get endpoints "${service}" -n "$namespace" -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null)
        if [[ -z "$endpoint_ready" ]]; then
            print_error "$service endpoint not ready"
            return 1
        fi
        
        print_success "$service is ready"
    done
    
    # Run application-level health checks
    print_info "Running application health checks..."
    
    # Get service URLs for health checks
    local auth_url="http://$(kubectl get service auth-service -n "$namespace" -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3001"
    local user_url="http://$(kubectl get service user-service -n "$namespace" -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3002"
    
    # Health check endpoints
    curl -f "$auth_url/health" >/dev/null 2>&1
    if [[ $? -ne 0 ]]; then
        print_error "Auth service health check failed"
        return 1
    fi
    
    curl -f "$user_url/health" >/dev/null 2>&1
    if [[ $? -ne 0 ]]; then
        print_error "User service health check failed"
        return 1
    fi
    
    print_success "All health checks passed for $environment environment"
    return 0
}

# Function to switch traffic
switch_traffic() {
    local target_env=$1
    local active_env=$(get_active_environment)
    
    if [[ "$active_env" == "$target_env" ]]; then
        print_warning "$target_env environment is already active"
        return 0
    fi
    
    print_info "Switching traffic from $active_env to $target_env..."
    
    # Update service selectors to point to new environment
    services=("auth-service" "user-service" "scheduler-service" "content-service" "ml-service" "event-service" "notification-service" "fraud-service")
    
    for service in "${services[@]}"; do
        kubectl patch service "${service}-active" -n "$NAMESPACE_PROD" -p "{\"spec\":{\"selector\":{\"deployment-slot\":\"$target_env\"}}}"
        if [[ $? -ne 0 ]]; then
            print_error "Failed to update $service selector"
            return 1
        fi
    done
    
    # Update namespace labels
    kubectl label namespace "adaptive-learning-${target_env}" active=true --overwrite
    kubectl label namespace "adaptive-learning-${active_env}" active=false --overwrite
    
    print_success "Traffic switched to $target_env environment"
    
    # Wait a moment for traffic to stabilize
    sleep 10
    
    # Verify traffic switch
    print_info "Verifying traffic switch..."
    local current_active=$(get_active_environment)
    if [[ "$current_active" == "$target_env" ]]; then
        print_success "Traffic switch verified successfully"
        return 0
    else
        print_error "Traffic switch verification failed"
        return 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    local current_active=$(get_active_environment)
    local rollback_target
    
    if [[ "$current_active" == "blue" ]]; then
        rollback_target="green"
    else
        rollback_target="blue"
    fi
    
    print_warning "Rolling back from $current_active to $rollback_target..."
    
    switch_traffic "$rollback_target"
    if [[ $? -eq 0 ]]; then
        print_success "Rollback completed successfully"
    else
        print_error "Rollback failed"
        exit 1
    fi
}

# Function to cleanup old deployments
cleanup_old_deployment() {
    local inactive_env=$(get_inactive_environment)
    local namespace="adaptive-learning-${inactive_env}"
    
    print_info "Cleaning up old deployment in $inactive_env environment..."
    
    # Scale down deployments to save resources
    services=("auth-service" "user-service" "scheduler-service" "content-service" "ml-service" "event-service" "notification-service" "fraud-service")
    
    for service in "${services[@]}"; do
        kubectl scale deployment "$service" --replicas=0 -n "$namespace"
    done
    
    print_success "Scaled down $inactive_env environment"
}

# Function to setup monitoring and alerting
setup_monitoring() {
    print_info "Setting up production monitoring and alerting..."
    
    # Deploy monitoring stack
    kubectl apply -f infrastructure/production/monitoring-stack.yaml
    
    # Wait for monitoring components to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring
    kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n monitoring
    
    print_success "Monitoring stack deployed successfully"
}

# Function to apply security hardening
apply_security_hardening() {
    print_info "Applying security hardening configurations..."
    
    # Apply security policies
    kubectl apply -f infrastructure/production/security-hardening.yaml
    
    # Verify security policies are active
    kubectl get networkpolicies -n adaptive-learning-production
    kubectl get podsecuritypolicy adaptive-learning-psp
    
    print_success "Security hardening applied successfully"
}

# Main deployment function
main() {
    local version=${1:-"latest"}
    local skip_build=${2:-false}
    
    print_info "Starting production deployment for version: $version"
    
    # Check prerequisites
    check_prerequisites
    
    # Get current state
    local active_env=$(get_active_environment)
    local inactive_env=$(get_inactive_environment)
    
    print_info "Current active environment: $active_env"
    print_info "Deploying to inactive environment: $inactive_env"
    
    # Build and push images (unless skipped)
    if [[ "$skip_build" != "true" ]]; then
        build_and_push_images "$version"
    fi
    
    # Setup monitoring and security (first time only)
    if ! kubectl get namespace monitoring >/dev/null 2>&1; then
        setup_monitoring
    fi
    
    if ! kubectl get namespace adaptive-learning-production >/dev/null 2>&1; then
        apply_security_hardening
    fi
    
    # Deploy to inactive environment
    deploy_to_inactive "$version"
    
    # Run health checks
    if ! run_health_checks "$inactive_env"; then
        print_error "Health checks failed for $inactive_env environment"
        print_info "Deployment will not proceed. Check logs and fix issues."
        exit 1
    fi
    
    # Prompt for traffic switch
    print_info "Deployment to $inactive_env environment completed successfully"
    read -p "Switch traffic to $inactive_env environment? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Switch traffic
        if switch_traffic "$inactive_env"; then
            print_success "Production deployment completed successfully!"
            print_info "Active environment is now: $inactive_env"
            
            # Cleanup old environment after successful switch
            sleep 30  # Wait for traffic to stabilize
            cleanup_old_deployment
        else
            print_error "Traffic switch failed. Rolling back..."
            rollback_deployment
            exit 1
        fi
    else
        print_info "Traffic not switched. $inactive_env environment is ready but not active."
        print_info "To switch traffic later, run: kubectl apply -f infrastructure/production/blue-green-deployment.yaml"
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [VERSION] [SKIP_BUILD]"
    echo "  VERSION: Docker image version tag (default: latest)"
    echo "  SKIP_BUILD: Skip building images (true/false, default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy latest version with build"
    echo "  $0 v1.2.3            # Deploy specific version with build"
    echo "  $0 v1.2.3 true       # Deploy specific version without build"
    echo ""
    echo "Commands:"
    echo "  rollback              # Rollback to previous environment"
    echo "  health-check [ENV]    # Run health checks for environment"
    echo "  switch [ENV]          # Switch traffic to environment"
}

# Handle special commands
case "${1:-}" in
    "rollback")
        rollback_deployment
        exit 0
        ;;
    "health-check")
        run_health_checks "${2:-$(get_active_environment)}"
        exit $?
        ;;
    "switch")
        if [[ -z "$2" ]]; then
            print_error "Environment required for switch command"
            usage
            exit 1
        fi
        switch_traffic "$2"
        exit $?
        ;;
    "help"|"-h"|"--help")
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac