/**
 * Mock Test Reminders Hook
 * 
 * Provides functionality for scheduling, managing, and optimizing mock test
 * reminders with performance analysis and preparation guidance.
 * 
 * Requirements: 3.4
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { notificationApiClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
import { requireStringUserId } from '@/utils/user-id-helpers'
// import { useNotificationToast } from '@/components/notifications/NotificationToastSystem'
import type { 
  MockTestReminderRequest,
  ScheduledNotification,
  NotificationError 
} from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface MockTestReminderDisplay extends MockTestReminderRequest {
  id: string
  scheduledFor: Date
  isActive: boolean
  lastTestScore?: number
  averageScore?: number
  testsCompleted: number
  improvementTrend?: number
  testHistory: TestResult[]
  nextSuggestedTest?: Date
}

export interface TestResult {
  id: string
  testName: string
  testType: string
  score: number
  completedAt: Date
  timeSpent: number
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  topics: string[]
  correctAnswers: number
  totalQuestions: number
}

export interface UseMockTestRemindersOptions {
  enableSmartScheduling?: boolean
  enablePerformanceTracking?: boolean
  defaultReminderTime?: string // HH:mm format
  maxActiveReminders?: number
  adaptiveDifficulty?: boolean
}

export interface UseMockTestRemindersResult {
  // State
  activeReminders: MockTestReminderDisplay[]
  upcomingReminders: MockTestReminderDisplay[]
  testHistory: TestResult[]
  isLoading: boolean
  error: NotificationError | null
  
  // Actions
  scheduleReminder: (request: MockTestReminderRequest) => Promise<ScheduledNotification>
  updateReminder: (reminderId: string, updates: Partial<MockTestReminderRequest>) => Promise<void>
  cancelReminder: (reminderId: string) => Promise<void>
  rescheduleReminder: (reminderId: string, newTime: Date) => Promise<void>
  
  // Test Management
  recordTestResult: (result: Omit<TestResult, 'id'>) => Promise<void>
  getTestAnalytics: (testType?: string) => Promise<{
    averageScore: number
    totalTests: number
    passRate: number
    improvementTrend: number
    strongTopics: string[]
    weakTopics: string[]
    recommendedFocus: string[]
  }>
  
  // Smart Scheduling
  getSuggestedTestTime: (testType: string, difficultyLevel: 'beginner' | 'intermediate' | 'advanced') => Promise<Date>
  getPersonalizedPreparationTips: (testType: string, userPerformance: number) => string[]
  
  // Performance Insights
  getPerformanceTrends: (timeframe: 'week' | 'month' | 'quarter') => Promise<{
    scoreProgression: Array<{ date: Date; score: number }>
    topicMastery: Record<string, number>
    difficultyProgression: Record<string, number>
    timeEfficiency: Array<{ date: Date; timePerQuestion: number }>
  }>
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<UseMockTestRemindersOptions> = {
  enableSmartScheduling: true,
  enablePerformanceTracking: true,
  defaultReminderTime: '14:00',
  maxActiveReminders: 5,
  adaptiveDifficulty: true
}

// ============================================================================
// Preparation Tips Database
// ============================================================================

const PREPARATION_TIPS = {
  beginner: [
    "Review fundamental concepts and definitions",
    "Practice basic problems to build confidence",
    "Focus on understanding rather than memorization",
    "Take breaks every 25-30 minutes while studying",
    "Create simple flashcards for key terms"
  ],
  intermediate: [
    "Practice applying concepts to real-world scenarios",
    "Work through medium-difficulty practice problems",
    "Review your previous test mistakes and learn from them",
    "Time yourself on practice sections to improve speed",
    "Form study groups to discuss challenging topics"
  ],
  advanced: [
    "Focus on complex problem-solving strategies",
    "Practice under timed conditions regularly",
    "Analyze advanced case studies and scenarios",
    "Review cutting-edge developments in the field",
    "Teach concepts to others to deepen understanding"
  ]
}

const PERFORMANCE_BASED_TIPS = {
  low: [
    "Start with easier practice tests to build confidence",
    "Break down complex topics into smaller, manageable parts",
    "Seek help from mentors or study groups",
    "Focus on mastering one topic at a time",
    "Use visual aids and diagrams to understand concepts"
  ],
  medium: [
    "Challenge yourself with slightly harder questions",
    "Practice explaining concepts in your own words",
    "Work on improving your test-taking speed",
    "Identify and strengthen your weak areas",
    "Use active recall techniques while studying"
  ],
  high: [
    "Focus on advanced problem-solving techniques",
    "Practice with time constraints to improve efficiency",
    "Explore edge cases and complex scenarios",
    "Help others to reinforce your own understanding",
    "Stay updated with latest developments in the field"
  ]
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMockTestReminders(
  options: UseMockTestRemindersOptions = {}
): UseMockTestRemindersResult {
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
  
  const [testHistory, setTestHistory] = useState<TestResult[]>([])
  
  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  const {
    data: scheduledReminders = [],
    isLoading,
    error
    // refetch - unused but available if needed
  } = useQuery({
    queryKey: ['mock-test-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const response = await notificationApiClient.getScheduledNotifications(String(user.id), {
        type: 'mock_test_reminder',
        status: 'pending'
      })
      
      return response.notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        testType: notification.notification.data?.testType || 'practice',
        testName: notification.notification.data?.testName || 'Mock Test',
        passRate: notification.notification.data?.passRate || 0,
        reminderTime: notification.scheduledFor,
        preparationTips: notification.notification.data?.preparationTips || [],
        estimatedDuration: notification.notification.data?.estimatedDuration,
        difficultyLevel: (notification.notification.data?.difficultyLevel || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        scheduledFor: notification.scheduledFor,
        isActive: notification.status === 'pending',
        lastTestScore: notification.notification.data?.lastTestScore,
        averageScore: notification.notification.data?.averageScore,
        testsCompleted: notification.notification.data?.testsCompleted || 0,
        improvementTrend: notification.notification.data?.improvementTrend,
        testHistory: notification.notification.data?.testHistory || [],
        nextSuggestedTest: notification.notification.data?.nextSuggestedTest ? new Date(notification.notification.data.nextSuggestedTest) : new Date()
      }))
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
  
  const upcomingReminders = scheduledReminders.filter(reminder => {
    const now = new Date()
    const reminderTime = new Date(reminder.reminderTime)
    return reminderTime > now && reminder.isActive
  }).sort((a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime())
  
  // ============================================================================
  // Mutations
  // ============================================================================
  
  const scheduleReminderMutation = useMutation({
    mutationFn: async (request: MockTestReminderRequest) => {
      if (!user?.id) {
        throw new Error('User must be authenticated')
      }
      
      return await notificationApiClient.scheduleMockTestReminder(request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-reminders'] })
      showToast({
        title: 'Test Reminder Scheduled',
        message: 'Your mock test reminder has been scheduled successfully.',
        duration: 3000
      })
    },
    onError: (error: NotificationError) => {
      console.error('Failed to schedule mock test reminder:', error)
      showToast({
        title: 'Scheduling Failed',
        message: 'Failed to schedule test reminder. Please try again.',
        duration: 5000
      })
    }
  })
  
  const updateReminderMutation = useMutation({
    mutationFn: async ({ reminderId, updates }: { reminderId: string; updates: Partial<MockTestReminderRequest> }) => {
      await notificationApiClient.updateScheduledNotification(reminderId, {
        notification: {
          data: updates
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-reminders'] })
    }
  })
  
  const cancelReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      await notificationApiClient.cancelScheduledNotification(reminderId, 'User cancelled')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-reminders'] })
      showToast({
        title: 'Reminder Cancelled',
        message: 'The test reminder has been cancelled.',
        duration: 3000
      })
    }
  })
  
  const rescheduleReminderMutation = useMutation({
    mutationFn: async ({ reminderId, newTime }: { reminderId: string; newTime: Date }) => {
      await notificationApiClient.rescheduleNotification(reminderId, newTime)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-test-reminders'] })
      showToast({
        title: 'Test Rescheduled',
        message: 'The test reminder has been rescheduled.',
        duration: 3000
      })
    }
  })
  
  // ============================================================================
  // Test Management Functions
  // ============================================================================
  
  const recordTestResult = useCallback(async (result: Omit<TestResult, 'id'>) => {
    if (!user?.id) return
    
    const newResult: TestResult = {
      ...result,
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    setTestHistory(prev => [newResult, ...prev])
    
    // Track analytics
    await notificationApiClient.trackClick(`test-${result.testType}`, String(user.id), `completed_score_${result.score}`)
    
    // Update reminder data if applicable
    const relatedReminder = scheduledReminders.find(r => 
      r.testType === result.testType && r.testName === result.testName
    )
    
    if (relatedReminder) {
      const updatedHistory = [newResult, ...relatedReminder.testHistory]
      const averageScore = updatedHistory.reduce((sum, test) => sum + test.score, 0) / updatedHistory.length
      // Calculate improvement trend for future use
      calculateImprovementTrend(updatedHistory)
      
      await updateReminderMutation.mutateAsync({
        reminderId: relatedReminder.id,
        updates: {
          testType: relatedReminder.testType,
          testName: relatedReminder.testName,
          passRate: averageScore,
          reminderTime: relatedReminder.reminderTime,
          preparationTips: relatedReminder.preparationTips,
          estimatedDuration: relatedReminder.estimatedDuration,
          difficultyLevel: relatedReminder.difficultyLevel
        }
      })
    }
    
  }, [user?.id, scheduledReminders, updateReminderMutation])
  
  const getTestAnalytics = useCallback(async (testType?: string) => {
    const relevantTests = testType 
      ? testHistory.filter(test => test.testType === testType)
      : testHistory
    
    if (relevantTests.length === 0) {
      return {
        averageScore: 0,
        totalTests: 0,
        passRate: 0,
        improvementTrend: 0,
        strongTopics: [],
        weakTopics: [],
        recommendedFocus: []
      }
    }
    
    const averageScore = relevantTests.reduce((sum, test) => sum + test.score, 0) / relevantTests.length
    const passRate = (relevantTests.filter(test => test.score >= 70).length / relevantTests.length) * 100
    const improvementTrend = calculateImprovementTrend(relevantTests)
    
    // Analyze topic performance
    const topicScores: Record<string, number[]> = {}
    relevantTests.forEach(test => {
      test.topics.forEach(topic => {
        if (!topicScores[topic]) topicScores[topic] = []
        topicScores[topic].push(test.score)
      })
    })
    
    const topicAverages = Object.entries(topicScores).map(([topic, scores]) => ({
      topic,
      average: scores.reduce((sum, score) => sum + score, 0) / scores.length
    }))
    
    const strongTopics = topicAverages
      .filter(t => t.average >= 80)
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
      .map(t => t.topic)
    
    const weakTopics = topicAverages
      .filter(t => t.average < 70)
      .sort((a, b) => a.average - b.average)
      .slice(0, 5)
      .map(t => t.topic)
    
    const recommendedFocus = weakTopics.length > 0 ? weakTopics : 
      topicAverages.sort((a, b) => a.average - b.average).slice(0, 3).map(t => t.topic)
    
    return {
      averageScore,
      totalTests: relevantTests.length,
      passRate,
      improvementTrend,
      strongTopics,
      weakTopics,
      recommendedFocus
    }
  }, [testHistory])
  
  const getSuggestedTestTime = useCallback(async (testType: string, difficultyLevel: 'beginner' | 'intermediate' | 'advanced'): Promise<Date> => {
    if (!config.enableSmartScheduling) {
      // Default to configured time
      const timeParts = config.defaultReminderTime.split(':')
      const hours = parseInt(timeParts[0] || '14', 10)
      const minutes = parseInt(timeParts[1] || '0', 10)
      const suggestedTime = new Date()
      suggestedTime.setHours(hours, minutes, 0, 0)
      
      // If time has passed today, schedule for tomorrow
      if (suggestedTime <= new Date()) {
        suggestedTime.setDate(suggestedTime.getDate() + 1)
      }
      
      return suggestedTime
    }
    
    // Smart scheduling based on user performance and preferences
    const userTests = testHistory.filter(test => test.testType === testType)
    const recentPerformance = userTests.slice(0, 5)
    
    let optimalHour = 14 // Default 2 PM
    
    if (recentPerformance.length > 0) {
      // Analyze when user performs best
      const hourPerformance: Record<number, number[]> = {}
      recentPerformance.forEach(test => {
        const hour = test.completedAt.getHours()
        if (!hourPerformance[hour]) hourPerformance[hour] = []
        hourPerformance[hour].push(test.score)
      })
      
      const hourAverages = Object.entries(hourPerformance).map(([hour, scores]) => ({
        hour: parseInt(hour),
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length
      }))
      
      if (hourAverages.length > 0) {
        const sortedAverages = hourAverages.sort((a, b) => b.average - a.average)
        const bestHour = sortedAverages[0]
        if (bestHour) {
          optimalHour = bestHour.hour
        }
      }
    }
    
    // Adjust based on difficulty level
    const difficultyAdjustment = {
      beginner: 0,     // No adjustment
      intermediate: -1, // 1 hour earlier for more focus
      advanced: -2     // 2 hours earlier for peak performance
    }
    
    optimalHour += difficultyAdjustment[difficultyLevel]
    optimalHour = Math.max(8, Math.min(20, optimalHour)) // Keep between 8 AM and 8 PM
    
    const suggestedTime = new Date()
    suggestedTime.setHours(optimalHour, 0, 0, 0)
    
    // If time has passed today, schedule for tomorrow
    if (suggestedTime <= new Date()) {
      suggestedTime.setDate(suggestedTime.getDate() + 1)
    }
    
    return suggestedTime
  }, [config.enableSmartScheduling, config.defaultReminderTime, testHistory])
  
  const getPersonalizedPreparationTips = useCallback((_testType: string, userPerformance: number): string[] => {
    const difficultyTips = userPerformance >= 80 ? PREPARATION_TIPS.advanced :
                          userPerformance >= 60 ? PREPARATION_TIPS.intermediate :
                          PREPARATION_TIPS.beginner
    
    const performanceTips = userPerformance >= 80 ? PERFORMANCE_BASED_TIPS.high :
                           userPerformance >= 60 ? PERFORMANCE_BASED_TIPS.medium :
                           PERFORMANCE_BASED_TIPS.low
    
    // Combine and randomize tips
    const allTips = [...difficultyTips, ...performanceTips]
    const shuffled = allTips.sort(() => Math.random() - 0.5)
    
    return shuffled.slice(0, 5) // Return 5 personalized tips
  }, [])
  
  const getPerformanceTrends = useCallback(async (timeframe: 'week' | 'month' | 'quarter') => {
    const now = new Date()
    const timeframeDays = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90
    const cutoffDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000)
    
    const relevantTests = testHistory.filter(test => test.completedAt >= cutoffDate)
    
    // Score progression
    const scoreProgression = relevantTests
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
      .map(test => ({
        date: test.completedAt,
        score: test.score
      }))
    
    // Topic mastery
    const topicScores: Record<string, number[]> = {}
    relevantTests.forEach(test => {
      test.topics.forEach(topic => {
        if (!topicScores[topic]) topicScores[topic] = []
        topicScores[topic].push(test.score)
      })
    })
    
    const topicMastery: Record<string, number> = {}
    Object.entries(topicScores).forEach(([topic, scores]) => {
      topicMastery[topic] = scores.reduce((sum, score) => sum + score, 0) / scores.length
    })
    
    // Difficulty progression
    const difficultyScores: Record<string, number[]> = {
      beginner: [],
      intermediate: [],
      advanced: []
    }
    relevantTests.forEach(test => {
      const level = test.difficultyLevel
      if (difficultyScores[level]) {
        difficultyScores[level].push(test.score)
      }
    })
    
    const difficultyProgression: Record<string, number> = {}
    Object.entries(difficultyScores).forEach(([difficulty, scores]) => {
      difficultyProgression[difficulty] = scores.reduce((sum, score) => sum + score, 0) / scores.length
    })
    
    // Time efficiency
    const timeEfficiency = relevantTests
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
      .map(test => ({
        date: test.completedAt,
        timePerQuestion: test.timeSpent / test.totalQuestions
      }))
    
    return {
      scoreProgression,
      topicMastery,
      difficultyProgression,
      timeEfficiency
    }
  }, [testHistory])
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const calculateImprovementTrend = (tests: TestResult[]): number => {
    if (tests.length < 2) return 0
    
    const sortedTests = tests.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
    const recentTests = sortedTests.slice(-5)
    const olderTests = sortedTests.slice(-10, -5)
    
    if (olderTests.length === 0) return 0
    
    const recentAvg = recentTests.reduce((sum, test) => sum + test.score, 0) / recentTests.length
    const olderAvg = olderTests.reduce((sum, test) => sum + test.score, 0) / olderTests.length
    
    return Math.round(recentAvg - olderAvg)
  }
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    // State
    activeReminders,
    upcomingReminders,
    testHistory,
    isLoading,
    error: error as NotificationError | null,
    
    // Actions
    scheduleReminder: scheduleReminderMutation.mutateAsync,
    updateReminder: (reminderId: string, updates: Partial<MockTestReminderRequest>) => 
      updateReminderMutation.mutateAsync({ reminderId, updates }),
    cancelReminder: cancelReminderMutation.mutateAsync,
    rescheduleReminder: (reminderId: string, newTime: Date) => 
      rescheduleReminderMutation.mutateAsync({ reminderId, newTime }),
    
    // Test Management
    recordTestResult,
    getTestAnalytics,
    
    // Smart Scheduling
    getSuggestedTestTime,
    getPersonalizedPreparationTips,
    
    // Performance Insights
    getPerformanceTrends
  }
}

export default useMockTestReminders