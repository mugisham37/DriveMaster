# Adaptive Learning Platform

A production-ready, scalable mobile-first system for driving test preparation using advanced machine learning algorithms.

## Architecture

This monorepo contains the following services:

- **auth-service** (NestJS) - Authentication and authorization
- **user-service** (Go) - User management and progress tracking
- **content-service** (NestJS) - Content management system
- **scheduler-service** (Go) - Adaptive learning scheduler
- **ml-service** (Python) - Machine learning inference
- **event-service** (Go) - Event ingestion and processing
- **notification-service** (NestJS) - Push notifications
- **fraud-service** (Python) - Fraud detection
- **mobile-app** (Flutter) - Mobile application
- **web-app** (Next.js) - Web application

## Development Setup

1. Install dependencies:

   ```bash
   make install
   ```

2. Start all services:

   ```bash
   make dev
   ```

3. Run tests:
   ```bash
   make test
   ```

## Requirements

- Docker and Docker Compose
- Go 1.21+
- Node.js 18+
- Python 3.11+
- Flutter 3.16+
