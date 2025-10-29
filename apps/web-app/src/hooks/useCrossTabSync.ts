/**
 * React hooks for cross-tab cache synchronization
 * 
 * This module provides hooks to manage cross-tab cache synchronization,
 * conflict resolution, and consistency verification.
 */

import { useEffect, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  initializeCrossTabSync, 
  getCrossTabSynchronizer,
  withCrossTabSync,
  type TabInfo,
  type CacheConflict
} from '@/lib/cache/cross-tab-sync'

// ============================================================================
// Main Cross-Tab Sync Hook
// ============================================================================

export function useCrossTabSync() {
  const queryClient = useQueryClient()
  
  // Initialize synchronizer if not already done
  const getSynchronizer = useCallback(() => {
    try {
      return getCrossTabSynchronizer()
    } catch {
      return initializeCrossTabSync(queryClient)
    }
  }, [queryClient])

  const synchronizer = getSynchronizer()

  return {
    // Broadcasting methods
    broadcastInvalidation: (queryKey: readonly unknown[], userId?: string) =>
      synchronizer.broadcastCacheInvalidation(queryKey, userId),
    
    broadcastUpdate: (queryKey: readonly unknown[], data: unknown, userId?: string) =>
      synchronizer.broadcastCacheUpdate(queryKey, data, userId),
    
    broadcastOptimisticUpdate: (queryKey: readonly unknown[], data: unknown, userId?: string) =>
      synchronizer.broadcastOptimisticUpdate(queryKey, data, userId),
    
    broadcastOptimisticRollback: (queryKey: readonly unknown[], userId?: string) =>
      synchronizer.broadcastOptimisticRollback(queryKey, userId),
    
    broadcastUserLogout: (userId: string) =>
      synchronizer.broadcastUserLogout(userId),
    
    broadcastUserSwitch: (newUserId: string) =>
      synchronizer.broadcastUserSwitch(newUserId),

    // Sync management
    requestSync: () => synchronizer.requestCacheSync(),
    
    // Status methods
    getActiveTabs: () => synchronizer.getActiveTabs(),
    getConflictStatus: () => synchronizer.getConflictStatus(),
    
    // Consistency methods
    verifyConsistency: (userId: string) => synchronizer.verifyCacheConsistency(userId),
    repairInconsistencies: (userId: string) => synchronizer.repairCacheInconsistencies(userId)
  }
}

// ============================================================================
// Tab Activity Monitoring Hook
// ============================================================================

export function useTabActivityMonitor() {
  const [activeTabs, setActiveTabs] = useState<TabInfo[]>([])
  const [isMultiTab, setIsMultiTab] = useState(false)
  const { getActiveTabs } = useCrossTabSync()

  useEffect(() => {
    const updateTabInfo = () => {
      const tabs = getActiveTabs()
      setActiveTabs(tabs)
      setIsMultiTab(tabs.length > 1)
    }

    // Update immediately
    updateTabInfo()

    // Update periodically
    const interval = setInterval(updateTabInfo, 5000)

    return () => clearInterval(interval)
  }, [getActiveTabs])

  return {
    activeTabs,
    isMultiTab,
    tabCount: activeTabs.length
  }
}

// ============================================================================
// Conflict Resolution Hook
// ============================================================================

export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<CacheConflict[]>([])
  const [hasConflicts, setHasConflicts] = useState(false)
  const { getConflictStatus, repairInconsistencies } = useCrossTabSync()

  useEffect(() => {
    const updateConflictStatus = () => {
      const status = getConflictStatus()
      setConflicts(status.conflicts)
      setHasConflicts(status.activeConflicts > 0)
    }

    // Update immediately
    updateConflictStatus()

    // Update periodically
    const interval = setInterval(updateConflictStatus, 2000)

    return () => clearInterval(interval)
  }, [getConflictStatus])

  const resolveAllConflicts = useCallback(async (userId: string) => {
    if (hasConflicts) {
      await repairInconsistencies(userId)
      // Force update after repair
      setTimeout(() => {
        const status = getConflictStatus()
        setConflicts(status.conflicts)
        setHasConflicts(status.activeConflicts > 0)
      }, 1000)
    }
  }, [hasConflicts, repairInconsistencies, getConflictStatus])

  return {
    conflicts,
    hasConflicts,
    conflictCount: conflicts.length,
    resolveAllConflicts
  }
}

// ============================================================================
// Synchronized Mutation Hook
// ============================================================================

