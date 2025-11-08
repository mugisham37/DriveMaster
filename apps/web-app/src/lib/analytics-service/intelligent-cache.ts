import { QueryClient } from "@tanstack/react-query";

// ============================================================================
// Intelligent Caching System for Analytics Data
// ============================================================================

export interface CacheStrategy {
  key: string;
  ttl: number; // Time to live in milliseconds
  staleTime: number; // Time before data is considered stale
  priority: "critical" | "high" | "normal" | "low";
  refreshStrategy: "background" | "onDemand" | "scheduled";
  dependencies?: string[]; // Other cache keys this depends on
  warmupTriggers?: string[]; // Events that should trigger cache warming
}

export interface CacheWarmingConfig {
  enabled: boolean;
  strategies: CacheStrategy[];
  maxConcurrentWarmups: number;
  warmupDelay: number;
  backgroundRefreshInterval: number;
}

export class IntelligentCache {
  private queryClient: QueryClient;
  private strategies: Map<string, CacheStrategy> = new Map();
  private warmupQueue: Set<string> = new Set();
  private activeWarmups: Set<string> = new Set();
  private backgroundRefreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: CacheWarmingConfig;

  constructor(
    queryClient: QueryClient,
    config: Partial<CacheWarmingConfig> = {},
  ) {
    this.queryClient = queryClient;
    this.config = {
      enabled: true,
      strategies: [],
      maxConcurrentWarmups: 3,
      warmupDelay: 1000,
      backgroundRefreshInterval: 300000, // 5 minutes
      ...config,
    };

    this.initializeStrategies();
    this.startBackgroundRefresh();
  }

  /**
   * Initialize default caching strategies
   */
  private initializeStrategies(): void {
    const defaultStrategies: CacheStrategy[] = [
      // Critical real-time metrics
      {
        key: "analytics-engagement-realtime",
        ttl: 60000, // 1 minute
        staleTime: 30000, // 30 seconds
        priority: "critical",
        refreshStrategy: "background",
        warmupTriggers: ["dashboard-load", "user-activity"],
      },

      // Important dashboard metrics
      {
        key: "analytics-dashboard-summary",
        ttl: 300000, // 5 minutes
        staleTime: 120000, // 2 minutes
        priority: "high",
        refreshStrategy: "background",
        dependencies: ["analytics-engagement-realtime"],
        warmupTriggers: ["dashboard-load"],
      },

      // Progress metrics
      {
        key: "analytics-progress-metrics",
        ttl: 600000, // 10 minutes
        staleTime: 300000, // 5 minutes
        priority: "high",
        refreshStrategy: "onDemand",
        warmupTriggers: ["progress-view"],
      },

      // Content performance
      {
        key: "analytics-content-performance",
        ttl: 1800000, // 30 minutes
        staleTime: 900000, // 15 minutes
        priority: "normal",
        refreshStrategy: "scheduled",
        warmupTriggers: ["content-analysis"],
      },

      // System metrics
      {
        key: "analytics-system-metrics",
        ttl: 300000, // 5 minutes
        staleTime: 180000, // 3 minutes
        priority: "normal",
        refreshStrategy: "background",
        warmupTriggers: ["admin-dashboard"],
      },

      // Historical data
      {
        key: "analytics-historical-data",
        ttl: 3600000, // 1 hour
        staleTime: 1800000, // 30 minutes
        priority: "low",
        refreshStrategy: "onDemand",
      },

      // User behavior insights
      {
        key: "analytics-behavior-insights",
        ttl: 1800000, // 30 minutes
        staleTime: 900000, // 15 minutes
        priority: "normal",
        refreshStrategy: "scheduled",
        dependencies: [
          "analytics-engagement-realtime",
          "analytics-progress-metrics",
        ],
      },
    ];

    defaultStrategies.forEach((strategy) => {
      this.strategies.set(strategy.key, strategy);
    });
  }

  /**
   * Get cache strategy for a given key
   */
  getStrategy(key: string): CacheStrategy | undefined {
    // Try exact match first
    const strategy = this.strategies.get(key);
    if (strategy) return strategy;

    // Try pattern matching
    for (const [strategyKey, strategyValue] of this.strategies.entries()) {
      if (key.startsWith(strategyKey)) {
        return strategyValue;
      }
    }

    return undefined;
  }

