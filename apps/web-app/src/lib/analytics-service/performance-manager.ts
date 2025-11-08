// ============================================================================
// Performance Manager - Integrates all performance optimization components
// ============================================================================

import { QueryClient } from "@tanstack/react-query";
import { RequestBatcher, type BatchConfig } from "./request-batcher";
import { IntelligentCache, type CacheWarmingConfig } from "./intelligent-cache";
import {
  AnalyticsWorkerManager,
  type WorkerManagerConfig,
} from "./worker-manager";
import type { DataRecord } from "../../workers/analytics-data-processor";

export interface PerformanceManagerConfig {
  batcher?: Partial<BatchConfig>;
  cache?: Partial<CacheWarmingConfig>;
  worker?: Partial<WorkerManagerConfig>;
  enableOptimizations?: {
    requestBatching: boolean;
    intelligentCaching: boolean;
    webWorkers: boolean;
    progressiveLoading: boolean;
  };
}

export class AnalyticsPerformanceManager {
  private requestBatcher: RequestBatcher;
  private intelligentCache: IntelligentCache;
  private workerManager: AnalyticsWorkerManager;
  private config: Required<PerformanceManagerConfig>;

  constructor(queryClient: QueryClient, config: PerformanceManagerConfig = {}) {
    this.config = {
      batcher: {
        maxBatchSize: 10,
        maxWaitTime: 100,
        enableBatching: true,
        priorityThresholds: {
          high: 50,
          normal: 100,
          low: 200,
        },
        ...config.batcher,
      },
      cache: {
        enabled: true,
        strategies: [],
        maxConcurrentWarmups: 3,
        warmupDelay: 1000,
        backgroundRefreshInterval: 300000,
        ...config.cache,
      },
      worker: {
        maxWorkers: Math.min(4, navigator.hardwareConcurrency || 2),
        workerTimeout: 30000,
        enableFallback: true,
        chunkSize: 1000,
        ...config.worker,
      },
      enableOptimizations: {
        requestBatching: true,
        intelligentCaching: true,
        webWorkers: true,
        progressiveLoading: true,
        ...config.enableOptimizations,
      },
    };

    // Initialize components
    this.requestBatcher = new RequestBatcher(this.config.batcher);
    this.intelligentCache = new IntelligentCache(
      queryClient,
      this.config.cache,
    );
    this.workerManager = new AnalyticsWorkerManager(this.config.worker);

    // Set up request batcher to use analytics client
    this.setupRequestBatcher();
  }

