/**
 * Notification Service Performance Monitor
 * Implements Task 12.1: Performance Monitoring Implementation
 *
 * Provides comprehensive performance tracking for notification operations:
 * - API request and UI operation performance tracking
 * - Core Web Vitals monitoring for notification-related interactions
 * - Error rate and success rate tracking
 * - Performance budgets and alerting for regression detection
 *
 * Requirements: 7.1, 7.2
 */

import { WebVitalsMetric } from "../performance/web-vitals";

export interface NotificationPerformanceMetrics {
  apiRequests: {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    successRate: number;
    timeouts: number;
  };
  uiOperations: {
    notificationRenderTime: number;
    listScrollPerformance: number;
    modalOpenTime: number;
    toastDisplayTime: number;
    interactionLatency: number;
  };
  webVitals: {
    lcp?: number; // Largest Contentful Paint
    inp?: number; // Interaction to Next Paint
    cls?: number; // Cumulative Layout Shift
    fcp?: number; // First Contentful Paint
    ttfb?: number; // Time to First Byte
  };
  caching: {
    hitRate: number;
    missRate: number;
    cacheSize: number;
    evictionRate: number;
  };
  realtime: {
    connectionLatency: number;
    messageDeliveryTime: number;
    reconnectionCount: number;
    connectionUptime: number;
  };
}

export interface PerformanceBudget {
  apiResponseTime: {
    warning: number;
    critical: number;
  };
  uiRenderTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  cacheHitRate: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: "warning" | "critical";
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
}

export class NotificationPerformanceMonitor {
  private metrics: NotificationPerformanceMetrics;
  private budget: PerformanceBudget;
  private alerts: PerformanceAlert[] = [];
  private requestTimes: number[] = [];
  private uiOperationTimes: Map<string, number[]> = new Map();
  private webVitalsData: { [key: string]: number } = {};
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private isEnabled: boolean = true;

  constructor(budget?: Partial<PerformanceBudget>) {
    this.budget = {
      apiResponseTime: {
        warning: 1000, // 1 second
        critical: 3000, // 3 seconds
      },
      uiRenderTime: {
        warning: 100, // 100ms
        critical: 300, // 300ms
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.15, // 15%
      },
      cacheHitRate: {
        warning: 0.8, // 80%
        critical: 0.6, // 60%
      },
      ...budget,
    };

    this.metrics = this.initializeMetrics();
    this.setupWebVitalsTracking();
  }

  private initializeMetrics(): NotificationPerformanceMetrics {
    return {
      apiRequests: {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        successRate: 1,
        timeouts: 0,
      },
      uiOperations: {
        notificationRenderTime: 0,
        listScrollPerformance: 0,
        modalOpenTime: 0,
        toastDisplayTime: 0,
        interactionLatency: 0,
      },
      webVitals: {},
      caching: {
        hitRate: 0,
        missRate: 0,
        cacheSize: 0,
        evictionRate: 0,
      },
      realtime: {
        connectionLatency: 0,
        messageDeliveryTime: 0,
        reconnectionCount: 0,
        connectionUptime: 0,
      },
    };
  }

