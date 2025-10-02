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
  confidence?: number | undefined
  difficulty?: number | undefined
}

import type { UserProfile } from '../types/spaced.types'

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

/**
 * Enhanced Spaced Repetition with individual forgetting curves and interference
 */
export class SpacedRepetition {
  // SuperMemo 2 ease factor bounds
  static readonly MIN_EASE_FACTOR = 1.3
  static readonly MAX_EASE_FACTOR = 2.5
  static readonly DEFAULT_EASE_FACTOR = 2.5

  // Review quality thresholds
  static readonly QUALITY_THRESHOLD = 3 // Below this, item needs review
  static readonly PERFECT_QUALITY = 5
  static readonly GOOD_QUALITY = 4

  /**
   * Calculate personalized forgetting curve based on user history
   */
  static calculatePersonalizedForgetting(
    _userId: string,
    _conceptKey: string,
    reviewHistory: ReviewResult[],
  ): number {
    if (reviewHistory.length < 3) {
      return 0.5 // Default forgetting rate
    }

    // Analyze user's retention pattern
    let totalRetention = 0
    let validPairs = 0

    for (let i = 1; i < reviewHistory.length; i++) {
      const current = reviewHistory[i]
      const previous = reviewHistory[i - 1]

      if (!current || !previous) continue

      // Calculate retention based on quality drop
      const retention = Math.max(0, current.quality / Math.max(previous.quality, 1))
      totalRetention += retention
      validPairs++
    }

    if (validPairs === 0) return 0.5

    const avgRetention = totalRetention / validPairs

    // Convert retention to forgetting rate (higher retention = lower forgetting)
    const forgettingRate = Math.max(0.1, Math.min(0.9, 1 - avgRetention))

    return forgettingRate
  }

  /**
   * Calculate interference from similar concepts
   */
  static calculateInterference(
    conceptKey: string,
    similarConcepts: string[],
    conceptMasteries: Map<string, number>,
  ): number {
    if (similarConcepts.length === 0) return 0

    let totalInterference = 0
    let activeInterferences = 0

    for (const similar of similarConcepts) {
      if (similar === conceptKey) continue

      const mastery = conceptMasteries.get(similar) ?? 0

      // Higher mastery in similar concepts can cause interference
      if (mastery > 0.3) {
        // Interference is based on similarity strength (would need ML model in practice)
        const similarityStrength = 0.7 // Simplified assumption
        const interference = mastery * similarityStrength * 0.3
        totalInterference += interference
        activeInterferences++
      }
    }

    return activeInterferences > 0 ? totalInterference / activeInterferences : 0
  }

