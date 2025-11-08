/**
 * Cache Module
 * Exports authentication and user-service caching functionality
 */

export { AuthCache, authCache } from "./auth-cache";
export type {
  AuthCacheConfig,
  CacheInvalidationEvent,
  CacheEntry,
  CacheWarmingConfig,
} from "./auth-cache";

// User Service Cache exports
export {
  CACHE_TIMES,
  GC_TIMES,
  queryKeys as userServiceQueryKeys,
  UserServiceCacheManager,
  OptimisticUpdateManager,
  CacheWarmingManager,
  createUserServiceQueryOptions,
  initializeUserServiceCache,
  getUserServiceCacheManager,
  getOptimisticUpdateManager,
  getCacheWarmingManager,
} from "./user-service-cache";

export type {
  CacheInvalidationOptions,
  OptimisticUpdateConfig,
  CacheWarmingConfig as UserServiceCacheWarmingConfig,
} from "./user-service-cache";

// Intelligent Cache Management exports
export {
  IntelligentCacheManager,
  initializeIntelligentCacheManager,
  getIntelligentCacheManager,
} from "./cache-strategies";

export type {
  CacheStrategy,
  CacheStrategyConfig,
  CacheTag,
  NavigationPattern,
} from "./cache-strategies";

// Cross-Tab Synchronization exports
export {
  CrossTabCacheSynchronizer,
  initializeCrossTabSync,
  getCrossTabSynchronizer,
  withCrossTabSync,
} from "./cross-tab-sync";

export type {
  SyncEventType,
  SyncEvent,
  CacheConflict,
  TabInfo,
} from "./cross-tab-sync";
