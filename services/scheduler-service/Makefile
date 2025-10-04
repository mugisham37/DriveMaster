# Scheduler Service Makefile

.PHONY: build run test clean proto deps docker-build docker-run

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=scheduler-service
BINARY_UNIX=$(BINARY_NAME)_unix

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./...

# Run the application
run:
	$(GOCMD) run main.go

# Test the application
test:
	$(GOTEST) -v ./...

# Test with coverage
test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out

# Clean build artifacts
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)
	rm -f coverage.out

# Download dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Generate Protocol Buffer code
proto:
	@echo "Generating Protocol Buffer code..."
	@if command -v protoc >/dev/null 2>&1; then \
		protoc --go_out=. --go_opt=paths=source_relative \
		       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
		       proto/scheduler.proto; \
		echo "Protocol Buffer code generated successfully"; \
	else \
		echo "protoc not found. Please install Protocol Buffers compiler."; \
		exit 1; \
	fi

# Install protoc plugins
install-proto-deps:
	$(GOGET) google.golang.org/protobuf/cmd/protoc-gen-go@latest
	$(GOGET) google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Format code
fmt:
	$(GOCMD) fmt ./...

# Lint code (requires golangci-lint)
lint:
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not found. Install it from https://golangci-lint.run/"; \
	fi

# Security scan (requires gosec)
security:
	@if command -v gosec >/dev/null 2>&1; then \
		gosec ./...; \
	else \
		echo "gosec not found. Install it with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest"; \
	fi

# Build for Linux
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v

# Docker build
docker-build:
	docker build -t scheduler-service:latest .

# Docker run
docker-run:
	docker run -p 50052:50052 -p 8082:8082 --env-file .env scheduler-service:latest

# Development setup
dev-setup: deps install-proto-deps proto
	@echo "Development environment setup complete"

# Run with hot reload (requires air)
dev:
	@if command -v air >/dev/null 2>&1; then \
		air; \
	else \
		echo "air not found. Install it with: go install github.com/cosmtrek/air@latest"; \
		echo "Running without hot reload..."; \
		$(GOCMD) run main.go; \
	fi

# Database migration (placeholder)
migrate-up:
	@echo "Running database migrations..."
	# Add migration commands here

migrate-down:
	@echo "Rolling back database migrations..."
	# Add rollback commands here

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8082/health || echo "Service is not healthy"

# Show help
help:
	@echo "Available commands:"
	@echo "  build          - Build the application"
	@echo "  run            - Run the application"
	@echo "  test           - Run tests"
	@echo "  test-coverage  - Run tests with coverage"
	@echo "  clean          - Clean build artifacts"
	@echo "  deps           - Download dependencies"
	@echo "  proto          - Generate Protocol Buffer code"
	@echo "  install-proto-deps - Install protoc plugins"
	@echo "  fmt            - Format code"
	@echo "  lint           - Lint code"
	@echo "  security       - Run security scan"
	@echo "  build-linux    - Build for Linux"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run Docker container"
	@echo "  dev-setup      - Set up development environment"
	@echo "  dev            - Run with hot reload"
	@echo "  migrate-up     - Run database migrations"
	@echo "  migrate-down   - Rollback database migrations"
	@echo "  health         - Check service health"
	@echo "  help           - Show this help message"