#!/bin/bash

# Development environment setup script for Adaptive Learning Platform

set -e

echo "🚀 Setting up Adaptive Learning Platform development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Go
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+ first."
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check Flutter
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed. Please install Flutter 3.16+ first."
    exit 1
fi

echo "✅ All prerequisites are installed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:migrate

# Seed database with initial data
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start development servers: npm run dev"
echo "  2. Access services:"
echo "     - Web app: http://localhost:3000"
echo "     - API Gateway: http://localhost:8080"
echo "     - Grafana: http://localhost:3000 (admin/admin)"
echo "     - Kibana: http://localhost:5601"
echo "     - Kafka UI: http://localhost:8080"
echo "     - MinIO: http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📚 For more information, see the README.md file"