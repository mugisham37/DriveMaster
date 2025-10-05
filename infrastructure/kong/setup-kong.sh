#!/bin/bash

# Kong API Gateway Setup Script for Adaptive Learning Platform
# This script configures Kong with services, routes, and plugins

set -e

KONG_ADMIN_URL="http://localhost:8001"
AUTH_SERVICE_URL="http://auth-service:3000"
USER_SERVICE_URL="http://user-service:8080"
CONTENT_SERVICE_URL="http://content-service:3001"
SCHEDULER_SERVICE_URL="http://scheduler-service:8081"
ML_SERVICE_URL="http://ml-service:8000"
EVENT_SERVICE_URL="http://event-service:8082"
NOTIFICATION_SERVICE_URL="http://notification-service:3002"

echo "🚀 Setting up Kong API Gateway for Adaptive Learning Platform..."

# Wait for Kong to be ready
echo "⏳ Waiting for Kong to be ready..."
until curl -f -s "${KONG_ADMIN_URL}/status" > /dev/null; do
    echo "Waiting for Kong..."
    sleep 5
done
echo "✅ Kong is ready!"

# Function to create or update service
create_service() {
    local name=$1
    local url=$2
    local path=$3
    
    echo "📝 Creating service: $name"
    
    # Check if service exists
    if curl -s "${KONG_ADMIN_URL}/services/${name}" | grep -q "name"; then
        echo "Service $name already exists, updating..."
        curl -X PATCH "${KONG_ADMIN_URL}/services/${name}" \
            -H "Content-Type: application/json" \
            -d "{
                \"url\": \"${url}\",
                \"connect_timeout\": 60000,
                \"write_timeout\": 60000,
                \"read_timeout\": 60000,
                \"retries\": 5
            }"
    else
        echo "Creating new service $name..."
        curl -X POST "${KONG_ADMIN_URL}/services" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"${name}\",
                \"url\": \"${url}\",
                \"connect_timeout\": 60000,
                \"write_timeout\": 60000,
                \"read_timeout\": 60000,
                \"retries\": 5
            }"
    fi
}

# Function to create route
create_route() {
    local service_name=$1
    local route_name=$2
    local path=$3
    local methods=$4
    
    echo "🛣️  Creating route: $route_name for service: $service_name"
    
    curl -X POST "${KONG_ADMIN_URL}/services/${service_name}/routes" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${route_name}\",
            \"paths\": [\"${path}\"],
            \"methods\": ${methods},
            \"strip_path\": true,
            \"preserve_host\": false
        }"
}

# Function to add plugin to service
add_plugin() {
    local service_name=$1
    local plugin_name=$2
    local config=$3
    
    echo "🔌 Adding plugin: $plugin_name to service: $service_name"
    
    curl -X POST "${KONG_ADMIN_URL}/services/${service_name}/plugins" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${plugin_name}\",
            \"config\": ${config}
        }"
}

# Create services
create_service "auth-service" "$AUTH_SERVICE_URL" "/api/v1/auth"
create_service "user-service" "$USER_SERVICE_URL" "/api/v1/users"
create_service "content-service" "$CONTENT_SERVICE_URL" "/api/v1/content"
create_service "scheduler-service" "$SCHEDULER_SERVICE_URL" "/api/v1/scheduler"
create_service "ml-service" "$ML_SERVICE_URL" "/api/v1/ml"
create_service "event-service" "$EVENT_SERVICE_URL" "/api/v1/events"
create_service "notification-service" "$NOTIFICATION_SERVICE_URL" "/api/v1/notifications"

# Create routes
create_route "auth-service" "auth-route" "/api/v1/auth" "[\"GET\", \"POST\", \"PUT\", \"DELETE\"]"
create_route "user-service" "user-route" "/api/v1/users" "[\"GET\", \"POST\", \"PUT\", \"DELETE\"]"
create_route "content-service" "content-route" "/api/v1/content" "[\"GET\", \"POST\", \"PUT\", \"DELETE\"]"
create_route "scheduler-service" "scheduler-route" "/api/v1/scheduler" "[\"GET\", \"POST\", \"PUT\"]"
create_route "ml-service" "ml-route" "/api/v1/ml" "[\"GET\", \"POST\"]"
create_route "event-service" "event-route" "/api/v1/events" "[\"POST\"]"
create_route "notification-service" "notification-route" "/api/v1/notifications" "[\"GET\", \"POST\", \"PUT\"]"

