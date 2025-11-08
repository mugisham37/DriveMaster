/**
 * Analytics Service Graceful Degradation Manager
 *
 * Handles service outages with degradation levels, cached data fallback,
 * and clear status communication to users about service availability.
 *
 * Requirements: 6.3, 6.4, 6.5
 */

import React from "react";
import type { ServiceHealthStatus } from "@/types/analytics-service";
import { AnalyticsErrorFactory } from "./errors";

// ============================================================================
// Types
// ============================================================================

export type DegradationLevel =
  | "optimal"
  | "partial"
  | "significant"
  | "critical"
  | "complete";

export interface DegradationState {
  level: DegradationLevel;
  reason: string;
  startTime: Date;
  affectedFeatures: string[];
  availableFeatures: string[];
  lastHealthCheck: Date | null;
  cacheStatus: "fresh" | "stale" | "expired" | "unavailable";
}

export interface CachedAnalyticsData<T = unknown> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: "live" | "cache" | "fallback";
  degradationLevel: DegradationLevel;
}

export interface DegradationConfig {
  // Cache TTL settings (in milliseconds)
  freshDataTTL: number;
  staleDataTTL: number;
  maxCacheAge: number;

  // Health check settings
  healthCheckInterval: number;
  healthCheckTimeout: number;

  // Degradation thresholds
  partialDegradationThreshold: number;
  significantDegradationThreshold: number;
  criticalDegradationThreshold: number;

  // Feature availability
  enableCachedFallback: boolean;
  enablePlaceholderData: boolean;
  enableOfflineMode: boolean;
}

export interface AnalyticsDataResult<T> {
  data: T;
  source: "live" | "cache" | "fallback" | "placeholder";
  degraded: boolean;
  timestamp: Date;
  expiresAt?: Date;
  degradationLevel: DegradationLevel;
}

// ============================================================================
// Graceful Degradation Manager
// ============================================================================

export class AnalyticsDegradationManager {
  private state: DegradationState;
  private config: DegradationConfig;
  private cache = new Map<string, CachedAnalyticsData>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(state: DegradationState) => void> = [];
  private serviceHealthCallback: (() => Promise<ServiceHealthStatus>) | null =
    null;

