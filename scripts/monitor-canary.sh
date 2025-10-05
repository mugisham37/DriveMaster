#!/bin/bash

# Canary Deployment Monitoring Script
# This script monitors key metrics during canary deployment

set -e

# Configuration
NAMESPACE=${NAMESPACE:-adaptive-learning-prod}
MONITORING_DURATION=${MONITORING_DURATION:-600}  # 10 minutes
CHECK_INTERVAL=${CHECK_INTERVAL:-30}              # 30 seconds
ERROR_THRESHOLD=${ERROR_THRESHOLD:-0.05}          # 5% error rate
RESPONSE_TIME_THRESHOLD=${RESPONSE_TIME_THRESHOLD:-1.0}  # 1 second

# Prometheus configuration
PROMETHEUS_URL=${PROMETHEUS_URL:-http://prometheus.adaptive-learning-monitoring.svc.cluster.local:9090}

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

# Prometheus query function
query_prometheus() {
    local query="$1"
    local result
    
    result=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=${query}" | \
        jq -r '.data.result[0].value[1] // "0"')
    
    echo "$result"
}

# Check error rate
check_error_rate() {
    local service="$1"
    log_info "Checking error rate for $service..."
    
    local error_rate_query="rate(http_requests_total{job=\"$service\",status=~\"5..\"}[5m]) / rate(http_requests_total{job=\"$service\"}[5m])"
    local error_rate=$(query_prometheus "$error_rate_query")
    
    if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
        log_error "$service error rate is ${error_rate} (threshold: ${ERROR_THRESHOLD})"
        return 1
    else
        log_success "$service error rate is ${error_rate} (within threshold)"
        return 0
    fi
}

# Check response time
check_response_time() {
    local service="$1"
    log_info "Checking response time for $service..."
    
    local response_time_query="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"$service\"}[5m]))"
    local response_time=$(query_prometheus "$response_time_query")
    
    if (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log_warning "$service 95th percentile response time is ${response_time}s (threshold: ${RESPONSE_TIME_THRESHOLD}s)"
        return 1
    else
        log_success "$service 95th percentile response time is ${response_time}s (within threshold)"
        return 0
    fi
}

# Check CPU usage
check_cpu_usage() {
    local service="$1"
    log_info "Checking CPU usage for $service..."
    
    local cpu_query="rate(container_cpu_usage_seconds_total{pod=~\"$service-.*\"}[5m])"
    local cpu_usage=$(query_prometheus "$cpu_query")
    
    if (( $(echo "$cpu_usage > 0.8" | bc -l) )); then
        log_warning "$service CPU usage is ${cpu_usage} cores (high usage detected)"
        return 1
    else
        log_success "$service CPU usage is ${cpu_usage} cores (normal)"
        return 0
    fi
}

# Check memory usage
check_memory_usage() {
    local service="$1"
    log_info "Checking memory usage for $service..."
    
    local memory_query="container_memory_usage_bytes{pod=~\"$service-.*\"} / container_spec_memory_limit_bytes{pod=~\"$service-.*\"}"
    local memory_usage=$(query_prometheus "$memory_query")
    
    if (( $(echo "$memory_usage > 0.8" | bc -l) )); then
        log_warning "$service memory usage is ${memory_usage}% (high usage detected)"
        return 1
    else
        log_success "$service memory usage is ${memory_usage}% (normal)"
        return 0
    fi
}

# Check business metrics
check_business_metrics() {
    log_info "Checking business metrics..."
    
    # Check user session rate
    local session_rate_query="rate(user_sessions_total[5m])"
    local session_rate=$(query_prometheus "$session_rate_query")
    
    if (( $(echo "$session_rate < 0.1" | bc -l) )); then
        log_warning "User session rate is low: ${session_rate}/s"
        return 1
    else
        log_success "User session rate is normal: ${session_rate}/s"
    fi
    
    # Check scheduler performance
    local scheduler_perf_query="histogram_quantile(0.95, rate(scheduler_next_item_duration_seconds_bucket[5m]))"
    local scheduler_perf=$(query_prometheus "$scheduler_perf_query")
    
    if (( $(echo "$scheduler_perf > 0.3" | bc -l) )); then
        log_warning "Scheduler performance is degraded: ${scheduler_perf}s"
        return 1
    else
        log_success "Scheduler performance is good: ${scheduler_perf}s"
    fi
    
    return 0
}

# Check ML model performance
check_ml_performance() {
    log_info "Checking ML model performance..."
    
    # Check prediction accuracy
    local accuracy_query="ml_model_accuracy"
    local accuracy=$(query_prometheus "$accuracy_query")
    
    if (( $(echo "$accuracy < 0.8" | bc -l) )); then
        log_error "ML model accuracy is low: ${accuracy}"
        return 1
    else
        log_success "ML model accuracy is good: ${accuracy}"
    fi
    
    # Check prediction latency
    local prediction_latency_query="histogram_quantile(0.95, rate(ml_prediction_duration_seconds_bucket[5m]))"
    local prediction_latency=$(query_prometheus "$prediction_latency_query")
    
    if (( $(echo "$prediction_latency > 0.5" | bc -l) )); then
        log_warning "ML prediction latency is high: ${prediction_latency}s"
        return 1
    else
        log_success "ML prediction latency is good: ${prediction_latency}s"
    fi
    
    return 0
}

# Check database performance
check_database_performance() {
    log_info "Checking database performance..."
    
    # Check database connection usage
    local db_conn_query="db_connections_active / db_connections_max"
    local db_conn_usage=$(query_prometheus "$db_conn_query")
    
    if (( $(echo "$db_conn_usage > 0.8" | bc -l) )); then
        log_warning "Database connection usage is high: ${db_conn_usage}"
        return 1
    else
        log_success "Database connection usage is normal: ${db_conn_usage}"
    fi
    
    return 0
}

# Check Kafka performance
check_kafka_performance() {
    log_info "Checking Kafka performance..."
    
    # Check consumer lag
    local consumer_lag_query="kafka_consumer_lag_sum"
    local consumer_lag=$(query_prometheus "$consumer_lag_query")
    
    if (( $(echo "$consumer_lag > 1000" | bc -l) )); then
        log_warning "Kafka consumer lag is high: ${consumer_lag} messages"
        return 1
    else
        log_success "Kafka consumer lag is normal: ${consumer_lag} messages"
    fi
    
    return 0
}

# Monitor canary deployment
monitor_canary() {
    local start_time=$(date +%s)
    local end_time=$((start_time + MONITORING_DURATION))
    local check_count=0
    local failed_checks=0
    
    log_info "Starting canary monitoring for ${MONITORING_DURATION} seconds..."
    log_info "Error rate threshold: ${ERROR_THRESHOLD}"
    log_info "Response time threshold: ${RESPONSE_TIME_THRESHOLD}s"
    
    # Services to monitor
    local services=("auth-service" "user-service" "content-service" "scheduler-service" "ml-service" "event-service" "notification-service" "fraud-service")
    
    while [ $(date +%s) -lt $end_time ]; do
        check_count=$((check_count + 1))
        local current_failed=0
        
        log_info "=== Check #${check_count} ($(date)) ==="
        
        # Check each service
        for service in "${services[@]}"; do
            if ! check_error_rate "$service"; then
                current_failed=$((current_failed + 1))
            fi
            
            if ! check_response_time "$service"; then
                current_failed=$((current_failed + 1))
            fi
            
            if ! check_cpu_usage "$service"; then
                current_failed=$((current_failed + 1))
            fi
            
            if ! check_memory_usage "$service"; then
                current_failed=$((current_failed + 1))
            fi
        done
        
        # Check business metrics
        if ! check_business_metrics; then
            current_failed=$((current_failed + 1))
        fi
        
        # Check ML performance
        if ! check_ml_performance; then
            current_failed=$((current_failed + 1))
        fi
        
        # Check database performance
        if ! check_database_performance; then
            current_failed=$((current_failed + 1))
        fi
        
        # Check Kafka performance
        if ! check_kafka_performance; then
            current_failed=$((current_failed + 1))
        fi
        
        if [ $current_failed -gt 0 ]; then
            failed_checks=$((failed_checks + 1))
            log_warning "Check #${check_count} had ${current_failed} failures"
        else
            log_success "Check #${check_count} passed all metrics"
        fi
        
        # If too many consecutive failures, abort
        if [ $current_failed -gt 5 ]; then
            log_error "Too many failures detected, aborting canary deployment"
            exit 1
        fi
        
        echo ""
        sleep $CHECK_INTERVAL
    done
    
    # Final assessment
    local failure_rate=$(echo "scale=2; $failed_checks / $check_count" | bc)
    
    log_info "=== Canary Monitoring Summary ==="
    log_info "Total checks: $check_count"
    log_info "Failed checks: $failed_checks"
    log_info "Failure rate: ${failure_rate}"
    
    if (( $(echo "$failure_rate > 0.2" | bc -l) )); then
        log_error "Canary deployment failed - failure rate too high (${failure_rate} > 0.2)"
        exit 1
    else
        log_success "Canary deployment passed monitoring - promoting to full deployment"
        exit 0
    fi
}

# Generate monitoring report
generate_report() {
    local report_file="canary-monitoring-report-$(date +%Y%m%d-%H%M%S).json"
    
    log_info "Generating monitoring report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "monitoring_duration": $MONITORING_DURATION,
  "check_interval": $CHECK_INTERVAL,
  "thresholds": {
    "error_rate": $ERROR_THRESHOLD,
    "response_time": $RESPONSE_TIME_THRESHOLD
  },
  "metrics": {
    "error_rates": {},
    "response_times": {},
    "resource_usage": {},
    "business_metrics": {}
  }
}
EOF
    
    # Add actual metrics to the report
    for service in "auth-service" "user-service" "content-service" "scheduler-service" "ml-service" "event-service" "notification-service" "fraud-service"; do
        local error_rate=$(query_prometheus "rate(http_requests_total{job=\"$service\",status=~\"5..\"}[5m]) / rate(http_requests_total{job=\"$service\"}[5m])")
        local response_time=$(query_prometheus "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"$service\"}[5m]))")
        
        # Update report with actual values (simplified for this example)
        log_info "$service - Error Rate: $error_rate, Response Time: ${response_time}s"
    done
    
    log_success "Monitoring report generated: $report_file"
}

# Main function
main() {
    log_info "Canary Deployment Monitor"
    log_info "Namespace: $NAMESPACE"
    log_info "Prometheus URL: $PROMETHEUS_URL"
    
    # Check if Prometheus is accessible
    if ! curl -s "$PROMETHEUS_URL/api/v1/query" > /dev/null; then
        log_error "Cannot access Prometheus at $PROMETHEUS_URL"
        exit 1
    fi
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --duration)
                MONITORING_DURATION="$2"
                shift 2
                ;;
            --interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            --error-threshold)
                ERROR_THRESHOLD="$2"
                shift 2
                ;;
            --response-threshold)
                RESPONSE_TIME_THRESHOLD="$2"
                shift 2
                ;;
            --report-only)
                generate_report
                exit 0
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --duration SECONDS        Monitoring duration (default: 600)"
                echo "  --interval SECONDS        Check interval (default: 30)"
                echo "  --error-threshold RATE    Error rate threshold (default: 0.05)"
                echo "  --response-threshold SEC  Response time threshold (default: 1.0)"
                echo "  --report-only             Generate report only, don't monitor"
                echo "  --help                    Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Start monitoring
    monitor_canary
    
    # Generate final report
    generate_report
}

# Run main function
main "$@"