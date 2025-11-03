/**
 * Performance Manager Hook
 * React hook for integrating performance optimization and monitoring
 * Implements Task 11 integration with React components
 */

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  PerformanceManager, 
  createPerformanceManager, 
  PerformanceManagerConfig,
  PerformanceManagerStats
} from '../lib/performance'
import { useUserServiceClient } from './useUserServiceClient'

export interface UsePerformanceManagerOptions {
  config?: Partial<PerformanceManagerConfig>
  enableNavigationTracking?: boolean
  enableIdlePrefetching?: boolean
  logInterval?: number
}

export interface PerformanceManagerHook {
  performanceManager: PerformanceManager | null
  stats: PerformanceManagerStats | null
  isInitialized: boolean
  optimizeRequest: <T>(
    operation: string,
    params: unknown,
    priority?: 'high' | 'medium' | 'low'
  ) => Promise<T>
  recordNavigation: (from: string, to: string, timeSpent: number) => void
  executePrefetch: (
    trigger: 'navigation' | 'idle' | 'interaction' | 'time',
    context: {
      userId: string
      currentRoute: string
      navigationHistory: string[]
    }
  ) => Promise<void>
  getHealthSummary: () => {
    overall: 'good' | 'warning' | 'critical'
    components: {
      requestOptimization: 'good' | 'warning' | 'critical'
      performanceMonitoring: 'good' | 'warning' | 'critical'
      intelligentPrefetching: 'good' | 'warning' | 'critical'
      webVitals: 'good' | 'warning' | 'critical'
    }
    recommendations: string[]
  }
  logPerformanceSummary: () => void
}

