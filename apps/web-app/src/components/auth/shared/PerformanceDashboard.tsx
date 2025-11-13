"use client";

/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics for authentication operations:
 * - Request deduplication stats
 * - Cache hit rates
 * - Average operation durations
 * - Optimistic update performance
 * 
 * Requirements: 13.2, 13.3, 13.4
 */

import { useState, useEffect } from "react";
import { Activity, Database, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPerformanceStatus,
  runPerformanceTestSuite,
  resetPerformanceTracking,
} from "@/lib/auth/performance-testing";

export function PerformanceDashboard() {
  const [status, setStatus] = useState(getPerformanceStatus());
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any> | null>(null);

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getPerformanceStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runPerformanceTestSuite();
      setTestResults(results);
      setStatus(getPerformanceStatus());
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleReset = () => {
    resetPerformanceTracking();
    setStatus(getPerformanceStatus());
    setTestResults(null);
  };

  const handleRefresh = () => {
    setStatus(getPerformanceStatus());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time authentication performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh metrics"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunTests}
            disabled={isRunningTests}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isRunningTests ? "Running Tests..." : "Run Tests"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Cache Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.cache.size}</div>
            <p className="text-xs text-muted-foreground">
              Active cache entries
            </p>
          </CardContent>
        </Card>

        {/* Deduplication Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.deduplicator.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Deduplicated requests
            </p>
          </CardContent>
        </Card>

        {/* Operations Tracked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.length}</div>
            <p className="text-xs text-muted-foreground">
              Tracked operations
            </p>
          </CardContent>
        </Card>

        {/* Performance Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.metrics.length > 0 ? "Good" : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operation Metrics */}
      {status.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Metrics</CardTitle>
            <CardDescription>
              Performance breakdown by operation type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{metric.operation}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {metric.count} calls
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {metric.averageDuration.toFixed(2)}ms avg
                      </Badge>
                      {metric.cacheHitRate > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {metric.cacheHitRate.toFixed(1)}% cached
                        </Badge>
                      )}
                      {metric.deduplicationRate > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {metric.deduplicationRate.toFixed(1)}% deduped
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {metric.successRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Success rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Details */}
      {status.cache.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cache Details</CardTitle>
            <CardDescription>
              Current cache entries and expiration times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.cache.entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-xs">{entry.key}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={entry.isExpired ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {entry.isExpired ? "Expired" : "Active"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Performance test suite results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {status.metrics.length === 0 && !testResults && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">No Metrics Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Perform some authentication operations or run the test suite to see
                performance metrics.
              </p>
            </div>
            <Button onClick={handleRunTests} disabled={isRunningTests}>
              <Activity className="h-4 w-4 mr-2" />
              Run Performance Tests
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
