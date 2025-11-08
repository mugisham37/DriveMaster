/**
 * Cache Optimization for Content Service
 *
 * Advanced caching strategies, cache warming, and intelligent invalidation
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

import type { ContentItem, MediaAsset } from "../types";

/**
 * Advanced cache configuration with intelligent TTL
 */
export interface CacheConfig {
  // Base TTL values (in milliseconds)
  contentTTL: number;
  searchTTL: number;
  mediaTTL: number;
  userDataTTL: number;

  // Dynamic TTL based on content characteristics
  dynamicTTL: {
    published: number; // Published content can be cached longer
    draft: number; // Draft content should have shorter TTL
    popular: number; // Popular content gets longer TTL
    recent: number; // Recently created content gets shorter TTL
  };

  // Cache size limits
  maxCacheSize: number;
  maxItemSize: number;

  // Prefetch settings
  prefetchEnabled: boolean;
  prefetchBatchSize: number;
  prefetchIdleThreshold: number;
}

export const OPTIMIZED_CACHE_CONFIG: CacheConfig = {
  contentTTL: 10 * 60 * 1000, // 10 minutes
  searchTTL: 5 * 60 * 1000, // 5 minutes
  mediaTTL: 60 * 60 * 1000, // 1 hour
  userDataTTL: 30 * 60 * 1000, // 30 minutes

  dynamicTTL: {
    published: 30 * 60 * 1000, // 30 minutes for published content
    draft: 2 * 60 * 1000, // 2 minutes for draft content
    popular: 60 * 60 * 1000, // 1 hour for popular content
    recent: 5 * 60 * 1000, // 5 minutes for recent content
  },

  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxItemSize: 5 * 1024 * 1024, // 5MB per item

  prefetchEnabled: true,
  prefetchBatchSize: 5,
  prefetchIdleThreshold: 100,
};

/**
 * Intelligent cache key generator
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for content items with context
   */
  static contentItem(id: string, version?: string, userId?: string): string {
    const parts = ["content", id];
    if (version) parts.push("v", version);
    if (userId) parts.push("user", userId);
    return parts.join(":");
  }

  /**
   * Generate cache key for content lists with all parameters
   */
  static contentList(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    tags?: string[];
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    userId?: string;
  }): string {
    const normalized = {
      page: params.page || 1,
      limit: params.limit || 10,
      type: params.type || "all",
      status: params.status || "all",
      tags: params.tags?.sort().join(",") || "none",
      search: params.search || "none",
      sortBy: params.sortBy || "createdAt",
      sortOrder: params.sortOrder || "desc",
      userId: params.userId || "anonymous",
    };

    return `content:list:${Object.values(normalized).join(":")}`;
  }

  /**
   * Generate cache key for search results
   */
  static searchResults(
    query: string,
    filters?: Record<string, unknown>,
    userId?: string,
  ): string {
    const filterHash = filters ? this.hashObject(filters) : "none";
    const userContext = userId || "anonymous";
    return `search:${this.hashString(query)}:${filterHash}:${userContext}`;
  }

  /**
   * Generate cache key for media assets
   */
  static mediaAsset(id: string, variant?: string): string {
    const parts = ["media", id];
    if (variant) parts.push("variant", variant);
    return parts.join(":");
  }

  /**
   * Generate cache key for user-specific data
   */
  static userData(userId: string, dataType: string, context?: string): string {
    const parts = ["user", userId, dataType];
    if (context) parts.push(context);
    return parts.join(":");
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private static hashObject(obj: Record<string, unknown>): string {
    return this.hashString(JSON.stringify(obj, Object.keys(obj).sort()));
  }
}

/**
 * Dynamic TTL calculator based on content characteristics
 */
export class DynamicTTLCalculator {
  /**
   * Calculate TTL for content item based on its characteristics
   */
  static calculateContentTTL(
    content: ContentItem,
    config: CacheConfig,
  ): number {
    let ttl = config.contentTTL;

    // Adjust based on status
    switch (content.status) {
      case "published":
        ttl = config.dynamicTTL.published;
        break;
      case "draft":
        ttl = config.dynamicTTL.draft;
        break;
      default:
        ttl = config.contentTTL;
    }

    // Adjust based on age
    const ageInHours =
      (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) {
      ttl = Math.min(ttl, config.dynamicTTL.recent);
    }

    // Adjust based on update frequency
    const updateFrequency = this.calculateUpdateFrequency(content);
    if (updateFrequency > 0.5) {
      // Frequently updated content
      ttl = ttl * 0.5;
    }

    return Math.max(ttl, 60 * 1000); // Minimum 1 minute TTL
  }

