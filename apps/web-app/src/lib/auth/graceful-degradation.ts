/**
 * Graceful Degradation System
 * Provides fallback mechanisms and cached data when services are unavailable
 */

import { serviceHealthMonitor } from "./service-health";
import { circuitBreakerManager } from "./circuit-breaker";
import { AuthErrorHandler } from "./error-handler";
import type { UserProfile, OAuthProvider } from "../../types/auth-service";

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  stale: boolean;
}

export interface DegradationConfig {
  enableCaching: boolean;
  defaultCacheTTL: number;
  staleCacheThreshold: number; // How long to keep stale cache
  fallbackMode: "cache" | "offline" | "minimal";
  retryInterval: number;
}

/**
 * Cache Manager for graceful degradation
 */
export class DegradationCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxCacheSize = 1000;

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Default 5 minutes
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
      stale: false,
    });
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): { data: T; stale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    // Check if data is expired
    if (age > entry.ttl) {
      entry.stale = true;
    }

    return {
      data: entry.data,
      stale: entry.stale,
    };
  }

  /**
   * Check if cache has valid (non-stale) data
   */
  hasValid(key: string): boolean {
    const result = this.get(key);
    return result !== null && !result.stale;
  }

  /**
   * Check if cache has any data (including stale)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove data from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    staleEntries: number;
  } {
    const staleEntries = Array.from(this.cache.values()).filter(
      (entry) => entry.stale,
    ).length;

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      staleEntries,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(staleCacheThreshold: number): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();

      // Remove entries that are beyond stale threshold
      if (age > entry.ttl + staleCacheThreshold) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Graceful Degradation Manager
 */
export class GracefulDegradationManager {
  private cache = new DegradationCache();
  private fallbackData = new Map<string, unknown>();
  private retryTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly config: DegradationConfig) {
    // Start periodic cache cleanup
    setInterval(() => {
      this.cache.cleanup(config.staleCacheThreshold);
    }, 60000); // Cleanup every minute
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    operation: () => Promise<T>,
    options: {
      cacheKey: string;
      serviceName: string;
      fallbackData?: T;
      cacheTTL?: number;
      allowStale?: boolean;
    },
  ): Promise<{
    data: T;
    source: "live" | "cache" | "stale" | "fallback";
    degraded: boolean;
  }> {
    const {
      cacheKey,
      serviceName,
      fallbackData,
      cacheTTL,
      allowStale = true,
    } = options;

    try {
      // Check if service is healthy
      const serviceHealth = serviceHealthMonitor.getServiceHealth(serviceName);
      const circuitBreaker = circuitBreakerManager
        .getAllCircuitBreakers()
        .get(serviceName);

      const serviceAvailable =
        serviceHealth?.healthy !== false &&
        circuitBreaker?.getState().state !== "open";

      // Try live operation if service is available
      if (serviceAvailable) {
        try {
          const result = await operation();

          // Cache successful result
          if (this.config.enableCaching) {
            this.cache.set(
              cacheKey,
              result,
              cacheTTL || this.config.defaultCacheTTL,
            );
          }

          return {
            data: result,
            source: "live",
            degraded: false,
          };
        } catch (operationError) {
          // Operation failed, fall through to degradation logic
          this.logDegradationEvent(
            "operation_failed",
            serviceName,
            operationError,
          );
        }
      }

      // Try to use cached data
      if (this.config.enableCaching) {
        const cached = this.cache.get<T>(cacheKey);

        if (cached) {
          if (!cached.stale) {
            return {
              data: cached.data,
              source: "cache",
              degraded: true,
            };
          } else if (allowStale) {
            return {
              data: cached.data,
              source: "stale",
              degraded: true,
            };
          }
        }
      }

      // Use fallback data if available
      if (fallbackData !== undefined) {
        return {
          data: fallbackData,
          source: "fallback",
          degraded: true,
        };
      }

      // Check for stored fallback data
      const storedFallback = this.fallbackData.get(cacheKey) as T | undefined;
      if (storedFallback !== undefined) {
        return {
          data: storedFallback,
          source: "fallback",
          degraded: true,
        };
      }

      // No fallback available, throw error
      throw AuthErrorHandler.processError(
        new Error(
          `Service ${serviceName} unavailable and no fallback data available`,
        ),
        "graceful_degradation",
      );
    } catch (error) {
      this.logDegradationEvent("complete_failure", serviceName, error);
      throw error;
    }
  }

  /**
   * Set fallback data for a cache key
   */
  setFallbackData<T>(key: string, data: T): void {
    this.fallbackData.set(key, data);
  }

  /**
   * Get fallback data for a cache key
   */
  getFallbackData<T>(key: string): T | undefined {
    return this.fallbackData.get(key) as T | undefined;
  }

  /**
   * Schedule retry for failed operation
   */
  scheduleRetry(
    key: string,
    operation: () => Promise<void>,
    interval?: number,
  ): void {
    // Clear existing retry timer
    const existingTimer = this.retryTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new retry
    const timer = setTimeout(async () => {
      try {
        await operation();
        this.retryTimers.delete(key);
      } catch {
        // Retry failed, schedule another retry with exponential backoff
        const nextInterval = Math.min(
          (interval || this.config.retryInterval) * 2,
          300000,
        ); // Max 5 minutes
        this.scheduleRetry(key, operation, nextInterval);
      }
    }, interval || this.config.retryInterval);

    this.retryTimers.set(key, timer);
  }

  /**
   * Cancel scheduled retry
   */
  cancelRetry(key: string): void {
    const timer = this.retryTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(key);
    }
  }

  /**
   * Get degradation status
   */
  getDegradationStatus(): {
    degraded: boolean;
    cacheStats: ReturnType<DegradationCache["getStats"]>;
    activeRetries: number;
    fallbackDataCount: number;
  } {
    const overallHealth = serviceHealthMonitor.getOverallHealth();

    return {
      degraded: !overallHealth.healthy,
      cacheStats: this.cache.getStats(),
      activeRetries: this.retryTimers.size,
      fallbackDataCount: this.fallbackData.size,
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear all fallback data
   */
  clearFallbackData(): void {
    this.fallbackData.clear();
  }

  /**
   * Log degradation events
   */
  private logDegradationEvent(
    event: string,
    serviceName: string,
    _error?: unknown,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      service: serviceName,
      degradationStatus: this.getDegradationStatus(),
      error: _error
        ? AuthErrorHandler.processError(_error, "degradation")
        : undefined,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("Graceful Degradation Event:", logEntry);
    }

    // In production, send to monitoring service
    // Example: sendToMonitoringService(logEntry)
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all retry timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    // Clear caches
    this.cache.clear();
    this.fallbackData.clear();
  }
}

