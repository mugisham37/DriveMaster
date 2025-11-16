/**
 * Performance Optimization Utilities
 * 
 * Centralized exports for all performance optimization utilities.
 * 
 * Requirements: 13.1, 13.3, 13.4, 13.5
 * Task: 14.1, 14.2, 14.3, 14.4
 */

// Dynamic imports and code splitting
export * from './dynamic-imports';

// Webpack optimization
export * from './webpack-optimization';

// Data prefetching
export * from './prefetch';

// Rendering optimizations
export * from './rendering-optimizations';

// Re-export commonly used utilities
export {
  LazyChartComponents,
  LazyMediaComponents,
  LazyBulkComponents,
  LazyNotificationComponents,
  LazyGDPRComponents,
  LazyCelebrationComponents,
  LazyPageComponents,
  LazyFeatureComponents,
  createLazyComponent,
  preloadComponent,
  BUNDLE_SIZE_TARGETS,
} from './dynamic-imports';

export {
  usePrefetchOnHover,
  useProgressPrefetch,
  useMountPrefetch,
  useBatchPrefetch,
  usePredictivePrefetch,
  useLinkPrefetch,
  prefetchSWRData,
  prefetchMultipleSWRData,
  addPrefetchTask,
} from './prefetch';

export {
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedSort,
  useMemoizedFilter,
  useMemoizedMap,
  useMemoizedGroupBy,
  useVirtualScroll,
  calculateVisibleRange,
  useIntersectionObserver,
  useRenderTime,
  useSlowRenderDetection,
  useStableCallback,
  useIsMounted,
  useBatchedState,
} from './rendering-optimizations';