  /**
   * Enhanced SuperMemo 2 algorithm with personalized factors
   */
  static updateSpacedRepetition(
    params: EnhancedSRParams,
    result: ReviewResult,
    context: ScheduleContext,
  ): { newParams: EnhancedSRParams; nextReview: Date; confidence: number } {
    const { quality, responseTime, confidence, difficulty } = result
    const { easeFactor, interval, repetitions, forgettingCurve, personalizedDecay } = params

    // Update ease factor based on performance
    let newEaseFactor = easeFactor
    if (quality >= this.QUALITY_THRESHOLD) {
      // Good performance: adjust ease factor
      const adjustment = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
      newEaseFactor = easeFactor + adjustment
    } else {
      // Poor performance: reduce ease factor more aggressively
      newEaseFactor = easeFactor - 0.2
    }

    // Cap the ease factor
    newEaseFactor = Math.max(this.MIN_EASE_FACTOR, Math.min(this.MAX_EASE_FACTOR, newEaseFactor))

    // Update interval based on performance
    let newInterval: number
    let newRepetitions: number

    if (quality < this.QUALITY_THRESHOLD) {
      // Failed review: restart with short interval
      newInterval = 1
      newRepetitions = 0
    } else {
      // Successful review: increase interval
      newRepetitions = repetitions + 1

      if (newRepetitions === 1) {
        newInterval = 1
      } else if (newRepetitions === 2) {
        newInterval = 6
      } else {
        newInterval = Math.round(interval * newEaseFactor)
      }
    }

    // Apply personalized forgetting curve adjustment
    const forgettingAdjustment = 1 - forgettingCurve * personalizedDecay * 0.5 // Reduce impact
    newInterval = Math.max(1, Math.round(newInterval * forgettingAdjustment))

    // Apply response time factor
    if (responseTime !== undefined && responseTime !== null && responseTime > 0) {
      const responseTimeFactor = this.calculateResponseTimeFactor(responseTime, difficulty ?? 0.5)
      newInterval = Math.round(newInterval * responseTimeFactor)
    }

    // Apply confidence factor
    if (confidence !== undefined) {
      const confidenceFactor = this.calculateConfidenceFactor(confidence)
      newInterval = Math.round(newInterval * confidenceFactor)
    }

    // Calculate interference and adjust interval
    const interference = this.calculateInterferenceAdjustment(params.interference)
    newInterval = Math.round(newInterval * (1 - interference))

    // Ensure minimum interval
    newInterval = Math.max(1, newInterval)

    // Calculate next review date
    const nextReview = new Date(context.currentTime.getTime() + newInterval * 24 * 60 * 60 * 1000)

    // Update interference tracking
    const newInterference = { ...params.interference }
    if (context.similarConcepts) {
      for (const similar of context.similarConcepts) {
        newInterference[similar] = (newInterference[similar] ?? 0) + 0.1
      }
    }

    // Calculate confidence in the schedule
    const scheduleConfidence = this.calculateScheduleConfidence(
      quality,
      newRepetitions,
      newEaseFactor,
      forgettingCurve,
    )

    const newParams: EnhancedSRParams = {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      forgettingCurve,
      interference: newInterference,
      personalizedDecay,
      reviewBurden: this.calculateReviewBurden(newInterval, quality),
    }

    return { newParams, nextReview, confidence: scheduleConfidence }
  }

  /**
   * Calculate response time factor for interval adjustment
   */
  static calculateResponseTimeFactor(responseTime: number, difficulty: number): number {
    // Expected time based on difficulty (more difficult = more time expected)
    const expectedTime = 30000 + difficulty * 60000 // 30s to 90s

    const ratio = responseTime / expectedTime

    // Faster than expected = increase interval, slower = decrease
    if (ratio < 0.5) return 1.2 // Very fast
    if (ratio < 0.8) return 1.1 // Fast
    if (ratio < 1.2) return 1.0 // Normal
    if (ratio < 2.0) return 0.9 // Slow
    return 0.8 // Very slow
  }

  /**
   * Calculate confidence factor for interval adjustment
   */
  static calculateConfidenceFactor(confidence: number): number {
    // Map 1-5 confidence to 0.8-1.2 multiplier
    return 0.8 + (confidence - 1) * 0.1
  }

  /**
   * Calculate interference adjustment
   */
  static calculateInterferenceAdjustment(interference: Record<string, number>): number {
    const totalInterference = Object.values(interference).reduce((sum, val) => sum + val, 0)
    return Math.min(0.3, totalInterference * 0.1) // Max 30% reduction
  }

  /**
   * Calculate review burden (how much this item contributes to overall workload)
   */
  static calculateReviewBurden(interval: number, quality: number): number {
    // Items with short intervals or poor performance contribute more to burden
    const intervalBurden = Math.max(0, 1 - interval / 30) // Normalized to 30 days
    const qualityBurden = Math.max(0, (5 - quality) / 5)

    return (intervalBurden + qualityBurden) / 2
  }