  /**
   * Set data in cache with intelligent strategy
   */
  setData(
    key: string,
    data: unknown,
    customStrategy?: Partial<CacheStrategy>,
  ): void {
    const strategy = this.getStrategy(key);
    const finalStrategy: CacheStrategy | undefined =
      strategy && customStrategy
        ? ({ ...strategy, ...customStrategy } as CacheStrategy)
        : strategy;

    if (finalStrategy) {
      this.queryClient.setQueryData([key], data, {
        updatedAt: Date.now(),
      });

      // Schedule background refresh if needed
      if (finalStrategy.refreshStrategy === "background") {
        this.scheduleBackgroundRefresh(key, finalStrategy);
      }
    } else {
      // Fallback to default caching
      this.queryClient.setQueryData([key], data);
    }
  }

  /**
   * Get data from cache with freshness check
   */
  getData(key: string): {
    data: unknown;
    isStale: boolean;
    age: number;
  } | null {
    const queryData = this.queryClient.getQueryData([key]);
    const queryState = this.queryClient.getQueryState([key]);

    if (!queryData || !queryState) {
      return null;
    }

    const age = Date.now() - (queryState.dataUpdatedAt || 0);
    const strategy = this.getStrategy(key);
    const isStale = strategy ? age > strategy.staleTime : age > 300000; // 5 min default

    return {
      data: queryData,
      isStale,
      age,
    };
  }

  /**
   * Warm up cache for specific keys
   */
  async warmupCache(keys: string[], trigger?: string): Promise<void> {
    if (!this.config.enabled) return;

    const relevantKeys = trigger
      ? keys.filter((key) => {
          const strategy = this.getStrategy(key);
          return strategy?.warmupTriggers?.includes(trigger);
        })
      : keys;

    for (const key of relevantKeys) {
      if (
        !this.activeWarmups.has(key) &&
        this.activeWarmups.size < this.config.maxConcurrentWarmups
      ) {
        this.warmupQueue.add(key);
      }
    }

    this.processWarmupQueue();
  }

  /**
   * Process the warmup queue
   */
  private async processWarmupQueue(): Promise<void> {
    while (
      this.warmupQueue.size > 0 &&
      this.activeWarmups.size < this.config.maxConcurrentWarmups
    ) {
      const keyValue = this.warmupQueue.values().next().value;
      if (!keyValue) break;

      const key: string = keyValue;
      this.warmupQueue.delete(key);

      if (!this.activeWarmups.has(key)) {
        this.activeWarmups.add(key);

        try {
          await this.warmupSingleKey(key);
        } catch (error) {
          console.warn(`Cache warmup failed for key: ${key}`, error);
        } finally {
          this.activeWarmups.delete(key);

          // Small delay to prevent overwhelming the server
          if (this.warmupQueue.size > 0) {
            setTimeout(
              () => this.processWarmupQueue(),
              this.config.warmupDelay,
            );
          }
        }
      }
    }
  }

  /**
   * Warm up a single cache key
   */
  private async warmupSingleKey(key: string): Promise<void> {
    const cached = this.getData(key);
    const strategy = this.getStrategy(key);

    // Skip if data is fresh
    if (cached && !cached.isStale) {
      return;
    }

    // Check dependencies first
    if (strategy?.dependencies) {
      for (const depKey of strategy.dependencies) {
        const depData = this.getData(depKey);
        if (!depData || depData.isStale) {
          await this.warmupSingleKey(depKey);
        }
      }
    }

    // Fetch fresh data (this would be implemented by the analytics client)
    try {
      await this.queryClient.prefetchQuery({
        queryKey: [key],
        queryFn: () => this.fetchDataForKey(key),
        staleTime: strategy?.staleTime || 300000,
      });
    } catch (error) {
      console.warn(`Failed to warmup cache for key: ${key}`, error);
    }
  }

  /**
   * Fetch data for a specific key (to be implemented by analytics client)
   */
  private async fetchDataForKey(key: string): Promise<unknown> {
    throw new Error(`fetchDataForKey must be implemented for key: ${key}`);
  }

