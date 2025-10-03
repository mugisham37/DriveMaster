.PHONY: help install dev test clean build docker-build docker-up docker-down

# Default target
help:
	@echo "Available commands:"
	@echo "  install      - Install all dependencies"
	@echo "  dev          - Start all services in development mode"
	@echo "  test         - Run all tests"
	@echo "  clean        - Clean all build artifacts"
	@echo "  build        - Build all services"
	@echo "  docker-build - Build all Docker images"
	@echo "  docker-up    - Start all services with Docker Compose"
	@echo "  docker-down  - Stop all Docker services"

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