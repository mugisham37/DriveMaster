import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock TensorFlow.js to avoid native addon issues
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('cpu'),
  sequential: vi.fn().mockReturnValue({
    compile: vi.fn(),
    predict: vi.fn().mockReturnValue({
      data: vi.fn().mockResolvedValue(new Float32Array([0.8])),
      dispose: vi.fn(),
    }),
    dispose: vi.fn(),
  }),
  tensor2d: vi.fn().mockReturnValue({
    dispose: vi.fn(),
  }),
  layers: {
    dense: vi.fn().mockReturnValue({}),
    dropout: vi.fn().mockReturnValue({}),
  },
  train: {
    adam: vi.fn().mockReturnValue({}),
  },
}))

// Mock Pinecone
vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation(() => ({
    listIndexes: vi.fn().mockResolvedValue({ indexes: [] }),
    createIndex: vi.fn().mockResolvedValue({}),
    Index: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ matches: [] }),
      upsert: vi.fn().mockResolvedValue({}),
      describeIndexStats: vi.fn().mockResolvedValue({ totalVectorCount: 0 }),
    }),
  })),
}))

vi.mock('@drivemaster/shared-config', () => ({
  loadEnv: () => ({
    PINECONE_API_KEY: 'test-key',
    PINECONE_ENVIRONMENT: 'test-env',
    ML_MODEL_PATH: './test-models',
  }),
}))

// Import after mocking
const { MLService } = await import('../ml-service')