  /**
   * Calculate confidence in the review schedule
   */
  static calculateScheduleConfidence(
    quality: number,
    repetitions: number,
    easeFactor: number,
    forgettingCurve: number,
  ): number {
    // Higher quality and more repetitions = higher confidence
    const qualityConfidence = quality / 5
    const repetitionConfidence = Math.min(1, repetitions / 10)
    const easeConfidence =
      (easeFactor - this.MIN_EASE_FACTOR) / (this.MAX_EASE_FACTOR - this.MIN_EASE_FACTOR)
    const forgettingConfidence = 1 - forgettingCurve

    return (qualityConfidence + repetitionConfidence + easeConfidence + forgettingConfidence) / 4
  }

  /**
   * Find optimal review time considering user availability and cognitive load
   */
  static findOptimalReviewTime(
    params: EnhancedSRParams,
    context: ScheduleContext,
    userAvailability?: { preferredTimes: string[]; avoidTimes: string[] },
  ): OptimalReviewTime {
    const baseReviewTime = new Date(
      context.currentTime.getTime() + params.interval * 24 * 60 * 60 * 1000,
    )

    if (!userAvailability) {
      return {
        nextReview: baseReviewTime,
        probability: 0.8,
        confidence: 0.7,
        burden: params.reviewBurden,
      }
    }

    // Adjust for user preferences
    const { preferredTimes, avoidTimes } = userAvailability
    const reviewHour = baseReviewTime.getHours()

    // Check if falls in preferred time
    const inPreferredTime = preferredTimes.some((time) => {
      const [hour] = time.split(':').map(Number)
      return hour !== undefined && Math.abs(reviewHour - hour) <= 2
    })

    // Check if falls in avoid time
    const inAvoidTime = avoidTimes.some((time) => {
      const [hour] = time.split(':').map(Number)
      return hour !== undefined && Math.abs(reviewHour - hour) <= 1
    })

    let adjustedTime = baseReviewTime
    let probability = 0.8

    if (inAvoidTime && !inPreferredTime) {
      // Move to nearest preferred time
      const nearestPreferred = this.findNearestPreferredTime(baseReviewTime, preferredTimes)
      if (nearestPreferred) {
        adjustedTime = nearestPreferred
        probability = 0.9
      }
    } else if (inPreferredTime) {
      probability = 0.95
    }

    return {
      nextReview: adjustedTime,
      probability,
      confidence: this.calculateScheduleConfidence(
        5,
        params.repetitions,
        params.easeFactor,
        params.forgettingCurve,
      ),
      burden: params.reviewBurden,
    }
  }

  /**
   * Find nearest preferred time slot
   */
  static findNearestPreferredTime(baseTime: Date, preferredTimes: string[]): Date | null {
    if (preferredTimes.length === 0) return null

    let nearestTime = null
    let minDistance = Infinity

    for (const timeStr of preferredTimes) {
      const [hour, minute = 0] = timeStr.split(':').map(Number)
      if (hour === undefined) continue
      const preferredDate = new Date(baseTime)
      preferredDate.setHours(
        hour,
        minute !== undefined && minute !== null && !isNaN(minute) ? minute : 0,
        0,
        0,
      )

      // If preferred time is earlier today, move to next day
      if (preferredDate <= baseTime) {
        preferredDate.setDate(preferredDate.getDate() + 1)
      }

      const distance = Math.abs(preferredDate.getTime() - baseTime.getTime())
      if (distance < minDistance) {
        minDistance = distance
        nearestTime = preferredDate
      }
    }

    return nearestTime
  }