  /**
   * Calculate TTL for search results based on query characteristics
   */
  static calculateSearchTTL(
    query: string,
    resultCount: number,
    config: CacheConfig,
  ): number {
    let ttl = config.searchTTL;

    // Popular searches (many results) can be cached longer
    if (resultCount > 100) {
      ttl = ttl * 1.5;
    } else if (resultCount < 10) {
      ttl = ttl * 0.5;
    }

    // Simple queries can be cached longer
    if (query.length < 10 && !query.includes(" ")) {
      ttl = ttl * 1.2;
    }

    return ttl;
  }

  /**
   * Calculate TTL for media assets based on usage patterns
   */
  static calculateMediaTTL(
    asset: MediaAsset,
    accessCount: number,
    config: CacheConfig,
  ): number {
    let ttl = config.mediaTTL;

    // Frequently accessed media gets longer TTL
    if (accessCount > 100) {
      ttl = ttl * 2;
    } else if (accessCount < 10) {
      ttl = ttl * 0.8;
    }

    // Large files get longer TTL to avoid re-downloading
    if (asset.size > 10 * 1024 * 1024) {
      // 10MB
      ttl = ttl * 1.5;
    }

    return ttl;
  }

  private static calculateUpdateFrequency(content: ContentItem): number {
    const ageInDays =
      (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdate =
      (Date.now() - content.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays === 0) return 0;
    return 1 / daysSinceUpdate; // Higher value = more frequent updates
  }
}

/**
 * Intelligent cache warming strategies
 */
export class CacheWarmer {
  private static warmingQueue: Array<() => Promise<void>> = [];
  private static isWarming = false;

  /**
   * Warm cache with popular content
   */
  static async warmPopularContent(): Promise<void> {
    const { contentServiceClient } = await import("../client");

    try {
      // Get popular content (sorted by most recent updates as proxy for popularity)
      const popularContent = await contentServiceClient.getContentItems({
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: 20,
        status: "published",
      });

      // Warm cache for each popular item
      const warmingPromises = popularContent.items.map((item) =>
        this.queueWarmingTask(async () => {
          await contentServiceClient.getContentItem(item.id);
        }),
      );

      await Promise.all(warmingPromises);
    } catch (error) {
      console.warn("Failed to warm popular content cache:", error);
    }
  }

  /**
   * Warm cache with user-specific content
   */
  static async warmUserContent(userId: string): Promise<void> {
    const { contentServiceClient } = await import("../client");

    try {
      // Get user's recent content
      const userContent = await contentServiceClient.getContentItems({
        createdBy: userId,
        limit: 10,
        sortBy: "updatedAt",
      });

      // Get user's bookmarked/favorited content
      const recommendations = await contentServiceClient.getRecommendations(
        userId,
        "personalized",
      );

      // Warm cache for user-specific content
      const contentIds = [
        ...userContent.items.map((item) => item.id),
        ...recommendations.slice(0, 5).map((rec) => rec.itemId),
      ];

      const warmingPromises = contentIds.map((id) =>
        this.queueWarmingTask(async () => {
          await contentServiceClient.getContentItem(id);
        }),
      );

      await Promise.all(warmingPromises);
    } catch (error) {
      console.warn("Failed to warm user content cache:", error);
    }
  }

  /**
   * Warm cache with related content based on current viewing
   */
  static async warmRelatedContent(currentContentId: string): Promise<void> {
    const { contentServiceClient } = await import("../client");

    try {
      const currentContent =
        await contentServiceClient.getContentItem(currentContentId);

      // Get related content by tags (without excludeIds since it's not supported)
      const relatedByTags = await contentServiceClient.getContentItems({
        tags: currentContent.tags.slice(0, 3),
        limit: 6, // Get more to filter out current item
        status: "published",
      });

      // Get similar content recommendations
      const similarContent = await contentServiceClient.getRecommendations(
        currentContentId,
        "similar",
      );

      // Warm cache for related content (filter out current item)
      const relatedIds = [
        ...relatedByTags.items
          .filter((item) => item.id !== currentContentId)
          .slice(0, 5)
          .map((item) => item.id),
        ...similarContent.slice(0, 3).map((rec) => rec.itemId),
      ];

      const warmingPromises = relatedIds.map((id) =>
        this.queueWarmingTask(async () => {
          await contentServiceClient.getContentItem(id);
        }),
      );

      await Promise.all(warmingPromises);
    } catch (error) {
      console.warn("Failed to warm related content cache:", error);
    }
  }

