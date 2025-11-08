/**
 * React Query Configuration for Analytics Service
 *
 * Provides query configuration, cache strategies, and query key factories
 * for analytics data with appropriate cache times based on data volatility.
 */

import { QueryClient } from "@tanstack/react-query";
import type {
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,
  AlertSeverity,
} from "../../types/analytics-service";

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Hierarchical query key factory for analytics data.
 * Enables granular cache invalidation and follows established patterns.
 */
export const analyticsQueryKeys = {
  // Base key for all analytics queries
  all: ["analytics"] as const,

  // Engagement metrics queries
  engagement: (params?: EngagementMetricsParams) =>
    [...analyticsQueryKeys.all, "engagement", params] as const,
  hourlyEngagement: (userId: string, date?: Date) =>
    [...analyticsQueryKeys.all, "engagement", "hourly", userId, date] as const,

  // Progress metrics queries
  progress: (params?: ProgressMetricsParams) =>
    [...analyticsQueryKeys.all, "progress", params] as const,
  userJourney: (userId: string) =>
    [...analyticsQueryKeys.all, "progress", "journey", userId] as const,
  cohortRetention: (cohortId: string) =>
    [...analyticsQueryKeys.all, "progress", "cohort", cohortId] as const,

  // Content metrics queries
  content: (params?: ContentMetricsParams) =>
    [...analyticsQueryKeys.all, "content", params] as const,
  contentGaps: () => [...analyticsQueryKeys.all, "content", "gaps"] as const,

  // System metrics queries
  system: (params?: SystemMetricsParams) =>
    [...analyticsQueryKeys.all, "system", params] as const,
  systemStatus: () => [...analyticsQueryKeys.all, "system", "status"] as const,
  alerts: (severity?: AlertSeverity) =>
    [...analyticsQueryKeys.all, "system", "alerts", severity] as const,

  // Historical data queries
  historical: (query: HistoricalQuery) =>
    [...analyticsQueryKeys.all, "historical", query] as const,

  // Insights queries
  insights: (type: string, params?: Record<string, unknown>) =>
    [...analyticsQueryKeys.all, "insights", type, params] as const,
  behaviorInsights: (userId?: string) =>
    [...analyticsQueryKeys.all, "insights", "behavior", userId] as const,
  behaviorPatterns: (userId?: string) =>
    [...analyticsQueryKeys.all, "insights", "patterns", userId] as const,

  // Reports queries
  reports: (type: string, filters?: ReportFilters) =>
    [...analyticsQueryKeys.all, "reports", type, filters] as const,
  effectivenessReport: (filters?: ReportFilters) =>
    [...analyticsQueryKeys.all, "reports", "effectiveness", filters] as const,

  // User analytics queries
  userSegments: () => [...analyticsQueryKeys.all, "users", "segments"] as const,

  // Real-time snapshot
  realtimeSnapshot: () =>
    [...analyticsQueryKeys.all, "realtime", "snapshot"] as const,

  // Health and status
  healthStatus: () => [...analyticsQueryKeys.all, "health"] as const,
} as const;

// ============================================================================
// Query Configuration
// ============================================================================

/**
 * Query configuration with cache times based on data volatility.
 * Different data types have different freshness requirements.
 */
