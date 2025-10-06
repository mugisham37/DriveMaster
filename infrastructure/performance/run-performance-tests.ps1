# Performance Testing Automation Script (PowerShell)
# Runs comprehensive performance tests and generates reports

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Duration = "300s",
    [int]$MaxVUs = 1000,
    [switch]$SkipLocust,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host "Usage: .\run-performance-tests.ps1 [OPTIONS]"
    Write-Host "Options:"
    Write-Host "  -BaseUrl URL       Base URL for testing (default: http://localhost:8080)"
    Write-Host "  -Duration TIME     Test duration (default: 300s)"
    Write-Host "  -MaxVUs NUM        Maximum virtual users (default: 1000)"
    Write-Host "  -SkipLocust        Skip Locust tests"
    Write-Host "  -Help              Show this help message"
    exit 0
}

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultsDir = Join-Path $ScriptDir "results\$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Logging functions
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Blue
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Check dependencies
function Test-Dependencies {
    Write-Log "Checking dependencies..."
    
    # Check if k6 is installed
    try {
        $null = Get-Command k6 -ErrorAction Stop
        Write-Success "k6 found"
    }
    catch {
        Write-Error-Log "k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
        exit 1
    }
    
    # Check if locust is installed
    if (-not $SkipLocust) {
        try {
            $null = Get-Command locust -ErrorAction Stop
            Write-Success "Locust found"
        }
        catch {
            Write-Warning-Log "Locust is not installed. Skipping Locust tests."
            $script:SkipLocust = $true
        }
    }
    
    # Check if curl is available
    try {
        $null = Get-Command curl -ErrorAction Stop
        Write-Success "curl found"
    }
    catch {
        Write-Error-Log "curl is not installed. Please install curl."
        exit 1
    }
    
    Write-Success "Dependencies check completed"
}

# Health check
function Test-Health {
    Write-Log "Performing health check on $BaseUrl..."
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method Get -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Health check passed"
        }
        else {
            throw "Health check returned status code: $($response.StatusCode)"
        }
    }
    catch {
        Write-Error-Log "Health check failed. Please ensure the application is running at $BaseUrl"
        Write-Error-Log "Error: $($_.Exception.Message)"
        exit 1
    }
}

# Create results directory
function New-ResultsDirectory {
    Write-Log "Setting up results directory: $ResultsDir"
    
    New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
    New-Item -ItemType Directory -Path "$ResultsDir\k6" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ResultsDir\locust" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ResultsDir\reports" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ResultsDir\logs" -Force | Out-Null
    
    Write-Success "Results directory created"
}

# Run K6 load tests
function Invoke-K6Tests {
    Write-Log "Running K6 load tests..."
    
    $testScenarios = @(
        @{Name = "baseline_load"; VUs = "50"; Duration = "5m" },
        @{Name = "spike_test"; VUs = "variable"; Duration = "8m" },
        @{Name = "stress_test"; VUs = "variable"; Duration = "35m" }
    )
    
    foreach ($scenario in $testScenarios) {
        Write-Log "Running K6 test: $($scenario.Name) (VUs: $($scenario.VUs), Duration: $($scenario.Duration))"
        
        # Set environment variables for the test
        $env:BASE_URL = $BaseUrl
        $env:TEST_SCENARIO = $scenario.Name
        
        # Run K6 test with JSON output
        $k6Args = @(
            "run",
            "--out", "json=$ResultsDir\k6\$($scenario.Name)_results.json",
            "--summary-export=$ResultsDir\k6\$($scenario.Name)_summary.json",
            "$ScriptDir\load-testing\k6-load-tests.js"
        )
        
        try {
            $output = & k6 @k6Args 2>&1
            $output | Out-File -FilePath "$ResultsDir\logs\$($scenario.Name)_k6.log" -Encoding UTF8
            
            Write-Success "K6 test $($scenario.Name) completed successfully"
        }
        catch {
            Write-Error-Log "K6 test $($scenario.Name) failed: $($_.Exception.Message)"
        }
        
        # Wait between tests
        Write-Log "Waiting 60 seconds before next test..."
        Start-Sleep -Seconds 60
    }
}

# Run Locust tests
function Invoke-LocustTests {
    if ($SkipLocust) {
        Write-Warning-Log "Skipping Locust tests"
        return
    }
    
    Write-Log "Running Locust load tests..."
    
    $locustArgs = @(
        "-f", "$ScriptDir\load-testing\locust-load-tests.py",
        "--host=$BaseUrl",
        "--users=1000",
        "--spawn-rate=10",
        "--run-time=300s",
        "--headless",
        "--csv=$ResultsDir\locust\results",
        "--html=$ResultsDir\locust\report.html",
        "--logfile=$ResultsDir\logs\locust.log",
        "--loglevel=INFO"
    )
    
    try {
        & locust @locustArgs
        Write-Success "Locust tests completed successfully"
    }
    catch {
        Write-Error-Log "Locust tests failed: $($_.Exception.Message)"
    }
}

# Analyze results
function Invoke-ResultsAnalysis {
    Write-Log "Analyzing test results..."
    
    # Create analysis script
    $analysisScript = @"
import json
import sys
from pathlib import Path
import datetime

def analyze_k6_results(results_dir):
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
    with open(output_file, 'w') as f:
        f.write("# Performance Test Results Report\n\n")
        f.write(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
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

if __name__ == "__main__":
    results_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    analysis = analyze_k6_results(results_dir)
    
    report_file = Path(results_dir) / "reports" / "performance_report.md"
    generate_report(analysis, report_file)
    
    print(f"Analysis complete. Report generated: {report_file}")
"@
    
    $analysisScript | Out-File -FilePath "$ResultsDir\analyze_results.py" -Encoding UTF8
    
    # Run analysis
    try {
        python "$ResultsDir\analyze_results.py" $ResultsDir
        Write-Success "Results analysis completed"
    }
    catch {
        Write-Warning-Log "Could not run Python analysis: $($_.Exception.Message)"
    }
}

# Generate HTML report
function New-HtmlReport {
    Write-Log "Generating HTML report..."
    
    $htmlContent = @"
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
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Results</h1>
        <p>Generated on: $(Get-Date)</p>
        <p>Base URL: $BaseUrl</p>
        <p>Test Duration: $Duration</p>
    </div>
    
    <h2>Test Files</h2>
    <ul>
        <li><a href="../k6/">K6 Results</a></li>
        <li><a href="../locust/">Locust Results</a></li>
        <li><a href="../logs/">Test Logs</a></li>
    </ul>
</body>
</html>
"@
    
    $htmlContent | Out-File -FilePath "$ResultsDir\reports\index.html" -Encoding UTF8
    Write-Success "HTML report generated: $ResultsDir\reports\index.html"
}

# Main execution
function Main {
    Write-Log "Starting performance testing suite..."
    
    try {
        # Run all checks and tests
        Test-Dependencies
        Test-Health
        New-ResultsDirectory
        
        # Run tests
        Invoke-K6Tests
        Invoke-LocustTests
        
        # Analyze and report
        Invoke-ResultsAnalysis
        New-HtmlReport
        
        Write-Success "Performance testing completed successfully!"
        Write-Log "Results available in: $ResultsDir"
        Write-Log "Open $ResultsDir\reports\index.html to view the report"
    }
    catch {
        Write-Error-Log "Performance testing failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run main function
Main