  /**
   * Queue cache warming task for idle time execution
   */
  private static queueWarmingTask(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.warmingQueue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          console.warn("Cache warming task failed:", error);
          resolve();
        }
      });

      this.processWarmingQueue();
    });
  }

  private static processWarmingQueue(): void {
    if (this.isWarming || this.warmingQueue.length === 0) {
      return;
    }

    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => this.executeWarmingTasks());
    } else {
      setTimeout(() => this.executeWarmingTasks(), 100);
    }
  }

  private static async executeWarmingTasks(): Promise<void> {
    if (this.isWarming) return;

    this.isWarming = true;

    try {
      while (this.warmingQueue.length > 0) {
        const batch = this.warmingQueue.splice(0, 3); // Process 3 at a time
        await Promise.all(batch.map((task) => task()));

        // Yield control to prevent blocking
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      this.isWarming = false;
    }
  }
}

/**
 * Smart cache invalidation strategies
 */
export class SmartCacheInvalidator {
  private static invalidationRules = new Map<string, string[]>();

  /**
   * Set up cache invalidation rules
   */
  static setupInvalidationRules(): void {
    // Content item changes invalidate related caches
    this.invalidationRules.set("content:item:*", [
      "content:list:*",
      "search:*",
      "user:*:recommendations",
    ]);

    // Media changes invalidate content caches
    this.invalidationRules.set("media:*", ["content:item:*", "content:list:*"]);

    // User changes invalidate user-specific caches
    this.invalidationRules.set("user:*", ["user:*:*", "content:list:*:user:*"]);

    // Search index changes invalidate search caches
    this.invalidationRules.set("search:index", ["search:*"]);
  }

  /**
   * Invalidate caches based on content changes
   */
  static async invalidateForContentChange(
    contentId: string,
    changeType: "create" | "update" | "delete" | "status-change",
  ): Promise<void> {
    const keysToInvalidate = new Set<string>();

    // Always invalidate the specific content item
    keysToInvalidate.add(CacheKeyGenerator.contentItem(contentId));

    // Invalidate content lists
    keysToInvalidate.add("content:list:*");

    // Invalidate search results
    keysToInvalidate.add("search:*");

    // For status changes, invalidate workflow-related caches
    if (changeType === "status-change") {
      keysToInvalidate.add(`workflow:${contentId}:*`);
    }

    // For deletions, invalidate more aggressively
    if (changeType === "delete") {
      keysToInvalidate.add("user:*:recommendations");
      keysToInvalidate.add("content:related:*");
    }

    // Execute invalidation
    await this.executeInvalidation(Array.from(keysToInvalidate));
  }

  /**
   * Invalidate caches based on user actions
   */
  static async invalidateForUserAction(
    userId: string,
    action: "login" | "logout" | "preferences-change" | "bookmark-change",
  ): Promise<void> {
    const keysToInvalidate = new Set<string>();

    // Always invalidate user-specific caches
    keysToInvalidate.add(`user:${userId}:*`);

    // For preference changes, invalidate recommendations
    if (action === "preferences-change") {
      keysToInvalidate.add(`user:${userId}:recommendations`);
      keysToInvalidate.add(`search:*:${userId}`);
    }

    // For bookmark changes, invalidate user content lists
    if (action === "bookmark-change") {
      keysToInvalidate.add(`content:list:*:user:${userId}`);
    }

    // For logout, clear all user data
    if (action === "logout") {
      keysToInvalidate.add(`user:${userId}:*`);
      keysToInvalidate.add(`content:list:*:user:${userId}`);
      keysToInvalidate.add(`search:*:${userId}`);
    }

    await this.executeInvalidation(Array.from(keysToInvalidate));
  }

  /**
   * Scheduled cache cleanup for expired entries
   */
  static async performScheduledCleanup(): Promise<void> {
    try {
      // This would integrate with the actual cache implementation
      // to remove expired entries and optimize memory usage
      console.log("Performing scheduled cache cleanup...");

      // In a real implementation, this would:
      // 1. Scan for expired entries
      // 2. Remove least recently used items if cache is full
      // 3. Defragment cache storage
      // 4. Update cache statistics
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
    }
  }

