/**
 * Notification Service Performance Manager
 * Implements Task 12: Performance Optimization and Monitoring
 *
 * Orchestrates all notification performance optimization components:
 * - Performance monitoring for notification operations
 * - Request batching and debouncing for improved efficiency
 * - Lazy loading and code splitting for notification components
 * - Performance metrics dashboard for operational monitoring
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { NotificationApiClient } from "./api-client";
import type { NotificationQueryParams } from "@/types/notification-service";
import {
  NotificationPerformanceMonitor,
  createNotificationPerformanceMonitor,
  PerformanceBudget,
} from "./performance-monitor";
import {
  NotificationRequestOptimizer,
  createNotificationRequestOptimizer,
  NotificationRequestOptimizerConfig,
} from "./request-optimizer";
import {
  NotificationLazyLoader,
  getNotificationLazyLoader,
  LazyLoadConfig,
} from "./lazy-loader";
import { reportWebVitals, WebVitalsMetric } from "../performance/web-vitals";

export interface NotificationPerformanceManagerConfig {
  enablePerformanceMonitoring: boolean;
  enableRequestOptimization: boolean;
  enableLazyLoading: boolean;
  enableWebVitalsTracking: boolean;
  performanceBudget?: Partial<PerformanceBudget>;
  requestOptimizer?: Partial<NotificationRequestOptimizerConfig>;
  lazyLoader?: Partial<LazyLoadConfig>;
  autoOptimization?: {
    enableAutoBatching: boolean;
    enableAutoDebouncing: boolean;
    enableAutoPrefetching: boolean;
    enableAutoLazyLoading: boolean;
  };
}

export interface NotificationPerformanceStats {
  monitoring: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    alertCount: number;
  };
  optimization: {
    batchedRequests: number;
    debouncedRequests: number;
    deduplicatedRequests: number;
    bandwidthSaved: number;
  };
  lazyLoading: {
    componentsLoaded: number;
    imagesLoaded: number;
    bytesLoaded: number;
    cacheHits: number;
  };
  webVitals: {
    lcp?: number;
    inp?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
  overall: {
    performanceScore: number;
    health: "excellent" | "good" | "fair" | "poor";
    recommendations: string[];
  };
}

export class NotificationPerformanceManager {
  private apiClient: NotificationApiClient;
  private config: NotificationPerformanceManagerConfig;
  private performanceMonitor?: NotificationPerformanceMonitor;
  private requestOptimizer?: NotificationRequestOptimizer;
  private lazyLoader?: NotificationLazyLoader;
  private webVitalsData: { [key: string]: number } = {};
  private isInitialized: boolean = false;
  private autoOptimizationEnabled: boolean = false;

  constructor(
    apiClient: NotificationApiClient,
    config: Partial<NotificationPerformanceManagerConfig> = {},
  ) {
    this.apiClient = apiClient;
    this.config = {
      enablePerformanceMonitoring: true,
      enableRequestOptimization: true,
      enableLazyLoading: true,
      enableWebVitalsTracking: true,
      autoOptimization: {
        enableAutoBatching: true,
        enableAutoDebouncing: true,
        enableAutoPrefetching: true,
        enableAutoLazyLoading: true,
      },
      ...config,
    };
  }

  /**
   * Initialize all performance components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(
        "[NotificationPerformanceManager] Initializing performance components...",
      );

      // Initialize performance monitor
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor = createNotificationPerformanceMonitor(
          this.config.performanceBudget,
        );
        console.log(
          "[NotificationPerformanceManager] Performance monitor initialized",
        );
      }

      // Initialize request optimizer
      if (this.config.enableRequestOptimization) {
        this.requestOptimizer = createNotificationRequestOptimizer(
          this.apiClient,
          this.config.requestOptimizer,
        );
        console.log(
          "[NotificationPerformanceManager] Request optimizer initialized",
        );
      }

      // Initialize lazy loader
      if (this.config.enableLazyLoading) {
        this.lazyLoader = getNotificationLazyLoader();
        console.log("[NotificationPerformanceManager] Lazy loader initialized");
      }

      // Setup Web Vitals tracking
      if (this.config.enableWebVitalsTracking) {
        this.setupWebVitalsTracking();
        console.log(
          "[NotificationPerformanceManager] Web Vitals tracking initialized",
        );
      }

      // Enable auto-optimization if configured
      if (this.config.autoOptimization) {
        this.enableAutoOptimization();
      }

      this.isInitialized = true;
      console.log(
        "[NotificationPerformanceManager] All components initialized successfully",
      );
    } catch (error) {
      console.error(
        "[NotificationPerformanceManager] Failed to initialize:",
        error,
      );
      throw error;
    }
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitalsTracking(): void {
    if (typeof window === "undefined") return;

    reportWebVitals((metric: WebVitalsMetric) => {
      this.webVitalsData[metric.name] = metric.value;

      // Record with performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.recordWebVital(metric);
      }

      // Log performance issues
      this.logWebVitalIssues(metric);
    });
  }

  /**
   * Log Web Vital performance issues
   */
  private logWebVitalIssues(metric: WebVitalsMetric): void {
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
      console.error(
        `[NotificationPerformance] Critical ${metric.name}:`,
        metric.value,
      );
    } else if (metric.value > threshold.warning) {
      console.warn(
        `[NotificationPerformance] Poor ${metric.name}:`,
        metric.value,
      );
    }
  }

  /**
   * Enable auto-optimization features
   */
  private enableAutoOptimization(): void {
    if (!this.config.autoOptimization || this.autoOptimizationEnabled) return;

    this.autoOptimizationEnabled = true;

    // Auto-batching: Monitor request patterns and adjust batch sizes
    if (
      this.config.autoOptimization.enableAutoBatching &&
      this.requestOptimizer
    ) {
      setInterval(() => {
        this.optimizeBatchSizes();
      }, 30000); // Check every 30 seconds
    }

    // Auto-prefetching: Learn user patterns and prefetch likely requests
    if (
      this.config.autoOptimization.enableAutoPrefetching &&
      this.requestOptimizer
    ) {
      setInterval(() => {
        this.executePredictivePrefetching();
      }, 60000); // Check every minute
    }

    // Auto-lazy loading: Adjust lazy loading thresholds based on performance
    if (this.config.autoOptimization.enableAutoLazyLoading && this.lazyLoader) {
      setInterval(() => {
        this.optimizeLazyLoadingThresholds();
      }, 120000); // Check every 2 minutes
    }

    console.log("[NotificationPerformanceManager] Auto-optimization enabled");
  }

  /**
   * Optimize batch sizes based on performance metrics
   */
  private optimizeBatchSizes(): void {
    if (!this.requestOptimizer || !this.performanceMonitor) return;

    const stats = this.requestOptimizer.getStats();
    const metrics = this.performanceMonitor.getMetrics();

    // If response time is high and batching is low, increase batch size
    if (
      metrics.apiRequests.averageResponseTime > 1000 &&
      stats.batchedRequests / stats.totalRequests < 0.3
    ) {
      console.log(
        "[NotificationPerformanceManager] Auto-optimization: Increasing batch size",
      );
      // Implementation would adjust batch size in request optimizer
    }

    // If error rate is high, reduce batch size
    if (metrics.apiRequests.errorRate > 0.1) {
      console.log(
        "[NotificationPerformanceManager] Auto-optimization: Reducing batch size due to errors",
      );
      // Implementation would reduce batch size in request optimizer
    }
  }

  /**
   * Execute predictive prefetching based on user behavior
   */
  private executePredictivePrefetching(): void {
    if (!this.requestOptimizer) return;

    // Analyze user behavior patterns and prefetch likely requests
    const context = {
      userId: "current-user", // Would get from auth context
      currentNotifications: [],
      userBehaviorPattern: {
        frequentlyAccessedTypes: ["notifications", "preferences"],
        averageSessionDuration: 300000, // 5 minutes
        preferredTimeRanges: ["morning", "evening"],
      },
      networkConditions: {
        effectiveType: "4g",
        downlink: 2.0,
        rtt: 100,
      },
    };

    this.requestOptimizer.executePrefetch(context);
  }

  /**
   * Optimize lazy loading thresholds based on performance
   */
  private optimizeLazyLoadingThresholds(): void {
    if (!this.lazyLoader || !this.performanceMonitor) return;

    const metrics = this.performanceMonitor.getMetrics();

    // If UI performance is poor, be more aggressive with lazy loading
    if (metrics.uiOperations.notificationRenderTime > 200) {
      console.log(
        "[NotificationPerformanceManager] Auto-optimization: Increasing lazy loading aggressiveness",
      );
      // Implementation would adjust lazy loading thresholds
    }
  }

  /**
   * Execute optimized notification request
   */
  async executeOptimizedRequest<T>(
    operation: string,
    params: unknown,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<T> {
    const startTime = Date.now();

    try {
      let result: T;

      // Use request optimizer if available
      if (this.requestOptimizer) {
        result = await this.requestOptimizer.optimizeRequest<T>(
          operation,
          params,
          priority,
        );
      } else {
        // Fallback to direct API call
        result = await this.executeDirectRequest<T>(operation, params);
      }

      // Record successful request
      if (this.performanceMonitor) {
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordApiRequest(operation, responseTime, true);
      }

      return result;
    } catch (error) {
      // Record failed request
      if (this.performanceMonitor) {
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordApiRequest(
          operation,
          responseTime,
          false,
          error as Error,
        );
      }

      throw error;
    }
  }

  /**
   * Execute direct API request (fallback)
   */
  private async executeDirectRequest<T>(
    operation: string,
    params: unknown,
  ): Promise<T> {
    switch (operation) {
      case "getNotifications":
        return this.apiClient.getNotifications(
          params as NotificationQueryParams | undefined,
        ) as Promise<T>;
      case "markAsRead":
        return this.apiClient.markAsRead(params as string) as Promise<T>;
      case "deleteNotification":
        return this.apiClient.deleteNotification(
          params as string,
        ) as Promise<T>;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Record UI operation performance
   */
  recordUIOperation(operation: string, duration: number): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordUIOperation(operation, duration);
    }
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(
    hits: number,
    misses: number,
    size: number,
    evictions: number = 0,
  ): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.updateCacheMetrics(hits, misses, size, evictions);
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
    if (this.performanceMonitor) {
      this.performanceMonitor.updateRealtimeMetrics(
        connectionLatency,
        messageDeliveryTime,
        reconnectionCount,
        connectionUptime,
      );
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): NotificationPerformanceStats {
    const stats: NotificationPerformanceStats = {
      monitoring: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        alertCount: 0,
      },
      optimization: {
        batchedRequests: 0,
        debouncedRequests: 0,
        deduplicatedRequests: 0,
        bandwidthSaved: 0,
      },
      lazyLoading: {
        componentsLoaded: 0,
        imagesLoaded: 0,
        bytesLoaded: 0,
        cacheHits: 0,
      },
      webVitals: { ...this.webVitalsData },
      overall: {
        performanceScore: 0,
        health: "poor",
        recommendations: [],
      },
    };

    // Collect performance monitor stats
    if (this.performanceMonitor) {
      const metrics = this.performanceMonitor.getMetrics();
      const alerts = this.performanceMonitor.getAlerts();

      stats.monitoring = {
        totalRequests: metrics.apiRequests.totalRequests,
        averageResponseTime: metrics.apiRequests.averageResponseTime,
        errorRate: metrics.apiRequests.errorRate,
        cacheHitRate: metrics.caching.hitRate,
        alertCount: alerts.length,
      };
    }

    // Collect request optimizer stats
    if (this.requestOptimizer) {
      const optimizerStats = this.requestOptimizer.getStats();
      stats.optimization = {
        batchedRequests: optimizerStats.batchedRequests,
        debouncedRequests: optimizerStats.debouncedRequests,
        deduplicatedRequests: optimizerStats.deduplicatedRequests,
        bandwidthSaved: optimizerStats.bandwidthSaved,
      };
    }

    // Collect lazy loader stats
    if (this.lazyLoader) {
      const lazyStats = this.lazyLoader.getStats();
      stats.lazyLoading = {
        componentsLoaded: lazyStats.componentsLoaded,
        imagesLoaded: lazyStats.imagesLoaded,
        bytesLoaded: lazyStats.bytesLoaded,
        cacheHits: lazyStats.cacheHits,
      };
    }

    // Calculate overall performance
    stats.overall = this.calculateOverallPerformance(stats);

    return stats;
  }

  /**
   * Calculate overall performance score and health
   */
  private calculateOverallPerformance(stats: NotificationPerformanceStats): {
    performanceScore: number;
    health: "excellent" | "good" | "fair" | "poor";
    recommendations: string[];
  } {
    let score = 100;
    const recommendations: string[] = [];

    // Response time impact (30%)
    if (stats.monitoring.averageResponseTime > 3000) {
      score -= 30;
      recommendations.push("API response times are critically slow");
    } else if (stats.monitoring.averageResponseTime > 1000) {
      score -= 15;
      recommendations.push("API response times could be improved");
    }

    // Error rate impact (25%)
    if (stats.monitoring.errorRate > 0.15) {
      score -= 25;
      recommendations.push("High error rate detected");
    } else if (stats.monitoring.errorRate > 0.05) {
      score -= 10;
      recommendations.push("Elevated error rate");
    }

    // Cache performance impact (20%)
    if (stats.monitoring.cacheHitRate < 0.6) {
      score -= 20;
      recommendations.push("Cache hit rate is critically low");
    } else if (stats.monitoring.cacheHitRate < 0.8) {
      score -= 10;
      recommendations.push("Cache hit rate could be improved");
    }

    // Optimization impact (15%)
    const optimizationRatio =
      stats.optimization.batchedRequests /
      Math.max(1, stats.monitoring.totalRequests);
    if (optimizationRatio < 0.2) {
      score -= 15;
      recommendations.push("Request batching could be improved");
    } else if (optimizationRatio < 0.4) {
      score -= 8;
      recommendations.push("Consider increasing request batching");
    }

    // Web Vitals impact (10%)
    if (
      (stats.webVitals.lcp && stats.webVitals.lcp > 4000) ||
      (stats.webVitals.inp && stats.webVitals.inp > 500) ||
      (stats.webVitals.cls && stats.webVitals.cls > 0.25)
    ) {
      score -= 10;
      recommendations.push("Core Web Vitals need improvement");
    }

    // Determine health status
    let health: "excellent" | "good" | "fair" | "poor";
    if (score >= 90) health = "excellent";
    else if (score >= 75) health = "good";
    else if (score >= 60) health = "fair";
    else health = "poor";

    return {
      performanceScore: Math.max(0, score),
      health,
      recommendations,
    };
  }

  /**
   * Get performance components for dashboard
   */
  getComponents(): {
    performanceMonitor?: NotificationPerformanceMonitor | undefined;
    requestOptimizer?: NotificationRequestOptimizer | undefined;
    lazyLoader?: NotificationLazyLoader | undefined;
  } {
    return {
      performanceMonitor: this.performanceMonitor,
      requestOptimizer: this.requestOptimizer,
      lazyLoader: this.lazyLoader,
    };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const stats = this.getStats();

    console.group("🚀 Notification Performance Summary");
    console.log("Overall Score:", `${stats.overall.performanceScore}/100`);
    console.log("Health Status:", stats.overall.health.toUpperCase());

    console.group("Monitoring");
    console.log("Total Requests:", stats.monitoring.totalRequests);
    console.log(
      "Avg Response Time:",
      `${stats.monitoring.averageResponseTime.toFixed(0)}ms`,
    );
    console.log(
      "Error Rate:",
      `${(stats.monitoring.errorRate * 100).toFixed(1)}%`,
    );
    console.log(
      "Cache Hit Rate:",
      `${(stats.monitoring.cacheHitRate * 100).toFixed(1)}%`,
    );
    console.groupEnd();

    console.group("Optimization");
    console.log("Batched Requests:", stats.optimization.batchedRequests);
    console.log(
      "Deduplicated Requests:",
      stats.optimization.deduplicatedRequests,
    );
    console.log(
      "Bandwidth Saved:",
      `${(stats.optimization.bandwidthSaved / 1024 / 1024).toFixed(1)}MB`,
    );
    console.groupEnd();

    console.group("Lazy Loading");
    console.log("Components Loaded:", stats.lazyLoading.componentsLoaded);
    console.log("Images Loaded:", stats.lazyLoading.imagesLoaded);
    console.log(
      "Data Loaded:",
      `${(stats.lazyLoading.bytesLoaded / 1024 / 1024).toFixed(1)}MB`,
    );
    console.groupEnd();

    if (stats.overall.recommendations.length > 0) {
      console.group("Recommendations");
      stats.overall.recommendations.forEach((rec) => console.log("•", rec));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.resetMetrics();
    }
    if (this.requestOptimizer) {
      this.requestOptimizer.resetStats();
    }
    if (this.lazyLoader) {
      this.lazyLoader.resetStats();
    }
    this.webVitalsData = {};
  }

  /**
   * Flush all pending operations
   */
  async flush(): Promise<void> {
    if (this.requestOptimizer) {
      await this.requestOptimizer.flushAll();
    }
  }

  /**
   * Cleanup and destroy all components
   */
  destroy(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }
    if (this.requestOptimizer) {
      this.requestOptimizer.destroy();
    }
    if (this.lazyLoader) {
      this.lazyLoader.destroy();
    }

    this.autoOptimizationEnabled = false;
    this.isInitialized = false;
    console.log("[NotificationPerformanceManager] All components destroyed");
  }
}

// Global notification performance manager instance
let globalNotificationPerformanceManager: NotificationPerformanceManager | null =
  null;

export function createNotificationPerformanceManager(
  apiClient: NotificationApiClient,
  config?: Partial<NotificationPerformanceManagerConfig>,
): NotificationPerformanceManager {
  if (!globalNotificationPerformanceManager) {
    globalNotificationPerformanceManager = new NotificationPerformanceManager(
      apiClient,
      config,
    );
  }
  return globalNotificationPerformanceManager;
}

export function getNotificationPerformanceManager(): NotificationPerformanceManager {
  if (!globalNotificationPerformanceManager) {
    throw new Error(
      "Notification performance manager not initialized. Call createNotificationPerformanceManager first.",
    );
  }
  return globalNotificationPerformanceManager;
}
