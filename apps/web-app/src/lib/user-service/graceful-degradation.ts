/**
 * Graceful Degradation System for User Service
 *
 * Provides fallback mechanisms and cached data access when the user service
 * is unavailable, ensuring the application remains functional.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import React from "react";
import type {
  UserProfile,
  UserPreferences,
  ProgressSummary,
  ActivitySummary,
} from "@/types/user-service";

// ============================================================================
// Degradation Configuration
// ============================================================================

export interface DegradationConfig {
  enableCachedFallbacks: boolean;
  enableOfflineMode: boolean;
  enableMinimalMode: boolean;
  cacheExpirationMs: number;
  staleDataThresholdMs: number;
  maxCacheSize: number;
  fallbackDataTTL: number;
}

export interface DegradationState {
  mode: "normal" | "degraded" | "offline" | "minimal";
  reason: string;
  startTime: Date;
  affectedFeatures: string[];
  availableFeatures: string[];
  cacheStatus: "fresh" | "stale" | "expired" | "unavailable";
}

// ============================================================================
// Cached Data Manager
// ============================================================================

export class CachedDataManager {
  private cache: Map<
    string,
    {
      data: unknown;
      timestamp: Date;
      expiresAt: Date;
      isStale: boolean;
    }
  > = new Map();

  private config: DegradationConfig;

  constructor(config: Partial<DegradationConfig> = {}) {
    this.config = {
      enableCachedFallbacks: true,
      enableOfflineMode: true,
      enableMinimalMode: true,
      cacheExpirationMs: 5 * 60 * 1000, // 5 minutes
      staleDataThresholdMs: 15 * 60 * 1000, // 15 minutes
      maxCacheSize: 100,
      fallbackDataTTL: 60 * 60 * 1000, // 1 hour
      ...config,
    };
  }

  set<T>(key: string, data: T, customTTL?: number): void {
    const now = new Date();
    const ttl = customTTL || this.config.cacheExpirationMs;

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntries(Math.floor(this.config.maxCacheSize * 0.1));
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttl),
      isStale: false,
    });
  }

  get<T>(key: string): {
    data: T | null;
    status: "fresh" | "stale" | "expired" | "missing";
    age: number;
  } {
    const entry = this.cache.get(key);

    if (!entry) {
      return { data: null, status: "missing", age: 0 };
    }

    const now = new Date();
    const age = now.getTime() - entry.timestamp.getTime();

    // Check if expired
    if (now > entry.expiresAt) {
      return { data: entry.data as T, status: "expired", age };
    }

    // Check if stale
    if (age > this.config.staleDataThresholdMs) {
      return { data: entry.data as T, status: "stale", age };
    }

    return { data: entry.data as T, status: "fresh", age };
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    maxSize: number;
    freshEntries: number;
    staleEntries: number;
    expiredEntries: number;
  } {
    const now = new Date();
    let fresh = 0;
    let stale = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      const age = now.getTime() - entry.timestamp.getTime();

      if (now > entry.expiresAt) {
        expired++;
      } else if (age > this.config.staleDataThresholdMs) {
        stale++;
      } else {
        fresh++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      freshEntries: fresh,
      staleEntries: stale,
      expiredEntries: expired,
    };
  }

  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }
}

// ============================================================================
// Fallback Data Provider
// ============================================================================

export class FallbackDataProvider {
  private static readonly MINIMAL_USER_PROFILE: Partial<UserProfile> = {
    id: "offline-user",
    email: "user@offline.local",
    emailVerified: false,
    countryCode: "US",
    timezone: "UTC",
    language: "en",
    userRole: "learner",
    mfaEnabled: false,
    gdprConsent: true,
    isActive: true,
  };

  private static readonly MINIMAL_PREFERENCES: Partial<UserPreferences> = {
    userId: "offline-user",
    preferences: {
      theme: "light",
      language: "en",
      notifications: {
        email: false,
        push: false,
        inApp: true,
        marketing: false,
        reminders: false,
      },
      privacy: {
        profileVisibility: "private",
        activityTracking: false,
        dataSharing: false,
        analytics: false,
      },
      learning: {
        difficulty: "intermediate",
        pace: "normal",
        reminders: false,
        streakNotifications: false,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
      },
    },
  };

  private static readonly MINIMAL_PROGRESS: Partial<ProgressSummary> = {
    userId: "offline-user",
    overallMastery: 0,
    totalTopics: 0,
    masteredTopics: 0,
    topicMasteries: {},
    recentAttempts: [],
    learningStreak: 0,
    totalStudyTimeMs: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracyRate: 0,
    weeklyProgress: [],
    topicProgress: [],
    milestones: [],
    recommendations: [],
    consecutiveDays: 0,
  };

  static getMinimalUserProfile(): UserProfile {
    return {
      ...this.MINIMAL_USER_PROFILE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      version: 1,
    } as UserProfile;
  }

  static getMinimalPreferences(): UserPreferences {
    return {
      ...this.MINIMAL_PREFERENCES,
      updatedAt: new Date(),
    } as UserPreferences;
  }

  static getMinimalProgress(): ProgressSummary {
    return {
      ...this.MINIMAL_PROGRESS,
      lastActiveDate: new Date(),
      generatedAt: new Date(),
    } as ProgressSummary;
  }

  static getMinimalActivity(): ActivitySummary {
    return {
      userId: "offline-user",
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      totalActivities: 0,
      activityBreakdown: {} as Record<string, number>,
      sessionCount: 0,
      totalSessionTime: 0,
      averageSessionTime: 0,
      deviceBreakdown: {},
      platformBreakdown: {},
      hourlyDistribution: {},
      dailyDistribution: {},
      topTopics: [],
      engagementMetrics: {
        dailyActiveStreak: 0,
        weeklyActiveStreak: 0,
        averageSessionLength: 0,
        averageSessionDuration: 0,
        sessionsPerDay: 0,
        activitiesPerSession: 0,
        returnRate: 0,
        engagementScore: 0,
        churnRisk: "low",
      },
      behaviorPatterns: [],
      generatedAt: new Date(),
    } as ActivitySummary;
  }
}

// ============================================================================
// Graceful Degradation Manager
// ============================================================================

export class GracefulDegradationManager {
  private state: DegradationState;
  private cacheManager: CachedDataManager;
  private config: DegradationConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stateChangeCallbacks: ((state: DegradationState) => void)[] = [];

  constructor(config: Partial<DegradationConfig> = {}) {
    this.config = {
      enableCachedFallbacks: true,
      enableOfflineMode: true,
      enableMinimalMode: true,
      cacheExpirationMs: 5 * 60 * 1000,
      staleDataThresholdMs: 15 * 60 * 1000,
      maxCacheSize: 100,
      fallbackDataTTL: 60 * 60 * 1000,
      ...config,
    };

    this.cacheManager = new CachedDataManager(this.config);

    this.state = {
      mode: "normal",
      reason: "Service is healthy",
      startTime: new Date(),
      affectedFeatures: [],
      availableFeatures: ["all"],
      cacheStatus: "fresh",
    };

    this.startHealthMonitoring();
  }

  // ============================================================================
  // State Management
  // ============================================================================

  enterDegradedMode(reason: string, affectedFeatures: string[] = []): void {
    if (this.state.mode === "normal") {
      this.state = {
        mode: "degraded",
        reason,
        startTime: new Date(),
        affectedFeatures,
        availableFeatures: this.getAvailableFeatures("degraded"),
        cacheStatus: this.getCacheStatus(),
      };

      console.warn("[GracefulDegradation] Entered degraded mode:", {
        reason,
        affectedFeatures,
        availableFeatures: this.state.availableFeatures,
      });

      this.notifyStateChange();
    }
  }

  enterOfflineMode(reason: string = "Network unavailable"): void {
    this.state = {
      mode: "offline",
      reason,
      startTime: new Date(),
      affectedFeatures: ["real-time-updates", "data-sync", "new-data-fetch"],
      availableFeatures: this.getAvailableFeatures("offline"),
      cacheStatus: this.getCacheStatus(),
    };

    console.warn("[GracefulDegradation] Entered offline mode:", {
      reason,
      availableFeatures: this.state.availableFeatures,
    });

    this.notifyStateChange();
  }

  enterMinimalMode(reason: string = "Service critically degraded"): void {
    this.state = {
      mode: "minimal",
      reason,
      startTime: new Date(),
      affectedFeatures: [
        "user-data",
        "progress-tracking",
        "activity-monitoring",
      ],
      availableFeatures: this.getAvailableFeatures("minimal"),
      cacheStatus: "unavailable",
    };

    console.error("[GracefulDegradation] Entered minimal mode:", {
      reason,
      availableFeatures: this.state.availableFeatures,
    });

    this.notifyStateChange();
  }

  exitDegradedMode(): void {
    if (this.state.mode !== "normal") {
      const previousMode = this.state.mode;

      this.state = {
        mode: "normal",
        reason: "Service recovered",
        startTime: new Date(),
        affectedFeatures: [],
        availableFeatures: ["all"],
        cacheStatus: "fresh",
      };

      console.log("[GracefulDegradation] Exited degraded mode:", {
        previousMode,
        duration: Date.now() - this.state.startTime.getTime(),
      });

      this.notifyStateChange();
    }
  }

  // ============================================================================
  // Data Access with Fallbacks
  // ============================================================================

  async getUserProfile(
    userId: string,
    fetchFn: () => Promise<UserProfile>,
  ): Promise<UserProfile> {
    const cacheKey = `user-profile:${userId}`;

    try {
      // Try to fetch fresh data if in normal mode
      if (this.state.mode === "normal") {
        const profile = await fetchFn();
        this.cacheManager.set(cacheKey, profile);
        return profile;
      }

      // In degraded mode, try cache first
      const cached = this.cacheManager.get<UserProfile>(cacheKey);
      if (
        cached.data &&
        (cached.status === "fresh" || cached.status === "stale")
      ) {
        return cached.data;
      }

      // Try to fetch if cache is expired but we're not in minimal mode
      if (this.state.mode === "degraded") {
        try {
          const profile = await fetchFn();
          this.cacheManager.set(cacheKey, profile);
          return profile;
        } catch {
          // Fall through to fallback
        }
      }

      // Use cached data even if expired
      if (cached.data) {
        return cached.data;
      }

      // Last resort: minimal fallback
      return FallbackDataProvider.getMinimalUserProfile();
    } catch {
      // Try cached data first
      const cached = this.cacheManager.get<UserProfile>(cacheKey);
      if (cached.data) {
        return cached.data;
      }

      // Fallback to minimal data
      return FallbackDataProvider.getMinimalUserProfile();
    }
  }

  async getUserPreferences(
    userId: string,
    fetchFn: () => Promise<UserPreferences>,
  ): Promise<UserPreferences> {
    const cacheKey = `user-preferences:${userId}`;

    try {
      if (this.state.mode === "normal") {
        const preferences = await fetchFn();
        this.cacheManager.set(cacheKey, preferences);
        return preferences;
      }

      const cached = this.cacheManager.get<UserPreferences>(cacheKey);
      if (
        cached.data &&
        (cached.status === "fresh" || cached.status === "stale")
      ) {
        return cached.data;
      }

      if (this.state.mode === "degraded") {
        try {
          const preferences = await fetchFn();
          this.cacheManager.set(cacheKey, preferences);
          return preferences;
        } catch {
          // Fall through to fallback
        }
      }

      if (cached.data) {
        return cached.data;
      }

      return FallbackDataProvider.getMinimalPreferences();
    } catch {
      const cached = this.cacheManager.get<UserPreferences>(cacheKey);
      if (cached.data) {
        return cached.data;
      }

      return FallbackDataProvider.getMinimalPreferences();
    }
  }

  async getProgressSummary(
    userId: string,
    fetchFn: () => Promise<ProgressSummary>,
  ): Promise<ProgressSummary> {
    const cacheKey = `progress-summary:${userId}`;

    try {
      if (this.state.mode === "normal") {
        const progress = await fetchFn();
        this.cacheManager.set(cacheKey, progress);
        return progress;
      }

      const cached = this.cacheManager.get<ProgressSummary>(cacheKey);
      if (
        cached.data &&
        (cached.status === "fresh" || cached.status === "stale")
      ) {
        return cached.data;
      }

      if (this.state.mode === "degraded") {
        try {
          const progress = await fetchFn();
          this.cacheManager.set(cacheKey, progress);
          return progress;
        } catch {
          // Fall through to fallback
        }
      }

      if (cached.data) {
        return cached.data;
      }

      return FallbackDataProvider.getMinimalProgress();
    } catch {
      const cached = this.cacheManager.get<ProgressSummary>(cacheKey);
      if (cached.data) {
        return cached.data;
      }

      return FallbackDataProvider.getMinimalProgress();
    }
  }

  // ============================================================================
  // Mutation Queuing for Offline Mode
  // ============================================================================

  private mutationQueue: Array<{
    id: string;
    type: string;
    data: unknown;
    timestamp: Date;
    retryCount: number;
  }> = [];

  queueMutation(type: string, data: unknown): string {
    const id = crypto.randomUUID();

    this.mutationQueue.push({
      id,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    });

    console.log("[GracefulDegradation] Queued mutation:", { id, type });
    return id;
  }

  async processMutationQueue(
    executeFn: (mutation: { type: string; data: unknown }) => Promise<void>,
  ): Promise<void> {
    if (this.state.mode !== "normal") {
      console.log(
        "[GracefulDegradation] Skipping mutation queue processing - not in normal mode",
      );
      return;
    }

    const toProcess = [...this.mutationQueue];
    this.mutationQueue = [];

    console.log(
      `[GracefulDegradation] Processing ${toProcess.length} queued mutations`,
    );

    for (const mutation of toProcess) {
      try {
        await executeFn({ type: mutation.type, data: mutation.data });
        console.log(
          "[GracefulDegradation] Successfully processed mutation:",
          mutation.id,
        );
      } catch (error) {
        console.error(
          "[GracefulDegradation] Failed to process mutation:",
          mutation.id,
          error,
        );

        // Re-queue if retry count is low
        if (mutation.retryCount < 3) {
          this.mutationQueue.push({
            ...mutation,
            retryCount: mutation.retryCount + 1,
          });
        }
      }
    }
  }

  getMutationQueueSize(): number {
    return this.mutationQueue.length;
  }

  clearMutationQueue(): void {
    this.mutationQueue = [];
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  private startHealthMonitoring(): void {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return;
    }

    // Monitor network status
    window.addEventListener("online", () => {
      if (this.state.mode === "offline") {
        this.enterDegradedMode("Network restored, checking service health");
      }
    });

    window.addEventListener("offline", () => {
      this.enterOfflineMode("Network connection lost");
    });

    // Initial network check
    if (!navigator.onLine) {
      this.enterOfflineMode("Network unavailable at startup");
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getAvailableFeatures(mode: DegradationState["mode"]): string[] {
    switch (mode) {
      case "normal":
        return ["all"];
      case "degraded":
        return ["cached-data", "basic-ui", "offline-queue"];
      case "offline":
        return ["cached-data", "basic-ui", "offline-queue", "minimal-features"];
      case "minimal":
        return ["basic-ui", "minimal-features"];
      default:
        return [];
    }
  }

  private getCacheStatus(): DegradationState["cacheStatus"] {
    const stats = this.cacheManager.getStats();

    if (stats.size === 0) {
      return "unavailable";
    }

    if (stats.expiredEntries > stats.freshEntries + stats.staleEntries) {
      return "expired";
    }

    if (stats.staleEntries > stats.freshEntries) {
      return "stale";
    }

    return "fresh";
  }

  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(this.state);
      } catch (error) {
        console.error(
          "[GracefulDegradation] Error in state change callback:",
          error,
        );
      }
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getState(): DegradationState {
    return { ...this.state };
  }

  isFeatureAvailable(feature: string): boolean {
    return (
      this.state.availableFeatures.includes("all") ||
      this.state.availableFeatures.includes(feature)
    );
  }

  getCacheStats() {
    return this.cacheManager.getStats();
  }

  onStateChange(callback: (state: DegradationState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  offStateChange(callback: (state: DegradationState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.stateChangeCallbacks = [];
    this.cacheManager.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const gracefulDegradationManager = new GracefulDegradationManager();

// ============================================================================
// React Hook
// ============================================================================

export function useGracefulDegradation() {
  const [state, setState] = React.useState<DegradationState>(
    gracefulDegradationManager.getState(),
  );

  React.useEffect(() => {
    const handleStateChange = (newState: DegradationState) => {
      setState(newState);
    };

    gracefulDegradationManager.onStateChange(handleStateChange);

    return () => {
      gracefulDegradationManager.offStateChange(handleStateChange);
    };
  }, []);

  return {
    state,
    isFeatureAvailable: gracefulDegradationManager.isFeatureAvailable.bind(
      gracefulDegradationManager,
    ),
    getCacheStats: gracefulDegradationManager.getCacheStats.bind(
      gracefulDegradationManager,
    ),
    getMutationQueueSize: gracefulDegradationManager.getMutationQueueSize.bind(
      gracefulDegradationManager,
    ),
  };
}
