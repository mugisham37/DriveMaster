#!/bin/bash

# Performance Testing Automation Script
# Runs comprehensive performance tests and generates reports

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results/$(date +%Y%m%d_%H%M%S)"
BASE_URL="${BASE_URL:-http://localhost:8080}"
DURATION="${DURATION:-300s}"
MAX_VUS="${MAX_VUS:-1000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        error "k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check if locust is installed
    if ! command -v locust &> /dev/null; then
        warning "Locust is not installed. Skipping Locust tests."
        SKIP_LOCUST=true
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is not installed. Please install curl."
        exit 1
    fi
    
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed. JSON processing will be limited."
    fi
    
    success "Dependencies check completed"
}

# Health check
health_check() {
    log "Performing health check on ${BASE_URL}..."
    
    if curl -f -s "${BASE_URL}/health" > /dev/null; then
        success "Health check passed"
    else
        error "Health check failed. Please ensure the application is running at ${BASE_URL}"
        exit 1
    fi
}

# Create results directory
setup_results_dir() {
    log "Setting up results directory: ${RESULTS_DIR}"
    mkdir -p "${RESULTS_DIR}"
    
    # Create subdirectories
    mkdir -p "${RESULTS_DIR}/k6"
    mkdir -p "${RESULTS_DIR}/locust"
    mkdir -p "${RESULTS_DIR}/reports"
    mkdir -p "${RESULTS_DIR}/logs"
}

# Run K6 load tests
run_k6_tests() {
    log "Running K6 load tests..."
    
    local test_scenarios=(
        "baseline_load:50:5m"
        "spike_test:variable:8m"
        "stress_test:variable:35m"
    )
    
    for scenario in "${test_scenarios[@]}"; do
        IFS=':' read -r name vus duration <<< "$scenario"
        
        log "Running K6 test: ${name} (VUs: ${vus}, Duration: ${duration})"
        
        # Set environment variables for the test
        export BASE_URL="${BASE_URL}"
        export TEST_SCENARIO="${name}"
        
        # Run K6 test with JSON output
        k6 run \
            --out json="${RESULTS_DIR}/k6/${name}_results.json" \
            --summary-export="${RESULTS_DIR}/k6/${name}_summary.json" \
            "${SCRIPT_DIR}/load-testing/k6-load-tests.js" \
            2>&1 | tee "${RESULTS_DIR}/logs/${name}_k6.log"
        
        if [ $? -eq 0 ]; then
            success "K6 test ${name} completed successfully"
        else
            error "K6 test ${name} failed"
        fi
        
        # Wait between tests
        log "Waiting 60 seconds before next test..."
        sleep 60
    done
}

# Run Locust tests
run_locust_tests() {
    if [ "${SKIP_LOCUST}" = true ]; then
        warning "Skipping Locust tests (not installed)"
        return
    fi
    
    log "Running Locust load tests..."
    
    # Start Locust in headless mode
    locust \
        -f "${SCRIPT_DIR}/load-testing/locust-load-tests.py" \
        --host="${BASE_URL}" \
        --users=1000 \
        --spawn-rate=10 \
        --run-time=300s \
        --headless \
        --csv="${RESULTS_DIR}/locust/results" \
        --html="${RESULTS_DIR}/locust/report.html" \
        --logfile="${RESULTS_DIR}/logs/locust.log" \
        --loglevel=INFO
    
    if [ $? -eq 0 ]; then
        success "Locust tests completed successfully"
    else
        error "Locust tests failed"
    fi
}

