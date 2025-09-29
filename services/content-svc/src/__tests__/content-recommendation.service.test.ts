import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentRecommendationService } from '../services/content-recommendation.service.js'
import { ContentAnalyticsService } from '../services/content-analytics.service.js'
import { db } from '../db/connection.js'

// Mock the database and analytics service
vi.mock('../db/connection.js', () => ({
  db: {
    query: {
      items: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
  },
}))

vi.mock('../services/content-analytics.service.js')

describe('ContentRecommendationService', () => {
  let service: ContentRecommendationService
  let mockAnalyticsService: any
  const mockDb = db as any

  beforeEach(() => {
    service = new ContentRecommendationService()
    mockAnalyticsService = vi.mocked(ContentAnalyticsService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations based on user context', async () => {
      const context = {
        userId: 'user-123',
        currentConceptId: 'concept-456',
        sessionGoals: ['learn_traffic_signs'],
        timeAvailable: 30,
        deviceType: 'mobile' as const,
        previousItems: ['item-1', 'item-2'],
        targetDifficulty: 0.6,
      }

      const mockCandidates = [
        {
          id: 'item-3',
          title: 'Traffic Sign Recognition',
          difficulty: 0.6,
          estimatedTime: 120, // 2 minutes
          type: 'MULTIPLE_CHOICE',
          concept: {
            key: 'traffic_signs',
            category: {
              key: 'road_rules',
            },
          },
        },
        {
          id: 'item-4',
          title: 'Stop Sign Rules',
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

      mockDb.query.items.findMany.mockResolvedValue(mockCandidates)

      // Mock user profile
      vi.spyOn(service as any, 'getUserProfile').mockResolvedValue({
        userId: 'user-123',
        learningStyle: 'visual',
        difficultyPreference: 0.6,
        avgResponseTime: 45000,
        successRate: 0.75,
        engagementScore: 0.7,
        preferredContentTypes: ['MULTIPLE_CHOICE', 'SCENARIO'],
        weakConcepts: [],
        strongConcepts: [],
        studyPatterns: {
          preferredTimeOfDay: 'evening',
          sessionDuration: 30,
          frequency: 5,
        },
      })

      // Mock content effectiveness
      const mockEffectiveness = {
        qualityScore: 0.8,
        engagementScore: 0.75,
      }

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue(
        mockEffectiveness as any,
      )

      const recommendations = await service.getPersonalizedRecommendations(context, 5)

      expect(recommendations).toHaveLength(2)
      expect(recommendations[0]).toMatchObject({
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

      // Should be sorted by score
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score)
    })

    it('should filter out previously seen items', async () => {
      const context = {
        userId: 'user-123',
        previousItems: ['item-3', 'item-4'],
      }

      const mockCandidates = [
        { id: 'item-3', title: 'Seen Item' },
        { id: 'item-5', title: 'New Item' },
      ]

      mockDb.query.items.findMany.mockResolvedValue(mockCandidates)

      vi.spyOn(service as any, 'getUserProfile').mockResolvedValue({
        userId: 'user-123',
        preferredContentTypes: ['MULTIPLE_CHOICE'],
      })

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue({
        qualityScore: 0.8,
      } as any)

      const recommendations = await service.getPersonalizedRecommendations(context, 5)

      // Should only include the new item
      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].itemId).toBe('item-5')
    })
  })

  describe('getAdaptiveRecommendations', () => {
    it('should adjust difficulty based on user performance', async () => {
      const userId = 'user-123'
      const conceptId = 'concept-456'

      const mockUserProfile = {
        userId,
        difficultyPreference: 0.6,
        successRate: 0.8, // High performance
      }

      const mockRecentPerformance = {
        averageScore: 0.85, // Performing well
        attempts: 20,
        lastAttempt: new Date(),
        trend: 'improving',
        strugglingAreas: [],
      }

      const mockCandidates = [
        {
          id: 'item-challenging',
          difficulty: 0.7, // Slightly harder
          concept: {
            key: 'concept_key',
            category: {
              key: 'category_key',
            },
          },
        },
      ]

      vi.spyOn(service as any, 'getUserProfile').mockResolvedValue(mockUserProfile)
      vi.spyOn(service as any, 'getRecentConceptPerformance').mockResolvedValue(
        mockRecentPerformance,
      )

      mockDb.query.items.findMany.mockResolvedValue(mockCandidates)

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue({
        qualityScore: 0.8,
        successRate: 0.75,
      } as any)

      const recommendations = await service.getAdaptiveRecommendations(userId, conceptId, 5)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].reason).toContain('challenging content')
    })

    it('should recommend easier content for struggling users', async () => {
      const userId = 'user-123'
      const conceptId = 'concept-456'

      const mockUserProfile = {
        userId,
        difficultyPreference: 0.6,
        successRate: 0.4, // Low performance
      }

      const mockRecentPerformance = {
        averageScore: 0.3, // Struggling
        attempts: 15,
        trend: 'declining',
        strugglingAreas: ['traffic_signs'],
      }

      const mockCandidates = [
        {
          id: 'item-easier',
          difficulty: 0.4, // Easier content
          concept: {
            key: 'concept_key',
            category: {
              key: 'category_key',
            },
          },
        },
      ]

      vi.spyOn(service as any, 'getUserProfile').mockResolvedValue(mockUserProfile)
      vi.spyOn(service as any, 'getRecentConceptPerformance').mockResolvedValue(
        mockRecentPerformance,
      )

      mockDb.query.items.findMany.mockResolvedValue(mockCandidates)

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue({
        qualityScore: 0.7,
        successRate: 0.8,
      } as any)

      const recommendations = await service.getAdaptiveRecommendations(userId, conceptId, 5)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].reason).toContain('easier content')
    })
  })

  describe('getSimilarContent', () => {
    it('should find similar high-performing content', async () => {
      const sourceItemId = 'item-source'

      const mockSourceItem = {
        id: sourceItemId,
        title: 'Source Item',
        difficulty: 0.6,
        type: 'MULTIPLE_CHOICE',
        conceptId: 'concept-1',
        concept: {
          categoryId: 'category-1',
          category: {},
        },
      }

      const mockSimilarItems = [
        {
          id: 'item-similar-1',
          title: 'Similar Item 1',
          difficulty: 0.65,
          type: 'MULTIPLE_CHOICE',
          conceptId: 'concept-1', // Same concept
          concept: {
            key: 'concept_key',
            category: {
              key: 'category_key',
            },
          },
        },
        {
          id: 'item-similar-2',
          title: 'Similar Item 2',
          difficulty: 0.55,
          type: 'MULTIPLE_CHOICE',
          conceptId: 'concept-2', // Same category
          concept: {
            key: 'concept_key_2',
            category: {
              key: 'category_key',
            },
          },
        },
      ]

      mockDb.query.items.findFirst.mockResolvedValue(mockSourceItem)
      mockDb.query.items.findMany.mockResolvedValue(mockSimilarItems)

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness')
        .mockResolvedValueOnce({
          successRate: 0.85,
          qualityScore: 0.9,
        } as any)
        .mockResolvedValueOnce({
          successRate: 0.75,
          qualityScore: 0.8,
        } as any)

      const recommendations = await service.getSimilarContent(sourceItemId, 5)

      expect(recommendations).toHaveLength(2)
      expect(recommendations[0].reason).toContain('Similar to high-performing content')
      expect(recommendations[0].confidence).toBe(0.8)

      // Should be sorted by performance
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score)
    })

    it('should throw error for non-existent source item', async () => {
      const sourceItemId = 'non-existent'

      mockDb.query.items.findFirst.mockResolvedValue(null)

      await expect(service.getSimilarContent(sourceItemId, 5)).rejects.toThrow(
        'Source item not found',
      )
    })
  })

  describe('getTrendingContent', () => {
    it('should return trending content based on recent engagement', async () => {
      const categoryId = 'category-123'
      const timeWindow = 7
      const limit = 10

      const mockTrendingData = [
        {
          itemId: 'item-trending-1',
          totalViews: 150,
          totalAttempts: 120,
          avgEngagement: 0.8,
          successRate: 0.75,
        },
        {
          itemId: 'item-trending-2',
          totalViews: 100,
          totalAttempts: 80,
          avgEngagement: 0.7,
          successRate: 0.8,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockTrendingData),
                }),
              }),
            }),
          }),
        }),
      })

      mockDb.query.items.findFirst
        .mockResolvedValueOnce({
          id: 'item-trending-1',
          title: 'Trending Item 1',
          difficulty: 0.6,
          estimatedTime: 120,
          type: 'SCENARIO',
          concept: {
            key: 'concept_key',
            categoryId,
            category: {
              key: 'category_key',
            },
          },
        })
        .mockResolvedValueOnce({
          id: 'item-trending-2',
          title: 'Trending Item 2',
          difficulty: 0.5,
          estimatedTime: 90,
          type: 'MULTIPLE_CHOICE',
          concept: {
            key: 'concept_key_2',
            categoryId,
            category: {
              key: 'category_key',
            },
          },
        })

      const recommendations = await service.getTrendingContent(categoryId, timeWindow, limit)

      expect(recommendations).toHaveLength(2)
      expect(recommendations[0].reason).toContain('Trending content')
      expect(recommendations[0].reason).toContain('150 views')
      expect(recommendations[0].confidence).toBe(0.7)

      // Should be sorted by trending score
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score)
    })

    it('should filter by category when specified', async () => {
      const categoryId = 'category-specific'

      const mockTrendingData = [
        {
          itemId: 'item-wrong-category',
          totalViews: 200,
          totalAttempts: 150,
          avgEngagement: 0.9,
          successRate: 0.85,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockTrendingData),
                }),
              }),
            }),
          }),
        }),
      })

      // Item from different category
      mockDb.query.items.findFirst.mockResolvedValue({
        id: 'item-wrong-category',
        concept: {
          categoryId: 'different-category',
        },
      })

      const recommendations = await service.getTrendingContent(categoryId, 7, 10)

      // Should be filtered out
      expect(recommendations).toHaveLength(0)
    })

    it('should require minimum views for trending status', async () => {
      const mockTrendingData = [
        {
          itemId: 'item-low-views',
          totalViews: 5, // Below minimum threshold
          totalAttempts: 4,
          avgEngagement: 0.9,
          successRate: 0.8,
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue(mockTrendingData),
            }),
          }),
        }),
      })

      const recommendations = await service.getTrendingContent(undefined, 7, 10)

      // Should be filtered out due to low views
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('calculateRecommendationScore', () => {
    it('should score content based on multiple factors', async () => {
      const item = {
        id: 'item-test',
        difficulty: 0.6,
        estimatedTime: 1800, // 30 minutes
        type: 'MULTIPLE_CHOICE',
      }

      const userProfile = {
        userId: 'user-123',
        difficultyPreference: 0.6, // Perfect match
        preferredContentTypes: ['MULTIPLE_CHOICE'], // Match
        avgResponseTime: 45000,
        successRate: 0.75,
        engagementScore: 0.7,
      }

      const context = {
        userId: 'user-123',
        timeAvailable: 30, // Exactly matches estimated time
        deviceType: 'desktop' as const,
      }

      const mockEffectiveness = {
        qualityScore: 0.85, // High quality
        engagementScore: 0.8,
      }

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue(
        mockEffectiveness as any,
      )

      const result = await (service as any).calculateRecommendationScore(item, userProfile, context)

      expect(result.totalScore).toBeGreaterThan(0.7) // Should be high due to good matches
      expect(result.reason).toContain('matches your preferred difficulty level')
      expect(result.reason).toContain('matches your preferred content type')
      expect(result.reason).toContain('fits your available time')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should penalize content that takes too long', async () => {
      const item = {
        id: 'item-long',
        difficulty: 0.6,
        estimatedTime: 3600, // 60 minutes
        type: 'INTERACTIVE',
      }

      const userProfile = {
        difficultyPreference: 0.6,
        preferredContentTypes: ['MULTIPLE_CHOICE'],
      }

      const context = {
        userId: 'user-123',
        timeAvailable: 15, // Only 15 minutes available
        deviceType: 'mobile' as const, // Interactive content on mobile
      }

      const mockEffectiveness = {
        qualityScore: 0.7,
        engagementScore: 0.6,
      }

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue(
        mockEffectiveness as any,
      )

      const result = await (service as any).calculateRecommendationScore(item, userProfile, context)

      expect(result.totalScore).toBeLessThan(0.5) // Should be penalized
      expect(result.reason).toContain('may take longer than available time')
    })
  })
})
