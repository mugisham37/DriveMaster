import { describe, it, expect, beforeEach } from 'vitest'
import { SpacedRepetition, scheduleNext } from '../spaced.js'
import type {
  EnhancedSRParams,
  ReviewResult,
  ScheduleContext,
  OptimalReviewTime,
} from '../../types/spaced.types.js'

describe('SpacedRepetition', () => {
  let defaultParams: EnhancedSRParams
  let defaultContext: ScheduleContext

  beforeEach(() => {
    defaultParams = {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      forgettingCurve: 0.5,
      interference: {},
      personalizedDecay: 1.0,
      reviewBurden: 0.5,
    }

    defaultContext = {
      userId: 'test-user',
      conceptKey: 'traffic-signs',
      currentTime: new Date('2024-01-01T10:00:00Z'),
    }
  })

  describe('updateSpacedRepetition', () => {
    it('should increase interval for correct responses', () => {
      const result: ReviewResult = {
        quality: 4,
        responseTime: 3000,
      }

      const updated = SpacedRepetition.updateSpacedRepetition(defaultParams, result, defaultContext)

      expect(updated.newParams.repetitions).toBe(1)
      expect(updated.newParams.interval).toBe(1)
      expect(updated.newParams.easeFactor).toBeGreaterThanOrEqual(defaultParams.easeFactor)
    })

    it('should reset interval for poor responses', () => {
      const params = { ...defaultParams, repetitions: 3, interval: 10 }
      const result: ReviewResult = {
        quality: 2, // Below threshold
        responseTime: 5000,
      }

      const updated = SpacedRepetition.updateSpacedRepetition(params, result, defaultContext)

      expect(updated.newParams.repetitions).toBe(0)
      expect(updated.newParams.interval).toBe(1)
      expect(updated.newParams.easeFactor).toBeLessThan(params.easeFactor)
    })

    it('should apply SuperMemo 2 algorithm correctly', () => {
      let params = { ...defaultParams }
      const context = { ...defaultContext }

      // First review (quality 4)
      let result: ReviewResult = { quality: 4, responseTime: 3000 }
      let updated = SpacedRepetition.updateSpacedRepetition(params, result, context)

      expect(updated.newParams.repetitions).toBe(1)
      expect(updated.newParams.interval).toBe(1)

      // Second review (quality 4)
      params = updated.newParams
      updated = SpacedRepetition.updateSpacedRepetition(params, result, context)

      expect(updated.newParams.repetitions).toBe(2)
      expect(updated.newParams.interval).toBe(6)

      // Third review (quality 4)
      params = updated.newParams
      updated = SpacedRepetition.updateSpacedRepetition(params, result, context)

      expect(updated.newParams.repetitions).toBe(3)
      expect(updated.newParams.interval).toBeGreaterThan(6)
    })

    it('should apply personalized forgetting curve', () => {
      const params = { ...defaultParams, forgettingCurve: 0.8, personalizedDecay: 1.2 }
      const result: ReviewResult = { quality: 4, responseTime: 3000 }

      const updated = SpacedRepetition.updateSpacedRepetition(params, result, defaultContext)

      // Higher forgetting curve should reduce interval
      expect(updated.newParams.interval).toBeLessThan(6)
    })

    it('should adjust for response time', () => {
      const params = { ...defaultParams, repetitions: 2, interval: 6 } // Start with longer interval
      const fastResult: ReviewResult = { quality: 4, responseTime: 5000, difficulty: 0.5 } // Very fast
      const slowResult: ReviewResult = { quality: 4, responseTime: 120000, difficulty: 0.5 } // Very slow

      const fastUpdate = SpacedRepetition.updateSpacedRepetition(params, fastResult, defaultContext)
      const slowUpdate = SpacedRepetition.updateSpacedRepetition(params, slowResult, defaultContext)

      // Fast response should get longer interval
      expect(fastUpdate.newParams.interval).toBeGreaterThan(slowUpdate.newParams.interval)
    })

    it('should adjust for confidence level', () => {
      const params = { ...defaultParams, repetitions: 2, interval: 6 } // Start with longer interval
      const highConfidence: ReviewResult = { quality: 4, responseTime: 3000, confidence: 5 }
      const lowConfidence: ReviewResult = { quality: 4, responseTime: 3000, confidence: 1 }

      const highUpdate = SpacedRepetition.updateSpacedRepetition(
        params,
        highConfidence,
        defaultContext,
      )
      const lowUpdate = SpacedRepetition.updateSpacedRepetition(
        params,
        lowConfidence,
        defaultContext,
      )

      // High confidence should get longer interval
      expect(highUpdate.newParams.interval).toBeGreaterThan(lowUpdate.newParams.interval)
    })
  })

  describe('calculatePersonalizedForgetting', () => {
    it('should return default rate for insufficient data', () => {
      const reviewHistory: ReviewResult[] = [
        { quality: 4, responseTime: 3000 },
        { quality: 3, responseTime: 4000 },
      ]

      const forgettingRate = SpacedRepetition.calculatePersonalizedForgetting(
        'user1',
        'concept1',
        reviewHistory,
      )

      expect(forgettingRate).toBe(0.5)
    })

    it('should calculate forgetting rate from review history', () => {
      const reviewHistory: ReviewResult[] = [
        { quality: 5, responseTime: 2000 },
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3500 },
        { quality: 3, responseTime: 4000 },
        { quality: 2, responseTime: 5000 },
      ]

      const forgettingRate = SpacedRepetition.calculatePersonalizedForgetting(
        'user1',
        'concept1',
        reviewHistory,
      )

      expect(forgettingRate).toBeGreaterThan(0.1)
      expect(forgettingRate).toBeLessThan(0.9)
    })

    it('should handle consistent performance', () => {
      const consistentHistory: ReviewResult[] = [
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3000 },
      ]

      const forgettingRate = SpacedRepetition.calculatePersonalizedForgetting(
        'user1',
        'concept1',
        consistentHistory,
      )

      expect(forgettingRate).toBeLessThan(0.5) // Good retention = low forgetting
    })
  })

  describe('calculateInterference', () => {
    it('should return zero for no similar concepts', () => {
      const interference = SpacedRepetition.calculateInterference('concept1', [], new Map())

      expect(interference).toBe(0)
    })

    it('should calculate interference from similar concepts', () => {
      const conceptMasteries = new Map([
        ['similar1', 0.8],
        ['similar2', 0.6],
        ['unrelated', 0.2],
      ])

      const interference = SpacedRepetition.calculateInterference(
        'concept1',
        ['similar1', 'similar2'],
        conceptMasteries,
      )

      expect(interference).toBeGreaterThan(0)
      expect(interference).toBeLessThan(1)
    })

    it('should ignore low mastery concepts', () => {
      const conceptMasteries = new Map([
        ['similar1', 0.2], // Below threshold
        ['similar2', 0.1], // Below threshold
      ])

      const interference = SpacedRepetition.calculateInterference(
        'concept1',
        ['similar1', 'similar2'],
        conceptMasteries,
      )

      expect(interference).toBe(0)
    })
  })

  describe('findOptimalReviewTime', () => {
    it('should return base time when no availability provided', () => {
      const params = { ...defaultParams, interval: 7 }

      const optimal = SpacedRepetition.findOptimalReviewTime(params, defaultContext)

      expect(optimal.nextReview).toBeInstanceOf(Date)
      expect(optimal.probability).toBe(0.8)
      expect(optimal.confidence).toBeGreaterThan(0)
    })

    it('should adjust for user availability preferences', () => {
      const params = { ...defaultParams, interval: 1 }
      const availability = {
        preferredTimes: ['09:00', '14:00'],
        avoidTimes: ['22:00'],
      }

      const optimal = SpacedRepetition.findOptimalReviewTime(params, defaultContext, availability)

      expect(optimal.nextReview).toBeInstanceOf(Date)
      expect(optimal.probability).toBeGreaterThan(0.8)
    })

    it('should move away from avoid times', () => {
      const lateContext = {
        ...defaultContext,
        currentTime: new Date('2024-01-01T22:00:00Z'), // 10 PM
      }
      const params = { ...defaultParams, interval: 1 }
      const availability = {
        preferredTimes: ['09:00'],
        avoidTimes: ['22:00'],
      }

      const optimal = SpacedRepetition.findOptimalReviewTime(params, lateContext, availability)

      const reviewHour = optimal.nextReview.getHours()
      expect(reviewHour).not.toBe(22)
    })
  })

  describe('balanceReviewLoad', () => {
    it('should not change schedule when under limit', () => {
      const scheduledReviews = new Map([
        ['item1', new Date('2024-01-01T10:00:00Z')],
        ['item2', new Date('2024-01-01T11:00:00Z')],
        ['item3', new Date('2024-01-02T10:00:00Z')],
      ])

      const balanced = SpacedRepetition.balanceReviewLoad(scheduledReviews, 50)

      expect(balanced.size).toBe(3)
      expect(balanced.get('item1')).toEqual(scheduledReviews.get('item1'))
    })

    it('should redistribute when over daily limit', () => {
      const baseDate = new Date('2024-01-01T10:00:00Z')
      const scheduledReviews = new Map()

      // Create 60 items for same day (over limit of 50)
      for (let i = 0; i < 60; i++) {
        scheduledReviews.set(`item${i}`, new Date(baseDate))
      }

      const balanced = SpacedRepetition.balanceReviewLoad(scheduledReviews, 50)

      expect(balanced.size).toBe(60)

      // Count items per day
      const itemsByDate = new Map<string, number>()
      for (const [_, date] of balanced) {
        const dateKey = date.toISOString().split('T')[0]
        itemsByDate.set(dateKey, (itemsByDate.get(dateKey) || 0) + 1)
      }

      // First day should have exactly 50 items
      expect(itemsByDate.get('2024-01-01')).toBe(50)

      // Remaining 10 should be on subsequent days
      const totalItems = Array.from(itemsByDate.values()).reduce((sum, count) => sum + count, 0)
      expect(totalItems).toBe(60)
    })
  })

  describe('getDueItems', () => {
    it('should return items due for review', () => {
      const currentTime = new Date('2024-01-01T10:00:00Z')
      const scheduledReviews = new Map([
        [
          'item1',
          {
            date: new Date('2024-01-01T09:00:00Z'), // Past due
            params: defaultParams,
          },
        ],
        [
          'item2',
          {
            date: new Date('2024-01-01T11:00:00Z'), // Due within lookahead
            params: defaultParams,
          },
        ],
        [
          'item3',
          {
            date: new Date('2024-01-02T12:00:00Z'), // Not due (26 hours later)
            params: defaultParams,
          },
        ],
      ])

      const dueItems = SpacedRepetition.getDueItems(scheduledReviews, currentTime, 24)

      expect(dueItems).toHaveLength(2)
      expect(dueItems[0].itemId).toBe('item1') // Most urgent first
      expect(dueItems[0].urgency).toBeGreaterThan(dueItems[1].urgency)
    })

    it('should calculate urgency correctly', () => {
      const currentTime = new Date('2024-01-01T10:00:00Z')
      const overdueDate = new Date('2023-12-31T10:00:00Z') // 1 day overdue
      const scheduledReviews = new Map([
        [
          'overdue',
          {
            date: overdueDate,
            params: { ...defaultParams, reviewBurden: 0.8 },
          },
        ],
      ])

      const dueItems = SpacedRepetition.getDueItems(scheduledReviews, currentTime, 24)

      expect(dueItems).toHaveLength(1)
      expect(dueItems[0].urgency).toBeGreaterThan(0.8) // High urgency for overdue + high burden
    })
  })

  describe('predictRetention', () => {
    it('should predict retention probability', () => {
      const params = { ...defaultParams, forgettingCurve: 0.3, easeFactor: 2.0 }

      const retention1Day = SpacedRepetition.predictRetention(params, 1, 4)
      const retention7Days = SpacedRepetition.predictRetention(params, 7, 4)
      const retention30Days = SpacedRepetition.predictRetention(params, 30, 4)

      expect(retention1Day).toBeGreaterThan(retention7Days)
      expect(retention7Days).toBeGreaterThan(retention30Days)
      expect(retention30Days).toBeGreaterThanOrEqual(0.05)
      expect(retention1Day).toBeLessThan(0.95)
    })

    it('should adjust for last performance quality', () => {
      const params = { ...defaultParams, forgettingCurve: 0.5 }

      const highQualityRetention = SpacedRepetition.predictRetention(params, 7, 5)
      const lowQualityRetention = SpacedRepetition.predictRetention(params, 7, 2)

      expect(highQualityRetention).toBeGreaterThan(lowQualityRetention)
    })
  })

  describe('calculateResponseTimeFactor', () => {
    it('should reward fast responses', () => {
      const fastFactor = SpacedRepetition.calculateResponseTimeFactor(15000, 0.5) // 15s for medium difficulty
      const normalFactor = SpacedRepetition.calculateResponseTimeFactor(60000, 0.5) // 60s for medium difficulty
      const slowFactor = SpacedRepetition.calculateResponseTimeFactor(120000, 0.5) // 120s for medium difficulty

      expect(fastFactor).toBeGreaterThan(normalFactor)
      expect(normalFactor).toBeGreaterThan(slowFactor)
      expect(fastFactor).toBeLessThanOrEqual(1.2)
      expect(slowFactor).toBeGreaterThanOrEqual(0.8)
    })

    it('should adjust expectations based on difficulty', () => {
      const easyFactor = SpacedRepetition.calculateResponseTimeFactor(60000, 0.2) // 60s for easy
      const hardFactor = SpacedRepetition.calculateResponseTimeFactor(60000, 0.8) // 60s for hard

      expect(easyFactor).toBeLessThan(hardFactor) // Same time, but easy should be penalized more
    })
  })

  describe('calculateScheduleConfidence', () => {
    it('should increase confidence with better performance', () => {
      const lowConfidence = SpacedRepetition.calculateScheduleConfidence(2, 1, 1.5, 0.8)
      const highConfidence = SpacedRepetition.calculateScheduleConfidence(5, 10, 2.5, 0.2)

      expect(highConfidence).toBeGreaterThan(lowConfidence)
      expect(highConfidence).toBeLessThanOrEqual(1.0)
      expect(lowConfidence).toBeGreaterThanOrEqual(0.0)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle extreme ease factors', () => {
      const extremeParams = {
        ...defaultParams,
        easeFactor: 1.2, // Just below minimum
      }
      const result: ReviewResult = { quality: 5, responseTime: 1000 }

      const updated = SpacedRepetition.updateSpacedRepetition(extremeParams, result, defaultContext)

      expect(updated.newParams.easeFactor).toBeGreaterThanOrEqual(SpacedRepetition.MIN_EASE_FACTOR)
      expect(updated.newParams.easeFactor).toBeLessThanOrEqual(SpacedRepetition.MAX_EASE_FACTOR)
    })

    it('should handle zero or negative intervals', () => {
      const params = { ...defaultParams, interval: -5 }
      const result: ReviewResult = { quality: 4, responseTime: 3000 }

      const updated = SpacedRepetition.updateSpacedRepetition(params, result, defaultContext)

      expect(updated.newParams.interval).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty preferred times', () => {
      const params = { ...defaultParams, interval: 1 }
      const availability = {
        preferredTimes: [],
        avoidTimes: ['22:00'],
      }

      const optimal = SpacedRepetition.findOptimalReviewTime(params, defaultContext, availability)

      expect(optimal.nextReview).toBeInstanceOf(Date)
      expect(optimal.probability).toBeGreaterThan(0)
    })
  })

  describe('Integration tests', () => {
    it('should maintain consistent behavior across multiple updates', () => {
      let params = { ...defaultParams }
      const results: ReviewResult[] = [
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 2500 },
        { quality: 5, responseTime: 2000 },
        { quality: 3, responseTime: 4000 },
        { quality: 4, responseTime: 3000 },
      ]

      let totalInterval = 0
      for (const result of results) {
        const updated = SpacedRepetition.updateSpacedRepetition(params, result, defaultContext)
        params = updated.newParams
        totalInterval += params.interval
      }

      expect(params.repetitions).toBeGreaterThan(0)
      expect(params.easeFactor).toBeGreaterThan(0)
      expect(totalInterval).toBeGreaterThan(0)
    })

    it('should handle learning progression realistically', () => {
      let params = { ...defaultParams }
      const context = { ...defaultContext }

      // Simulate learning progression: poor -> good -> excellent
      const learningProgression = [
        { quality: 2, responseTime: 8000 }, // Initial struggle
        { quality: 3, responseTime: 6000 }, // Slight improvement
        { quality: 4, responseTime: 4000 }, // Good performance
        { quality: 4, responseTime: 3000 }, // Consistent
        { quality: 5, responseTime: 2000 }, // Mastery
      ]

      const intervals: number[] = []
      for (const result of learningProgression) {
        const updated = SpacedRepetition.updateSpacedRepetition(params, result, context)
        params = updated.newParams
        intervals.push(params.interval)
      }

      // Should show general upward trend in intervals (with possible reset after first poor performance)
      const lastThreeIntervals = intervals.slice(-3)
      expect(lastThreeIntervals[2]).toBeGreaterThan(lastThreeIntervals[0])
    })
  })

  describe('Performance tests', () => {
    it('should handle large numbers of items efficiently', () => {
      const startTime = Date.now()
      const scheduledReviews = new Map<string, Date>()

      // Create 10,000 items
      for (let i = 0; i < 10000; i++) {
        const randomDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        scheduledReviews.set(`item${i}`, randomDate)
      }

      const balanced = SpacedRepetition.balanceReviewLoad(scheduledReviews, 100)
      const endTime = Date.now()

      expect(balanced.size).toBe(10000)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})

describe('scheduleNext (legacy function)', () => {
  it('should return a future date', () => {
    const nextReview = scheduleNext(4, true)
    expect(nextReview).toBeInstanceOf(Date)
    expect(nextReview.getTime()).toBeGreaterThan(Date.now())
  })

  it('should handle different quality levels', () => {
    const highQuality = scheduleNext(5, true)
    const lowQuality = scheduleNext(2, false)

    expect(highQuality).toBeInstanceOf(Date)
    expect(lowQuality).toBeInstanceOf(Date)
  })
})