  /**
   * Balance review load across time periods
   */
  static balanceReviewLoad(
    scheduledReviews: Map<string, Date>,
    maxDailyReviews: number = 50,
  ): Map<string, Date> {
    const reviewsByDate = new Map<string, string[]>()
    const balancedSchedule = new Map<string, Date>()

    // Group reviews by date
    for (const [itemId, reviewDate] of scheduledReviews) {
      const dateKey = reviewDate.toISOString().split('T')[0]
      if (dateKey !== undefined && dateKey !== null && dateKey.length > 0) {
        if (!reviewsByDate.has(dateKey)) {
          reviewsByDate.set(dateKey, [])
        }
        const dateItems = reviewsByDate.get(dateKey)
        if (dateItems !== undefined) {
          dateItems.push(itemId)
        }
      }
    }

    // Redistribute overloaded days
    for (const [dateKey, itemIds] of reviewsByDate) {
      if (itemIds.length <= maxDailyReviews) {
        // No redistribution needed
        for (const itemId of itemIds) {
          const originalDate = scheduledReviews.get(itemId)
          if (originalDate) {
            balancedSchedule.set(itemId, originalDate)
          }
        }
      } else {
        // Redistribute excess reviews
        const baseDate = new Date(dateKey)

        // Keep highest priority items on original date
        for (let i = 0; i < maxDailyReviews; i++) {
          const itemId = itemIds[i]
          if (itemId !== undefined && itemId !== null && itemId.length > 0) {
            const originalDate = scheduledReviews.get(itemId)
            if (originalDate) {
              balancedSchedule.set(itemId, originalDate)
            }
          }
        }

        // Redistribute excess items to following days
        for (let i = maxDailyReviews; i < itemIds.length; i++) {
          const itemId = itemIds[i]
          if (itemId !== undefined && itemId !== null && itemId.length > 0) {
            const dayOffset = Math.floor((i - maxDailyReviews) / maxDailyReviews) + 1
            const newDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
            balancedSchedule.set(itemId, newDate)
          }
        }
      }
    }

    return balancedSchedule
  }

  /**
   * Predict retention probability at future time
   */
  static predictRetention(
    params: EnhancedSRParams,
    daysFromNow: number,
    lastQuality: number,
  ): number {
    const { forgettingCurve, easeFactor } = params

    // Exponential decay model with personalization
    const baseRetention = Math.exp((-forgettingCurve * daysFromNow) / easeFactor)

    // Adjust based on last performance
    const qualityFactor = (lastQuality / 5) * 0.5 + 0.5 // 0.5 to 1.0 multiplier

    return Math.max(0.05, Math.min(0.95, baseRetention * qualityFactor))
  }

  /**
   * Get items due for review
   */
  static getDueItems(
    scheduledReviews: Map<string, { date: Date; params: EnhancedSRParams }>,
    currentTime: Date = new Date(),
    lookaheadHours: number = 24,
  ): Array<{ itemId: string; params: EnhancedSRParams; urgency: number }> {
    const dueItems: Array<{ itemId: string; params: EnhancedSRParams; urgency: number }> = []
    const cutoffTime = new Date(currentTime.getTime() + lookaheadHours * 60 * 60 * 1000)

    for (const [itemId, schedule] of scheduledReviews) {
      if (schedule.date <= cutoffTime) {
        // Calculate urgency (how overdue the item is)
        const overdueDays = Math.max(
          0,
          (currentTime.getTime() - schedule.date.getTime()) / (24 * 60 * 60 * 1000),
        )
        const urgency = Math.min(1, overdueDays / 7 + schedule.params.reviewBurden)

        dueItems.push({
          itemId,
          params: schedule.params,
          urgency,
        })
      }
    }

    // Sort by urgency (most urgent first)
    return dueItems.sort((a, b) => b.urgency - a.urgency)
  }
}

// Legacy function for backward compatibility
export function scheduleNext(quality: number, _correct: boolean): Date {
  const params: EnhancedSRParams = {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    forgettingCurve: 0.5,
    interference: {},
    personalizedDecay: 1.0,
    reviewBurden: 0.5,
  }

  const result: ReviewResult = {
    quality,
    responseTime: 30000, // Default response time
  }

  const context: ScheduleContext = {
    userId: 'default',
    conceptKey: 'default',
    currentTime: new Date(),
  }

  const updated = SpacedRepetition.updateSpacedRepetition(params, result, context)
  return updated.nextReview
}
