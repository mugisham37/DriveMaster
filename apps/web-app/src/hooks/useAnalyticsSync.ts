/**
 * Analytics Synchronization Hooks
 * 
 * Provides optimistic updates, rollback logic, and cross-tab synchronization
 * for analytics data using Broadcast Channel API.
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { analyticsQueryKeys } from '../lib/analytics-service/query-config'
import type {
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams
} from '../types/analytics-service'

// ============================================================================
// Types
// ============================================================================

interface OptimisticUpdate<T = Record<string, unknown>> {
  id: string
  queryKey: unknown[]
  previousData: T
  optimisticData: T
  timestamp: Date
  operation: string
}

interface SyncMessage {
  type: 'filter_change' | 'time_range_change' | 'invalidate_cache' | 'optimistic_update' | 'tab_connected' | 'tab_disconnected'
  payload: Record<string, unknown>
  timestamp: Date
  tabId: string
}

interface AnalyticsSyncOptions {
  enableCrossTab?: boolean
  enableOptimistic?: boolean
  channelName?: string
  tabId?: string
}

// ============================================================================
// Cross-tab Synchronization Hook
// ============================================================================

/**
 * Hook for cross-tab synchronization of analytics state.
 * Synchronizes filters, time ranges, and cache invalidations across browser tabs.
 */
export function useAnalyticsCrossTabSync(options: AnalyticsSyncOptions = {}) {
  const {
    enableCrossTab = true,
    channelName = 'analytics-sync',
    tabId = generateTabId()
  } = options
  
  const queryClient = useQueryClient()
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [connectedTabs] = useState<string[]>([])
  
  // Message handlers
  const handleFilterChange = useCallback(() => {
    // Update local filter state and invalidate relevant queries
    queryClient.invalidateQueries({ 
      queryKey: analyticsQueryKeys.all,
      predicate: (query) => {
        // Only invalidate queries that would be affected by filter changes
        const key = query.queryKey
        return key.includes('engagement') || key.includes('progress') || key.includes('content')
      }
    })
  }, [queryClient])
  
  const handleTimeRangeChange = useCallback(() => {
    // Invalidate time-sensitive queries
    queryClient.invalidateQueries({ 
      queryKey: analyticsQueryKeys.all,
      predicate: (query) => {
        const key = query.queryKey
        return key.includes('historical') || key.includes('reports')
      }
    })
  }, [queryClient])
  
  const handleCacheInvalidation = useCallback((payload: { queryKey?: unknown[] }) => {
    if (payload.queryKey) {
      queryClient.invalidateQueries({ queryKey: payload.queryKey })
    } else {
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all })
    }
  }, [queryClient])
  
  const handleOptimisticUpdate = useCallback((payload: OptimisticUpdate) => {
    // Apply optimistic update from another tab
    queryClient.setQueryData(payload.queryKey, payload.optimisticData)
  }, [queryClient])
  
  // Broadcasting functions
  const broadcastMessage = useCallback((type: string, payload: Record<string, unknown>) => {
    if (!channelRef.current) return
    
    const message: SyncMessage = {
      type: type as SyncMessage['type'],
      payload,
      timestamp: new Date(),
      tabId
    }
    
    channelRef.current.postMessage(message)
  }, [tabId])
  
  // Initialize broadcast channel
  useEffect(() => {
    if (!enableCrossTab || typeof BroadcastChannel === 'undefined') {
      return
    }
    
    const channel = new BroadcastChannel(channelName)
    channelRef.current = channel
    
    // Handle incoming messages
    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { type, payload, tabId: senderTabId } = event.data
      
      // Ignore messages from the same tab
      if (senderTabId === tabId) return
      
      switch (type) {
        case 'filter_change':
          handleFilterChange()
          break
        case 'time_range_change':
          handleTimeRangeChange()
          break
        case 'invalidate_cache':
          handleCacheInvalidation(payload)
          break
        case 'optimistic_update':
          // Reconstruct OptimisticUpdate from payload
          const update = payload as {
            id: string
            queryKey: unknown[]
            previousData: Record<string, unknown>
            optimisticData: Record<string, unknown>
            timestamp: string | number | Date
            operation: string
          }
          handleOptimisticUpdate({
            id: update.id,
            queryKey: update.queryKey,
            previousData: update.previousData,
            optimisticData: update.optimisticData,
            timestamp: new Date(update.timestamp),
            operation: update.operation
          })
          break
      }
    }
    
    channel.addEventListener('message', handleMessage)
    
    // Announce this tab's presence
    broadcastMessage('tab_connected', { tabId })
    
    return () => {
      channel.removeEventListener('message', handleMessage)
      broadcastMessage('tab_disconnected', { tabId })
      channel.close()
    }
  }, [enableCrossTab, channelName, tabId, handleFilterChange, handleTimeRangeChange, handleCacheInvalidation, handleOptimisticUpdate, broadcastMessage])
  
  const broadcastFilterChange = useCallback((filters: Record<string, unknown>) => {
    broadcastMessage('filter_change', filters)
  }, [broadcastMessage])
  
  const broadcastTimeRangeChange = useCallback((timeRange: Record<string, unknown>) => {
    broadcastMessage('time_range_change', timeRange)
  }, [broadcastMessage])
  
  const broadcastCacheInvalidation = useCallback((queryKey?: unknown[]) => {
    broadcastMessage('invalidate_cache', { queryKey })
  }, [broadcastMessage])
  
  return {
    connectedTabs,
    broadcastFilterChange,
    broadcastTimeRangeChange,
    broadcastCacheInvalidation,
    broadcastMessage,
    isSupported: typeof BroadcastChannel !== 'undefined'
  }
}

