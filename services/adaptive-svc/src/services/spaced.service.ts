import { SpacedRepetition } from '../algorithms/spaced.js'
import type {
  SpacedRepetitionServiceInterface,
  ReviewResult,
  ScheduleContext,
  ReviewSchedule,
  OptimalReviewTime,
  AvailabilityPattern,
  OptimalSchedule,
  PersonalizedCurve,
  HistoricalPerformance,
  ReviewStatistics,
  SessionOptimization,
  EnhancedSRParams,
  SpacedRepetitionConfig,
} from '../types/spaced.types.js'

export class SpacedRepetitionService implements SpacedRepetitionServiceInterface {
  private config: SpacedRepetitionConfig
  private userSchedules: Map<string, Map<string, ReviewSchedule>> = new Map()
  private userParams: Map<string, Map<string, EnhancedSRParams>> = new Map()

  constructor(config?: Partial<SpacedRepetitionConfig>) {
    this.config = {
      defaultParams: {
        easeFactor: 2.5,
        forgettingCurve: 0.5,
        personalizedDecay: 1.0,
        reviewBurden: 0.5,
      },
      qualityThreshold: 3,
      masteryThreshold: 0.9,
      maxDailyReviews: 50,
      minInterval: 1,
      maxInterval: 365,
      interferenceDecayRate: 0.1,
      confidenceWeight: 0.2,
      responseTimeWeight: 0.1,
      ...config,
    }
  }

