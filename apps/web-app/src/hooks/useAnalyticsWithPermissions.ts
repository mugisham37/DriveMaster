/**
 * Enhanced Analytics Hooks with Permission Filtering
 * 
 * Provides analytics hooks that automatically apply user context filtering
 * and permission checking based on the current user's role and permissions.
 * 
 * Requirements: 7.3, 7.5, 9.1, 9.5
 */

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAnalyticsContext } from '@/contexts/AnalyticsContext'
import { useAuth } from '@/hooks/useAuth'
import { 
  analyticsQueryKeys, 
  analyticsQueryConfig 
} from '@/lib/analytics-service/query-config'
import {
  filterEngagementParams,
  filterProgressParams,
  filterContentParams,
  filterSystemParams,
  filterHistoricalQuery,
  filterReportParams,
  createUserContext,
  shouldRenderComponent,
  getDataViewLevel
} from '@/lib/analytics-service/user-context'
import { getPermissionsForRole } from '@/lib/analytics-service/permissions'
import type {
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  BehaviorInsights,
  ContentGapAnalysis,
  EffectivenessReport,
  Alert,
  HourlyEngagement,
  CohortRetention,
  UserSegment,
  UserJourney,
  BehaviorPattern,
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,
  AlertSeverity,
  UserRole,
  AnalyticsPermissions
} from '@/types/analytics-service'

// ============================================================================
// Enhanced Analytics Hook
// ============================================================================

/**
 * Enhanced analytics hook with automatic permission filtering
 */
export function useAnalyticsWithPermissions() {
  const { client, permissions, isServiceAvailable } = useAnalyticsContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Create user context
  const userContext = useMemo(() => {
    if (!user) {
      return null
    }
    
    return createUserContext(
      {
        id: user.id,
        role: user.userRole as UserRole,
        classIds: undefined, // Not available in UserProfile
        organizationId: undefined, // Not available in UserProfile
        teamIds: undefined // Not available in UserProfile
      },
      permissions
    )
  }, [user, permissions])
  
  // Data view level based on user role
  const dataViewLevel = useMemo(() => {
    return userContext ? getDataViewLevel(userContext) : 'summary'
  }, [userContext])
  
  return {
    client,
    permissions,
    userContext,
    dataViewLevel,
    isServiceAvailable,
    isAuthenticated: !!user,
    queryClient
  }
}

// ============================================================================
// Permission-Filtered Engagement Hooks
// ============================================================================

/**
 * Hook for engagement metrics with automatic permission filtering
 */
