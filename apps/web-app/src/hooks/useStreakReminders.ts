/**
 * Streak Reminders Hook
 * 
 * Provides functionality for managing streak reminders, tracking streak progress,
 * and providing motivational support for maintaining learning consistency.
 * 
 * Requirements: 3.3
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { notificationApiClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
// import { useNotificationToast } from '@/components/notifications/NotificationToastSystem'
import type { 
  StreakReminderRequest,
  ScheduledNotification,
  NotificationError 
} from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface StreakData {
  userId: string
  streakType: 'daily' | 'weekly' | 'monthly'
  currentStreak: number
  longestStreak: number
  lastActivityDate: Date
  streakGoal?: number
  isActive: boolean
  streakStartDate: Date
  totalActiveDays: number
}

export interface StreakReminderDisplay extends StreakReminderRequest {
  id: string
  scheduledFor: Date
  isActive: boolean
  streakData: StreakData
  isStreakBroken: boolean
  daysSinceLastActivity: number
  riskLevel: 'safe' | 'at-risk' | 'critical' | 'broken'
}

export interface UseStreakRemindersOptions {
  enableSmartReminders?: boolean
  enableMotivationalMessages?: boolean
  defaultStreakGoals?: {
    daily: number
    weekly: number
    monthly: number
  }
  reminderTiming?: {
    daily: string // HH:mm format
    weekly: number // day of week (0-6)
    monthly: number // day of month (1-31)
  }
}

export interface UseStreakRemindersResult {
  // State
  activeReminders: StreakReminderDisplay[]
  streakData: Record<'daily' | 'weekly' | 'monthly', StreakData | null>
  isLoading: boolean
  error: NotificationError | null
  
  // Actions
  scheduleStreakReminder: (request: StreakReminderRequest) => Promise<ScheduledNotification>
  updateStreakReminder: (reminderId: string, updates: Partial<StreakReminderRequest>) => Promise<void>
  cancelStreakReminder: (reminderId: string) => Promise<void>
  snoozeStreakReminder: (reminderId: string, duration: number) => Promise<void>
  
  // Streak Management
  recordActivity: (streakType: 'daily' | 'weekly' | 'monthly') => Promise<void>
  getStreakStats: (streakType?: 'daily' | 'weekly' | 'monthly') => Promise<StreakData | Record<string, StreakData>>
  setStreakGoal: (streakType: 'daily' | 'weekly' | 'monthly', goal: number) => Promise<void>
  
  // Analytics
  getStreakAnalytics: (streakType?: 'daily' | 'weekly' | 'monthly') => Promise<{
    totalActiveDays: number
    longestStreak: number
    currentStreak: number
    streakBreaks: number
    averageSessionLength: number
  }>
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<UseStreakRemindersOptions> = {
  enableSmartReminders: true,
  enableMotivationalMessages: true,
  defaultStreakGoals: {
    daily: 30,
    weekly: 12,
    monthly: 6
  },
  reminderTiming: {
    daily: '20:00',
    weekly: 0, // Sunday
    monthly: 1 // 1st of month
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function useStreakReminders(
  options: UseStreakRemindersOptions = {}
): UseStreakRemindersResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  // const { showToast } = useNotificationToast()
  const showToast = (options: { title: string; message: string; duration: number }) => {
    console.log('Toast:', options.title, options.message)
  }
  
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [streakData, setStreakData] = useState<Record<'daily' | 'weekly' | 'monthly', StreakData | null>>({
    daily: null,
    weekly: null,
    monthly: null
  })
  
  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  const {
    data: scheduledReminders = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['streak-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const response = await notificationApiClient.getScheduledNotifications(String(user.id), {
        type: 'streak_reminder',
        status: 'pending'
      })
      
      return response.notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        streakCount: Number(notification.notification.data?.streakCount) || 0,
        streakType: (notification.notification.data?.streakType || 'daily') as 'daily' | 'weekly' | 'monthly',
        reminderTime: notification.scheduledFor,
        motivationalMessage: notification.notification.data?.motivationalMessage as string | undefined,
        streakGoal: Number(notification.notification.data?.streakGoal) || undefined,
        scheduledFor: notification.scheduledFor,
        isActive: notification.status === 'pending',
        streakData: {
          userId: String(user.id),
          streakType: (notification.notification.data?.streakType || 'daily') as 'daily' | 'weekly' | 'monthly',
          currentStreak: Number(notification.notification.data?.streakCount) || 0,
          longestStreak: Number(notification.notification.data?.longestStreak) || 0,
          lastActivityDate: notification.notification.data?.lastActivityDate ? new Date(String(notification.notification.data.lastActivityDate)) : new Date(),
          streakGoal: Number(notification.notification.data?.streakGoal) || undefined,
          isActive: true,
          streakStartDate: notification.notification.data?.streakStartDate ? new Date(String(notification.notification.data.streakStartDate)) : new Date(),
          totalActiveDays: Number(notification.notification.data?.totalActiveDays) || 0
        },
        isStreakBroken: Boolean(notification.notification.data?.isStreakBroken),
        daysSinceLastActivity: Number(notification.notification.data?.daysSinceLastActivity) || 0,
        riskLevel: (notification.notification.data?.riskLevel || 'safe') as 'safe' | 'at-risk' | 'critical' | 'broken'
      } as StreakReminderDisplay))
    },
    enabled: !!user?.id,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000
  })
  
  // ============================================================================
  // Computed Values
  // ============================================================================
  
  const activeReminders = scheduledReminders.filter(reminder => {
    const now = new Date()
    const reminderTime = new Date(reminder.reminderTime)
    return reminderTime <= now && reminder.isActive
  })
  
  // ============================================================================
  // Mutations
  // ============================================================================
  
  const scheduleReminderMutation = useMutation({
    mutationFn: async (request: StreakReminderRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated')
      }
      
      return await notificationApiClient.scheduleStreakReminder(request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak-reminders'] })
      showToast({
        title: 'Streak Reminder Set',
        message: 'Your streak reminder has been scheduled successfully.',
        duration: 3000
      })
    },
    onError: (error: NotificationError) => {
      console.error('Failed to schedule streak reminder:', error)
      showToast({
        title: 'Scheduling Failed',
        message: 'Failed to schedule streak reminder. Please try again.',
        duration: 5000
      })
    }
  })
  
  const updateReminderMutation = useMutation({
    mutationFn: async ({ reminderId, updates }: { reminderId: string; updates: Partial<StreakReminderRequest> }) => {
      await notificationApiClient.updateScheduledNotification(reminderId, {
        notification: {
          data: updates
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak-reminders'] })
    }
  })
  
  const cancelReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      await notificationApiClient.cancelScheduledNotification(reminderId, 'User cancelled')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak-reminders'] })
      showToast({
        title: 'Reminder Cancelled',
        message: 'The streak reminder has been cancelled.',
        duration: 3000
      })
    }
  })
  
  const snoozeReminderMutation = useMutation({
    mutationFn: async ({ reminderId, duration }: { reminderId: string; duration: number }) => {
      const newScheduledTime = new Date(Date.now() + duration * 60 * 1000)
      await notificationApiClient.rescheduleNotification(reminderId, newScheduledTime)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak-reminders'] })
      showToast({
        title: 'Reminder Snoozed',
        message: 'The streak reminder has been rescheduled.',
        duration: 3000
      })
    }
  })
  
  // ============================================================================
  // Streak Management Functions
  // ============================================================================
  
  const recordActivity = useCallback(async (streakType: 'daily' | 'weekly' | 'monthly') => {
    if (!user?.id) return
    
    // Update local streak data
    const currentData = streakData[streakType]
    const now = new Date()
    
    let newStreakCount = 1
    let isNewStreak = true
    
    if (currentData) {
      const lastActivity = new Date(currentData.lastActivityDate)
      const timeDiff = now.getTime() - lastActivity.getTime()
      
      // Check if activity is within streak window
      const streakWindow = streakType === 'daily' ? 24 * 60 * 60 * 1000 : 
                          streakType === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                          30 * 24 * 60 * 60 * 1000
      
      if (timeDiff <= streakWindow * 1.5) { // Allow some flexibility
        newStreakCount = currentData.currentStreak + 1
        isNewStreak = false
      }
    }
    
    const updatedStreakData: StreakData = {
      userId: String(user.id),
      streakType,
      currentStreak: newStreakCount,
      longestStreak: Math.max(currentData?.longestStreak || 0, newStreakCount),
      lastActivityDate: now,
      streakGoal: currentData?.streakGoal || config.defaultStreakGoals[streakType],
      isActive: true,
      streakStartDate: isNewStreak ? now : (currentData?.streakStartDate || now),
      totalActiveDays: (currentData?.totalActiveDays || 0) + 1
    }
    
    setStreakData(prev => ({
      ...prev,
      [streakType]: updatedStreakData
    }))
    
    // Track analytics
    await notificationApiClient.trackClick(`streak-${streakType}`, String(user.id), `activity_recorded_${newStreakCount}`)
    
  }, [user?.id, streakData, config.defaultStreakGoals])
  
  const getStreakStats = useCallback(async (streakType?: 'daily' | 'weekly' | 'monthly'): Promise<StreakData | Record<string, StreakData>> => {
    if (streakType) {
      const data = streakData[streakType]
      if (data) {
        return data
      }
      // Return a default StreakData if not found
      return {
        userId: user?.id?.toString() || '',
        streakType,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        isActive: false,
        streakStartDate: new Date(),
        totalActiveDays: 0
      }
    }
    // Filter out null values and return the record
    const filteredData: Record<string, StreakData> = {}
    for (const key in streakData) {
      const value = streakData[key as keyof typeof streakData]
      if (value) {
        filteredData[key] = value
      }
    }
    return filteredData
  }, [streakData, user?.id])
  
  const setStreakGoal = useCallback(async (streakType: 'daily' | 'weekly' | 'monthly', goal: number) => {
    if (!user?.id) return
    
    const currentData = streakData[streakType]
    if (currentData) {
      const updatedData = { ...currentData, streakGoal: goal }
      setStreakData(prev => ({
        ...prev,
        [streakType]: updatedData
      }))
    }
  }, [user?.id, streakData])
  
  const getStreakAnalytics = useCallback(async (streakType?: 'daily' | 'weekly' | 'monthly') => {
    if (streakType && streakData[streakType]) {
      const streak = streakData[streakType]!
      return {
        totalActiveDays: streak.totalActiveDays,
        longestStreak: streak.longestStreak,
        currentStreak: streak.currentStreak,
        streakBreaks: 0, // Would need to track this separately
        averageSessionLength: 0 // Would need to track session data
      }
    }
    
    // Aggregate stats for all streak types
    const allStreaks = Object.values(streakData).filter(Boolean) as StreakData[]
    return {
      totalActiveDays: allStreaks.reduce((sum, streak) => sum + streak.totalActiveDays, 0),
      longestStreak: Math.max(...allStreaks.map(streak => streak.longestStreak)),
      currentStreak: Math.max(...allStreaks.map(streak => streak.currentStreak)),
      streakBreaks: 0,
      averageSessionLength: 0
    }
  }, [streakData])
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    // State
    activeReminders,
    streakData,
    isLoading,
    error: error as NotificationError | null,
    
    // Actions
    scheduleStreakReminder: scheduleReminderMutation.mutateAsync,
    updateStreakReminder: (reminderId: string, updates: Partial<StreakReminderRequest>) => 
      updateReminderMutation.mutateAsync({ reminderId, updates }),
    cancelStreakReminder: cancelReminderMutation.mutateAsync,
    snoozeStreakReminder: (reminderId: string, duration: number) => 
      snoozeReminderMutation.mutateAsync({ reminderId, duration }),
    
    // Streak Management
    recordActivity,
    getStreakStats,
    setStreakGoal,
    
    // Analytics
    getStreakAnalytics
  }
}

export default useStreakReminders