// ============================================================================
// Optimistic Updates Hook
// ============================================================================

/**
 * Hook for managing optimistic updates with rollback capability.
 */
export function useAnalyticsOptimisticUpdates(options: AnalyticsSyncOptions = {}) {
  const { enableOptimistic = true } = options
  
  const queryClient = useQueryClient()
  const optimisticUpdatesRef = useRef<Map<string, OptimisticUpdate>>(new Map())
  
  // Create a simple broadcast function for optimistic updates
  const broadcastOptimisticUpdate = useCallback((update: OptimisticUpdate) => {
    // This would broadcast to other tabs if cross-tab sync is enabled
    // For now, we'll just log it
    console.log('Optimistic update:', update.operation)
  }, [])
  
  // Generic optimistic update function
  const performOptimisticUpdate = useCallback(<T extends Record<string, unknown>>(
    queryKey: unknown[],
    optimisticData: T,
    operation: string
  ): string => {
    if (!enableOptimistic) return ''
    
    const updateId = generateUpdateId()
    const previousData = queryClient.getQueryData(queryKey) as T
    
    // Store the update for potential rollback
    const update: OptimisticUpdate<T> = {
      id: updateId,
      queryKey,
      previousData,
      optimisticData,
      timestamp: new Date(),
      operation
    }
    
    optimisticUpdatesRef.current.set(updateId, update as OptimisticUpdate)
    
    // Apply optimistic update
    queryClient.setQueryData(queryKey, optimisticData)
    
    // Broadcast to other tabs
    broadcastOptimisticUpdate(update)
    
    return updateId
  }, [enableOptimistic, queryClient, broadcastOptimisticUpdate])
  
  // Rollback function
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    const update = optimisticUpdatesRef.current.get(updateId)
    if (!update) return
    
    // Restore previous data
    queryClient.setQueryData(update.queryKey, update.previousData)
    
    // Remove from tracking
    optimisticUpdatesRef.current.delete(updateId)
    
    console.warn(`Rolled back optimistic update: ${update.operation}`)
  }, [queryClient])
  
  // Confirm optimistic update (remove from tracking)
  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    optimisticUpdatesRef.current.delete(updateId)
  }, [])
  
  // Specific optimistic update functions
  const optimisticEngagementUpdate = useCallback((
    data: Partial<UserEngagementMetrics>,
    params?: EngagementMetricsParams
  ) => {
    const queryKey = [...analyticsQueryKeys.engagement(params)]
    const currentData = queryClient.getQueryData(queryKey) as UserEngagementMetrics
    
    if (!currentData) return ''
    
    const optimisticData = { ...currentData, ...data }
    return performOptimisticUpdate(queryKey, optimisticData, 'engagement_update')
  }, [queryClient, performOptimisticUpdate])
  
  const optimisticProgressUpdate = useCallback((
    data: Partial<LearningProgressMetrics>,
    params?: ProgressMetricsParams
  ) => {
    const queryKey = [...analyticsQueryKeys.progress(params)]
    const currentData = queryClient.getQueryData(queryKey) as LearningProgressMetrics
    
    if (!currentData) return ''
    
    const optimisticData = { ...currentData, ...data }
    return performOptimisticUpdate(queryKey, optimisticData, 'progress_update')
  }, [queryClient, performOptimisticUpdate])
  
  const optimisticContentUpdate = useCallback((
    data: Partial<ContentPerformanceMetrics>,
    params?: ContentMetricsParams
  ) => {
    const queryKey = [...analyticsQueryKeys.content(params)]
    const currentData = queryClient.getQueryData(queryKey) as ContentPerformanceMetrics
    
    if (!currentData) return ''
    
    const optimisticData = { ...currentData, ...data }
    return performOptimisticUpdate(queryKey, optimisticData, 'content_update')
  }, [queryClient, performOptimisticUpdate])
  
  return {
    optimisticEngagementUpdate,
    optimisticProgressUpdate,
    optimisticContentUpdate,
    rollbackOptimisticUpdate,
    confirmOptimisticUpdate,
    pendingUpdates: optimisticUpdatesRef.current.size
  }
}

