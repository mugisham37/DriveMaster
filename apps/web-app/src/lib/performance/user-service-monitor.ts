/**
 * User Service Performance Monitor
 * Implements Task 11.2:
 * - Performance metrics collection for all user-service operations
 * - Response time monitoring with P50, P95, P99 percentiles
 * - Cache hit ratio tracking and optimization
 * - Memory usage monitoring and garbage collection optimization
 * Requirements: 10.5, 6.2, 8.4, 8.5
 */

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    min: number;
    max: number;
    samples: number[];
  };
  throughput: {
    requestsPerSecond: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: number;
  };
  caching: {
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number;
    cacheSize: number;
    evictionCount: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    gcCount: number;
    gcDuration: number;
  };
  operations: {
    [operation: string]: {
      count: number;
      averageTime: number;
      errorCount: number;
      lastExecuted: Date;
    };
  };
}

export interface PerformanceAlert {
  type: "warning" | "error" | "critical";
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

export interface PerformanceThresholds {
  responseTime: {
    p95Warning: number;
    p95Critical: number;
    averageWarning: number;
    averageCritical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  cacheHitRate: {
    warning: number;
    critical: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
}

export class UserServicePerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcObserver: PerformanceObserver | null = null;
  private startTime: number = Date.now();

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      responseTime: {
        p95Warning: 1000, // 1 second
        p95Critical: 3000, // 3 seconds
        averageWarning: 500, // 500ms
        averageCritical: 1500, // 1.5 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.15, // 15%
      },
      cacheHitRate: {
        warning: 0.8, // 80%
        critical: 0.6, // 60%
      },
      memoryUsage: {
        warning: 100 * 1024 * 1024, // 100MB
        critical: 200 * 1024 * 1024, // 200MB
      },
      ...thresholds,
    };

