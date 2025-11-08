/**
 * Performance Monitor
 *
 * Comprehensive performance tracking for content service operations
 * Tracks request duration, success rates, cache performance, and user experience metrics
 * Requirements: 6.1, 10.1
 */

export interface PerformanceMetrics {
  // Request Performance
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Cache Performance
  cacheHitRate: number;
  cacheMissRate: number;
  totalCacheRequests: number;
  averageCacheResponseTime: number;

  // Error Metrics
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;

  // User Experience Metrics
  timeToFirstByte: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;

  // Operation-specific Metrics
  operationMetrics: Record<string, OperationMetrics>;

  // Time-based Metrics
  metricsWindow: TimeWindow;
  lastResetTime: Date;
}

export interface OperationMetrics {
  operationType: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  responseTimes: number[];
  errorCount: number;
  lastCallTime?: Date;
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
}

export interface PerformanceEvent {
  id: string;
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  errorType?: string;
  cacheHit?: boolean;
  requestSize?: number;
  responseSize?: number;
  correlationId?: string;
}

export interface PerformanceConfig {
  enableTracking: boolean;
  enableCacheMetrics: boolean;
  enableUXMetrics: boolean;
  metricsWindowSize: number; // in milliseconds
  maxStoredEvents: number;
  aggregationInterval: number; // in milliseconds
  enableRealTimeUpdates: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private events: PerformanceEvent[] = [];
  private config: PerformanceConfig;
  private aggregationTimer?: NodeJS.Timeout;
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableTracking: true,
      enableCacheMetrics: true,
      enableUXMetrics: true,
      metricsWindowSize: 3600000, // 1 hour
      maxStoredEvents: 10000,
      aggregationInterval: 60000, // 1 minute
      enableRealTimeUpdates: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();

