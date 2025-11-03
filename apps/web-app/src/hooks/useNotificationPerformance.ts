/**
 * Notification Performance Hook
 * Provides React integration for notification performance monitoring
 * 
 * Implements Task 12: Performance Optimization and Monitoring
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  NotificationPerformanceManager,
  createNotificationPerformanceManager,
  NotificationPerformanceManagerConfig,
  NotificationPerformanceStats
} from '@/lib/notification-service/performance-manager'
import { notificationApiClient } from '@/lib/notification-service/api-client'
import { PerformanceAlert } from '@/lib/notification-service/performance-monitor'

export interface UseNotificationPerformanceOptions {
  config?: Partial<NotificationPerformanceManagerConfig>
  autoInitialize?: boolean
  refreshInterval?: number
  enableRealTimeUpdates?: boolean
}

export interface NotificationPerformanceHookReturn {
  // Manager instance
  performanceManager: NotificationPerformanceManager | null
  
  // State
  isInitialized: boolean
  isLoading: boolean
  error: Error | null
  
  // Performance data
  stats: NotificationPerformanceStats | null
  alerts: PerformanceAlert[]
  
  // Actions
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  recordUIOperation: (operation: string, duration: number) => void
  updateCacheMetrics: (hits: number, misses: number, size: number, evictions?: number) => void
  updateRealtimeMetrics: (
    connectionLatency: number,
    messageDeliveryTime: number,
    reconnectionCount: number,
    connectionUptime: number
  ) => void
  executeOptimizedRequest: <T>(
    operation: string,
    params: unknown,
    priority?: 'high' | 'medium' | 'low'
  ) => Promise<T>
  
  // Utilities
  resetStats: () => void
  logSummary: () => void
  destroy: () => void
}

export function useNotificationPerformance(
  options: UseNotificationPerformanceOptions = {}
): NotificationPerformanceHookReturn {
  const {
    config,
    autoInitialize = true,
    refreshInterval = 5000,
    enableRealTimeUpdates = true
  } = options

  // State
  const [performanceManager, setPerformanceManager] = useState<NotificationPerformanceManager | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState<NotificationPerformanceStats | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const alertUnsubscribeRef = useRef<(() => void) | null>(null)

  /**
   * Initialize performance manager
   */
  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const manager = createNotificationPerformanceManager(notificationApiClient, config)
      await manager.initialize()
      
      setPerformanceManager(manager)
      setIsInitialized(true)

      // Subscribe to alerts if real-time updates are enabled
      if (enableRealTimeUpdates) {
        const components = manager.getComponents()
        if (components.performanceMonitor) {
          const unsubscribe = components.performanceMonitor.onAlert((alert) => {
            setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
          })
          alertUnsubscribeRef.current = unsubscribe
        }
      }

      console.log('[useNotificationPerformance] Performance manager initialized')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize performance manager')
      setError(error)
      console.error('[useNotificationPerformance] Initialization failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [config, isInitialized, isLoading, enableRealTimeUpdates])

  /**
   * Refresh performance data
   */
  const refresh = useCallback(async () => {
    if (!performanceManager) return

    try {
      const currentStats = performanceManager.getStats()
      setStats(currentStats)

      // Get recent alerts
      const components = performanceManager.getComponents()
      if (components.performanceMonitor) {
        const recentAlerts = components.performanceMonitor.getAlerts(10)
        setAlerts(recentAlerts)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh performance data')
      setError(error)
      console.error('[useNotificationPerformance] Refresh failed:', error)
    }
  }, [performanceManager])

  /**
   * Record UI operation performance
   */
  const recordUIOperation = useCallback((operation: string, duration: number) => {
    if (performanceManager) {
      performanceManager.recordUIOperation(operation, duration)
    }
  }, [performanceManager])

  /**
   * Update cache metrics
   */
  const updateCacheMetrics = useCallback((
    hits: number, 
    misses: number, 
    size: number, 
    evictions: number = 0
  ) => {
    if (performanceManager) {
      performanceManager.updateCacheMetrics(hits, misses, size, evictions)
    }
  }, [performanceManager])

  /**
   * Update real-time connection metrics
   */
  const updateRealtimeMetrics = useCallback((
    connectionLatency: number,
    messageDeliveryTime: number,
    reconnectionCount: number,
    connectionUptime: number
  ) => {
    if (performanceManager) {
      performanceManager.updateRealtimeMetrics(
        connectionLatency,
        messageDeliveryTime,
        reconnectionCount,
        connectionUptime
      )
    }
  }, [performanceManager])

  /**
   * Execute optimized request
   */
  const executeOptimizedRequest = useCallback(async <T>(
    operation: string,
    params: unknown,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> => {
    if (!performanceManager) {
      throw new Error('Performance manager not initialized')
    }

    return performanceManager.executeOptimizedRequest<T>(operation, params, priority)
  }, [performanceManager])

  /**
   * Reset all statistics
   */
  const resetStats = useCallback(() => {
    if (performanceManager) {
      performanceManager.resetStats()
      setStats(null)
      setAlerts([])
    }
  }, [performanceManager])

  /**
   * Log performance summary
   */
  const logSummary = useCallback(() => {
    if (performanceManager) {
      performanceManager.logPerformanceSummary()
    }
  }, [performanceManager])

  /**
   * Cleanup and destroy
   */
  const destroy = useCallback(() => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    // Unsubscribe from alerts
    if (alertUnsubscribeRef.current) {
      alertUnsubscribeRef.current()
      alertUnsubscribeRef.current = null
    }

    // Destroy performance manager
    if (performanceManager) {
      performanceManager.destroy()
      setPerformanceManager(null)
    }

    // Reset state
    setIsInitialized(false)
    setStats(null)
    setAlerts([])
    setError(null)
  }, [performanceManager])

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isLoading) {
      initialize()
    }
  }, [autoInitialize, isInitialized, isLoading, initialize])

  // Setup refresh interval
  useEffect(() => {
    if (isInitialized && performanceManager && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(refresh, refreshInterval)
      
      // Initial refresh
      refresh()

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
      }
    }
    
    return undefined
  }, [isInitialized, performanceManager, refreshInterval, refresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy()
    }
  }, [destroy])

  return {
    // Manager instance
    performanceManager,
    
    // State
    isInitialized,
    isLoading,
    error,
    
    // Performance data
    stats,
    alerts,
    
    // Actions
    initialize,
    refresh,
    recordUIOperation,
    updateCacheMetrics,
    updateRealtimeMetrics,
    executeOptimizedRequest,
    
    // Utilities
    resetStats,
    logSummary,
    destroy
  }
}

