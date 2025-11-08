/**
 * Content Service SWR Configuration
 *
 * SWR cache keys and invalidation strategies for content service operations
 * Requirements: 6.1, 6.4
 */

import type { SWRConfiguration } from "swr";
import type {
  QueryItemsDto,
  SearchRequestDto,
  FacetedSearchDto,
} from "../../../types/dtos";
import { CacheStrategies } from "./cache-strategies";

/**
 * Content Service Cache Keys
 * Provides consistent cache key generation for all content operations
 */
export const contentCacheKeys = {
  // Content CRUD operations
  contentItems: (params?: QueryItemsDto) => ["content-items", params],
  contentItem: (id: string) => ["content-item", id],
  contentItemBySlug: (slug: string) => ["content-item-by-slug", slug],

  // Media operations
  mediaAsset: (id: string) => ["media-asset", id],
  mediaAssets: (itemId: string) => ["media-assets", itemId],
  mediaSignedUrl: (id: string, options?: Record<string, unknown>) => [
    "media-signed-url",
    id,
    options,
  ],

  // Search operations
  searchContent: (request: SearchRequestDto) => ["search-content", request],
  searchSuggestions: (query: string, options?: Record<string, unknown>) => [
    "search-suggestions",
    query,
    options,
  ],
  facetedSearch: (request: FacetedSearchDto) => ["faceted-search", request],
  recommendations: (
    userId: string,
    type?: string,
    options?: Record<string, unknown>,
  ) => ["recommendations", userId, type, options],
  similarContent: (itemId: string, options?: Record<string, unknown>) => [
    "similar-content",
    itemId,
    options,
  ],
  trendingContent: (options?: Record<string, unknown>) => [
    "trending-content",
    options,
  ],

  // Workflow operations
  workflowHistory: (itemId: string) => ["workflow-history", itemId],
  workflowStatus: (itemId: string) => ["workflow-status", itemId],

  // Bulk operations
  bulkOperation: (operationId: string) => ["bulk-operation", operationId],
  bulkOperations: (userId: string, status?: string) => [
    "bulk-operations",
    userId,
    status,
  ],

  // Real-time operations
  presence: (itemId: string) => ["presence", itemId],
  contentChanges: (itemId: string) => ["content-changes", itemId],

  // Health and metrics
  serviceHealth: () => ["service-health"],
  serviceMetrics: () => ["service-metrics"],
};

/**
 * SWR Configuration Presets
 * Pre-configured SWR settings for different operation types
 */
export const contentSWRConfigs = {
  // Content operations
  contentList: CacheStrategies.staleWhileRevalidate(300000), // 5 minutes
  contentItem: CacheStrategies.staleWhileRevalidate(180000), // 3 minutes
  contentItemStatic: CacheStrategies.cacheFirst(1800000), // 30 minutes for published content

  // Media operations
  mediaAsset: CacheStrategies.cacheFirst(3600000), // 1 hour - media rarely changes
  mediaList: CacheStrategies.staleWhileRevalidate(600000), // 10 minutes

  // Search operations
  search: CacheStrategies.getSearchStrategy(),
  suggestions: CacheStrategies.networkFirst(60000), // 1 minute for suggestions
  recommendations: CacheStrategies.staleWhileRevalidate(900000), // 15 minutes

  // Workflow operations
  workflow: CacheStrategies.networkFirst(30000), // 30 seconds - workflows change frequently
  workflowHistory: CacheStrategies.staleWhileRevalidate(300000), // 5 minutes

  // Bulk operations
  bulkOperation: CacheStrategies.realTime(2000), // 2 seconds for active operations
  bulkOperationHistory: CacheStrategies.staleWhileRevalidate(600000), // 10 minutes

  // Real-time operations
  presence: CacheStrategies.realTime(1000), // 1 second for presence
  changes: CacheStrategies.realTime(3000), // 3 seconds for content changes

  // Health and monitoring
  health: CacheStrategies.networkFirst(10000), // 10 seconds
  metrics: CacheStrategies.staleWhileRevalidate(60000), // 1 minute
};

/**
 * Cache Invalidation Utilities
 * Provides methods to invalidate related cache entries
 */
import type { ScopedMutator } from "swr";
type MutateFunction = ScopedMutator;