    if (this.config.enableTracking) {
      this.startAggregation();
    }
  }

  /**
   * Records a performance event
   */
  recordEvent(event: Omit<PerformanceEvent, "id" | "timestamp">): void {
    if (!this.config.enableTracking) return;

    const performanceEvent: PerformanceEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
    };

    this.events.push(performanceEvent);

    // Maintain event buffer size
    if (this.events.length > this.config.maxStoredEvents) {
      this.events = this.events.slice(-this.config.maxStoredEvents);
    }

    // Update metrics immediately for real-time updates
    if (this.config.enableRealTimeUpdates) {
      this.updateMetricsFromEvent(performanceEvent);
      this.notifyObservers();
    }
  }

  /**
   * Records request performance
   */
  recordRequest(
    operation: string,
    duration: number,
    success: boolean,
    options?: {
      errorType?: string;
      cacheHit?: boolean;
      requestSize?: number;
      responseSize?: number;
      correlationId?: string;
    },
  ): void {
    this.recordEvent({
      operation,
      duration,
      success,
      ...(options?.errorType && { errorType: options.errorType }),
      ...(options?.cacheHit !== undefined && { cacheHit: options.cacheHit }),
      ...(options?.requestSize && { requestSize: options.requestSize }),
      ...(options?.responseSize && { responseSize: options.responseSize }),
      ...(options?.correlationId && { correlationId: options.correlationId }),
    });
  }

  /**
   * Records cache performance
   */
  recordCacheOperation(
    operation: string,
    hit: boolean,
    duration: number,
  ): void {
    if (!this.config.enableCacheMetrics) return;

    this.recordEvent({
      operation: `cache_${operation}`,
      duration,
      success: true,
      cacheHit: hit,
    });
  }

  /**
   * Records user experience metrics
   */
  recordUXMetric(metric: "ttfb" | "tti" | "cls", value: number): void {
    if (!this.config.enableUXMetrics) return;

    this.recordEvent({
      operation: `ux_${metric}`,
      duration: value,
      success: true,
    });
  }

  /**
   * Gets current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets metrics for a specific operation
   */
  getOperationMetrics(operation: string): OperationMetrics | null {
    return this.metrics.operationMetrics[operation] || null;
  }

  /**
   * Gets performance summary
   */
  getPerformanceSummary(): {
    overallHealth: "excellent" | "good" | "fair" | "poor";
    successRate: number;
    averageResponseTime: number;
    cacheEfficiency: number;
    errorRate: number;
    recommendations: string[];
  } {
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 100;

    const errorRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
        : 0;

    const cacheEfficiency =
      this.metrics.totalCacheRequests > 0 ? this.metrics.cacheHitRate : 0;

    // Determine overall health
    let overallHealth: "excellent" | "good" | "fair" | "poor" = "excellent";
    const recommendations: string[] = [];

    if (successRate < 95) {
      overallHealth = "poor";
      recommendations.push(
        "High error rate detected. Review error logs and implement fixes.",
      );
    } else if (successRate < 98) {
      overallHealth = "fair";
      recommendations.push(
        "Moderate error rate. Consider improving error handling.",
      );
    }

    if (this.metrics.averageResponseTime > 2000) {
      overallHealth = overallHealth === "excellent" ? "fair" : "poor";
      recommendations.push(
        "High response times detected. Consider optimizing API calls or caching.",
      );
    } else if (this.metrics.averageResponseTime > 1000) {
      if (overallHealth === "excellent") overallHealth = "good";
      recommendations.push(
        "Response times could be improved with better caching or optimization.",
      );
    }

    if (cacheEfficiency < 70 && this.metrics.totalCacheRequests > 100) {
      if (overallHealth === "excellent") overallHealth = "good";
      recommendations.push(
        "Low cache hit rate. Review caching strategy and TTL settings.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Performance is optimal. Continue monitoring for any degradation.",
      );
    }

    return {
      overallHealth,
      successRate,
      averageResponseTime: this.metrics.averageResponseTime,
      cacheEfficiency,
      errorRate,
      recommendations,
    };
  }

  /**
   * Subscribes to metrics updates
   */
  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(observer);

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.events = [];
    this.notifyObservers();
  }

  /**
   * Exports metrics data
   */
  exportMetrics(): {
    metrics: PerformanceMetrics;
    events: PerformanceEvent[];
    exportTime: Date;
  } {
    return {
      metrics: this.getMetrics(),
      events: [...this.events],
      exportTime: new Date(),
    };
  }

  /**
   * Destroys the performance monitor
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    this.observers = [];
    this.events = [];
  }

  // Private Methods

  private initializeMetrics(): PerformanceMetrics {
    const now = new Date();
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      cacheMissRate: 0,
      totalCacheRequests: 0,
      averageCacheResponseTime: 0,
      errorRate: 0,
      errorsByType: {},
      errorsByOperation: {},
      timeToFirstByte: 0,
      timeToInteractive: 0,
      cumulativeLayoutShift: 0,
      operationMetrics: {},
      metricsWindow: {
        startTime: now,
        endTime: new Date(now.getTime() + this.config.metricsWindowSize),
        duration: this.config.metricsWindowSize,
      },
      lastResetTime: now,
    };
  }

  private generateEventId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetricsFromEvent(event: PerformanceEvent): void {
    // Update request metrics
    this.metrics.totalRequests++;

    if (event.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      // Update error metrics
      if (event.errorType) {
        this.metrics.errorsByType[event.errorType] =
          (this.metrics.errorsByType[event.errorType] || 0) + 1;
      }
      this.metrics.errorsByOperation[event.operation] =
        (this.metrics.errorsByOperation[event.operation] || 0) + 1;
    }

    // Update response time metrics
    this.updateResponseTimeMetrics(event.duration);

    // Update cache metrics
    if (event.cacheHit !== undefined) {
      this.updateCacheMetrics(event.cacheHit, event.duration);
    }

    // Update operation-specific metrics
    this.updateOperationMetrics(event);

    // Update derived metrics
    this.updateDerivedMetrics();
  }

  private updateResponseTimeMetrics(duration: number): void {
    // Update average response time (rolling average)
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
        duration) /
      this.metrics.totalRequests;

    // Calculate percentiles from recent events
    const recentEvents = this.events.slice(-1000); // Last 1000 events for percentile calculation
    const responseTimes = recentEvents
      .map((e) => e.duration)
      .sort((a, b) => a - b);

    if (responseTimes.length > 0) {
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);

      this.metrics.p95ResponseTime = responseTimes[p95Index] || 0;
      this.metrics.p99ResponseTime = responseTimes[p99Index] || 0;
    }
  }

  private updateCacheMetrics(cacheHit: boolean, duration: number): void {
    this.metrics.totalCacheRequests++;

    if (cacheHit) {
      // Update cache hit rate
      const hitCount =
        Math.round(
          (this.metrics.cacheHitRate * (this.metrics.totalCacheRequests - 1)) /
            100,
        ) + 1;
      this.metrics.cacheHitRate =
        (hitCount / this.metrics.totalCacheRequests) * 100;
    }

    // Update cache miss rate
    this.metrics.cacheMissRate = 100 - this.metrics.cacheHitRate;

    // Update average cache response time
    this.metrics.averageCacheResponseTime =
      (this.metrics.averageCacheResponseTime *
        (this.metrics.totalCacheRequests - 1) +
        duration) /
      this.metrics.totalCacheRequests;
  }

  private updateOperationMetrics(event: PerformanceEvent): void {
    if (!this.metrics.operationMetrics[event.operation]) {
      this.metrics.operationMetrics[event.operation] = {
        operationType: event.operation,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        responseTimes: [],
        errorCount: 0,
      };
    }

    const opMetrics = this.metrics.operationMetrics[event.operation];
    if (opMetrics) {
      opMetrics.totalCalls++;
      opMetrics.lastCallTime = event.timestamp;

      if (event.success) {
        opMetrics.successfulCalls++;
      } else {
        opMetrics.failedCalls++;
        opMetrics.errorCount++;
      }

      // Update response times (keep last 100 for this operation)
      opMetrics.responseTimes.push(event.duration);
      if (opMetrics.responseTimes.length > 100) {
        opMetrics.responseTimes = opMetrics.responseTimes.slice(-100);
      }

      // Update average response time
      opMetrics.averageResponseTime =
        opMetrics.responseTimes.reduce((sum, time) => sum + time, 0) /
        opMetrics.responseTimes.length;
    }
  }

  private updateDerivedMetrics(): void {
    // Update error rate
    this.metrics.errorRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
        : 0;
  }

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
      this.cleanupOldEvents();
      this.notifyObservers();
    }, this.config.aggregationInterval);
  }

  private aggregateMetrics(): void {
    // Recalculate metrics from events within the current window
    const windowStart = new Date(Date.now() - this.config.metricsWindowSize);
    const windowEvents = this.events.filter(
      (event) => event.timestamp >= windowStart,
    );

    // Reset and recalculate metrics from window events
    const tempMetrics = this.initializeMetrics();

    for (const event of windowEvents) {
      this.updateMetricsFromEventForAggregation(tempMetrics, event);
    }

    // Update the main metrics with aggregated values
    this.metrics = {
      ...tempMetrics,
      metricsWindow: {
        startTime: windowStart,
        endTime: new Date(),
        duration: this.config.metricsWindowSize,
      },
      lastResetTime: this.metrics.lastResetTime,
    };
  }

  private updateMetricsFromEventForAggregation(
    metrics: PerformanceMetrics,
    event: PerformanceEvent,
  ): void {
    // Similar to updateMetricsFromEvent but for aggregation
    metrics.totalRequests++;

    if (event.success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;

      if (event.errorType) {
        metrics.errorsByType[event.errorType] =
          (metrics.errorsByType[event.errorType] || 0) + 1;
      }
      metrics.errorsByOperation[event.operation] =
        (metrics.errorsByOperation[event.operation] || 0) + 1;
    }

    // Update response time
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.totalRequests - 1) +
        event.duration) /
      metrics.totalRequests;

    // Update cache metrics
    if (event.cacheHit !== undefined) {
      metrics.totalCacheRequests++;
      if (event.cacheHit) {
        const hitCount =
          Math.round(
            (metrics.cacheHitRate * (metrics.totalCacheRequests - 1)) / 100,
          ) + 1;
        metrics.cacheHitRate = (hitCount / metrics.totalCacheRequests) * 100;
      }
      metrics.cacheMissRate = 100 - metrics.cacheHitRate;

      metrics.averageCacheResponseTime =
        (metrics.averageCacheResponseTime * (metrics.totalCacheRequests - 1) +
          event.duration) /
        metrics.totalCacheRequests;
    }

    // Update operation metrics
    if (!metrics.operationMetrics[event.operation]) {
      metrics.operationMetrics[event.operation] = {
        operationType: event.operation,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        responseTimes: [],
        errorCount: 0,
      };
    }

    const opMetrics = metrics.operationMetrics[event.operation];
    if (opMetrics) {
      opMetrics.totalCalls++;
      opMetrics.lastCallTime = event.timestamp;

      if (event.success) {
        opMetrics.successfulCalls++;
      } else {
        opMetrics.failedCalls++;
        opMetrics.errorCount++;
      }

      opMetrics.responseTimes.push(event.duration);
      opMetrics.averageResponseTime =
        opMetrics.responseTimes.reduce((sum, time) => sum + time, 0) /
        opMetrics.responseTimes.length;
    }

    // Update error rate
    metrics.errorRate =
      metrics.totalRequests > 0
        ? (metrics.failedRequests / metrics.totalRequests) * 100
        : 0;
  }

  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - this.config.metricsWindowSize);
    this.events = this.events.filter((event) => event.timestamp >= cutoffTime);
  }

  private notifyObservers(): void {
    for (const observer of this.observers) {
      try {
        observer(this.getMetrics());
      } catch (error) {
        console.error("[PerformanceMonitor] Error notifying observer:", error);
      }
    }
  }
}

// Singleton instance for global use
export const performanceMonitor = new PerformanceMonitor();
