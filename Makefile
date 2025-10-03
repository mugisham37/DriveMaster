.PHONY: help install dev test clean build docker-build docker-up docker-down redis-cluster-up redis-cluster-down redis-cluster-init redis-backup redis-restore kafka-up kafka-down kafka-topics kafka-admin proto-gen schema-registry-setup dev-setup health-check monitoring-up

# Default target
help:
	@echo "Available commands:"
	@echo "  install           - Install all dependencies"
	@echo "  dev               - Start all services in development mode"
	@echo "  test              - Run all tests"
	@echo "  clean             - Clean all build artifacts"
	@echo "  build             - Build all services"
	@echo "  docker-build      - Build all Docker images"
	@echo "  docker-up         - Start all services with Docker Compose"
	@echo "  docker-down       - Stop all Docker services"
	@echo "  redis-cluster-up  - Start Redis cluster for production"
	@echo "  redis-cluster-down- Stop Redis cluster"
	@echo "  redis-cluster-init- Initialize Redis cluster"
	@echo "  redis-backup      - Create Redis cluster backup"
	@echo "  redis-restore     - Restore Redis cluster from backup"
	@echo "  kafka-up          - Start Kafka cluster with monitoring"
	@echo "  kafka-down        - Stop Kafka cluster"
	@echo "  kafka-topics      - Create Kafka topics"
	@echo "  kafka-admin       - Run Kafka admin commands"
	@echo "  proto-gen         - Generate Protocol Buffer code"
	@echo "  schema-registry-setup - Register schemas in Schema Registry"
	@echo "  dev-setup         - Set up complete development environment"
	@echo "  health-check      - Check health of all infrastructure"
	@echo "  monitoring-up     - Start monitoring stack"

# Install dependencies for all services
install:
	@echo "Installing Go dependencies..."
	cd services/user-service && go mod download
	cd services/scheduler-service && go mod download
	cd services/event-service && go mod download
	@echo "Installing Node.js dependencies..."
	cd services/auth-service && npm install
	cd services/content-service && npm install
	cd services/notification-service && npm install
	cd apps/web-app && npm install
	@echo "Installing Python dependencies..."
	cd services/ml-service && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	cd services/fraud-service && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "Installing Flutter dependencies..."
	cd apps/mobile-app && flutter pub get

# Start all services in development mode
dev:
	docker-compose up -d postgres redis kafka
	@echo "Starting backend services..."
	cd services/auth-service && npm run start:dev &
	cd services/content-service && npm run start:dev &
	cd services/notification-service && npm run start:dev &
	cd services/user-service && go run main.go &
	cd services/scheduler-service && go run main.go &
	cd services/event-service && go run main.go &
	cd services/ml-service && source venv/bin/activate && uvicorn main:app --reload &
	cd services/fraud-service && source venv/bin/activate && uvicorn main:app --reload &
	@echo "Starting frontend applications..."
	cd apps/web-app && npm run dev &
	@echo "All services started. Use 'make docker-down' to stop infrastructure."

# Run tests for all services
test:
	@echo "Running Go tests..."
	cd services/user-service && go test ./...
	cd services/scheduler-service && go test ./...
	cd services/event-service && go test ./...
	@echo "Running Node.js tests..."
	cd services/auth-service && npm run test
	cd services/content-service && npm run test
	cd services/notification-service && npm run test
	cd apps/web-app && npm run test
	@echo "Running Python tests..."
	cd services/ml-service && source venv/bin/activate && pytest
	cd services/fraud-service && source venv/bin/activate && pytest
	@echo "Running Flutter tests..."
	cd apps/mobile-app && flutter test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cd services/user-service && go clean
	cd services/scheduler-service && go clean
	cd services/event-service && go clean
	cd services/auth-service && rm -rf dist node_modules/.cache
	cd services/content-service && rm -rf dist node_modules/.cache
	cd services/notification-service && rm -rf dist node_modules/.cache
	cd apps/web-app && rm -rf .next node_modules/.cache
	cd apps/mobile-app && flutter clean

