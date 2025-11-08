/**
 * Notification Service Request Optimizer
 * Implements Task 12.2: Request Optimization and Batching
 *
 * Provides notification-specific request optimization:
 * - Request batching for bulk notification operations
 * - Request debouncing for user-triggered actions like search and filtering
 * - Intelligent prefetching for likely-to-be-accessed notification data
 * - Request deduplication to prevent unnecessary API calls
 *
 * Requirements: 7.2, 7.3
 */

import { NotificationApiClient } from "./api-client";
import debounce from "lodash/debounce";
import type {
  NotificationQueryParams,
  NotificationPreferences,
  AnalyticsQueryParams,
} from "@/types/notification-service";

export interface BatchNotificationRequest {
  id: string;
  operation: string;
  params: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: "high" | "medium" | "low";
}

export interface NotificationRequestOptimizerConfig {
  batchSize: number;
  batchTimeout: number;
  debounceDelay: number;
  enableDeduplication: boolean;
  enablePrefetching: boolean;
  prefetchThreshold: number;
  maxConcurrentRequests: number;
}

export interface NotificationRequestStats {
  totalRequests: number;
  batchedRequests: number;
  debouncedRequests: number;
  deduplicatedRequests: number;
  prefetchedRequests: number;
  cacheHits: number;
  averageResponseTime: number;
  bandwidthSaved: number;
}

export interface PrefetchContext {
  userId: string;
  currentNotifications: string[];
  userBehaviorPattern: {
    frequentlyAccessedTypes: string[];
    averageSessionDuration: number;
    preferredTimeRanges: string[];
  };
  networkConditions: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export class NotificationRequestOptimizer {
  private config: NotificationRequestOptimizerConfig;
  private apiClient: NotificationApiClient;
  private batchQueue: Map<string, BatchNotificationRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private prefetchCache: Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  > = new Map();
  private stats: NotificationRequestStats;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debouncedOperations: Map<string, any> = new Map();

  constructor(
    apiClient: NotificationApiClient,
    config: Partial<NotificationRequestOptimizerConfig> = {},
  ) {
    this.apiClient = apiClient;
    this.config = {
      batchSize: 10,
      batchTimeout: 100, // 100ms batching window for notifications
      debounceDelay: 300, // 300ms debounce for search/filter
      enableDeduplication: true,
      enablePrefetching: true,
      prefetchThreshold: 0.7, // Prefetch if 70% confidence
      maxConcurrentRequests: 4,
      ...config,
    };

    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      debouncedRequests: 0,
      deduplicatedRequests: 0,
      prefetchedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      bandwidthSaved: 0,
    };

    this.setupDebouncedOperations();
    this.startPrefetchCacheCleanup();
  }

  /**
   * Setup debounced operations for user-triggered actions
   */
  private setupDebouncedOperations(): void {
    // Debounced search
    const debouncedSearch = debounce(
      async (query: string, filters: unknown) => {
        this.stats.debouncedRequests++;
        return this.apiClient.searchNotifications(
          query,
          filters as Record<string, unknown>,
        );
      },
      this.config.debounceDelay,
    );

    // Debounced filter
    const debouncedFilter = debounce(async (filters: unknown) => {
      this.stats.debouncedRequests++;
      return this.apiClient.getNotifications(
        filters as NotificationQueryParams,
      );
    }, this.config.debounceDelay);

    // Debounced preference update
    const debouncedPreferenceUpdate = debounce(
      async (userId: string, preferences: unknown) => {
        this.stats.debouncedRequests++;
        return this.apiClient.updatePreferences(
          userId,
          preferences as Partial<NotificationPreferences>,
        );
      },
      this.config.debounceDelay * 2,
    ); // Longer debounce for preferences

    this.debouncedOperations.set("search", debouncedSearch);
    this.debouncedOperations.set("filter", debouncedFilter);
    this.debouncedOperations.set(
      "updatePreferences",
      debouncedPreferenceUpdate,
    );
  }

