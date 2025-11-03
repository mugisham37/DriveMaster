/**
 * Core Analytics Hooks
 * 
 * Provides React hooks for analytics operations with React Query integration,
 * automatic caching, and real-time updates.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { 
  analyticsQueryKeys, 
  analyticsQueryConfig, 
  analyticsCacheUtils 
} from '../lib/analytics-service/query-config'
import { getAnalyticsServiceClient } from '../lib/analytics-service'
import type {
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  Alert,
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,
  AlertSeverity
} from '../types/analytics-service'

// ============================================================================
// Base Analytics Hook
// ============================================================================

/**
 * Base analytics hook providing common functionality and cache management.
 */
export function useAnalytics() {
  const queryClient = useQueryClient()
  const analyticsClient = useMemo(() => getAnalyticsServiceClient(), [])
  
  // Cache invalidation utilities
  const invalidateAnalytics = useCallback((queryKey?: unknown[]) => {
    if (queryKey) {
      return queryClient.invalidateQueries({ queryKey })
    } else {
      return analyticsCacheUtils.invalidateAll(queryClient)
    }
  }, [queryClient])
  
  const updateAnalyticsCache = useCallback((data: unknown, queryKey: unknown[]) => {
    queryClient.setQueryData(queryKey, data)
  }, [queryClient])
  
  const clearAnalyticsCache = useCallback(() => {
    return analyticsCacheUtils.clearAll(queryClient)
  }, [queryClient])
  
  const prefetchCriticalData = useCallback(() => {
    return analyticsCacheUtils.prefetchCritical(queryClient, analyticsClient)
  }, [queryClient, analyticsClient])
  
  return {
    analyticsClient,
    invalidateAnalytics,
    updateAnalyticsCache,
    clearAnalyticsCache,
    prefetchCriticalData
  }
}

// ============================================================================
// Engagement Metrics Hooks
// ============================================================================

/**
 * Hook for fetching user engagement metrics.
 */
export function useEngagementMetrics(params?: EngagementMetricsParams) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.engagement(params),
    queryFn: () => analyticsClient.getEngagementMetrics(params),
    ...analyticsQueryConfig.engagement,
    select: (data: UserEngagementMetrics) => ({
      ...data,
      // Add computed fields
      totalActiveUsers: data.activeUsers24h,
      growthRate: data.newUsers24h / Math.max(data.activeUsers24h - data.newUsers24h, 1),
      engagementScore: (data.avgSessionDurationMinutes * (1 - data.bounceRate)) / 10
    })
  })
}

/**
 * Hook for fetching hourly engagement data for a specific user.
 */
export function useHourlyEngagement(userId: string, date?: Date) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.hourlyEngagement(userId, date),
    queryFn: () => analyticsClient.getHourlyEngagement(userId, date),
    ...analyticsQueryConfig.engagement,
    enabled: !!userId
  })
}

// ============================================================================
// Progress Metrics Hooks
// ============================================================================

/**
 * Hook for fetching learning progress metrics.
 */
export function useProgressMetrics(params?: ProgressMetricsParams) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.progress(params),
    queryFn: () => analyticsClient.getProgressMetrics(params),
    ...analyticsQueryConfig.progress,
    select: (data: LearningProgressMetrics) => ({
      ...data,
      // Add computed fields
      completionVelocity: data.totalCompletions24h / 24, // completions per hour
      performanceIndex: data.avgAccuracy * (1000 / Math.max(data.avgResponseTimeMs, 1)),
      strugglingRatio: data.strugglingUsers / Math.max(data.strugglingUsers + data.topPerformers, 1)
    })
  })
}

/**
 * Hook for fetching user journey data.
 */
export function useUserJourney(userId: string) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.userJourney(userId),
    queryFn: () => analyticsClient.getUserJourney(userId),
    ...analyticsQueryConfig.progress,
    enabled: !!userId
  })
}

/**
 * Hook for fetching cohort retention data.
 */
