/**
 * Notification Preferences Management Hook
 * 
 * Provides hooks for managing user notification preferences, quiet hours,
 * frequency controls, and channel preferences with real-time synchronization.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { notificationApiClient, getNotificationWebSocketClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
import type {
  NotificationPreferences,
  QuietHours,
  FrequencySettings,
  GlobalNotificationSettings,
  NotificationType,
  DeliveryChannel,
  NotificationError
} from '@/types/notification-service'

// ============================================================================
// Query Keys
// ============================================================================

export const preferencesQueryKeys = {
  all: ['notificationPreferences'] as const,
  user: (userId: string) => [...preferencesQueryKeys.all, userId] as const,
}

// ============================================================================
// Notification Preferences Hook
// ============================================================================

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences | null
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<NotificationPreferences>
  updateEnabledTypes: (types: NotificationType[]) => Promise<NotificationPreferences>
  updateQuietHours: (quietHours: QuietHours) => Promise<NotificationPreferences>
  updateFrequency: (type: NotificationType, settings: FrequencySettings) => Promise<NotificationPreferences>
  updateChannels: (type: NotificationType, channels: DeliveryChannel[]) => Promise<NotificationPreferences>
  updateGlobalSettings: (settings: GlobalNotificationSettings) => Promise<NotificationPreferences>
  resetToDefaults: () => Promise<NotificationPreferences>
  refetch: () => void
}

/**
 * Hook for managing notification preferences with real-time synchronization
 * Requirements: 9.1, 9.2, 9.5
 */
