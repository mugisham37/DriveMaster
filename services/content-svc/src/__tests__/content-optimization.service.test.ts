import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentOptimizationService } from '../services/content-optimization.service.js'
import { ContentAnalyticsService } from '../services/content-analytics.service.js'
import { ABTestingService } from '../services/ab-testing.service.js'
import { db } from '../db/connection.js'

// Mock dependencies
vi.mock('../db/connection.js', () => ({
  db: {
    query: {
      items: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    innerJoin: vi.fn(),
  },
}))

vi.mock('../services/content-analytics.service.js')
vi.mock('../services/ab-testing.service.js')

describe('ContentOptimizationService', () => {
  let service: ContentOptimizationService
  let mockAnalyticsService: any
  let mockABTestingService: any
  const mockDb = db as any

  beforeEach(() => {
    service = new ContentOptimizationService()
    mockAnalyticsService = vi.mocked(ContentAnalyticsService)
    mockABTestingService = vi.mocked(ABTestingService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generateOptimizationReport', () => {
    it('should generate comprehensive optimization report', async () => {
      const itemId = 'item-123'

      const mockItem = {
        id: itemId,
        title: 'Test Item',
        difficulty: 0.6,
        concept: {
          categoryId: 'category-1',
          category: {
            id: 'category-1',
            name: 'Traffic Rules',
          },
        },
      }

      const mockPerformance = {
        successRate: 0.45, // Low success rate
        engagementScore: 0.35, // Low engagement
        avgResponseTime: 75000, // High response time
        dropoffRate: 0.4, // High dropoff
        qualityScore: 0.4,
        totalAttempts: 100,
        totalViews: 150,
      }

      mockDb.query.items.findFirst.mockResolvedValue(mockItem)

      vi.spyOn(service['analyticsService'], 'getContentEffectiveness').mockResolvedValue(
        mockPerformance as any,
      )

      // Mock optimization suggestions
      vi.spyOn(service, 'generateOptimizationSuggestions').mockResolvedValue([
        {
          itemId,
          type: 'difficulty',
          priority: 'high',
          title: 'Reduce Content Difficulty',
          description: 'Low success rate indicates content may be too difficult',
          suggestedChanges: ['Simplify language', 'Add more hints'],
          expectedImpact: {
            successRate: 0.25,
            engagementScore: 0.15,
            completionRate: 0.2,
          },
          confidence: 0.85,
          dataPoints: 100,
        },
      ])

      // Mock A/B test recommendations
      vi.spyOn(service, 'generateABTestRecommendations').mockResolvedValue([
        {
          hypothesis: 'Adjusting difficulty level will improve learning outcomes',
          variants: ['Current version', 'Easier version with more hints'],
          expectedOutcome: 'Find optimal difficulty for 70-80% success rate',
        },
      ])

      // Mock benchmark comparison
      vi.spyOn(service, 'getBenchmarkComparison').mockResolvedValue({
        categoryAverage: 0.65,
        conceptAverage: 0.6,
        topPerformerGap: 0.4,
      })

      const report = await service.generateOptimizationReport(itemId)

      expect(report).toMatchObject({
        itemId,
        currentPerformance: {
          successRate: 0.45,
          engagementScore: 0.35,
          avgResponseTime: 75000,
          dropoffRate: 0.4,
          qualityScore: 0.4,
        },
        suggestions: expect.arrayContaining([
          expect.objectContaining({
            type: 'difficulty',
            priority: 'high',
            title: 'Reduce Content Difficulty',
          }),
        ]),
        abTestRecommendations: expect.arrayContaining([
          expect.objectContaining({
            hypothesis: expect.stringContaining('difficulty'),
          }),
        ]),
        benchmarkComparison: {
          categoryAverage: 0.65,
          conceptAverage: 0.6,
          topPerformerGap: 0.4,
        },
      })
    })

    it('should throw error for non-existent item', async () => {
      const itemId = 'non-existent'

      mockDb.query.items.findFirst.mockResolvedValue(null)

      await expect(service.generateOptimizationReport(itemId)).rejects.toThrow('Item not found')
    })
  })

  describe('generateOptimizationSuggestions', () => {
    it('should suggest difficulty reduction for low success rate', async () => {
      const item = {
        id: 'item-difficult',
        title: 'Difficult Item',
        difficulty: 0.8,
      }

      const performance = {
        successRate: 0.25, // Very low
        engagementScore: 0.6,
        avgResponseTime: 45000,
        dropoffRate: 0.2,
        totalAttempts: 50,
        totalViews: 80,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'difficulty',
          priority: 'high',
          title: 'Reduce Content Difficulty',
          description: expect.stringContaining('Low success rate'),
          suggestedChanges: expect.arrayContaining([expect.stringContaining('Simplify language')]),
          expectedImpact: {
            successRate: 0.25,
            engagementScore: 0.15,
            completionRate: 0.2,
          },
        }),
      )
    })

    it('should suggest increasing challenge for very high success rate', async () => {
      const item = {
        id: 'item-easy',
        title: 'Easy Item',
        difficulty: 0.3,
      }

      const performance = {
        successRate: 0.95, // Very high
        engagementScore: 0.7,
        avgResponseTime: 20000,
        dropoffRate: 0.1,
        totalAttempts: 100,
        totalViews: 120,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'difficulty',
          priority: 'medium',
          title: 'Increase Content Challenge',
          description: expect.stringContaining('Very high success rate'),
          suggestedChanges: expect.arrayContaining([
            expect.stringContaining('Add more complex scenarios'),
          ]),
        }),
      )
    })

    it('should suggest engagement improvements for low engagement', async () => {
      const item = {
        id: 'item-boring',
        title: 'Boring Item',
      }

      const performance = {
        successRate: 0.7,
        engagementScore: 0.3, // Very low
        avgResponseTime: 45000,
        dropoffRate: 0.2,
        totalAttempts: 80,
        totalViews: 100,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'engagement',
          priority: 'high',
          title: 'Improve Content Engagement',
          description: expect.stringContaining('Low engagement score'),
          suggestedChanges: expect.arrayContaining([
            expect.stringContaining('Add interactive elements'),
            expect.stringContaining('real-world scenarios'),
          ]),
        }),
      )
    })

    it('should suggest clarity improvements for long response times', async () => {
      const item = {
        id: 'item-unclear',
        title: 'Unclear Item',
      }

      const performance = {
        successRate: 0.6,
        engagementScore: 0.6,
        avgResponseTime: 90000, // Very long
        dropoffRate: 0.2,
        totalAttempts: 60,
        totalViews: 80,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'content',
          priority: 'medium',
          title: 'Improve Content Clarity',
          description: expect.stringContaining('Long response times'),
          suggestedChanges: expect.arrayContaining([
            expect.stringContaining('Clarify instructions'),
            expect.stringContaining('Add visual aids'),
          ]),
        }),
      )
    })

    it('should suggest format improvements for high dropoff rate', async () => {
      const item = {
        id: 'item-dropoff',
        title: 'High Dropoff Item',
      }

      const performance = {
        successRate: 0.7,
        engagementScore: 0.6,
        avgResponseTime: 45000,
        dropoffRate: 0.5, // Very high
        totalAttempts: 40,
        totalViews: 100,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'format',
          priority: 'high',
          title: 'Reduce Content Abandonment',
          description: expect.stringContaining('High dropoff rate'),
          suggestedChanges: expect.arrayContaining([
            expect.stringContaining('Shorten content length'),
            expect.stringContaining('Break into smaller chunks'),
          ]),
        }),
      )
    })

    it('should suggest accessibility improvements when missing', async () => {
      const item = {
        id: 'item-no-accessibility',
        title: 'Item Without Accessibility',
        metadata: {}, // No accessibility metadata
      }

      const performance = {
        successRate: 0.7,
        engagementScore: 0.6,
        avgResponseTime: 45000,
        dropoffRate: 0.2,
        totalAttempts: 5, // Below threshold but accessibility is always suggested
        totalViews: 10,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'accessibility',
          priority: 'medium',
          title: 'Improve Accessibility',
          description: expect.stringContaining('lacks accessibility features'),
          suggestedChanges: expect.arrayContaining([
            expect.stringContaining('Add alt text'),
            expect.stringContaining('Provide captions'),
          ]),
        }),
      )
    })

    it('should filter out suggestions with insufficient data points', async () => {
      const item = {
        id: 'item-insufficient-data',
        title: 'Item with Little Data',
        metadata: { accessibility: { altText: 'Present' } }, // Has accessibility
      }

      const performance = {
        successRate: 0.2, // Would normally trigger suggestion
        engagementScore: 0.3,
        avgResponseTime: 90000,
        dropoffRate: 0.5,
        totalAttempts: 5, // Below threshold
        totalViews: 8,
      }

      const suggestions = await service.generateOptimizationSuggestions(item, performance)

      // Should be empty because insufficient data points and accessibility is present
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('generateABTestRecommendations', () => {
    it('should recommend difficulty testing for suboptimal success rates', async () => {
      const item = { id: 'item-1', title: 'Test Item' }
      const performance = {
        successRate: 0.5, // Outside optimal range
        engagementScore: 0.7,
        avgResponseTime: 45000,
        dropoffRate: 0.2,
      }

      const recommendations = await service.generateABTestRecommendations(item, performance)

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          hypothesis: expect.stringContaining('difficulty level'),
          variants: expect.arrayContaining([
            'Current version',
            'Easier version with more hints',
            'Harder version with additional complexity',
          ]),
          expectedOutcome: expect.stringContaining('70-80% success rate'),
        }),
      )
    })

    it('should recommend engagement testing for low engagement', async () => {
      const item = { id: 'item-1', title: 'Test Item' }
      const performance = {
        successRate: 0.75,
        engagementScore: 0.4, // Low engagement
        avgResponseTime: 45000,
        dropoffRate: 0.2,
      }

      const recommendations = await service.generateABTestRecommendations(item, performance)

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          hypothesis: expect.stringContaining('Interactive content format'),
          variants: expect.arrayContaining([
            'Current text-based format',
            'Interactive simulation',
            'Video-based explanation',
            'Gamified version with points',
          ]),
          expectedOutcome: expect.stringContaining('Increase engagement score'),
        }),
      )
    })

    it('should recommend content length testing for performance issues', async () => {
      const item = { id: 'item-1', title: 'Test Item' }
      const performance = {
        successRate: 0.75,
        engagementScore: 0.7,
        avgResponseTime: 60000, // High response time
        dropoffRate: 0.3, // High dropoff
      }

      const recommendations = await service.generateABTestRecommendations(item, performance)

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          hypothesis: expect.stringContaining('Shorter content chunks'),
          variants: expect.arrayContaining([
            'Current full-length version',
            'Split into 2 shorter parts',
            'Condensed version with key points only',
          ]),
          expectedOutcome: expect.stringContaining('Reduce dropoff rate'),
        }),
      )
    })
  })

  describe('getBenchmarkComparison', () => {
    it('should return benchmark comparison data', async () => {
      const item = {
        id: 'item-1',
        concept: {
          categoryId: 'category-1',
        },
        conceptId: 'concept-1',
      }

      const performance = {
        successRate: 0.6,
      }

      // Mock category stats
      mockDb.select.mockReturnValueOnce({
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

      // Mock concept stats
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([{ avgSuccessRate: 0.65 }]),
            }),
          }),
        }),
      })

      // Mock top performer
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([{ maxSuccessRate: 0.9 }]),
              }),
            }),
          }),
        }),
      })

      const comparison = await service.getBenchmarkComparison(item, performance)

      expect(comparison).toEqual({
        categoryAverage: 0.7,
        conceptAverage: 0.65,
        topPerformerGap: 0.3, // 0.9 - 0.6
      })
    })

    it('should handle missing benchmark data gracefully', async () => {
      const item = {
        concept: { categoryId: 'category-1' },
        conceptId: 'concept-1',
      }
      const performance = { successRate: 0.6 }

      // Mock empty results
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      })

      const comparison = await service.getBenchmarkComparison(item, performance)

      expect(comparison).toEqual({
        categoryAverage: 0,
        conceptAverage: 0,
        topPerformerGap: -0.6, // 0 - 0.6
      })
    })
  })

  describe('applyAutoOptimizationRules', () => {
    it('should execute all active optimization rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Flag Low Success Rate',
          condition: 'success_rate < 0.4',
          action: 'flag_for_review' as const,
          parameters: { threshold: 0.4 },
          isActive: true,
        },
        {
          id: 'rule-2',
          name: 'Promote High Performers',
          condition: 'success_rate > 0.85',
          action: 'promote_content' as const,
          parameters: { threshold: 0.85 },
          isActive: true,
        },
      ]

      vi.spyOn(service as any, 'getActiveOptimizationRules').mockResolvedValue(mockRules)

      const executeRuleSpy = vi.spyOn(service, 'executeOptimizationRule').mockResolvedValue()

      await service.applyAutoOptimizationRules()

      expect(executeRuleSpy).toHaveBeenCalledTimes(2)
      expect(executeRuleSpy).toHaveBeenCalledWith(mockRules[0])
      expect(executeRuleSpy).toHaveBeenCalledWith(mockRules[1])
    })
  })

  describe('executeOptimizationRule', () => {
    it('should execute flag_for_review action', async () => {
      const rule = {
        id: 'rule-1',
        name: 'Flag Low Success Rate',
        condition: 'success_rate < 0.4',
        action: 'flag_for_review' as const,
        parameters: { threshold: 0.4 },
        isActive: true,
      }

      const flagSpy = vi.spyOn(service as any, 'flagContentForReview').mockResolvedValue()

      await service.executeOptimizationRule(rule)

      expect(flagSpy).toHaveBeenCalledWith(rule)
    })

    it('should execute auto_adjust_difficulty action', async () => {
      const rule = {
        id: 'rule-2',
        name: 'Auto Adjust Difficulty',
        condition: 'success_rate < 0.3',
        action: 'auto_adjust_difficulty' as const,
        parameters: { threshold: 0.3 },
        isActive: true,
      }

      const adjustSpy = vi.spyOn(service as any, 'autoAdjustDifficulty').mockResolvedValue()

      await service.executeOptimizationRule(rule)

      expect(adjustSpy).toHaveBeenCalledWith(rule)
    })

    it('should execute suggest_retirement action', async () => {
      const rule = {
        id: 'rule-3',
        name: 'Suggest Retirement',
        condition: 'success_rate < 0.2 AND dropoff_rate > 0.6',
        action: 'suggest_retirement' as const,
        parameters: { successThreshold: 0.2, dropoffThreshold: 0.6 },
        isActive: true,
      }

      const retireSpy = vi.spyOn(service as any, 'suggestContentRetirement').mockResolvedValue()

      await service.executeOptimizationRule(rule)

      expect(retireSpy).toHaveBeenCalledWith(rule)
    })

    it('should execute promote_content action', async () => {
      const rule = {
        id: 'rule-4',
        name: 'Promote High Performers',
        condition: 'success_rate > 0.85 AND engagement > 0.8',
        action: 'promote_content' as const,
        parameters: { successThreshold: 0.85, engagementThreshold: 0.8 },
        isActive: true,
      }

      const promoteSpy = vi
        .spyOn(service as any, 'promoteHighPerformingContent')
        .mockResolvedValue()

      await service.executeOptimizationRule(rule)

      expect(promoteSpy).toHaveBeenCalledWith(rule)
    })
  })

  describe('getOptimizationInsights', () => {
    it('should return comprehensive optimization insights', async () => {
      const categoryId = 'category-123'
      const conceptId = 'concept-456'
      const timeRange = 30

      const mockUnderperforming = [
        { id: 'item-1', priority: 'high', issue: 'Low success rate' },
        { id: 'item-2', priority: 'medium', issue: 'High dropoff' },
      ]

      const mockOpportunities = [
        { id: 'item-3', expectedImpact: 0.3, type: 'engagement' },
        { id: 'item-4', expectedImpact: 0.2, type: 'difficulty' },
      ]

      const mockSuccessStories = [
        { id: 'item-5', improvement: 0.4, optimization: 'Reduced difficulty' },
      ]

      vi.spyOn(service as any, 'getUnderperformingContent').mockResolvedValue(mockUnderperforming)
      vi.spyOn(service as any, 'getOptimizationOpportunities').mockResolvedValue(mockOpportunities)
      vi.spyOn(service as any, 'getOptimizationSuccessStories').mockResolvedValue(
        mockSuccessStories,
      )

      const insights = await service.getOptimizationInsights(categoryId, conceptId, timeRange)

      expect(insights).toEqual({
        underperforming: mockUnderperforming,
        opportunities: mockOpportunities,
        successStories: mockSuccessStories,
        summary: {
          totalItemsAnalyzed: 5, // 2 + 2 + 1
          highPriorityIssues: 1, // Only item-1 has high priority
          potentialImpact: 0.5, // 0.3 + 0.2
        },
      })
    })
  })
})