/**
 * Hook for measuring UI operation performance
 */
export function useUIPerformanceMeasurement() {
  const { recordUIOperation } = useNotificationPerformance({ autoInitialize: false })

  const measureOperation = useCallback((operation: string) => {
    const startTime = performance.now()
    
    return {
      end: () => {
        const duration = performance.now() - startTime
        recordUIOperation(operation, duration)
        return duration
      }
    }
  }, [recordUIOperation])

  const measureAsync = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const measurement = measureOperation(operation)
    
    try {
      const result = await asyncFn()
      const duration = measurement.end()
      return { result, duration }
    } catch (error) {
      measurement.end()
      throw error
    }
  }, [measureOperation])

  return {
    measureOperation,
    measureAsync
  }
}

/**
 * Hook for performance-aware component rendering
 */
export function usePerformanceAwareRendering(componentName: string) {
  const { recordUIOperation } = useNotificationPerformance({ autoInitialize: false })
  const renderStartRef = useRef<number | null>(null)

  const startRender = useCallback(() => {
    renderStartRef.current = performance.now()
  }, [])

  const endRender = useCallback(() => {
    if (renderStartRef.current !== null) {
      const duration = performance.now() - renderStartRef.current
      recordUIOperation(`${componentName}-render`, duration)
      renderStartRef.current = null
      return duration
    }
    return 0
  }, [componentName, recordUIOperation])

  // Auto-measure render on mount
  useEffect(() => {
    startRender()
    return () => {
      endRender()
    }
  }, [startRender, endRender])

  return {
    startRender,
    endRender
  }
}