# Add JWT authentication plugin (except for auth service)
echo "🔐 Setting up JWT authentication..."

# JWT plugin for protected services
jwt_config='{
    "key_claim_name": "iss",
    "secret_is_base64": false,
    "claims_to_verify": ["exp", "iat"],
    "maximum_expiration": 3600,
    "algorithm": "HS256"
}'

add_plugin "user-service" "jwt" "$jwt_config"
add_plugin "content-service" "jwt" "$jwt_config"
add_plugin "scheduler-service" "jwt" "$jwt_config"
add_plugin "ml-service" "jwt" "$jwt_config"
add_plugin "event-service" "jwt" "$jwt_config"
add_plugin "notification-service" "jwt" "$jwt_config"

# Add rate limiting plugins
echo "⚡ Setting up rate limiting..."

# Rate limiting for auth service (more restrictive)
auth_rate_limit='{
    "minute": 60,
    "hour": 1000,
    "policy": "redis",
    "redis_host": "redis-cluster",
    "redis_port": 6379,
    "redis_database": 1,
    "fault_tolerant": true,
    "hide_client_headers": false
}'

add_plugin "auth-service" "rate-limiting" "$auth_rate_limit"

# Rate limiting for other services
general_rate_limit='{
    "minute": 300,
    "hour": 10000,
    "policy": "redis",
    "redis_host": "redis-cluster",
    "redis_port": 6379,
    "redis_database": 1,
    "fault_tolerant": true,
    "hide_client_headers": false
}'

add_plugin "user-service" "rate-limiting" "$general_rate_limit"
add_plugin "content-service" "rate-limiting" "$general_rate_limit"
add_plugin "scheduler-service" "rate-limiting" "$general_rate_limit"
add_plugin "ml-service" "rate-limiting" "$general_rate_limit"
add_plugin "event-service" "rate-limiting" "$general_rate_limit"
add_plugin "notification-service" "rate-limiting" "$general_rate_limit"

# Add CORS plugin globally
echo "🌐 Setting up CORS..."
cors_config='{
    "origins": ["*"],
    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    "headers": ["Accept", "Accept-Version", "Content-Length", "Content-MD5", "Content-Type", "Date", "Authorization"],
    "exposed_headers": ["X-Auth-Token"],
    "credentials": true,
    "max_age": 3600,
    "preflight_continue": false
}'

curl -X POST "${KONG_ADMIN_URL}/plugins" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"cors\",
        \"config\": ${cors_config}
    }"

# Add request size limiting
echo "📏 Setting up request size limits..."
size_limit_config='{
    "allowed_payload_size": 10,
    "size_unit": "megabytes",
    "require_content_length": false
}'

curl -X POST "${KONG_ADMIN_URL}/plugins" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"request-size-limiting\",
        \"config\": ${size_limit_config}
    }"

# Add Prometheus metrics plugin
echo "📊 Setting up Prometheus metrics..."
prometheus_config='{
    "per_consumer": true,
    "status_code_metrics": true,
    "latency_metrics": true,
    "bandwidth_metrics": true,
    "upstream_health_metrics": true
}'

curl -X POST "${KONG_ADMIN_URL}/plugins" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"prometheus\",
        \"config\": ${prometheus_config}
    }"

# Add request/response transformation for API versioning
echo "🔄 Setting up API versioning..."
version_transform_config='{
    "add": {
        "headers": ["X-API-Version:v1"]
    }
}'

curl -X POST "${KONG_ADMIN_URL}/plugins" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"request-transformer\",
        \"config\": ${version_transform_config}
    }"

echo "✅ Kong API Gateway setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Kong Admin API: http://localhost:8001"
echo "  - Kong Admin GUI: http://localhost:8002"
echo "  - Kong Proxy: http://localhost:8000"
echo "  - Kong Proxy SSL: https://localhost:8443"
echo "  - Konga Admin: http://localhost:1337"
echo ""
echo "🔗 API Endpoints:"
echo "  - Auth Service: http://localhost:8000/api/v1/auth"
echo "  - User Service: http://localhost:8000/api/v1/users"
echo "  - Content Service: http://localhost:8000/api/v1/content"
echo "  - Scheduler Service: http://localhost:8000/api/v1/scheduler"
echo "  - ML Service: http://localhost:8000/api/v1/ml"
echo "  - Event Service: http://localhost:8000/api/v1/events"
echo "  - Notification Service: http://localhost:8000/api/v1/notifications"