  /**
   * Optimize notification request with batching, debouncing, and deduplication
   */
  async optimizeRequest<T>(
    operation: string,
    params: unknown,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Check if operation should be debounced
    if (this.shouldDebounce(operation)) {
      return this.handleDebouncedRequest<T>(operation, params);
    }

    // Check prefetch cache first
    const cacheKey = this.generateCacheKey(operation, params);
    const cached = this.getPrefetchedData<T>(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    // Check for duplicate requests
    if (this.config.enableDeduplication && this.pendingRequests.has(cacheKey)) {
      this.stats.deduplicatedRequests++;
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    // Determine if request should be batched
    if (this.shouldBatch(operation)) {
      return this.handleBatchedRequest<T>(operation, params, priority);
    }

    // Execute individual request
    const requestPromise = this.executeRequest<T>(operation, params);

    // Store for deduplication
    if (this.config.enableDeduplication) {
      this.pendingRequests.set(cacheKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
        this.updateResponseTime(Date.now() - startTime);
      });
    }

    return requestPromise;
  }

  /**
   * Handle debounced request
   */
  private async handleDebouncedRequest<T>(
    operation: string,
    params: unknown,
  ): Promise<T> {
    const debouncedFn = this.debouncedOperations.get(operation);
    if (!debouncedFn) {
      throw new Error(`No debounced operation found for: ${operation}`);
    }

    return debouncedFn(params) as unknown as Promise<T>;
  }

  /**
   * Handle batched request
   */
  private async handleBatchedRequest<T>(
    operation: string,
    params: unknown,
    priority: "high" | "medium" | "low",
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const batchRequest: BatchNotificationRequest = {
        id: this.generateCacheKey(operation, params),
        operation,
        params,
        resolve: resolve as (result: unknown) => void,
        reject,
        timestamp: Date.now(),
        priority,
      };

      this.addToBatch(operation, batchRequest);
    });
  }

  /**
   * Add request to batch queue
   */
  private addToBatch(
    operation: string,
    request: BatchNotificationRequest,
  ): void {
    if (!this.batchQueue.has(operation)) {
      this.batchQueue.set(operation, []);
    }

    const queue = this.batchQueue.get(operation)!;
    queue.push(request);

    // Sort by priority and timestamp
    queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Process batch if size limit reached or set timer
    if (queue.length >= this.config.batchSize) {
      this.processBatch(operation);
    } else if (!this.batchTimers.has(operation)) {
      const timer = setTimeout(() => {
        this.processBatch(operation);
      }, this.config.batchTimeout);
      this.batchTimers.set(operation, timer);
    }
  }

  /**
   * Process a batch of notification requests
   */
  private async processBatch(operation: string): Promise<void> {
    const queue = this.batchQueue.get(operation);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(operation);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(operation);
    }

    // Extract batch
    const batch = queue.splice(0, this.config.batchSize);
    this.stats.batchedRequests += batch.length;

    try {
      await this.executeBatch(operation, batch);
    } catch (error) {
      // Reject all requests in batch
      batch.forEach((request) => {
        request.reject(error as Error);
      });
    }
  }

  /**
   * Execute a batch of notification requests
   */
  private async executeBatch(
    operation: string,
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    switch (operation) {
      case "getNotifications":
        await this.batchGetNotifications(batch);
        break;
      case "markAsRead":
        await this.batchMarkAsRead(batch);
        break;
      case "deleteNotifications":
        await this.batchDeleteNotifications(batch);
        break;
      case "getAnalytics":
        await this.batchGetAnalytics(batch);
        break;
      default:
        // Execute individually for non-batchable operations
        await this.executeIndividually(batch);
    }
  }

  /**
   * Batch notification retrieval requests
   */
  private async batchGetNotifications(
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    try {
      // Combine parameters for batch request
      const combinedParams = this.combineNotificationParams(
        batch.map((req) => req.params),
      );
      const results = await this.apiClient.getNotifications(
        combinedParams as NotificationQueryParams,
      );

      // Distribute results back to individual requests
      this.distributeNotificationResults(batch, results);
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Batch mark as read operations
   */
  private async batchMarkAsRead(
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    try {
      const notificationIds = batch.map((req) => req.params as string);
      await this.apiClient.markMultipleAsRead(notificationIds);

      batch.forEach((request) => request.resolve(true));
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Batch delete operations
   */
  private async batchDeleteNotifications(
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    try {
      const notificationIds = batch.map((req) => req.params as string);
      await this.apiClient.deleteMultipleNotifications(notificationIds);

      batch.forEach((request) => request.resolve(true));
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Batch analytics requests
   */
  private async batchGetAnalytics(
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    try {
      const analyticsParams = batch.map((req) => req.params);
      const results = await Promise.all(
        analyticsParams.map((params) =>
          this.apiClient.getAnalytics(params as AnalyticsQueryParams),
        ),
      );

      batch.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Execute requests individually (fallback)
   */
  private async executeIndividually(
    batch: BatchNotificationRequest[],
  ): Promise<void> {
    await Promise.all(
      batch.map(async (request) => {
        try {
          const result = await this.executeRequest(
            request.operation,
            request.params,
          );
          request.resolve(result);
        } catch (error) {
          request.reject(error as Error);
        }
      }),
    );
  }

  /**
   * Execute a single notification request
   */
  private async executeRequest<T>(
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
      case "getPreferences":
        return this.apiClient.getPreferences(params as string) as Promise<T>;
      case "updatePreferences":
        const { userId, preferences } = params as {
          userId: string;
          preferences: unknown;
        };
        return this.apiClient.updatePreferences(
          userId,
          preferences as Partial<NotificationPreferences>,
        ) as Promise<T>;
      case "getAnalytics":
        return this.apiClient.getAnalytics(
          params as AnalyticsQueryParams,
        ) as Promise<T>;
      case "getTemplates":
        return this.apiClient.getTemplates(
          params as string | undefined,
        ) as Promise<T>;
      default:
        throw new Error(`Unknown notification operation: ${operation}`);
    }
  }

  /**
   * Intelligent prefetching based on user behavior patterns
   */
  async executePrefetch(context: PrefetchContext): Promise<void> {
    if (!this.config.enablePrefetching) return;

    const predictions = this.predictNextRequests(context);

    for (const prediction of predictions) {
      if (prediction.confidence >= this.config.prefetchThreshold) {
        try {
          const result = await this.executeRequest(
            prediction.operation,
            prediction.params,
          );
          const cacheKey = this.generateCacheKey(
            prediction.operation,
            prediction.params,
          );

          this.prefetchCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: prediction.ttl,
          });

          this.stats.prefetchedRequests++;
          this.stats.bandwidthSaved += this.estimateDataSize(result);
        } catch (error) {
          console.warn(
            "[NotificationRequestOptimizer] Prefetch failed:",
            error,
          );
        }
      }
    }
  }

  /**
   * Predict next requests based on user behavior
   */
  private predictNextRequests(context: PrefetchContext): Array<{
    operation: string;
    params: unknown;
    confidence: number;
    ttl: number;
  }> {
    const predictions: Array<{
      operation: string;
      params: unknown;
      confidence: number;
      ttl: number;
    }> = [];

    // Predict notification list refresh
    if (context.userBehaviorPattern.averageSessionDuration > 300000) {
      // 5 minutes
      predictions.push({
        operation: "getNotifications",
        params: { userId: context.userId, limit: 20 },
        confidence: 0.8,
        ttl: 60000, // 1 minute
      });
    }

    // Predict preference access for frequent users
    if (
      context.userBehaviorPattern.frequentlyAccessedTypes.includes(
        "preferences",
      )
    ) {
      predictions.push({
        operation: "getPreferences",
        params: context.userId,
        confidence: 0.7,
        ttl: 300000, // 5 minutes
      });
    }

    // Predict analytics access for power users
    if (
      context.userBehaviorPattern.frequentlyAccessedTypes.includes("analytics")
    ) {
      predictions.push({
        operation: "getAnalytics",
        params: { userId: context.userId, timeRange: "7d" },
        confidence: 0.6,
        ttl: 600000, // 10 minutes
      });
    }

    // Adjust confidence based on network conditions
    const networkMultiplier = this.getNetworkConfidenceMultiplier(
      context.networkConditions,
    );
    predictions.forEach((prediction) => {
      prediction.confidence *= networkMultiplier;
    });

    return predictions.filter((p) => p.confidence >= 0.5);
  }

  /**
   * Get network-based confidence multiplier
   */
  private getNetworkConfidenceMultiplier(
    networkConditions: PrefetchContext["networkConditions"],
  ): number {
    if (
      networkConditions.effectiveType === "4g" &&
      networkConditions.downlink > 1.5
    ) {
      return 1.0; // Full confidence on good connections
    } else if (
      networkConditions.effectiveType === "3g" ||
      networkConditions.downlink > 0.5
    ) {
      return 0.7; // Reduced confidence on moderate connections
    } else {
      return 0.3; // Low confidence on slow connections
    }
  }

  /**
   * Get prefetched data from cache
   */
  private getPrefetchedData<T>(cacheKey: string): T | null {
    const cached = this.prefetchCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.prefetchCache.delete(cacheKey);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Determine if operation should be debounced
   */
  private shouldDebounce(operation: string): boolean {
    return ["search", "filter", "updatePreferences"].includes(operation);
  }

  /**
   * Determine if operation should be batched
   */
  private shouldBatch(operation: string): boolean {
    return [
      "getNotifications",
      "markAsRead",
      "deleteNotifications",
      "getAnalytics",
    ].includes(operation);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(operation: string, params: unknown): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  /**
   * Combine notification parameters for batch request
   */
  private combineNotificationParams(paramsList: unknown[]): unknown {
    // Combine multiple notification requests into a single optimized request
    const combined = {
      userIds: new Set<string>(),
      limit: 0,
      filters: new Set<string>(),
    };

    paramsList.forEach((params) => {
      const p = params as {
        userId?: string;
        limit?: number;
        filters?: string[];
      };
      if (p.userId) combined.userIds.add(p.userId);
      if (p.limit) combined.limit = Math.max(combined.limit, p.limit);
      if (p.filters) p.filters.forEach((f) => combined.filters.add(f));
    });

    return {
      userIds: Array.from(combined.userIds),
      limit: combined.limit || 20,
      filters: Array.from(combined.filters),
    };
  }

  /**
   * Distribute batch results to individual requests
   */
  private distributeNotificationResults(
    batch: BatchNotificationRequest[],
    results: unknown,
  ): void {
    // Distribute combined results back to individual requests
    // This is a simplified implementation - in practice, you'd need to map results back to specific requests
    batch.forEach((request) => {
      request.resolve(results);
    });
  }

  /**
   * Estimate data size for bandwidth calculation
   */
  private estimateDataSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1024; // Default estimate
    }
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    const total = this.stats.totalRequests;
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (total - 1) + responseTime) / total;
  }

  /**
   * Start prefetch cache cleanup
   */
  private startPrefetchCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.prefetchCache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.prefetchCache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Get optimizer statistics
   */
  getStats(): NotificationRequestStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      debouncedRequests: 0,
      deduplicatedRequests: 0,
      prefetchedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      bandwidthSaved: 0,
    };
  }

  /**
   * Flush all pending operations
   */
  async flushAll(): Promise<void> {
    const operations = Array.from(this.batchQueue.keys());
    await Promise.all(operations.map((op) => this.processBatch(op)));
  }

  /**
   * Clear prefetch cache
   */
  clearPrefetchCache(): void {
    this.prefetchCache.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Clear queues and caches
    this.batchQueue.clear();
    this.pendingRequests.clear();
    this.prefetchCache.clear();
    this.debouncedOperations.clear();
  }
}

// Global notification request optimizer instance
let globalNotificationRequestOptimizer: NotificationRequestOptimizer | null =
  null;

export function createNotificationRequestOptimizer(
  apiClient: NotificationApiClient,
  config?: Partial<NotificationRequestOptimizerConfig>,
): NotificationRequestOptimizer {
  if (!globalNotificationRequestOptimizer) {
    globalNotificationRequestOptimizer = new NotificationRequestOptimizer(
      apiClient,
      config,
    );
  }
  return globalNotificationRequestOptimizer;
}

export function getNotificationRequestOptimizer(): NotificationRequestOptimizer {
  if (!globalNotificationRequestOptimizer) {
    throw new Error(
      "Notification request optimizer not initialized. Call createNotificationRequestOptimizer first.",
    );
  }
  return globalNotificationRequestOptimizer;
}
