# DriveMaster Platform

A production-grade adaptive driving test learning platform designed to serve 100,000+ concurrent users globally. The system leverages advanced machine learning algorithms including Bayesian Knowledge Tracing and Multi-Armed Bandit algorithms to create personalized learning experiences.

## 🏗️ Architecture

DriveMaster follows a microservices architecture with the following services:

- **User Service** (`user-svc`) - Authentication, user management, and profiles
- **Adaptive Learning Service** (`adaptive-svc`) - ML algorithms for personalized learning
- **Content Service** (`content-svc`) - Content management and delivery
- **Analytics Service** (`analytics-svc`) - Real-time analytics and insights
- **Engagement Service** (`engagement-svc`) - Gamification and notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9.0+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis Stack 7.2+
- Apache Kafka 7.5+
- Elasticsearch 8.11+

### Development Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd drivemaster
   pnpm install
   ```

2. **Start infrastructure services:**

   ```bash
   pnpm docker:dev
   ```

3. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations:**

   ```bash
   pnpm db:migrate
   ```

5. **Start development services:**
   ```bash
   pnpm dev:services
   ```

### Available Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all services and packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code
- `pnpm docker:dev` - Start development infrastructure
- `pnpm docker:down` - Stop development infrastructure

## 🛠️ Technology Stack

### Backend

- **Framework:** Fastify 4.24+ (high-performance Node.js framework)
- **Language:** TypeScript 5.3+ with strict mode
- **Database:** PostgreSQL 16+ with Drizzle ORM
- **Caching:** Redis Stack 7.2+ (caching, sessions, vector operations)
- **Message Queue:** Apache Kafka 7.5+ with KafkaJS
- **Search:** Elasticsearch 8.11+
- **Monitoring:** Prometheus + Grafana + OpenTelemetry

### Development Tools

- **Package Manager:** pnpm (monorepo with workspaces)
- **Code Quality:** ESLint + Prettier + Husky
- **Testing:** Jest with comprehensive coverage
- **Documentation:** Swagger/OpenAPI 3.0
- **Containerization:** Docker with multi-stage builds

## 📁 Project Structure

```
drivemaster/
├── packages/                    # Shared packages
│   ├── shared-config/          # Common configuration and utilities
│   ├── contracts/              # API contracts and types
│   ├── kafka-client/           # Kafka client wrapper
│   ├── redis-client/           # Redis client wrapper
│   ├── es-client/              # Elasticsearch client wrapper
│   └── telemetry/              # Observability utilities
├── services/                   # Microservices
│   ├── user-svc/              # User management service
│   ├── adaptive-svc/          # Adaptive learning engine
│   ├── content-svc/           # Content management service
│   ├── analytics-svc/         # Real-time analytics service
│   └── engagement-svc/        # Engagement and notifications
├── apps/                      # Client applications
│   └── mobile/                # React Native mobile app
├── infra/                     # Infrastructure as code
│   ├── helm/                  # Kubernetes Helm charts
│   └── kong/                  # API Gateway configuration
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── config/                    # Configuration files
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Service Configuration
NODE_ENV=development
SERVICE_NAME=drivemaster
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drivemaster_dev
DB_USER=drivemaster
DB_PASSWORD=dev_password_123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_123

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=drivemaster-client

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
```

### Service Ports

- User Service: 3001
- Adaptive Learning Service: 3002
- Content Service: 3003
- Analytics Service: 3004
- Engagement Service: 3005

## 🐳 Docker Development

The project includes a comprehensive Docker setup for development:

```bash
# Start all infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Included Services

- PostgreSQL 16 with performance optimizations
- Redis Stack 7.2 with RedisInsight UI
- Apache Kafka with Zookeeper and Kafka UI
- Elasticsearch with Kibana
- All services configured with health checks

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific service tests
pnpm --filter user-svc test
```

## 📊 Monitoring & Observability

### Development Tools

- **API Documentation:** Available at `http://localhost:3001/docs` (Swagger UI)
- **Redis Insight:** Available at `http://localhost:8001`
- **Kafka UI:** Available at `http://localhost:8080`
- **Kibana:** Available at `http://localhost:5601`

### Health Checks

Each service exposes health check endpoints:

- `/health` - Basic health status
- `/ready` - Readiness check (includes dependencies)

## 🔒 Security

- JWT-based authentication with refresh tokens
- Rate limiting with Redis-backed storage
- Input validation with Zod schemas
- Security headers with Helmet
- CORS configuration
- SQL injection prevention with parameterized queries

## 🚀 Production Deployment

### Building for Production

```bash
# Build all services
pnpm build

# Build specific service Docker image
docker build --build-arg SERVICE_NAME=user-svc -t drivemaster/user-svc .
```

### Performance Optimizations

- Connection pooling for PostgreSQL
- Redis caching with intelligent invalidation
- Kafka batching and compression
- Elasticsearch query optimization
- Multi-stage Docker builds for minimal image size

## 📈 Performance Targets

- **Response Time:** Sub-100ms p95 for API endpoints
- **Throughput:** 100,000+ concurrent users
- **Uptime:** 99.99% availability
- **Scalability:** Horizontal scaling with Kubernetes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Quality

- All code must pass ESLint and Prettier checks
- Minimum 80% test coverage required
- All commits must pass pre-commit hooks
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/docs` endpoint

---

Built with ❤️ for better driving education