export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch preferences
  const query = useQuery({
    queryKey: preferencesQueryKeys.user(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.getPreferences(user.id)
    },
    enabled: !!user?.id,
    staleTime: 60000,
    cacheTime: 300000,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'type' in error && error.type === 'authentication') {
        return false
      }
      return failureCount < 3
    }
  })

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.updatePreferences(user.id, updates)
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: preferencesQueryKeys.user(user?.id || '') })

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData(preferencesQueryKeys.user(user?.id || ''))

      // Optimistically update preferences
      queryClient.setQueryData<NotificationPreferences>(
        preferencesQueryKeys.user(user?.id || ''),
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            ...updates,
            updatedAt: new Date()
          }
        }
      )

      return { previousPreferences }
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          preferencesQueryKeys.user(user?.id || ''),
          context.previousPreferences
        )
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.user(user?.id || '') })
    }
  })

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  const updateEnabledTypes = useCallback(
    (types: NotificationType[]) => updatePreferencesMutation.mutateAsync({ enabledTypes: types }),
    [updatePreferencesMutation]
  )

  const updateQuietHours = useCallback(
    (quietHours: QuietHours) => updatePreferencesMutation.mutateAsync({ quietHours }),
    [updatePreferencesMutation]
  )

  const updateFrequency = useCallback(
    (type: NotificationType, settings: FrequencySettings) => {
      const currentPreferences = query.data
      if (!currentPreferences) throw new Error('Preferences not loaded')
      
      return updatePreferencesMutation.mutateAsync({
        frequency: {
          ...currentPreferences.frequency,
          [type]: settings
        }
      })
    },
    [query.data, updatePreferencesMutation]
  )

  const updateChannels = useCallback(
    (type: NotificationType, channels: DeliveryChannel[]) => {
      const currentPreferences = query.data
      if (!currentPreferences) throw new Error('Preferences not loaded')
      
      return updatePreferencesMutation.mutateAsync({
        channels: {
          ...currentPreferences.channels,
          [type]: channels
        }
      })
    },
    [query.data, updatePreferencesMutation]
  )

  const updateGlobalSettings = useCallback(
    (settings: GlobalNotificationSettings) => updatePreferencesMutation.mutateAsync({ globalSettings: settings }),
    [updatePreferencesMutation]
  )

  const resetToDefaults = useCallback(
    () => {
      const defaultPreferences: Partial<NotificationPreferences> = {
        enabledTypes: ['achievement', 'spaced_repetition', 'streak_reminder', 'system'],
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        frequency: {
          achievement: { type: 'immediate' },
          spaced_repetition: { type: 'immediate' },
          streak_reminder: { type: 'daily', dailyTime: '09:00' },
          mock_test_reminder: { type: 'immediate' },
          system: { type: 'immediate' },
          mentoring: { type: 'immediate' },
          course_update: { type: 'batched', batchInterval: 60 },
          community: { type: 'daily', dailyTime: '18:00' },
          marketing: { type: 'weekly', weeklyDay: 1, weeklyTime: '10:00' }
        },
        channels: {
          achievement: ['push', 'in_app'],
          spaced_repetition: ['push', 'in_app'],
          streak_reminder: ['push', 'in_app'],
          mock_test_reminder: ['push', 'in_app', 'email'],
          system: ['push', 'in_app', 'email'],
          mentoring: ['push', 'in_app', 'email'],
          course_update: ['in_app', 'email'],
          community: ['in_app'],
          marketing: ['email']
        },
        globalSettings: {
          enabled: true,
          maxPerDay: 50,
          maxPerHour: 10,
          respectQuietHours: true,
          allowCriticalOverride: true
        }
      }
      
      return updatePreferencesMutation.mutateAsync(defaultPreferences)
    },
    [updatePreferencesMutation]
  )

  // Remove token helper
  const removeToken = useCallback(
    async (tokenId: string) => {
      await notificationApiClient.removeDeviceToken(tokenId)
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.user(user.id) })
      }
    },
    [user?.id, queryClient]
  )

  // Refresh token helper
  const refreshToken = useCallback(
    async (tokenId: string) => {
      const result = await notificationApiClient.refreshDeviceToken(tokenId)
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.user(user.id) })
      }
      return result
    },
    [user?.id, queryClient]
  )

  // Validate token helper
  const validateToken = useCallback(
    (tokenId: string) => notificationApiClient.validateDeviceToken(tokenId),
    []
  )

  // Cleanup tokens helper
  const cleanupTokens = useCallback(
    async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await notificationApiClient.cleanupDeviceTokens(user.id)
      queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.user(user.id) })
      return result
    },
    [user?.id, queryClient]
  )

  // ============================================================================
  // Real-Time Preference Updates
  // ============================================================================

  useEffect(() => {
    if (!user?.id) return

    const wsClient = getNotificationWebSocketClient()
    
    const handlePreferencesUpdated = (updatedPreferences: NotificationPreferences) => {
      // Update the query cache with new preferences
      queryClient.setQueryData<NotificationPreferences>(
        preferencesQueryKeys.user(user.id),
        updatedPreferences
      )
    }

    // Subscribe to preference changes
    wsClient.on('preferences.updated', handlePreferencesUpdated)
    const subscriptionId = wsClient.subscribeToPreferenceChanges(user.id)

    return () => {
      wsClient.off('preferences.updated')
      wsClient.unsubscribe(subscriptionId)
    }
  }, [user?.id, queryClient])

  return {
    preferences: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    updateEnabledTypes,
    updateQuietHours,
    updateFrequency,
    updateChannels,
    updateGlobalSettings,
    resetToDefaults,
    refetch: query.refetch
  }
}

// ============================================================================
// Preference Validation Helpers
// ============================================================================

export interface PreferenceValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Hook for validating notification preferences
 * Requirements: 9.2, 9.4
 */
