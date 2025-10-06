# Integration Test Runner Script for Windows PowerShell
# This script sets up the test environment and runs comprehensive integration tests

param(
    [string]$TestType = "all",
    [bool]$Cleanup = $true
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Check-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed or not in PATH"
        exit 1
    }
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed or not in PATH"
        exit 1
    }
    
    Write-Status "Prerequisites check passed ✅"
}

function Setup-Environment {
    Write-Status "Setting up test environment..."
    
    # Install dependencies
    Write-Status "Installing test dependencies..."
    npm install
    
    # Start test infrastructure
    Write-Status "Starting test infrastructure..."
    docker-compose -f docker-compose.test.yml down -v
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
    
    # Verify services are healthy
    Write-Status "Verifying service health..."
    
    $services = @(
        @{Host="localhost"; Port=5433; Name="postgres-test"},
        @{Host="localhost"; Port=6380; Name="redis-test"},
        @{Host="localhost"; Port=9093; Name="kafka-test"},
        @{Host="localhost"; Port=9001; Name="minio-test"},
        @{Host="localhost"; Port=9201; Name="opensearch-test"}
    )
    
    foreach ($service in $services) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.ConnectAsync($service.Host, $service.Port).Wait(5000)
            if ($connection.Connected) {
                Write-Status "$($service.Name) is ready ✅"
                $connection.Close()
            } else {
                Write-Warning "$($service.Name) is not responding, tests may fail"
            }
        } catch {
            Write-Warning "$($service.Name) is not responding, tests may fail"
        }
    }
}

function Run-Tests {
    Write-Status "Running integration test suites..."
    
    # Set test environment variables
    $env:NODE_ENV = "test"
    $env:TEST_DATABASE_URL = "postgresql://test_user:test_password@localhost:5433/adaptive_learning_test"
    $env:TEST_REDIS_URL = "redis://localhost:6380"
    $env:TEST_KAFKA_BROKERS = "localhost:9093"
    
    # Run different test categories
    $testCategories = @(
        "integration",
        "e2e",
        "performance",
        "chaos"
    )
    
    $failedCategories = @()
    
    foreach ($category in $testCategories) {
        Write-Status "Running $category tests..."
        
        $result = & npm run test -- --testPathPattern="$category" --verbose
        if ($LASTEXITCODE -eq 0) {
            Write-Status "$category tests passed ✅"
        } else {
            Write-Error "$category tests failed ❌"
            $failedCategories += $category
        }
    }
    
    # Report results
    if ($failedCategories.Count -eq 0) {
        Write-Status "All test categories passed! 🎉"
        return $true
    } else {
        Write-Error "Failed test categories: $($failedCategories -join ', ')"
        return $false
    }
}

function Generate-Report {
    Write-Status "Generating test report..."
    
    # Run tests with coverage
    npm run test:coverage
    
    # Generate HTML report
    if (Test-Path "coverage") {
        Write-Status "Coverage report generated in coverage/ directory"
        Write-Status "Open coverage/lcov-report/index.html to view detailed coverage"
    }
    
    # Generate performance report
    if (Test-Path "performance-results.json") {
        Write-Status "Performance results saved to performance-results.json"
    }
}

function Cleanup-Environment {
    Write-Status "Cleaning up test environment..."
    
    # Stop and remove test containers
    docker-compose -f docker-compose.test.yml down -v
    
    # Clean up test artifacts
    if (Test-Path "coverage/tmp") {
        Remove-Item -Recurse -Force "coverage/tmp"
    }
    if (Test-Path "test-results.xml") {
        Remove-Item -Force "test-results.xml"
    }
    
    Write-Status "Cleanup completed ✅"
}

function Main {
    Write-Status "Starting integration tests (type: $TestType)"
    
    try {
        Check-Prerequisites
        Setup-Environment
        
        switch ($TestType) {
            "unit" {
                & npm run test -- --testPathPattern="integration" --verbose
            }
            "e2e" {
                & npm run test -- --testPathPattern="e2e" --verbose
            }
            "performance" {
                & npm run test -- --testPathPattern="performance" --verbose
            }
            "chaos" {
                & npm run test -- --testPathPattern="chaos" --verbose
            }
            "all" {
                if (Run-Tests) {
                    Generate-Report
                    Write-Status "Integration tests completed successfully! 🎉"
                    $exitCode = 0
                } else {
                    Write-Error "Integration tests failed! ❌"
                    $exitCode = 1
                }
            }
            default {
                Write-Error "Unknown test type: $TestType"
                Write-Status "Available types: unit, e2e, performance, chaos, all"
                $exitCode = 1
            }
        }
    } finally {
        if ($Cleanup) {
            Cleanup-Environment
        }
    }
    
    exit $exitCode
}

# Show help if requested
if ($args -contains "--help" -or $args -contains "-h") {
    Write-Host "Usage: .\run-tests.ps1 [-TestType <type>] [-Cleanup <bool>]"
    Write-Host ""
    Write-Host "TestType: unit, e2e, performance, chaos, all (default: all)"
    Write-Host "Cleanup: true, false (default: true)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run-tests.ps1                           # Run all tests with cleanup"
    Write-Host "  .\run-tests.ps1 -TestType e2e            # Run only e2e tests"
    Write-Host "  .\run-tests.ps1 -TestType performance -Cleanup `$false # Run performance tests without cleanup"
    exit 0
}

# Execute main function
Main