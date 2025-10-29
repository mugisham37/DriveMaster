'use client'

/**
 * Progress Tracking Context with Comprehensive Progress State Management
 * 
 * Implements:
 * - ProgressContext with comprehensive progress state management
 * - Skill mastery fetching, calculation, and visualization
 * - Learning streak tracking with historical data
 * - Milestone and achievement progress monitoring
 * - Requirements: 3.1, 3.2, 3.4, 3.5
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback, 
  useRef,
  ReactNode 
} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { userServiceClient } from '@/lib/user-service'
import {
  getUserServiceCacheManager,
  queryKeys,
  CACHE_TIMES,
  createUserServiceQueryOptions,
} from '@/lib/cache/user-service-cache'
import { ProgressChannel } from '@/lib/realtime/progress-channel'
import type {
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  WeeklyProgressPoint,
  UserServiceError,
  TimeRange
} from '@/types/user-service'

// Import types from progress analytics and calculation modules
import type {
  ProgressTrend,
  TopicComparison,
  PeerComparison,
  ChartData,
  ChartType,
  HeatmapData
} from '@/lib/user-service/progress-analytics'

import type {
  ProgressPrediction,
  PracticeRecommendation
} from '@/lib/user-service/progress-calculation'

// ============================================================================
// State Types
// ============================================================================

export interface ProgressState {
  // Progress data
  summary: ProgressSummary | null
  skillMasteries: Map<string, SkillMastery>
  learningStreak: LearningStreak | null
  milestones: Milestone[]
  weeklyProgress: WeeklyProgressPoint[]
  
  // Loading states
  isLoading: boolean
  isSummaryLoading: boolean
  isMasteryLoading: boolean
  isStreakLoading: boolean
  isMilestonesLoading: boolean
  isUpdating: boolean
  isProgressUpdating: boolean
  
  // Error states
  error: UserServiceError | null
  summaryError: UserServiceError | null
  masteryError: UserServiceError | null
  streakError: UserServiceError | null
  milestonesError: UserServiceError | null
  
  // Real-time update state
  isRealTimeConnected: boolean
  lastUpdateTimestamp: Date | null
  
  // Analytics state
  progressTrends: ProgressTrend[]
  topicComparisons: TopicComparison[]
  peerComparisons: PeerComparison[]
  
  // Visualization data cache
  chartDataCache: Map<string, ChartData>
  heatmapDataCache: HeatmapData | null
}

// ============================================================================
// Additional Types for Context State
// ============================================================================

// ============================================================================
// Action Types
// ============================================================================

export type ProgressAction =
  // Summary actions
  | { type: 'SUMMARY_FETCH_START' }
  | { type: 'SUMMARY_FETCH_SUCCESS'; payload: { summary: ProgressSummary } }
  | { type: 'SUMMARY_FETCH_ERROR'; payload: { error: UserServiceError } }
  
  // Skill mastery actions
  | { type: 'MASTERY_FETCH_START' }
  | { type: 'MASTERY_FETCH_SUCCESS'; payload: { masteries: SkillMastery[] } }
  | { type: 'MASTERY_FETCH_ERROR'; payload: { error: UserServiceError } }
  | { type: 'MASTERY_UPDATE_START' }
  | { type: 'MASTERY_UPDATE_SUCCESS'; payload: { mastery: SkillMastery } }
  | { type: 'MASTERY_UPDATE_ERROR'; payload: { error: UserServiceError } }
  
  // Learning streak actions
  | { type: 'STREAK_FETCH_START' }
  | { type: 'STREAK_FETCH_SUCCESS'; payload: { streak: LearningStreak } }
  | { type: 'STREAK_FETCH_ERROR'; payload: { error: UserServiceError } }
  | { type: 'STREAK_UPDATE_SUCCESS'; payload: { streak: LearningStreak } }
  
  // Milestones actions
  | { type: 'MILESTONES_FETCH_START' }
  | { type: 'MILESTONES_FETCH_SUCCESS'; payload: { milestones: Milestone[] } }
  | { type: 'MILESTONES_FETCH_ERROR'; payload: { error: UserServiceError } }
  | { type: 'MILESTONE_ACHIEVED'; payload: { milestone: Milestone } }
  
  // Progress update actions
  | { type: 'PROGRESS_UPDATE_START' }
  | { type: 'PROGRESS_UPDATE_SUCCESS'; payload: { topic: string; attempts: AttemptRecord[] } }
  | { type: 'PROGRESS_UPDATE_ERROR'; payload: { error: UserServiceError } }
  
  // Real-time actions
  | { type: 'REALTIME_CONNECTED' }
  | { type: 'REALTIME_DISCONNECTED' }
  | { type: 'REALTIME_PROGRESS_UPDATE'; payload: { topic: string; mastery: SkillMastery } }
  | { type: 'REALTIME_MILESTONE_ACHIEVED'; payload: { milestone: Milestone } }
  
  // Analytics actions
  | { type: 'TRENDS_UPDATE'; payload: { trends: ProgressTrend[] } }
  | { type: 'TOPIC_COMPARISON_UPDATE'; payload: { comparisons: TopicComparison[] } }
  | { type: 'PEER_COMPARISON_UPDATE'; payload: { comparison: PeerComparison } }
  
  // Visualization data actions
  | { type: 'CHART_DATA_CACHE'; payload: { key: string; data: ChartData } }
  | { type: 'HEATMAP_DATA_CACHE'; payload: { data: HeatmapData } }
  | { type: 'CLEAR_VISUALIZATION_CACHE' }
  
  // Error management
  | { type: 'CLEAR_ERROR'; payload?: { errorType?: keyof Pick<ProgressState, 'error' | 'summaryError' | 'masteryError' | 'streakError' | 'milestonesError'> } }
  | { type: 'CLEAR_ALL_ERRORS' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: ProgressState = {
  summary: null,
  skillMasteries: new Map(),
  learningStreak: null,
  milestones: [],
  weeklyProgress: [],
  
  isLoading: false,
  isSummaryLoading: false,
  isMasteryLoading: false,
  isStreakLoading: false,
  isMilestonesLoading: false,
  isUpdating: false,
  isProgressUpdating: false,
  
  error: null,
  summaryError: null,
  masteryError: null,
  streakError: null,
  milestonesError: null,
  
  isRealTimeConnected: false,
  lastUpdateTimestamp: null,
  
  progressTrends: [],
  topicComparisons: [],
  peerComparisons: [],
  
  chartDataCache: new Map(),
  heatmapDataCache: null,
}

// ============================================================================
// Reducer
// ============================================================================

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    // Summary
    case 'SUMMARY_FETCH_START':
      return {
        ...state,
        isSummaryLoading: true,
        isLoading: true,
        summaryError: null,
      }
    
    case 'SUMMARY_FETCH_SUCCESS':
      return {
        ...state,
        isSummaryLoading: false,
        isLoading: false,
        summary: action.payload.summary,
        summaryError: null,
        weeklyProgress: action.payload.summary.weeklyProgress,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'SUMMARY_FETCH_ERROR':
      return {
        ...state,
        isSummaryLoading: false,
        isLoading: false,
        summaryError: action.payload.error,
      }
    
    // Skill mastery
    case 'MASTERY_FETCH_START':
      return {
        ...state,
        isMasteryLoading: true,
        isLoading: true,
        masteryError: null,
      }
    
    case 'MASTERY_FETCH_SUCCESS':
      const masteryMap = new Map<string, SkillMastery>()
      action.payload.masteries.forEach(mastery => {
        masteryMap.set(mastery.topic, mastery)
      })
      return {
        ...state,
        isMasteryLoading: false,
        isLoading: false,
        skillMasteries: masteryMap,
        masteryError: null,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'MASTERY_FETCH_ERROR':
      return {
        ...state,
        isMasteryLoading: false,
        isLoading: false,
        masteryError: action.payload.error,
      }
    
    case 'MASTERY_UPDATE_START':
      return {
        ...state,
        isProgressUpdating: true,
        isUpdating: true,
        masteryError: null,
      }
    
    case 'MASTERY_UPDATE_SUCCESS':
      const updatedMasteries = new Map(state.skillMasteries)
      updatedMasteries.set(action.payload.mastery.topic, action.payload.mastery)
      return {
        ...state,
        isProgressUpdating: false,
        isUpdating: false,
        skillMasteries: updatedMasteries,
        masteryError: null,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'MASTERY_UPDATE_ERROR':
      return {
        ...state,
        isProgressUpdating: false,
        isUpdating: false,
        masteryError: action.payload.error,
      }
    
    // Learning streak
    case 'STREAK_FETCH_START':
      return {
        ...state,
        isStreakLoading: true,
        isLoading: true,
        streakError: null,
      }
    
    case 'STREAK_FETCH_SUCCESS':
    case 'STREAK_UPDATE_SUCCESS':
      return {
        ...state,
        isStreakLoading: false,
        isLoading: false,
        learningStreak: action.payload.streak,
        streakError: null,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'STREAK_FETCH_ERROR':
      return {
        ...state,
        isStreakLoading: false,
        isLoading: false,
        streakError: action.payload.error,
      }
    
    // Milestones
    case 'MILESTONES_FETCH_START':
      return {
        ...state,
        isMilestonesLoading: true,
        isLoading: true,
        milestonesError: null,
      }
    
    case 'MILESTONES_FETCH_SUCCESS':
      return {
        ...state,
        isMilestonesLoading: false,
        isLoading: false,
        milestones: action.payload.milestones,
        milestonesError: null,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'MILESTONES_FETCH_ERROR':
      return {
        ...state,
        isMilestonesLoading: false,
        isLoading: false,
        milestonesError: action.payload.error,
      }
    
    case 'MILESTONE_ACHIEVED':
      const updatedMilestones = state.milestones.map(milestone =>
        milestone.id === action.payload.milestone.id
          ? action.payload.milestone
          : milestone
      )
      return {
        ...state,
        milestones: updatedMilestones,
        lastUpdateTimestamp: new Date(),
      }
    
    // Progress updates
    case 'PROGRESS_UPDATE_START':
      return {
        ...state,
        isProgressUpdating: true,
        isUpdating: true,
        error: null,
      }
    
    case 'PROGRESS_UPDATE_SUCCESS':
      return {
        ...state,
        isProgressUpdating: false,
        isUpdating: false,
        error: null,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'PROGRESS_UPDATE_ERROR':
      return {
        ...state,
        isProgressUpdating: false,
        isUpdating: false,
        error: action.payload.error,
      }
    
    // Real-time updates
    case 'REALTIME_CONNECTED':
      return {
        ...state,
        isRealTimeConnected: true,
      }
    
    case 'REALTIME_DISCONNECTED':
      return {
        ...state,
        isRealTimeConnected: false,
      }
    
    case 'REALTIME_PROGRESS_UPDATE':
      const realtimeMasteries = new Map(state.skillMasteries)
      realtimeMasteries.set(action.payload.topic, action.payload.mastery)
      return {
        ...state,
        skillMasteries: realtimeMasteries,
        lastUpdateTimestamp: new Date(),
      }
    
    case 'REALTIME_MILESTONE_ACHIEVED':
      const realtimeMilestones = state.milestones.map(milestone =>
        milestone.id === action.payload.milestone.id
          ? action.payload.milestone
          : milestone
      )
      return {
        ...state,
        milestones: realtimeMilestones,
        lastUpdateTimestamp: new Date(),
      }
    
    // Analytics
    case 'TRENDS_UPDATE':
      return {
        ...state,
        progressTrends: action.payload.trends,
      }
    
    case 'TOPIC_COMPARISON_UPDATE':
      return {
        ...state,
        topicComparisons: action.payload.comparisons,
      }
    
    case 'PEER_COMPARISON_UPDATE':
      return {
        ...state,
        peerComparisons: [action.payload.comparison],
      }
    
    // Visualization cache
    case 'CHART_DATA_CACHE':
      const updatedChartCache = new Map(state.chartDataCache)
      updatedChartCache.set(action.payload.key, action.payload.data)
      return {
        ...state,
        chartDataCache: updatedChartCache,
      }
    
    case 'HEATMAP_DATA_CACHE':
      return {
        ...state,
        heatmapDataCache: action.payload.data,
      }
    
    case 'CLEAR_VISUALIZATION_CACHE':
      return {
        ...state,
        chartDataCache: new Map(),
        heatmapDataCache: null,
      }
    
    // Error management
    case 'CLEAR_ERROR':
      if (action.payload?.errorType) {
        return {
          ...state,
          [action.payload.errorType]: null,
        }
      }
      return {
        ...state,
        error: null,
      }
    
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        error: null,
        summaryError: null,
        masteryError: null,
        streakError: null,
        milestonesError: null,
      }
    
    default:
      return state
  }
}

// ============================================================================
// Context Definition
// ============================================================================

export interface ProgressContextValue {
  // State
  state: ProgressState
  
  // Computed properties
  summary: ProgressSummary | null
  skillMasteries: Map<string, SkillMastery>
  learningStreak: LearningStreak | null
  milestones: Milestone[]
  weeklyProgress: WeeklyProgressPoint[]
  isLoading: boolean
  isUpdating: boolean
  error: UserServiceError | null
  
  // Progress operations
  fetchProgressSummary: () => Promise<void>
  updateProgress: (topic: string, attempts: AttemptRecord[]) => Promise<void>
  recalculateAllMasteries: () => Promise<void>
  
  // Streak operations
  updateLearningStreak: () => Promise<void>
  getStreakHistory: (days: number) => Promise<StreakPoint[]>
  
  // Milestone operations
  checkMilestoneAchievements: () => Promise<Milestone[]>
  getMilestoneProgress: () => Promise<MilestoneProgress[]>
  
  // Analytics
  getProgressTrends: (timeRange: TimeRange) => Promise<ProgressTrend[]>
  getTopicComparison: (topics: string[]) => Promise<TopicComparison[]>
  getPeerComparison: (countryCode?: string) => Promise<PeerComparison>
  
  // Visualization data
  getProgressChartData: (type: ChartType) => Promise<ChartData>
  getMasteryHeatmapData: () => Promise<HeatmapData>
  
  // Real-time updates
  subscribeToProgressUpdates: () => void
  unsubscribeFromProgressUpdates: () => void
  
  // Progress calculation and optimization (Task 6.4)
  generateProgressPredictions: () => Promise<ProgressPrediction[]>
  generateOptimizedSummary: () => Promise<ProgressSummary | null>
  prefetchProgressData: (trigger: string) => Promise<void>
  generateLearningRecommendations: () => Promise<PracticeRecommendation[]>
  
  // Utility functions
  clearError: (errorType?: keyof Pick<ProgressState, 'error' | 'summaryError' | 'masteryError' | 'streakError' | 'milestonesError'>) => void
  clearAllErrors: () => void
  getSkillMastery: (topic: string) => SkillMastery | null
  getOverallProgress: () => number
  getTopicProgress: (topic: string) => number
  isTopicMastered: (topic: string, threshold?: number) => boolean
}

// ============================================================================
// Additional Types for Context
// ============================================================================

export interface StreakPoint {
  date: Date
  streak: number
  active: boolean
}

export interface MilestoneProgress {
  milestone: Milestone
  progress: number
  estimatedCompletion?: Date
  nextTarget?: number
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export interface ProgressProviderProps {
  children: ReactNode
}

export function ProgressProvider({ children }: ProgressProviderProps) {
  const [state, dispatch] = useReducer(progressReducer, initialState)
  const { user: authUser, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const userId = authUser?.id?.toString()
  
  // ============================================================================
  // React Query Integration
  // ============================================================================
  
  // Progress summary query
  const progressSummaryQuery = useQuery<ProgressSummary, UserServiceError>({
    queryKey: queryKeys.progressSummary(userId || ''),
    queryFn: () => userServiceClient.getProgressSummary(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<ProgressSummary, UserServiceError>(
      CACHE_TIMES.PROGRESS_SUMMARY
    ),
  })
  
  // Skill mastery query
  const skillMasteryQuery = useQuery<SkillMastery[], UserServiceError>({
    queryKey: queryKeys.skillMastery(userId || ''),
    queryFn: () => userServiceClient.getSkillMastery(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<SkillMastery[], UserServiceError>(
      CACHE_TIMES.SKILL_MASTERY
    ),
  })
  
  // Learning streak query
  const learningStreakQuery = useQuery<LearningStreak, UserServiceError>({
    queryKey: queryKeys.learningStreak(userId || ''),
    queryFn: () => userServiceClient.getLearningStreak(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<LearningStreak, UserServiceError>(
      CACHE_TIMES.LEARNING_STREAK
    ),
  })
  
  // Milestones query
  const milestonesQuery = useQuery<Milestone[], UserServiceError>({
    queryKey: queryKeys.milestones(userId || ''),
    queryFn: () => userServiceClient.getMilestones(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<Milestone[], UserServiceError>(
      CACHE_TIMES.MILESTONES
    ),
  })
  
  // Progress update mutation
  const progressUpdateMutation = useMutation({
    mutationFn: async ({ topic, attempts }: { topic: string; attempts: AttemptRecord[] }) => {
      if (!userId) throw new Error('User not authenticated')
      return await userServiceClient.updateSkillMastery(userId, topic, attempts)
    },
    onMutate: async ({ topic }) => {
      dispatch({ type: 'PROGRESS_UPDATE_START' })
      
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.skillMastery(userId!, topic)
      })
      
      return { topic }
    },
    onSuccess: (mastery: SkillMastery, { topic }) => {
      dispatch({ 
        type: 'MASTERY_UPDATE_SUCCESS', 
        payload: { mastery } 
      })
      
      // Invalidate related caches
      const cacheManager = getUserServiceCacheManager()
      cacheManager.invalidateProgress(userId!, { topic }).catch(console.warn)
    },
    onError: (error: UserServiceError) => {
      dispatch({ 
        type: 'PROGRESS_UPDATE_ERROR', 
        payload: { error } 
      })
    },
  })
  
  // ============================================================================
  // Effects for data synchronization
  // ============================================================================
  
  // Sync loading states
  useEffect(() => {
    if (progressSummaryQuery.isLoading && !state.isSummaryLoading) {
      dispatch({ type: 'SUMMARY_FETCH_START' })
    }
    if (skillMasteryQuery.isLoading && !state.isMasteryLoading) {
      dispatch({ type: 'MASTERY_FETCH_START' })
    }
    if (learningStreakQuery.isLoading && !state.isStreakLoading) {
      dispatch({ type: 'STREAK_FETCH_START' })
    }
    if (milestonesQuery.isLoading && !state.isMilestonesLoading) {
      dispatch({ type: 'MILESTONES_FETCH_START' })
    }
  }, [
    progressSummaryQuery.isLoading,
    skillMasteryQuery.isLoading,
    learningStreakQuery.isLoading,
    milestonesQuery.isLoading,
    state.isSummaryLoading,
    state.isMasteryLoading,
    state.isStreakLoading,
    state.isMilestonesLoading,
  ])
  
  // Sync successful data fetches
  useEffect(() => {
    if (progressSummaryQuery.data && !progressSummaryQuery.isLoading) {
      dispatch({
        type: 'SUMMARY_FETCH_SUCCESS',
        payload: { summary: progressSummaryQuery.data },
      })
    }
  }, [progressSummaryQuery.data, progressSummaryQuery.isLoading])
  
  useEffect(() => {
    if (skillMasteryQuery.data && !skillMasteryQuery.isLoading) {
      dispatch({
        type: 'MASTERY_FETCH_SUCCESS',
        payload: { masteries: skillMasteryQuery.data },
      })
    }
  }, [skillMasteryQuery.data, skillMasteryQuery.isLoading])
  
  useEffect(() => {
    if (learningStreakQuery.data && !learningStreakQuery.isLoading) {
      dispatch({
        type: 'STREAK_FETCH_SUCCESS',
        payload: { streak: learningStreakQuery.data },
      })
    }
  }, [learningStreakQuery.data, learningStreakQuery.isLoading])
  
  useEffect(() => {
    if (milestonesQuery.data && !milestonesQuery.isLoading) {
      dispatch({
        type: 'MILESTONES_FETCH_SUCCESS',
        payload: { milestones: milestonesQuery.data },
      })
    }
  }, [milestonesQuery.data, milestonesQuery.isLoading])
  
  // Sync errors
  useEffect(() => {
    if (progressSummaryQuery.error && !progressSummaryQuery.isLoading) {
      dispatch({
        type: 'SUMMARY_FETCH_ERROR',
        payload: { error: progressSummaryQuery.error },
      })
    }
  }, [progressSummaryQuery.error, progressSummaryQuery.isLoading])
  
  useEffect(() => {
    if (skillMasteryQuery.error && !skillMasteryQuery.isLoading) {
      dispatch({
        type: 'MASTERY_FETCH_ERROR',
        payload: { error: skillMasteryQuery.error },
      })
    }
  }, [skillMasteryQuery.error, skillMasteryQuery.isLoading])
  
  useEffect(() => {
    if (learningStreakQuery.error && !learningStreakQuery.isLoading) {
      dispatch({
        type: 'STREAK_FETCH_ERROR',
        payload: { error: learningStreakQuery.error },
      })
    }
  }, [learningStreakQuery.error, learningStreakQuery.isLoading])
  
  useEffect(() => {
    if (milestonesQuery.error && !milestonesQuery.isLoading) {
      dispatch({
        type: 'MILESTONES_FETCH_ERROR',
        payload: { error: milestonesQuery.error },
      })
    }
  }, [milestonesQuery.error, milestonesQuery.isLoading])
  
  // ============================================================================
  // Action Handlers
  // ============================================================================
  
  const fetchProgressSummary = useCallback(async () => {
    if (!userId) return
    await progressSummaryQuery.refetch()
  }, [userId, progressSummaryQuery])
  
  const updateProgress = useCallback(async (topic: string, attempts: AttemptRecord[]) => {
    // Task 6.4: Client-side progress calculation for immediate feedback
    try {
      const currentMastery = state.skillMasteries.get(topic)
      if (currentMastery && attempts.length > 0) {
        // Calculate immediate feedback using the new ProgressCalculationManager
        const { ProgressCalculationManager } = await import('@/lib/user-service/progress-calculation')
        const calculator = new ProgressCalculationManager()
        
        const immediateFeedback = calculator.calculateImmediateFeedback(currentMastery, attempts)
        
        // Update local state with immediate feedback
        const optimisticMastery: SkillMastery = {
          ...currentMastery,
          mastery: immediateFeedback.mastery,
          confidence: immediateFeedback.confidence,
          lastPracticed: new Date(),
          practiceCount: currentMastery.practiceCount + attempts.length,
          updatedAt: new Date(),
        }
        
        dispatch({
          type: 'MASTERY_UPDATE_SUCCESS',
          payload: { mastery: optimisticMastery }
        })
        
        console.log('Immediate progress feedback:', {
          topic,
          improvement: immediateFeedback.improvement,
          newMastery: immediateFeedback.mastery,
          confidence: immediateFeedback.confidence,
          recommendations: immediateFeedback.recommendations,
        })
      }
    } catch (error) {
      console.warn('Failed to calculate immediate feedback:', error)
    }
    
    // Continue with server update
    await progressUpdateMutation.mutateAsync({ topic, attempts })
  }, [progressUpdateMutation, state.skillMasteries])
  
  const recalculateAllMasteries = useCallback(async () => {
    if (!userId) return
    
    try {
      // Invalidate all mastery caches to force recalculation
      const cacheManager = getUserServiceCacheManager()
      await cacheManager.invalidateProgress(userId)
      
      // Refetch all progress data
      await Promise.all([
        progressSummaryQuery.refetch(),
        skillMasteryQuery.refetch(),
        learningStreakQuery.refetch(),
        milestonesQuery.refetch(),
      ])
    } catch (error) {
      console.warn('Failed to recalculate masteries:', error)
    }
  }, [userId, progressSummaryQuery, skillMasteryQuery, learningStreakQuery, milestonesQuery])
  
  const updateLearningStreak = useCallback(async () => {
    if (!userId) return
    await learningStreakQuery.refetch()
  }, [userId, learningStreakQuery])
  
  const getStreakHistory = useCallback(async (days: number): Promise<StreakPoint[]> => {
    if (!userId) return []
    
    try {
      // This would be implemented as a separate API call
      // For now, we'll generate mock data based on current streak
      const streak = state.learningStreak
      if (!streak) return []
      
      const history: StreakPoint[] = []
      const today = new Date()
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        // Simple logic: if within current streak period, mark as active
        const daysSinceStart = Math.floor(
          (today.getTime() - streak.streakStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const isActive = i <= daysSinceStart && daysSinceStart < streak.currentStreak
        
        history.push({
          date,
          streak: isActive ? Math.max(1, streak.currentStreak - (daysSinceStart - i)) : 0,
          active: isActive,
        })
      }
      
      return history
    } catch (error) {
      console.warn('Failed to get streak history:', error)
      return []
    }
  }, [userId, state.learningStreak])
  
  const checkMilestoneAchievements = useCallback(async (): Promise<Milestone[]> => {
    if (!userId) return []
    
    try {
      // Refetch milestones to get latest achievements
      const result = await milestonesQuery.refetch()
      return result.data || []
    } catch (error) {
      console.warn('Failed to check milestone achievements:', error)
      return []
    }
  }, [userId, milestonesQuery])
  
  const getMilestoneProgress = useCallback(async (): Promise<MilestoneProgress[]> => {
    if (!state.milestones.length) return []
    
    return state.milestones.map(milestone => {
      const progress = milestone.progress
      let estimatedCompletion: Date | undefined
      
      // Calculate estimated completion based on current progress rate
      if (progress > 0 && progress < 1 && state.summary) {
        const daysActive = Math.floor(
          (new Date().getTime() - new Date(state.summary.generatedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysActive > 0) {
          const progressRate = progress / daysActive
          const remainingDays = (1 - progress) / progressRate
          estimatedCompletion = new Date()
          estimatedCompletion.setDate(estimatedCompletion.getDate() + remainingDays)
        }
      }
      
      const milestoneProgress: MilestoneProgress = {
        milestone,
        progress,
        ...(estimatedCompletion && { estimatedCompletion }),
        ...(milestone.achieved ? {} : { nextTarget: milestone.target }),
      }
      return milestoneProgress
    })
  }, [state.milestones, state.summary])
  
  // ============================================================================
  // Analytics Functions (Task 6.3)
  // ============================================================================
  
  const getProgressTrends = useCallback(async (timeRange: TimeRange): Promise<ProgressTrend[]> => {
    if (!userId || !state.summary) return []
    
    try {
      // Use the new ProgressAnalyticsManager for comprehensive trend analysis
      const { ProgressTrendAnalyzer } = await import('@/lib/user-service/progress-analytics')
      
      const trend = ProgressTrendAnalyzer.analyzeProgressTrends(state.weeklyProgress, timeRange)
      
      dispatch({ type: 'TRENDS_UPDATE', payload: { trends: [trend] } })
      return [trend]
    } catch (error) {
      console.warn('Failed to get progress trends:', error)
      return []
    }
  }, [userId, state.summary, state.weeklyProgress])
  
  const getTopicComparison = useCallback(async (topics: string[]): Promise<TopicComparison[]> => {
    if (!userId || !state.skillMasteries.size) return []
    
    try {
      // Use the new TopicComparisonAnalyzer for peer benchmarking
      const { TopicComparisonAnalyzer } = await import('@/lib/user-service/progress-analytics')
      
      const comparisons = await TopicComparisonAnalyzer.generateTopicComparisons(
        topics,
        state.skillMasteries,
        state.weeklyProgress
      )
      
      dispatch({ type: 'TOPIC_COMPARISON_UPDATE', payload: { comparisons } })
      return comparisons
    } catch (error) {
      console.warn('Failed to get topic comparisons:', error)
      return []
    }
  }, [userId, state.skillMasteries, state.weeklyProgress])
  
  const getPeerComparison = useCallback(async (countryCode?: string): Promise<PeerComparison> => {
    if (!userId || !state.summary) {
      return {
        countryCode: countryCode || '',
        userRank: 0,
        totalUsers: 0,
        averageMastery: 0,
        userMastery: 0,
        percentile: 0,
        topPerformers: [],
        similarPeers: [],
        improvementOpportunities: [],
      }
    }
    
    try {
      // Use the new PeerComparisonAnalyzer for comprehensive peer analysis
      const { PeerComparisonAnalyzer } = await import('@/lib/user-service/progress-analytics')
      
      const comparison = await PeerComparisonAnalyzer.generatePeerComparison(state.summary, countryCode)
      
      dispatch({ type: 'PEER_COMPARISON_UPDATE', payload: { comparison } })
      return comparison
    } catch (error) {
      console.warn('Failed to get peer comparison:', error)
      return {
        countryCode: countryCode || '',
        userRank: 0,
        totalUsers: 0,
        averageMastery: 0,
        userMastery: 0,
        percentile: 0,
        topPerformers: [],
        similarPeers: [],
        improvementOpportunities: [],
      }
    }
  }, [userId, state.summary])
  
  // ============================================================================
  // Visualization Data Functions (Task 6.3)
  // ============================================================================
  
  const getProgressChartData = useCallback(async (type: ChartType): Promise<ChartData> => {
    const cacheKey = `${type}-${userId}`
    const cached = state.chartDataCache.get(cacheKey)
    
    if (cached && (new Date().getTime() - cached.generatedAt.getTime()) < 5 * 60 * 1000) {
      return cached
    }
    
    try {
      // Use the new ChartDataGenerator for comprehensive chart generation
      const { ChartDataGenerator } = await import('@/lib/user-service/progress-analytics')
      
      const progressData = {
        weeklyProgress: state.weeklyProgress,
        skillMasteries: state.skillMasteries,
        summary: state.summary!,
      }
      
      const chartData = ChartDataGenerator.generateProgressChartData(type, progressData)
      
      dispatch({ type: 'CHART_DATA_CACHE', payload: { key: cacheKey, data: chartData } })
      return chartData
    } catch (error) {
      console.warn('Failed to generate chart data:', error)
      
      // Fallback to empty chart
      const emptyChart: ChartData = {
        type,
        data: [],
        labels: [],
        datasets: [],
        generatedAt: new Date(),
        cacheKey,
      }
      
      return emptyChart
    }
  }, [userId, state.chartDataCache, state.weeklyProgress, state.skillMasteries, state.summary])
  
  const getMasteryHeatmapData = useCallback(async (): Promise<HeatmapData> => {
    if (state.heatmapDataCache && 
        (new Date().getTime() - state.heatmapDataCache.generatedAt.getTime()) < 10 * 60 * 1000) {
      return state.heatmapDataCache
    }
    
    try {
      // Use the new HeatmapDataGenerator for comprehensive heatmap generation
      const { HeatmapDataGenerator } = await import('@/lib/user-service/progress-analytics')
      
      const heatmapData = HeatmapDataGenerator.generateMasteryHeatmapData(
        state.skillMasteries,
        state.weeklyProgress
      )
      
      dispatch({ type: 'HEATMAP_DATA_CACHE', payload: { data: heatmapData } })
      return heatmapData
    } catch (error) {
      console.warn('Failed to generate heatmap data:', error)
      
      // Fallback to empty heatmap
      const emptyHeatmap: HeatmapData = {
        topics: [],
        weeks: [],
        values: [],
        maxValue: 1,
        minValue: 0,
        colorScale: [],
        tooltipData: [],
        generatedAt: new Date(),
      }
      
      return emptyHeatmap
    }
  }, [state.heatmapDataCache, state.skillMasteries, state.weeklyProgress])
  
  // ============================================================================
  // Real-time Updates (Task 6.2)
  // ============================================================================
  
  // Real-time progress channel
  const progressChannelRef = useRef<ProgressChannel | null>(null)
  
  const subscribeToProgressUpdates = useCallback(() => {
    if (!userId || progressChannelRef.current) {
      return // Already subscribed or no user
    }

    try {
      const progressChannel = new ProgressChannel(userId, {
        onProgressUpdate: (event) => {
          console.log('Real-time progress update:', event)
          dispatch({
            type: 'REALTIME_PROGRESS_UPDATE',
            payload: { topic: event.topic, mastery: event.mastery }
          })
          
          // Invalidate related caches
          const cacheManager = getUserServiceCacheManager()
          cacheManager.invalidateProgress(userId, { topic: event.topic }).catch(console.warn)
        },
        
        onMilestoneAchieved: (event) => {
          console.log('Real-time milestone achieved:', event)
          dispatch({
            type: 'REALTIME_MILESTONE_ACHIEVED',
            payload: { milestone: event.milestone }
          })
          
          // Invalidate milestones cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.milestones(userId)
          })
        },
        
        onStreakUpdate: (event) => {
          console.log('Real-time streak update:', event)
          dispatch({
            type: 'STREAK_UPDATE_SUCCESS',
            payload: { streak: event.streak }
          })
          
          // Invalidate streak cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.learningStreak(userId)
          })
        },
        
        onProgressSummaryUpdate: (event) => {
          console.log('Real-time progress summary update:', event)
          dispatch({
            type: 'SUMMARY_FETCH_SUCCESS',
            payload: { summary: event.summary }
          })
          
          // Invalidate summary cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.progressSummary(userId)
          })
        },
        
        onError: (error) => {
          console.error('Real-time progress error:', error)
          // Don't dispatch error to avoid disrupting the UI
          // Real-time is supplementary, not critical
        }
      })

      progressChannelRef.current = progressChannel
      
      progressChannel.subscribe().then(() => {
        dispatch({ type: 'REALTIME_CONNECTED' })
        console.log('Successfully subscribed to real-time progress updates')
      }).catch((error) => {
        console.warn('Failed to subscribe to real-time progress updates:', error)
        // Don't set as connected if subscription fails
      })
      
    } catch (error) {
      console.error('Failed to create progress channel:', error)
    }
  }, [userId, queryClient])
  
  const unsubscribeFromProgressUpdates = useCallback(() => {
    if (progressChannelRef.current) {
      progressChannelRef.current.unsubscribe()
      progressChannelRef.current = null
      dispatch({ type: 'REALTIME_DISCONNECTED' })
      console.log('Unsubscribed from real-time progress updates')
    }
  }, [])
  
  // ============================================================================
  // Progress Calculation and Optimization Functions (Task 6.4)
  // ============================================================================
  
  const generateProgressPredictions = useCallback(async () => {
    if (!userId || !state.summary || state.skillMasteries.size === 0) return []
    
    try {
      const { ProgressCalculationManager, LearningPatternAnalyzer } = await import('@/lib/user-service/progress-calculation')
      
      // Analyze learning patterns
      const learningPattern = LearningPatternAnalyzer.analyzeLearningPattern(
        userId,
        state.summary,
        state.skillMasteries,
        state.weeklyProgress
      )
      
      // Generate progress predictions
      const calculator = new ProgressCalculationManager()
      const predictions = calculator.generateProgressPredictions(
        state.skillMasteries,
        state.weeklyProgress,
        learningPattern
      )
      
      console.log('Generated progress predictions:', {
        learningPattern,
        predictions: predictions.slice(0, 5), // Log top 5 predictions
      })
      
      return predictions
    } catch (error) {
      console.warn('Failed to generate progress predictions:', error)
      return []
    }
  }, [userId, state.summary, state.skillMasteries, state.weeklyProgress])
  
  const generateOptimizedSummary = useCallback(async () => {
    if (!state.skillMasteries.size || !state.learningStreak) return null
    
    try {
      const { ProgressCalculationManager } = await import('@/lib/user-service/progress-calculation')
      
      const calculator = new ProgressCalculationManager()
      const optimizedSummary = calculator.generateOptimizedSummary(
        state.skillMasteries,
        state.weeklyProgress,
        state.learningStreak,
        state.milestones
      )
      
      // Update the summary with optimized data
      dispatch({
        type: 'SUMMARY_FETCH_SUCCESS',
        payload: { summary: { ...optimizedSummary, userId: userId! } }
      })
      
      return optimizedSummary
    } catch (error) {
      console.warn('Failed to generate optimized summary:', error)
      return null
    }
  }, [state.skillMasteries, state.weeklyProgress, state.learningStreak, state.milestones, userId])
  
  const prefetchProgressData = useCallback(async (trigger: string) => {
    if (!userId || !state.summary) return
    
    try {
      const { ProgressCalculationManager, LearningPatternAnalyzer } = await import('@/lib/user-service/progress-calculation')
      
      // Analyze learning patterns to determine prefetch strategy
      const learningPattern = LearningPatternAnalyzer.analyzeLearningPattern(
        userId,
        state.summary,
        state.skillMasteries,
        state.weeklyProgress
      )
      
      const calculator = new ProgressCalculationManager()
      const strategies = calculator.generatePrefetchStrategies(learningPattern, state.summary)
      
      // Execute high-priority prefetch strategies
      const highPriorityStrategies = strategies.filter(s => s.priority === 'high')
      
      for (const strategy of highPriorityStrategies) {
        if (strategy.triggerConditions.includes(trigger)) {
          console.log('Executing prefetch strategy:', strategy)
          
          // Prefetch data for preferred topics
          if (strategy.topics.length > 0) {
            for (const topic of strategy.topics) {
              // Trigger prefetch for topic-specific data
              queryClient.prefetchQuery({
                queryKey: queryKeys.skillMastery(userId, topic),
                queryFn: () => userServiceClient.getSkillMastery(userId, topic),
                staleTime: strategy.cacheTime,
              })
            }
          }
          
          // Prefetch general progress data
          if (strategy.dataTypes.includes('summary')) {
            queryClient.prefetchQuery({
              queryKey: queryKeys.progressSummary(userId),
              queryFn: () => userServiceClient.getProgressSummary(userId),
              staleTime: strategy.cacheTime,
            })
          }
        }
      }
    } catch (error) {
      console.warn('Failed to execute prefetch strategies:', error)
    }
  }, [userId, state.summary, state.skillMasteries, state.weeklyProgress, queryClient])
  
  const generateLearningRecommendations = useCallback(async () => {
    if (!userId || !state.summary || state.skillMasteries.size === 0) return []
    
    try {
      const { ProgressCalculationManager, LearningPatternAnalyzer } = await import('@/lib/user-service/progress-calculation')
      
      // Analyze learning patterns
      const learningPattern = LearningPatternAnalyzer.analyzeLearningPattern(
        userId,
        state.summary,
        state.skillMasteries,
        state.weeklyProgress
      )
      
      // Generate predictions with recommendations
      const calculator = new ProgressCalculationManager()
      const predictions = calculator.generateProgressPredictions(
        state.skillMasteries,
        state.weeklyProgress,
        learningPattern
      )
      
      // Extract and prioritize recommendations
      const allRecommendations = predictions
        .flatMap(p => p.recommendations)
        .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
        .slice(0, 10) // Top 10 recommendations
      
      return allRecommendations
    } catch (error) {
      console.warn('Failed to generate learning recommendations:', error)
      return []
    }
  }, [userId, state.summary, state.skillMasteries, state.weeklyProgress])

  // Auto-subscribe when user is available and authenticated
  useEffect(() => {
    if (userId && isAuthenticated) {
      subscribeToProgressUpdates()
      
      // Task 6.4: Trigger prefetching on user login
      prefetchProgressData('user_login').catch(console.warn)
    } else {
      unsubscribeFromProgressUpdates()
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribeFromProgressUpdates()
    }
  }, [userId, isAuthenticated, subscribeToProgressUpdates, unsubscribeFromProgressUpdates, prefetchProgressData])
  
  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const clearError = useCallback((errorType?: keyof Pick<ProgressState, 'error' | 'summaryError' | 'masteryError' | 'streakError' | 'milestonesError'>) => {
    if (errorType) {
      dispatch({ type: 'CLEAR_ERROR', payload: { errorType } })
    } else {
      dispatch({ type: 'CLEAR_ERROR' })
    }
  }, [])
  
  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' })
  }, [])
  
  const getSkillMastery = useCallback((topic: string): SkillMastery | null => {
    return state.skillMasteries.get(topic) || null
  }, [state.skillMasteries])
  
  const getOverallProgress = useCallback((): number => {
    return state.summary?.overallMastery || 0
  }, [state.summary])
  
  const getTopicProgress = useCallback((topic: string): number => {
    const mastery = state.skillMasteries.get(topic)
    return mastery ? mastery.mastery : 0
  }, [state.skillMasteries])
  
  const isTopicMastered = useCallback((topic: string, threshold: number = 0.8): boolean => {
    const mastery = state.skillMasteries.get(topic)
    return mastery ? mastery.mastery >= threshold : false
  }, [state.skillMasteries])
  
  // ============================================================================
  // Context Value
  // ============================================================================
  
  const contextValue: ProgressContextValue = {
    // State
    state,
    
    // Computed properties
    summary: state.summary || (progressSummaryQuery.data as ProgressSummary) || null,
    skillMasteries: state.skillMasteries,
    learningStreak: state.learningStreak || (learningStreakQuery.data as LearningStreak) || null,
    milestones: state.milestones.length ? state.milestones : (milestonesQuery.data as Milestone[]) || [],
    weeklyProgress: state.weeklyProgress,
    isLoading: state.isLoading || progressSummaryQuery.isLoading || skillMasteryQuery.isLoading || learningStreakQuery.isLoading || milestonesQuery.isLoading,
    isUpdating: state.isUpdating || progressUpdateMutation.isPending,
    error: state.error || state.summaryError || state.masteryError || state.streakError || state.milestonesError,
    
    // Progress operations
    fetchProgressSummary,
    updateProgress,
    recalculateAllMasteries,
    
    // Streak operations
    updateLearningStreak,
    getStreakHistory,
    
    // Milestone operations
    checkMilestoneAchievements,
    getMilestoneProgress,
    
    // Analytics
    getProgressTrends,
    getTopicComparison,
    getPeerComparison,
    
    // Visualization data
    getProgressChartData,
    getMasteryHeatmapData,
    
    // Real-time updates
    subscribeToProgressUpdates,
    unsubscribeFromProgressUpdates,
    
    // Progress calculation and optimization (Task 6.4)
    generateProgressPredictions,
    generateOptimizedSummary,
    prefetchProgressData,
    generateLearningRecommendations,
    
    // Utility functions
    clearError,
    clearAllErrors,
    getSkillMastery,
    getOverallProgress,
    getTopicProgress,
    isTopicMastered,
  }
  
  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext)
  
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  
  return context
}