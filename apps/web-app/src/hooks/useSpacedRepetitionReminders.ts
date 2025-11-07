/**
 * Spaced Repetition Reminders Hook
 * 
 * Provides functionality for scheduling, managing, and optimizing spaced repetition
 * reminders based on learning patterns and performance data.
 * 
 * Requirements: 3.2
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { notificationApiClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
// import { useNotificationToast } from '@/components/notifications/NotificationToastSystem'
import type { 
  SpacedRepetitionRequest,
  ScheduledNotification,
  NotificationError 
} from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface SpacedRepetitionReminderDisplay extends SpacedRepetitionRequest {
  id: string
  scheduledFor: Date
  isActive: boolean
  reviewCount: number
  lastReviewDate?: Date
  nextReviewDate?: Date
  averageScore?: number
  retentionRate?: number
}

export interface UseSpacedRepetitionRemindersOptions {
  enableIntelligentScheduling?: boolean
  enablePerformanceTracking?: boolean
  defaultDifficulty?: 'easy' | 'medium' | 'hard'
  maxActiveReminders?: number
}

export interface UseSpacedRepetitionRemindersResult {
  // State
  activeReminders: SpacedRepetitionReminderDisplay[]
  upcomingReminders: SpacedRepetitionReminderDisplay[]
  isLoading: boolean
  error: NotificationError | null
  
  // Actions
  scheduleReminder: (request: SpacedRepetitionRequest) => Promise<ScheduledNotification>
  updateReminder: (reminderId: string, updates: Partial<SpacedRepetitionRequest>) => Promise<void>
  cancelReminder: (reminderId: string) => Promise<void>
  snoozeReminder: (reminderId: string, duration: number) => Promise<void>
  
  // Learning Optimization
  recordReviewSession: (reminderId: string, score: number, timeSpent: number) => Promise<void>
  getOptimalSchedule: (topicName: string, difficulty: 'easy' | 'medium' | 'hard') => Promise<Date>
  adjustDifficulty: (reminderId: string, newDifficulty: 'easy' | 'medium' | 'hard') => Promise<void>
  
  // Analytics
  getPerformanceStats: (topicName?: string) => Promise<{
    totalReviews: number
    averageScore: number
    retentionRate: number
    streakCount: number
    improvementTrend: number
  }>
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<UseSpacedRepetitionRemindersOptions> = {
  enableIntelligentScheduling: true,
  enablePerformanceTracking: true,
  defaultDifficulty: 'medium',
  maxActiveReminders: 10
}

// ============================================================================
// Spaced Repetition Algorithm Constants
// ============================================================================

const SPACED_REPETITION_INTERVALS = {
  easy: [1, 3, 7, 14, 30, 90], // days
  medium: [1, 2, 5, 10, 21, 60], // days
  hard: [1, 1, 3, 7, 14, 30] // days
}

const PERFORMANCE_MULTIPLIERS = {
  excellent: 1.5, // 90-100% score
  good: 1.2,      // 80-89% score
  average: 1.0,   // 70-79% score
  poor: 0.7,      // 60-69% score
  failed: 0.5     // <60% score
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSpacedRepetitionReminders(
  options: UseSpacedRepetitionRemindersOptions = {}
): UseSpacedRepetitionRemindersResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  // const { showToast } = useNotificationToast() // TODO: Implement useNotificationToast hook
  const showToast = (message: unknown) => console.log('Toast:', message) // Temporary placeholder
  
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [performanceData, setPerformanceData] = useState<Map<string, {
    scores: number[]
    reviewDates: Date[]
    timeSpent: number[]
  }>>(new Map())
  
  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  const {
    data: scheduledReminders = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['spaced-repetition-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const response = await notificationApiClient.getScheduledNotifications(user.id.toString(), {
        type: 'spaced_repetition',
        status: 'pending',
        includeRecurring: true
      })
      
      return response.notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        topicName: notification.notification.title || 'Unknown Topic',
        itemCount: Number(notification.notification.data?.itemCount) || 1,
        dueDate: notification.scheduledFor,
        difficulty: (notification.notification.data?.difficulty || config.defaultDifficulty) as 'easy' | 'medium' | 'hard',
        lastReviewDate: notification.notification.data?.lastReviewDate ? new Date(String(notification.notification.data.lastReviewDate)) : undefined,
        nextReviewDate: notification.scheduledFor,
        scheduledFor: notification.scheduledFor,
        isActive: notification.status === 'pending',
        reviewCount: Number(notification.notification.data?.reviewCount) || 0,
        averageScore: notification.notification.data?.averageScore as number | undefined,
        retentionRate: notification.notification.data?.retentionRate as number | undefined
      } as SpacedRepetitionReminderDisplay))
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000
  })
  
  // ============================================================================
  // Computed Values
  // ============================================================================
  
  const activeReminders = scheduledReminders.filter(reminder => {
    const now = new Date()
    const dueDate = new Date(reminder.dueDate)
    return dueDate <= now && reminder.isActive
  })
  
  const upcomingReminders = scheduledReminders.filter(reminder => {
    const now = new Date()
    const dueDate = new Date(reminder.dueDate)
    return dueDate > now && reminder.isActive
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  
  // ============================================================================
  // Mutations
  // ============================================================================
  
  const scheduleReminderMutation = useMutation({
    mutationFn: async (request: SpacedRepetitionRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated')
      }
      
      const enhancedRequest: SpacedRepetitionRequest = {
        ...request,
        userId: user.id.toString()
      }
      
      return await notificationApiClient.scheduleSpacedRepetitionReminder(enhancedRequest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
      if (!user) return
      showToast({
        id: `toast-${Date.now()}`,
        userId: user.id.toString(),
        type: 'system',
        title: 'Reminder Scheduled',
        body: 'Your spaced repetition reminder has been scheduled successfully.',
        status: { isRead: false, isDelivered: true },
        priority: 'normal',
        channels: ['in_app'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    },
    onError: (error: NotificationError) => {
      console.error('Failed to schedule spaced repetition reminder:', error)
      if (!user) return
      showToast({
        id: `toast-${Date.now()}`,
        userId: user.id.toString(),
        type: 'system',
        title: 'Scheduling Failed',
        body: 'Failed to schedule reminder. Please try again.',
        status: { isRead: false, isDelivered: true },
        priority: 'high',
        channels: ['in_app'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  })
  
  const updateReminderMutation = useMutation({
    mutationFn: async ({ reminderId, updates }: { reminderId: string; updates: Partial<SpacedRepetitionRequest> }) => {
      await notificationApiClient.updateScheduledNotification(reminderId, {
        notification: {
          data: updates
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
    }
  })
  
  const cancelReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      await notificationApiClient.cancelScheduledNotification(reminderId, 'User cancelled')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
      if (!user) return
      showToast({
        id: `toast-${Date.now()}`,
        userId: user.id.toString(),
        type: 'system',
        title: 'Reminder Cancelled',
        body: 'The spaced repetition reminder has been cancelled.',
        status: { isRead: false, isDelivered: true },
        priority: 'normal',
        channels: ['in_app'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  })
  
  const snoozeReminderMutation = useMutation({
    mutationFn: async ({ reminderId, duration }: { reminderId: string; duration: number }) => {
      const newScheduledTime = new Date(Date.now() + duration * 60 * 1000)
      await notificationApiClient.rescheduleNotification(reminderId, newScheduledTime)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
      if (!user) return
      showToast({
        id: `toast-${Date.now()}`,
        userId: user.id.toString(),
        type: 'system',
        title: 'Reminder Snoozed',
        body: 'The reminder has been rescheduled.',
        status: { isRead: false, isDelivered: true },
        priority: 'normal',
        channels: ['in_app'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  })
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const getPerformanceLevel = (score: number): keyof typeof PERFORMANCE_MULTIPLIERS => {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 70) return 'average'
    if (score >= 60) return 'poor'
    return 'failed'
  }

  const calculateNextReviewDate = useCallback((reminder: SpacedRepetitionReminderDisplay, score: number): Date => {
    const performanceLevel = getPerformanceLevel(score)
    const multiplier = PERFORMANCE_MULTIPLIERS[performanceLevel]
    
    const reviewCount = reminder.reviewCount || 0
    const intervalIndex = Math.min(reviewCount, SPACED_REPETITION_INTERVALS[reminder.difficulty].length - 1)
    const baseInterval = SPACED_REPETITION_INTERVALS[reminder.difficulty][intervalIndex] ?? 1
    
    const adjustedInterval = Math.round(baseInterval * multiplier)
    return new Date(Date.now() + adjustedInterval * 24 * 60 * 60 * 1000)
  }, [])

  const adjustDifficultyBasedOnScore = (currentDifficulty: 'easy' | 'medium' | 'hard', score: number): 'easy' | 'medium' | 'hard' => {
    if (score >= 90 && currentDifficulty !== 'easy') {
      // Excellent performance - make it easier
      return currentDifficulty === 'hard' ? 'medium' : 'easy'
    } else if (score < 60 && currentDifficulty !== 'hard') {
      // Poor performance - make it harder
      return currentDifficulty === 'easy' ? 'medium' : 'hard'
    }
    return currentDifficulty
  }
  
  // ============================================================================
  // Learning Optimization Functions
  // ============================================================================
  
  const recordReviewSession = useCallback(async (reminderId: string, score: number, timeSpent: number) => {
    if (!user?.id) return
    
    // Update local performance data
    const reminder = scheduledReminders.find(r => r.id === reminderId)
    if (!reminder) return
    
    const topicKey = reminder.topicName
    const currentData = performanceData.get(topicKey) || {
      scores: [],
      reviewDates: [],
      timeSpent: []
    }
    
    const updatedData = {
      scores: [...currentData.scores, score],
      reviewDates: [...currentData.reviewDates, new Date()],
      timeSpent: [...currentData.timeSpent, timeSpent]
    }
    
    setPerformanceData(prev => new Map(prev.set(topicKey, updatedData)))
    
    // Calculate next review date based on performance
    const nextReviewDate = calculateNextReviewDate(reminder, score)
    
    // Update the reminder with new data
    await updateReminderMutation.mutateAsync({
      reminderId,
      updates: {
        lastReviewDate: new Date(),
        nextReviewDate,
        difficulty: adjustDifficultyBasedOnScore(reminder.difficulty, score)
      }
    })
    
    // Schedule next review
    if (nextReviewDate > new Date()) {
      await scheduleReminderMutation.mutateAsync({
        userId: user.id.toString(),
        topicName: reminder.topicName,
        itemCount: Number(reminder.itemCount) || 0,
        dueDate: nextReviewDate,
        difficulty: adjustDifficultyBasedOnScore(reminder.difficulty, score),
        lastReviewDate: new Date()
      })
    }
    
    // Track analytics
    await notificationApiClient.trackClick(reminderId, user.id.toString(), `review_completed_score_${score}`)
    
  }, [user?.id, scheduledReminders, performanceData, updateReminderMutation, scheduleReminderMutation, calculateNextReviewDate])
  
  const getOptimalSchedule = useCallback(async (topicName: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<Date> => {
    const performanceHistory = performanceData.get(topicName)
    
    if (!performanceHistory || performanceHistory.scores.length === 0) {
      // First review - use default interval
      const defaultInterval = SPACED_REPETITION_INTERVALS[difficulty][0] ?? 1
      return new Date(Date.now() + defaultInterval * 24 * 60 * 60 * 1000)
    }
    
    // Calculate average performance
    const averageScore = performanceHistory.scores.reduce((sum, score) => sum + score, 0) / performanceHistory.scores.length
    const performanceLevel = getPerformanceLevel(averageScore)
    const multiplier = PERFORMANCE_MULTIPLIERS[performanceLevel]
    
    // Get next interval based on review count
    const reviewCount = performanceHistory.scores.length
    const intervalIndex = Math.min(reviewCount, SPACED_REPETITION_INTERVALS[difficulty].length - 1)
    const baseInterval = SPACED_REPETITION_INTERVALS[difficulty][intervalIndex] ?? 1
    
    // Apply performance multiplier
    const adjustedInterval = Math.round(baseInterval * multiplier)
    
    return new Date(Date.now() + adjustedInterval * 24 * 60 * 60 * 1000)
  }, [performanceData])
  
  const adjustDifficulty = useCallback(async (reminderId: string, newDifficulty: 'easy' | 'medium' | 'hard') => {
    await updateReminderMutation.mutateAsync({
      reminderId,
      updates: { difficulty: newDifficulty }
    })
  }, [updateReminderMutation])
  
  const getPerformanceStats = useCallback(async (topicName?: string) => {
    let allScores: number[] = []
    let allReviewDates: Date[] = []
    let totalReviews = 0
    
    if (topicName) {
      const topicData = performanceData.get(topicName)
      if (topicData) {
        allScores = topicData.scores
        allReviewDates = topicData.reviewDates
        totalReviews = topicData.scores.length
      }
    } else {
      // Aggregate all topics
      for (const [, data] of performanceData) {
        allScores.push(...data.scores)
        allReviewDates.push(...data.reviewDates)
        totalReviews += data.scores.length
      }
    }
    
    const averageScore = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
      : 0
    
    // Calculate retention rate (scores >= 70%)
    const passedReviews = allScores.filter(score => score >= 70).length
    const retentionRate = allScores.length > 0 ? (passedReviews / allScores.length) * 100 : 0
    
    // Calculate streak (consecutive days with reviews)
    const streakCount = calculateStreakCount(allReviewDates)
    
    // Calculate improvement trend (last 5 vs previous 5 reviews)
    const improvementTrend = calculateImprovementTrend(allScores)
    
    return {
      totalReviews,
      averageScore,
      retentionRate,
      streakCount,
      improvementTrend
    }
  }, [performanceData])
  
  const calculateStreakCount = (reviewDates: Date[]): number => {
    if (reviewDates.length === 0) return 0
    
    const sortedDates = reviewDates
      .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
      .sort((a, b) => b.getTime() - a.getTime())
    
    let streak = 1
    let currentDate = sortedDates[0]
    if (!currentDate) return 0
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
      const sortedDate = sortedDates[i]
      if (sortedDate && sortedDate.getTime() === prevDate.getTime()) {
        streak++
        currentDate = sortedDate
      } else {
        break
      }
    }
    
    return streak
  }
  
  const calculateImprovementTrend = (scores: number[]): number => {
    if (scores.length < 10) return 0
    
    const recent = scores.slice(-5)
    const previous = scores.slice(-10, -5)
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length
    const previousAvg = previous.reduce((sum, score) => sum + score, 0) / previous.length
    
    return recentAvg - previousAvg
  }
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    // State
    activeReminders,
    upcomingReminders,
    isLoading,
    error: error as NotificationError | null,
    
    // Actions
    scheduleReminder: scheduleReminderMutation.mutateAsync,
    updateReminder: (reminderId: string, updates: Partial<SpacedRepetitionRequest>) => 
      updateReminderMutation.mutateAsync({ reminderId, updates }),
    cancelReminder: cancelReminderMutation.mutateAsync,
    snoozeReminder: (reminderId: string, duration: number) => 
      snoozeReminderMutation.mutateAsync({ reminderId, duration }),
    
    // Learning Optimization
    recordReviewSession,
    getOptimalSchedule,
    adjustDifficulty,
    
    // Analytics
    getPerformanceStats
  }
}

export default useSpacedRepetitionReminders