export const analyticsQueryConfig = {
  // Real-time metrics - very short cache, frequent updates
  realtime: {
    staleTime: 30000, // 30 seconds
    cacheTime: 60000, // 1 minute
    refetchInterval: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Engagement metrics - moderate cache, regular updates
  engagement: {
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
    refetchInterval: 60000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Progress metrics - longer cache, less frequent updates
  progress: {
    staleTime: 120000, // 2 minutes
    cacheTime: 600000, // 10 minutes
    refetchInterval: 300000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Content metrics - moderate cache
  content: {
    staleTime: 180000, // 3 minutes
    cacheTime: 900000, // 15 minutes
    refetchInterval: 300000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // System metrics - short cache for monitoring
  system: {
    staleTime: 45000, // 45 seconds
    cacheTime: 180000, // 3 minutes
    refetchInterval: 60000, // 1 minute
    retry: 5, // More retries for system monitoring
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Historical data - long cache, infrequent updates
  historical: {
    staleTime: 3600000, // 1 hour
    cacheTime: 7200000, // 2 hours
    refetchInterval: false, // No automatic refetch
    retry: 2,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Insights - moderate cache
  insights: {
    staleTime: 300000, // 5 minutes
    cacheTime: 1800000, // 30 minutes
    refetchInterval: 600000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Reports - long cache
  reports: {
    staleTime: 600000, // 10 minutes
    cacheTime: 3600000, // 1 hour
    refetchInterval: false, // Manual refresh only
    retry: 2,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Health checks - very short cache
  health: {
    staleTime: 15000, // 15 seconds
    cacheTime: 60000, // 1 minute
    refetchInterval: 30000, // 30 seconds
    retry: 5,
    retryDelay: (attemptIndex: number) =>
      Math.min(500 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
} as const;

// ============================================================================
// Query Client Configuration
// ============================================================================

/**
 * Default query client configuration for analytics.
 * Can be used to create a dedicated analytics query client or configure
 * the global query client with analytics-specific defaults.
 */
export const analyticsQueryClientConfig = {
  defaultOptions: {
    queries: {
      // Global defaults for analytics queries
      staleTime: 60000, // 1 minute default
      cacheTime: 300000, // 5 minutes default
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Error handling
      throwOnError: false,

      // Background refetching
      refetchOnMount: true,
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Global defaults for analytics mutations
      retry: 2,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
      throwOnError: false,
    },
  },
};

/**
 * Creates a configured query client for analytics operations.
 * Can be used as a dedicated client or to configure the global client.
 */
export function createAnalyticsQueryClient(): QueryClient {
  return new QueryClient(analyticsQueryClientConfig);
}

// ============================================================================
// Cache Management Utilities
// ============================================================================

/**
 * Utility functions for managing analytics cache.
 */
export const analyticsCacheUtils = {
  /**
   * Invalidate all analytics queries
   */
  invalidateAll: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all });
  },

  /**
   * Invalidate engagement metrics
   */
  invalidateEngagement: (
    queryClient: QueryClient,
    params?: EngagementMetricsParams,
  ) => {
    return queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.engagement(params),
    });
  },

  /**
   * Invalidate progress metrics
   */
  invalidateProgress: (
    queryClient: QueryClient,
    params?: ProgressMetricsParams,
  ) => {
    return queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.progress(params),
    });
  },

  /**
   * Invalidate content metrics
   */
  invalidateContent: (
    queryClient: QueryClient,
    params?: ContentMetricsParams,
  ) => {
    return queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.content(params),
    });
  },

  /**
   * Invalidate system metrics
   */
  invalidateSystem: (
    queryClient: QueryClient,
    params?: SystemMetricsParams,
  ) => {
    return queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.system(params),
    });
  },

  /**
   * Invalidate real-time data
   */
  invalidateRealtime: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.realtimeSnapshot(),
    });
  },

  /**
   * Clear all analytics cache
   */
  clearAll: (queryClient: QueryClient) => {
    return queryClient.removeQueries({ queryKey: analyticsQueryKeys.all });
  },

  /**
   * Prefetch critical analytics data
   */
  prefetchCritical: async (
    queryClient: QueryClient,
    analyticsClient: {
      getRealtimeSnapshot: () => Promise<unknown>;
      getSystemStatus: () => Promise<unknown>;
      getHealthStatus: () => Promise<unknown>;
    },
  ) => {
    const prefetchPromises = [
      // Prefetch real-time snapshot
      queryClient.prefetchQuery({
        queryKey: analyticsQueryKeys.realtimeSnapshot(),
        queryFn: () => analyticsClient.getRealtimeSnapshot(),
        ...analyticsQueryConfig.realtime,
      }),

      // Prefetch system status
      queryClient.prefetchQuery({
        queryKey: analyticsQueryKeys.systemStatus(),
        queryFn: () => analyticsClient.getSystemStatus(),
        ...analyticsQueryConfig.system,
      }),

      // Prefetch health status
      queryClient.prefetchQuery({
        queryKey: analyticsQueryKeys.healthStatus(),
        queryFn: () => analyticsClient.getHealthStatus(),
        ...analyticsQueryConfig.health,
      }),
    ];

    return Promise.allSettled(prefetchPromises);
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyticsQueryConfig =
  (typeof analyticsQueryConfig)[keyof typeof analyticsQueryConfig];
