/**
 * Notification Filtering Hook
 * 
 * Integrates preference enforcement with notification display logic,
 * providing filtered notifications based on user preferences.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import { useMemo, useCallback } from 'react'
import { useNotifications } from './useNotifications'
import { useNotificationPreferences } from './useNotificationPreferences'
import { 
  preferenceEnforcementManager
} from '@/lib/notification-service'
import type {
  Notification,
  NotificationQueryParams,
  DeliveryChannel,
  NotificationType,
  NotificationPreferences,
  NotificationError
} from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface UseNotificationFilteringOptions extends NotificationQueryParams {
  channel?: DeliveryChannel
  respectPreferences?: boolean
  includeBlocked?: boolean
}

export interface FilteredNotificationResult {
  notification: Notification
  isBlocked: boolean
  blockReason?: string | undefined
  suggestedDelay?: number | undefined
  alternativeChannels?: DeliveryChannel[] | undefined
}

export interface UseNotificationFilteringResult {
  // Filtered notifications
  notifications: Notification[]
  blockedNotifications: FilteredNotificationResult[]
  
  // Counts
  totalCount: number
  allowedCount: number
  blockedCount: number
  
  // Status
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  
  // Preference status
  isInQuietHours: boolean
  preferences: NotificationPreferences | null
  
  // Methods
  checkNotification: (notification: Notification, channel?: DeliveryChannel) => FilteredNotificationResult
  refreshNotifications: () => void
  
  // Batching info
  batchedNotifications: Record<NotificationType, Notification[]>
  nextBatchTimes: Record<NotificationType, Date>
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook that provides notifications filtered by user preferences
 */
