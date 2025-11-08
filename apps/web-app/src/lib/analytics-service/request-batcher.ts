// ============================================================================
// Request Batcher for Analytics Service
// ============================================================================

export interface BatchRequest {
  id: string;
  endpoint: string;
  params?: Record<string, unknown> | undefined;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: "high" | "normal" | "low";
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  enableBatching: boolean;
  priorityThresholds: {
    high: number;
    normal: number;
    low: number;
  };
}

export class RequestBatcher {
  private pendingRequests: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchConfig;
  private requestDeduplication: Map<string, Promise<unknown>> = new Map();

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxBatchSize: 10,
      maxWaitTime: 100,
      enableBatching: true,
      priorityThresholds: {
        high: 50, // 50ms max wait for high priority
        normal: 100, // 100ms max wait for normal priority
        low: 200, // 200ms max wait for low priority
      },
      ...config,
    };
  }

  /**
   * Add a request to the batch queue
   */
  async batchRequest<T>(
    endpoint: string,
    params?: Record<string, unknown> | undefined,
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<T> {
    if (!this.config.enableBatching) {
      // If batching is disabled, execute immediately
      return this.executeSingleRequest(endpoint, params) as Promise<T>;
    }

    // Create deduplication key
    const deduplicationKey = this.createDeduplicationKey(endpoint, params);

    // Check if identical request is already in flight
    const existingRequest = this.requestDeduplication.get(deduplicationKey);
    if (existingRequest) {
      return existingRequest as T;
    }

    // Create new request promise
    const requestPromise = new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: this.generateRequestId(),
        endpoint,
        params,
        resolve: resolve as (data: unknown) => void,
        reject,
        timestamp: Date.now(),
        priority,
      };

      this.addToBatch(endpoint, request);
    });

    // Store for deduplication
    this.requestDeduplication.set(deduplicationKey, requestPromise);

    // Clean up deduplication entry when request completes
    requestPromise.finally(() => {
      this.requestDeduplication.delete(deduplicationKey);
    });

    return requestPromise;
  }

  /**
   * Add request to appropriate batch
   */
  private addToBatch(endpoint: string, request: BatchRequest): void {
    const batchKey = this.getBatchKey(endpoint);

    if (!this.pendingRequests.has(batchKey)) {
      this.pendingRequests.set(batchKey, []);
    }

    const batch = this.pendingRequests.get(batchKey)!;
    batch.push(request);

    // Sort batch by priority and timestamp
    batch.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Execute batch if it reaches max size or has high priority items
    const shouldExecuteImmediately =
      batch.length >= this.config.maxBatchSize ||
      batch.some((r) => r.priority === "high");

    if (shouldExecuteImmediately) {
      this.executeBatch(batchKey);
    } else {
      this.scheduleBatchExecution(batchKey, request.priority);
    }
  }

  /**
   * Schedule batch execution with appropriate timing
   */
  private scheduleBatchExecution(
    batchKey: string,
    priority: "high" | "normal" | "low",
  ): void {
    // Clear existing timer if any
    const existingTimer = this.batchTimers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer based on priority
    const waitTime = this.config.priorityThresholds[priority];
    const timer = setTimeout(() => {
      this.executeBatch(batchKey);
    }, waitTime);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear the batch and timer
    this.pendingRequests.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    try {
      // Group requests by endpoint for efficient batching
      const endpointGroups = this.groupRequestsByEndpoint(batch);

      // Execute each endpoint group
      await Promise.all(
        Object.entries(endpointGroups).map(([endpoint, requests]) =>
          this.executeBatchForEndpoint(endpoint, requests),
        ),
      );
    } catch (error) {
      // If batch execution fails, reject all requests
      batch.forEach((request) => {
        request.reject(error as Error);
      });
    }
  }

  /**
   * Group requests by endpoint for efficient batching
   */
  private groupRequestsByEndpoint(
    batch: BatchRequest[],
  ): Record<string, BatchRequest[]> {
    return batch.reduce(
      (groups, request) => {
        if (!groups[request.endpoint]) {
          groups[request.endpoint] = [];
        }
        const endpointGroup = groups[request.endpoint];
        if (endpointGroup) {
          endpointGroup.push(request);
        }
        return groups;
      },
      {} as Record<string, BatchRequest[]>,
    );
  }

  /**
   * Execute batch for a specific endpoint
   */
  private async executeBatchForEndpoint(
    endpoint: string,
    requests: BatchRequest[],
  ): Promise<void> {
    try {
      if (requests.length === 1) {
        // Single request - execute directly
        const request = requests[0];
        if (!request) {
          throw new Error("No request found in batch");
        }
        const result = await this.executeSingleRequest(
          endpoint,
          request.params,
        );
        request.resolve(result);
      } else {
        // Multiple requests - check if endpoint supports batching
        if (this.supportsBatching(endpoint)) {
          await this.executeBatchedRequest(endpoint, requests);
        } else {
          // Execute requests in parallel
          await Promise.all(
            requests.map(async (request) => {
              try {
                const result = await this.executeSingleRequest(
                  endpoint,
                  request.params,
                );
                request.resolve(result);
              } catch (error) {
                request.reject(error as Error);
              }
            }),
          );
        }
      }
    } catch (error) {
      // Reject all requests in this batch
      requests.forEach((request) => {
        request.reject(error as Error);
      });
    }
  }

  /**
   * Execute a batched request for endpoints that support it
   */
  private async executeBatchedRequest(
    endpoint: string,
    requests: BatchRequest[],
  ): Promise<void> {
    // Create batch payload
    const batchPayload = {
      requests: requests.map((req) => ({
        id: req.id,
        params: req.params || {},
      })),
    };

    try {
      // Execute batch request
      const batchResponse = (await this.executeSingleRequest(
        `${endpoint}/batch`,
        batchPayload,
      )) as { results?: Array<{ id: string; data?: unknown; error?: string }> };

      // Distribute results back to individual requests
      if (batchResponse?.results) {
        requests.forEach((request) => {
          const result = batchResponse.results?.find(
            (r) => r.id === request.id,
          );
          if (result) {
            if (result.error) {
              request.reject(new Error(result.error));
            } else {
              request.resolve(result.data);
            }
          } else {
            request.reject(new Error("No result found for request"));
          }
        });
      } else {
        throw new Error("Invalid batch response format");
      }
    } catch {
      // If batch request fails, try individual requests
      await Promise.all(
        requests.map(async (request) => {
          try {
            const result = await this.executeSingleRequest(
              endpoint,
              request.params,
            );
            request.resolve(result);
          } catch (individualError) {
            request.reject(individualError as Error);
          }
        }),
      );
    }
  }

  /**
   * Execute a single request (to be implemented by the analytics client)
   * @param _endpoint - The endpoint to call (unused in base implementation)
   * @param _params - Optional parameters (unused in base implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async executeSingleRequest(
    _endpoint: string,
    _params?: Record<string, unknown> | undefined,
  ): Promise<unknown> {
    // This will be implemented by the analytics client
    // Parameters are prefixed with _ to indicate they're intentionally unused in the base implementation
    throw new Error(
      "executeSingleRequest must be implemented by the analytics client",
    );
  }

  /**
   * Check if an endpoint supports batching
   */
  private supportsBatching(endpoint: string): boolean {
    const batchSupportedEndpoints = [
      "/api/v1/analytics/engagement",
      "/api/v1/analytics/progress",
      "/api/v1/analytics/content",
      "/api/v1/analytics/system",
    ];

    return batchSupportedEndpoints.includes(endpoint);
  }

  /**
   * Generate batch key for grouping requests
   */
  private getBatchKey(endpoint: string): string {
    // Group similar endpoints together
    const baseEndpoint = endpoint.split("?")[0] ?? endpoint; // Remove query params
    return baseEndpoint;
  }

  /**
   * Create deduplication key for identical requests
   */
  private createDeduplicationKey(
    endpoint: string,
    params?: Record<string, unknown> | undefined,
  ): string {
    const paramsStr = params
      ? JSON.stringify(params, Object.keys(params).sort())
      : "";
    return `${endpoint}:${paramsStr}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current batch statistics
   */
  getBatchStats(): {
    pendingBatches: number;
    totalPendingRequests: number;
    activeTimers: number;
    deduplicationCacheSize: number;
  } {
    const totalPendingRequests = Array.from(
      this.pendingRequests.values(),
    ).reduce((sum, batch) => sum + batch.length, 0);

    return {
      pendingBatches: this.pendingRequests.size,
      totalPendingRequests,
      activeTimers: this.batchTimers.size,
      deduplicationCacheSize: this.requestDeduplication.size,
    };
  }

  /**
   * Clear all pending requests and timers
   */
  clear(): void {
    // Clear all timers
    this.batchTimers.forEach((timer) => clearTimeout(timer));
    this.batchTimers.clear();

    // Reject all pending requests
    this.pendingRequests.forEach((batch) => {
      batch.forEach((request) => {
        request.reject(new Error("Request batcher cleared"));
      });
    });
    this.pendingRequests.clear();

    // Clear deduplication cache
    this.requestDeduplication.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Factory function for creating request batcher
export const createRequestBatcher = (
  config?: Partial<BatchConfig>,
): RequestBatcher => {
  return new RequestBatcher(config);
};

export default RequestBatcher;
