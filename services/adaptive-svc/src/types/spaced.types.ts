export interface SM2Params {
  easeFactor: number
  interval: number
  repetitions: number
}

export interface EnhancedSRParams extends SM2Params {
  forgettingCurve: number
  interference: Record<string, number>
  personalizedDecay: number
  reviewBurden: number
}

export interface ReviewResult {
  quality: number // 0-5 scale
  responseTime: number
  confidence?: number
  difficulty?: number
}

export interface ScheduleContext {
  userId: string
  conceptKey: string
  itemId?: string
  userProfile?: UserProfile
  similarConcepts?: string[]
  currentTime: Date
}

export interface OptimalReviewTime {
  nextReview: Date
  probability: number
  confidence: number
  burden: number
}

export interface UserProfile {
  userId: string
  learningSpeed: 'slow' | 'average' | 'fast'
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive'
  peakPerformanceHours: number[] // hours of day (0-23)
  forgettingCurveRate: number
  optimalSessionLength: number // minutes
  lastUpdated: Date
}

export interface AvailabilityPattern {
  preferredTimes: string[] // e.g., ["09:00", "14:00", "19:00"]
  avoidTimes: string[] // e.g., ["12:00", "22:00"]
  timezone: string
  weekdayPreferences?: Record<string, string[]>
  weekendPreferences?: Record<string, string[]>
}

export interface ReviewSchedule {
  userId: string
  conceptId: string
  itemId: string
  nextReviewTime: Date
  priority: number
  estimatedDuration: number
  difficulty: number
  reviewType: 'initial' | 'review' | 'mastery_check'
  params: EnhancedSRParams
  createdAt: Date
  updatedAt: Date
}

export interface PersonalizedCurve {
  userId: string
  conceptId: string
  forgettingRate: number
  retentionHalfLife: number // days
  confidenceLevel: number
  dataPoints: number
  lastCalculated: Date
}

export interface HistoricalPerformance {
  userId: string
  conceptId: string
  reviewDate: Date
  quality: number
  responseTime: number
  confidence?: number
  intervalDays: number
  wasCorrect: boolean
}

export interface OptimalSchedule {
  userId: string
  scheduledReviews: ReviewSchedule[]
  totalDailyBurden: number
  peakLoadHours: number[]
  recommendedSessionTimes: string[]
  estimatedCompletionDate: Date
  balanceScore: number // 0-1, higher is better balanced
}

export interface SpacedRepetitionConfig {
  defaultParams: {
    easeFactor: number
    forgettingCurve: number
    personalizedDecay: number
    reviewBurden: number
  }
  qualityThreshold: number
  masteryThreshold: number
  maxDailyReviews: number
  minInterval: number // days
  maxInterval: number // days
  interferenceDecayRate: number
  confidenceWeight: number
  responseTimeWeight: number
}

export interface SpacedRepetitionServiceInterface {
  // Core spaced repetition operations
  updateReviewSchedule(
    userId: string,
    conceptId: string,
    result: ReviewResult,
    context: ScheduleContext,
  ): ReviewSchedule

  calculateNextReview(
    userId: string,
    conceptId: string,
    performance: HistoricalPerformance[],
  ): OptimalReviewTime

  optimizeReviewTiming(userId: string, availability: AvailabilityPattern): OptimalSchedule

  // Personalization
  calculatePersonalizedForgettingCurve(
    userId: string,
    conceptId: string,
    reviewHistory: ReviewResult[],
  ): PersonalizedCurve

  adjustForInterference(
    userId: string,
    conceptId: string,
    similarConcepts: string[],
    conceptMasteries: Map<string, number>,
  ): number

  // Schedule management
  getDueReviews(userId: string, currentTime?: Date, lookaheadHours?: number): ReviewSchedule[]

  balanceReviewLoad(
    userId: string,
    scheduledReviews: ReviewSchedule[],
    maxDailyReviews?: number,
  ): ReviewSchedule[]

  // Analytics and insights
  predictRetention(userId: string, conceptId: string, daysFromNow: number): number

  getReviewStatistics(userId: string, timeWindow?: number): ReviewStatistics

  optimizeSessionLength(
    userId: string,
    currentFatigue: number,
    availableTime: number,
  ): SessionOptimization
}

export interface ReviewStatistics {
  userId: string
  totalReviews: number
  averageQuality: number
  averageResponseTime: number
  retentionRate: number
  masteredConcepts: number
  reviewsPerDay: number
  streakDays: number
  timeSpentLearning: number // minutes
  improvementRate: number
  predictedMasteryDate: Date
}

export interface SessionOptimization {
  recommendedDuration: number // minutes
  maxReviews: number
  difficultyDistribution: {
    easy: number
    medium: number
    hard: number
  }
  breakRecommendations: {
    frequency: number // minutes between breaks
    duration: number // minutes per break
  }
  fatigueThreshold: number
  optimalEndTime: Date
}

export interface InterferenceModel {
  conceptId: string
  similarConcepts: Array<{
    conceptId: string
    similarityScore: number
    interferenceStrength: number
  }>
  lastUpdated: Date
}

export interface ReviewBurdenAnalysis {
  userId: string
  currentBurden: number // 0-1 scale
  projectedBurden: number[] // next 7 days
  overloadRisk: number // 0-1 scale
  recommendedAdjustments: {
    reduceNewContent: boolean
    extendIntervals: boolean
    skipOptionalReviews: boolean
  }
  balanceScore: number
}