# Analyze results
analyze_results() {
    log "Analyzing test results..."
    
    # Create analysis script
    cat > "${RESULTS_DIR}/analyze_results.py" << 'EOF'
#!/usr/bin/env python3
import json
import csv
import sys
from pathlib import Path

def analyze_k6_results(results_dir):
    """Analyze K6 test results"""
    k6_dir = Path(results_dir) / "k6"
    analysis = {}
    
    for summary_file in k6_dir.glob("*_summary.json"):
        test_name = summary_file.stem.replace("_summary", "")
        
        try:
            with open(summary_file, 'r') as f:
                data = json.load(f)
                
            metrics = data.get('metrics', {})
            analysis[test_name] = {
                'http_req_duration_p95': metrics.get('http_req_duration', {}).get('values', {}).get('p(95)'),
                'http_req_duration_p99': metrics.get('http_req_duration', {}).get('values', {}).get('p(99)'),
                'http_req_failed_rate': metrics.get('http_req_failed', {}).get('values', {}).get('rate'),
                'http_reqs_rate': metrics.get('http_reqs', {}).get('values', {}).get('rate'),
                'vus_max': metrics.get('vus_max', {}).get('values', {}).get('max'),
            }
        except Exception as e:
            print(f"Error analyzing {summary_file}: {e}")
    
    return analysis

def generate_report(analysis, output_file):
    """Generate performance test report"""
    with open(output_file, 'w') as f:
        f.write("# Performance Test Results Report\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Test Results Summary\n\n")
        f.write("| Test Scenario | P95 Response Time | P99 Response Time | Error Rate | Throughput (RPS) | Max VUs |\n")
        f.write("|---------------|-------------------|-------------------|------------|------------------|----------|\n")
        
        for test_name, metrics in analysis.items():
            p95 = f"{metrics['http_req_duration_p95']:.2f}ms" if metrics['http_req_duration_p95'] else "N/A"
            p99 = f"{metrics['http_req_duration_p99']:.2f}ms" if metrics['http_req_duration_p99'] else "N/A"
            error_rate = f"{metrics['http_req_failed_rate']*100:.2f}%" if metrics['http_req_failed_rate'] else "N/A"
            throughput = f"{metrics['http_reqs_rate']:.2f}" if metrics['http_reqs_rate'] else "N/A"
            max_vus = f"{metrics['vus_max']}" if metrics['vus_max'] else "N/A"
            
            f.write(f"| {test_name} | {p95} | {p99} | {error_rate} | {throughput} | {max_vus} |\n")
        
        f.write("\n## Performance Analysis\n\n")
        
        # Check against thresholds
        for test_name, metrics in analysis.items():
            f.write(f"### {test_name}\n\n")
            
            # Response time analysis
            if metrics['http_req_duration_p95']:
                if metrics['http_req_duration_p95'] <= 300:
                    f.write("✅ **Response Time P95**: PASS (≤ 300ms)\n")
                else:
                    f.write("❌ **Response Time P95**: FAIL (> 300ms)\n")
            
            # Error rate analysis
            if metrics['http_req_failed_rate']:
                if metrics['http_req_failed_rate'] <= 0.01:
                    f.write("✅ **Error Rate**: PASS (≤ 1%)\n")
                else:
                    f.write("❌ **Error Rate**: FAIL (> 1%)\n")
            
            f.write("\n")

if __name__ == "__main__":
    import datetime
    
    results_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    analysis = analyze_k6_results(results_dir)
    
    # Generate report
    report_file = Path(results_dir) / "reports" / "performance_report.md"
    generate_report(analysis, report_file)
    
    print(f"Analysis complete. Report generated: {report_file}")
EOF
    
    # Run analysis
    python3 "${RESULTS_DIR}/analyze_results.py" "${RESULTS_DIR}"
    
    success "Results analysis completed"
}

# Generate HTML report
generate_html_report() {
    log "Generating HTML report..."
    
    cat > "${RESULTS_DIR}/reports/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Results</h1>
        <p>Generated on: $(date)</p>
        <p>Base URL: ${BASE_URL}</p>
        <p>Test Duration: ${DURATION}</p>
    </div>
    
    <h2>Quick Summary</h2>
    <div id="summary">
        <!-- Summary will be populated by JavaScript -->
    </div>
    
    <h2>Detailed Results</h2>
    <div id="results">
        <p>Loading results...</p>
    </div>
    
    <h2>Test Files</h2>
    <ul>
        <li><a href="../k6/">K6 Results</a></li>
        <li><a href="../locust/">Locust Results</a></li>
        <li><a href="../logs/">Test Logs</a></li>
    </ul>
    
    <script>
        // Load and display results
        fetch('../k6/baseline_load_summary.json')
            .then(response => response.json())
            .then(data => {
                // Process and display data
                console.log('Test results loaded:', data);
            })
            .catch(error => {
                console.error('Error loading results:', error);
                document.getElementById('results').innerHTML = '<p>Error loading results. Please check the console.</p>';
            });
    </script>
</body>
</html>
EOF
    
    success "HTML report generated: ${RESULTS_DIR}/reports/index.html"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Kill any remaining processes
    pkill -f "k6" 2>/dev/null || true
    pkill -f "locust" 2>/dev/null || true
}

# Main execution
main() {
    log "Starting performance testing suite..."
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Run all checks and tests
    check_dependencies
    health_check
    setup_results_dir
    
    # Run tests
    run_k6_tests
    run_locust_tests
    
    # Analyze and report
    analyze_results
    generate_html_report
    
    success "Performance testing completed successfully!"
    log "Results available in: ${RESULTS_DIR}"
    log "Open ${RESULTS_DIR}/reports/index.html to view the report"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --max-vus)
            MAX_VUS="$2"
            shift 2
            ;;
        --skip-locust)
            SKIP_LOCUST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --base-url URL     Base URL for testing (default: http://localhost:8080)"
            echo "  --duration TIME    Test duration (default: 300s)"
            echo "  --max-vus NUM      Maximum virtual users (default: 1000)"
            echo "  --skip-locust      Skip Locust tests"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main