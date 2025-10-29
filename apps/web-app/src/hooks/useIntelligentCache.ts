/**
 * React hooks for intelligent cache management
 * 
 * This module provides hooks to interact with the intelligent cache manager,
 * including navigation tracking, cache warming, and strategy management.
 */

import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { 
  getIntelligentCacheManager, 
  initializeIntelligentCacheManager,
  type CacheStrategy,
  type CacheStrategyConfig 
} from '@/lib/cache/cache-strategies'

// ============================================================================
// Main Intelligent Cache Hook
// ============================================================================

export function useIntelligentCache() {
  const queryClient = useQueryClient()
  
  // Initialize cache manager if not already done
  const getCacheManager = useCallback(() => {
    try {
      return getIntelligentCacheManager()
    } catch {
      return initializeIntelligentCacheManager(queryClient)
    }
  }, [queryClient])

  const cacheManager = getCacheManager()

  return {
    // Cache strategy management
    setStrategy: (dataType: string, config: CacheStrategyConfig) => 
      cacheManager.setStrategyConfig(dataType, config),
    
    getStrategy: (dataType: string) => 
      cacheManager.getStrategyConfig(dataType),

    // Cache invalidation
    invalidateByTag: (tagName: string, refetchActive = true) =>
      cacheManager.invalidateByTag(tagName, { refetchActive }),
    
    invalidateByPattern: (pattern: RegExp, refetchActive = true) =>
      cacheManager.invalidateByPattern(pattern, { refetchActive }),
    
    invalidateUser: (userId: string, refetchActive = true) =>
      cacheManager.invalidateUserCaches(userId, { refetchActive }),

    // Navigation and prefetching
    recordNavigation: (from: string, to: string) =>
      cacheManager.recordNavigation(from, to),
    
    warmCache: (userId: string, context?: string) =>
      cacheManager.warmCacheIntelligently(userId, context),

    // Cache statistics
    getStats: () => cacheManager.getCacheStats(),
    
    // Cleanup
    cleanupOldPatterns: (maxAge?: number) =>
      cacheManager.cleanupOldPatterns(maxAge)
  }
}

// ============================================================================
// Navigation Tracking Hook
// ============================================================================

