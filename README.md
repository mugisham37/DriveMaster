# Adaptive Learning Platform

A production-ready, scalable mobile-first system for driving test preparation that serves thousands of concurrent users. The platform combines sophisticated machine learning algorithms (Spaced Repetition System, Item Response Theory, Bayesian Knowledge Tracing, contextual bandits, and Deep Knowledge Tracing) to deliver personalized learning experiences.

## Architecture Overview

- **Mobile App**: Flutter with offline-first architecture
- **Web App**: Next.js with SSR/CSR hybrid
- **Backend**: Microservices in Go, TypeScript (NestJS), and Python
- **Databases**: PostgreSQL, Redis, Elasticsearch
- **Message Queue**: Apache Kafka
- **Infrastructure**: Docker, Kubernetes, Istio service mesh

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Go 1.21+
- Python 3.11+
- Flutter 3.16+

### Development Setup

1. Clone the repository
2. Start the development environment:
   ```bash
   docker-compose up -d
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations:
   ```bash
   npm run db:migrate
   ```
5. Start the development servers:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── apps/
│   ├── mobile/           # Flutter mobile application
│   ├── web/              # Next.js web application
│   └── api-gateway/      # Kong API Gateway configuration
├── services/
│   ├── auth-service/     # NestJS authentication service
│   ├── user-service/     # Go user and progress service
│   ├── content-service/  # NestJS content management service
│   ├── scheduler-service/# Go adaptive learning scheduler
│   ├── ml-service/       # Python ML inference service
│   ├── event-service/    # Go event ingestion service
│   └── notification-service/ # Go notification service
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── proto/            # Protocol Buffer definitions
│   └── database/         # Database schemas and migrations
├── infrastructure/
│   ├── docker/           # Docker configurations
│   ├── k8s/              # Kubernetes manifests
│   └── terraform/        # Infrastructure as code
└── tools/
    ├── scripts/          # Development and deployment scripts
    └── monitoring/       # Monitoring and observability configs
```

## Development

See individual service README files for specific development instructions.

## License

MIT License
