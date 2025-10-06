#!/bin/bash

# Integration Test Runner Script
# This script sets up the test environment and runs comprehensive integration tests

set -e

echo "🚀 Starting Adaptive Learning Platform Integration Tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    print_status "Prerequisites check passed ✅"
}

# Setup test environment
setup_environment() {
    print_status "Setting up test environment..."
    
    # Install dependencies
    print_status "Installing test dependencies..."
    npm install
    
    # Start test infrastructure
    print_status "Starting test infrastructure..."
    docker-compose -f docker-compose.test.yml down -v
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Verify services are healthy
    print_status "Verifying service health..."
    
    services=("postgres-test:5432" "redis-test:6379" "kafka-test:9093" "minio-test:9000" "opensearch-test:9200")
    
    for service in "${services[@]}"; do
        IFS=':' read -r host port <<< "$service"
        if timeout 10 bash -c "</dev/tcp/localhost/$port"; then
            print_status "$host is ready ✅"
        else
            print_warning "$host is not responding, tests may fail"
        fi
    done
}

# Run test suites
run_tests() {
    print_status "Running integration test suites..."
    
    # Set test environment variables
    export NODE_ENV=test
    export TEST_DATABASE_URL="postgresql://test_user:test_password@localhost:5433/adaptive_learning_test"
    export TEST_REDIS_URL="redis://localhost:6380"
    export TEST_KAFKA_BROKERS="localhost:9093"
    
    # Run different test categories
    test_categories=(
        "integration:unit"
        "integration:e2e" 
        "integration:performance"
        "integration:chaos"
    )
    
    failed_categories=()
    
    for category in "${test_categories[@]}"; do
        print_status "Running $category tests..."
        
        if npm run test -- --testPathPattern="$category" --verbose; then
            print_status "$category tests passed ✅"
        else
            print_error "$category tests failed ❌"
            failed_categories+=("$category")
        fi
    done
    
    # Report results
    if [ ${#failed_categories[@]} -eq 0 ]; then
        print_status "All test categories passed! 🎉"
        return 0
    else
        print_error "Failed test categories: ${failed_categories[*]}"
        return 1
    fi
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    # Run tests with coverage
    npm run test:coverage
    
    # Generate HTML report
    if [ -d "coverage" ]; then
        print_status "Coverage report generated in coverage/ directory"
        print_status "Open coverage/lcov-report/index.html to view detailed coverage"
    fi
    
    # Generate performance report
    if [ -f "performance-results.json" ]; then
        print_status "Performance results saved to performance-results.json"
    fi
}

# Cleanup test environment
cleanup_environment() {
    print_status "Cleaning up test environment..."
    
    # Stop and remove test containers
    docker-compose -f docker-compose.test.yml down -v
    
    # Clean up test artifacts
    rm -rf coverage/tmp
    rm -f test-results.xml
    
    print_status "Cleanup completed ✅"
}

# Main execution
main() {
    local test_type="${1:-all}"
    local cleanup="${2:-true}"
    
    print_status "Starting integration tests (type: $test_type)"
    
    # Trap to ensure cleanup on exit
    if [ "$cleanup" = "true" ]; then
        trap cleanup_environment EXIT
    fi
    
    check_prerequisites
    setup_environment
    
    case "$test_type" in
        "unit")
            npm run test -- --testPathPattern="integration" --verbose
            ;;
        "e2e")
            npm run test -- --testPathPattern="e2e" --verbose
            ;;
        "performance")
            npm run test -- --testPathPattern="performance" --verbose
            ;;
        "chaos")
            npm run test -- --testPathPattern="chaos" --verbose
            ;;
        "all")
            if run_tests; then
                generate_report
                print_status "Integration tests completed successfully! 🎉"
                exit 0
            else
                print_error "Integration tests failed! ❌"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown test type: $test_type"
            print_status "Available types: unit, e2e, performance, chaos, all"
            exit 1
            ;;
    esac
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [test_type] [cleanup]"
    echo ""
    echo "test_type: unit, e2e, performance, chaos, all (default: all)"
    echo "cleanup: true, false (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests with cleanup"
    echo "  $0 e2e               # Run only e2e tests"
    echo "  $0 performance false # Run performance tests without cleanup"
    exit 0
fi

# Execute main function
main "$@"