// cSpell:ignore dropoff
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentAnalyticsService } from '../services/content-analytics.service.js'
import { db, items, concepts, categories, contentAnalytics } from '../db/connection.js'

// Mock the database
vi.mock('../db/connection.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    query: {
      items: {
        findFirst: vi.fn(),
      },
    },
  },
  items: {
    id: 'id',
    isActive: 'isActive',
    conceptId: 'conceptId',
  },
  concepts: {
    id: 'id',
    categoryId: 'categoryId',
  },
  categories: {
    id: 'id',
  },
  contentAnalytics: {
    entityType: 'entityType',
    entityId: 'entityId',
    period: 'period',
    periodStart: 'periodStart',
    periodEnd: 'periodEnd',
    totalViews: 'totalViews',
    totalAttempts: 'totalAttempts',
    successfulAttempts: 'successfulAttempts',
    avgResponseTime: 'avgResponseTime',
    avgConfidence: 'avgConfidence',
    engagementScore: 'engagementScore',
    dropoffRate: 'dropoffRate',
    knowledgeGain: 'knowledgeGain',
    retentionRate: 'retentionRate',
    difficultyRating: 'difficultyRating',
  },
}))

describe('ContentAnalyticsService', () => {
  let service: ContentAnalyticsService
  const mockDb = db as any

  beforeEach(() => {
    service = new ContentAnalyticsService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('trackUserInteraction', () => {
    it('should track user interaction and update analytics', async () => {
      const interaction = {
        userId: 'user-123',
        itemId: 'item-456',
        conceptId: 'concept-789',
        eventType: 'attempt' as const,
        isCorrect: true,
        responseTime: 30000,
        confidence: 4,
        hintsUsed: 1,
        attemptsCount: 1,
        engagementScore: 0.8,
        deviceType: 'mobile',
        sessionId: 'session-123',
        timestamp: new Date(),
        metadata: { source: 'test' },
      }

      // Mock database operations
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      await service.trackUserInteraction(interaction)

      expect(mockDb.insert).toHaveBeenCalledWith(contentAnalytics)
    })

    it('should calculate engagement score when not provided', async () => {
      const interaction = {
        userId: 'user-123',
        itemId: 'item-456',
        conceptId: 'concept-789',
        eventType: 'complete' as const,
        isCorrect: true,
        responseTime: 25000,
        confidence: 5,
        timestamp: new Date(),
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      await service.trackUserInteraction(interaction)

      // Verify that engagement score was calculated (complete + correct + high confidence + fast response)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('getContentEffectiveness', () => {
    it('should return content effectiveness metrics', async () => {
      const itemId = 'item-123'
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      }

      const mockAnalyticsData = [
        {
          totalViews: 100,
          totalAttempts: 80,
          successfulAttempts: 60,
          avgResponseTime: 45000,
          avgConfidence: 3.5,
          avgEngagement: 0.7,
          avgDropoff: 0.2,
          avgKnowledgeGain: 0.3,
          avgRetention: 0.8,
          avgDifficulty: 0.6,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAnalyticsData),
        }),
      })

      const result = await service.getContentEffectiveness(itemId, timeRange)

      expect(result).toEqual({
        itemId,
        totalViews: 100,
        totalAttempts: 80,
        successRate: 0.75, // 60/80
        avgResponseTime: 45000,
        avgConfidence: 3.5,
        engagementScore: 0.7,
        dropoffRate: 0.2,
        knowledgeGain: 0.3,
        retentionRate: 0.8,
        difficultyRating: 0.6,
        qualityScore: expect.any(Number),
      })
    })

    it('should handle zero attempts gracefully', async () => {
      const itemId = 'item-123'
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      }

      const mockAnalyticsData = [
        {
          totalViews: 10,
          totalAttempts: 0,
          successfulAttempts: 0,
          avgResponseTime: 0,
          avgConfidence: 0,
          avgEngagement: 0,
          avgDropoff: 0,
          avgKnowledgeGain: 0,
          avgRetention: 0,
          avgDifficulty: 0,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAnalyticsData),
        }),
      })

      const result = await service.getContentEffectiveness(itemId, timeRange)

      expect(result.successRate).toBe(0)
      expect(result.qualityScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generateContentRecommendations', () => {
    it('should generate recommendations for underperforming content', async () => {
      const conceptId = 'concept-123'

      // Mock items query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'item-1',
                title: 'Test Item 1',
                difficulty: 0.5,
                conceptId,
              },
            ]),
          }),
        }),
      })

      // Mock effectiveness data (poor performance)
      const mockEffectiveness = {
        itemId: 'item-1',
        totalViews: 100,
        totalAttempts: 50,
        successRate: 0.2, // Very low success rate
        avgResponseTime: 90000, // Very high response time
        avgConfidence: 2.0,
        engagementScore: 0.3, // Low engagement
        dropoffRate: 0.6, // High dropoff
        knowledgeGain: 0.1,
        retentionRate: 0.4,
        difficultyRating: 0.8,
        qualityScore: 0.3,
      }

      // Mock the getContentEffectiveness method
      vi.spyOn(service, 'getContentEffectiveness').mockResolvedValue(mockEffectiveness)

      const recommendations = await service.generateContentRecommendations(conceptId, undefined, 10)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0]).toMatchObject({
        itemId: 'item-1',
        recommendationType: expect.stringMatching(/retire|improve/),
        priority: 'high',
        reason: expect.any(String),
        suggestedActions: expect.any(Array),
        expectedImpact: expect.any(Number),
        confidence: expect.any(Number),
      })
    })

    it('should recommend promoting high-performing content', async () => {
      const conceptId = 'concept-123'

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'item-2',
                title: 'Test Item 2',
                difficulty: 0.6,
                conceptId,
              },
            ]),
          }),
        }),
      })

      // Mock effectiveness data (excellent performance)
      const mockEffectiveness = {
        itemId: 'item-2',
        totalViews: 200,
        totalAttempts: 150,
        successRate: 0.85, // High success rate
        avgResponseTime: 25000, // Fast response time
        avgConfidence: 4.2,
        engagementScore: 0.8, // High engagement
        dropoffRate: 0.1, // Low dropoff
        knowledgeGain: 0.4,
        retentionRate: 0.9,
        difficultyRating: 0.6,
        qualityScore: 0.85,
      }

      vi.spyOn(service, 'getContentEffectiveness').mockResolvedValue(mockEffectiveness)

      const recommendations = await service.generateContentRecommendations(conceptId, undefined, 10)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0]).toMatchObject({
        itemId: 'item-2',
        recommendationType: 'promote',
        priority: 'medium',
        reason: expect.stringContaining('High performance'),
        suggestedActions: expect.arrayContaining([expect.stringContaining('template')]),
      })
    })
  })

  describe('assessContentQuality', () => {
    it('should assess content quality and identify issues', async () => {
      const itemId = 'item-123'

      // Mock item query
      mockDb.query.items.findFirst.mockResolvedValue({
        id: itemId,
        title: 'Test Item',
        body: 'Test content',
        concept: {
          id: 'concept-1',
          category: {
            id: 'category-1',
          },
        },
      })

      // Mock effectiveness data with issues
      const mockEffectiveness = {
        itemId,
        totalViews: 100,
        totalAttempts: 80,
        successRate: 0.25, // Low success rate - difficulty issue
        avgResponseTime: 75000, // High response time - clarity issue
        avgConfidence: 2.5,
        engagementScore: 0.35, // Low engagement
        dropoffRate: 0.4, // High dropoff
        knowledgeGain: 0.2,
        retentionRate: 0.6,
        difficultyRating: 0.7,
        qualityScore: 0.4,
      }

      vi.spyOn(service, 'getContentEffectiveness').mockResolvedValue(mockEffectiveness)

      const assessment = await service.assessContentQuality(itemId)

      expect(assessment).toMatchObject({
        itemId,
        qualityScore: expect.any(Number),
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'difficulty',
            severity: 'high',
            description: expect.stringContaining('low success rate'),
          }),
          expect.objectContaining({
            type: 'clarity',
            severity: 'high',
            description: expect.stringContaining('response time'),
          }),
        ]),
        recommendations: expect.any(Array),
        lastAssessed: expect.any(Date),
      })
    })

    it('should throw error for non-existent item', async () => {
      const itemId = 'non-existent'

      mockDb.query.items.findFirst.mockResolvedValue(null)

      await expect(service.assessContentQuality(itemId)).rejects.toThrow('Item not found')
    })
  })

  describe('getContentPerformanceTrends', () => {
    it('should return performance trends over time', async () => {
      const itemId = 'item-123'
      const period = 'daily'
      const days = 7

      const mockTrends = [
        {
          periodStart: new Date('2024-01-01'),
          totalAttempts: 10,
          successfulAttempts: 8,
          engagementScore: 0.7,
          avgResponseTime: 30000,
          dropoffRate: 0.1,
        },
        {
          periodStart: new Date('2024-01-02'),
          totalAttempts: 15,
          successfulAttempts: 12,
          engagementScore: 0.75,
          avgResponseTime: 28000,
          dropoffRate: 0.08,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockTrends),
          }),
        }),
      })

      const result = await service.getContentPerformanceTrends(itemId, period, days)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: expect.any(Date),
        successRate: 0.8, // 8/10
        engagementScore: 0.7,
        avgResponseTime: 30000,
        totalAttempts: 10,
        dropoffRate: 0.1,
      })
    })
  })

  describe('getTopPerformingContent', () => {
    it('should return top performing content by quality score', async () => {
      const conceptId = 'concept-123'
      const limit = 5
      const metric = 'quality_score'

      const mockPerformanceData = [
        {
          itemId: 'item-1',
          avgSuccessRate: 0.85,
          avgEngagement: 0.8,
          totalAttempts: 100,
        },
        {
          itemId: 'item-2',
          avgSuccessRate: 0.75,
          avgEngagement: 0.7,
          totalAttempts: 80,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue(mockPerformanceData),
            }),
          }),
        }),
      })

      // Mock item queries
      mockDb.query.items.findFirst
        .mockResolvedValueOnce({
          id: 'item-1',
          title: 'High Performer',
          conceptId,
          concept: { categoryId: 'category-1', category: {} },
        })
        .mockResolvedValueOnce({
          id: 'item-2',
          title: 'Good Performer',
          conceptId,
          concept: { categoryId: 'category-1', category: {} },
        })

      const result = await service.getTopPerformingContent(conceptId, undefined, limit, metric)

      expect(result).toHaveLength(2)
      expect(result[0].successRate).toBeGreaterThan(result[1].successRate)
      expect(result[0].qualityScore).toBeGreaterThan(result[1].qualityScore)
    })

    it('should filter by minimum attempts threshold', async () => {
      const mockPerformanceData = [
        {
          itemId: 'item-low-attempts',
          avgSuccessRate: 0.95,
          avgEngagement: 0.9,
          totalAttempts: 5, // Below threshold
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue(mockPerformanceData),
            }),
          }),
        }),
      })

      const result = await service.getTopPerformingContent()

      // Should be filtered out due to low attempts
      expect(result).toHaveLength(0)
    })
  })
})
