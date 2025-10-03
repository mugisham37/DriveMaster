# Adaptive Learning Platform Makefile

.PHONY: help setup dev build test clean docker-up docker-down lint format

# Default target
help:
	@echo "Adaptive Learning Platform - Available commands:"
	@echo ""
	@echo "  setup       - Set up development environment"
	@echo "  dev         - Start development servers"
	@echo "  build       - Build all services and applications"
	@echo "  test        - Run all tests"
	@echo "  lint        - Run linting on all code"
	@echo "  format      - Format all code"
	@echo "  clean       - Clean build artifacts"
	@echo "  docker-up   - Start infrastructure services"
	@echo "  docker-down - Stop infrastructure services"
	@echo ""

# Development environment setup
setup:
	@echo "Setting up development environment..."
	@npm install
	@docker-compose up -d
	@sleep 30
	@npm run db:migrate
	@npm run db:seed
	@echo "✅ Development environment ready!"

# Start development servers
dev:
	@echo "Starting development servers..."
	@npm run dev

# Build all services and applications
build:
	@echo "Building all services and applications..."
	@npm run build

# Run all tests
test:
	@echo "Running all tests..."
	@npm run test

# Run linting
lint:
	@echo "Running linting..."
	@npm run lint

# Format code
format:
	@echo "Formatting code..."
	@npm run format

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@npm run clean

# Start infrastructure services
docker-up:
	@echo "Starting infrastructure services..."
	@docker-compose up -d

# Stop infrastructure services
docker-down:
	@echo "Stopping infrastructure services..."
	@docker-compose down

# Database operations
db-migrate:
	@echo "Running database migrations..."
	@npm run db:migrate

db-seed:
	@echo "Seeding database..."
	@npm run db:seed

db-reset:
	@echo "Resetting database..."
	@npm run db:reset

# Monitoring
logs:
	@docker-compose logs -f

status:
	@docker-compose ps