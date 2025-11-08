/**
 * Content Service Cache Strategies
 *
 * SWR configuration strategies for different content service operations
 * Requirements: 6.1, 6.2, 6.4
 */

import type { SWRConfiguration } from "swr";

export class CacheStrategies {
  /**
   * Stale-while-revalidate strategy for frequently accessed content
   * Shows cached data immediately while fetching fresh data in background
   */
  static staleWhileRevalidate(ttl: number = 300000): SWRConfiguration {
    return {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: ttl / 10, // 10% of TTL for deduplication
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      focusThrottleInterval: 5000,
      loadingTimeout: 3000,
      onLoadingSlow: (key) => {
        console.warn(`[ContentService] Slow loading detected for: ${key}`);
      },
      onError: (error, key) => {
        console.error(`[ContentService] SWR Error for ${key}:`, error);
      },
    };
  }

  /**
   * Cache-first strategy for static content that rarely changes
   * Prioritizes cached data and only fetches if cache miss
   */
  static cacheFirst(ttl: number = 3600000): SWRConfiguration {
    return {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: ttl,
      errorRetryCount: 1,
      errorRetryInterval: 10000,
      focusThrottleInterval: 60000,
      loadingTimeout: 5000,
      onError: (error, key) => {
        console.error(`[ContentService] Cache-first error for ${key}:`, error);
      },
    };
  }

  /**
   * Network-first strategy for dynamic content that changes frequently
   * Always tries network first, falls back to cache on failure
   */
  static networkFirst(ttl: number = 60000): SWRConfiguration {
    return {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: ttl / 20, // 5% of TTL for minimal deduplication
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      focusThrottleInterval: 1000,
      loadingTimeout: 2000,
      onError: (error, key) => {
        console.error(
          `[ContentService] Network-first error for ${key}:`,
          error,
        );
      },
    };
  }

  /**
   * Real-time strategy for collaborative content
   * Frequent revalidation with short intervals
   */
  static realTime(interval: number = 5000): SWRConfiguration {
    return {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: interval,
      dedupingInterval: 1000,
      errorRetryCount: 5,
      errorRetryInterval: 2000,
      focusThrottleInterval: 500,
      loadingTimeout: 1000,
      onError: (error, key) => {
        console.error(`[ContentService] Real-time error for ${key}:`, error);
      },
    };
  }

  /**
   * Background refresh strategy for prefetched content
   * Loads data in background without showing loading states
   */
  static backgroundRefresh(ttl: number = 600000): SWRConfiguration {
    return {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: ttl,
      dedupingInterval: ttl / 5,
      errorRetryCount: 1,
      errorRetryInterval: 30000,
      focusThrottleInterval: 30000,
      loadingTimeout: 10000,
      onError: (error, key) => {
        console.warn(
          `[ContentService] Background refresh error for ${key}:`,
          error,
        );
      },
    };
  }

  /**
   * Gets strategy based on content type and usage pattern
   */
  static getStrategyForContentType(
    contentType: string,
    usage: "frequent" | "occasional" | "rare" = "occasional",
  ): SWRConfiguration {
    // Static content types use cache-first
    const staticTypes = ["article", "lesson", "video"];
    if (staticTypes.includes(contentType)) {
      return this.cacheFirst();
    }

    // Dynamic content types based on usage
    const dynamicTypes = ["exercise", "assessment", "project"];
    if (dynamicTypes.includes(contentType)) {
      switch (usage) {
        case "frequent":
          return this.staleWhileRevalidate(180000); // 3 minutes
        case "occasional":
          return this.networkFirst(300000); // 5 minutes
        case "rare":
          return this.cacheFirst(1800000); // 30 minutes
      }
    }

    // Default to stale-while-revalidate
    return this.staleWhileRevalidate();
  }

  /**
   * Gets strategy for search operations
   */
  static getSearchStrategy(): SWRConfiguration {
    return {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 30000, // 30 seconds deduplication for search
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      focusThrottleInterval: 5000,
      loadingTimeout: 3000,
      onError: (error, key) => {
        console.error(`[ContentService] Search error for ${key}:`, error);
      },
    };
  }

  /**
   * Gets strategy for media operations
   */
  static getMediaStrategy(): SWRConfiguration {
    return {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 3600000, // 1 hour - media metadata rarely changes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      focusThrottleInterval: 10000,
      loadingTimeout: 10000, // Longer timeout for media
      onError: (error, key) => {
        console.error(`[ContentService] Media error for ${key}:`, error);
      },
    };
  }
}
