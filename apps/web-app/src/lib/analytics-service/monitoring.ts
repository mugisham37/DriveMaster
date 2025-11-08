/**
 * Analytics Service Monitoring and Performance Tracking
 *
 * Implements client-side performance metrics tracking, request monitoring,
 * WebSocket connection health monitoring, and performance budget alerts.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

import React from "react";
import type {
  ConnectionStatus,
  AnalyticsServiceError,
} from "@/types/analytics-service";
import { BaseAnalyticsError } from "./errors";

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  // Request metrics
  requestLatency: number;
  requestCount: number;
  successRate: number;
  errorRate: number;
  retryCount: number;

  // WebSocket metrics
  connectionDuration: number;
  messageProcessingLatency: number;
  reconnectionCount: number;
  messageCount: number;

  // Cache metrics
  cacheHitRate: number;
  cacheMissRate: number;
  cacheSize: number;

  // Performance budgets
  budgetViolations: number;
  performanceScore: number;
}

export interface RequestMetric {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: AnalyticsServiceError;
  retryCount: number;
  cacheHit: boolean;
}

export interface WebSocketMetric {
  connectionId: string;
  connectionStartTime: number;
  connectionEndTime?: number;
  connectionDuration?: number;
  status: ConnectionStatus;
  messagesSent: number;
  messagesReceived: number;
  reconnectionCount: number;
  lastMessageTime?: number;
  averageMessageLatency: number;
}

export interface PerformanceBudget {
  name: string;
  metric: keyof PerformanceMetrics;
  threshold: number;
  current: number;
  violated: boolean;
  violationCount: number;
  lastViolation?: Date | undefined;
}

export interface MonitoringConfig {
  // Tracking settings
  enableRequestTracking: boolean;
  enableWebSocketTracking: boolean;
  enablePerformanceBudgets: boolean;
  enableAlerts: boolean;

  // Retention settings
  metricsRetentionTime: number;
  maxStoredRequests: number;
  maxStoredConnections: number;

  // Performance budgets
  budgets: {
    maxRequestLatency: number;
    minSuccessRate: number;
    maxErrorRate: number;
    maxReconnectionRate: number;
    maxCacheMissRate: number;
  };

  // Alert thresholds
  alertThresholds: {
    consecutiveFailures: number;
    highLatencyThreshold: number;
    lowSuccessRateThreshold: number;
  };
}

// ============================================================================
// Analytics Performance Monitor
// ============================================================================

export class AnalyticsPerformanceMonitor {
  private config: MonitoringConfig;
  private requestMetrics: Map<string, RequestMetric> = new Map();
  private webSocketMetrics: Map<string, WebSocketMetric> = new Map();
  private performanceBudgets: Map<string, PerformanceBudget> = new Map();
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enableRequestTracking: true,
      enableWebSocketTracking: true,
      enablePerformanceBudgets: true,
      enableAlerts: true,
      metricsRetentionTime: 3600000, // 1 hour
      maxStoredRequests: 1000,
      maxStoredConnections: 10,
      budgets: {
        maxRequestLatency: 5000, // 5 seconds
        minSuccessRate: 0.95, // 95%
        maxErrorRate: 0.05, // 5%
        maxReconnectionRate: 0.1, // 10%
        maxCacheMissRate: 0.3, // 30%
      },
      alertThresholds: {
        consecutiveFailures: 5,
        highLatencyThreshold: 10000, // 10 seconds
        lowSuccessRateThreshold: 0.8, // 80%
      },
      ...config,
    };

    this.initializePerformanceBudgets();
    this.startMetricsCollection();
  }

  // ============================================================================
  // Request Tracking
  // ============================================================================

  /**
   * Starts tracking a request
   */
  startRequest(operation: string): string {
    if (!this.config.enableRequestTracking) {
      return "";
    }

    const id = this.generateId();
    const metric: RequestMetric = {
      id,
      operation,
      startTime: performance.now(),
      success: false,
      retryCount: 0,
      cacheHit: false,
    };

    this.requestMetrics.set(id, metric);
    this.cleanupOldMetrics();

    return id;
  }

  /**
   * Ends tracking a request with success
   */
  endRequest(id: string, cacheHit = false) {
    if (!this.config.enableRequestTracking || !id) {
      return;
    }

    const metric = this.requestMetrics.get(id);
    if (!metric) {
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = true;
    metric.cacheHit = cacheHit;

    this.updatePerformanceBudgets();
    this.checkAlerts();
  }

  /**
   * Ends tracking a request with error
   */
  endRequestWithError(id: string, error: BaseAnalyticsError, retryCount = 0) {
    if (!this.config.enableRequestTracking || !id) {
      return;
    }

    const metric = this.requestMetrics.get(id);
    if (!metric) {
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = false;
    metric.error = error.toAnalyticsServiceError();
    metric.retryCount = retryCount;

    this.updatePerformanceBudgets();
    this.checkAlerts();
  }

  // ============================================================================
  // WebSocket Tracking
  // ============================================================================

  /**
   * Starts tracking a WebSocket connection
   */
  startWebSocketConnection(connectionId: string): void {
    if (!this.config.enableWebSocketTracking) {
      return;
    }

    const metric: WebSocketMetric = {
      connectionId,
      connectionStartTime: performance.now(),
      status: "connecting",
      messagesSent: 0,
      messagesReceived: 0,
      reconnectionCount: 0,
      averageMessageLatency: 0,
    };

    this.webSocketMetrics.set(connectionId, metric);
  }

  /**
   * Updates WebSocket connection status
   */
  updateWebSocketStatus(connectionId: string, status: ConnectionStatus) {
    if (!this.config.enableWebSocketTracking) {
      return;
    }

    const metric = this.webSocketMetrics.get(connectionId);
    if (!metric) {
      return;
    }

    metric.status = status;

    if (status === "connected" && metric.status !== "connected") {
      // Connection established
    } else if (
      status === "disconnected" &&
      metric.connectionEndTime === undefined
    ) {
      // Connection ended
      metric.connectionEndTime = performance.now();
      metric.connectionDuration =
        metric.connectionEndTime - metric.connectionStartTime;
    } else if (status === "reconnecting") {
      metric.reconnectionCount++;
    }

    this.updatePerformanceBudgets();
  }

  /**
   * Records WebSocket message
   */
  recordWebSocketMessage(
    connectionId: string,
    type: "sent" | "received",
    latency?: number,
  ) {
    if (!this.config.enableWebSocketTracking) {
      return;
    }

    const metric = this.webSocketMetrics.get(connectionId);
    if (!metric) {
      return;
    }

    if (type === "sent") {
      metric.messagesSent++;
    } else {
      metric.messagesReceived++;
      metric.lastMessageTime = performance.now();

      if (latency !== undefined) {
        // Update average message latency
        const totalMessages = metric.messagesReceived;
        metric.averageMessageLatency =
          (metric.averageMessageLatency * (totalMessages - 1) + latency) /
          totalMessages;
      }
    }
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = performance.now();
    const recentRequests = Array.from(this.requestMetrics.values()).filter(
      (r) => r.endTime && now - r.endTime < this.config.metricsRetentionTime,
    );

    const activeConnections = Array.from(this.webSocketMetrics.values()).filter(
      (c) => c.status === "connected",
    );

    // Calculate request metrics
    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const cacheHits = recentRequests.filter((r) => r.cacheHit).length;
    const totalRetries = recentRequests.reduce(
      (sum, r) => sum + r.retryCount,
      0,
    );

    const avgLatency =
      totalRequests > 0
        ? recentRequests.reduce((sum, r) => sum + (r.duration || 0), 0) /
          totalRequests
        : 0;

    const successRate =
      totalRequests > 0 ? successfulRequests / totalRequests : 1;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    const cacheMissRate = 1 - cacheHitRate;

    // Calculate WebSocket metrics
    const totalConnections = this.webSocketMetrics.size;
    const totalReconnections = Array.from(
      this.webSocketMetrics.values(),
    ).reduce((sum, c) => sum + c.reconnectionCount, 0);

    const avgConnectionDuration =
      activeConnections.length > 0
        ? activeConnections.reduce(
            (sum, c) => sum + (now - c.connectionStartTime),
            0,
          ) / activeConnections.length
        : 0;

    const avgMessageLatency =
      activeConnections.length > 0
        ? activeConnections.reduce(
            (sum, c) => sum + c.averageMessageLatency,
            0,
          ) / activeConnections.length
        : 0;

    const totalMessages = Array.from(this.webSocketMetrics.values()).reduce(
      (sum, c) => sum + c.messagesReceived,
      0,
    );

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      successRate,
      avgLatency,
      cacheHitRate,
      reconnectionRate:
        totalConnections > 0 ? totalReconnections / totalConnections : 0,
    });

    // Count budget violations
    const budgetViolations = Array.from(
      this.performanceBudgets.values(),
    ).filter((b) => b.violated).length;

    return {
      requestLatency: avgLatency,
      requestCount: totalRequests,
      successRate,
      errorRate,
      retryCount: totalRetries,
      connectionDuration: avgConnectionDuration,
      messageProcessingLatency: avgMessageLatency,
      reconnectionCount: totalReconnections,
      messageCount: totalMessages,
      cacheHitRate,
      cacheMissRate,
      cacheSize: this.requestMetrics.size,
      budgetViolations,
      performanceScore,
    };
  }

  /**
   * Gets performance budgets status
   */
  getPerformanceBudgets(): PerformanceBudget[] {
    return Array.from(this.performanceBudgets.values());
  }

  /**
   * Gets detailed request metrics
   */
  getRequestMetrics(): RequestMetric[] {
    return Array.from(this.requestMetrics.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, 100); // Return last 100 requests
  }

  /**
   * Gets WebSocket connection metrics
   */
  getWebSocketMetrics(): WebSocketMetric[] {
    return Array.from(this.webSocketMetrics.values());
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * Adds performance metrics listener
   */
  onMetricsUpdate(listener: (metrics: PerformanceMetrics) => void) {
    this.listeners.push(listener);
  }

  /**
   * Removes performance metrics listener
   */
  offMetricsUpdate(listener: (metrics: PerformanceMetrics) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Adds alert listener
   */
  onAlert(listener: (alert: PerformanceAlert) => void) {
    this.alertListeners.push(listener);
  }

  /**
   * Removes alert listener
   */
  offAlert(listener: (alert: PerformanceAlert) => void) {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Clears all metrics
   */
  clearMetrics() {
    this.requestMetrics.clear();
    this.webSocketMetrics.clear();
    this.resetPerformanceBudgets();
    console.log("[PerformanceMonitor] Metrics cleared");
  }

  /**
   * Destroys the performance monitor
   */
  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.requestMetrics.clear();
    this.webSocketMetrics.clear();
    this.performanceBudgets.clear();
    this.listeners = [];
    this.alertListeners = [];

    console.log("[PerformanceMonitor] Destroyed");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializePerformanceBudgets() {
    if (!this.config.enablePerformanceBudgets) {
      return;
    }

    const budgets: Array<[string, keyof PerformanceMetrics, number]> = [
      [
        "Request Latency",
        "requestLatency",
        this.config.budgets.maxRequestLatency,
      ],
      ["Success Rate", "successRate", this.config.budgets.minSuccessRate],
      ["Error Rate", "errorRate", this.config.budgets.maxErrorRate],
      [
        "Cache Miss Rate",
        "cacheMissRate",
        this.config.budgets.maxCacheMissRate,
      ],
    ];

    budgets.forEach(([name, metric, threshold]) => {
      this.performanceBudgets.set(name, {
        name,
        metric,
        threshold,
        current: 0,
        violated: false,
        violationCount: 0,
      });
    });
  }

  private updatePerformanceBudgets() {
    if (!this.config.enablePerformanceBudgets) {
      return;
    }

    const metrics = this.getPerformanceMetrics();

    this.performanceBudgets.forEach((budget) => {
      const currentValue = metrics[budget.metric];
      budget.current = currentValue;

      let violated = false;

      // Check violation based on metric type
      if (budget.name === "Success Rate") {
        violated = currentValue < budget.threshold;
      } else {
        violated = currentValue > budget.threshold;
      }

      if (violated && !budget.violated) {
        budget.violated = true;
        budget.violationCount++;
        budget.lastViolation = new Date();

        this.triggerAlert({
          type: "budget_violation",
          message: `Performance budget violated: ${budget.name}`,
          details: {
            budget: budget.name,
            threshold: budget.threshold,
            current: currentValue,
            violationCount: budget.violationCount,
          },
          severity: "warning",
          timestamp: new Date(),
        });
      } else if (!violated && budget.violated) {
        budget.violated = false;
      }
    });
  }

  private resetPerformanceBudgets() {
    this.performanceBudgets.forEach((budget) => {
      budget.current = 0;
      budget.violated = false;
      budget.violationCount = 0;
      budget.lastViolation = undefined;
    });
  }

  private calculatePerformanceScore(metrics: {
    successRate: number;
    avgLatency: number;
    cacheHitRate: number;
    reconnectionRate: number;
  }): number {
    // Weighted performance score calculation
    const weights = {
      successRate: 0.4,
      latency: 0.3,
      cacheHit: 0.2,
      reconnection: 0.1,
    };

    // Normalize metrics to 0-1 scale
    const normalizedSuccessRate = metrics.successRate;
    const normalizedLatency = Math.max(0, 1 - metrics.avgLatency / 10000); // 10s max
    const normalizedCacheHit = metrics.cacheHitRate;
    const normalizedReconnection = Math.max(0, 1 - metrics.reconnectionRate);

    const score =
      normalizedSuccessRate * weights.successRate +
      normalizedLatency * weights.latency +
      normalizedCacheHit * weights.cacheHit +
      normalizedReconnection * weights.reconnection;

    return Math.round(score * 100);
  }

  private checkAlerts() {
    if (!this.config.enableAlerts) {
      return;
    }

    const metrics = this.getPerformanceMetrics();
    const recentRequests = Array.from(this.requestMetrics.values()).slice(
      -this.config.alertThresholds.consecutiveFailures,
    );

    // Check for consecutive failures
    const consecutiveFailures = recentRequests.every((r) => !r.success);
    if (
      consecutiveFailures &&
      recentRequests.length >= this.config.alertThresholds.consecutiveFailures
    ) {
      this.triggerAlert({
        type: "consecutive_failures",
        message: `${this.config.alertThresholds.consecutiveFailures} consecutive request failures detected`,
        details: { consecutiveFailures: recentRequests.length },
        severity: "error",
        timestamp: new Date(),
      });
    }

    // Check for high latency
    if (
      metrics.requestLatency > this.config.alertThresholds.highLatencyThreshold
    ) {
      this.triggerAlert({
        type: "high_latency",
        message: `High request latency detected: ${Math.round(metrics.requestLatency)}ms`,
        details: {
          latency: metrics.requestLatency,
          threshold: this.config.alertThresholds.highLatencyThreshold,
        },
        severity: "warning",
        timestamp: new Date(),
      });
    }

    // Check for low success rate
    if (
      metrics.successRate < this.config.alertThresholds.lowSuccessRateThreshold
    ) {
      this.triggerAlert({
        type: "low_success_rate",
        message: `Low success rate detected: ${Math.round(metrics.successRate * 100)}%`,
        details: {
          successRate: metrics.successRate,
          threshold: this.config.alertThresholds.lowSuccessRateThreshold,
        },
        severity: "error",
        timestamp: new Date(),
      });
    }
  }

  private triggerAlert(alert: PerformanceAlert) {
    console.warn("[PerformanceMonitor] Alert triggered:", alert);

    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        console.error("[PerformanceMonitor] Error in alert listener:", error);
      }
    });
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getPerformanceMetrics();

      this.listeners.forEach((listener) => {
        try {
          listener(metrics);
        } catch (error) {
          console.error(
            "[PerformanceMonitor] Error in metrics listener:",
            error,
          );
        }
      });
    }, 30000); // Update every 30 seconds
  }

  private cleanupOldMetrics() {
    const now = performance.now();
    const cutoff = now - this.config.metricsRetentionTime;

    // Clean up old request metrics
    for (const [id, metric] of this.requestMetrics.entries()) {
      if (metric.endTime && metric.endTime < cutoff) {
        this.requestMetrics.delete(id);
      }
    }

    // Limit stored requests
    if (this.requestMetrics.size > this.config.maxStoredRequests) {
      const sorted = Array.from(this.requestMetrics.entries()).sort(
        ([, a], [, b]) => (b.startTime || 0) - (a.startTime || 0),
      );

      // Keep only the most recent requests
      this.requestMetrics.clear();
      sorted.slice(0, this.config.maxStoredRequests).forEach(([id, metric]) => {
        this.requestMetrics.set(id, metric);
      });
    }

    // Clean up old WebSocket metrics
    for (const [id, metric] of this.webSocketMetrics.entries()) {
      if (metric.connectionEndTime && metric.connectionEndTime < cutoff) {
        this.webSocketMetrics.delete(id);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Performance Alert Types
// ============================================================================

export interface PerformanceAlert {
  type:
    | "budget_violation"
    | "consecutive_failures"
    | "high_latency"
    | "low_success_rate"
    | "connection_issues";
  message: string;
  details: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  timestamp: Date;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsPerformanceMonitor = new AnalyticsPerformanceMonitor();

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for performance monitoring
 */
export function useAnalyticsPerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = React.useState<PerformanceAlert[]>([]);

  React.useEffect(() => {
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
    };

    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    };

    analyticsPerformanceMonitor.onMetricsUpdate(handleMetricsUpdate);
    analyticsPerformanceMonitor.onAlert(handleAlert);

    // Get initial metrics
    setMetrics(analyticsPerformanceMonitor.getPerformanceMetrics());

    return () => {
      analyticsPerformanceMonitor.offMetricsUpdate(handleMetricsUpdate);
      analyticsPerformanceMonitor.offAlert(handleAlert);
    };
  }, []);

  return {
    metrics,
    alerts,
    budgets: analyticsPerformanceMonitor.getPerformanceBudgets(),
    clearMetrics: analyticsPerformanceMonitor.clearMetrics.bind(
      analyticsPerformanceMonitor,
    ),
    clearAlerts: () => setAlerts([]),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default AnalyticsPerformanceMonitor;