# Build all services
build:
	@echo "Building Go services..."
	cd services/user-service && go build -o bin/user-service
	cd services/scheduler-service && go build -o bin/scheduler-service
	cd services/event-service && go build -o bin/event-service
	@echo "Building Node.js services..."
	cd services/auth-service && npm run build
	cd services/content-service && npm run build
	cd services/notification-service && npm run build
	cd apps/web-app && npm run build
	@echo "Building Flutter app..."
	cd apps/mobile-app && flutter build apk

# Build Docker images
docker-build:
	docker-compose build

# Start all services with Docker Compose
docker-up:
	docker-compose up -d

# Stop all Docker services
docker-down:
	docker-compose down

# Redis Cluster Management
redis-cluster-up:
	@echo "Starting Redis cluster..."
	cd scripts/redis-cluster && docker-compose -f docker-compose.redis-cluster.yml up -d
	@echo "Waiting for cluster initialization..."
	sleep 30
	@echo "Redis cluster started. Nodes available on ports 7001-7006"

redis-cluster-down:
	@echo "Stopping Redis cluster..."
	cd scripts/redis-cluster && docker-compose -f docker-compose.redis-cluster.yml down
	@echo "Redis cluster stopped"

redis-cluster-init:
	@echo "Initializing Redis cluster..."
	cd scripts/redis-cluster && bash setup-cluster.sh
	@echo "Redis cluster initialization complete"

redis-backup:
	@echo "Creating Redis cluster backup..."
	cd scripts/redis-cluster && bash backup-recovery.sh backup
	@echo "Backup completed"

redis-restore:
	@echo "Available backups:"
	cd scripts/redis-cluster && bash backup-recovery.sh list
	@echo "Use: cd scripts/redis-cluster && bash backup-recovery.sh restore <node-name> <backup-name>"
# Kafk
a Infrastructure
kafka-up:
	@echo "Starting Kafka cluster..."
	cd scripts/kafka-cluster && docker-compose -f docker-compose.kafka-cluster.yml up -d
	@echo "Waiting for Kafka to be ready..."
	sleep 30
	@echo "Creating topics..."
	cd scripts/kafka-cluster && bash create-topics.sh
	@echo "Kafka cluster is ready!"

kafka-down:
	cd scripts/kafka-cluster && docker-compose -f docker-compose.kafka-cluster.yml down

kafka-topics:
	cd scripts/kafka-cluster && bash create-topics.sh

kafka-admin:
	cd scripts/kafka-cluster && bash kafka-admin.sh $(CMD)

# Protocol Buffers
proto-gen:
	@echo "Generating Protocol Buffer code..."
	cd shared/proto && bash generate.sh
	@echo "Protocol Buffer code generation completed!"

schema-registry-setup:
	@echo "Setting up Schema Registry..."
	cd shared/proto && bash schema-registry.sh check
	cd shared/proto && bash schema-registry.sh register-all
	@echo "Schema Registry setup completed!"

# Development Environment
dev-setup:
	@echo "Setting up complete development environment..."
	make kafka-up
	make proto-gen
	make schema-registry-setup
	make install
	@echo "Development environment ready!"

# Infrastructure Health Checks
health-check:
	@echo "Checking infrastructure health..."
	@echo "=== PostgreSQL ==="
	docker-compose exec postgres pg_isready -U postgres || echo "PostgreSQL not ready"
	@echo "=== Redis ==="
	docker-compose exec redis redis-cli ping || echo "Redis not ready"
	@echo "=== Kafka ==="
	cd scripts/kafka-cluster && bash kafka-admin.sh health || echo "Kafka not ready"
	@echo "=== Schema Registry ==="
	cd shared/proto && bash schema-registry.sh check || echo "Schema Registry not ready"

# Monitoring
monitoring-up:
	cd scripts/kafka-cluster && docker-compose -f kafka-monitoring.yml up -d
	@echo "Monitoring stack started:"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3000 (admin/admin)"
	@echo "  - Kafka UI: http://localhost:8080"
	@echo "  - AlertManager: http://localhost:9093"