export function useNavigationTracking() {
  const router = useRouter()
  const { recordNavigation } = useIntelligentCache()

  useEffect(() => {
    let previousRoute = router.asPath

    const handleRouteChange = (url: string) => {
      recordNavigation(previousRoute, url)
      previousRoute = url
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router, recordNavigation])
}

// ============================================================================
// Cache Warming Hook
// ============================================================================

export function useCacheWarming(userId?: string) {
  const { warmCache } = useIntelligentCache()
  const router = useRouter()

  // Warm cache when user ID becomes available
  useEffect(() => {
    if (userId) {
      const context = getContextFromRoute(router.pathname)
      warmCache(userId, context)
    }
  }, [userId, warmCache, router.pathname])

  // Warm cache on route changes
  useEffect(() => {
    if (!userId) return

    const handleRouteChange = (url: string) => {
      const context = getContextFromRoute(url)
      warmCache(userId, context)
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [userId, warmCache, router])

  return {
    warmCache: (context?: string) => userId && warmCache(userId, context)
  }
}

// ============================================================================
// Cache Strategy Hook
// ============================================================================

export function useCacheStrategy(dataType: string) {
  const { setStrategy, getStrategy } = useIntelligentCache()

  const updateStrategy = useCallback((strategy: CacheStrategy, options?: Partial<CacheStrategyConfig>) => {
    const currentConfig = getStrategy(dataType)
    const newConfig: CacheStrategyConfig = {
      ...currentConfig,
      strategy,
      ...options
    }
    setStrategy(dataType, newConfig)
  }, [dataType, setStrategy, getStrategy])

  return {
    currentStrategy: getStrategy(dataType),
    updateStrategy,
    setCacheFirst: (options?: Partial<CacheStrategyConfig>) => 
      updateStrategy('cache-first', options),
    setNetworkFirst: (options?: Partial<CacheStrategyConfig>) => 
      updateStrategy('network-first', options),
    setStaleWhileRevalidate: (options?: Partial<CacheStrategyConfig>) => 
      updateStrategy('stale-while-revalidate', options),
    setNetworkOnly: (options?: Partial<CacheStrategyConfig>) => 
      updateStrategy('network-only', options)
  }
}

// ============================================================================
// Cache Invalidation Hook
// ============================================================================

export function useCacheInvalidation() {
  const { invalidateByTag, invalidateByPattern, invalidateUser } = useIntelligentCache()

  return {
    // Tag-based invalidation
    invalidateUserData: (userId: string) => invalidateUser(userId),
    invalidateProfileData: () => invalidateByTag('profile'),
    invalidateProgressData: () => invalidateByTag('progress'),
    invalidateActivityData: () => invalidateByTag('activity'),
    invalidateGdprData: () => invalidateByTag('gdpr'),
    
    // Pattern-based invalidation
    invalidateUserPattern: (userId: string) => 
      invalidateByPattern(new RegExp(`"${userId}"`)),
    invalidateTopicPattern: (topic: string) => 
      invalidateByPattern(new RegExp(`"${topic}"`)),
    
    // Custom invalidation
    invalidateByTag,
    invalidateByPattern
  }
}

// ============================================================================
// Cache Statistics Hook
// ============================================================================

export function useCacheStats() {
  const { getStats, cleanupOldPatterns } = useIntelligentCache()

  const stats = getStats()

  return {
    ...stats,
    cleanup: cleanupOldPatterns,
    healthScore: calculateCacheHealthScore(stats)
  }
}

// ============================================================================
// Cache Performance Hook
// ============================================================================

export function useCachePerformance() {
  const queryClient = useQueryClient()
  const { getStats } = useIntelligentCache()

  const measureCachePerformance = useCallback(() => {
    const stats = getStats()
    const queries = queryClient.getQueryCache().getAll()
    
    const userServiceQueries = queries.filter(query => 
      query.queryKey[0] === 'user-service'
    )

    const hitRate = userServiceQueries.length > 0 
      ? (userServiceQueries.length - stats.errorQueries) / userServiceQueries.length 
      : 0

    const avgResponseTime = userServiceQueries.reduce((acc, query) => {
      const state = query.state
      if (state.dataUpdatedAt && state.dataUpdatedAt > 0) {
        // Simple approximation of response time
        return acc + 100 // placeholder value
      }
      return acc
    }, 0) / userServiceQueries.length

    return {
      hitRate: Math.round(hitRate * 100),
      avgResponseTime: Math.round(avgResponseTime),
      cacheEfficiency: Math.round((1 - stats.staleQueries / stats.totalQueries) * 100),
      errorRate: Math.round((stats.errorQueries / stats.totalQueries) * 100)
    }
  }, [queryClient, getStats])

  return {
    measurePerformance: measureCachePerformance,
    getRealtimeStats: getStats
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function getContextFromRoute(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/progress')) return 'progress'
  if (pathname.startsWith('/activity')) return 'activity'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/privacy')) return 'privacy'
  return 'general'
}

function calculateCacheHealthScore(stats: { totalQueries: number; staleQueries: number; errorQueries: number; activeQueries: number }): number {
  const { totalQueries, staleQueries, errorQueries, activeQueries } = stats
  
  if (totalQueries === 0) return 100
  
  const staleRate = staleQueries / totalQueries
  const errorRate = errorQueries / totalQueries
  const activeRate = activeQueries / totalQueries
  
  // Health score based on low stale rate, low error rate, and reasonable active rate
  const healthScore = Math.max(0, 100 - (staleRate * 30) - (errorRate * 50) + (activeRate * 10))
  
  return Math.round(Math.min(100, healthScore))
}

// ============================================================================
// Cache Debugging Hook (Development Only)
// ============================================================================

export function useCacheDebug() {
  const queryClient = useQueryClient()
  const { getStats } = useIntelligentCache()

  if (process.env.NODE_ENV !== 'development') {
    return {
      logCacheState: () => {},
      logQueryDetails: () => {},
      exportCacheData: () => null
    }
  }

  return {
    logCacheState: () => {
      const stats = getStats()
      console.group('🗄️ Cache State')
      console.table(stats)
      console.groupEnd()
    },

    logQueryDetails: (queryKey?: string) => {
      const queries = queryClient.getQueryCache().getAll()
      const userServiceQueries = queries.filter(query => 
        query.queryKey[0] === 'user-service' &&
        (!queryKey || JSON.stringify(query.queryKey).includes(queryKey))
      )

      console.group('🔍 Query Details')
      userServiceQueries.forEach(query => {
        console.log({
          key: query.queryKey,
          status: query.state.status,
          dataUpdatedAt: new Date(query.state.dataUpdatedAt || 0),
          isStale: query.isStale(),
          observers: query.getObserversCount()
        })
      })
      console.groupEnd()
    },

    exportCacheData: () => {
      const queries = queryClient.getQueryCache().getAll()
      const userServiceQueries = queries.filter(query => 
        query.queryKey[0] === 'user-service'
      )

      return userServiceQueries.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
        status: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt,
        error: query.state.error
      }))
    }
  }
}