/**
 * Request Optimization Strategies
 * Implements request batching, deduplication, connection pooling, and compression
 */

import { httpClient, RequestConfig, ApiResponse } from "./client";

/**
 * Request batching configuration
 */
interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number;
  enabled: boolean;
}

/**
 * Request deduplication configuration
 */
interface DeduplicationConfig {
  enabled: boolean;
  ttl: number; // Time to live for cached requests in milliseconds
}

/**
 * Connection pooling configuration
 */
interface ConnectionPoolConfig {
  maxConnections: number;
  keepAliveTimeout: number;
  enabled: boolean;
}

/**
 * Compression configuration
 */
interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Minimum payload size to compress (bytes)
  algorithms: string[]; // Supported compression algorithms
}

/**
 * Request optimization configuration
 */
export interface RequestOptimizerConfig {
  batching: BatchConfig;
  deduplication: DeduplicationConfig;
  connectionPool: ConnectionPoolConfig;
  compression: CompressionConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RequestOptimizerConfig = {
  batching: {
    maxBatchSize: 10,
    batchTimeout: 50, // 50ms
    enabled: true,
  },
  deduplication: {
    enabled: true,
    ttl: 5000, // 5 seconds
  },
  connectionPool: {
    maxConnections: 6, // Browser default
    keepAliveTimeout: 30000, // 30 seconds
    enabled: true,
  },
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
    algorithms: ["gzip", "deflate", "br"],
  },
};

/**
 * Batched request item
 */
interface BatchedRequest {
  url: string;
  config: RequestConfig;
  resolve: (response: ApiResponse) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

/**
 * Deduplicated request cache entry
 */
interface CachedRequest {
  promise: Promise<ApiResponse>;
  timestamp: number;
}

/**
 * Request key for deduplication
 */
interface RequestKey {
  method: string;
  url: string;
  body: string;
  headers: string;
}

/**
 * Request Optimizer Class
 */
export class RequestOptimizer {
  private config: RequestOptimizerConfig;
  private batchQueue: BatchedRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private requestCache = new Map<string, CachedRequest>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<RequestOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Optimize request execution
   */
  async optimizeRequest<T = unknown>(
    url: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // Apply compression if enabled
    if (this.config.compression.enabled) {
      config = this.applyCompression(config);
    }

    // Apply connection pooling if enabled
    if (this.config.connectionPool.enabled) {
      config = this.applyConnectionPooling(config);
    }

    // Check for deduplication
    if (this.config.deduplication.enabled && this.isDeduplicatable(config)) {
      const cachedResponse = await this.tryDeduplication<T>(url, config);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Check for batching
    if (this.config.batching.enabled && this.isBatchable(config)) {
      return this.addToBatch<T>(url, config);
    }

    // Execute request normally
    return httpClient.executeRequest<T>(url, config);
  }

  /**
   * Apply compression configuration
   */
  private applyCompression(config: RequestConfig): RequestConfig {
    const headers = { ...config.headers };

    // Add Accept-Encoding header
    if (!headers["Accept-Encoding"]) {
      headers["Accept-Encoding"] =
        this.config.compression.algorithms.join(", ");
    }

    // Add Content-Encoding for request body if it's large enough
    if (config.body && this.shouldCompressBody(config.body)) {
      // Note: Actual compression would be handled by the browser or a compression library
      headers["Content-Encoding"] = "gzip";
    }

    return { ...config, headers };
  }

  /**
   * Apply connection pooling configuration
   */
  private applyConnectionPooling(config: RequestConfig): RequestConfig {
    const headers = { ...config.headers };

    // Add keep-alive headers
    if (this.config.connectionPool.enabled) {
      headers["Connection"] = "keep-alive";
      headers["Keep-Alive"] =
        `timeout=${Math.floor(this.config.connectionPool.keepAliveTimeout / 1000)}`;
    }

    return { ...config, headers };
  }

  /**
   * Check if request body should be compressed
   */
  private shouldCompressBody(body: unknown): boolean {
    if (!body) return false;

    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    return bodyString.length >= this.config.compression.threshold;
  }

  /**
   * Check if request is deduplicatable
   */
  private isDeduplicatable(config: RequestConfig): boolean {
    // Only deduplicate GET requests and safe methods
    const method = config.method || "GET";
    return ["GET", "HEAD", "OPTIONS"].includes(method) && !config.skipAuth;
  }

  /**
   * Try to get cached response for deduplication
   */
  private async tryDeduplication<T>(
    url: string,
    config: RequestConfig,
  ): Promise<ApiResponse<T> | null> {
    const key = this.createRequestKey(url, config);
    const cached = this.requestCache.get(key);

    if (
      cached &&
      Date.now() - cached.timestamp < this.config.deduplication.ttl
    ) {
      try {
        return (await cached.promise) as ApiResponse<T>;
      } catch (error) {
        // Remove failed request from cache
        this.requestCache.delete(key);
        throw error;
      }
    }

    // Cache new request
    const promise = httpClient.executeRequest<T>(url, config);
    this.requestCache.set(key, {
      promise: promise as Promise<ApiResponse>,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Create request key for deduplication
   */
  private createRequestKey(url: string, config: RequestConfig): string {
    const key: RequestKey = {
      method: config.method || "GET",
      url,
      body: config.body ? JSON.stringify(config.body) : "",
      headers: JSON.stringify(config.headers || {}),
    };

    return JSON.stringify(key);
  }

  /**
   * Check if request is batchable
   */
  private isBatchable(config: RequestConfig): boolean {
    // Only batch GET requests to specific endpoints
    const method = config.method || "GET";
    return method === "GET" && !config.skipAuth && !config.skipRetry;
  }

  /**
   * Add request to batch queue
   */
  private addToBatch<T>(
    url: string,
    config: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const batchedRequest: BatchedRequest = {
        url,
        config,
        resolve: resolve as (response: ApiResponse) => void,
        reject,
        timestamp: Date.now(),
      };

      this.batchQueue.push(batchedRequest);

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.batching.batchTimeout);
      }

      // Process batch immediately if it reaches max size
      if (this.batchQueue.length >= this.config.batching.maxBatchSize) {
        this.processBatch();
      }
    });
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    // Group requests by similar characteristics
    const groups = this.groupBatchRequests(batch);

    // Process each group
    for (const group of groups) {
      await this.processBatchGroup(group);
    }
  }