  private static async executeInvalidation(patterns: string[]): Promise<void> {
    try {
      // This would integrate with the actual cache implementation
      // to invalidate matching cache keys
      patterns.forEach((pattern) => {
        console.log(`Invalidating cache pattern: ${pattern}`);
        // When cache implementation is available:
        // contentServiceCache.invalidatePattern(pattern)
      });
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
    }
  }
}

/**
 * Cache performance analyzer
 */
export class CachePerformanceAnalyzer {
  private static metrics = {
    hitRate: 0,
    missRate: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    evictionRate: 0,
    warmingEffectiveness: 0,
  };

  /**
   * Analyze cache performance and provide recommendations
   */
  static analyzePerformance(): {
    score: number;
    recommendations: string[];
    metrics: {
      hitRate: number;
      missRate: number;
      averageResponseTime: number;
      cacheSize: number;
      evictionRate: number;
      warmingEffectiveness: number;
    };
  } {
    const recommendations: string[] = [];
    let score = 100;

    // Hit rate analysis
    if (this.metrics.hitRate < 0.8) {
      recommendations.push("Improve cache hit rate by optimizing TTL values");
      score -= 15;
    }

    // Response time analysis
    if (this.metrics.averageResponseTime > 100) {
      recommendations.push("Optimize cache storage for faster access times");
      score -= 10;
    }

    // Cache size analysis
    if (this.metrics.cacheSize > OPTIMIZED_CACHE_CONFIG.maxCacheSize * 0.9) {
      recommendations.push(
        "Increase cache size limits or improve eviction strategy",
      );
      score -= 10;
    }

    // Eviction rate analysis
    if (this.metrics.evictionRate > 0.1) {
      recommendations.push(
        "Reduce cache eviction rate by optimizing cache size and TTL",
      );
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      recommendations,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Update cache performance metrics
   */
  static updateMetrics(newMetrics: Partial<typeof this.metrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
  }

  /**
   * Generate cache optimization report
   */
  static generateOptimizationReport(): {
    summary: string;
    details: {
      hitRate: {
        current: number;
        target: number;
        status: "good" | "warning" | "critical";
      };
      responseTime: {
        current: number;
        target: number;
        status: "good" | "warning" | "critical";
      };
      cacheSize: { current: number; limit: number; utilization: number };
      recommendations: string[];
    };
  } {
    const hitRateStatus =
      this.metrics.hitRate >= 0.9
        ? "good"
        : this.metrics.hitRate >= 0.7
          ? "warning"
          : "critical";

    const responseTimeStatus =
      this.metrics.averageResponseTime <= 50
        ? "good"
        : this.metrics.averageResponseTime <= 100
          ? "warning"
          : "critical";

    return {
      summary: `Cache performance is ${hitRateStatus === "good" && responseTimeStatus === "good" ? "optimal" : "needs improvement"}`,
      details: {
        hitRate: {
          current: this.metrics.hitRate,
          target: 0.9,
          status: hitRateStatus,
        },
        responseTime: {
          current: this.metrics.averageResponseTime,
          target: 50,
          status: responseTimeStatus,
        },
        cacheSize: {
          current: this.metrics.cacheSize,
          limit: OPTIMIZED_CACHE_CONFIG.maxCacheSize,
          utilization:
            this.metrics.cacheSize / OPTIMIZED_CACHE_CONFIG.maxCacheSize,
        },
        recommendations: this.analyzePerformance().recommendations,
      },
    };
  }
}

/**
 * Initialize cache optimizations
 */
export async function initializeCacheOptimizations(): Promise<void> {
  // Set up invalidation rules
  SmartCacheInvalidator.setupInvalidationRules();

  // Start cache warming for popular content
  await CacheWarmer.warmPopularContent();

  // Set up scheduled cleanup
  setInterval(
    () => {
      SmartCacheInvalidator.performScheduledCleanup();
    },
    60 * 60 * 1000,
  ); // Every hour

  // Set up performance monitoring
  setInterval(
    () => {
      const report = CachePerformanceAnalyzer.generateOptimizationReport();
      if (report.details.hitRate.status === "critical") {
        console.warn(
          "Cache hit rate is critically low:",
          report.details.hitRate.current,
        );
      }
    },
    5 * 60 * 1000,
  ); // Every 5 minutes

  console.log("Content Service cache optimizations initialized");
}
