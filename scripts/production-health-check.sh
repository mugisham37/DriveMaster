#!/bin/bash

# Production Health Check Script
# This script performs comprehensive health checks on the production environment

set -e

# Configuration
NAMESPACE=${NAMESPACE:-adaptive-learning-prod}
TIMEOUT=${TIMEOUT:-300}
RETRY_INTERVAL=${RETRY_INTERVAL:-10}

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

# Health check functions
check_service_health() {
    local service=$1
    local port=$2
    local path=${3:-/health}
    
    log_info "Checking health of $service..."
    
    # Port forward in background
    kubectl port-forward svc/$service $port:$port -n $NAMESPACE &
    local pf_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Perform health check
    local retries=0
    local max_retries=$((TIMEOUT / RETRY_INTERVAL))
    
    while [ $retries -lt $max_retries ]; do
        if curl -f -s http://localhost:$port$path > /dev/null 2>&1; then
            log_success "$service is healthy"
            kill $pf_pid 2>/dev/null || true
            return 0
        fi
        
        retries=$((retries + 1))
        log_warning "$service health check failed, retrying... ($retries/$max_retries)"
        sleep $RETRY_INTERVAL
    done
    
    log_error "$service health check failed after $max_retries attempts"
    kill $pf_pid 2>/dev/null || true
    return 1
}

check_database_connectivity() {
    log_info "Checking database connectivity..."
    
    # Run a simple database query through user-service
    kubectl exec deployment/user-service -n $NAMESPACE -- \
        sh -c 'curl -f http://localhost:8080/health/db' > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Database connectivity check passed"
        return 0
    else
        log_error "Database connectivity check failed"
        return 1
    fi
}

check_redis_connectivity() {
    log_info "Checking Redis connectivity..."
    
    # Check Redis through scheduler-service
    kubectl exec deployment/scheduler-service -n $NAMESPACE -- \
        sh -c 'curl -f http://localhost:8081/health/redis' > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Redis connectivity check passed"
        return 0
    else
        log_error "Redis connectivity check failed"
        return 1
    fi
}

check_kafka_connectivity() {
    log_info "Checking Kafka connectivity..."
    
    # Check Kafka through event-service
    kubectl exec deployment/event-service -n $NAMESPACE -- \
        sh -c 'curl -f http://localhost:8082/health/kafka' > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Kafka connectivity check passed"
        return 0
    else
        log_error "Kafka connectivity check failed"
        return 1
    fi
}

check_ml_model_availability() {
    log_info "Checking ML model availability..."
    
    # Check if ML models are loaded
    kubectl port-forward svc/ml-service 8000:8000 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    local model_status=$(curl -s http://localhost:8000/models/status | jq -r '.status')
    kill $pf_pid 2>/dev/null || true
    
    if [ "$model_status" = "ready" ]; then
        log_success "ML models are available and ready"
        return 0
    else
        log_error "ML models are not ready (status: $model_status)"
        return 1
    fi
}

check_scheduler_algorithms() {
    log_info "Checking scheduler algorithms..."
    
    # Test scheduler algorithm performance
    kubectl port-forward svc/scheduler-service 8081:8081 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    # Make a test request to get next items
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null \
        -X POST http://localhost:8081/api/v1/next-items \
        -H "Content-Type: application/json" \
        -d '{"user_id":"test-user","count":5}')
    
    kill $pf_pid 2>/dev/null || true
    
    # Check if response time is under 300ms (0.3 seconds)
    if (( $(echo "$response_time < 0.3" | bc -l) )); then
        log_success "Scheduler algorithms are performing well (${response_time}s)"
        return 0
    else
        log_warning "Scheduler algorithms are slow (${response_time}s > 0.3s)"
        return 1
    fi
}