export function usePreferenceValidation() {
  const validateQuietHours = useCallback((quietHours: QuietHours): PreferenceValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    if (quietHours.enabled) {
      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      
      if (!timeRegex.test(quietHours.start)) {
        errors.push('Start time must be in HH:MM format')
      }
      
      if (!timeRegex.test(quietHours.end)) {
        errors.push('End time must be in HH:MM format')
      }

      // Validate timezone
      try {
        Intl.DateTimeFormat(undefined, { timeZone: quietHours.timezone })
      } catch {
        errors.push('Invalid timezone')
      }

      // Check for reasonable quiet hours duration
      if (errors.length === 0) {
        const start = parseTime(quietHours.start)
        const end = parseTime(quietHours.end)
        
        let duration = end - start
        if (duration < 0) duration += 24 * 60 // Handle overnight quiet hours
        
        if (duration > 16 * 60) { // More than 16 hours
          warnings.push('Quiet hours duration is very long (over 16 hours)')
        }
        
        if (duration < 60) { // Less than 1 hour
          warnings.push('Quiet hours duration is very short (less than 1 hour)')
        }
      }

      // Validate days of week
      if (quietHours.daysOfWeek) {
        const invalidDays = quietHours.daysOfWeek.filter(day => day < 0 || day > 6)
        if (invalidDays.length > 0) {
          errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [])

  const validateFrequencySettings = useCallback((settings: FrequencySettings): PreferenceValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    switch (settings.type) {
      case 'batched':
        if (!settings.batchInterval || settings.batchInterval < 5) {
          errors.push('Batch interval must be at least 5 minutes')
        }
        if (settings.batchInterval && settings.batchInterval > 1440) {
          errors.push('Batch interval cannot exceed 24 hours (1440 minutes)')
        }
        break

      case 'daily':
        if (!settings.dailyTime) {
          errors.push('Daily time is required for daily frequency')
        } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.dailyTime)) {
          errors.push('Daily time must be in HH:MM format')
        }
        break

      case 'weekly':
        if (settings.weeklyDay === undefined || settings.weeklyDay < 0 || settings.weeklyDay > 6) {
          errors.push('Weekly day must be between 0 (Sunday) and 6 (Saturday)')
        }
        if (!settings.weeklyTime) {
          errors.push('Weekly time is required for weekly frequency')
        } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.weeklyTime)) {
          errors.push('Weekly time must be in HH:MM format')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [])

  const validateGlobalSettings = useCallback((settings: GlobalNotificationSettings): PreferenceValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.maxPerDay !== undefined) {
      if (settings.maxPerDay < 1) {
        errors.push('Maximum notifications per day must be at least 1')
      }
      if (settings.maxPerDay > 1000) {
        errors.push('Maximum notifications per day cannot exceed 1000')
      }
      if (settings.maxPerDay < 10) {
        warnings.push('Very low daily notification limit may cause important notifications to be missed')
      }
    }

    if (settings.maxPerHour !== undefined) {
      if (settings.maxPerHour < 1) {
        errors.push('Maximum notifications per hour must be at least 1')
      }
      if (settings.maxPerHour > 100) {
        errors.push('Maximum notifications per hour cannot exceed 100')
      }
    }

    // Check consistency between daily and hourly limits
    if (settings.maxPerDay && settings.maxPerHour) {
      if (settings.maxPerHour * 24 < settings.maxPerDay) {
        warnings.push('Hourly limit may prevent reaching daily limit')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [])

  return {
    validateQuietHours,
    validateFrequencySettings,
    validateGlobalSettings
  }
}

/**
 * Main notification preferences hook
 */
export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch preferences
  const query = useQuery({
    queryKey: preferencesQueryKeys.user(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.getPreferences(user.id)
    },
    enabled: !!user?.id,
    staleTime: 60000,
    cacheTime: 300000
  })

  // Update preferences mutation with optimistic updates
  const updatePreferencesMutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.updatePreferences(user.id, updates)
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: preferencesQueryKeys.user(user?.id || '') })

      const previousPreferences = queryClient.getQueryData(preferencesQueryKeys.user(user?.id || ''))

      queryClient.setQueryData<NotificationPreferences>(
        preferencesQueryKeys.user(user?.id || ''),
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            ...updates,
            updatedAt: new Date()
          }
        }
      )

      return { previousPreferences }
    },
    onError: (error, updates, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          preferencesQueryKeys.user(user?.id || ''),
          context.previousPreferences
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.user(user?.id || '') })
    }
  })

  // Convenience methods
  const updateEnabledTypes = useCallback(
    (types: NotificationType[]) => updatePreferencesMutation.mutateAsync({ enabledTypes: types }),
    [updatePreferencesMutation]
  )

  const updateQuietHours = useCallback(
    (quietHours: QuietHours) => updatePreferencesMutation.mutateAsync({ quietHours }),
    [updatePreferencesMutation]
  )

  const updateFrequency = useCallback(
    (type: NotificationType, settings: FrequencySettings) => {
      const currentPreferences = query.data
      if (!currentPreferences) throw new Error('Preferences not loaded')
      
      return updatePreferencesMutation.mutateAsync({
        frequency: {
          ...currentPreferences.frequency,
          [type]: settings
        }
      })
    },
    [query.data, updatePreferencesMutation]
  )

  const updateChannels = useCallback(
    (type: NotificationType, channels: DeliveryChannel[]) => {
      const currentPreferences = query.data
      if (!currentPreferences) throw new Error('Preferences not loaded')
      
      return updatePreferencesMutation.mutateAsync({
        channels: {
          ...currentPreferences.channels,
          [type]: channels
        }
      })
    },
    [query.data, updatePreferencesMutation]
  )

  const updateGlobalSettings = useCallback(
    (settings: GlobalNotificationSettings) => updatePreferencesMutation.mutateAsync({ globalSettings: settings }),
    [updatePreferencesMutation]
  )

  const resetToDefaults = useCallback(() => {
    const defaultPreferences: Partial<NotificationPreferences> = {
      enabledTypes: ['achievement', 'spaced_repetition', 'streak_reminder', 'system'],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      frequency: {
        achievement: { type: 'immediate' },
        spaced_repetition: { type: 'immediate' },
        streak_reminder: { type: 'daily', dailyTime: '09:00' },
        mock_test_reminder: { type: 'immediate' },
        system: { type: 'immediate' },
        mentoring: { type: 'immediate' },
        course_update: { type: 'batched', batchInterval: 60 },
        community: { type: 'daily', dailyTime: '18:00' },
        marketing: { type: 'weekly', weeklyDay: 1, weeklyTime: '10:00' }
      },
      channels: {
        achievement: ['push', 'in_app'],
        spaced_repetition: ['push', 'in_app'],
        streak_reminder: ['push', 'in_app'],
        mock_test_reminder: ['push', 'in_app', 'email'],
        system: ['push', 'in_app', 'email'],
        mentoring: ['push', 'in_app', 'email'],
        course_update: ['in_app', 'email'],
        community: ['in_app'],
        marketing: ['email']
      },
      globalSettings: {
        enabled: true,
        maxPerDay: 50,
        maxPerHour: 10,
        respectQuietHours: true,
        allowCriticalOverride: true
      }
    }
    
    return updatePreferencesMutation.mutateAsync(defaultPreferences)
  }, [updatePreferencesMutation])

  // Set up real-time preference updates
  useEffect(() => {
    if (!user?.id) return

    const wsClient = getNotificationWebSocketClient()
    
    const handlePreferencesUpdated = (updatedPreferences: NotificationPreferences) => {
      queryClient.setQueryData<NotificationPreferences>(
        preferencesQueryKeys.user(user.id),
        updatedPreferences
      )
    }

    wsClient.on('preferences.updated', handlePreferencesUpdated)
    const subscriptionId = wsClient.subscribeToPreferenceChanges(user.id)

    return () => {
      wsClient.off('preferences.updated')
      wsClient.unsubscribe(subscriptionId)
    }
  }, [user?.id, queryClient])

  return {
    preferences: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    updateEnabledTypes,
    updateQuietHours,
    updateFrequency,
    updateChannels,
    updateGlobalSettings,
    resetToDefaults,
    refetch: query.refetch
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parses time string (HH:MM) to minutes since midnight
 */
function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}