import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ABTestingService } from '../services/ab-testing.service.js'

// Mock the database connection
vi.mock('../db/connection.js', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      abTests: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
  abTests: {
    id: 'id',
    status: 'status',
    startDate: 'startDate',
    targetUsers: 'targetUsers',
    targetConcepts: 'targetConcepts',
    trafficSplit: 'trafficSplit',
    results: 'results',
    updatedAt: 'updatedAt',
  },
}))

describe('ABTestingService', () => {
  let abTestingService: ABTestingService
  let mockDb: any

  beforeEach(async () => {
    abTestingService = new ABTestingService()
    mockDb = vi.mocked(await import('../db/connection.js')).db
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Test Creation', () => {
    it('should create an A/B test successfully', async () => {
      const testData = {
        name: 'Button Color Test',
        description: 'Testing different button colors',
        hypothesis: 'Red buttons will have higher conversion rates',
        variants: {
          control: {
            name: 'Blue Button',
            description: 'Original blue button',
            trafficPercentage: 50,
            changes: { buttonColor: 'blue' },
          },
          variant_a: {
            name: 'Red Button',
            description: 'New red button',
            trafficPercentage: 50,
            changes: { buttonColor: 'red' },
          },
        },
      }

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'test-1',
              ...testData,
              trafficSplit: { control: 50, variant_a: 50 },
              targetConcepts: [],
              targetUsers: [],
              status: 'DRAFT',
              createdAt: new Date(),
            },
          ]),
        }),
      })

      const result = await abTestingService.createTest(testData)

      expect(result).toMatchObject({
        id: 'test-1',
        name: 'Button Color Test',
        status: 'DRAFT',
      })
    })

    it('should throw error for invalid traffic split', async () => {
      const testData = {
        name: 'Invalid Test',
        hypothesis: 'Test hypothesis',
        variants: {
          control: {
            name: 'Control',
            trafficPercentage: 60,
            changes: {},
          },
          variant_a: {
            name: 'Variant A',
            trafficPercentage: 50, // Total = 110%
            changes: {},
          },
        },
      }

      await expect(abTestingService.createTest(testData)).rejects.toThrow(
        'Traffic split must add up to 100%',
      )
    })
  })

  describe('Test Management', () => {
    it('should start a test successfully', async () => {
      const testId = 'test-1'

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: testId,
                status: 'RUNNING',
                startDate: new Date(),
              },
            ]),
          }),
        }),
      })

      const result = await abTestingService.startTest(testId)

      expect(result.status).toBe('RUNNING')
      expect(result.startDate).toBeInstanceOf(Date)
    })

    it('should pause a test successfully', async () => {
      const testId = 'test-1'

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: testId,
                status: 'PAUSED',
              },
            ]),
          }),
        }),
      })

      const result = await abTestingService.pauseTest(testId)

      expect(result.status).toBe('PAUSED')
    })

    it('should throw error when test not found', async () => {
      const testId = 'nonexistent'

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      await expect(abTestingService.startTest(testId)).rejects.toThrow('Test not found')
    })
  })

  describe('Variant Assignment', () => {
    it('should assign variant deterministically', async () => {
      const testId = 'test-1'
      const userId = 'user-123'

      const mockTest = {
        id: testId,
        status: 'RUNNING',
        targetUsers: [],
        targetConcepts: [],
        trafficSplit: {
          control: 50,
          variant_a: 50,
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      const variant1 = await abTestingService.assignVariant(testId, userId)
      const variant2 = await abTestingService.assignVariant(testId, userId)

      // Same user should get same variant
      expect(variant1).toBe(variant2)
      expect(['control', 'variant_a']).toContain(variant1)
    })

    it('should return control for non-targeted users', async () => {
      const testId = 'test-1'
      const userId = 'user-123'

      const mockTest = {
        id: testId,
        status: 'RUNNING',
        targetUsers: ['user-456'], // Different user
        targetConcepts: [],
        trafficSplit: {
          control: 50,
          variant_a: 50,
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      const variant = await abTestingService.assignVariant(testId, userId)

      expect(variant).toBe('control')
    })

    it('should throw error for non-running test', async () => {
      const testId = 'test-1'
      const userId = 'user-123'

      const mockTest = {
        id: testId,
        status: 'DRAFT',
        targetUsers: [],
        targetConcepts: [],
        trafficSplit: {},
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      await expect(abTestingService.assignVariant(testId, userId)).rejects.toThrow(
        'Test not found or not running',
      )
    })
  })

  describe('Conversion Tracking', () => {
    it('should track conversion successfully', async () => {
      const testId = 'test-1'
      const userId = 'user-123'
      const variant = 'variant_a'
      const outcome = {
        isSuccess: true,
        responseTime: 1500,
        engagementScore: 0.8,
      }

      const mockTest = {
        id: testId,
        results: {
          variant_a: {
            impressions: 10,
            conversions: 5,
            totalResponseTime: 15000,
            totalEngagement: 4.0,
          },
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      await expect(
        abTestingService.trackConversion(testId, userId, variant, outcome),
      ).resolves.not.toThrow()

      expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe('Test Analysis', () => {
    it('should analyze test results correctly', async () => {
      const testId = 'test-1'

      const mockTest = {
        id: testId,
        status: 'RUNNING',
        results: {
          control: {
            impressions: 1000,
            conversions: 100,
            totalResponseTime: 2500000,
            totalEngagement: 500,
          },
          variant_a: {
            impressions: 1000,
            conversions: 150,
            totalResponseTime: 2000000,
            totalEngagement: 600,
          },
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      const analysis = await abTestingService.analyzeTest(testId)

      expect(analysis.testId).toBe(testId)
      expect(analysis.results).toHaveLength(2)

      const controlResult = analysis.results.find((r) => r.variant === 'control')
      const variantResult = analysis.results.find((r) => r.variant === 'variant_a')

      expect(controlResult?.metrics.conversionRate).toBe(0.1) // 100/1000
      expect(variantResult?.metrics.conversionRate).toBe(0.15) // 150/1000
      expect(variantResult?.metrics.avgResponseTime).toBe(2000) // 2000000/1000
    })

    it('should determine statistical significance', async () => {
      const testId = 'test-1'

      // Large sample with significant difference
      const mockTest = {
        id: testId,
        status: 'RUNNING',
        results: {
          control: {
            impressions: 10000,
            conversions: 1000, // 10% conversion rate
            totalResponseTime: 25000000,
            totalEngagement: 5000,
          },
          variant_a: {
            impressions: 10000,
            conversions: 1200, // 12% conversion rate
            totalResponseTime: 20000000,
            totalEngagement: 6000,
          },
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      const analysis = await abTestingService.analyzeTest(testId)

      expect(analysis.statisticalSignificance).toBe(true)
      expect(analysis.winner).toBe('variant_a')
      expect(analysis.confidence).toBeGreaterThan(90)
    })

    it('should generate appropriate recommendations', async () => {
      const testId = 'test-1'

      const mockTest = {
        id: testId,
        status: 'RUNNING',
        results: {
          control: {
            impressions: 100, // Small sample
            conversions: 10,
            totalResponseTime: 250000,
            totalEngagement: 50,
          },
          variant_a: {
            impressions: 100,
            conversions: 12,
            totalResponseTime: 200000,
            totalEngagement: 60,
          },
        },
      }

      mockDb.query.abTests.findFirst.mockResolvedValue(mockTest)

      const analysis = await abTestingService.analyzeTest(testId)

      expect(analysis.statisticalSignificance).toBe(false)
      expect(analysis.recommendations).toContain(
        'Test needs more data to reach statistical significance',
      )
    })
  })

  describe('Active Tests', () => {
    it('should get active tests', async () => {
      const mockTests = [
        {
          id: 'test-1',
          name: 'Test 1',
          status: 'RUNNING',
          startDate: new Date(),
        },
        {
          id: 'test-2',
          name: 'Test 2',
          status: 'RUNNING',
          startDate: new Date(),
        },
      ]

      mockDb.query.abTests.findMany.mockResolvedValue(mockTests)

      const result = await abTestingService.getActiveTests()

      expect(result).toEqual(mockTests)
      expect(mockDb.query.abTests.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
      })
    })

    it('should filter tests by concept', async () => {
      const conceptId = 'concept-1'
      const mockTests = [
        {
          id: 'test-1',
          name: 'Test 1',
          status: 'RUNNING',
          targetConcepts: [conceptId],
        },
      ]

      mockDb.query.abTests.findMany.mockResolvedValue(mockTests)

      const result = await abTestingService.getActiveTests(conceptId)

      expect(result).toEqual(mockTests)
    })
  })
})