export function useSynchronizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: readonly unknown[],
  userId?: string
) {
  const syncConfig = withCrossTabSync(mutationFn, queryKey, userId)
  
  return {
    mutationFn: syncConfig.mutationFn,
    onMutate: syncConfig.onMutate,
    onSuccess: syncConfig.onSuccess,
    onError: syncConfig.onError
  }
}

// ============================================================================
// User Session Sync Hook
// ============================================================================

export function useUserSessionSync(userId?: string) {
  const { broadcastUserLogout, broadcastUserSwitch } = useCrossTabSync()

  const handleLogout = useCallback(async () => {
    if (userId) {
      await broadcastUserLogout(userId)
    }
  }, [userId, broadcastUserLogout])

  const handleUserSwitch = useCallback(async (newUserId: string) => {
    await broadcastUserSwitch(newUserId)
  }, [broadcastUserSwitch])

  // Auto-broadcast on user changes
  useEffect(() => {
    if (userId) {
      broadcastUserSwitch(userId)
    }
  }, [userId, broadcastUserSwitch])

  return {
    handleLogout,
    handleUserSwitch
  }
}

// ============================================================================
// Cache Consistency Hook
// ============================================================================

export function useCacheConsistency(userId?: string) {
  const [isConsistent, setIsConsistent] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const { verifyConsistency, repairInconsistencies } = useCrossTabSync()

  const checkConsistency = useCallback(async () => {
    if (!userId) return

    setIsChecking(true)
    try {
      const consistent = await verifyConsistency(userId)
      setIsConsistent(consistent)
    } catch (error) {
      console.warn('Consistency check failed:', error)
      setIsConsistent(false)
    } finally {
      setIsChecking(false)
    }
  }, [userId, verifyConsistency])

  const repairConsistency = useCallback(async () => {
    if (!userId) return

    setIsChecking(true)
    try {
      await repairInconsistencies(userId)
      setIsConsistent(true)
    } catch (error) {
      console.warn('Consistency repair failed:', error)
    } finally {
      setIsChecking(false)
    }
  }, [userId, repairInconsistencies])

  // Auto-check consistency periodically
  useEffect(() => {
    if (!userId) return

    checkConsistency()
    
    const interval = setInterval(checkConsistency, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [userId, checkConsistency])

  return {
    isConsistent,
    isChecking,
    checkConsistency,
    repairConsistency
  }
}

// ============================================================================
// Cross-Tab Notification Hook
// ============================================================================

export function useCrossTabNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'info' | 'warning' | 'error'
    message: string
    timestamp: number
  }>>([])

  const { isMultiTab } = useTabActivityMonitor()
  const { hasConflicts } = useConflictResolution()

  // Add notifications based on cross-tab state
  useEffect(() => {
    const newNotifications = []

    if (isMultiTab) {
      newNotifications.push({
        id: 'multi-tab',
        type: 'info' as const,
        message: 'Multiple tabs detected. Cache is synchronized across tabs.',
        timestamp: Date.now()
      })
    }

    if (hasConflicts) {
      newNotifications.push({
        id: 'conflicts',
        type: 'warning' as const,
        message: 'Cache conflicts detected. Some data may be inconsistent.',
        timestamp: Date.now()
      })
    }

    setNotifications(newNotifications)
  }, [isMultiTab, hasConflicts])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    hasNotifications: notifications.length > 0,
    dismissNotification,
    clearAllNotifications
  }
}

// ============================================================================
// Development/Debug Hook
// ============================================================================

export function useCrossTabDebug() {
  const { getActiveTabs, getConflictStatus } = useCrossTabSync()

  if (process.env.NODE_ENV !== 'development') {
    return {
      logTabState: () => {},
      logConflictState: () => {},
      exportSyncData: () => null
    }
  }

  return {
    logTabState: () => {
      const tabs = getActiveTabs()
      console.group('🔄 Cross-Tab State')
      console.table(tabs)
      console.groupEnd()
    },

    logConflictState: () => {
      const conflicts = getConflictStatus()
      console.group('⚠️ Conflict State')
      console.log('Active conflicts:', conflicts.activeConflicts)
      console.table(conflicts.conflicts)
      console.groupEnd()
    },

    exportSyncData: () => {
      return {
        activeTabs: getActiveTabs(),
        conflicts: getConflictStatus(),
        timestamp: Date.now()
      }
    }
  }
}