export const contentCacheInvalidation = {
  /**
   * Invalidates all caches related to a specific content item
   */
  invalidateContentItem: (mutate: MutateFunction, itemId: string) => {
    mutate(contentCacheKeys.contentItem(itemId));
    mutate((key: unknown) => Array.isArray(key) && key[0] === "content-items");
    mutate(contentCacheKeys.mediaAssets(itemId));
    mutate(contentCacheKeys.workflowHistory(itemId));
    mutate(contentCacheKeys.workflowStatus(itemId));
    mutate(contentCacheKeys.presence(itemId));
    mutate(contentCacheKeys.contentChanges(itemId));
  },

  /**
   * Invalidates content item by slug
   */
  invalidateContentItemBySlug: (mutate: MutateFunction, slug: string) => {
    mutate(contentCacheKeys.contentItemBySlug(slug));
  },

  /**
   * Invalidates content list caches
   */
  invalidateContentList: (mutate: MutateFunction) => {
    mutate((key: unknown) => Array.isArray(key) && key[0] === "content-items");
  },

  /**
   * Invalidates search-related caches
   */
  invalidateSearch: (mutate: MutateFunction) => {
    mutate(
      (key: unknown) =>
        Array.isArray(key) &&
        (key[0] === "search-content" ||
          key[0] === "search-suggestions" ||
          key[0] === "recommendations"),
    );
  },

  /**
   * Invalidates media-related caches
   */
  invalidateMedia: (mutate: MutateFunction, itemId?: string) => {
    if (itemId) {
      mutate(contentCacheKeys.mediaAssets(itemId));
      mutate(
        (key: unknown) => Array.isArray(key) && key[0] === "media-signed-url",
      );
    } else {
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          (key[0] === "media-asset" ||
            key[0] === "media-assets" ||
            key[0] === "media-signed-url"),
      );
    }
  },

  /**
   * Invalidates workflow-related caches
   */
  invalidateWorkflow: (mutate: MutateFunction, itemId?: string) => {
    if (itemId) {
      mutate(contentCacheKeys.workflowHistory(itemId));
      mutate(contentCacheKeys.workflowStatus(itemId));
      // Also invalidate the content item since workflow status changed
      mutate(contentCacheKeys.contentItem(itemId));
    } else {
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          (key[0] === "workflow-history" || key[0] === "workflow-status"),
      );
    }
  },

  /**
   * Invalidates bulk operation caches
   */
  invalidateBulkOperations: (mutate: MutateFunction, userId?: string) => {
    if (userId) {
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          key[0] === "bulk-operations" &&
          key[1] === userId,
      );
    } else {
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          (key[0] === "bulk-operation" || key[0] === "bulk-operations"),
      );
    }
  },

  /**
   * Invalidates user-specific caches
   */
  invalidateUserContent: (mutate: MutateFunction, userId: string) => {
    mutate(
      (key: unknown) =>
        Array.isArray(key) && key[0] === "recommendations" && key[1] === userId,
    );
    mutate(
      (key: unknown) =>
        Array.isArray(key) && key[0] === "bulk-operations" && key[1] === userId,
    );
  },

  /**
   * Invalidates all content service caches
   */
  invalidateAll: (mutate: MutateFunction) => {
    mutate(
      (key: unknown) =>
        Array.isArray(key) &&
        typeof key[0] === "string" &&
        (key[0].startsWith("content-") ||
          key[0].startsWith("media-") ||
          key[0].startsWith("search-") ||
          key[0].startsWith("workflow-") ||
          key[0].startsWith("bulk-") ||
          key[0] === "recommendations" ||
          key[0] === "presence" ||
          key[0] === "service-health" ||
          key[0] === "service-metrics"),
    );
  },
};

/**
 * Global SWR Configuration for Content Service
 */
export const contentServiceSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 5000,
  focusThrottleInterval: 5000,
  onError: (error: Error, key: string) => {
    console.error(`[ContentService SWR] Error for key ${key}:`, error);

    // Could integrate with error reporting service here
    if (process.env.NODE_ENV === "production") {
      // Report to error tracking service
      // errorReporter.captureException(error, { extra: { swrKey: key } })
    }
  },
  onSuccess: (data: unknown, key: string) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[ContentService SWR] Success for key ${key}:`, data);
    }
  },
  onLoadingSlow: (key: string) => {
    console.warn(`[ContentService SWR] Slow loading for key ${key}`);
  },
};

/**
 * Utility function to get appropriate SWR config based on operation type
 */
export function getSWRConfigForOperation(
  operation: string,
  contentType?: string,
  usage?: "frequent" | "occasional" | "rare",
): SWRConfiguration {
  // Content operations
  if (operation.startsWith("content-")) {
    if (contentType) {
      return CacheStrategies.getStrategyForContentType(contentType, usage);
    }
    return contentSWRConfigs.contentItem;
  }

  // Media operations
  if (operation.startsWith("media-")) {
    return contentSWRConfigs.mediaAsset;
  }

  // Search operations
  if (operation.startsWith("search-")) {
    return contentSWRConfigs.search;
  }

  // Workflow operations
  if (operation.startsWith("workflow-")) {
    return contentSWRConfigs.workflow;
  }

  // Bulk operations
  if (operation.startsWith("bulk-")) {
    return contentSWRConfigs.bulkOperation;
  }

  // Real-time operations
  if (operation === "presence" || operation.includes("changes")) {
    return contentSWRConfigs.presence;
  }

  // Default configuration
  return contentServiceSWRConfig;
}
