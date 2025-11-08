/**
 * Content Service Cache
 *
 * SWR-integrated caching implementation for content service data
 * Requirements: 6.1, 6.4
 */

import type { ContentCacheConfig, CacheKey, CacheEntry } from "./types";

export class ContentServiceCache {
  private cache = new Map<string, CacheEntry>();
  private config: ContentCacheConfig;

  constructor(config?: Partial<ContentCacheConfig>) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      enableCompression: false,
      ...config,
    };

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generates a cache key from operation and parameters
   */
  generateKey(
    operation: string,
    params?: Record<string, unknown>,
    userId?: string,
  ): string {
    const cacheKey: CacheKey = {
      operation,
      params: params || {},
      ...(userId !== undefined && { userId }),
    };

    // Create a deterministic string representation
    const keyParts = [
      operation,
      userId || "anonymous",
      JSON.stringify(this.sortObject(cacheKey.params)),
    ];

    return keyParts.join(":");
  }

  /**
   * Gets a cached value
   */
  get<T = unknown>(key: string): T | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      // Record cache miss
      this.recordCacheMetrics(key, false, Date.now() - startTime);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      // Record cache miss for expired entry
      this.recordCacheMetrics(key, false, Date.now() - startTime);
      return null;
    }

    // Update hit count and return data
    entry.hits++;
    // Record cache hit
    this.recordCacheMetrics(key, true, Date.now() - startTime);
    return entry.data as T;
  }

  /**
   * Sets a cached value with TTL
   */
  set<T = unknown>(key: string, value: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: new Date(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidates a specific cache entry
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidates cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const expiredCount = entries.filter((entry) =>
      this.isExpired(entry),
    ).length;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      expiredCount,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return now - entryTime > entry.ttl;
  }

  /**
   * Removes expired entries
   */
  private cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evicts least recently used entries when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Sorts object keys for consistent cache key generation
   */
  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      const value = obj[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        sorted[key] = this.sortObject(value as Record<string, unknown>);
      } else {
        sorted[key] = value;
      }
    }

    return sorted;
  }

  /**
   * Records cache performance metrics
   */
  private recordCacheMetrics(
    key: string,
    hit: boolean,
    duration: number,
  ): void {
    try {
      // Lazy import to avoid circular dependencies
      import("../../../utils/performance-monitor")
        .then(({ performanceMonitor }) => {
          performanceMonitor.recordCacheOperation(key, hit, duration);
        })
        .catch((error) => {
          console.debug(
            "[ContentServiceCache] Performance monitor not available:",
            error,
          );
        });
    } catch (error) {
      // Silently fail if performance monitor is not available
      console.debug(
        "[ContentServiceCache] Performance monitor not available:",
        error,
      );
    }
  }
}

export const contentServiceCache = new ContentServiceCache();