export function useCohortRetention(cohortId: string) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.cohortRetention(cohortId),
    queryFn: () => analyticsClient.getCohortRetention(cohortId),
    ...analyticsQueryConfig.progress,
    enabled: !!cohortId
  })
}

// ============================================================================
// Content Metrics Hooks
// ============================================================================

/**
 * Hook for fetching content performance metrics.
 */
export function useContentMetrics(params?: ContentMetricsParams) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.content(params),
    queryFn: () => analyticsClient.getContentMetrics(params),
    ...analyticsQueryConfig.content,
    select: (data: ContentPerformanceMetrics) => ({
      ...data,
      // Add computed fields
      averagePerformance: data.avgAccuracy,
      efficiencyScore: data.avgAccuracy / (data.avgResponseTimeMs / 1000),
      reviewNeededRatio: data.itemsNeedingReview / Math.max(data.totalItems, 1)
    })
  })
}

/**
 * Hook for fetching content gaps analysis.
 */
export function useContentGaps() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.contentGaps(),
    queryFn: () => analyticsClient.getContentGaps(),
    ...analyticsQueryConfig.content
  })
}

// ============================================================================
// System Metrics Hooks
// ============================================================================

/**
 * Hook for fetching system performance metrics.
 */
export function useSystemMetrics(params?: SystemMetricsParams) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.system(params),
    queryFn: () => analyticsClient.getSystemMetrics(params),
    ...analyticsQueryConfig.system,
    select: (data: SystemPerformanceMetrics) => ({
      ...data,
      // Add computed fields
      overallHealth: (
        (100 - data.memoryUsagePercent) * 0.3 +
        (100 - data.cpuUsagePercent) * 0.3 +
        (100 - data.diskUsagePercent) * 0.2 +
        (data.cacheHitRate) * 0.2
      ) / 100,
      responseTimeGrade: data.apiResponseTimeMs < 100 ? 'A' : 
                        data.apiResponseTimeMs < 300 ? 'B' :
                        data.apiResponseTimeMs < 500 ? 'C' : 'D'
    })
  })
}

/**
 * Hook for fetching system status.
 */
export function useSystemStatus() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.systemStatus(),
    queryFn: () => analyticsClient.getSystemStatus(),
    ...analyticsQueryConfig.system
  })
}

/**
 * Hook for fetching system alerts.
 */
export function useAlerts(severity?: AlertSeverity) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.alerts(severity),
    queryFn: () => analyticsClient.getAlerts(severity),
    ...analyticsQueryConfig.system,
    select: (data: Alert[]) => ({
      alerts: data,
      criticalCount: data.filter(alert => alert.severity === 'critical').length,
      errorCount: data.filter(alert => alert.severity === 'error').length,
      warningCount: data.filter(alert => alert.severity === 'warning').length,
      unresolvedCount: data.filter(alert => !alert.resolved).length
    })
  })
}

// ============================================================================
// Insights Hooks
// ============================================================================

/**
 * Hook for fetching behavior insights.
 */
export function useBehaviorInsights(userId?: string) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.behaviorInsights(userId),
    queryFn: () => analyticsClient.getBehaviorInsights(userId),
    ...analyticsQueryConfig.insights
  })
}

/**
 * Hook for fetching behavior patterns.
 */
export function useBehaviorPatterns(userId?: string) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.behaviorPatterns(userId),
    queryFn: () => analyticsClient.getBehaviorPatterns(userId),
    ...analyticsQueryConfig.insights
  })
}

// ============================================================================
// Reports Hooks
// ============================================================================

/**
 * Hook for fetching effectiveness reports.
 */
export function useEffectivenessReport(filters?: ReportFilters) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.effectivenessReport(filters),
    queryFn: () => analyticsClient.getEffectivenessReport(filters),
    ...analyticsQueryConfig.reports
  })
}

// ============================================================================
// Historical Data Hooks
// ============================================================================

