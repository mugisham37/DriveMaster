/**
 * Spaced Repetition Reminders Hook
 * 
 * Provides functionality for scheduling, managing, and optimizing spaced repetition
 * reminders based on learning patterns and performance data.
 * 
 * Requirements: 3.2
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { notificationApiClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
import { useNotificationToast } from '@/components/notifications/NotificationToastSystem'
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
  const { showToast } = useNotificationToast()
  
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
    error,
    refetch
  } = useQuery({
    queryKey: ['spaced-repetition-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const response = await notificationApiClient.getScheduledNotifications(user.id, {
        type: 'spaced_repetition',
        status: 'pending',
        includeRecurring: true
      })
      
      return response.notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        topicName: notification.notification.title || 'Unknown Topic',
        itemCount: notification.notification.data?.itemCount || 1,
        dueDate: notification.scheduledFor,
        difficulty: (notification.notification.data?.difficulty || config.defaultDifficulty) as 'easy' | 'medium' | 'hard',
        lastReviewDate: notification.notification.data?.lastReviewDate ? new Date(notification.notification.data.lastReviewDate) : undefined,
        nextReviewDate: notification.scheduledFor,
        scheduledFor: notification.scheduledFor,
        isActive: notification.status === 'pending',
        reviewCount: notification.notification.data?.reviewCount || 0,
        averageScore: notification.notification.data?.averageScore,
        retentionRate: notification.notification.data?.retentionRate
      }))
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
      
      const enhancedRequest = {
        ...request,
        userId: user.id
      }
      
      return await notificationApiClient.scheduleSpacedRepetitionReminder(enhancedRequest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
      showToast({
        type: 'success',
        title: 'Reminder Scheduled',
        message: 'Your spaced repetition reminder has been scheduled successfully.',
        duration: 3000
      })
    },
    onError: (error: NotificationError) => {
      console.error('Failed to schedule spaced repetition reminder:', error)
      showToast({
        type: 'error',
        title: 'Scheduling Failed',
        message: 'Failed to schedule reminder. Please try again.',
        duration: 5000
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
      showToast({
        type: 'info',
        title: 'Reminder Cancelled',
        message: 'The spaced repetition reminder has been cancelled.',
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
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-reminders'] })
      showToast({
        type: 'info',
        title: 'Reminder Snoozed',
        message: 'The reminder has been rescheduled.',
        duration: 3000
      })
    }
  })
  
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
        userId: user.id,
        topicName: reminder.topicName,
        itemCount: reminder.itemCount,
        dueDate: nextReviewDate,
        difficulty: adjustDifficultyBasedOnScore(reminder.difficulty, score),
        lastReviewDate: new Date()
      })
    }
    
    // Track analytics
    await notificationApiClient.trackClick(reminderId, user.id, `review_completed_score_${score}`)
    
  }, [user?.id, scheduledReminders, performanceData, updateReminderMutation, scheduleReminderMutation])
  
  const getOptimalSchedule = useCallback(async (topicName: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<Date> => {
    const performanceHistory = performanceData.get(topicName)
    
    if (!performanceHistory || performanceHistory.scores.length === 0) {
      // First review - use default interval
      const defaultInterval = SPACED_REPETITION_INTERVALS[difficulty][0]
      return new Date(Date.now() + defaultInterval * 24 * 60 * 60 * 1000)
    }
    
    // Calculate average performance
    const averageScore = performanceHistory.scores.reduce((sum, score) => sum + score, 0) / performanceHistory.scores.length
    const performanceLevel = getPerformanceLevel(averageScore)
    const multiplier = PERFORMANCE_MULTIPLIERS[performanceLevel]
    
    // Get next interval based on review count
    const reviewCount = performanceHistory.scores.length
    const intervalIndex = Math.min(reviewCount, SPACED_REPETITION_INTERVALS[difficulty].length - 1)
    const baseInterval = SPACED_REPETITION_INTERVALS[difficulty][intervalIndex]
    
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
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const calculateNextReviewDate = (reminder: SpacedRepetitionReminderDisplay, score: number): Date => {
    const performanceLevel = getPerformanceLevel(score)
    const multiplier = PERFORMANCE_MULTIPLIERS[performanceLevel]
    
    const reviewCount = reminder.reviewCount || 0
    const intervalIndex = Math.min(reviewCount, SPACED_REPETITION_INTERVALS[reminder.difficulty].length - 1)
    const baseInterval = SPACED_REPETITION_INTERVALS[reminder.difficulty][intervalIndex]
    
    const adjustedInterval = Math.round(baseInterval * multiplier)
    return new Date(Date.now() + adjustedInterval * 24 * 60 * 60 * 1000)
  }
  
  const getPerformanceLevel = (score: number): keyof typeof PERFORMANCE_MULTIPLIERS => {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 70) return 'average'
    if (score >= 60) return 'poor'
    return 'failed'
  }
  
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
  
  const calculateStreakCount = (reviewDates: Date[]): number => {
    if (reviewDates.length === 0) return 0
    
    const sortedDates = reviewDates
      .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
      .sort((a, b) => b.getTime() - a.getTime())
    
    let streak = 1
    let currentDate = sortedDates[0]
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
      if (sortedDates[i].getTime() === prevDate.getTime()) {
        streak++
        currentDate = sortedDates[i]
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