  constructor(config?: Partial<DegradationConfig>) {
    this.config = {
      freshDataTTL: 30000, // 30 seconds
      staleDataTTL: 300000, // 5 minutes
      maxCacheAge: 3600000, // 1 hour
      healthCheckInterval: 60000, // 1 minute
      healthCheckTimeout: 5000, // 5 seconds
      partialDegradationThreshold: 2, // 2 consecutive failures
      significantDegradationThreshold: 5, // 5 consecutive failures
      criticalDegradationThreshold: 10, // 10 consecutive failures
      enableCachedFallback: true,
      enablePlaceholderData: true,
      enableOfflineMode: true,
      ...config,
    };

    this.state = {
      level: "optimal",
      reason: "Service operating normally",
      startTime: new Date(),
      affectedFeatures: [],
      availableFeatures: this.getAllFeatures(),
      lastHealthCheck: null,
      cacheStatus: "fresh",
    };

    this.startHealthMonitoring();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Gets analytics data with graceful degradation
   */
  async getAnalyticsData<T>(
    key: string,
    fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    try {
      switch (this.state.level) {
        case "optimal":
          return await this.getOptimalData(key, fetcher, fallbackData);

        case "partial":
          return await this.getPartialData(key, fetcher, fallbackData);

        case "significant":
          return await this.getSignificantData(key, fetcher, fallbackData);

        case "critical":
          return await this.getCriticalData(key, fetcher, fallbackData);

        case "complete":
          return await this.getCompleteData(key, fetcher, fallbackData);

        default:
          return await this.getOptimalData(key, fetcher, fallbackData);
      }
    } catch (error) {
      console.error(
        "[DegradationManager] Error getting analytics data:",
        error,
      );
      return this.handleDataError(key, error, fallbackData);
    }
  }

  /**
   * Sets degradation level with reason
   */
  setDegradationLevel(
    level: DegradationLevel,
    reason: string,
    affectedFeatures: string[] = [],
  ) {
    const previousLevel = this.state.level;

    this.state = {
      ...this.state,
      level,
      reason,
      affectedFeatures,
      availableFeatures: this.getAvailableFeatures(level),
      cacheStatus: this.determineCacheStatus(),
    };

    if (previousLevel !== level) {
      console.warn(
        `[DegradationManager] Degradation level changed: ${previousLevel} -> ${level}`,
        {
          reason,
          affectedFeatures,
        },
      );

      this.notifyListeners();
    }
  }

  /**
   * Gets current degradation state
   */
  getState(): DegradationState {
    return { ...this.state };
  }

  /**
   * Checks if a feature is available at current degradation level
   */
  isFeatureAvailable(feature: string): boolean {
    return this.state.availableFeatures.includes(feature);
  }

  /**
   * Gets user-friendly status message
   */
  getStatusMessage(): string {
    switch (this.state.level) {
      case "optimal":
        return "Analytics service is operating normally";

      case "partial":
        return "Some analytics features may be slower than usual";

      case "significant":
        return "Analytics service is experiencing issues. Showing cached data where available";

      case "critical":
        return "Analytics service is severely degraded. Limited functionality available";

      case "complete":
        return "Analytics service is currently unavailable. Please try again later";

      default:
        return "Analytics service status unknown";
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    const now = new Date();
    let fresh = 0;
    let stale = 0;
    let expired = 0;

    for (const cached of this.cache.values()) {
      const age = now.getTime() - cached.timestamp.getTime();

      if (age <= this.config.freshDataTTL) {
        fresh++;
      } else if (age <= this.config.staleDataTTL) {
        stale++;
      } else {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      fresh,
      stale,
      expired,
      cacheStatus: this.state.cacheStatus,
    };
  }

  /**
   * Clears all cached data
   */
  clearCache() {
    this.cache.clear();
    this.state.cacheStatus = "unavailable";
    console.log("[DegradationManager] Cache cleared");
  }

  /**
   * Registers health check callback
   */
  setHealthCheckCallback(callback: () => Promise<ServiceHealthStatus>) {
    this.serviceHealthCallback = callback;
  }

  /**
   * Adds state change listener
   */
  onStateChange(listener: (state: DegradationState) => void) {
    this.listeners.push(listener);
  }

  /**
   * Removes state change listener
   */
  offStateChange(listener: (state: DegradationState) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Destroys the degradation manager
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.cache.clear();
    this.listeners = [];
    console.log("[DegradationManager] Destroyed");
  }

  // ============================================================================
  // Private Methods - Data Retrieval
  // ============================================================================

  private async getOptimalData<T>(
    key: string,
    fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    try {
      const data = await fetcher();
      this.cacheData(key, data, "live");

      return {
        data,
        source: "live",
        degraded: false,
        timestamp: new Date(),
        degradationLevel: "optimal",
      };
    } catch (error) {
      return this.handleFetchError(key, error, fallbackData);
    }
  }

  private async getPartialData<T>(
    key: string,
    fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    // Try cache first in partial degradation
    const cached = this.getCachedData<T>(key);
    if (cached && !this.isCacheExpired(cached)) {
      return {
        data: cached.data,
        source: "cache",
        degraded: true,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        degradationLevel: "partial",
      };
    }

    // Try live data with timeout
    try {
      const data = await this.fetchWithTimeout(
        fetcher,
        this.config.healthCheckTimeout,
      );
      this.cacheData(key, data, "live");

      return {
        data,
        source: "live",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "partial",
      };
    } catch (error) {
      return this.handleFetchError(key, error, fallbackData);
    }
  }

  private async getSignificantData<T>(
    key: string,
    _fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    // Only use cache in significant degradation
    const cached = this.getCachedData<T>(key);
    if (cached) {
      return {
        data: cached.data,
        source: "cache",
        degraded: true,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        degradationLevel: "significant",
      };
    }

    if (fallbackData) {
      return {
        data: fallbackData,
        source: "fallback",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "significant",
      };
    }

    throw new Error("No cached or fallback data available");
  }

  private async getCriticalData<T>(
    key: string,
    _fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    // Use any available cache, even if stale
    const cached = this.getCachedData<T>(key, true);
    if (cached) {
      return {
        data: cached.data,
        source: "cache",
        degraded: true,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        degradationLevel: "critical",
      };
    }

    if (fallbackData) {
      return {
        data: fallbackData,
        source: "fallback",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "critical",
      };
    }

    // Return placeholder data if enabled
    if (this.config.enablePlaceholderData) {
      const placeholderData = this.createPlaceholderData<T>(key);
      return {
        data: placeholderData,
        source: "placeholder",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "critical",
      };
    }

    throw new Error("No data available in critical degradation mode");
  }

  private async getCompleteData<T>(
    key: string,
    _fetcher: () => Promise<T>,
    fallbackData?: T,
  ): Promise<AnalyticsDataResult<T>> {
    if (fallbackData) {
      return {
        data: fallbackData,
        source: "fallback",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "complete",
      };
    }

    // Return placeholder data if enabled
    if (this.config.enablePlaceholderData) {
      const placeholderData = this.createPlaceholderData<T>(key);
      return {
        data: placeholderData,
        source: "placeholder",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: "complete",
      };
    }

    throw new Error("Analytics service completely unavailable");
  }

  // ============================================================================
  // Private Methods - Error Handling
  // ============================================================================

  private handleFetchError<T>(
    key: string,
    error: unknown,
    fallbackData?: T,
  ): AnalyticsDataResult<T> {
    const cached = this.getCachedData<T>(key, true); // Allow stale cache

    if (cached) {
      return {
        data: cached.data,
        source: "cache",
        degraded: true,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        degradationLevel: this.state.level,
      };
    }

    if (fallbackData) {
      return {
        data: fallbackData,
        source: "fallback",
        degraded: true,
        timestamp: new Date(),
        degradationLevel: this.state.level,
      };
    }

    throw AnalyticsErrorFactory.fromError(error);
  }

  private handleDataError<T>(
    key: string,
    error: unknown,
    fallbackData?: T,
  ): AnalyticsDataResult<T> {
    console.error("[DegradationManager] Data error:", error);

    // Try to escalate degradation level
    this.escalateDegradation(error);

    return this.handleFetchError(key, error, fallbackData);
  }

  private escalateDegradation(error: unknown) {
    const analyticsError = AnalyticsErrorFactory.fromError(error);

    // Escalate based on error type
    switch (analyticsError.type) {
      case "network":
      case "timeout":
        if (this.state.level === "optimal") {
          this.setDegradationLevel("partial", "Network connectivity issues");
        } else if (this.state.level === "partial") {
          this.setDegradationLevel("significant", "Persistent network issues");
        }
        break;

      case "service":
        if (this.state.level === "optimal" || this.state.level === "partial") {
          this.setDegradationLevel("significant", "Service errors detected");
        } else if (this.state.level === "significant") {
          this.setDegradationLevel("critical", "Persistent service failures");
        }
        break;

      case "authentication":
      case "authorization":
        // Don't escalate for auth errors
        break;

      default:
        if (this.state.level === "optimal") {
          this.setDegradationLevel("partial", "Unknown service issues");
        }
    }
  }

  // ============================================================================
  // Private Methods - Cache Management
  // ============================================================================

  private cacheData<T>(
    key: string,
    data: T,
    source: "live" | "cache" | "fallback",
  ) {
    const now = new Date();
    const cached: CachedAnalyticsData<T> = {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + this.config.freshDataTTL),
      source,
      degradationLevel: this.state.level,
    };

    this.cache.set(key, cached);
    this.state.cacheStatus = this.determineCacheStatus();
  }

  private getCachedData<T>(
    key: string,
    allowStale = false,
  ): CachedAnalyticsData<T> | null {
    const cached = this.cache.get(key) as CachedAnalyticsData<T> | undefined;

    if (!cached) {
      return null;
    }

    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();

    // Check if cache is too old
    if (age > this.config.maxCacheAge) {
      this.cache.delete(key);
      return null;
    }

    // Check if cache is stale but allowed
    if (!allowStale && age > this.config.staleDataTTL) {
      return null;
    }

    return cached;
  }

  private isCacheExpired(cached: CachedAnalyticsData): boolean {
    return new Date() > cached.expiresAt;
  }

  private determineCacheStatus():
    | "fresh"
    | "stale"
    | "expired"
    | "unavailable" {
    if (this.cache.size === 0) {
      return "unavailable";
    }

    const now = new Date();
    let hasFresh = false;
    let hasStale = false;

    for (const cached of this.cache.values()) {
      const age = now.getTime() - cached.timestamp.getTime();

      if (age <= this.config.freshDataTTL) {
        hasFresh = true;
      } else if (age <= this.config.staleDataTTL) {
        hasStale = true;
      }
    }

    if (hasFresh) return "fresh";
    if (hasStale) return "stale";
    return "expired";
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private async fetchWithTimeout<T>(
    fetcher: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return Promise.race([
      fetcher(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeout),
      ),
    ]);
  }

  private createPlaceholderData<T>(key: string): T {
    // Create appropriate placeholder based on key
    if (key.includes("engagement")) {
      return {
        timestamp: new Date().toISOString(),
        activeUsers1h: 0,
        activeUsers24h: 0,
        newUsers24h: 0,
        sessionsStarted1h: 0,
        avgSessionDurationMinutes: 0,
        bounceRate: 0,
        retentionRateD1: 0,
        retentionRateD7: 0,
        retentionRateD30: 0,
      } as T;
    }

    if (key.includes("progress")) {
      return {
        timestamp: new Date().toISOString(),
        totalCompletions24h: 0,
        avgAccuracy: 0,
        avgResponseTimeMs: 0,
        masteryAchievements24h: 0,
        strugglingUsers: 0,
        topPerformers: 0,
        contentCompletionRate: 0,
        skillProgressRate: 0,
      } as T;
    }

    // Generic placeholder
    return {} as T;
  }

  private getAllFeatures(): string[] {
    return [
      "engagement_metrics",
      "progress_metrics",
      "content_metrics",
      "system_metrics",
      "realtime_updates",
      "alerts",
      "insights",
      "reports",
      "exports",
      "user_analytics",
    ];
  }

  private getAvailableFeatures(level: DegradationLevel): string[] {
    const allFeatures = this.getAllFeatures();

    switch (level) {
      case "optimal":
        return allFeatures;

      case "partial":
        return allFeatures.filter((f) => f !== "realtime_updates");

      case "significant":
        return [
          "engagement_metrics",
          "progress_metrics",
          "content_metrics",
          "insights",
          "user_analytics",
        ];

      case "critical":
        return ["engagement_metrics", "progress_metrics", "user_analytics"];

      case "complete":
        return [];

      default:
        return allFeatures;
    }
  }

  private startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck() {
    if (!this.serviceHealthCallback) {
      return;
    }

    try {
      const health = await this.serviceHealthCallback();
      this.state.lastHealthCheck = new Date();

      // Improve degradation level if service is healthy
      if (health.status === "healthy" && this.state.level !== "optimal") {
        this.setDegradationLevel("optimal", "Service health restored");
      }
    } catch (error) {
      console.warn("[DegradationManager] Health check failed:", error);
      this.escalateDegradation(error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error("[DegradationManager] Error in state listener:", error);
      }
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsDegradationManager = new AnalyticsDegradationManager();

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for using degradation manager
 */
export function useAnalyticsDegradation() {
  const [state, setState] = React.useState<DegradationState>(
    analyticsDegradationManager.getState(),
  );

  React.useEffect(() => {
    const handleStateChange = (newState: DegradationState) => {
      setState(newState);
    };

    analyticsDegradationManager.onStateChange(handleStateChange);

    return () => {
      analyticsDegradationManager.offStateChange(handleStateChange);
    };
  }, []);

  return {
    state,
    isFeatureAvailable: analyticsDegradationManager.isFeatureAvailable.bind(
      analyticsDegradationManager,
    ),
    getStatusMessage: analyticsDegradationManager.getStatusMessage.bind(
      analyticsDegradationManager,
    ),
    getCacheStats: analyticsDegradationManager.getCacheStats.bind(
      analyticsDegradationManager,
    ),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default AnalyticsDegradationManager;