/**
 * Hook for fetching historical metrics data.
 */
export function useHistoricalMetrics(query: HistoricalQuery) {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.historical(query),
    queryFn: () => analyticsClient.queryHistoricalMetrics(query),
    ...analyticsQueryConfig.historical,
    enabled: !!query.timeRange?.start && !!query.timeRange?.end
  })
}

// ============================================================================
// User Analytics Hooks
// ============================================================================

/**
 * Hook for fetching user segments.
 */
export function useUserSegments() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.userSegments(),
    queryFn: () => analyticsClient.getUserSegments(),
    ...analyticsQueryConfig.insights
  })
}

// ============================================================================
// Real-time Data Hooks
// ============================================================================

/**
 * Hook for fetching real-time metrics snapshot.
 */
export function useRealtimeSnapshot() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.realtimeSnapshot(),
    queryFn: () => analyticsClient.getRealtimeSnapshot(),
    ...analyticsQueryConfig.realtime
  })
}

// ============================================================================
// Health and Status Hooks
// ============================================================================

/**
 * Hook for fetching service health status.
 */
export function useHealthStatus() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: analyticsQueryKeys.healthStatus(),
    queryFn: () => analyticsClient.getHealthStatus(),
    ...analyticsQueryConfig.health
  })
}

/**
 * Hook for fetching detailed system performance.
 */
export function useSystemPerformance() {
  const { analyticsClient } = useAnalytics()
  
  return useQuery({
    queryKey: [...analyticsQueryKeys.system(), 'performance'],
    queryFn: () => analyticsClient.getSystemPerformance(),
    ...analyticsQueryConfig.system
  })
}

// ============================================================================
// Summary and Dashboard Hooks
// ============================================================================

/**
 * Hook for fetching analytics summary data for dashboard overview.
 * Combines multiple metrics into a single comprehensive view.
 */
export function useAnalyticsSummary() {
  const engagement = useEngagementMetrics()
  const progress = useProgressMetrics()
  const content = useContentMetrics()
  const system = useSystemMetrics()
  const alerts = useAlerts()
  const realtime = useRealtimeSnapshot()
  
  return useMemo(() => ({
    // Loading states
    isLoading: engagement.isLoading || progress.isLoading || content.isLoading || 
               system.isLoading || alerts.isLoading || realtime.isLoading,
    
    // Error states
    hasError: engagement.isError || progress.isError || content.isError || 
              system.isError || alerts.isError || realtime.isError,
    
    // Data
    engagement: engagement.data,
    progress: progress.data,
    content: content.data,
    system: system.data,
    alerts: alerts.data,
    realtime: realtime.data,
    
    // Computed summary metrics
    summary: {
      totalActiveUsers: engagement.data?.activeUsers24h || 0,
      completionRate: progress.data?.contentCompletionRate || 0,
      systemHealth: system.data?.overallHealth || 0,
      criticalAlerts: alerts.data?.criticalCount || 0,
      lastUpdated: new Date().toISOString()
    },
    
    // Refetch functions
    refetchAll: () => {
      engagement.refetch()
      progress.refetch()
      content.refetch()
      system.refetch()
      alerts.refetch()
      realtime.refetch()
    }
  }), [engagement, progress, content, system, alerts, realtime])
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for analytics-related mutations (if any).
 * Currently placeholder for future functionality.
 */
export function useAnalyticsMutations() {
  const queryClient = useQueryClient()
  
  // Placeholder for future mutations like:
  // - Updating alert status
  // - Configuring analytics settings
  // - Triggering manual data refresh
  
  const refreshAllData = useMutation({
    mutationFn: async () => {
      // Invalidate all analytics queries to force refresh
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all })
      return true
    },
    onSuccess: () => {
      // Could show success notification
      console.log('Analytics data refreshed successfully')
    },
    onError: (error) => {
      console.error('Failed to refresh analytics data:', error)
    }
  })
  
  return {
    refreshAllData
  }
}