  /**
   * Group batch requests by similar characteristics
   */
  private groupBatchRequests(batch: BatchedRequest[]): BatchedRequest[][] {
    const groups: BatchedRequest[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < batch.length; i++) {
      if (processed.has(i)) continue;

      const group = [batch[i]!];
      processed.add(i);

      // Find similar requests
      for (let j = i + 1; j < batch.length; j++) {
        if (processed.has(j)) continue;

        if (this.areRequestsSimilar(batch[i]!, batch[j]!)) {
          group.push(batch[j]!);
          processed.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two requests are similar enough to batch together
   */
  private areRequestsSimilar(
    req1: BatchedRequest,
    req2: BatchedRequest,
  ): boolean {
    // Same method and similar URLs (same base path)
    const method1 = req1.config.method || "GET";
    const method2 = req2.config.method || "GET";

    if (method1 !== method2) return false;

    // Extract base path from URLs
    const basePath1 = req1.url.split("?")[0]?.split("/").slice(0, -1).join("/");
    const basePath2 = req2.url.split("?")[0]?.split("/").slice(0, -1).join("/");

    return basePath1 === basePath2;
  }

  /**
   * Process a group of similar batched requests
   */
  private async processBatchGroup(group: BatchedRequest[]): Promise<void> {
    // For now, execute requests in parallel
    // In a real implementation, this could be optimized further
    const promises = group.map(async (request) => {
      try {
        const response = await httpClient.executeRequest(
          request.url,
          request.config,
        );
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Start cleanup timer for expired cache entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp >= this.config.deduplication.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.requestCache.delete(key);
    }
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      cacheSize: this.requestCache.size,
      batchQueueSize: this.batchQueue.length,
      config: this.config,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RequestOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear cache and reset state
   */
  reset(): void {
    this.requestCache.clear();
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.reset();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const requestOptimizer = new RequestOptimizer();

// Export configuration types
export type {
  BatchConfig,
  DeduplicationConfig,
  ConnectionPoolConfig,
  CompressionConfig,
};