/**
 * Default degradation configuration
 */
export const DEFAULT_DEGRADATION_CONFIG: DegradationConfig = {
  enableCaching: true,
  defaultCacheTTL: 300000, // 5 minutes
  staleCacheThreshold: 3600000, // 1 hour
  fallbackMode: "cache",
  retryInterval: 30000, // 30 seconds
};

/**
 * Auth-specific degradation helpers
 */
export class AuthDegradationHelpers {
  constructor(private readonly manager: GracefulDegradationManager) {}

  /**
   * Get user profile with degradation
   */
  async getUserProfile(
    userId: number,
    fetchFn: () => Promise<UserProfile>,
  ): Promise<{
    data: UserProfile;
    source: "live" | "cache" | "stale" | "fallback";
    degraded: boolean;
  }> {
    return this.manager.executeWithDegradation(fetchFn, {
      cacheKey: `user_profile_${userId}`,
      serviceName: "auth-service",
      cacheTTL: 600000, // 10 minutes for user profiles
    });
  }

  /**
   * Get OAuth providers with degradation
   */
  async getOAuthProviders(fetchFn: () => Promise<OAuthProvider[]>): Promise<{
    data: OAuthProvider[];
    source: "live" | "cache" | "stale" | "fallback";
    degraded: boolean;
  }> {
    // Default fallback providers
    const fallbackProviders: OAuthProvider[] = [
      { id: "google", name: "Google", enabled: true, displayName: "Google" },
      { id: "github", name: "GitHub", enabled: true, displayName: "GitHub" },
    ];

    return this.manager.executeWithDegradation(fetchFn, {
      cacheKey: "oauth_providers",
      serviceName: "auth-service",
      fallbackData: fallbackProviders,
      cacheTTL: 1800000, // 30 minutes for provider list
      allowStale: true,
    });
  }

  /**
   * Set minimal fallback data for offline mode
   */
  setMinimalFallbacks(): void {
    // Set basic OAuth providers
    this.manager.setFallbackData("oauth_providers", [
      { id: "google", name: "Google", enabled: true, displayName: "Google" },
      { id: "github", name: "GitHub", enabled: true, displayName: "GitHub" },
    ]);

    // Set basic error messages
    this.manager.setFallbackData("error_messages", {
      network: "Connection problem. Please check your internet connection.",
      authentication: "Authentication failed. Please try again.",
      server: "Service temporarily unavailable. Please try again later.",
    });
  }
}

// Export singleton instances
export const gracefulDegradationManager = new GracefulDegradationManager(
  DEFAULT_DEGRADATION_CONFIG,
);
export const authDegradationHelpers = new AuthDegradationHelpers(
  gracefulDegradationManager,
);