  /**
   * Schedule background refresh for a key
   */
  private scheduleBackgroundRefresh(
    key: string,
    strategy: CacheStrategy,
  ): void {
    // Clear existing timer
    const existingTimer = this.backgroundRefreshTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new refresh
    const timer = setTimeout(async () => {
      try {
        await this.warmupSingleKey(key);

        // Reschedule if strategy is still background
        const currentStrategy = this.getStrategy(key);
        if (currentStrategy?.refreshStrategy === "background") {
          this.scheduleBackgroundRefresh(key, currentStrategy);
        }
      } catch (error) {
        console.warn(`Background refresh failed for key: ${key}`, error);
      }
    }, strategy.staleTime);

    this.backgroundRefreshTimers.set(key, timer);
  }

  /**
   * Start background refresh process
   */
  private startBackgroundRefresh(): void {
    if (!this.config.enabled) return;

    setInterval(() => {
      const backgroundKeys = Array.from(this.strategies.entries())
        .filter(([, strategy]) => strategy.refreshStrategy === "background")
        .map(([key]) => key);

      if (backgroundKeys.length > 0) {
        this.warmupCache(backgroundKeys);
      }
    }, this.config.backgroundRefreshInterval);
  }

  /**
   * Invalidate cache entries based on patterns
   */
  invalidateByPattern(pattern: string): void {
    const queries = this.queryClient.getQueryCache().getAll();

    queries.forEach((query) => {
      const queryKey = query.queryKey[0] as string;
      if (queryKey && queryKey.includes(pattern)) {
        this.queryClient.invalidateQueries({ queryKey: query.queryKey });
      }
    });
  }

  /**
   * Invalidate dependent caches
   */
  invalidateDependents(key: string): void {
    const dependentKeys = Array.from(this.strategies.entries())
      .filter(([, strategy]) => strategy.dependencies?.includes(key))
      .map(([strategyKey]) => strategyKey);

    dependentKeys.forEach((depKey) => {
      this.queryClient.invalidateQueries({ queryKey: [depKey] });
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalQueries: number;
    staleQueries: number;
    activeWarmups: number;
    queuedWarmups: number;
    backgroundRefreshers: number;
    cacheHitRate: number;
  } {
    const queries = this.queryClient.getQueryCache().getAll();
    const now = Date.now();

    let staleCount = 0;
    let hitCount = 0;
    let totalAccess = 0;

    queries.forEach((query) => {
      const state = query.state;
      if (state.dataUpdatedAt) {
        const age = now - state.dataUpdatedAt;
        const key = query.queryKey[0] as string;
        const strategy = this.getStrategy(key);
        const staleTime = strategy?.staleTime || 300000;

        if (age > staleTime) {
          staleCount++;
        }

        // Approximate cache hit rate based on fetch count vs success count
        if (state.fetchStatus === "idle" && state.data) {
          hitCount++;
        }
        totalAccess++;
      }
    });

    return {
      totalQueries: queries.length,
      staleQueries: staleCount,
      activeWarmups: this.activeWarmups.size,
      queuedWarmups: this.warmupQueue.size,
      backgroundRefreshers: this.backgroundRefreshTimers.size,
      cacheHitRate: totalAccess > 0 ? hitCount / totalAccess : 0,
    };
  }

  /**
   * Add or update a caching strategy
   */
  addStrategy(strategy: CacheStrategy): void {
    this.strategies.set(strategy.key, strategy);
  }

  /**
   * Remove a caching strategy
   */
  removeStrategy(key: string): void {
    this.strategies.delete(key);

    // Clear any associated timers
    const timer = this.backgroundRefreshTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.backgroundRefreshTimers.delete(key);
    }
  }

  /**
   * Clear all cache and stop background processes
   */
  destroy(): void {
    // Clear all background refresh timers
    this.backgroundRefreshTimers.forEach((timer) => clearTimeout(timer));
    this.backgroundRefreshTimers.clear();

    // Clear warmup queue and active warmups
    this.warmupQueue.clear();
    this.activeWarmups.clear();

    // Clear strategies
    this.strategies.clear();
  }
}

// Factory function
export const createIntelligentCache = (
  queryClient: QueryClient,
  config?: Partial<CacheWarmingConfig>,
): IntelligentCache => {
  return new IntelligentCache(queryClient, config);
};

export default IntelligentCache;