check_authentication_flow() {
    log_info "Checking authentication flow..."
    
    kubectl port-forward svc/auth-service 3000:3000 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    # Test authentication endpoint
    local auth_response=$(curl -s -w "%{http_code}" -o /dev/null \
        http://localhost:3000/api/v1/auth/health)
    
    kill $pf_pid 2>/dev/null || true
    
    if [ "$auth_response" = "200" ]; then
        log_success "Authentication service is responding correctly"
        return 0
    else
        log_error "Authentication service returned HTTP $auth_response"
        return 1
    fi
}

check_content_delivery() {
    log_info "Checking content delivery..."
    
    kubectl port-forward svc/content-service 3001:3001 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    # Test content API
    local content_response=$(curl -s -w "%{http_code}" -o /dev/null \
        http://localhost:3001/api/v1/content/health)
    
    kill $pf_pid 2>/dev/null || true
    
    if [ "$content_response" = "200" ]; then
        log_success "Content service is delivering content correctly"
        return 0
    else
        log_error "Content service returned HTTP $content_response"
        return 1
    fi
}

check_notification_system() {
    log_info "Checking notification system..."
    
    kubectl port-forward svc/notification-service 3002:3002 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    # Test notification service
    local notification_response=$(curl -s -w "%{http_code}" -o /dev/null \
        http://localhost:3002/api/v1/notifications/health)
    
    kill $pf_pid 2>/dev/null || true
    
    if [ "$notification_response" = "200" ]; then
        log_success "Notification system is working correctly"
        return 0
    else
        log_error "Notification service returned HTTP $notification_response"
        return 1
    fi
}

check_fraud_detection() {
    log_info "Checking fraud detection system..."
    
    kubectl port-forward svc/fraud-service 8003:8003 -n $NAMESPACE &
    local pf_pid=$!
    sleep 5
    
    # Test fraud detection service
    local fraud_response=$(curl -s -w "%{http_code}" -o /dev/null \
        http://localhost:8003/api/v1/fraud/health)
    
    kill $pf_pid 2>/dev/null || true
    
    if [ "$fraud_response" = "200" ]; then
        log_success "Fraud detection system is working correctly"
        return 0
    else
        log_error "Fraud detection service returned HTTP $fraud_response"
        return 1
    fi
}

check_resource_utilization() {
    log_info "Checking resource utilization..."
    
    # Check CPU and memory usage
    local high_cpu_pods=$(kubectl top pods -n $NAMESPACE --no-headers | awk '{if($2 > 1000) print $1}')
    local high_memory_pods=$(kubectl top pods -n $NAMESPACE --no-headers | awk '{if($3 > 1000) print $1}')
    
    if [ -z "$high_cpu_pods" ] && [ -z "$high_memory_pods" ]; then
        log_success "Resource utilization is within normal limits"
        return 0
    else
        if [ -n "$high_cpu_pods" ]; then
            log_warning "High CPU usage detected in pods: $high_cpu_pods"
        fi
        if [ -n "$high_memory_pods" ]; then
            log_warning "High memory usage detected in pods: $high_memory_pods"
        fi
        return 1
    fi
}

check_pod_status() {
    log_info "Checking pod status..."
    
    # Check for any pods not in Running state
    local non_running_pods=$(kubectl get pods -n $NAMESPACE --no-headers | grep -v Running | awk '{print $1}')
    
    if [ -z "$non_running_pods" ]; then
        log_success "All pods are in Running state"
        return 0
    else
        log_error "Non-running pods detected: $non_running_pods"
        return 1
    fi
}

check_hpa_status() {
    log_info "Checking HPA status..."
    
    # Check HPA status
    local hpa_issues=$(kubectl get hpa -n $NAMESPACE --no-headers | grep -v "unknown\|<unknown>" | wc -l)
    
    if [ "$hpa_issues" -gt 0 ]; then
        log_success "HPA is functioning correctly"
        return 0
    else
        log_warning "HPA metrics may not be available"
        return 1
    fi
}

# End-to-end workflow test
test_user_workflow() {
    log_info "Testing end-to-end user workflow..."
    
    # This would typically involve:
    # 1. User registration/login
    # 2. Getting next items from scheduler
    # 3. Submitting attempts
    # 4. Checking progress updates
    
    # For now, we'll do a simplified test
    kubectl port-forward svc/auth-service 3000:3000 -n $NAMESPACE &
    local auth_pid=$!
    kubectl port-forward svc/scheduler-service 8081:8081 -n $NAMESPACE &
    local scheduler_pid=$!
    sleep 10
    
    # Test workflow
    local workflow_success=true
    
    # Test auth health
    if ! curl -f -s http://localhost:3000/health > /dev/null; then
        workflow_success=false
    fi
    
    # Test scheduler health
    if ! curl -f -s http://localhost:8081/health > /dev/null; then
        workflow_success=false
    fi
    
    # Cleanup
    kill $auth_pid $scheduler_pid 2>/dev/null || true
    
    if [ "$workflow_success" = true ]; then
        log_success "End-to-end workflow test passed"
        return 0
    else
        log_error "End-to-end workflow test failed"
        return 1
    fi
}

# Main health check function
main() {
    log_info "Starting comprehensive production health check..."
    log_info "Namespace: $NAMESPACE"
    log_info "Timeout: ${TIMEOUT}s"
    
    local failed_checks=0
    local total_checks=0
    
    # Define all health checks
    declare -a health_checks=(
        "check_pod_status"
        "check_service_health auth-service 3000"
        "check_service_health user-service 8080"
        "check_service_health content-service 3001"
        "check_service_health scheduler-service 8081"
        "check_service_health ml-service 8000"
        "check_service_health event-service 8082"
        "check_service_health notification-service 3002"
        "check_service_health fraud-service 8003"
        "check_database_connectivity"
        "check_redis_connectivity"
        "check_kafka_connectivity"
        "check_ml_model_availability"
        "check_scheduler_algorithms"
        "check_authentication_flow"
        "check_content_delivery"
        "check_notification_system"
        "check_fraud_detection"
        "check_resource_utilization"
        "check_hpa_status"
        "test_user_workflow"
    )
    
    # Run all health checks
    for check in "${health_checks[@]}"; do
        total_checks=$((total_checks + 1))
        if ! eval "$check"; then
            failed_checks=$((failed_checks + 1))
        fi
        echo ""
    done
    
    # Summary
    log_info "Health check summary:"
    log_info "Total checks: $total_checks"
    log_info "Passed: $((total_checks - failed_checks))"
    log_info "Failed: $failed_checks"
    
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed! Production environment is healthy."
        exit 0
    else
        log_error "$failed_checks health checks failed. Production environment needs attention."
        exit 1
    fi
}

# Run main function
main "$@"