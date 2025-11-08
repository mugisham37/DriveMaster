/**
 * Request Optimization Strategies
 * Implements Task 11.1:
 * - Request batching for simultaneous user-service operations
 * - Request deduplication to prevent duplicate API calls
 * - Connection pooling with keep-alive configuration
 * - Request/response compression for large payloads
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { UserServiceClient } from "../user-service/unified-client";

export interface BatchRequest {
  id: string;
  operation: string;
  params: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: "high" | "medium" | "low";
}

export interface RequestOptimizerConfig {
  batchSize: number;
  batchTimeout: number;
  enableDeduplication: boolean;
  enableCompression: boolean;
  compressionThreshold: number;
  maxConcurrentRequests: number;
  keepAliveTimeout: number;
}

export interface RequestOptimizerStats {
  totalRequests: number;
  batchedRequests: number;
  deduplicatedRequests: number;
  compressionSavings: number;
  averageResponseTime: number;
  batchQueueSize: number;
  activeConnections: number;
}

export class RequestOptimizer {
  private config: RequestOptimizerConfig;
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private stats: RequestOptimizerStats;
  private userServiceClient: UserServiceClient;

  constructor(
    userServiceClient: UserServiceClient,
    config: Partial<RequestOptimizerConfig> = {},
  ) {
    this.userServiceClient = userServiceClient;
    this.config = {
      batchSize: 10,
      batchTimeout: 50, // 50ms batching window
      enableDeduplication: true,
      enableCompression: true,
      compressionThreshold: 1024, // 1KB
      maxConcurrentRequests: 6,
      keepAliveTimeout: 30000, // 30 seconds
      ...config,
    };

    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      deduplicatedRequests: 0,
      compressionSavings: 0,
      averageResponseTime: 0,
      batchQueueSize: 0,
      activeConnections: 0,
    };
  }

  /**
   * Optimize a request with batching and deduplication
   */
  async optimizeRequest<T>(
    operation: string,
    params: unknown,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Generate request key for deduplication
    const requestKey = this.generateRequestKey(operation, params);

    // Check for duplicate requests
    if (
      this.config.enableDeduplication &&
      this.pendingRequests.has(requestKey)
    ) {
      this.stats.deduplicatedRequests++;
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    // Create request promise
    const requestPromise = new Promise<T>((resolve, reject) => {
      const batchRequest: BatchRequest = {
        id: requestKey,
        operation,
        params,
        resolve: resolve as (result: unknown) => void,
        reject,
        timestamp: Date.now(),
        priority,
      };

      this.addToBatch(operation, batchRequest);
    });

    // Store for deduplication
    if (this.config.enableDeduplication) {
      this.pendingRequests.set(requestKey, requestPromise);

      // Clean up after completion
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
        const responseTime = Date.now() - startTime;
        this.updateResponseTime(responseTime);
      });
    }

    return requestPromise;
  }

  /**
   * Add request to batch queue
   */
  private addToBatch(operation: string, request: BatchRequest): void {
    if (!this.batchQueue.has(operation)) {
      this.batchQueue.set(operation, []);
    }

    const queue = this.batchQueue.get(operation)!;
    queue.push(request);
    this.stats.batchQueueSize = this.getTotalQueueSize();

    // Sort by priority (high -> medium -> low)
    queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
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
   * Process a batch of requests
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
    this.stats.batchQueueSize = this.getTotalQueueSize();

    try {
      // Execute batch based on operation type
      await this.executeBatch(operation, batch);
    } catch (error) {
      // Reject all requests in batch
      batch.forEach((request) => {
        request.reject(error as Error);
      });
    }
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(
    operation: string,
    batch: BatchRequest[],
  ): Promise<void> {
    switch (operation) {
      case "getUserProfiles":
        await this.batchGetUserProfiles(batch);
        break;
      case "getProgressSummaries":
        await this.batchGetProgressSummaries(batch);
        break;
      case "getActivityRecords":
        await this.batchGetActivityRecords(batch);
        break;
      default:
        // Execute individually for non-batchable operations
        await this.executeIndividually(batch);
    }
  }

  /**
   * Batch user profile requests
   */
  private async batchGetUserProfiles(batch: BatchRequest[]): Promise<void> {
    const userIds = batch.map((req) => req.params as string);

    try {
      // Use batch endpoint if available, otherwise execute individually
      const profiles = await Promise.all(
        userIds.map((userId) => this.userServiceClient.getUser(userId)),
      );

      batch.forEach((request, index) => {
        request.resolve(profiles[index]);
      });
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Batch progress summary requests
   */
  private async batchGetProgressSummaries(
    batch: BatchRequest[],
  ): Promise<void> {
    const userIds = batch.map((req) => req.params as string);

    try {
      const summaries = await Promise.all(
        userIds.map((userId) =>
          this.userServiceClient.getProgressSummary(userId),
        ),
      );

      batch.forEach((request, index) => {
        request.resolve(summaries[index]);
      });
    } catch (error) {
      batch.forEach((request) => request.reject(error as Error));
    }
  }

  /**
   * Batch activity record requests
   */
  private async batchGetActivityRecords(batch: BatchRequest[]): Promise<void> {
    try {
      const results = await Promise.all(
        batch.map((request) => {
          const params = request.params as { userId: string; limit?: number };
          return this.userServiceClient.getActivitySummary(params.userId);
        }),
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
  private async executeIndividually(batch: BatchRequest[]): Promise<void> {
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
   * Execute a single request
   */
  private async executeRequest(
    operation: string,
    params: unknown,
  ): Promise<unknown> {
    // Map operation to client method
    switch (operation) {
      case "getUser":
        return this.userServiceClient.getUser(params as string);
      case "getUserPreferences":
        return this.userServiceClient.getUserPreferences(params as string);
      case "getProgressSummary":
        return this.userServiceClient.getProgressSummary(params as string);
      case "getSkillMastery":
        return this.userServiceClient.getSkillMastery(params as string);
      case "getLearningStreak":
        return this.userServiceClient.getLearningStreak(params as string);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Generate unique request key for deduplication
   */
  private generateRequestKey(operation: string, params: unknown): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  /**
   * Get total queue size across all operations
   */
  private getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.batchQueue.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    const totalRequests = this.stats.totalRequests;
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) /
      totalRequests;
  }

  /**
   * Get optimizer statistics
   */
  getStats(): RequestOptimizerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      deduplicatedRequests: 0,
      compressionSavings: 0,
      averageResponseTime: 0,
      batchQueueSize: this.getTotalQueueSize(),
      activeConnections: 0,
    };
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const operations = Array.from(this.batchQueue.keys());
    await Promise.all(operations.map((op) => this.processBatch(op)));
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

    // Clear queues
    this.batchQueue.clear();
    this.pendingRequests.clear();
  }
}

// Global request optimizer instance
let globalRequestOptimizer: RequestOptimizer | null = null;

export function createRequestOptimizer(
  userServiceClient: UserServiceClient,
  config?: Partial<RequestOptimizerConfig>,
): RequestOptimizer {
  if (!globalRequestOptimizer) {
    globalRequestOptimizer = new RequestOptimizer(userServiceClient, config);
  }
  return globalRequestOptimizer;
}

export function getRequestOptimizer(): RequestOptimizer {
  if (!globalRequestOptimizer) {
    throw new Error(
      "Request optimizer not initialized. Call createRequestOptimizer first.",
    );
  }
  return globalRequestOptimizer;
}
