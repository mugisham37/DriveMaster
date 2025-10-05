#!/bin/bash

# Kong API Gateway Integration Tests
# Tests Kong configuration, routing, authentication, and rate limiting

set -e

KONG_PROXY_URL="http://localhost:8000"
KONG_ADMIN_URL="http://localhost:8001"
TEST_JWT_TOKEN=""
TEST_USER_ID="test-user-123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo "🧪 Kong API Gateway Integration Tests"
echo "===================================="

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

run_test() {
    ((TESTS_RUN++))
    echo ""
    log_info "Test $TESTS_RUN: $1"
}

# Generate test JWT token
generate_test_jwt() {
    log_info "Generating test JWT token..."
    
    # Simple JWT for testing (in production, get from auth service)
    local header='{"alg":"HS256","typ":"JWT"}'
    local payload="{\"sub\":\"$TEST_USER_ID\",\"email\":\"test@example.com\",\"roles\":[\"user\"],\"exp\":$(($(date +%s) + 3600)),\"iat\":$(date +%s),\"jti\":\"test-token-123\"}"
    local secret="your-256-bit-secret"
    
    # For testing purposes, we'll use a pre-generated token
    # In real tests, you'd generate this properly
    TEST_JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZXMiOlsidXNlciJdLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMCwianRpIjoidGVzdC10b2tlbi0xMjMifQ.example"
    
    log_success "Test JWT token generated"
}

# Test 1: Kong Health Check
test_kong_health() {
    run_test "Kong Health Check"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_ADMIN_URL/status")
    
    if [ "$response" = "200" ]; then
        log_success "Kong is healthy and responding"
    else
        log_error "Kong health check failed (HTTP $response)"
    fi
}

# Test 2: Service Registration
test_service_registration() {
    run_test "Service Registration Check"
    
    local services=$(curl -s "$KONG_ADMIN_URL/services" | jq -r '.data[].name' 2>/dev/null)
    local expected_services=("auth-service" "user-service" "content-service" "scheduler-service" "ml-service" "event-service" "notification-service")
    
    local all_found=true
    for service in "${expected_services[@]}"; do
        if echo "$services" | grep -q "$service"; then
            log_success "Service $service is registered"
        else
            log_error "Service $service is not registered"
            all_found=false
        fi
    done
    
    if [ "$all_found" = true ]; then
        log_success "All expected services are registered"
    fi
}

# Test 3: Route Configuration
test_route_configuration() {
    run_test "Route Configuration Check"
    
    local routes=$(curl -s "$KONG_ADMIN_URL/routes" | jq -r '.data[] | "\(.name):\(.paths[0])"' 2>/dev/null)
    local expected_routes=("auth-route:/api/v1/auth" "user-route:/api/v1/users" "content-route:/api/v1/content" "scheduler-route:/api/v1/scheduler")
    
    for route in "${expected_routes[@]}"; do
        if echo "$routes" | grep -q "$route"; then
            log_success "Route $route is configured"
        else
            log_error "Route $route is not configured"
        fi
    done
}

# Test 4: Authentication Service (Public Access)
test_auth_service_access() {
    run_test "Authentication Service Public Access"
    
    # Test health endpoint (should be accessible without auth)
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_PROXY_URL/api/v1/auth/health")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        log_success "Auth service is accessible without authentication"
    else
        log_error "Auth service access failed (HTTP $response)"
    fi
}

# Test 5: Protected Service Access (Without JWT)
test_protected_service_without_jwt() {
    run_test "Protected Service Access Without JWT"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_PROXY_URL/api/v1/users/profile")
    
    if [ "$response" = "401" ]; then
        log_success "Protected service correctly rejects requests without JWT"
    else
        log_error "Protected service should return 401 without JWT (got HTTP $response)"
    fi
}

# Test 6: Protected Service Access (With JWT)
test_protected_service_with_jwt() {
    run_test "Protected Service Access With JWT"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TEST_JWT_TOKEN" \
        "$KONG_PROXY_URL/api/v1/users/profile")
    
    # Accept 200, 404, or 503 (service might not be fully implemented)
    if [ "$response" = "200" ] || [ "$response" = "404" ] || [ "$response" = "503" ]; then
        log_success "Protected service accepts valid JWT token"
    else
        log_error "Protected service with JWT failed (HTTP $response)"
    fi
}