  /**
   * Set up request batcher with analytics client integration
   */
  private setupRequestBatcher(): void {
    // Override the executeSingleRequest method to use the analytics client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.requestBatcher as any).executeSingleRequest = async (
      endpoint: string,
      params?: Record<string, unknown>,
    ) => {
      const { analyticsServiceClient } = await import("./client");

      // Map endpoints to client methods
      switch (endpoint) {
        case "/api/v1/analytics/engagement":
          return analyticsServiceClient.getEngagementMetrics(params);
        case "/api/v1/analytics/progress":
          return analyticsServiceClient.getProgressMetrics(params);
        case "/api/v1/analytics/content":
          return analyticsServiceClient.getContentMetrics(params);
        case "/api/v1/analytics/system":
          return analyticsServiceClient.getSystemMetrics(params);
        default:
          throw new Error(`Unsupported endpoint: ${endpoint}`);
      }
    };
  }

  /**
   * Batch multiple analytics requests
   */
  async batchRequests<T = unknown>(
    requests: Array<{
      endpoint: string;
      params?: Record<string, unknown>;
      priority?: "high" | "normal" | "low";
    }>,
  ): Promise<T[]> {
    if (!this.config.enableOptimizations.requestBatching) {
      // Execute requests individually if batching is disabled
      const { analyticsServiceClient } = await import("./client");
      return Promise.all(
        requests.map((req) => {
          switch (req.endpoint) {
            case "/api/v1/analytics/engagement":
              return analyticsServiceClient.getEngagementMetrics(req.params);
            case "/api/v1/analytics/progress":
              return analyticsServiceClient.getProgressMetrics(req.params);
            case "/api/v1/analytics/content":
              return analyticsServiceClient.getContentMetrics(req.params);
            case "/api/v1/analytics/system":
              return analyticsServiceClient.getSystemMetrics(req.params);
            default:
              throw new Error(`Unsupported endpoint: ${req.endpoint}`);
          }
        }),
      ) as Promise<T[]>;
    }

    return Promise.all(
      requests.map((req) =>
        this.requestBatcher.batchRequest<T>(
          req.endpoint,
          req.params,
          req.priority || "normal",
        ),
      ),
    );
  }

  /**
   * Warm up cache for dashboard initialization
   */
  async warmupDashboardCache(): Promise<void> {
    if (!this.config.enableOptimizations.intelligentCaching) return;

    const criticalKeys = [
      "analytics-engagement-realtime",
      "analytics-dashboard-summary",
      "analytics-system-metrics",
    ];

    await this.intelligentCache.warmupCache(criticalKeys, "dashboard-load");
  }

  /**
   * Process large dataset with Web Workers
   */
  async processLargeDataset<TOptions = Record<string, unknown>>(
    data: unknown[],
    operation: "csv-export" | "chart-data" | "data-aggregation",
    options: TOptions,
    onProgress?: (progress: number) => void,
  ): Promise<unknown> {
    if (!this.config.enableOptimizations.webWorkers) {
      // Fallback to main thread processing
      switch (operation) {
        case "csv-export":
          return this.workerManager.exportToCSV(
            data as DataRecord[],
            options as never,
            {
              priority: "normal",
              ...(onProgress && { onProgress }),
            },
          );
        case "chart-data":
          return this.workerManager.formatChartData(
            data as DataRecord[],
            options as never,
            {
              priority: "normal",
              ...(onProgress && { onProgress }),
            },
          );
        case "data-aggregation":
          return this.workerManager.aggregateData(
            data as DataRecord[],
            options as never,
            {
              priority: "normal",
              ...(onProgress && { onProgress }),
            },
          );
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    }

    // Use Web Workers for processing
    switch (operation) {
      case "csv-export":
        return this.workerManager.exportToCSV(
          data as DataRecord[],
          options as never,
          {
            priority: "normal",
            ...(onProgress && { onProgress }),
          },
        );
      case "chart-data":
        return this.workerManager.formatChartData(
          data as DataRecord[],
          options as never,
          {
            priority: "normal",
            ...(onProgress && { onProgress }),
          },
        );
      case "data-aggregation":
        return this.workerManager.aggregateData(
          data as DataRecord[],
          options as never,
          {
            priority: "normal",
            ...(onProgress && { onProgress }),
          },
        );
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Get cached data with intelligent refresh
   */
  getCachedData(key: string): {
    data: unknown;
    isStale: boolean;
    age: number;
  } | null {
    if (!this.config.enableOptimizations.intelligentCaching) {
      return null;
    }

    return this.intelligentCache.getData(key);
  }

  /**
   * Set data in intelligent cache
   */
  setCachedData(
    key: string,
    data: unknown,
    customStrategy?: Partial<import("./intelligent-cache").CacheStrategy>,
  ): void {
    if (!this.config.enableOptimizations.intelligentCaching) {
      return;
    }

    this.intelligentCache.setData(key, data, customStrategy);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCache(pattern: string): void {
    if (!this.config.enableOptimizations.intelligentCaching) {
      return;
    }

    this.intelligentCache.invalidateByPattern(pattern);
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(): {
    requestBatcher: ReturnType<RequestBatcher["getBatchStats"]>;
    intelligentCache: ReturnType<IntelligentCache["getCacheStats"]>;
    workerManager: ReturnType<AnalyticsWorkerManager["getStats"]>;
    optimizations: PerformanceManagerConfig["enableOptimizations"];
  } {
    return {
      requestBatcher: this.requestBatcher.getBatchStats(),
      intelligentCache: this.intelligentCache.getCacheStats(),
      workerManager: this.workerManager.getStats(),
      optimizations: this.config.enableOptimizations,
    };
  }

  /**
   * Update performance configuration
   */
  updateConfig(newConfig: Partial<PerformanceManagerConfig>): void {
    // Update request batcher config
    if (newConfig.batcher) {
      this.requestBatcher.updateConfig(newConfig.batcher);
    }

    // Update optimization flags
    if (newConfig.enableOptimizations) {
      Object.assign(
        this.config.enableOptimizations,
        newConfig.enableOptimizations,
      );
    }
  }

  /**
   * Optimize for dashboard loading
   */
  async optimizeForDashboard(): Promise<void> {
    // Warm up critical cache entries
    await this.warmupDashboardCache();

    // Pre-batch common dashboard requests
    const dashboardRequests = [
      { endpoint: "/api/v1/analytics/engagement", priority: "high" as const },
      { endpoint: "/api/v1/analytics/system", priority: "high" as const },
      { endpoint: "/api/v1/analytics/progress", priority: "normal" as const },
    ];

    // Start batching these requests
    this.batchRequests(dashboardRequests).catch((error) => {
      console.warn("Dashboard optimization failed:", error);
    });
  }

  /**
   * Optimize for report generation
   */
  async optimizeForReports(): Promise<void> {
    // Ensure Web Workers are ready for heavy processing
    const workerStats = this.workerManager.getStats();

    if (workerStats.totalWorkers === 0) {
      console.warn("No Web Workers available for report generation");
    }

    // Pre-warm historical data cache
    await this.intelligentCache.warmupCache(
      ["analytics-historical-data", "analytics-content-performance"],
      "report-generation",
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.requestBatcher.clear();
    this.intelligentCache.destroy();
    this.workerManager.destroy();
  }
}

// Factory function
export const createAnalyticsPerformanceManager = (
  queryClient: QueryClient,
  config?: PerformanceManagerConfig,
): AnalyticsPerformanceManager => {
  return new AnalyticsPerformanceManager(queryClient, config);
};

// Global instance (to be initialized by the analytics context)
let globalPerformanceManager: AnalyticsPerformanceManager | null = null;

export const initializeGlobalPerformanceManager = (
  queryClient: QueryClient,
  config?: PerformanceManagerConfig,
): void => {
  if (globalPerformanceManager) {
    globalPerformanceManager.destroy();
  }

  globalPerformanceManager = new AnalyticsPerformanceManager(
    queryClient,
    config,
  );
};

export const getGlobalPerformanceManager =
  (): AnalyticsPerformanceManager | null => {
    return globalPerformanceManager;
  };

export const destroyGlobalPerformanceManager = (): void => {
  if (globalPerformanceManager) {
    globalPerformanceManager.destroy();
    globalPerformanceManager = null;
  }
};

export default AnalyticsPerformanceManager;
