# Development Guide

This guide covers the development setup and workflow for the Adaptive Learning Platform.

## Prerequisites

Before starting development, ensure you have the following installed:

- **Docker & Docker Compose**: For running infrastructure services
- **Node.js 18+**: For TypeScript services and web application
- **Go 1.21+**: For high-performance backend services
- **Python 3.11+**: For ML inference service
- **Flutter 3.16+**: For mobile application development

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adaptive-learning-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the setup script**
   ```bash
   # On Unix/Linux/macOS
   ./tools/scripts/setup-dev.sh
   
   # On Windows
   .\tools\scripts\setup-dev.ps1
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── apps/                     # Client applications
│   ├── mobile/              # Flutter mobile app
│   └── web/                 # Next.js web app
├── services/                # Backend microservices
│   ├── auth-service/        # Authentication (NestJS)
│   ├── content-service/     # Content management (NestJS)
│   ├── user-service/        # User management (Go)
│   ├── scheduler-service/   # Adaptive learning engine (Go)
│   ├── ml-service/          # ML inference (Python)
│   ├── event-service/       # Event ingestion (Go)
│   └── notification-service/ # Notifications (Go)
├── packages/                # Shared packages
│   ├── database/            # Database schemas
│   ├── shared-types/        # TypeScript types
│   └── proto/               # Protocol buffers
├── infrastructure/          # Infrastructure configs
│   ├── docker/              # Docker configurations
│   ├── k8s/                 # Kubernetes manifests
│   └── terraform/           # Infrastructure as code
└── tools/                   # Development tools
    ├── scripts/             # Setup and utility scripts
    └── monitoring/          # Monitoring configurations
```

## Development Workflow

### 1. Infrastructure Services

Start all required infrastructure services:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Kafka + Zookeeper (port 9092)
- Elasticsearch (port 9200)
- Prometheus (port 9090)
- Grafana (port 3000)
- Kibana (port 5601)
- MinIO (port 9000/9001)

### 2. Backend Services

Each service can be started individually:

```bash
# Authentication service (NestJS)
cd services/auth-service
npm run dev

# User service (Go)
cd services/user-service
go run main.go

# Content service (NestJS)
cd services/content-service
npm run dev

# Scheduler service (Go)
cd services/scheduler-service
go run main.go

# ML service (Python)
cd services/ml-service
python -m uvicorn main:app --reload
```

Or start all services at once:

```bash
npm run dev
```

### 3. Frontend Applications

```bash
# Web application
cd apps/web
npm run dev

# Mobile application
cd apps/mobile
flutter run
```

## Database Management

### Migrations

```bash
# Run migrations
npm run db:migrate

# Generate new migration
cd packages/database
npm run generate

# Reset database
npm run db:reset
```

### Seeding

```bash
# Seed with initial data
npm run db:seed
```

## Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Run specific service tests
cd services/auth-service && npm test
cd services/user-service && go test ./...
cd services/ml-service && python -m pytest
```

### Integration Tests

```bash
# Run integration tests
npm run test:e2e
```

### Load Testing

```bash
# Install k6
# Run load tests
k6 run tools/load-tests/basic-flow.js
```

## Code Quality

### Linting

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Formatting

```bash
# Format all code
npm run format
```

## Monitoring and Debugging

### Service Health

Check service status:

```bash
# Docker services
docker-compose ps

# Application services
make status
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Monitoring Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601
- **Kafka UI**: http://localhost:8080

## API Documentation

### REST APIs

API documentation is available at:
- Auth Service: http://localhost:3001/api/docs
- Content Service: http://localhost:3002/api/docs

### gRPC Services

Protocol buffer definitions are in `packages/proto/`.

## Mobile Development

### Flutter Setup

```bash
cd apps/mobile

# Get dependencies
flutter pub get

# Run code generation
flutter packages pub run build_runner build

# Run on device/emulator
flutter run
```

### Testing

```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports are already in use
2. **Database connection**: Ensure PostgreSQL is running
3. **Redis connection**: Ensure Redis is running
4. **Kafka issues**: Check Kafka and Zookeeper are healthy

### Reset Development Environment

```bash
# Stop all services
docker-compose down -v

# Clean build artifacts
npm run clean

# Restart setup
./tools/scripts/setup-dev.sh
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## Environment Variables

See `.env.example` for all available configuration options.

## Performance Considerations

- Use Redis for caching frequently accessed data
- Implement connection pooling for databases
- Use gRPC for internal service communication
- Implement proper indexing for database queries
- Use CDN for static assets

## Security

- Never commit secrets to version control
- Use environment variables for configuration
- Implement proper authentication and authorization
- Validate all inputs
- Use HTTPS in production
- Regularly update dependencies