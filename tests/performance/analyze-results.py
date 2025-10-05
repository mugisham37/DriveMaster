#!/usr/bin/env python3

import json
import sys
import statistics
from datetime import datetime
from typing import Dict, List, Any

def load_results(filename: str) -> Dict[str, Any]:
    """Load k6 test results from JSON file."""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {filename} not found")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {filename}")
        sys.exit(1)

def analyze_metrics(results: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze performance metrics from k6 results."""
    metrics = results.get('metrics', {})
    
    analysis = {
        'summary': {},
        'performance': {},
        'errors': {},
        'recommendations': []
    }
    
    # HTTP request duration analysis
    if 'http_req_duration' in metrics:
        duration_data = metrics['http_req_duration']
        analysis['performance']['response_time'] = {
            'avg': duration_data.get('avg', 0),
            'min': duration_data.get('min', 0),
            'max': duration_data.get('max', 0),
            'p50': duration_data.get('med', 0),
            'p90': duration_data.get('p(90)', 0),
            'p95': duration_data.get('p(95)', 0),
            'p99': duration_data.get('p(99)', 0)
        }
    
    # HTTP request rate analysis
    if 'http_reqs' in metrics:
        reqs_data = metrics['http_reqs']
        analysis['performance']['throughput'] = {
            'total_requests': reqs_data.get('count', 0),
            'requests_per_second': reqs_data.get('rate', 0)
        }
    
    # Error rate analysis
    if 'http_req_failed' in metrics:
        failed_data = metrics['http_req_failed']
        analysis['errors']['http_failures'] = {
            'total_failures': failed_data.get('fails', 0),
            'failure_rate': failed_data.get('rate', 0)
        }
    
    # Custom metrics analysis
    custom_metrics = ['error_rate', 'response_time', 'request_count']
    for metric in custom_metrics:
        if metric in metrics:
            analysis['performance'][metric] = metrics[metric]
    
    # Virtual users analysis
    if 'vus' in metrics:
        vus_data = metrics['vus']
        analysis['performance']['virtual_users'] = {
            'max': vus_data.get('max', 0),
            'min': vus_data.get('min', 0),
            'avg': vus_data.get('avg', 0)
        }
    
    return analysis

def generate_recommendations(analysis: Dict[str, Any]) -> List[str]:
    """Generate performance recommendations based on analysis."""
    recommendations = []
    
    # Response time recommendations
    perf = analysis.get('performance', {})
    response_time = perf.get('response_time', {})
    
    if response_time.get('p95', 0) > 1000:
        recommendations.append(
            "⚠️ 95th percentile response time is above 1 second. Consider optimizing slow endpoints."
        )
    
    if response_time.get('avg', 0) > 500:
        recommendations.append(
            "⚠️ Average response time is above 500ms. Review database queries and caching strategies."
        )
    
    # Error rate recommendations
    errors = analysis.get('errors', {})
    http_failures = errors.get('http_failures', {})
    
    if http_failures.get('failure_rate', 0) > 0.05:
        recommendations.append(
            "🚨 Error rate is above 5%. Investigate failing endpoints and error handling."
        )
    
    if http_failures.get('failure_rate', 0) > 0.01:
        recommendations.append(
            "⚠️ Error rate is above 1%. Monitor error logs and consider implementing circuit breakers."
        )
    
    # Throughput recommendations
    throughput = perf.get('throughput', {})
    rps = throughput.get('requests_per_second', 0)
    
    if rps < 10:
        recommendations.append(
            "📈 Low throughput detected. Consider horizontal scaling or performance optimizations."
        )
    
    # Resource utilization recommendations
    if response_time.get('max', 0) > 10000:
        recommendations.append(
            "🐌 Some requests are taking over 10 seconds. Check for timeout configurations and long-running operations."
        )
    
    # Positive feedback
    if (response_time.get('p95', 0) < 500 and 
        http_failures.get('failure_rate', 0) < 0.01 and 
        rps > 50):
        recommendations.append(
            "✅ Excellent performance! All metrics are within optimal ranges."
        )
    
    return recommendations

def format_duration(ms: float) -> str:
    """Format duration in milliseconds to human-readable format."""
    if ms < 1000:
        return f"{ms:.1f}ms"
    else:
        return f"{ms/1000:.2f}s"

def format_rate(rate: float) -> str:
    """Format rate as percentage."""
    return f"{rate*100:.2f}%"

def generate_report(analysis: Dict[str, Any], recommendations: List[str]) -> str:
    """Generate a formatted performance report."""
    report = []
    
    report.append("# Performance Test Results")
    report.append("")
    report.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Performance Summary
    report.append("## 📊 Performance Summary")
    report.append("")
    
    perf = analysis.get('performance', {})
    response_time = perf.get('response_time', {})
    throughput = perf.get('throughput', {})
    
    if response_time:
        report.append("### Response Times")
        report.append("| Metric | Value |")
        report.append("|--------|-------|")
        report.append(f"| Average | {format_duration(response_time.get('avg', 0))} |")
        report.append(f"| Minimum | {format_duration(response_time.get('min', 0))} |")
        report.append(f"| Maximum | {format_duration(response_time.get('max', 0))} |")
        report.append(f"| 50th percentile | {format_duration(response_time.get('p50', 0))} |")
        report.append(f"| 90th percentile | {format_duration(response_time.get('p90', 0))} |")
        report.append(f"| 95th percentile | {format_duration(response_time.get('p95', 0))} |")
        report.append(f"| 99th percentile | {format_duration(response_time.get('p99', 0))} |")
        report.append("")
    
    if throughput:
        report.append("### Throughput")
        report.append("| Metric | Value |")
        report.append("|--------|-------|")
        report.append(f"| Total Requests | {throughput.get('total_requests', 0):,} |")
        report.append(f"| Requests/Second | {throughput.get('requests_per_second', 0):.1f} |")
        report.append("")
    
    # Error Analysis
    errors = analysis.get('errors', {})
    if errors:
        report.append("## 🚨 Error Analysis")
        report.append("")
        
        http_failures = errors.get('http_failures', {})
        if http_failures:
            report.append("### HTTP Failures")
            report.append("| Metric | Value |")
            report.append("|--------|-------|")
            report.append(f"| Total Failures | {http_failures.get('total_failures', 0):,} |")
            report.append(f"| Failure Rate | {format_rate(http_failures.get('failure_rate', 0))} |")
            report.append("")
    
    # Virtual Users
    virtual_users = perf.get('virtual_users', {})
    if virtual_users:
        report.append("### Virtual Users")
        report.append("| Metric | Value |")
        report.append("|--------|-------|")
        report.append(f"| Maximum | {virtual_users.get('max', 0)} |")
        report.append(f"| Minimum | {virtual_users.get('min', 0)} |")
        report.append(f"| Average | {virtual_users.get('avg', 0):.1f} |")
        report.append("")
    
    # Recommendations
    if recommendations:
        report.append("## 💡 Recommendations")
        report.append("")
        for rec in recommendations:
            report.append(f"- {rec}")
        report.append("")
    
    # Performance Thresholds
    report.append("## 🎯 Performance Thresholds")
    report.append("")
    report.append("| Metric | Target | Status |")
    report.append("|--------|--------|--------|")
    
    # Check thresholds
    p95_time = response_time.get('p95', 0)
    error_rate = errors.get('http_failures', {}).get('failure_rate', 0)
    
    p95_status = "✅ Pass" if p95_time < 1000 else "❌ Fail"
    error_status = "✅ Pass" if error_rate < 0.05 else "❌ Fail"
    
    report.append(f"| 95th percentile < 1s | {format_duration(p95_time)} | {p95_status} |")
    report.append(f"| Error rate < 5% | {format_rate(error_rate)} | {error_status} |")
    report.append("")
    
    # Test Configuration
    report.append("## ⚙️ Test Configuration")
    report.append("")
    report.append("- **Load Pattern:** Gradual ramp-up to 100 virtual users")
    report.append("- **Duration:** ~20 minutes total")
    report.append("- **Scenarios:** Authentication, Learning Session, Content Browsing, Progress Tracking")
    report.append("- **Think Time:** 1 second between requests")
    report.append("")
    
    return "\n".join(report)

def main():
    if len(sys.argv) != 2:
        print("Usage: python analyze-results.py <results.json>")
        sys.exit(1)
    
    filename = sys.argv[1]
    
    # Load and analyze results
    results = load_results(filename)
    analysis = analyze_metrics(results)
    recommendations = generate_recommendations(analysis)
    
    # Generate and print report
    report = generate_report(analysis, recommendations)
    print(report)
    
    # Also save to file
    report_filename = filename.replace('.json', '-report.md')
    with open(report_filename, 'w') as f:
        f.write(report)
    
    print(f"\nReport saved to: {report_filename}")

if __name__ == "__main__":
    main()