export function useEngagementMetricsWithPermissions(params?: EngagementMetricsParams) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterEngagementParams(params, userContext)
  }, [params, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0)
  
  return useQuery({
    queryKey: analyticsQueryKeys.engagement(filteredRequest?.filteredParams),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.getEngagementMetrics(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.engagement,
    enabled: shouldFetch,
    select: (data: UserEngagementMetrics) => ({
      ...data,
      // Add metadata about filtering
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

/**
 * Hook for hourly engagement with permission filtering
 */
export function useHourlyEngagementWithPermissions(userId: string, date?: Date) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  // Check if user can access this data
  const canAccess = useMemo(() => {
    if (!userContext) return false
    
    // Users can only access their own data unless they have broader permissions
    if (userContext.role === 'learner' && userId !== userContext.userId) {
      return false
    }
    
    return shouldRenderComponent('user-analytics', userContext)
  }, [userContext, userId])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && canAccess && !!userId)
  
  return useQuery({
    queryKey: analyticsQueryKeys.hourlyEngagement(userId, date),
    queryFn: () => client.getHourlyEngagement(userId, date),
    ...analyticsQueryConfig.engagement,
    enabled: shouldFetch
  })
}

// ============================================================================
// Permission-Filtered Progress Hooks
// ============================================================================

/**
 * Hook for progress metrics with automatic permission filtering
 */
export function useProgressMetricsWithPermissions(params?: ProgressMetricsParams) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterProgressParams(params, userContext)
  }, [params, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0)
  
  return useQuery({
    queryKey: analyticsQueryKeys.progress(filteredRequest?.filteredParams),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.getProgressMetrics(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.progress,
    enabled: shouldFetch,
    select: (data: LearningProgressMetrics) => ({
      ...data,
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

/**
 * Hook for user journey with permission filtering
 */
export function useUserJourneyWithPermissions(userId: string) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const canAccess = useMemo(() => {
    if (!userContext) return false
    
    // Users can only access their own journey unless they have broader permissions
    if (userContext.role === 'learner' && userId !== userContext.userId) {
      return false
    }
    
    return shouldRenderComponent('user-analytics', userContext)
  }, [userContext, userId])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && canAccess && !!userId)
  
  return useQuery({
    queryKey: analyticsQueryKeys.userJourney(userId),
    queryFn: () => client.getUserJourney(userId),
    ...analyticsQueryConfig.progress,
    enabled: shouldFetch
  })
}

// ============================================================================
// Permission-Filtered Content Hooks
// ============================================================================

/**
 * Hook for content metrics with automatic permission filtering
 */
export function useContentMetricsWithPermissions(params?: ContentMetricsParams) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterContentParams(params, userContext)
  }, [params, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0)
  
  return useQuery({
    queryKey: analyticsQueryKeys.content(filteredRequest?.filteredParams),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.getContentMetrics(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.content,
    enabled: shouldFetch,
    select: (data: ContentPerformanceMetrics) => ({
      ...data,
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

/**
 * Hook for content gaps with permission filtering
 */
export function useContentGapsWithPermissions() {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const canAccess = useMemo(() => {
    if (!userContext) return false
    return shouldRenderComponent('content-analytics', userContext)
  }, [userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && canAccess)
  
  return useQuery({
    queryKey: analyticsQueryKeys.contentGaps(),
    queryFn: () => client.getContentGaps(),
    ...analyticsQueryConfig.content,
    enabled: shouldFetch
  })
}

// ============================================================================
// Permission-Filtered System Hooks
// ============================================================================

/**
 * Hook for system metrics with automatic permission filtering
 */
export function useSystemMetricsWithPermissions(params?: SystemMetricsParams) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterSystemParams(params, userContext)
  }, [params, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0)
  
  return useQuery({
    queryKey: analyticsQueryKeys.system(filteredRequest?.filteredParams),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.getSystemMetrics(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.system,
    enabled: shouldFetch,
    select: (data: SystemPerformanceMetrics) => ({
      ...data,
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

/**
 * Hook for alerts with permission filtering
 */
export function useAlertsWithPermissions(severity?: AlertSeverity) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const canAccess = useMemo(() => {
    if (!userContext) return false
    return shouldRenderComponent('alert-management', userContext)
  }, [userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && canAccess)
  
  return useQuery({
    queryKey: analyticsQueryKeys.alerts(severity),
    queryFn: () => client.getAlerts(severity),
    ...analyticsQueryConfig.system,
    enabled: shouldFetch,
    select: (data: Alert[]) => ({
      alerts: data,
      criticalCount: data.filter(alert => alert.severity === 'critical').length,
      errorCount: data.filter(alert => alert.severity === 'error').length,
      warningCount: data.filter(alert => alert.severity === 'warning').length,
      unresolvedCount: data.filter(alert => !alert.resolved).length,
      _metadata: {
        canManage: userContext ? shouldRenderComponent('alert-management', userContext) : false,
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

// ============================================================================
// Permission-Filtered Insights Hooks
// ============================================================================

/**
 * Hook for behavior insights with permission filtering
 */
export function useBehaviorInsightsWithPermissions(userId?: string) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const canAccess = useMemo(() => {
    if (!userContext) return false
    
    // Check if user can access insights
    if (!shouldRenderComponent('behavior-insights', userContext)) {
      return false
    }
    
    // If requesting specific user data, check permissions
    if (userId && userContext.role === 'learner' && userId !== userContext.userId) {
      return false
    }
    
    return true
  }, [userContext, userId])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && canAccess)
  
  return useQuery({
    queryKey: analyticsQueryKeys.behaviorInsights(userId),
    queryFn: () => client.getBehaviorInsights(userId),
    ...analyticsQueryConfig.insights,
    enabled: shouldFetch
  })
}

// ============================================================================
// Permission-Filtered Reports Hooks
// ============================================================================

/**
 * Hook for effectiveness reports with permission filtering
 */
export function useEffectivenessReportWithPermissions(filters?: ReportFilters) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterReportParams(filters, userContext)
  }, [filters, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0)
  
  return useQuery({
    queryKey: analyticsQueryKeys.effectivenessReport(filteredRequest?.filteredParams),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.getEffectivenessReport(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.reports,
    enabled: shouldFetch,
    select: (data: EffectivenessReport) => ({
      ...data,
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

// ============================================================================
// Permission-Filtered Historical Data Hooks
// ============================================================================

/**
 * Hook for historical metrics with permission filtering
 */
export function useHistoricalMetricsWithPermissions(query: HistoricalQuery) {
  const { client, userContext, isServiceAvailable, isAuthenticated } = useAnalyticsWithPermissions()
  
  const filteredRequest = useMemo(() => {
    if (!userContext) {
      return null
    }
    return filterHistoricalQuery(query, userContext)
  }, [query, userContext])
  
  const shouldFetch = Boolean(isServiceAvailable && isAuthenticated && userContext && 
                     filteredRequest && filteredRequest.restrictions.length === 0 &&
                     !!query.timeRange?.start && !!query.timeRange?.end)
  
  return useQuery({
    queryKey: analyticsQueryKeys.historical(filteredRequest?.filteredParams || query),
    queryFn: () => {
      if (!filteredRequest) {
        throw new Error('No filtered request available')
      }
      return client.queryHistoricalMetrics(filteredRequest.filteredParams)
    },
    ...analyticsQueryConfig.historical,
    enabled: shouldFetch,
    select: (data) => ({
      data,
      _metadata: {
        appliedFilters: filteredRequest?.appliedFilters || [],
        restrictions: filteredRequest?.restrictions || [],
        dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary'
      }
    })
  })
}

// ============================================================================
// Permission-Aware Summary Hook
// ============================================================================

/**
 * Hook for analytics summary with automatic permission filtering
 */
export function useAnalyticsSummaryWithPermissions() {
  const { userContext } = useAnalyticsWithPermissions()
  
  // Only fetch data that the user has permission to see
  const engagement = useEngagementMetricsWithPermissions()
  const progress = useProgressMetricsWithPermissions()
  const content = useContentMetricsWithPermissions()
  const system = useSystemMetricsWithPermissions()
  const alerts = useAlertsWithPermissions()
  
  return useMemo(() => ({
    // Loading states
    isLoading: engagement.isLoading || progress.isLoading || content.isLoading || 
               system.isLoading || alerts.isLoading,
    
    // Error states
    hasError: engagement.isError || progress.isError || content.isError || 
              system.isError || alerts.isError,
    
    // Data (only include what user can access)
    engagement: engagement.data,
    progress: progress.data,
    content: content.data,
    system: system.data,
    alerts: alerts.data,
    
    // Permission metadata
    permissions: userContext?.permissions,
    dataViewLevel: userContext ? getDataViewLevel(userContext) : 'summary',
    
    // Computed summary metrics (filtered based on available data)
    summary: {
      totalActiveUsers: engagement.data?.activeUsers24h || 0,
      completionRate: progress.data?.contentCompletionRate || 0,
      systemHealth: system.data ? (
        (100 - system.data.memoryUsagePercent) * 0.3 +
        (100 - system.data.cpuUsagePercent) * 0.3 +
        (100 - system.data.diskUsagePercent) * 0.2 +
        (system.data.cacheHitRate) * 0.2
      ) / 100 : 0,
      criticalAlerts: alerts.data?.criticalCount || 0,
      lastUpdated: new Date().toISOString(),
      availableFeatures: userContext ? [
        userContext.permissions.viewEngagement && 'engagement',
        userContext.permissions.viewProgress && 'progress',
        userContext.permissions.viewContent && 'content',
        userContext.permissions.viewSystem && 'system',
        userContext.permissions.viewAlerts && 'alerts'
      ].filter(Boolean) : []
    },
    
    // Refetch functions
    refetchAll: () => {
      engagement.refetch()
      progress.refetch()
      content.refetch()
      system.refetch()
      alerts.refetch()
    }
  }), [engagement, progress, content, system, alerts, userContext])
}

// ============================================================================
// Component Visibility Hooks
// ============================================================================

/**
 * Hook to determine if analytics components should be rendered
 */
export function useAnalyticsComponentVisibility() {
  const { userContext } = useAnalyticsWithPermissions()
  
  return useMemo(() => {
    if (!userContext) {
      return {
        showEngagement: false,
        showProgress: false,
        showContent: false,
        showSystem: false,
        showAlerts: false,
        showInsights: false,
        showReports: false,
        showUserAnalytics: false,
        showExport: false,
        showRealtime: false
      }
    }
    
    return {
      showEngagement: shouldRenderComponent('engagement-dashboard', userContext),
      showProgress: shouldRenderComponent('progress-tracking', userContext),
      showContent: shouldRenderComponent('content-analytics', userContext),
      showSystem: shouldRenderComponent('system-monitoring', userContext),
      showAlerts: shouldRenderComponent('alert-management', userContext),
      showInsights: shouldRenderComponent('behavior-insights', userContext),
      showReports: shouldRenderComponent('effectiveness-reports', userContext),
      showUserAnalytics: shouldRenderComponent('user-analytics', userContext),
      showExport: shouldRenderComponent('data-export', userContext),
      showRealtime: shouldRenderComponent('realtime-updates', userContext)
    }
  }, [userContext])
}