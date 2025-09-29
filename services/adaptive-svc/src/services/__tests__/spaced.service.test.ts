import { describe, it, expect, beforeEach } from 'vitest'
import { SpacedRepetitionService } from '../spaced.service.js'
import type {
  ReviewResult,
  ScheduleContext,
  AvailabilityPattern,
  HistoricalPerformance,
  SpacedRepetitionConfig,
} from '../../types/spaced.types.js'

describe('SpacedRepetitionService', () => {
  let service: SpacedRepetitionService
  let defaultContext: ScheduleContext

  beforeEach(() => {
    const config: Partial<SpacedRepetitionConfig> = {
      maxDailyReviews: 20,
      qualityThreshold: 3,
    }
    service = new SpacedRepetitionService(config)

    defaultContext = {
      userId: 'test-user',
      conceptKey: 'traffic-signs',
      currentTime: new Date('2024-01-01T10:00:00Z'),
    }
  })

  describe('updateReviewSchedule', () => {
    it('should create initial review schedule', async () => {
      const result: ReviewResult = {
        quality: 4,
        responseTime: 3000,
        confidence: 4,
        difficulty: 0.6,
      }

      const schedule = await service.updateReviewSchedule(
        'user1',
        'concept1',
        result,
        defaultContext,
      )

      expect(schedule.userId).toBe('user1')
      expect(schedule.conceptId).toBe('concept1')
      expect(schedule.nextReviewTime).toBeInstanceOf(Date)
      expect(schedule.priority).toBeGreaterThan(0)
      expect(schedule.reviewType).toBe('initial')
      expect(schedule.params.repetitions).toBe(1)
    })

    it('should update existing review schedule', async () => {
      const userId = 'user1'
      const conceptId = 'concept1'

      // First review
      const firstResult: ReviewResult = { quality: 4, responseTime: 3000 }
      const firstSchedule = await service.updateReviewSchedule(
        userId,
        conceptId,
        firstResult,
        defaultContext,
      )

      // Second review
      const secondResult: ReviewResult = { quality: 5, responseTime: 2500 }
      const secondSchedule = await service.updateReviewSchedule(
        userId,
        conceptId,
        secondResult,
        defaultContext,
      )

      expect(secondSchedule.params.repetitions).toBe(2)
      expect(secondSchedule.params.interval).toBeGreaterThan(firstSchedule.params.interval)
      expect(secondSchedule.reviewType).toBe('review')
    })

    it('should handle poor performance correctly', async () => {
      const userId = 'user1'
      const conceptId = 'concept1'

      // Good performance first
      const goodResult: ReviewResult = { quality: 4, responseTime: 3000 }
      await service.updateReviewSchedule(userId, conceptId, goodResult, defaultContext)

      // Poor performance second
      const poorResult: ReviewResult = { quality: 2, responseTime: 8000 }
      const schedule = await service.updateReviewSchedule(
        userId,
        conceptId,
        poorResult,
        defaultContext,
      )

      expect(schedule.params.repetitions).toBe(0) // Reset
      expect(schedule.params.interval).toBe(1) // Back to 1 day
      expect(schedule.priority).toBeGreaterThan(0.5) // High priority
    })

    it('should determine mastery check for advanced learners', async () => {
      const userId = 'user1'
      const conceptId = 'concept1'

      // Simulate multiple successful reviews
      let result: ReviewResult = { quality: 4, responseTime: 3000 }
      for (let i = 0; i < 5; i++) {
        await service.updateReviewSchedule(userId, conceptId, result, defaultContext)
      }

      // Final excellent review
      const excellentResult: ReviewResult = { quality: 5, responseTime: 2000 }
      const schedule = await service.updateReviewSchedule(
        userId,
        conceptId,
        excellentResult,
        defaultContext,
      )

      expect(schedule.reviewType).toBe('mastery_check')
    })
  })

  describe('calculateNextReview', () => {
    it('should calculate optimal review time based on performance history', async () => {
      const userId = 'user1'
      const conceptId = 'concept1'

      // Create initial schedule
      const result: ReviewResult = { quality: 4, responseTime: 3000 }
      await service.updateReviewSchedule(userId, conceptId, result, defaultContext)

      const performance: HistoricalPerformance[] = [
        {
          userId,
          conceptId,
          reviewDate: new Date('2024-01-01'),
          quality: 4,
          responseTime: 3000,
          intervalDays: 1,
          wasCorrect: true,
        },
        {
          userId,
          conceptId,
          reviewDate: new Date('2024-01-02'),
          quality: 3,
          responseTime: 4000,
          intervalDays: 2,
          wasCorrect: true,
        },
      ]

      const optimalTime = await service.calculateNextReview(userId, conceptId, performance)

      expect(optimalTime.nextReview).toBeInstanceOf(Date)
      expect(optimalTime.probability).toBeGreaterThan(0)
      expect(optimalTime.confidence).toBeGreaterThan(0)
      expect(optimalTime.burden).toBeGreaterThan(0)
    })

    it('should throw error for non-existent user/concept', async () => {
      const performance: HistoricalPerformance[] = []

      await expect(
        service.calculateNextReview('nonexistent', 'concept1', performance),
      ).rejects.toThrow('No parameters found')
    })
  })

  describe('optimizeReviewTiming', () => {
    it('should optimize review schedule based on availability', async () => {
      const userId = 'user1'

      // Create multiple review schedules
      const concepts = ['concept1', 'concept2', 'concept3']
      for (const conceptId of concepts) {
        const result: ReviewResult = { quality: 4, responseTime: 3000 }
        await service.updateReviewSchedule(userId, conceptId, result, defaultContext)
      }

      const availability: AvailabilityPattern = {
        preferredTimes: ['09:00', '14:00', '19:00'],
        avoidTimes: ['12:00', '22:00'],
        timezone: 'UTC',
      }

      const optimized = await service.optimizeReviewTiming(userId, availability)

      expect(optimized.userId).toBe(userId)
      expect(optimized.scheduledReviews).toHaveLength(3)
      expect(optimized.totalDailyBurden).toBeGreaterThan(0)
      expect(optimized.balanceScore).toBeGreaterThan(0)
      expect(optimized.estimatedCompletionDate).toBeInstanceOf(Date)
    })

    it('should balance review load across days', async () => {
      const userId = 'user1'

      // Create many reviews for the same day
      for (let i = 0; i < 25; i++) {
        // More than maxDailyReviews (20)
        const result: ReviewResult = { quality: 4, responseTime: 3000 }
        await service.updateReviewSchedule(userId, `concept${i}`, result, defaultContext)
      }

      const availability: AvailabilityPattern = {
        preferredTimes: ['10:00'],
        avoidTimes: [],
        timezone: 'UTC',
      }

      const optimized = await service.optimizeReviewTiming(userId, availability)

      // Count reviews per day
      const reviewsByDate = new Map<string, number>()
      for (const schedule of optimized.scheduledReviews) {
        const dateKey = schedule.nextReviewTime.toISOString().split('T')[0]
        reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) || 0) + 1)
      }

      // No day should have more than maxDailyReviews
      for (const count of reviewsByDate.values()) {
        expect(count).toBeLessThanOrEqual(20)
      }
    })
  })

  describe('calculatePersonalizedForgettingCurve', () => {
    it('should calculate personalized forgetting curve', async () => {
      const reviewHistory: ReviewResult[] = [
        { quality: 5, responseTime: 2000 },
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3500 },
        { quality: 3, responseTime: 4000 },
      ]

      const curve = await service.calculatePersonalizedForgettingCurve(
        'user1',
        'concept1',
        reviewHistory,
      )

      expect(curve.userId).toBe('user1')
      expect(curve.conceptId).toBe('concept1')
      expect(curve.forgettingRate).toBeGreaterThan(0)
      expect(curve.forgettingRate).toBeLessThan(1)
      expect(curve.retentionHalfLife).toBeGreaterThan(0)
      expect(curve.confidenceLevel).toBeGreaterThan(0)
      expect(curve.dataPoints).toBe(4)
    })

    it('should increase confidence with more data points', async () => {
      const shortHistory: ReviewResult[] = [
        { quality: 4, responseTime: 3000 },
        { quality: 4, responseTime: 3000 },
      ]

      const longHistory: ReviewResult[] = Array(25)
        .fill(null)
        .map(() => ({
          quality: 4,
          responseTime: 3000,
        }))

      const shortCurve = await service.calculatePersonalizedForgettingCurve(
        'user1',
        'concept1',
        shortHistory,
      )
      const longCurve = await service.calculatePersonalizedForgettingCurve(
        'user1',
        'concept1',
        longHistory,
      )

      expect(longCurve.confidenceLevel).toBeGreaterThan(shortCurve.confidenceLevel)
    })
  })

  describe('getDueReviews', () => {
    it('should return reviews due within lookahead window', async () => {
      const userId = 'user1'
      const currentTime = new Date('2024-01-01T10:00:00Z')

      // Create reviews with different due times
      const concepts = [
        { id: 'overdue', dueTime: new Date('2024-01-01T08:00:00Z') },
        { id: 'due-soon', dueTime: new Date('2024-01-01T12:00:00Z') },
        { id: 'future', dueTime: new Date('2024-01-02T10:00:00Z') },
      ]

      for (const concept of concepts) {
        const result: ReviewResult = { quality: 4, responseTime: 3000 }
        const schedule = await service.updateReviewSchedule(
          userId,
          concept.id,
          result,
          defaultContext,
        )

        // Manually set the due time for testing
        schedule.nextReviewTime = concept.dueTime
      }

      const dueReviews = await service.getDueReviews(userId, currentTime, 6) // 6 hour lookahead

      expect(dueReviews).toHaveLength(2) // overdue and due-soon
      expect(dueReviews[0].priority).toBeGreaterThan(dueReviews[1].priority) // Sorted by priority
    })

    it('should handle empty schedule', async () => {
      const dueReviews = await service.getDueReviews('nonexistent-user')
      expect(dueReviews).toHaveLength(0)
    })
  })

  describe('predictRetention', () => {
    it('should predict retention probability', async () => {
      const userId = 'user1'
      const conceptId = 'concept1'

      // Create initial schedule
      const result: ReviewResult = { quality: 4, responseTime: 3000 }
      await service.updateReviewSchedule(userId, conceptId, result, defaultContext)

      const retention1Day = await service.predictRetention(userId, conceptId, 1)
      const retention7Days = await service.predictRetention(userId, conceptId, 7)
      const retention30Days = await service.predictRetention(userId, conceptId, 30)

      expect(retention1Day).toBeGreaterThan(retention7Days)
      expect(retention7Days).toBeGreaterThan(retention30Days)
      expect(retention30Days).toBeGreaterThan(0)
      expect(retention1Day).toBeLessThanOrEqual(1)
    })

    it('should return default for unknown concept', async () => {
      const retention = await service.predictRetention('user1', 'unknown', 7)
      expect(retention).toBe(0.5)
    })
  })

  describe('getReviewStatistics', () => {
    it('should calculate review statistics', async () => {
      const userId = 'user1'

      // Create multiple reviews
      for (let i = 0; i < 5; i++) {
        const result: ReviewResult = { quality: 4, responseTime: 3000 }
        await service.updateReviewSchedule(userId, `concept${i}`, result, defaultContext)
      }

      const stats = await service.getReviewStatistics(userId, 30)

      expect(stats.userId).toBe(userId)
      expect(stats.totalReviews).toBe(5)
      expect(stats.averageQuality).toBeGreaterThan(0)
      expect(stats.averageResponseTime).toBeGreaterThan(0)
      expect(stats.retentionRate).toBeGreaterThan(0)
      expect(stats.reviewsPerDay).toBeGreaterThan(0)
      expect(stats.predictedMasteryDate).toBeInstanceOf(Date)
    })
  })

  describe('optimizeSessionLength', () => {
    it('should optimize session based on fatigue and available time', async () => {
      const optimization = await service.optimizeSessionLength('user1', 0.3, 45)

      expect(optimization.recommendedDuration).toBeGreaterThan(0)
      expect(optimization.recommendedDuration).toBeLessThanOrEqual(45)
      expect(optimization.maxReviews).toBeGreaterThan(0)
      expect(optimization.difficultyDistribution.easy).toBeGreaterThan(0)
      expect(optimization.difficultyDistribution.medium).toBeGreaterThan(0)
      expect(optimization.difficultyDistribution.hard).toBeGreaterThan(0)
      expect(optimization.breakRecommendations.frequency).toBeGreaterThan(0)
      expect(optimization.optimalEndTime).toBeInstanceOf(Date)
    })

    it('should reduce session length for high fatigue', async () => {
      const lowFatigue = await service.optimizeSessionLength('user1', 0.1, 30)
      const highFatigue = await service.optimizeSessionLength('user1', 0.8, 30)

      expect(highFatigue.recommendedDuration).toBeLessThan(lowFatigue.recommendedDuration)
      expect(highFatigue.maxReviews).toBeLessThan(lowFatigue.maxReviews)
    })

    it('should respect available time limits', async () => {
      const shortTime = await service.optimizeSessionLength('user1', 0.2, 10)
      const longTime = await service.optimizeSessionLength('user1', 0.2, 60)

      expect(shortTime.recommendedDuration).toBeLessThanOrEqual(10)
      expect(longTime.recommendedDuration).toBeGreaterThan(shortTime.recommendedDuration)
    })
  })

  describe('balanceReviewLoad', () => {
    it('should balance review load across multiple days', async () => {
      const userId = 'user1'
      const baseDate = new Date('2024-01-01T10:00:00Z')

      // Create schedules all on the same day
      const schedules = Array(30)
        .fill(null)
        .map((_, i) => ({
          userId,
          conceptId: `concept${i}`,
          itemId: `item${i}`,
          nextReviewTime: new Date(baseDate),
          priority: 0.5,
          estimatedDuration: 2,
          difficulty: 0.5,
          reviewType: 'review' as const,
          params: {
            easeFactor: 2.5,
            interval: 1,
            repetitions: 1,
            forgettingCurve: 0.5,
            interference: {},
            personalizedDecay: 1.0,
            reviewBurden: 0.5,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

      const balanced = await service.balanceReviewLoad(userId, schedules, 10)

      // Count reviews per day
      const reviewsByDate = new Map<string, number>()
      for (const schedule of balanced) {
        const dateKey = schedule.nextReviewTime.toISOString().split('T')[0]
        reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) || 0) + 1)
      }

      // No day should exceed the limit
      for (const count of reviewsByDate.values()) {
        expect(count).toBeLessThanOrEqual(10)
      }

      // All reviews should still be scheduled
      expect(balanced).toHaveLength(30)
    })
  })

  describe('adjustForInterference', () => {
    it('should calculate interference between similar concepts', async () => {
      const conceptMasteries = new Map([
        ['similar1', 0.8],
        ['similar2', 0.6],
        ['unrelated', 0.2],
      ])

      const interference = await service.adjustForInterference(
        'user1',
        'concept1',
        ['similar1', 'similar2'],
        conceptMasteries,
      )

      expect(interference).toBeGreaterThan(0)
      expect(interference).toBeLessThan(1)
    })

    it('should return zero for no similar concepts', async () => {
      const interference = await service.adjustForInterference('user1', 'concept1', [], new Map())

      expect(interference).toBe(0)
    })
  })

  describe('Integration tests', () => {
    it('should handle complete learning workflow', async () => {
      const userId = 'user1'
      const conceptId = 'traffic-signs'

      // Initial learning session
      let result: ReviewResult = { quality: 3, responseTime: 5000 }
      let schedule = await service.updateReviewSchedule(userId, conceptId, result, defaultContext)
      expect(schedule.reviewType).toBe('initial')

      // Improvement over time
      const improvements = [
        { quality: 4, responseTime: 4000 },
        { quality: 4, responseTime: 3500 },
        { quality: 5, responseTime: 3000 },
        { quality: 5, responseTime: 2500 },
      ]

      for (const improvement of improvements) {
        schedule = await service.updateReviewSchedule(
          userId,
          conceptId,
          improvement,
          defaultContext,
        )
      }

      expect(schedule.params.repetitions).toBeGreaterThan(3)
      expect(schedule.params.easeFactor).toBeGreaterThanOrEqual(2.5)
      expect(schedule.reviewType).toBe('mastery_check')

      // Check due reviews
      const dueReviews = await service.getDueReviews(userId)
      expect(dueReviews.length).toBeGreaterThanOrEqual(0)

      // Get statistics
      const stats = await service.getReviewStatistics(userId)
      expect(stats.totalReviews).toBeGreaterThan(0)
      expect(stats.masteredConcepts).toBeGreaterThanOrEqual(0)
    })

    it('should handle multiple users independently', async () => {
      const users = ['user1', 'user2', 'user3']
      const conceptId = 'road-rules'

      // Each user has different performance
      for (let i = 0; i < users.length; i++) {
        const result: ReviewResult = {
          quality: 3 + i, // Different quality levels
          responseTime: 4000 - i * 500, // Different response times
        }
        await service.updateReviewSchedule(users[i], conceptId, result, defaultContext)
      }

      // Check that each user has independent schedules
      for (const userId of users) {
        const dueReviews = await service.getDueReviews(userId)
        expect(dueReviews).toHaveLength(1)
        expect(dueReviews[0].userId).toBe(userId)
      }

      // User performance should be independent
      const stats1 = await service.getReviewStatistics('user1')
      const stats2 = await service.getReviewStatistics('user2')

      expect(stats1.userId).toBe('user1')
      expect(stats2.userId).toBe('user2')
    })
  })

  describe('Error handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidResult: ReviewResult = {
        quality: -1, // Invalid quality
        responseTime: -1000, // Invalid response time
      }

      // Should not throw, but handle gracefully
      const schedule = await service.updateReviewSchedule(
        'user1',
        'concept1',
        invalidResult,
        defaultContext,
      )

      expect(schedule).toBeDefined()
      expect(schedule.nextReviewTime).toBeInstanceOf(Date)
    })

    it('should handle missing user data', async () => {
      const dueReviews = await service.getDueReviews('nonexistent-user')
      expect(dueReviews).toHaveLength(0)

      const stats = await service.getReviewStatistics('nonexistent-user')
      expect(stats.totalReviews).toBe(0)
    })
  })
})