export function usePerformanceManager(
  options: UsePerformanceManagerOptions = {}
): PerformanceManagerHook {
  const {
    config = {},
    enableNavigationTracking = true,
    enableIdlePrefetching = true,
    logInterval = 60000 // 1 minute
  } = options

  const queryClient = useQueryClient()
  const userServiceClient = useUserServiceClient()
  
  const [performanceManager, setPerformanceManager] = useState<PerformanceManager | null>(null)
  const [stats, setStats] = useState<PerformanceManagerStats | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const navigationHistory = useRef<string[]>([])
  const currentRoute = useRef<string>('')
  const routeStartTime = useRef<number>(Date.now())
  const logTimer = useRef<NodeJS.Timeout | null>(null)
  const idleTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize performance manager
  useEffect(() => {
    if (!userServiceClient || performanceManager) return

    const initializeManager = async () => {
      try {
        const manager = createPerformanceManager(userServiceClient, queryClient, config)
        await manager.initialize()
        
        setPerformanceManager(manager)
        setIsInitialized(true)
        
        console.log('[usePerformanceManager] Performance manager initialized')
      } catch (error) {
        console.error('[usePerformanceManager] Failed to initialize performance manager:', error)
      }
    }

    initializeManager()
  }, [userServiceClient, queryClient, config, performanceManager])

  // Setup navigation tracking
  useEffect(() => {
    if (!performanceManager || !enableNavigationTracking) return undefined

    const handleRouteChange = (url: string) => {
      const previousRoute = currentRoute.current
      const timeSpent = Date.now() - routeStartTime.current

      if (previousRoute && previousRoute !== url) {
        // Record navigation pattern
        performanceManager.recordNavigation(previousRoute, url, timeSpent)
        
        // Add to navigation history
        navigationHistory.current.push(url)
        if (navigationHistory.current.length > 10) {
          navigationHistory.current.shift()
        }

        // Execute navigation-based prefetching
        if (typeof window !== 'undefined') {
          const userId = localStorage.getItem('userId') // Adjust based on your auth implementation
          if (userId) {
            performanceManager.executePrefetch('navigation', {
              userId,
              currentRoute: url,
              navigationHistory: [...navigationHistory.current]
            }).catch(error => {
              console.warn('[usePerformanceManager] Navigation prefetch failed:', error)
            })
          }
        }
      }

      currentRoute.current = url
      routeStartTime.current = Date.now()
    }

    // Listen to route changes (Next.js specific)
    if (typeof window !== 'undefined') {
      handleRouteChange(window.location.pathname)
      
      // Listen for popstate events
      const handlePopState = () => {
        handleRouteChange(window.location.pathname)
      }
      
      window.addEventListener('popstate', handlePopState)
      
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
    
    return undefined
  }, [performanceManager, enableNavigationTracking])

  // Setup idle prefetching
  useEffect(() => {
    if (!performanceManager || !enableIdlePrefetching) return undefined

    const scheduleIdlePrefetch = () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current)
      }

      idleTimer.current = setTimeout(() => {
        if (typeof window !== 'undefined' && performanceManager) {
          const userId = localStorage.getItem('userId')
          if (userId) {
            performanceManager.executePrefetch('idle', {
              userId,
              currentRoute: currentRoute.current,
              navigationHistory: [...navigationHistory.current]
            }).catch(error => {
              console.warn('[usePerformanceManager] Idle prefetch failed:', error)
            })
          }
        }
      }, 5000) // 5 seconds of inactivity
    }

    // Reset idle timer on user activity
    const resetIdleTimer = () => {
      scheduleIdlePrefetch()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', resetIdleTimer)
      window.addEventListener('keypress', resetIdleTimer)
      window.addEventListener('scroll', resetIdleTimer)
      window.addEventListener('click', resetIdleTimer)
      
      scheduleIdlePrefetch()

      return () => {
        window.removeEventListener('mousemove', resetIdleTimer)
        window.removeEventListener('keypress', resetIdleTimer)
        window.removeEventListener('scroll', resetIdleTimer)
        window.removeEventListener('click', resetIdleTimer)
        
        if (idleTimer.current) {
          clearTimeout(idleTimer.current)
        }
      }
    }
    
    return undefined
  }, [performanceManager, enableIdlePrefetching])

  // Setup periodic stats collection and logging
  useEffect(() => {
    if (!performanceManager || !logInterval) return

    logTimer.current = setInterval(() => {
      const currentStats = performanceManager.getStats()
      setStats(currentStats)
      
      // Log performance summary in development
      if (process.env.NODE_ENV === 'development') {
        performanceManager.logPerformanceSummary()
      }
    }, logInterval)

    return () => {
      if (logTimer.current) {
        clearInterval(logTimer.current)
      }
    }
  }, [performanceManager, logInterval])

  // Optimize request function
  const optimizeRequest = async <T>(
    operation: string,
    params: unknown,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> => {
    if (!performanceManager) {
      throw new Error('Performance manager not initialized')
    }
    
    return performanceManager.optimizeRequest<T>(operation, params, priority)
  }

  // Record navigation function
  const recordNavigation = (from: string, to: string, timeSpent: number) => {
    if (performanceManager) {
      performanceManager.recordNavigation(from, to, timeSpent)
    }
  }

  // Execute prefetch function
  const executePrefetch = async (
    trigger: 'navigation' | 'idle' | 'interaction' | 'time',
    context: {
      userId: string
      currentRoute: string
      navigationHistory: string[]
    }
  ) => {
    if (performanceManager) {
      await performanceManager.executePrefetch(trigger, context)
    }
  }

  // Get health summary function
  const getHealthSummary = () => {
    if (!performanceManager) {
      return {
        overall: 'good' as const,
        components: {
          requestOptimization: 'good' as const,
          performanceMonitoring: 'good' as const,
          intelligentPrefetching: 'good' as const,
          webVitals: 'good' as const
        },
        recommendations: []
      }
    }
    
    return performanceManager.getHealthSummary()
  }

  // Log performance summary function
  const logPerformanceSummary = () => {
    if (performanceManager) {
      performanceManager.logPerformanceSummary()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (logTimer.current) {
        clearInterval(logTimer.current)
      }
      if (idleTimer.current) {
        clearTimeout(idleTimer.current)
      }
      if (performanceManager) {
        performanceManager.flush().catch(console.error)
      }
    }
  }, [performanceManager])

  return {
    performanceManager,
    stats,
    isInitialized,
    optimizeRequest,
    recordNavigation,
    executePrefetch,
    getHealthSummary,
    logPerformanceSummary
  }
}

// Hook for accessing performance manager in components
export function usePerformanceOptimization() {
  const { optimizeRequest, executePrefetch, recordNavigation } = usePerformanceManager()
  
  return {
    optimizeRequest,
    executePrefetch,
    recordNavigation
  }
}

// Hook for performance monitoring
export function usePerformanceMonitoring() {
  const { stats, getHealthSummary, logPerformanceSummary } = usePerformanceManager()
  
  return {
    stats,
    getHealthSummary,
    logPerformanceSummary
  }
}