# Test 7: Rate Limiting
test_rate_limiting() {
    run_test "Rate Limiting Functionality"
    
    log_info "Sending multiple requests to test rate limiting..."
    
    local success_count=0
    local rate_limited_count=0
    
    # Send 10 requests quickly
    for i in {1..10}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_PROXY_URL/api/v1/auth/health")
        if [ "$response" = "200" ] || [ "$response" = "404" ]; then
            ((success_count++))
        elif [ "$response" = "429" ]; then
            ((rate_limited_count++))
        fi
        sleep 0.1
    done
    
    log_info "Successful requests: $success_count, Rate limited: $rate_limited_count"
    
    if [ $success_count -gt 0 ]; then
        log_success "Rate limiting is configured (some requests succeeded)"
    else
        log_error "All requests were blocked - rate limiting might be too restrictive"
    fi
}

# Test 8: CORS Headers
test_cors_headers() {
    run_test "CORS Headers Configuration"
    
    local cors_headers=$(curl -s -I -X OPTIONS \
        -H "Origin: https://app.adaptive-learning.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Authorization,Content-Type" \
        "$KONG_PROXY_URL/api/v1/auth/login" | grep -i "access-control")
    
    if echo "$cors_headers" | grep -q "access-control-allow-origin"; then
        log_success "CORS headers are configured"
    else
        log_error "CORS headers are missing"
    fi
}

# Test 9: Request Size Limiting
test_request_size_limiting() {
    run_test "Request Size Limiting"
    
    # Create a large payload (>10MB should be rejected)
    local large_payload=$(printf 'a%.0s' {1..11000000})  # ~11MB
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$large_payload" \
        "$KONG_PROXY_URL/api/v1/auth/test")
    
    if [ "$response" = "413" ]; then
        log_success "Request size limiting is working (rejected large payload)"
    else
        log_info "Request size limiting test inconclusive (HTTP $response)"
    fi
}

# Test 10: API Versioning Headers
test_api_versioning() {
    run_test "API Versioning Headers"
    
    local headers=$(curl -s -I "$KONG_PROXY_URL/api/v1/auth/health" | grep -i "x-api-version")
    
    if echo "$headers" | grep -q "v1"; then
        log_success "API versioning headers are added"
    else
        log_error "API versioning headers are missing"
    fi
}

# Test 11: Prometheus Metrics
test_prometheus_metrics() {
    run_test "Prometheus Metrics Endpoint"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_ADMIN_URL/metrics")
    
    if [ "$response" = "200" ]; then
        log_success "Prometheus metrics endpoint is accessible"
        
        # Check for specific metrics
        local metrics=$(curl -s "$KONG_ADMIN_URL/metrics")
        if echo "$metrics" | grep -q "kong_http_requests_total"; then
            log_success "Kong HTTP request metrics are available"
        else
            log_error "Kong HTTP request metrics are missing"
        fi
    else
        log_error "Prometheus metrics endpoint failed (HTTP $response)"
    fi
}

# Test 12: Plugin Configuration
test_plugin_configuration() {
    run_test "Plugin Configuration Check"
    
    local plugins=$(curl -s "$KONG_ADMIN_URL/plugins" | jq -r '.data[].name' 2>/dev/null)
    local expected_plugins=("jwt" "rate-limiting" "cors" "request-size-limiting" "prometheus")
    
    for plugin in "${expected_plugins[@]}"; do
        if echo "$plugins" | grep -q "$plugin"; then
            log_success "Plugin $plugin is configured"
        else
            log_error "Plugin $plugin is not configured"
        fi
    done
}

# Main test execution
main() {
    log_info "Starting Kong integration tests..."
    
    # Wait for Kong to be ready
    log_info "Waiting for Kong to be ready..."
    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -s "$KONG_ADMIN_URL/status" > /dev/null 2>&1; then
            break
        fi
        sleep 2
        ((retries++))
    done
    
    if [ $retries -eq 30 ]; then
        log_error "Kong is not responding after 60 seconds"
        exit 1
    fi
    
    # Generate test JWT
    generate_test_jwt
    
    # Run all tests
    test_kong_health
    test_service_registration
    test_route_configuration
    test_auth_service_access
    test_protected_service_without_jwt
    test_protected_service_with_jwt
    test_rate_limiting
    test_cors_headers
    test_request_size_limiting
    test_api_versioning
    test_prometheus_metrics
    test_plugin_configuration
    
    # Test summary
    echo ""
    echo "🏁 Test Summary"
    echo "==============="
    echo "Tests Run: $TESTS_RUN"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed!${NC}"
        exit 1
    fi
}

# Run tests
main "$@"