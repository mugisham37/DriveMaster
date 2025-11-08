/**
 * Performance Dashboard Component
 *
 * Real-time performance monitoring dashboard with metrics visualization
 * Requirements: 6.1, 7.1
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  performanceMonitor,
  type PerformanceMetrics,
} from "@/utils/performance-monitor";
import { errorMonitor, type ErrorMetrics } from "@/utils/error-monitor";

interface PerformanceDashboardProps {
  className?: string;
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  status?: "excellent" | "good" | "warning" | "critical";
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  status = "good",
  description,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "good":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      case "stable":
        return "→";
      default:
        return "";
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {trend && <span className="text-lg">{getTrendIcon(trend)}</span>}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm ml-1">{unit}</span>}
      </div>
      {description && <p className="text-xs mt-1 opacity-75">{description}</p>}
    </div>
  );
};

interface ChartProps {
  data: Array<{ timestamp: Date; value: number }>;
  title: string;
  color?: string;
  height?: number;
}

const SimpleChart: React.FC<ChartProps> = ({
  data,
  title,
  color = "#3B82F6",
  height = 100,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={data
              .map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 100 - ((point.value - minValue) / range) * 100;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((point.value - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={`${y}%`}
                r="2"
                fill={color}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.timestamp.toLocaleTimeString()}</span>
        <span>{data[data.length - 1]?.timestamp.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = "",
  refreshInterval = 30000, // 30 seconds
  showDetailedMetrics = false,
}) => {
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<{
    responseTime: Array<{ timestamp: Date; value: number }>;
    errorRate: Array<{ timestamp: Date; value: number }>;
    cacheHitRate: Array<{ timestamp: Date; value: number }>;
  }>({
    responseTime: [],
    errorRate: [],
    cacheHitRate: [],
  });

  // Subscribe to metrics updates
  useEffect(() => {
    const unsubscribePerformance = performanceMonitor.subscribe((metrics) => {
      setPerformanceMetrics(metrics);
      setIsLoading(false);

      // Update historical data
      const now = new Date();
      setHistoricalData((prev) => ({
        responseTime: [
          ...prev.responseTime.slice(-19),
          { timestamp: now, value: metrics.averageResponseTime },
        ],
        errorRate: [
          ...prev.errorRate.slice(-19),
          { timestamp: now, value: metrics.errorRate },
        ],
        cacheHitRate: [
          ...prev.cacheHitRate.slice(-19),
          { timestamp: now, value: metrics.cacheHitRate },
        ],
      }));
    });

    const unsubscribeError = errorMonitor.subscribe((metrics) => {
      setErrorMetrics(metrics);
    });

    // Initial load
    setPerformanceMetrics(performanceMonitor.getMetrics());
    setErrorMetrics(errorMonitor.getMetrics());
    setIsLoading(false);

    return () => {
      unsubscribePerformance();
      unsubscribeError();
    };
  }, []);

  // Refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(performanceMonitor.getMetrics());
      setErrorMetrics(errorMonitor.getMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const performanceSummary = useMemo(() => {
    if (!performanceMetrics) return null;
    return performanceMonitor.getPerformanceSummary();
  }, [performanceMetrics]);

  // const errorSummary = useMemo(() => {
  //   if (!errorMetrics) return null
  //   return errorMonitor.getErrorSummary()
  // }, [errorMetrics])

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!performanceMetrics || !errorMetrics) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No performance data available</p>
          <p className="text-sm">
            Metrics will appear once content service operations begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Performance Dashboard
          </h2>
          <p className="text-gray-600">Content Service Monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              performanceSummary?.overallHealth === "excellent"
                ? "bg-green-500"
                : performanceSummary?.overallHealth === "good"
                  ? "bg-blue-500"
                  : performanceSummary?.overallHealth === "fair"
                    ? "bg-yellow-500"
                    : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm font-medium capitalize">
            {performanceSummary?.overallHealth || "Unknown"}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate"
          value={performanceSummary?.successRate.toFixed(1) || "0"}
          unit="%"
          status={
            (performanceSummary?.successRate || 0) >= 99
              ? "excellent"
              : (performanceSummary?.successRate || 0) >= 95
                ? "good"
                : (performanceSummary?.successRate || 0) >= 90
                  ? "warning"
                  : "critical"
          }
          description={`${performanceMetrics.successfulRequests} of ${performanceMetrics.totalRequests} requests`}
        />

        <MetricCard
          title="Avg Response Time"
          value={Math.round(performanceMetrics.averageResponseTime)}
          unit="ms"
          status={
            performanceMetrics.averageResponseTime <= 500
              ? "excellent"
              : performanceMetrics.averageResponseTime <= 1000
                ? "good"
                : performanceMetrics.averageResponseTime <= 2000
                  ? "warning"
                  : "critical"
          }
          description={`P95: ${Math.round(performanceMetrics.p95ResponseTime)}ms`}
        />

        <MetricCard
          title="Cache Hit Rate"
          value={performanceMetrics.cacheHitRate.toFixed(1)}
          unit="%"
          status={
            performanceMetrics.cacheHitRate >= 80
              ? "excellent"
              : performanceMetrics.cacheHitRate >= 60
                ? "good"
                : performanceMetrics.cacheHitRate >= 40
                  ? "warning"
                  : "critical"
          }
          description={`${performanceMetrics.totalCacheRequests} cache requests`}
        />

        <MetricCard
          title="Error Rate"
          value={errorMetrics.errorRate.toFixed(2)}
          unit="%"
          status={
            errorMetrics.errorRate <= 1
              ? "excellent"
              : errorMetrics.errorRate <= 3
                ? "good"
                : errorMetrics.errorRate <= 5
                  ? "warning"
                  : "critical"
          }
          description={`${errorMetrics.totalErrors} total errors`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SimpleChart
          data={historicalData.responseTime}
          title="Response Time Trend"
          color="#3B82F6"
        />

        <SimpleChart
          data={historicalData.errorRate}
          title="Error Rate Trend"
          color="#EF4444"
        />

        <SimpleChart
          data={historicalData.cacheHitRate}
          title="Cache Hit Rate Trend"
          color="#10B981"
        />
      </div>

      {/* Detailed Metrics */}
      {showDetailedMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operation Metrics */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4">
              Operation Performance
            </h3>
            <div className="space-y-3">
              {Object.entries(performanceMetrics.operationMetrics)
                .sort(([, a], [, b]) => b.totalCalls - a.totalCalls)
                .slice(0, 10)
                .map(([operation, metrics]) => (
                  <div
                    key={operation}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{operation}</div>
                      <div className="text-xs text-gray-500">
                        {metrics.totalCalls} calls, {metrics.successfulCalls}{" "}
                        successful
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.round(metrics.averageResponseTime)}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {(
                          (metrics.successfulCalls / metrics.totalCalls) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Error Breakdown */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4">Error Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(errorMetrics.errorsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([errorType, count]) => (
                  <div
                    key={errorType}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="font-medium text-sm capitalize">
                      {errorType.replace("_", " ")}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{count}</div>
                      <div className="text-xs text-gray-500">
                        {((count / errorMetrics.totalErrors) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {(performanceSummary?.recommendations.length || 0) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Recommendations
          </h3>
          <ul className="space-y-1">
            {performanceSummary?.recommendations.map(
              (recommendation, index) => (
                <li key={index} className="text-blue-800 text-sm">
                  • {recommendation}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleString()} • Window:{" "}
        {Math.round(performanceMetrics.metricsWindow.duration / 60000)} minutes
        • Auto-refresh: {refreshInterval / 1000}s
      </div>
    </div>
  );
};

export default PerformanceDashboard;
