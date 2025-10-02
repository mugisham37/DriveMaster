// cSpell:ignore dropoff
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { ContentAnalyticsService } from '../services/content-analytics.service.js'
import { ContentRecommendationService } from '../services/content-recommendation.service.js'
import { ContentOptimizationService } from '../services/content-optimization.service.js'

// Mock the database and services
vi.mock('../db/connection.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    query: {
      items: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}))

describe('Content Analytics and Optimization Integration', () => {
  let app: any
  let analyticsService: ContentAnalyticsService
  let recommendationService: ContentRecommendationService
  let optimizationService: ContentOptimizationService

  beforeEach(async () => {
    app = Fastify({ logger: false })

    // Initialize services
    analyticsService = new ContentAnalyticsService()
    recommendationService = new ContentRecommendationService()
    optimizationService = new ContentOptimizationService()

    // Mock authentication middleware
    app.decorate('authenticate', async (request: any, reply: any) => {
      request.user = { userId: 'test-user-123', role: 'USER' }
    })

    app.decorate('requireAdmin', async (request: any, reply: any) => {
      request.user = { userId: 'admin-user-123', role: 'ADMIN' }
    })

    // Register routes (simplified versions for testing)
    app.post(
      '/analytics/track-interaction',
      {
        preHandler: [app.authenticate],
      },
      async (request: any, reply: any) => {
        const interaction = {
          userId: request.user.userId,
          itemId: request.body.itemId,
          conceptId: request.body.conceptId,
          eventType: request.body.eventType,
          isCorrect: request.body.isCorrect,
          responseTime: request.body.responseTime,
          confidence: request.body.confidence,
          timestamp: new Date(),
        }

        await analyticsService.trackUserInteraction(interaction)
        reply.send({ success: true })
      },
    )

    app.get(
      '/analytics/content/:itemId/effectiveness',
      {
        preHandler: [app.authenticate],
      },
      async (request: any, reply: any) => {
        const { itemId } = request.params
        const { days = 30 } = request.query

        const timeRange = {
          start: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          end: new Date(),
        }

        const effectiveness = await analyticsService.getContentEffectiveness(itemId, timeRange)
        reply.send(effectiveness)
      },
    )

    app.get(
      '/recommendations/personalized',
      {
        preHandler: [app.authenticate],
      },
      async (request: any, reply: any) => {
        const context = {
          userId: request.user.userId,
          currentConceptId: request.query.conceptId,
          timeAvailable: request.query.timeAvailable
            ? parseInt(request.query.timeAvailable)
            : undefined,
          deviceType: request.query.deviceType,
        }

        const recommendations = await recommendationService.getPersonalizedRecommendations(
          context,
          5,
        )
        reply.send({ recommendations })
      },
    )

    app.get(
      '/optimization/report/:itemId',
      {
        preHandler: [app.requireAdmin],
      },
      async (request: any, reply: any) => {
        const { itemId } = request.params
        const report = await optimizationService.generateOptimizationReport(itemId)
        reply.send(report)
      },
    )

    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.clearAllMocks()
  })

  describe('Complete Analytics Workflow', () => {
    it('should track user interactions and provide analytics', async () => {
      // Mock database operations for tracking
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      // Track multiple user interactions
      const interactions = [
        {
          itemId: 'item-123',
          conceptId: 'concept-456',
          eventType: 'attempt',
          isCorrect: true,
          responseTime: 30000,
          confidence: 4,
        },
        {
          itemId: 'item-123',
          conceptId: 'concept-456',
          eventType: 'attempt',
          isCorrect: false,
          responseTime: 45000,
          confidence: 2,
        },
        {
          itemId: 'item-123',
          conceptId: 'concept-456',
          eventType: 'complete',
          isCorrect: true,
          responseTime: 25000,
          confidence: 5,
        },
      ]

      // Track each interaction
      for (const interaction of interactions) {
        const response = await app.inject({
          method: 'POST',
          url: '/analytics/track-interaction',
          payload: interaction,
        })

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ success: true })
      }

      // Verify tracking was called for each interaction
      expect(db.insert).toHaveBeenCalledTimes(interactions.length)
    })

    it('should provide content effectiveness metrics', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      // Mock analytics data
      const mockAnalyticsData = [
        {
          totalViews: 100,
          totalAttempts: 80,
          successfulAttempts: 60,
          avgResponseTime: 35000,
          avgConfidence: 3.5,
          avgEngagement: 0.75,
          avgDropoff: 0.15,
          avgKnowledgeGain: 0.3,
          avgRetention: 0.8,
          avgDifficulty: 0.6,
        },
      ]

      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAnalyticsData),
        }),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/analytics/content/item-123/effectiveness?days=30',
      })

      expect(response.statusCode).toBe(200)

      const effectiveness = JSON.parse(response.payload)
      expect(effectiveness).toMatchObject({
        itemId: 'item-123',
        totalViews: 100,
        totalAttempts: 80,
        successRate: 0.75, // 60/80
        avgResponseTime: 35000,
        avgConfidence: 3.5,
        engagementScore: 0.75,
        dropoffRate: 0.15,
        qualityScore: expect.any(Number),
      })
    })
  })

  describe('Recommendation System Integration', () => {
    it('should provide personalized content recommendations', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      // Mock candidate items
      const mockCandidates = [
        {
          id: 'item-rec-1',
          title: 'Recommended Item 1',
          difficulty: 0.6,
          estimatedTime: 120,
          type: 'MULTIPLE_CHOICE',
          concept: {
            key: 'traffic_signs',
            category: {
              key: 'road_rules',
            },
          },
        },
        {
          id: 'item-rec-2',
          title: 'Recommended Item 2',
          difficulty: 0.5,
          estimatedTime: 90,
          type: 'SCENARIO',
          concept: {
            key: 'traffic_signs',
            category: {
              key: 'road_rules',
            },
          },
        },
      ]

      db.query.items.findMany.mockResolvedValue(mockCandidates)

      // Mock user profile and effectiveness data
      vi.spyOn(recommendationService as any, 'getUserProfile').mockResolvedValue({
        userId: 'test-user-123',
        difficultyPreference: 0.6,
        preferredContentTypes: ['MULTIPLE_CHOICE', 'SCENARIO'],
        avgResponseTime: 45000,
        successRate: 0.75,
        engagementScore: 0.7,
      })

      vi.spyOn(
        recommendationService['analyticsService'],
        'getContentEffectiveness',
      ).mockResolvedValue({
        qualityScore: 0.8,
        engagementScore: 0.75,
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/recommendations/personalized?conceptId=concept-456&timeAvailable=30&deviceType=desktop',
      })

      expect(response.statusCode).toBe(200)

      const result = JSON.parse(response.payload)
      expect(result.recommendations).toHaveLength(2)
      expect(result.recommendations[0]).toMatchObject({
        itemId: expect.any(String),
        score: expect.any(Number),
        reason: expect.any(String),
        confidence: expect.any(Number),
        metadata: {
          difficulty: expect.any(Number),
          estimatedTime: expect.any(Number),
          contentType: expect.any(String),
          conceptKey: expect.any(String),
          categoryKey: expect.any(String),
        },
      })

      // Recommendations should be sorted by score
      expect(result.recommendations[0].score).toBeGreaterThanOrEqual(
        result.recommendations[1].score,
      )
    })
  })

  describe('Optimization System Integration', () => {
    it('should generate comprehensive optimization reports', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      // Mock item data
      const mockItem = {
        id: 'item-optimize-123',
        title: 'Item to Optimize',
        difficulty: 0.7,
        concept: {
          categoryId: 'category-1',
          category: {
            id: 'category-1',
            name: 'Traffic Rules',
          },
        },
      }

      db.query.items.findFirst.mockResolvedValue(mockItem)

      // Mock performance data indicating issues
      const mockPerformance = {
        successRate: 0.35, // Low success rate
        engagementScore: 0.4, // Low engagement
        avgResponseTime: 80000, // High response time
        dropoffRate: 0.45, // High dropoff
        qualityScore: 0.35,
        totalAttempts: 150,
        totalViews: 200,
      }

      vi.spyOn(
        optimizationService['analyticsService'],
        'getContentEffectiveness',
      ).mockResolvedValue(mockPerformance as any)

      // Mock benchmark data
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([{ avgSuccessRate: 0.7, avgEngagement: 0.75 }]),
              }),
            }),
          }),
        }),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/optimization/report/item-optimize-123',
      })

      expect(response.statusCode).toBe(200)

      const report = JSON.parse(response.payload)
      expect(report).toMatchObject({
        itemId: 'item-optimize-123',
        currentPerformance: {
          successRate: 0.35,
          engagementScore: 0.4,
          avgResponseTime: 80000,
          dropoffRate: 0.45,
          qualityScore: 0.35,
        },
        suggestions: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/difficulty|engagement|content|format/),
            priority: expect.stringMatching(/high|medium|low/),
            title: expect.any(String),
            description: expect.any(String),
            suggestedChanges: expect.any(Array),
            expectedImpact: expect.objectContaining({
              successRate: expect.any(Number),
              engagementScore: expect.any(Number),
              completionRate: expect.any(Number),
            }),
            confidence: expect.any(Number),
          }),
        ]),
        abTestRecommendations: expect.any(Array),
        benchmarkComparison: expect.objectContaining({
          categoryAverage: expect.any(Number),
          conceptAverage: expect.any(Number),
          topPerformerGap: expect.any(Number),
        }),
      })

      // Should have multiple suggestions due to poor performance
      expect(report.suggestions.length).toBeGreaterThan(0)

      // Should have high-priority suggestions
      const highPrioritySuggestions = report.suggestions.filter((s: any) => s.priority === 'high')
      expect(highPrioritySuggestions.length).toBeGreaterThan(0)
    })

    it('should handle optimization for high-performing content', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      const mockItem = {
        id: 'item-high-performer',
        title: 'High Performing Item',
        difficulty: 0.6,
        concept: {
          categoryId: 'category-1',
          category: { id: 'category-1', name: 'Traffic Rules' },
        },
      }

      db.query.items.findFirst.mockResolvedValue(mockItem)

      // Mock excellent performance data
      const mockPerformance = {
        successRate: 0.88, // High success rate
        engagementScore: 0.85, // High engagement
        avgResponseTime: 25000, // Fast response time
        dropoffRate: 0.08, // Low dropoff
        qualityScore: 0.9,
        totalAttempts: 200,
        totalViews: 220,
      }

      vi.spyOn(
        optimizationService['analyticsService'],
        'getContentEffectiveness',
      ).mockResolvedValue(mockPerformance as any)

      // Mock benchmark data
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([{ avgSuccessRate: 0.65, avgEngagement: 0.7 }]),
              }),
            }),
          }),
        }),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/optimization/report/item-high-performer',
      })

      expect(response.statusCode).toBe(200)

      const report = JSON.parse(response.payload)

      // High-performing content should have fewer or different suggestions
      expect(report.currentPerformance.qualityScore).toBeGreaterThan(0.8)

      // May suggest increasing difficulty since success rate is very high
      const difficultySuggestions = report.suggestions.filter(
        (s: any) => s.type === 'difficulty' && s.title.includes('Increase'),
      )

      if (difficultySuggestions.length > 0) {
        expect(difficultySuggestions[0].priority).toBe('medium')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent items gracefully', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      db.query.items.findFirst.mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/optimization/report/non-existent-item',
      })

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Item not found',
      })
    })

    it('should handle invalid interaction data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/analytics/track-interaction',
        payload: {
          // Missing required fields
          itemId: 'item-123',
          // conceptId missing
          eventType: 'invalid-type',
        },
      })

      // Should still process but may have validation issues
      // In a real implementation, you'd add proper validation
      expect(response.statusCode).toBe(200)
    })

    it('should handle database errors gracefully', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      // Mock database error
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/analytics/content/item-123/effectiveness',
      })

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal server error',
      })
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent analytics requests', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/analytics/track-interaction',
          payload: {
            itemId: `item-${i}`,
            conceptId: `concept-${i}`,
            eventType: 'attempt',
            isCorrect: i % 2 === 0, // Alternate correct/incorrect
            responseTime: 30000 + i * 1000,
            confidence: 3 + (i % 3),
          },
        }),
      )

      const responses = await Promise.all(concurrentRequests)

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ success: true })
      })

      // Database should have been called for each request
      expect(db.insert).toHaveBeenCalledTimes(10)
    })

    it('should efficiently handle large datasets in analytics queries', async () => {
      const mockDb = await import('../db/connection.js')
      const db = mockDb.db as any

      // Mock large dataset
      const mockLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
        totalViews: 100 + i,
        totalAttempts: 80 + i,
        successfulAttempts: 60 + (i % 20),
        avgResponseTime: 30000 + i * 100,
        avgConfidence: 3 + (i % 3),
        avgEngagement: 0.5 + (i % 50) / 100,
        avgDropoff: 0.1 + (i % 30) / 100,
        avgKnowledgeGain: 0.2 + (i % 40) / 100,
        avgRetention: 0.7 + (i % 30) / 100,
        avgDifficulty: 0.4 + (i % 60) / 100,
      }))

      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockLargeDataset),
        }),
      })

      const startTime = Date.now()

      const response = await app.inject({
        method: 'GET',
        url: '/analytics/content/item-large-dataset/effectiveness?days=365',
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.statusCode).toBe(200)

      // Should process large dataset efficiently (under 1 second for this test)
      expect(responseTime).toBeLessThan(1000)

      const effectiveness = JSON.parse(response.payload)
      expect(effectiveness.totalViews).toBeGreaterThan(0)
      expect(effectiveness.qualityScore).toBeGreaterThanOrEqual(0)
      expect(effectiveness.qualityScore).toBeLessThanOrEqual(1)
    })
  })
})
