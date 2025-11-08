/**
 * Content Service Cache - Main Export File
 *
 * Exports all caching utilities and configurations for content service integration
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

// SWR Configuration and Cache Keys
export {
  contentCacheKeys,
  contentSWRConfigs,
  contentCacheInvalidation,
  contentServiceSWRConfig,
  getSWRConfigForOperation,
} from "./swr-config";

// Cache Strategies
export { CacheStrategies } from "./cache-strategies";

// Content Service Cache
export {
  ContentServiceCache,
  contentServiceCache,
} from "./content-service-cache";

// Request Deduplication
export {
  RequestDeduplicationManager,
  requestDeduplicationManager,
  createDeduplicationKey,
  deduplicate,
  batch,
} from "./deduplication";

// Prefetching and Cache Warming
export {
  PrefetchManager,
  prefetchManager,
  prefetchForPage,
  intelligentCacheWarming,
} from "./prefetch";

// React Hooks
export {
  // Content CRUD hooks
  useContentItems,
  useContentItem,
  useContentItemBySlug,
  useCreateContentItem,
  useUpdateContentItem,
  useDeleteContentItem,

  // Media hooks
  useMediaAssets,
  useMediaAsset,
  useMediaSignedUrl,

  // Search hooks
  useContentSearch,
  useSearchSuggestions,
  useRecommendations,

  // Workflow hooks
  useWorkflowHistory,
  useWorkflowOperations,
  useBulkWorkflowOperations,

  // Bulk operations hooks
  useBulkOperation,
  useBulkOperations,

  // Health and monitoring hooks
  useServiceHealth,

  // Cache management hooks
  useContentCacheInvalidation,
  useContentPrefetch,
} from "./hooks";

// Real-time Cache Integration
export {
  RealTimeCacheIntegration,
  getRealTimeCacheIntegration,
  initializeRealTimeCacheIntegration,
  destroyRealTimeCacheIntegration,
} from "./real-time-integration";

// Cache Types
export type { ContentCacheConfig, CacheKey, CacheEntry } from "./types";