  /**
   * Setup Web Vitals tracking for notification-related interactions
   */
  private setupWebVitalsTracking(): void {
    if (typeof window === "undefined") return;

    // Track Core Web Vitals specifically for notification interactions
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          entry.entryType === "measure" &&
          entry.name.includes("notification")
        ) {
          this.recordUIOperation(entry.name, entry.duration);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ["measure"] });
    } catch (error) {
      console.warn(
        "[NotificationPerformanceMonitor] Performance Observer not supported:",
        error,
      );
    }
  }

  /**
   * Record API request performance
   */
  recordApiRequest(
    operation: string,
    responseTime: number,
    success: boolean,
    error?: Error,
  ): void {
    if (!this.isEnabled) return;

    this.metrics.apiRequests.totalRequests++;
    this.requestTimes.push(responseTime);

    // Update average response time
    const total = this.metrics.apiRequests.totalRequests;
    this.metrics.apiRequests.averageResponseTime =
      (this.metrics.apiRequests.averageResponseTime * (total - 1) +
        responseTime) /
      total;

    // Update percentiles
    this.updatePercentiles();

    // Update success/error rates
    if (success) {
      this.metrics.apiRequests.successRate =
        (this.metrics.apiRequests.successRate * (total - 1) + 1) / total;
    } else {
      this.metrics.apiRequests.errorRate =
        (this.metrics.apiRequests.errorRate * (total - 1) + 1) / total;

      if (error?.name === "TimeoutError") {
        this.metrics.apiRequests.timeouts++;
      }
    }

    // Check performance budgets
    this.checkApiPerformanceBudget(operation, responseTime, success);

    // Log performance data
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[NotificationPerformance] ${operation}: ${responseTime}ms (${success ? "success" : "error"})`,
      );
    }
  }

  /**
   * Record UI operation performance
   */
  recordUIOperation(operation: string, duration: number): void {
    if (!this.isEnabled) return;

    if (!this.uiOperationTimes.has(operation)) {
      this.uiOperationTimes.set(operation, []);
    }

    const times = this.uiOperationTimes.get(operation)!;
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Update metrics based on operation type
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;

    switch (operation) {
      case "notification-render":
        this.metrics.uiOperations.notificationRenderTime = average;
        break;
      case "notification-list-scroll":
        this.metrics.uiOperations.listScrollPerformance = average;
        break;
      case "notification-modal-open":
        this.metrics.uiOperations.modalOpenTime = average;
        break;
      case "notification-toast-display":
        this.metrics.uiOperations.toastDisplayTime = average;
        break;
      case "notification-interaction":
        this.metrics.uiOperations.interactionLatency = average;
        break;
    }

    // Check UI performance budget
    this.checkUIPerformanceBudget(operation, duration);
  }

  /**
   * Record Web Vitals metric
   */
  recordWebVital(metric: WebVitalsMetric): void {
    if (!this.isEnabled) return;

    this.webVitalsData[metric.name] = metric.value;
    this.metrics.webVitals[
      metric.name.toLowerCase() as keyof typeof this.metrics.webVitals
    ] = metric.value;

    // Check if metric exceeds thresholds
    this.checkWebVitalsBudget(metric);
  }

  /**
   * Update cache performance metrics
   */
  updateCacheMetrics(
    hits: number,
    misses: number,
    size: number,
    evictions: number = 0,
  ): void {
    if (!this.isEnabled) return;

    const total = hits + misses;
    if (total > 0) {
      this.metrics.caching.hitRate = hits / total;
      this.metrics.caching.missRate = misses / total;
    }

    this.metrics.caching.cacheSize = size;
    this.metrics.caching.evictionRate = evictions;

    // Check cache performance budget
    if (this.metrics.caching.hitRate < this.budget.cacheHitRate.critical) {
      this.createAlert(
        "critical",
        "cache_hit_rate",
        this.metrics.caching.hitRate,
        this.budget.cacheHitRate.critical,
      );
    } else if (
      this.metrics.caching.hitRate < this.budget.cacheHitRate.warning
    ) {
      this.createAlert(
        "warning",
        "cache_hit_rate",
        this.metrics.caching.hitRate,
        this.budget.cacheHitRate.warning,
      );
    }
  }

  /**
   * Update real-time connection metrics
   */
  updateRealtimeMetrics(
    connectionLatency: number,
    messageDeliveryTime: number,
    reconnectionCount: number,
    connectionUptime: number,
  ): void {
    if (!this.isEnabled) return;

    this.metrics.realtime.connectionLatency = connectionLatency;
    this.metrics.realtime.messageDeliveryTime = messageDeliveryTime;
    this.metrics.realtime.reconnectionCount = reconnectionCount;
    this.metrics.realtime.connectionUptime = connectionUptime;
  }

  /**
   * Update response time percentiles
   */
  private updatePercentiles(): void {
    if (this.requestTimes.length === 0) return;

    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.metrics.apiRequests.p95ResponseTime = sorted[p95Index] || 0;
    this.metrics.apiRequests.p99ResponseTime = sorted[p99Index] || 0;

    // Keep only last 1000 measurements
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }
  }

  /**
   * Check API performance against budget
   */
  private checkApiPerformanceBudget(
    operation: string,
    responseTime: number,
    success: boolean,
  ): void {
    // Check response time budget
    console.log("Checking API performance budget:", operation, "success:", success);
    if (responseTime > this.budget.apiResponseTime.critical) {
      this.createAlert(
        "critical",
        "api_response_time",
        responseTime,
        this.budget.apiResponseTime.critical,
        operation,
      );
    } else if (responseTime > this.budget.apiResponseTime.warning) {
      this.createAlert(
        "warning",
        "api_response_time",
        responseTime,
        this.budget.apiResponseTime.warning,
        operation,
      );
    }

    // Check error rate budget
    if (this.metrics.apiRequests.errorRate > this.budget.errorRate.critical) {
      this.createAlert(
        "critical",
        "error_rate",
        this.metrics.apiRequests.errorRate,
        this.budget.errorRate.critical,
      );
    } else if (
      this.metrics.apiRequests.errorRate > this.budget.errorRate.warning
    ) {
      this.createAlert(
        "warning",
        "error_rate",
        this.metrics.apiRequests.errorRate,
        this.budget.errorRate.warning,
      );
    }
  }

  /**
   * Check UI performance against budget
   */
  private checkUIPerformanceBudget(operation: string, duration: number): void {
    if (duration > this.budget.uiRenderTime.critical) {
      this.createAlert(
        "critical",
        "ui_render_time",
        duration,
        this.budget.uiRenderTime.critical,
        operation,
      );
    } else if (duration > this.budget.uiRenderTime.warning) {
      this.createAlert(
        "warning",
        "ui_render_time",
        duration,
        this.budget.uiRenderTime.warning,
        operation,
      );
    }
  }

  /**
   * Check Web Vitals against standard thresholds
   */
  private checkWebVitalsBudget(metric: WebVitalsMetric): void {
    const thresholds = {
      LCP: { warning: 2500, critical: 4000 },
      INP: { warning: 200, critical: 500 },
      CLS: { warning: 0.1, critical: 0.25 },
      FCP: { warning: 1800, critical: 3000 },
      TTFB: { warning: 800, critical: 1800 },
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return;

    if (metric.value > threshold.critical) {
      this.createAlert(
        "critical",
        `web_vitals_${metric.name.toLowerCase()}`,
        metric.value,
        threshold.critical,
      );
    } else if (metric.value > threshold.warning) {
      this.createAlert(
        "warning",
        `web_vitals_${metric.name.toLowerCase()}`,
        metric.value,
        threshold.warning,
      );
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: "warning" | "critical",
    metric: string,
    value: number,
    threshold: number,
    operation?: string,
  ): void {
    const alert: PerformanceAlert = {
      id: `${metric}_${Date.now()}`,
      type,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      message: this.generateAlertMessage(
        type,
        metric,
        value,
        threshold,
        operation,
      ),
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Notify alert callbacks
    this.alertCallbacks.forEach((callback) => callback(alert));

    // Log alert
    const logLevel = type === "critical" ? "error" : "warn";
    console[logLevel](`[NotificationPerformance] ${alert.message}`);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    type: string,
    metric: string,
    value: number,
    threshold: number,
    operation?: string,
  ): string {
    const operationText = operation ? ` for ${operation}` : "";
    const unit =
      metric.includes("time") || metric.includes("latency")
        ? "ms"
        : metric.includes("rate")
          ? "%"
          : "";

    return `${type.toUpperCase()}: ${metric}${operationText} is ${value}${unit}, exceeding ${threshold}${unit} threshold`;
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): NotificationPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent performance alerts
   */
  getAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    health: "good" | "warning" | "critical";
    score: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 100;
    let health: "good" | "warning" | "critical" = "good";

    // Check API performance
    if (
      this.metrics.apiRequests.p95ResponseTime >
      this.budget.apiResponseTime.critical
    ) {
      health = "critical";
      score -= 30;
      recommendations.push(
        "API response times are critically slow. Consider optimizing backend or implementing caching.",
      );
    } else if (
      this.metrics.apiRequests.p95ResponseTime >
      this.budget.apiResponseTime.warning
    ) {
      health = "warning";
      score -= 15;
      recommendations.push(
        "API response times are slower than expected. Monitor for performance degradation.",
      );
    }

    // Check error rate
    if (this.metrics.apiRequests.errorRate > this.budget.errorRate.critical) {
      health = "critical";
      score -= 25;
      recommendations.push(
        "High error rate detected. Check service health and error handling.",
      );
    } else if (
      this.metrics.apiRequests.errorRate > this.budget.errorRate.warning &&
      health !== "critical"
    ) {
      health = "warning";
      score -= 10;
      recommendations.push("Elevated error rate. Monitor for service issues.");
    }

    // Check cache performance
    if (this.metrics.caching.hitRate < this.budget.cacheHitRate.critical) {
      health = "critical";
      score -= 20;
      recommendations.push(
        "Cache hit rate is critically low. Review caching strategy.",
      );
    } else if (
      this.metrics.caching.hitRate < this.budget.cacheHitRate.warning
    ) {
      if (health !== "critical") health = "warning";
      score -= 10;
      recommendations.push(
        "Cache hit rate could be improved. Consider cache warming or TTL adjustments.",
      );
    }

    // Check UI performance
    const avgUITime =
      (this.metrics.uiOperations.notificationRenderTime +
        this.metrics.uiOperations.modalOpenTime +
        this.metrics.uiOperations.toastDisplayTime) /
      3;

    if (avgUITime > this.budget.uiRenderTime.critical) {
      health = "critical";
      score -= 15;
      recommendations.push(
        "UI operations are slow. Consider optimizing rendering or implementing virtualization.",
      );
    } else if (avgUITime > this.budget.uiRenderTime.warning) {
      if (health !== "critical") health = "warning";
      score -= 8;
      recommendations.push(
        "UI performance could be improved. Review component optimization.",
      );
    }

    return { health, score: Math.max(0, score), recommendations };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.requestTimes = [];
    this.uiOperationTimes.clear();
    this.webVitalsData = {};
    this.alerts = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    metrics: NotificationPerformanceMetrics;
    alerts: PerformanceAlert[];
    budget: PerformanceBudget;
    timestamp: Date;
  } {
    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(50),
      budget: this.budget,
      timestamp: new Date(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.alertCallbacks = [];
    this.resetMetrics();
  }
}

// Global notification performance monitor instance
let globalNotificationPerformanceMonitor: NotificationPerformanceMonitor | null =
  null;

export function createNotificationPerformanceMonitor(
  budget?: Partial<PerformanceBudget>,
): NotificationPerformanceMonitor {
  if (!globalNotificationPerformanceMonitor) {
    globalNotificationPerformanceMonitor = new NotificationPerformanceMonitor(
      budget,
    );
  }
  return globalNotificationPerformanceMonitor;
}

export function getNotificationPerformanceMonitor(): NotificationPerformanceMonitor {
  if (!globalNotificationPerformanceMonitor) {
    throw new Error(
      "Notification performance monitor not initialized. Call createNotificationPerformanceMonitor first.",
    );
  }
  return globalNotificationPerformanceMonitor;
}