describe('MLService', () => {
  let mlService: MLService

  beforeEach(() => {
    mlService = new MLService({
      pineconeApiKey: 'test-key',
      pineconeEnvironment: 'test-env',
      modelBasePath: './test-models',
      enableModelDrift: true,
      enableABTesting: true,
    })
  })

  afterEach(() => {
    mlService.dispose()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(mlService.initialize()).resolves.not.toThrow()

      const health = mlService.getHealthStatus()
      expect(health.initialized).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      const failingService = new MLService({
        pineconeApiKey: 'invalid-key',
        pineconeEnvironment: 'invalid-env',
      })

      await expect(failingService.initialize()).rejects.toThrow()
    })
  })

  describe('enhanced recommendations', () => {
    beforeEach(async () => {
      await mlService.initialize()
    })

    it('should generate enhanced recommendations', async () => {
      const userId = 'test-user-123'
      const conceptKey = 'traffic-signs'
      const knowledgeState = {
        currentMastery: 0.6,
        learningVelocity: 1.2,
        totalInteractions: 50,
        correctAnswers: 35,
      }

      const recommendations = await mlService.getEnhancedRecommendations(
        userId,
        conceptKey,
        knowledgeState,
        { fatigueLevel: 0.3, studyStreak: 5 },
        { maxItems: 5, contentType: 'question' },
      )

      expect(recommendations).toHaveLength(5)
      expect(recommendations[0]).toHaveProperty('itemId')
      expect(recommendations[0]).toHaveProperty('score')
      expect(recommendations[0]).toHaveProperty('confidence')
      expect(recommendations[0]).toHaveProperty('reasoning')
      expect(recommendations[0]).toHaveProperty('mlPredictions')
    })

    it('should handle empty recommendations gracefully', async () => {
      const recommendations = await mlService.getEnhancedRecommendations(
        'non-existent-user',
        'non-existent-concept',
        {},
        {},
        { maxItems: 5 },
      )

      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('ML insights', () => {
    beforeEach(async () => {
      await mlService.initialize()
    })

    it('should generate comprehensive user insights', async () => {
      const userId = 'test-user-123'
      const userProfile = {
        totalSessions: 25,
        avgSessionLength: 45,
        overallAccuracy: 0.75,
        currentStreak: 7,
      }
      const knowledgeStates = {
        'traffic-signs': { currentMastery: 0.8 },
        'road-rules': { currentMastery: 0.4 },
        safety: { currentMastery: 0.6 },
      }
      const recentActivity = [
        { createdAt: new Date(), masteryBefore: 0.3, masteryAfter: 0.4 },
        { createdAt: new Date(), masteryBefore: 0.4, masteryAfter: 0.5 },
      ]

      const insights = await mlService.getUserMLInsights(
        userId,
        userProfile,
        knowledgeStates,
        recentActivity,
      )

      expect(insights).toHaveProperty('dropoutRisk')
      expect(insights).toHaveProperty('learningVelocity')
      expect(insights).toHaveProperty('optimalStudyTime')
      expect(insights).toHaveProperty('recommendedDifficulty')
      expect(insights).toHaveProperty('strongConcepts')
      expect(insights).toHaveProperty('weakConcepts')
      expect(insights).toHaveProperty('nextMilestone')

      expect(typeof insights.dropoutRisk).toBe('number')
      expect(insights.dropoutRisk).toBeGreaterThanOrEqual(0)
      expect(insights.dropoutRisk).toBeLessThanOrEqual(1)
    })
  })

  describe('content indexing', () => {
    beforeEach(async () => {
      await mlService.initialize()
    })

    it('should index content successfully', async () => {
      const content = {
        id: 'content-123',
        title: 'Traffic Sign Recognition',
        description: 'Learn to identify common traffic signs',
        conceptKey: 'traffic-signs',
        difficulty: 0.6,
        contentType: 'question',
        tags: ['signs', 'recognition', 'visual'],
      }

      await expect(mlService.indexContent(content)).resolves.not.toThrow()
    })
  })

  describe('user profile updates', () => {
    beforeEach(async () => {
      await mlService.initialize()
    })

    it('should update user profile successfully', async () => {
      const userId = 'test-user-123'
      const learningHistory = [{ conceptKey: 'traffic-signs', score: 0.8, timestamp: new Date() }]
      const preferences = { learningStyle: 'visual', preferredDifficulty: 0.6 }
      const knowledgeStates = { 'traffic-signs': 0.8, 'road-rules': 0.4 }

      await expect(
        mlService.updateUserProfile(userId, learningHistory, preferences, knowledgeStates),
      ).resolves.not.toThrow()
    })
  })

  describe('health monitoring', () => {
    it('should return health status', () => {
      const health = mlService.getHealthStatus()

      expect(health).toHaveProperty('initialized')
      expect(health).toHaveProperty('modelsLoaded')
      expect(health).toHaveProperty('vectorIndexStats')
      expect(typeof health.initialized).toBe('boolean')
      expect(typeof health.modelsLoaded).toBe('number')
    })
  })

  describe('error handling', () => {
    it('should handle service not initialized errors', async () => {
      const uninitializedService = new MLService()

      await expect(
        uninitializedService.getEnhancedRecommendations('user', 'concept', {}),
      ).rejects.toThrow('ML Service not initialized')

      await expect(uninitializedService.getUserMLInsights('user', {}, {}, [])).rejects.toThrow(
        'ML Service not initialized',
      )
    })

    it('should handle invalid input gracefully', async () => {
      await mlService.initialize()

      // Test with null/undefined inputs
      const recommendations = await mlService.getEnhancedRecommendations(
        '',
        '',
        null as any,
        undefined as any,
        { maxItems: 0 },
      )

      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('performance', () => {
    beforeEach(async () => {
      await mlService.initialize()
    })

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        mlService.getEnhancedRecommendations(
          `user-${i}`,
          'traffic-signs',
          { currentMastery: 0.5 },
          {},
          { maxItems: 3 },
        ),
      )

      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should complete recommendations within reasonable time', async () => {
      const startTime = Date.now()

      await mlService.getEnhancedRecommendations(
        'test-user',
        'traffic-signs',
        { currentMastery: 0.5 },
        {},
        { maxItems: 10 },
      )

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})
