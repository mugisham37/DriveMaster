# Kong API Gateway Configuration

This directory contains the Kong API Gateway configuration for the Adaptive Learning Platform.

## Overview

Kong serves as the central API Gateway providing:

- JWT authentication validation
- Rate limiting per user and endpoint
- Request/response transformation
- API versioning and routing
- Analytics and monitoring
- CORS handling
- Request size limiting

## Architecture

```
Client Apps (Flutter/Next.js)
         ↓
    Kong Gateway (Port 8000/8443)
         ↓
Internal Services (Auth, User, Content, etc.)
```

## Components

### Core Services

- **Kong Gateway**: Main proxy and admin API
- **PostgreSQL**: Kong configuration database
- **Konga**: Web-based Kong administration UI
- **Redis**: Rate limiting and caching backend

### Plugins Configured

- **JWT**: Authentication for protected endpoints
- **Rate Limiting**: Per-user and per-endpoint limits
- **CORS**: Cross-origin request handling
- **Request Size Limiting**: Payload size restrictions
- **Prometheus**: Metrics collection
- **Request Transformer**: API versioning headers

## Quick Start

1. **Start Kong and dependencies:**

   ```bash
   cd infrastructure/kong
   docker-compose up -d
   ```

2. **Wait for services to be ready:**

   ```bash
   # Check Kong health
   curl http://localhost:8001/status
   ```

3. **Run setup script:**

   ```bash
   # On Linux/Mac
   chmod +x setup-kong.sh
   ./setup-kong.sh

   # On Windows
   bash setup-kong.sh
   ```

## Service Configuration

### Authentication Service

- **Route**: `/api/v1/auth`
- **Methods**: GET, POST, PUT, DELETE
- **Plugins**: Rate Limiting (60/min, 1000/hour)
- **Authentication**: None (public endpoints)

### User Service

- **Route**: `/api/v1/users`
- **Methods**: GET, POST, PUT, DELETE
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

### Content Service

- **Route**: `/api/v1/content`
- **Methods**: GET, POST, PUT, DELETE
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

### Scheduler Service

- **Route**: `/api/v1/scheduler`
- **Methods**: GET, POST, PUT
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

### ML Service

- **Route**: `/api/v1/ml`
- **Methods**: GET, POST
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

### Event Service

- **Route**: `/api/v1/events`
- **Methods**: POST
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

### Notification Service

- **Route**: `/api/v1/notifications`
- **Methods**: GET, POST, PUT
- **Plugins**: JWT, Rate Limiting (300/min, 10000/hour)
- **Authentication**: Required

## Rate Limiting Strategy

### Authentication Service

- **Per Minute**: 60 requests
- **Per Hour**: 1000 requests
- **Reason**: More restrictive due to security sensitivity

### Other Services

- **Per Minute**: 300 requests
- **Per Hour**: 10,000 requests
- **Reason**: Balanced for normal application usage

### Backend

- **Policy**: Redis-based for distributed rate limiting
- **Database**: Redis database 1
- **Fault Tolerant**: Yes (continues on Redis failure)

## JWT Configuration

### Validation Settings

- **Algorithm**: HS256
- **Key Claim**: `iss` (issuer)
- **Required Claims**: `exp` (expiration), `iat` (issued at)
- **Maximum Expiration**: 3600 seconds (1 hour)

### Protected Endpoints

All services except the authentication service require valid JWT tokens.

## Monitoring and Analytics

### Prometheus Metrics

- Per-consumer metrics
- Status code tracking
- Latency measurements
- Bandwidth monitoring
- Upstream health checks

### Access Points

- **Kong Admin API**: http://localhost:8001
- **Kong Admin GUI**: http://localhost:8002
- **Konga Admin**: http://localhost:1337
- **Prometheus Metrics**: http://localhost:8001/metrics

## SSL/TLS Configuration

### Development

- Self-signed certificates for local development
- TLS 1.2 and 1.3 support
- Modern cipher suites

### Production

- Replace certificates in `/etc/kong/ssl/`
- Configure proper certificate chain
- Enable HSTS headers

## Troubleshooting

### Common Issues

1. **Kong not starting**

   ```bash
   # Check database connection
   docker-compose logs kong-database

   # Check Kong logs
   docker-compose logs kong
   ```

2. **Services not accessible**

   ```bash
   # Verify service registration
   curl http://localhost:8001/services

   # Check routes
   curl http://localhost:8001/routes
   ```

3. **JWT authentication failing**

   ```bash
   # Verify JWT plugin configuration
   curl http://localhost:8001/plugins | jq '.data[] | select(.name=="jwt")'
   ```

4. **Rate limiting not working**
   ```bash
   # Check Redis connection
   docker-compose exec kong kong config -c /etc/kong/kong.conf
   ```

### Health Checks

```bash
# Kong health
curl http://localhost:8001/status

# Database health
curl http://localhost:8001/status | jq '.database'

# Plugin status
curl http://localhost:8001/plugins
```

## Security Considerations

1. **JWT Secret Management**: Store JWT secrets securely
2. **Admin API Access**: Restrict admin API access in production
3. **Rate Limiting**: Adjust limits based on usage patterns
4. **SSL Certificates**: Use proper certificates in production
5. **Network Security**: Use proper firewall rules

## Performance Tuning

### Worker Configuration

- **Worker Processes**: Auto-detected based on CPU cores
- **Worker Connections**: 1024 per worker
- **Upstream Keepalive**: 60 connections per upstream

### Caching

- **Proxy Cache**: Enabled for static content
- **Cache Path**: `/tmp/kong_cache`
- **Redis Backend**: For rate limiting and session data

### Connection Pooling

- **Pool Size**: 60 connections
- **Max Requests**: 100 per connection
- **Idle Timeout**: 60 seconds

## Environment Variables

Key environment variables for configuration:

```bash
# Database
KONG_DATABASE=postgres
KONG_PG_HOST=kong-database
KONG_PG_USER=kong
KONG_PG_PASSWORD=kong_password

# Network
KONG_PROXY_LISTEN=0.0.0.0:8000, 0.0.0.0:8443 ssl
KONG_ADMIN_LISTEN=0.0.0.0:8001

# Plugins
KONG_PLUGINS=bundled,jwt,rate-limiting,request-transformer,response-transformer,prometheus,opentelemetry,cors,request-size-limiting

# Logging
KONG_LOG_LEVEL=info
```
