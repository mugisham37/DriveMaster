/**
 * Performance Manager
 * Orchestrates all performance optimization and monitoring components
 * Implements comprehensive Task 11 integration
 */

import { UserServiceClient } from "../user-service/unified-client";
import { QueryClient } from "@tanstack/react-query";
import { RequestOptimizer, createRequestOptimizer } from "./request-optimizer";
import {
  UserServicePerformanceMonitor,
  createPerformanceMonitor,
} from "./user-service-monitor";
import {
  IntelligentPrefetcher,
  createIntelligentPrefetcher,
} from "./intelligent-prefetcher";
import { reportWebVitals } from "./web-vitals";

export interface PerformanceManagerConfig {
  enableRequestOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  enableIntelligentPrefetching: boolean;
  enableWebVitalsTracking: boolean;
  requestOptimizer?: {
    batchSize?: number;
    batchTimeout?: number;
    enableDeduplication?: boolean;
    enableCompression?: boolean;
  };
  performanceMonitor?: {
    responseTimeThresholds?: {
      p95Warning?: number;
      p95Critical?: number;
    };
    errorRateThresholds?: {
      warning?: number;
      critical?: number;
    };
  };
}

export interface PerformanceManagerStats {
  requestOptimization: {
    totalRequests: number;
    batchedRequests: number;
    deduplicatedRequests: number;
    averageResponseTime: number;
  };
  performanceMonitoring: {
    p95ResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  intelligentPrefetching: {
    totalPrefetches: number;
    successfulPrefetches: number;
    cacheHits: number;
    dataSaved: number;
  };
  webVitals: {
    lcp?: number;
    inp?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
}

export class PerformanceManager {
  private userServiceClient: UserServiceClient;
  private queryClient: QueryClient;
  private config: PerformanceManagerConfig;
  private requestOptimizer?: RequestOptimizer;
  private performanceMonitor?: UserServicePerformanceMonitor;
  private intelligentPrefetcher?: IntelligentPrefetcher;
  private webVitalsData: { [key: string]: number } = {};
  private isInitialized: boolean = false;

  constructor(
    userServiceClient: UserServiceClient,
    queryClient: QueryClient,
    config: Partial<PerformanceManagerConfig> = {},
  ) {
    this.userServiceClient = userServiceClient;
    this.queryClient = queryClient;
    this.config = {
      enableRequestOptimization: true,
      enablePerformanceMonitoring: true,
      enableIntelligentPrefetching: true,
      enableWebVitalsTracking: true,
      ...config,
    };
  }

  /**
   * Initialize all performance components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize request optimizer
      if (this.config.enableRequestOptimization) {
        this.requestOptimizer = createRequestOptimizer(
          this.userServiceClient,
          this.config.requestOptimizer,
        );
        console.log("[PerformanceManager] Request optimizer initialized");
      }

      // Initialize performance monitor
      if (this.config.enablePerformanceMonitoring) {
        const monitorConfig = this.config.performanceMonitor
          ? {
              responseTime: {
                p95Warning:
                  this.config.performanceMonitor.responseTimeThresholds
                    ?.p95Warning || 1000,
                p95Critical:
                  this.config.performanceMonitor.responseTimeThresholds
                    ?.p95Critical || 3000,
                averageWarning: 500,
                averageCritical: 1500,
              },
              errorRate: {
                warning:
                  this.config.performanceMonitor.errorRateThresholds?.warning ||
                  0.05,
                critical:
                  this.config.performanceMonitor.errorRateThresholds
                    ?.critical || 0.15,
              },
              cacheHitRate: {
                warning: 0.8,
                critical: 0.6,
              },
              memoryUsage: {
                warning: 100 * 1024 * 1024,
                critical: 200 * 1024 * 1024,
              },
            }
          : undefined;

        this.performanceMonitor = createPerformanceMonitor(monitorConfig);
        console.log("[PerformanceManager] Performance monitor initialized");
      }

      // Initialize intelligent prefetcher
      if (this.config.enableIntelligentPrefetching) {
        this.intelligentPrefetcher = createIntelligentPrefetcher(
          this.userServiceClient,
          this.queryClient,
        );
        console.log("[PerformanceManager] Intelligent prefetcher initialized");
      }

      // Initialize web vitals tracking
      if (this.config.enableWebVitalsTracking) {
        this.setupWebVitalsTracking();
        console.log("[PerformanceManager] Web vitals tracking initialized");
      }

      this.isInitialized = true;
      console.log(
        "[PerformanceManager] All performance components initialized successfully",
      );
    } catch (error) {
      console.error("[PerformanceManager] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Setup web vitals tracking
   */
  private setupWebVitalsTracking(): void {
    reportWebVitals((metric) => {
      this.webVitalsData[metric.name] = metric.value;

      // Send to analytics (stub for now - implement with your analytics provider)
      if (process.env.NODE_ENV === "production") {
        // Example: analytics.track('web_vital', { name: metric.name, value: metric.value })
        console.log("[Analytics] Web Vital:", metric.name, metric.value);
      }

      // Log performance issues
      if (metric.name === "LCP" && metric.value > 2500) {
        console.warn("[PerformanceManager] Poor LCP detected:", metric.value);
      }
      if (metric.name === "INP" && metric.value > 200) {
        console.warn("[PerformanceManager] Poor INP detected:", metric.value);
      }
      if (metric.name === "CLS" && metric.value > 0.1) {
        console.warn("[PerformanceManager] Poor CLS detected:", metric.value);
      }
    });
  }

  /**
   * Optimize a user service request
   */
  async optimizeRequest<T>(
    operation: string,
    params: unknown,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<T> {
    if (!this.requestOptimizer) {
      throw new Error("Request optimizer not initialized");
    }

    const startTime = Date.now();

    try {
      const result = await this.requestOptimizer.optimizeRequest<T>(
        operation,
        params,
        priority,
      );

      // Record successful request
      if (this.performanceMonitor) {
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordRequest(operation, responseTime, true);
      }

      return result;
    } catch (error) {
      // Record failed request
      if (this.performanceMonitor) {
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordRequest(
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
   * Execute intelligent prefetching
   */
  async executePrefetch(
    trigger: "navigation" | "idle" | "interaction" | "time",
    context: {
      userId: string;
      currentRoute: string;
      navigationHistory: string[];
      userPreferences?: {
        dataSaver?: boolean;
        prefetchEnabled?: boolean;
      };
    },
  ): Promise<void> {
    if (!this.intelligentPrefetcher) return;

    const prefetchContext = {
      ...context,
      networkConditions: this.intelligentPrefetcher.getNetworkConditions(),
      deviceCapabilities: this.intelligentPrefetcher.getDeviceCapabilities(),
      userPreferences: {
        dataSaver: false,
        prefetchEnabled: true,
        ...context.userPreferences,
      },
    };

    await this.intelligentPrefetcher.executePrefetch(trigger, prefetchContext);
  }

  /**
   * Record navigation for pattern learning
   */
  recordNavigation(from: string, to: string, timeSpent: number): void {
    if (this.intelligentPrefetcher) {
      this.intelligentPrefetcher.recordNavigation(from, to, timeSpent);
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
    if (this.performanceMonitor) {
      this.performanceMonitor.updateCacheMetrics(
        hits,
        misses,
        memoryUsage,
        cacheSize,
        evictions,
      );
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): PerformanceManagerStats {
    const stats: PerformanceManagerStats = {
      requestOptimization: {
        totalRequests: 0,
        batchedRequests: 0,
        deduplicatedRequests: 0,
        averageResponseTime: 0,
      },
      performanceMonitoring: {
        p95ResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
      },
      intelligentPrefetching: {
        totalPrefetches: 0,
        successfulPrefetches: 0,
        cacheHits: 0,
        dataSaved: 0,
      },
      webVitals: { ...this.webVitalsData },
    };

    // Collect request optimizer stats
    if (this.requestOptimizer) {
      const optimizerStats = this.requestOptimizer.getStats();
      stats.requestOptimization = {
        totalRequests: optimizerStats.totalRequests,
        batchedRequests: optimizerStats.batchedRequests,
        deduplicatedRequests: optimizerStats.deduplicatedRequests,
        averageResponseTime: optimizerStats.averageResponseTime,
      };
    }

    // Collect performance monitor stats
    if (this.performanceMonitor) {
      const monitorStats = this.performanceMonitor.getMetrics();
      stats.performanceMonitoring = {
        p95ResponseTime: monitorStats.responseTime.p95,
        errorRate: monitorStats.throughput.errorRate,
        cacheHitRate: monitorStats.caching.hitRate,
        memoryUsage: monitorStats.memory.heapUsed,
      };
    }

    // Collect prefetcher stats
    if (this.intelligentPrefetcher) {
      const prefetcherStats = this.intelligentPrefetcher.getStats();
      stats.intelligentPrefetching = {
        totalPrefetches: prefetcherStats.totalPrefetches,
        successfulPrefetches: prefetcherStats.successfulPrefetches,
        cacheHits: prefetcherStats.cacheHits,
        dataSaved: prefetcherStats.dataSaved,
      };
    }

    return stats;
  }

  /**
   * Get performance health summary
   */
  getHealthSummary(): {
    overall: "good" | "warning" | "critical";
    components: {
      requestOptimization: "good" | "warning" | "critical";
      performanceMonitoring: "good" | "warning" | "critical";
      intelligentPrefetching: "good" | "warning" | "critical";
      webVitals: "good" | "warning" | "critical";
    };
    recommendations: string[];
  } {
    const components = {
      requestOptimization: "good" as "good" | "warning" | "critical",
      performanceMonitoring: "good" as "good" | "warning" | "critical",
      intelligentPrefetching: "good" as "good" | "warning" | "critical",
      webVitals: "good" as "good" | "warning" | "critical",
    };

    const recommendations: string[] = [];

    // Check request optimization health
    if (this.requestOptimizer) {
      const stats = this.requestOptimizer.getStats();
      if (stats.averageResponseTime > 1000) {
        components.requestOptimization = "warning";
        recommendations.push(
          "Consider increasing batch size or reducing batch timeout",
        );
      }
      if (stats.averageResponseTime > 3000) {
        components.requestOptimization = "critical";
      }
    }

    // Check performance monitoring health
    if (this.performanceMonitor) {
      const summary = this.performanceMonitor.getPerformanceSummary();
      components.performanceMonitoring = summary.health;
      if (summary.recommendations) {
        recommendations.push(...summary.recommendations);
      }
    }

    // Check web vitals health
    if (
      (this.webVitalsData.LCP && this.webVitalsData.LCP > 2500) ||
      (this.webVitalsData.INP && this.webVitalsData.INP > 200) ||
      (this.webVitalsData.CLS && this.webVitalsData.CLS > 0.1)
    ) {
      components.webVitals = "warning";
      recommendations.push(
        "Optimize Core Web Vitals for better user experience",
      );
    }

    // Determine overall health
    const componentValues = Object.values(components);
    let overall: "good" | "warning" | "critical" = "good";

    if (componentValues.includes("critical")) {
      overall = "critical";
    } else if (componentValues.includes("warning")) {
      overall = "warning";
    }

    return { overall, components, recommendations };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const stats = this.getStats();
    const health = this.getHealthSummary();

    console.group("🚀 Performance Manager Summary");
    console.log("Overall Health:", health.overall.toUpperCase());

    console.group("Request Optimization");
    console.log("Total Requests:", stats.requestOptimization.totalRequests);
    console.log("Batched Requests:", stats.requestOptimization.batchedRequests);
    console.log(
      "Deduplicated Requests:",
      stats.requestOptimization.deduplicatedRequests,
    );
    console.log(
      "Average Response Time:",
      `${stats.requestOptimization.averageResponseTime}ms`,
    );
    console.groupEnd();

    console.group("Performance Monitoring");
    console.log(
      "P95 Response Time:",
      `${stats.performanceMonitoring.p95ResponseTime}ms`,
    );
    console.log(
      "Error Rate:",
      `${(stats.performanceMonitoring.errorRate * 100).toFixed(1)}%`,
    );
    console.log(
      "Cache Hit Rate:",
      `${(stats.performanceMonitoring.cacheHitRate * 100).toFixed(1)}%`,
    );
    console.log(
      "Memory Usage:",
      `${(stats.performanceMonitoring.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
    );
    console.groupEnd();

    console.group("Intelligent Prefetching");
    console.log(
      "Total Prefetches:",
      stats.intelligentPrefetching.totalPrefetches,
    );
    console.log(
      "Successful Prefetches:",
      stats.intelligentPrefetching.successfulPrefetches,
    );
    console.log("Cache Hits:", stats.intelligentPrefetching.cacheHits);
    console.groupEnd();

    if (health.recommendations.length > 0) {
      console.group("Recommendations");
      health.recommendations.forEach((rec) => console.log("•", rec));
      console.groupEnd();
    }

    console.groupEnd();
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
   * Reset all statistics
   */
  resetStats(): void {
    if (this.requestOptimizer) {
      this.requestOptimizer.resetStats();
    }
    if (this.performanceMonitor) {
      this.performanceMonitor.resetMetrics();
    }
    this.webVitalsData = {};
  }

  /**
   * Cleanup and destroy all components
   */
  destroy(): void {
    if (this.requestOptimizer) {
      this.requestOptimizer.destroy();
    }
    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }
    if (this.intelligentPrefetcher) {
      this.intelligentPrefetcher.destroy();
    }

    this.isInitialized = false;
    console.log("[PerformanceManager] All components destroyed");
  }
}

// Global performance manager instance
let globalPerformanceManager: PerformanceManager | null = null;

export function createPerformanceManager(
  userServiceClient: UserServiceClient,
  queryClient: QueryClient,
  config?: Partial<PerformanceManagerConfig>,
): PerformanceManager {
  if (!globalPerformanceManager) {
    globalPerformanceManager = new PerformanceManager(
      userServiceClient,
      queryClient,
      config,
    );
  }
  return globalPerformanceManager;
}

export function getPerformanceManager(): PerformanceManager {
  if (!globalPerformanceManager) {
    throw new Error(
      "Performance manager not initialized. Call createPerformanceManager first.",
    );
  }
  return globalPerformanceManager;
}
