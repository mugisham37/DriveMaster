# Event Ingestion Service

A high-throughput Go service for ingesting learning events from the adaptive learning platform. This service handles attempt events, session events, placement events, and batch operations with built-in rate limiting, circuit breaking, and idempotency support.

## Features

- **High-Throughput Event Ingestion**: Handles thousands of concurrent requests
- **Event Validation**: Comprehensive validation using structured schemas
- **Idempotency Support**: Prevents duplicate processing using client-generated UUIDs
- **Rate Limiting**: Token bucket algorithm with per-user/IP limiting
- **Circuit Breaker**: Automatic failure detection and recovery
- **Backpressure Management**: Graceful degradation under high load
- **Kafka Integration**: Reliable event publishing with partitioning
- **Metrics & Monitoring**: Built-in performance metrics and health checks

## API Endpoints

### Event Ingestion

- `POST /api/v1/events/attempt` - Ingest attempt events
- `POST /api/v1/events/session` - Ingest session events
- `POST /api/v1/events/placement` - Ingest placement events
- `POST /api/v1/events/batch` - Batch event ingestion (up to 100 events)

### Health & Monitoring

- `GET /health` - Service health status
- `GET /metrics` - Performance metrics

## Event Types

### Attempt Event

```json
{
  "user_id": "uuid",
  "item_id": "uuid",
  "session_id": "uuid",
  "client_attempt_id": "uuid",
  "selected": "answer_data",
  "correct": true,
  "quality": 4,
  "confidence": 3,
  "time_taken_ms": 5000,
  "hints_used": 0,
  "device_type": "mobile",
  "app_version": "1.0.0"
}
```

### Session Event

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2024-01-01T00:30:00Z",
  "items_attempted": 20,
  "correct_count": 16,
  "total_time_ms": 1800000,
  "session_type": "practice",
  "topics_practiced": ["traffic_signs", "right_of_way"],
  "average_difficulty": 0.65
}
```

### Placement Event

```json
{
  "placement_id": "uuid",
  "user_id": "uuid",
  "items_administered": 15,
  "overall_accuracy": 0.73,
  "was_completed": true,
  "end_reason": "completed_normally",
  "results": {
    "ability_estimates": {...},
    "recommendations": {...}
  }
}
```

## Configuration

Environment variables (see `.env.example`):

### Server

- `PORT` - Server port (default: 8083)
- `GO_ENV` - Environment (development/production)
- `SERVER_READ_TIMEOUT` - Request read timeout
- `SERVER_WRITE_TIMEOUT` - Response write timeout
- `SERVER_IDLE_TIMEOUT` - Connection idle timeout

### Kafka

- `KAFKA_BROKERS` - Comma-separated broker list
- `KAFKA_TOPIC_*` - Topic names for different event types
- `KAFKA_PRODUCER_*` - Producer configuration

### Rate Limiting

- `RATE_LIMIT_REQUESTS_PER_MINUTE` - Max requests per minute per client
- `RATE_LIMIT_BURST` - Burst capacity
- `RATE_LIMIT_CLEANUP_INTERVAL` - Cleanup interval for old buckets

### Circuit Breaker

- `CIRCUIT_BREAKER_THRESHOLD` - Failure threshold to open circuit
- `CIRCUIT_BREAKER_TIMEOUT` - Timeout before attempting recovery
- `CIRCUIT_BREAKER_MAX_REQUESTS` - Max requests in half-open state

## Running the Service

### Development

```bash
# Copy environment file
cp .env.example .env

# Install dependencies
go mod tidy

# Run the service
go run main.go
```

### Docker

```bash
# Build image
docker build -t event-service .

# Run container
docker run -p 8083:8083 --env-file .env event-service
```

### Docker Compose

```bash
# Start with dependencies (Kafka, etc.)
docker-compose up event-service
```

## Architecture

### High-Level Flow

1. **Request Reception**: Gin HTTP server receives events
2. **Rate Limiting**: Token bucket algorithm checks request limits
3. **Circuit Breaker**: Monitors service health and prevents cascading failures
4. **Validation**: Comprehensive event validation using structured schemas
5. **Idempotency**: Client-generated UUIDs prevent duplicate processing
6. **Kafka Publishing**: Events published to appropriate topics with partitioning
7. **Response**: Success/failure response with event ID and processing time

### Key Components

- **Event Handler**: HTTP request processing and validation
- **Kafka Publisher**: Reliable event publishing with batching
- **Rate Limiter**: Token bucket implementation with cleanup
- **Circuit Breaker**: State machine for failure detection
- **Validator**: Schema-based event validation
- **Metrics**: Performance tracking and monitoring

### Concurrency & Performance

- **Goroutine Pool**: Efficient request handling
- **Batch Processing**: Kafka batch publishing for throughput
- **Connection Pooling**: Reused Kafka connections
- **Memory Management**: Efficient JSON marshaling/unmarshaling
- **Partitioning**: User-based partitioning for ordering guarantees

## Monitoring

### Health Checks

The `/health` endpoint provides:

- Service status
- Dependency health (Kafka connectivity)
- Uptime information
- Component status

### Metrics

The `/metrics` endpoint provides:

- Events processed count
- Events per second
- Average latency
- Error rate
- Kafka lag (when implemented)
- Circuit breaker state

### Logging

Structured JSON logging includes:

- Request/response details
- Event processing status
- Error conditions
- Performance metrics
- Circuit breaker state changes

## Error Handling

### Validation Errors

- Field-level validation with detailed error messages
- HTTP 400 with validation error details
- Structured error responses

### Rate Limiting

- HTTP 429 with retry-after header
- Per-user and per-IP limiting
- Graceful degradation

### Circuit Breaker

- HTTP 503 when circuit is open
- Automatic recovery attempts
- State change logging

### Kafka Failures

- Retry logic with exponential backoff
- Dead letter queue support (future)
- Graceful error responses

## Security

### Input Validation

- Comprehensive schema validation
- SQL injection prevention
- XSS protection
- Size limits on requests

### Rate Limiting

- Per-user and per-IP limits
- Burst protection
- DDoS mitigation

### Idempotency

- Client-generated UUIDs
- Duplicate detection
- Consistent responses

## Performance Characteristics

### Throughput

- Target: 10,000+ events/second
- Batch processing: Up to 100 events per request
- Kafka batching: Configurable batch sizes

### Latency

- Target: p95 < 300ms for single events
- p99 < 500ms for batch operations
- Circuit breaker: Fast failure detection

### Scalability

- Horizontal scaling support
- Stateless design
- Kafka partitioning for load distribution

## Development

### Project Structure

```
services/event-service/
├── main.go                 # Application entry point
├── internal/
│   ├── config/            # Configuration management
│   ├── handlers/          # HTTP request handlers
│   ├── middleware/        # Rate limiting, circuit breaker
│   ├── models/           # Event data models
│   ├── publisher/        # Kafka publishing
│   ├── server/           # HTTP server setup
│   └── validation/       # Event validation
├── Dockerfile            # Container configuration
└── README.md            # This file
```

### Testing

```bash
# Run unit tests
go test ./...

# Run with coverage
go test -cover ./...

# Run integration tests (requires Kafka)
go test -tags=integration ./...
```

### Code Quality

- Go fmt for formatting
- Go vet for static analysis
- golangci-lint for comprehensive linting
- Structured logging throughout

## Future Enhancements

- [ ] Protocol Buffer event serialization
- [ ] Dead letter queue implementation
- [ ] Advanced metrics (Prometheus integration)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Event replay capabilities
- [ ] Schema registry integration
- [ ] Advanced backpressure algorithms
- [ ] Multi-region deployment support
