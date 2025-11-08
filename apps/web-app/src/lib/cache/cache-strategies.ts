/**
 * Intelligent Cache Management Layer
 *
 * This module implements different caching strategies (cache-first, network-first,
 * stale-while-revalidate) with cache tagging, pattern-based invalidation,
 * and intelligent prefetching based on user navigation patterns.
 */

import {
  QueryClient,
  QueryKey,
  QueryFunction,
  UseQueryOptions,
} from "@tanstack/react-query";
import { userServiceClient } from "@/lib/user-service";
import { queryKeys, CACHE_TIMES, GC_TIMES } from "./user-service-cache";
import type { UserServiceError } from "@/types/user-service";

// ============================================================================
// Cache Strategy Types
// ============================================================================

export type CacheStrategy =
  | "cache-first"
  | "network-first"
  | "stale-while-revalidate"
  | "network-only";

export interface CacheStrategyConfig {
  strategy: CacheStrategy;
  staleTime?: number;
  gcTime?: number;
  maxAge?: number;
  tags?: string[];
  priority?: "high" | "medium" | "low";
  networkTimeout?: number;
  retryOnStale?: boolean;
}

export interface CacheTag {
  name: string;
  pattern?: RegExp;
  dependencies?: string[];
  ttl: number;
}

export interface NavigationPattern {
  from: string;
  to: string;
  frequency: number;
  lastSeen: Date;
  prefetchTargets: string[];
}

// ============================================================================
// Cache Strategy Implementation
// ============================================================================