export function useNotificationFiltering(
  options: UseNotificationFilteringOptions = {}
): UseNotificationFilteringResult {
  const {
    channel = 'in_app',
    respectPreferences = true,
    includeBlocked = false,
    ...queryOptions
  } = options

  // Get raw notifications and preferences
  const notificationsQuery = useNotifications(queryOptions)
  const { preferences } = useNotificationPreferences()

  // Filter notifications based on preferences
  const filteredResults = useMemo(() => {
    if (!notificationsQuery.notifications || !preferences || !respectPreferences) {
      return {
        allowed: notificationsQuery.notifications || [],
        blocked: []
      }
    }

    const allowed: Notification[] = []
    const blocked: FilteredNotificationResult[] = []

    notificationsQuery.notifications.forEach(notification => {
      const enforcementResult = preferenceEnforcementManager.shouldDisplayNotification(
        notification,
        preferences,
        channel
      )

      if (enforcementResult.allowed) {
        allowed.push(notification)
        // Update frequency tracking for allowed notifications
        preferenceEnforcementManager.updateFrequencyTracking(notification)
      } else {
        blocked.push({
          notification,
          isBlocked: true,
          blockReason: enforcementResult.reason || undefined,
          suggestedDelay: enforcementResult.suggestedDelay || undefined,
          alternativeChannels: enforcementResult.alternativeChannels || undefined
        })
      }
    })

    return { allowed, blocked }
  }, [notificationsQuery.notifications, preferences, channel, respectPreferences])

  // Get batched notifications
  const batchedNotifications = useMemo(() => {
    if (!preferences) return {} as Record<NotificationType, Notification[]>

    const batched: Partial<Record<NotificationType, Notification[]>> = {}
    
    // Get batched notifications for each type
    Object.keys(preferences.frequency).forEach(type => {
      const notificationType = type as NotificationType
      const batch = preferenceEnforcementManager.getBatchedNotifications(notificationType)
      if (batch && batch.notifications.length > 0) {
        batched[notificationType] = batch.notifications
      }
    })

    return batched as Record<NotificationType, Notification[]>
  }, [preferences])

  // Calculate next batch times
  const nextBatchTimes = useMemo(() => {
    if (!preferences) return {} as Record<NotificationType, Date>

    const times: Partial<Record<NotificationType, Date>> = {}
    
    Object.entries(preferences.frequency).forEach(([type, settings]) => {
      if (settings.type === 'batched' || settings.type === 'daily' || settings.type === 'weekly') {
        times[type as NotificationType] = preferenceEnforcementManager.getNextScheduledTime(
          type as NotificationType,
          settings,
          preferences.quietHours?.timezone
        )
      }
    })

    return times as Record<NotificationType, Date>
  }, [preferences])

  // Check if currently in quiet hours
  const isInQuietHours = useMemo(() => {
    if (!preferences?.quietHours?.enabled) return false
    return preferenceEnforcementManager.isInQuietHours(preferences.quietHours)
  }, [preferences])

  // Method to check a single notification
  const checkNotification = useCallback((
    notification: Notification,
    checkChannel: DeliveryChannel = channel
  ): FilteredNotificationResult => {
    if (!preferences) {
      return {
        notification,
        isBlocked: false
      }
    }

    const enforcementResult = preferenceEnforcementManager.shouldDisplayNotification(
      notification,
      preferences,
      checkChannel
    )

    return {
      notification,
      isBlocked: !enforcementResult.allowed,
      blockReason: enforcementResult.reason || undefined,
      suggestedDelay: enforcementResult.suggestedDelay || undefined,
      alternativeChannels: enforcementResult.alternativeChannels || undefined
    }
  }, [preferences, channel])

  return {
    // Filtered notifications
    notifications: includeBlocked 
      ? [...filteredResults.allowed, ...filteredResults.blocked.map(b => b.notification)]
      : filteredResults.allowed,
    blockedNotifications: filteredResults.blocked,
    
    // Counts
    totalCount: notificationsQuery.totalCount,
    allowedCount: filteredResults.allowed.length,
    blockedCount: filteredResults.blocked.length,
    
    // Status
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    
    // Preference status
    isInQuietHours,
    preferences,
    
    // Methods
    checkNotification,
    refreshNotifications: notificationsQuery.refetch,
    
    // Batching info
    batchedNotifications,
    nextBatchTimes
  }
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for getting notifications for a specific channel with filtering
 */
export function useChannelNotifications(
  channel: DeliveryChannel,
  options: Omit<UseNotificationFilteringOptions, 'channel'> = {}
) {
  return useNotificationFiltering({
    ...options,
    channel
  })
}

/**
 * Hook for getting push notifications with preference filtering
 */
export function usePushNotifications(options: UseNotificationFilteringOptions = {}) {
  return useChannelNotifications('push', options)
}

/**
 * Hook for getting in-app notifications with preference filtering
 */
export function useInAppNotifications(options: UseNotificationFilteringOptions = {}) {
  return useChannelNotifications('in_app', options)
}

/**
 * Hook for getting email notifications with preference filtering
 */
export function useEmailNotifications(options: UseNotificationFilteringOptions = {}) {
  return useChannelNotifications('email', options)
}

/**
 * Hook for checking if notifications should be shown for a specific type
 */
export function useNotificationTypeStatus(type: NotificationType) {
  const { preferences } = useNotificationPreferences()
  
  return useMemo(() => {
    if (!preferences) {
      return {
        enabled: false,
        channels: [],
        frequency: null,
        inQuietHours: false
      }
    }

    const enabled = preferences.enabledTypes.includes(type)
    const channels = preferences.channels[type] || []
    const frequency = preferences.frequency[type] || null
    const inQuietHours = preferences.quietHours?.enabled 
      ? preferenceEnforcementManager.isInQuietHours(preferences.quietHours)
      : false

    return {
      enabled,
      channels,
      frequency,
      inQuietHours
    }
  }, [preferences, type])
}

/**
 * Hook for getting notification statistics and insights
 */
export function useNotificationInsights() {
  const { preferences } = useNotificationPreferences()
  const allNotifications = useNotifications()
  
  return useMemo(() => {
    if (!preferences || !allNotifications.notifications) {
      return {
        totalTypes: 0,
        enabledTypes: 0,
        disabledTypes: 0,
        quietHoursActive: false,
        estimatedDailyNotifications: 0,
        mostActiveChannel: null as DeliveryChannel | null,
        leastActiveChannel: null as DeliveryChannel | null
      }
    }

    const totalTypes = Object.keys(preferences.frequency).length
    const enabledTypes = preferences.enabledTypes.length
    const disabledTypes = totalTypes - enabledTypes
    const quietHoursActive = preferences.quietHours?.enabled || false

    // Calculate channel usage
    const channelCounts: Record<DeliveryChannel, number> = {
      push: 0,
      in_app: 0,
      email: 0,
      sms: 0
    }

    Object.values(preferences.channels).forEach(channels => {
      channels.forEach(channel => {
        channelCounts[channel]++
      })
    })

    const sortedChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([channel]) => channel as DeliveryChannel)

    const mostActiveChannel = sortedChannels[0] || null
    const leastActiveChannel = sortedChannels[sortedChannels.length - 1] || null

    // Estimate daily notifications (simplified calculation)
    const estimatedDailyNotifications = enabledTypes * 2 // Rough estimate

    return {
      totalTypes,
      enabledTypes,
      disabledTypes,
      quietHoursActive,
      estimatedDailyNotifications,
      mostActiveChannel,
      leastActiveChannel
    }
  }, [preferences, allNotifications.notifications])
}