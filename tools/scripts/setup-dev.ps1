# Development environment setup script for Adaptive Learning Platform (PowerShell)

Write-Host "🚀 Setting up Adaptive Learning Platform development environment..." -ForegroundColor Green

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Go
if (!(Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Go is not installed. Please install Go 1.21+ first." -ForegroundColor Red
    exit 1
}

# Check Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python is not installed. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

# Check Flutter
if (!(Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Flutter is not installed. Please install Flutter 3.16+ first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites are installed" -ForegroundColor Green

# Install Node.js dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

# Start infrastructure services
Write-Host "🐳 Starting infrastructure services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
docker-compose ps

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
npm run db:migrate

# Seed database with initial data
Write-Host "🌱 Seeding database with initial data..." -ForegroundColor Yellow
npm run db:seed

Write-Host "✅ Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start development servers: npm run dev"
Write-Host "  2. Access services:"
Write-Host "     - Web app: http://localhost:3000"
Write-Host "     - API Gateway: http://localhost:8080"
Write-Host "     - Grafana: http://localhost:3000 (admin/admin)"
Write-Host "     - Kibana: http://localhost:5601"
Write-Host "     - Kafka UI: http://localhost:8080"
Write-Host "     - MinIO: http://localhost:9001 (minioadmin/minioadmin)"
Write-Host ""
Write-Host "📚 For more information, see the README.md file" -ForegroundColor Cyan