    this.metrics = this.initializeMetrics();
    this.setupGCMonitoring();
    this.startMonitoring();
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTime: {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: [],
      },
      throughput: {
        requestsPerSecond: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        errorRate: 0,
      },
      caching: {
        hitRate: 0,
        missRate: 0,
        totalHits: 0,
        totalMisses: 0,
        memoryUsage: 0,
        cacheSize: 0,
        evictionCount: 0,
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        gcCount: 0,
        gcDuration: 0,
      },
      operations: {},
    };
  }

  /**
   * Record a request operation
   */
  recordRequest(
    operation: string,
    responseTime: number,
    success: boolean,
    error?: Error,
  ): void {
    // Update response time metrics
    this.updateResponseTimeMetrics(responseTime);

    // Log error if present
    if (error) {
      console.error("Request error for operation", operation, ":", error.message);
    }

    // Update throughput metrics
    this.metrics.throughput.totalRequests++;
    if (success) {
      this.metrics.throughput.successfulRequests++;
    } else {
      this.metrics.throughput.failedRequests++;
    }

    // Update error rate
    this.metrics.throughput.errorRate =
      this.metrics.throughput.failedRequests /
      this.metrics.throughput.totalRequests;

    // Update operation-specific metrics
    this.updateOperationMetrics(operation, responseTime, success);

    // Check for alerts
    this.checkAlerts();
  }

  /**
   * Update response time metrics with percentile calculations
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    const rt = this.metrics.responseTime;

    // Add to samples (keep last 1000 samples for percentile calculation)
    rt.samples.push(responseTime);
    if (rt.samples.length > 1000) {
      rt.samples.shift();
    }

    // Update min/max
    rt.min = Math.min(rt.min, responseTime);
    rt.max = Math.max(rt.max, responseTime);

    // Calculate average
    const totalRequests = this.metrics.throughput.totalRequests;
    rt.average =
      (rt.average * (totalRequests - 1) + responseTime) / totalRequests;

    // Calculate percentiles
    if (rt.samples.length >= 10) {
      const sorted = [...rt.samples].sort((a, b) => a - b);
      rt.p50 = this.calculatePercentile(sorted, 50);
      rt.p95 = this.calculatePercentile(sorted, 95);
      rt.p99 = this.calculatePercentile(sorted, 99);
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number,
  ): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower] || 0;
    }

    const weight = index - lower;
    return (
      (sortedArray[lower] || 0) * (1 - weight) +
      (sortedArray[upper] || 0) * weight
    );
  }

  /**
   * Update operation-specific metrics
   */
  private updateOperationMetrics(
    operation: string,
    responseTime: number,
    success: boolean,
  ): void {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = {
        count: 0,
        averageTime: 0,
        errorCount: 0,
        lastExecuted: new Date(),
      };
    }

    const opMetrics = this.metrics.operations[operation];
    if (opMetrics) {
      opMetrics.count++;
      opMetrics.averageTime =
        (opMetrics.averageTime * (opMetrics.count - 1) + responseTime) /
        opMetrics.count;
      opMetrics.lastExecuted = new Date();

      if (!success) {
        opMetrics.errorCount++;
      }
    }
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(
    hits: number,
    misses: number,
    memoryUsage: number,
    cacheSize: number,
    evictions: number = 0,
  ): void {
    this.metrics.caching.totalHits = hits;
    this.metrics.caching.totalMisses = misses;
    this.metrics.caching.hitRate = hits / (hits + misses) || 0;
    this.metrics.caching.missRate = misses / (hits + misses) || 0;
    this.metrics.caching.memoryUsage = memoryUsage;
    this.metrics.caching.cacheSize = cacheSize;
    this.metrics.caching.evictionCount = evictions;

    this.checkAlerts();
  }

  /**
   * Setup garbage collection monitoring
   */
  private setupGCMonitoring(): void {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "measure" && entry.name.includes("gc")) {
              this.metrics.memory.gcCount++;
              this.metrics.memory.gcDuration += entry.duration || 0;
            }
          }
        });

        this.gcObserver.observe({ entryTypes: ["measure"] });
      } catch (error) {
        console.warn("GC monitoring not available:", error);
      }
    }
  }

  /**
   * Start periodic monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryMetrics();
      this.calculateThroughput();
      this.checkAlerts();
    }, 5000); // Every 5 seconds
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if (
      typeof window !== "undefined" &&
      "performance" in window &&
      "memory" in performance
    ) {
      const memory = (
        performance as Performance & {
          memory?: {
            usedJSHeapSize?: number;
            totalJSHeapSize?: number;
          };
        }
      ).memory;
      if (memory) {
        this.metrics.memory.heapUsed = memory.usedJSHeapSize || 0;
        this.metrics.memory.heapTotal = memory.totalJSHeapSize || 0;
        this.metrics.memory.external = memory.usedJSHeapSize || 0;
      }
    }
  }

  /**
   * Calculate requests per second
   */
  private calculateThroughput(): void {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    this.metrics.throughput.requestsPerSecond =
      this.metrics.throughput.totalRequests / elapsedSeconds;
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const now = new Date();

    // Response time alerts
    if (
      this.metrics.responseTime.p95 > this.thresholds.responseTime.p95Critical
    ) {
      this.addAlert(
        "critical",
        "responseTime.p95",
        this.metrics.responseTime.p95,
        this.thresholds.responseTime.p95Critical,
        `P95 response time (${this.metrics.responseTime.p95}ms) exceeds critical threshold`,
        now,
      );
    } else if (
      this.metrics.responseTime.p95 > this.thresholds.responseTime.p95Warning
    ) {
      this.addAlert(
        "warning",
        "responseTime.p95",
        this.metrics.responseTime.p95,
        this.thresholds.responseTime.p95Warning,
        `P95 response time (${this.metrics.responseTime.p95}ms) exceeds warning threshold`,
        now,
      );
    }

    // Error rate alerts
    if (
      this.metrics.throughput.errorRate > this.thresholds.errorRate.critical
    ) {
      this.addAlert(
        "critical",
        "errorRate",
        this.metrics.throughput.errorRate,
        this.thresholds.errorRate.critical,
        `Error rate (${(this.metrics.throughput.errorRate * 100).toFixed(1)}%) exceeds critical threshold`,
        now,
      );
    } else if (
      this.metrics.throughput.errorRate > this.thresholds.errorRate.warning
    ) {
      this.addAlert(
        "warning",
        "errorRate",
        this.metrics.throughput.errorRate,
        this.thresholds.errorRate.warning,
        `Error rate (${(this.metrics.throughput.errorRate * 100).toFixed(1)}%) exceeds warning threshold`,
        now,
      );
    }

    // Cache hit rate alerts
    if (this.metrics.caching.hitRate < this.thresholds.cacheHitRate.critical) {
      this.addAlert(
        "critical",
        "cacheHitRate",
        this.metrics.caching.hitRate,
        this.thresholds.cacheHitRate.critical,
        `Cache hit rate (${(this.metrics.caching.hitRate * 100).toFixed(1)}%) below critical threshold`,
        now,
      );
    } else if (
      this.metrics.caching.hitRate < this.thresholds.cacheHitRate.warning
    ) {
      this.addAlert(
        "warning",
        "cacheHitRate",
        this.metrics.caching.hitRate,
        this.thresholds.cacheHitRate.warning,
        `Cache hit rate (${(this.metrics.caching.hitRate * 100).toFixed(1)}%) below warning threshold`,
        now,
      );
    }

    // Memory usage alerts
    if (this.metrics.memory.heapUsed > this.thresholds.memoryUsage.critical) {
      this.addAlert(
        "critical",
        "memoryUsage",
        this.metrics.memory.heapUsed,
        this.thresholds.memoryUsage.critical,
        `Memory usage (${(this.metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB) exceeds critical threshold`,
        now,
      );
    } else if (
      this.metrics.memory.heapUsed > this.thresholds.memoryUsage.warning
    ) {
      this.addAlert(
        "warning",
        "memoryUsage",
        this.metrics.memory.heapUsed,
        this.thresholds.memoryUsage.warning,
        `Memory usage (${(this.metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB) exceeds warning threshold`,
        now,
      );
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(
    type: "warning" | "error" | "critical",
    metric: string,
    value: number,
    threshold: number,
    message: string,
    timestamp: Date,
  ): void {
    // Avoid duplicate alerts (same metric within 1 minute)
    const recentAlert = this.alerts.find(
      (alert) =>
        alert.metric === metric &&
        alert.type === type &&
        timestamp.getTime() - alert.timestamp.getTime() < 60000,
    );

    if (!recentAlert) {
      this.alerts.push({ type, metric, value, threshold, message, timestamp });

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }

      // Log alert
      console.warn(`[Performance Alert] ${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Get recent alerts
   */
  getAlerts(since?: Date): PerformanceAlert[] {
    if (since) {
      return this.alerts.filter((alert) => alert.timestamp >= since);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    health: "good" | "warning" | "critical";
    summary: string;
    recommendations: string[];
  } {
    const criticalAlerts = this.alerts.filter(
      (a) => a.type === "critical",
    ).length;
    const warningAlerts = this.alerts.filter(
      (a) => a.type === "warning",
    ).length;

    let health: "good" | "warning" | "critical" = "good";
    let summary = "Performance is within acceptable limits";
    const recommendations: string[] = [];

    if (criticalAlerts > 0) {
      health = "critical";
      summary = `${criticalAlerts} critical performance issues detected`;
    } else if (warningAlerts > 0) {
      health = "warning";
      summary = `${warningAlerts} performance warnings detected`;
    }

    // Generate recommendations
    if (
      this.metrics.responseTime.p95 > this.thresholds.responseTime.p95Warning
    ) {
      recommendations.push(
        "Consider implementing request batching or caching to reduce response times",
      );
    }

    if (this.metrics.caching.hitRate < this.thresholds.cacheHitRate.warning) {
      recommendations.push(
        "Review cache strategies and consider increasing cache TTL or warming",
      );
    }

    if (this.metrics.throughput.errorRate > this.thresholds.errorRate.warning) {
      recommendations.push(
        "Investigate error patterns and implement circuit breaker if needed",
      );
    }

    if (this.metrics.memory.heapUsed > this.thresholds.memoryUsage.warning) {
      recommendations.push(
        "Monitor memory leaks and consider implementing memory optimization",
      );
    }

    return { health, summary, recommendations };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
    this.alerts = [];
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: UserServicePerformanceMonitor | null = null;

export function createPerformanceMonitor(
  thresholds?: Partial<PerformanceThresholds>,
): UserServicePerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new UserServicePerformanceMonitor(thresholds);
  }
  return globalPerformanceMonitor;
}

export function getPerformanceMonitor(): UserServicePerformanceMonitor {
  if (!globalPerformanceMonitor) {
    throw new Error(
      "Performance monitor not initialized. Call createPerformanceMonitor first.",
    );
  }
  return globalPerformanceMonitor;
}
