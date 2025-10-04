# Scheduler Service

The Scheduler Service is a high-performance Go microservice that implements the core adaptive learning algorithms for the Adaptive Learning Platform. It provides intelligent item selection using SM-2 spaced repetition, Bayesian Knowledge Tracing (BKT), Item Response Theory (IRT), and contextual bandits.

## Features

- **High-Performance Architecture**: Built with Go for deterministic performance and low latency
- **gRPC API**: Type-safe internal communication with Protocol Buffers
- **Redis Integration**: Hot data caching for sub-300ms response times
- **PostgreSQL Integration**: Persistent state storage with optimistic locking
- **Comprehensive Monitoring**: Prometheus metrics and structured logging
- **Health Checks**: Built-in health endpoints for orchestration

## Architecture

### Core Components

- **gRPC Server**: Handles internal service communication
- **Algorithm Engine**: Implements SM-2, BKT, IRT, and unified scoring
- **Cache Layer**: Redis-based caching for hot data
- **Database Layer**: PostgreSQL with GORM for state persistence
- **Metrics & Logging**: Prometheus metrics and structured logging

### Key Algorithms

1. **SM-2 Spaced Repetition**: Manages review intervals based on performance
2. **Bayesian Knowledge Tracing**: Tracks topic-level knowledge probability
3. **Item Response Theory**: Estimates user ability and item difficulty
4. **Unified Scoring**: Combines multiple signals for optimal item selection
5. **Contextual Bandits**: Selects session strategies with exploration

## Getting Started

### Prerequisites

- Go 1.21 or later
- PostgreSQL 13+
- Redis 6+
- Protocol Buffers compiler (protoc)

### Installation

1. Clone the repository and navigate to the scheduler service:

```bash
cd services/scheduler-service
```

2. Set up the development environment:

```bash
make dev-setup
```

3. Copy the environment configuration:

```bash
cp .env.example .env
```

4. Update the `.env` file with your database and Redis configurations.

### Running the Service

#### Development Mode

```bash
make dev
```

#### Production Mode

```bash
make build
./scheduler-service
```

#### Using Docker

```bash
make docker-build
make docker-run
```

## Configuration

The service is configured via environment variables. See `.env.example` for all available options.

### Key Configuration Options

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `GRPC_PORT`: gRPC server port (default: 50052)
- `HTTP_PORT`: HTTP metrics server port (default: 8082)
- Algorithm parameters for SM-2, BKT, IRT, and scoring weights

## API Reference

The service exposes a gRPC API defined in `proto/scheduler.proto`. Key endpoints include:

### Core Methods

- `GetNextItems`: Returns recommended items for a user session
- `RecordAttempt`: Processes user attempts and updates state
- `GetPlacementItems`: Returns items for placement testing
- `InitializeUser`: Sets up initial state for new users

### State Management

- `GetUserState`: Retrieves current scheduler state
- `GetItemDifficulty`: Returns item difficulty parameters
- `GetTopicMastery`: Returns user's topic mastery levels

### Health & Monitoring

- `Health`: Service health check
- `/metrics`: Prometheus metrics endpoint
- `/health`: HTTP health check endpoint

## Development

### Code Generation

Generate Protocol Buffer code:

```bash
make proto
```

### Testing

Run tests:

```bash
make test
```

Run tests with coverage:

```bash
make test-coverage
```

### Code Quality

Format code:

```bash
make fmt
```

Lint code:

```bash
make lint
```

Security scan:

```bash
make security
```

## Monitoring

### Metrics

The service exposes Prometheus metrics on `/metrics`:

- Request latency and throughput
- Algorithm update counters
- Cache hit/miss rates
- Database connection stats
- Business metrics (active users, sessions, etc.)

### Logging

Structured logging with configurable levels and formats:

- JSON format for production
- Text format for development
- Trace ID correlation across requests
- Context-aware logging with user/request metadata

### Health Checks

- gRPC health service for orchestration
- HTTP health endpoint for load balancers
- Dependency health checks (database, Redis)

## Performance

### Targets

- **Item Selection**: p95 < 300ms
- **State Updates**: p95 < 100ms
- **Cache Hit Rate**: > 90%
- **Throughput**: > 1000 RPS per instance

### Optimization Strategies

- Redis caching for hot data
- Connection pooling for database
- Optimistic locking for concurrent updates
- Batch operations where possible
- Efficient algorithm implementations

## Deployment

### Docker

Build and run with Docker:

```bash
make docker-build
make docker-run
```

### Kubernetes

The service is designed for Kubernetes deployment with:

- Health checks for liveness/readiness probes
- Graceful shutdown handling
- Resource limits and requests
- Horizontal pod autoscaling support

## Contributing

1. Follow Go best practices and conventions
2. Add tests for new functionality
3. Update documentation for API changes
4. Run linting and security scans
5. Ensure all tests pass

## License

This project is part of the Adaptive Learning Platform and follows the same licensing terms.