export class IntelligentCacheManager {
  private queryClient: QueryClient;
  private cacheTags: Map<string, CacheTag> = new Map();
  private navigationPatterns: Map<string, NavigationPattern> = new Map();
  private prefetchQueue: Set<string> = new Set();
  private strategyConfigs: Map<string, CacheStrategyConfig> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.initializeDefaultStrategies();
    this.loadNavigationPatterns();
  }

  /**
   * Initialize default caching strategies for different data types
   */
  private initializeDefaultStrategies() {
    // User profile - cache-first (stable data)
    this.setStrategyConfig("user-profile", {
      strategy: "cache-first",
      staleTime: CACHE_TIMES.USER_PROFILE,
      gcTime: GC_TIMES.MEDIUM,
      tags: ["user", "profile"],
      priority: "high",
    });

    // User preferences - cache-first (user-controlled data)
    this.setStrategyConfig("user-preferences", {
      strategy: "cache-first",
      staleTime: CACHE_TIMES.USER_PREFERENCES,
      gcTime: GC_TIMES.MEDIUM,
      tags: ["user", "preferences"],
      priority: "high",
    });

    // Progress data - stale-while-revalidate (frequently updated)
    this.setStrategyConfig("progress", {
      strategy: "stale-while-revalidate",
      staleTime: CACHE_TIMES.PROGRESS_SUMMARY,
      gcTime: GC_TIMES.SHORT,
      tags: ["user", "progress"],
      priority: "high",
      retryOnStale: true,
    });

    // Skill mastery - stale-while-revalidate (learning progress)
    this.setStrategyConfig("skill-mastery", {
      strategy: "stale-while-revalidate",
      staleTime: CACHE_TIMES.SKILL_MASTERY,
      gcTime: GC_TIMES.SHORT,
      tags: ["user", "progress", "mastery"],
      priority: "high",
    });

    // Activity data - network-first (real-time insights)
    this.setStrategyConfig("activity", {
      strategy: "network-first",
      staleTime: CACHE_TIMES.ACTIVITY_SUMMARY,
      gcTime: GC_TIMES.SHORT,
      tags: ["user", "activity"],
      priority: "medium",
      networkTimeout: 5000,
    });

    // Engagement metrics - stale-while-revalidate (analytics)
    this.setStrategyConfig("engagement", {
      strategy: "stale-while-revalidate",
      staleTime: CACHE_TIMES.ENGAGEMENT_METRICS,
      gcTime: GC_TIMES.SHORT,
      tags: ["user", "activity", "engagement"],
      priority: "medium",
    });

    // GDPR data - cache-first (compliance data)
    this.setStrategyConfig("gdpr", {
      strategy: "cache-first",
      staleTime: CACHE_TIMES.GDPR_CONSENT,
      gcTime: GC_TIMES.LONG,
      tags: ["user", "gdpr", "compliance"],
      priority: "low",
    });

    // Service health - network-first (monitoring)
    this.setStrategyConfig("service-health", {
      strategy: "network-first",
      staleTime: CACHE_TIMES.SERVICE_HEALTH,
      gcTime: GC_TIMES.SHORT,
      tags: ["service", "health"],
      priority: "low",
      networkTimeout: 3000,
    });
  }

  /**
   * Set cache strategy configuration for a data type
   */
  setStrategyConfig(dataType: string, config: CacheStrategyConfig) {
    this.strategyConfigs.set(dataType, config);

    // Register cache tags
    if (config.tags) {
      config.tags.forEach((tagName) => {
        if (!this.cacheTags.has(tagName)) {
          this.cacheTags.set(tagName, {
            name: tagName,
            ttl: config.staleTime ?? 0,
          });
        }
      });
    }
  }

  /**
   * Get cache strategy configuration for a data type
   */
  getStrategyConfig(dataType: string): CacheStrategyConfig | undefined {
    return this.strategyConfigs.get(dataType);
  }

  /**
   * Execute query with intelligent caching strategy
   */
  async executeQuery<TData>(
    queryKey: QueryKey,
    queryFn: QueryFunction<TData>,
    dataType: string,
    options?: Partial<UseQueryOptions<TData, UserServiceError>>,
  ): Promise<TData> {
    const config = this.getStrategyConfig(dataType);
    if (!config) {
      // Fallback to default React Query behavior
      return this.queryClient.fetchQuery({ queryKey, queryFn, ...options });
    }

    switch (config.strategy) {
      case "cache-first":
        return this.executeCacheFirst(queryKey, queryFn, config, options);

      case "network-first":
        return this.executeNetworkFirst(queryKey, queryFn, config, options);

      case "stale-while-revalidate":
        return this.executeStaleWhileRevalidate(
          queryKey,
          queryFn,
          config,
          options,
        );

      case "network-only":
        return this.executeNetworkOnly(queryKey, queryFn, config, options);

      default:
        return this.queryClient.fetchQuery({ queryKey, queryFn, ...options });
    }
  }

  /**
   * Cache-first strategy: Return cached data if available, otherwise fetch
   */
  private async executeCacheFirst<TData>(
    queryKey: QueryKey,
    queryFn: QueryFunction<TData>,
    config: CacheStrategyConfig,
    options?: Partial<UseQueryOptions<TData, UserServiceError>>,
  ): Promise<TData> {
    const cachedData = this.queryClient.getQueryData<TData>(queryKey);
    const queryState = this.queryClient.getQueryState(queryKey);

    // Return cached data if it's fresh
    if (
      cachedData &&
      queryState &&
      !this.isStale(queryState.dataUpdatedAt, config.staleTime)
    ) {
      return cachedData;
    }

    // Fetch fresh data
    return this.queryClient.fetchQuery({
      queryKey,
      queryFn,
      ...(config.staleTime !== undefined && { staleTime: config.staleTime }),
      ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
      ...options,
    });
  }

  /**
   * Network-first strategy: Always try network first, fallback to cache
   */
  private async executeNetworkFirst<TData>(
    queryKey: QueryKey,
    queryFn: QueryFunction<TData>,
    config: CacheStrategyConfig,
    options?: Partial<UseQueryOptions<TData, UserServiceError>>,
  ): Promise<TData> {
    try {
      // Try network first with timeout
      const networkPromise = this.queryClient.fetchQuery({
        queryKey,
        queryFn,
        ...(config.staleTime !== undefined && { staleTime: config.staleTime }),
        ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
        ...options,
      });

      if (config.networkTimeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Network timeout")),
            config.networkTimeout,
          );
        });

        return await Promise.race([networkPromise, timeoutPromise]);
      }

      return await networkPromise;
    } catch (error) {
      // Fallback to cached data if network fails
      const cachedData = this.queryClient.getQueryData<TData>(queryKey);
      if (cachedData) {
        console.warn("Network request failed, using cached data:", error);
        return cachedData;
      }
      throw error;
    }
  }

  /**
   * Stale-while-revalidate strategy: Return stale data immediately, revalidate in background
   */
  private async executeStaleWhileRevalidate<TData>(
    queryKey: QueryKey,
    queryFn: QueryFunction<TData>,
    config: CacheStrategyConfig,
    options?: Partial<UseQueryOptions<TData, UserServiceError>>,
  ): Promise<TData> {
    const cachedData = this.queryClient.getQueryData<TData>(queryKey);
    const queryState = this.queryClient.getQueryState(queryKey);

    // If we have cached data, return it immediately
    if (cachedData) {
      // Revalidate in background if stale
      if (
        queryState &&
        this.isStale(queryState.dataUpdatedAt, config.staleTime)
      ) {
        // Background revalidation
        this.queryClient
          .fetchQuery({
            queryKey,
            queryFn,
            ...(config.staleTime !== undefined && {
              staleTime: config.staleTime,
            }),
            ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
            ...options,
          })
          .catch((error) => {
            console.warn("Background revalidation failed:", error);
          });
      }

      return cachedData;
    }

    // No cached data, fetch fresh
    return this.queryClient.fetchQuery({
      queryKey,
      queryFn,
      ...(config.staleTime !== undefined && { staleTime: config.staleTime }),
      ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
      ...options,
    });
  }

  /**
   * Network-only strategy: Always fetch from network, don't use cache
   */
  private async executeNetworkOnly<TData>(
    queryKey: QueryKey,
    queryFn: QueryFunction<TData>,
    config: CacheStrategyConfig,
    options?: Partial<UseQueryOptions<TData, UserServiceError>>,
  ): Promise<TData> {
    // Remove existing cache entry
    this.queryClient.removeQueries({ queryKey });

    return this.queryClient.fetchQuery({
      queryKey,
      queryFn,
      staleTime: 0, // Always consider stale
      gcTime: config.gcTime || GC_TIMES.SHORT,
      ...options,
    });
  }

  /**
   * Check if data is stale based on timestamp and stale time
   */
  private isStale(
    dataUpdatedAt: number | undefined,
    staleTime: number = 0,
  ): boolean {
    if (!dataUpdatedAt) return true;
    return Date.now() - dataUpdatedAt > staleTime;
  }

  // ============================================================================
  // Cache Tagging and Pattern-based Invalidation
  // ============================================================================

  /**
   * Register a cache tag with pattern matching
   */
  registerCacheTag(tag: CacheTag) {
    this.cacheTags.set(tag.name, tag);
  }

  /**
   * Invalidate caches by tag
   */
  async invalidateByTag(
    tagName: string,
    options: { refetchActive?: boolean } = {},
  ) {
    const tag = this.cacheTags.get(tagName);
    if (!tag) return;

    const { refetchActive = true } = options;

    if (tag.pattern) {
      // Pattern-based invalidation
      await this.queryClient.invalidateQueries({
        predicate: (query) => {
          const keyString = JSON.stringify(query.queryKey);
          return tag.pattern!.test(keyString);
        },
        refetchType: refetchActive ? "active" : "none",
      });
    } else {
      // Tag-based invalidation (look for tag in query key)
      await this.queryClient.invalidateQueries({
        predicate: (query) => {
          const keyString = JSON.stringify(query.queryKey);
          return keyString.includes(tagName);
        },
        refetchType: refetchActive ? "active" : "none",
      });
    }

    // Invalidate dependent tags
    if (tag.dependencies) {
      for (const depTag of tag.dependencies) {
        await this.invalidateByTag(depTag, options);
      }
    }
  }

  /**
   * Invalidate caches by pattern
   */
  async invalidateByPattern(
    pattern: RegExp,
    options: { refetchActive?: boolean } = {},
  ) {
    const { refetchActive = true } = options;

    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const keyString = JSON.stringify(query.queryKey);
        return pattern.test(keyString);
      },
      refetchType: refetchActive ? "active" : "none",
    });
  }

  /**
   * Invalidate all caches for a specific user
   */
  async invalidateUserCaches(
    userId: string,
    options: { refetchActive?: boolean } = {},
  ) {
    await this.invalidateByPattern(new RegExp(`"${userId}"`), options);
  }

  // ============================================================================
  // Navigation Pattern Learning and Prefetching
  // ============================================================================

  /**
   * Record navigation pattern for learning
   */
  recordNavigation(_from: string, to: string) {
    const patternKey = `${_from}->${to}`;
    const existing = this.navigationPatterns.get(patternKey);

    if (existing) {
      existing.frequency += 1;
      existing.lastSeen = new Date();
    } else {
      this.navigationPatterns.set(patternKey, {
        from: _from,
        to,
        frequency: 1,
        lastSeen: new Date(),
        prefetchTargets: this.getPrefetchTargetsForRoute(to),
      });
    }

    // Persist patterns to localStorage
    this.saveNavigationPatterns();

    // Trigger prefetching based on pattern
    this.triggerPredictivePrefetch(_from, to);
  }

  /**
   * Get prefetch targets for a specific route
   */
  private getPrefetchTargetsForRoute(route: string): string[] {
    const prefetchMap: Record<string, string[]> = {
      "/dashboard": ["progress", "activity", "engagement"],
      "/profile": ["user-profile", "user-preferences"],
      "/progress": ["progress", "skill-mastery", "milestones"],
      "/activity": ["activity", "engagement", "insights"],
      "/settings": ["user-preferences", "gdpr"],
      "/privacy": ["gdpr", "privacy-report"],
    };

    return prefetchMap[route] || [];
  }

  /**
   * Trigger predictive prefetching based on navigation patterns
   */
  private async triggerPredictivePrefetch(_from: string, to: string) {
    // Find patterns that start with current 'to' route
    const nextPatterns = Array.from(this.navigationPatterns.values())
      .filter((pattern) => pattern.from === to)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3); // Top 3 most likely next routes

    // Prefetch data for likely next routes
    for (const pattern of nextPatterns) {
      if (pattern.frequency >= 2) {
        // Only prefetch if pattern seen at least twice
        await this.prefetchForRoute(pattern.to, pattern.prefetchTargets);
      }
    }
  }

  /**
   * Prefetch data for a specific route
   */
  private async prefetchForRoute(route: string, dataTypes: string[]) {
    // Get current user ID (this would come from auth context in real implementation)
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const prefetchPromises = dataTypes.map(async (dataType) => {
      const prefetchKey = `${route}-${dataType}-${userId}`;

      // Avoid duplicate prefetching
      if (this.prefetchQueue.has(prefetchKey)) return;
      this.prefetchQueue.add(prefetchKey);

      try {
        await this.prefetchDataType(dataType, userId);
      } catch (error) {
        console.warn(`Prefetch failed for ${dataType}:`, error);
      } finally {
        this.prefetchQueue.delete(prefetchKey);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch specific data type for user
   */
  private async prefetchDataType(dataType: string, userId: string) {
    const config = this.getStrategyConfig(dataType);
    if (!config || config.priority === "low") return; // Skip low priority prefetching

    switch (dataType) {
      case "user-profile":
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.userProfile(userId),
          queryFn: () => userServiceClient.getUser(userId),
          ...(config.staleTime !== undefined && {
            staleTime: config.staleTime,
          }),
        });
        break;

      case "progress":
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.progressSummary(userId),
          queryFn: () => userServiceClient.getProgressSummary(userId),
          ...(config.staleTime !== undefined && {
            staleTime: config.staleTime,
          }),
        });
        break;

      case "activity":
        // TODO: Implement activity insights when the method is available
        // await this.queryClient.prefetchQuery({
        //   queryKey: queryKeys.activityInsights(userId),
        //   queryFn: () => userServiceClient.generateInsights(userId),
        //   ...(config.staleTime !== undefined && { staleTime: config.staleTime })
        // })
        console.warn("Activity insights prefetch not yet implemented");
        break;

      case "engagement":
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.engagementMetrics(userId, 7),
          queryFn: () => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return userServiceClient.getEngagementMetrics(userId, {
              start: sevenDaysAgo,
              end: new Date(),
            });
          },
          ...(config.staleTime !== undefined && {
            staleTime: config.staleTime,
          }),
        });
        break;

      // Add more data types as needed
    }
  }

  /**
   * Get current user ID (placeholder - would integrate with auth context)
   */
  private getCurrentUserId(): string | null {
    // This would integrate with the auth context in a real implementation
    // For now, return null to prevent errors
    return null;
  }

  /**
   * Load navigation patterns from localStorage
   */
  private loadNavigationPatterns() {
    try {
      const stored = localStorage.getItem("user-service-navigation-patterns");
      if (stored) {
        const patterns = JSON.parse(stored);
        Object.entries(patterns).forEach(([key, pattern]) => {
          this.navigationPatterns.set(key, {
            ...(pattern as NavigationPattern),
            lastSeen: new Date((pattern as NavigationPattern).lastSeen),
          });
        });
      }
    } catch (error) {
      console.warn("Failed to load navigation patterns:", error);
    }
  }

  /**
   * Save navigation patterns to localStorage
   */
  private saveNavigationPatterns() {
    try {
      const patterns = Object.fromEntries(this.navigationPatterns.entries());
      localStorage.setItem(
        "user-service-navigation-patterns",
        JSON.stringify(patterns),
      );
    } catch (error) {
      console.warn("Failed to save navigation patterns:", error);
    }
  }

  /**
   * Clear old navigation patterns (cleanup)
   */
  cleanupOldPatterns(maxAge: number = 30 * 24 * 60 * 60 * 1000) {
    // 30 days
    const cutoff = new Date(Date.now() - maxAge);

    for (const [key, pattern] of this.navigationPatterns.entries()) {
      if (pattern.lastSeen < cutoff) {
        this.navigationPatterns.delete(key);
      }
    }

    this.saveNavigationPatterns();
  }

  // ============================================================================
  // Cache Warming and Optimization
  // ============================================================================

  /**
   * Warm cache based on user behavior patterns
   */
  async warmCacheIntelligently(userId: string, context: string = "general") {
    const config = this.getStrategyConfig(context);
    const priority = config?.priority || "medium";

    // Always warm critical data
    const criticalPromises = [
      this.prefetchDataType("user-profile", userId),
      this.prefetchDataType("user-preferences", userId),
    ];

    // Warm additional data based on priority and context
    if (priority === "high" || context === "dashboard") {
      criticalPromises.push(
        this.prefetchDataType("progress", userId),
        this.prefetchDataType("engagement", userId),
      );
    }

    await Promise.allSettled(criticalPromises);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    const queries = this.queryClient.getQueryCache().getAll();
    const userServiceQueries = queries.filter(
      (query) => query.queryKey[0] === "user-service",
    );

    return {
      totalQueries: userServiceQueries.length,
      activeQueries: userServiceQueries.filter((q) => q.getObserversCount() > 0)
        .length,
      staleQueries: userServiceQueries.filter((q) => q.isStale()).length,
      errorQueries: userServiceQueries.filter((q) => q.state.status === "error")
        .length,
      navigationPatterns: this.navigationPatterns.size,
      cacheStrategies: this.strategyConfigs.size,
      cacheTags: this.cacheTags.size,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let intelligentCacheManager: IntelligentCacheManager | null = null;

export function initializeIntelligentCacheManager(
  queryClient: QueryClient,
): IntelligentCacheManager {
  intelligentCacheManager = new IntelligentCacheManager(queryClient);
  return intelligentCacheManager;
}

export function getIntelligentCacheManager(): IntelligentCacheManager {
  if (!intelligentCacheManager) {
    throw new Error(
      "IntelligentCacheManager not initialized. Call initializeIntelligentCacheManager first.",
    );
  }
  return intelligentCacheManager;
}