// ============================================================================
// Analytics Mutations with Optimistic Updates
// ============================================================================

/**
 * Hook for analytics mutations with built-in optimistic updates and rollback.
 */
export function useAnalyticsMutationsWithOptimistic() {
  const queryClient = useQueryClient()
  const { 
    optimisticEngagementUpdate,
    rollbackOptimisticUpdate,
    confirmOptimisticUpdate
  } = useAnalyticsOptimisticUpdates()
  
  // Example: Update user engagement (if such an operation existed)
  const updateEngagementMutation = useMutation({
    mutationFn: async (data: { userId: string; engagement: Partial<UserEngagementMetrics> }) => {
      // This would be an actual API call if the analytics service supported updates
      // For now, this is a placeholder for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000))
      return data.engagement
    },
    onMutate: async (variables) => {
      // Perform optimistic update
      const updateId = optimisticEngagementUpdate(variables.engagement)
      return { updateId }
    },
    onSuccess: (_data, _variables, context) => {
      // Confirm the optimistic update
      if (context?.updateId) {
        confirmOptimisticUpdate(context.updateId)
      }
      
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.engagement() })
    },
    onError: (error, _variables, context) => {
      // Rollback the optimistic update
      if (context?.updateId) {
        rollbackOptimisticUpdate(context.updateId)
      }
      
      console.error('Failed to update engagement:', error)
    }
  })
  
  // Example: Refresh analytics data with optimistic loading state
  const refreshAnalyticsMutation = useMutation({
    mutationFn: async () => {
      // Invalidate all analytics queries to force refresh
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all })
      return true
    },
    onMutate: () => {
      // Could show optimistic loading state
      return { startTime: Date.now() }
    },
    onSuccess: (_data, _variables, context) => {
      const duration = Date.now() - (context?.startTime || 0)
      console.log(`Analytics refresh completed in ${duration}ms`)
    },
    onError: (error) => {
      console.error('Failed to refresh analytics:', error)
    }
  })
  
  return {
    updateEngagement: updateEngagementMutation,
    refreshAnalytics: refreshAnalyticsMutation
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique tab ID for cross-tab communication.
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generates a unique update ID for optimistic updates.
 */
function generateUpdateId(): string {
  return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Combined Analytics Sync Hook
// ============================================================================

/**
 * Combined hook that provides all analytics synchronization features.
 */
export function useAnalyticsSync(options: AnalyticsSyncOptions = {}) {
  const crossTabSync = useAnalyticsCrossTabSync(options)
  const optimisticUpdates = useAnalyticsOptimisticUpdates(options)
  const mutations = useAnalyticsMutationsWithOptimistic()
  
  return {
    // Cross-tab synchronization
    ...crossTabSync,
    
    // Optimistic updates
    ...optimisticUpdates,
    
    // Mutations with optimistic updates
    ...mutations
  }
}