  updateReviewSchedule(
    userId: string,
    conceptId: string,
    result: ReviewResult,
    context: ScheduleContext,
  ): ReviewSchedule {
    // Get or create user parameters for this concept
    let params = this.getUserParams(userId, conceptId)

    if (!params) {
      // Initialize with default parameters
      params = {
        easeFactor: this.config.defaultParams.easeFactor,
        interval: 1,
        repetitions: 0,
        forgettingCurve: this.config.defaultParams.forgettingCurve,
        interference: {},
        personalizedDecay: this.config.defaultParams.personalizedDecay,
        reviewBurden: this.config.defaultParams.reviewBurden,
      }
    }

    // Update spaced repetition parameters
    const updated = SpacedRepetition.updateSpacedRepetition(params, result, context)

    // Store updated parameters
    this.setUserParams(userId, conceptId, updated.newParams)

    // Create review schedule
    const schedule: ReviewSchedule = {
      userId,
      conceptId,
      itemId: context.itemId ?? conceptId,
      nextReviewTime: updated.nextReview,
      priority: this.calculatePriority(result.quality, updated.newParams.reviewBurden),
      estimatedDuration: this.estimateDuration(result.responseTime, result.difficulty),
      difficulty: result.difficulty ?? 0.5,
      reviewType: this.determineReviewType(updated.newParams.repetitions, result.quality),
      params: updated.newParams,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Store schedule
    this.setUserSchedule(userId, conceptId, schedule)

    return schedule
  }

  calculateNextReview(
    userId: string,
    conceptId: string,
    performance: HistoricalPerformance[],
  ): OptimalReviewTime {
    const params = this.getUserParams(userId, conceptId)
    if (!params) {
      throw new Error(`No parameters found for user ${userId}, concept ${conceptId}`)
    }

    // Calculate personalized forgetting curve
    const reviewHistory = performance.map((p) => ({
      quality: p.quality,
      responseTime: p.responseTime,
      confidence: p.confidence ?? 3, // Default confidence
      difficulty: 0.5, // Default difficulty since HistoricalPerformance doesn't have this field
    }))

    const forgettingCurve = SpacedRepetition.calculatePersonalizedForgetting(
      userId,
      conceptId,
      reviewHistory,
    )

    // Update parameters with personalized forgetting
    const updatedParams = {
      ...params,
      forgettingCurve,
    }

    // Find optimal review time
    const context: ScheduleContext = {
      userId,
      conceptKey: conceptId,
      currentTime: new Date(),
    }

    const optimalTime = SpacedRepetition.findOptimalReviewTime(updatedParams, context)

    return optimalTime
  }

  optimizeReviewTiming(userId: string, availability: AvailabilityPattern): OptimalSchedule {
    const userSchedules = this.getUserSchedules(userId)
    const scheduledReviews = Array.from(userSchedules.values())

    // Convert to Map format expected by balanceReviewLoad
    const reviewMap = new Map<string, Date>()
    for (const schedule of scheduledReviews) {
      reviewMap.set(schedule.itemId, schedule.nextReviewTime)
    }

    // Balance the load
    const balancedMap = SpacedRepetition.balanceReviewLoad(reviewMap, this.config.maxDailyReviews)

    // Update schedules with balanced times
    const balancedSchedules: ReviewSchedule[] = []
    for (const schedule of scheduledReviews) {
      const balancedTime = balancedMap.get(schedule.itemId)
      if (balancedTime) {
        const updatedSchedule = {
          ...schedule,
          nextReviewTime: balancedTime,
          updatedAt: new Date(),
        }
        balancedSchedules.push(updatedSchedule)
        this.setUserSchedule(userId, schedule.conceptId, updatedSchedule)
      }
    }

    // Calculate optimization metrics
    const totalBurden = balancedSchedules.reduce((sum, s) => sum + s.params.reviewBurden, 0)
    const peakHours = this.calculatePeakLoadHours(balancedSchedules)
    const balanceScore = this.calculateBalanceScore(balancedSchedules)

    return {
      userId,
      scheduledReviews: balancedSchedules,
      totalDailyBurden: totalBurden,
      peakLoadHours: peakHours,
      recommendedSessionTimes: availability.preferredTimes,
      estimatedCompletionDate: this.estimateCompletionDate(balancedSchedules),
      balanceScore,
    }
  }

  calculatePersonalizedForgettingCurve(
    userId: string,
    conceptId: string,
    reviewHistory: ReviewResult[],
  ): PersonalizedCurve {
    const forgettingRate = SpacedRepetition.calculatePersonalizedForgetting(
      userId,
      conceptId,
      reviewHistory,
    )

    // Calculate retention half-life based on forgetting rate
    const retentionHalfLife = Math.log(2) / forgettingRate

    // Calculate confidence based on data points
    const confidenceLevel = Math.min(0.95, reviewHistory.length / 20)

    return {
      userId,
      conceptId,
      forgettingRate,
      retentionHalfLife,
      confidenceLevel,
      dataPoints: reviewHistory.length,
      lastCalculated: new Date(),
    }
  }

  adjustForInterference(
    userId: string,
    conceptId: string,
    similarConcepts: string[],
    conceptMasteries: Map<string, number>,
  ): number {
    return SpacedRepetition.calculateInterference(conceptId, similarConcepts, conceptMasteries)
  }

  getDueReviews(
    userId: string,
    currentTime: Date = new Date(),
    lookaheadHours: number = 24,
  ): ReviewSchedule[] {
    const userSchedules = this.getUserSchedules(userId)
    const scheduledReviews = new Map<string, { date: Date; params: EnhancedSRParams }>()

    // Convert to format expected by getDueItems
    for (const [conceptId, schedule] of userSchedules) {
      scheduledReviews.set(conceptId, {
        date: schedule.nextReviewTime,
        params: schedule.params,
      })
    }

    const dueItems = SpacedRepetition.getDueItems(scheduledReviews, currentTime, lookaheadHours)

    // Convert back to ReviewSchedule format
    const dueSchedules: ReviewSchedule[] = []
    for (const item of dueItems) {
      const schedule = userSchedules.get(item.itemId)
      if (schedule) {
        dueSchedules.push({
          ...schedule,
          priority: item.urgency,
        })
      }
    }

    return dueSchedules.sort((a, b) => b.priority - a.priority)
  }

  balanceReviewLoad(
    userId: string,
    scheduledReviews: ReviewSchedule[],
    maxDailyReviews: number = this.config.maxDailyReviews,
  ): ReviewSchedule[] {
    const reviewMap = new Map<string, Date>()
    for (const schedule of scheduledReviews) {
      reviewMap.set(schedule.itemId, schedule.nextReviewTime)
    }

    const balancedMap = SpacedRepetition.balanceReviewLoad(reviewMap, maxDailyReviews)

    return scheduledReviews.map((schedule) => ({
      ...schedule,
      nextReviewTime: balancedMap.get(schedule.itemId) ?? schedule.nextReviewTime,
      updatedAt: new Date(),
    }))
  }

  predictRetention(userId: string, conceptId: string, daysFromNow: number): number {
    const params = this.getUserParams(userId, conceptId)
    if (!params) {
      return 0.5 // Default retention probability
    }

    // Get last quality from recent performance (simplified)
    const lastQuality = 4 // Would come from actual performance data

    return SpacedRepetition.predictRetention(params, daysFromNow, lastQuality)
  }

  getReviewStatistics(userId: string, timeWindow: number = 30): ReviewStatistics {
    const userSchedules = this.getUserSchedules(userId)
    const schedules = Array.from(userSchedules.values())

    // Calculate statistics (simplified implementation)
    const totalReviews = schedules.length
    const averageQuality = 4.0 // Would calculate from actual review data
    const averageResponseTime = 30000 // Would calculate from actual data
    const retentionRate = 0.85 // Would calculate from actual data
    const masteredConcepts = schedules.filter((s) => s.params.repetitions >= 5).length

    return {
      userId,
      totalReviews,
      averageQuality,
      averageResponseTime,
      retentionRate,
      masteredConcepts,
      reviewsPerDay: totalReviews / timeWindow,
      streakDays: 7, // Would calculate from actual data
      timeSpentLearning: totalReviews * 2, // Estimated minutes
      improvementRate: 0.15, // Would calculate from trend analysis
      predictedMasteryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }
  }

  optimizeSessionLength(
    userId: string,
    currentFatigue: number,
    availableTime: number,
  ): SessionOptimization {
    // Base session length on fatigue and available time
    const baseDuration = Math.min(availableTime, 30) // Max 30 minutes
    const fatigueAdjustment = 1 - currentFatigue * 0.5
    const recommendedDuration = Math.max(5, baseDuration * fatigueAdjustment)

    // Calculate max reviews based on duration
    const avgReviewTime = 2 // minutes per review
    const maxReviews = Math.floor(recommendedDuration / avgReviewTime)

    return {
      recommendedDuration,
      maxReviews,
      difficultyDistribution: {
        easy: 0.4,
        medium: 0.4,
        hard: 0.2,
      },
      breakRecommendations: {
        frequency: 15, // Break every 15 minutes
        duration: 2, // 2-minute breaks
      },
      fatigueThreshold: 0.7,
      optimalEndTime: new Date(Date.now() + recommendedDuration * 60 * 1000),
    }
  }

  // Helper methods
  private getUserParams(userId: string, conceptId: string): EnhancedSRParams | undefined {
    const userParams = this.userParams.get(userId)
    return userParams?.get(conceptId)
  }

  private setUserParams(userId: string, conceptId: string, params: EnhancedSRParams): void {
    if (!this.userParams.has(userId)) {
      this.userParams.set(userId, new Map())
    }
    const userParamsMap = this.userParams.get(userId)
    if (userParamsMap) {
      userParamsMap.set(conceptId, params)
    }
  }

  private getUserSchedules(userId: string): Map<string, ReviewSchedule> {
    return this.userSchedules.get(userId) ?? new Map<string, ReviewSchedule>()
  }

  private setUserSchedule(userId: string, conceptId: string, schedule: ReviewSchedule): void {
    if (!this.userSchedules.has(userId)) {
      this.userSchedules.set(userId, new Map())
    }
    const userSchedulesMap = this.userSchedules.get(userId)
    if (userSchedulesMap) {
      userSchedulesMap.set(conceptId, schedule)
    }
  }

  private calculatePriority(quality: number, reviewBurden: number): number {
    // Lower quality and higher burden = higher priority
    return (1 - quality / 5) * 0.7 + reviewBurden * 0.3
  }

  private estimateDuration(responseTime: number, difficulty?: number): number {
    const baseDuration = responseTime / 1000 / 60 // Convert to minutes
    const difficultyMultiplier = difficulty !== undefined ? 1 + difficulty * 0.5 : 1
    return Math.max(1, baseDuration * difficultyMultiplier)
  }

  private determineReviewType(
    repetitions: number,
    quality: number,
  ): 'initial' | 'review' | 'mastery_check' {
    if (repetitions === 1) return 'initial' // First successful attempt
    if (repetitions >= 5 && quality >= 4) return 'mastery_check'
    return 'review'
  }

  private calculatePeakLoadHours(schedules: ReviewSchedule[]): number[] {
    const hourCounts = new Map<number, number>()

    for (const schedule of schedules) {
      const hour = schedule.nextReviewTime.getHours()
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
    }

    // Return hours with above-average load
    const avgLoad = schedules.length / 24
    return Array.from(hourCounts.entries())
      .filter(([_, count]) => count > avgLoad * 1.5)
      .map(([hour, _]) => hour)
  }

  private calculateBalanceScore(schedules: ReviewSchedule[]): number {
    if (schedules.length === 0) return 1.0

    // Calculate variance in daily review counts
    const dailyCounts = new Map<string, number>()

    for (const schedule of schedules) {
      const dateKey = schedule.nextReviewTime.toISOString().split('T')[0]
      if (dateKey !== undefined && dateKey.length > 0) {
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1)
      }
    }

    const counts = Array.from(dailyCounts.values())
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const variance =
      counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length

    // Lower variance = higher balance score
    return Math.max(0, 1 - variance / (mean * mean))
  }

  private estimateCompletionDate(schedules: ReviewSchedule[]): Date {
    if (schedules.length === 0) return new Date()

    // Find the latest review date
    const latestReview = schedules.reduce((latest, schedule) => {
      return schedule.nextReviewTime > latest ? schedule.nextReviewTime : latest
    }, new Date(0))

    // Add buffer for mastery
    return new Date(latestReview.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days buffer
  }
}
