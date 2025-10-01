import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock TensorFlow.js first
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('cpu'),
  sequential: vi.fn().mockReturnValue({
    predict: vi.fn().mockReturnValue({
      data: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
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
}))

// Mock Pinecone
const mockPineconeIndex = {
  upsert: vi.fn().mockResolvedValue({}),
  query: vi.fn().mockResolvedValue({
    matches: [
      {
        id: 'content1',
        score: 0.85,
        metadata: {
          contentId: 'content1',
          conceptKey: 'traffic-signs',
          difficulty: 0.6,
          contentType: 'question',
          tags: ['signs', 'recognition'],
        },
      },
      {
        id: 'content2',
        score: 0.78,
        metadata: {
          contentId: 'content2',
          conceptKey: 'traffic-signs',
          difficulty: 0.4,
          contentType: 'explanation',
          tags: ['signs', 'theory'],
        },
      },
    ],
  }),
  fetch: vi.fn().mockResolvedValue({
    vectors: {
      user1: {
        values: new Array(384).fill(0.1),
        metadata: { userId: 'user1' },
      },
    },
  }),
  describeIndexStats: vi.fn().mockResolvedValue({
    totalVectorCount: 100,
  }),
  deleteOne: vi.fn().mockResolvedValue({}),
}

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation(() => ({
    listIndexes: vi.fn().mockResolvedValue({ indexes: [] }),
    createIndex: vi.fn().mockResolvedValue({}),
    Index: vi.fn().mockReturnValue(mockPineconeIndex),
  })),
}))

// Import after mocking
const { VectorSearchEngine } = await import('../vector-engine')

describe('VectorSearchEngine', () => {
  let vectorEngine: VectorSearchEngine

  beforeEach(async () => {
    vectorEngine = new VectorSearchEngine('test-api-key', 'test-environment')
    await vectorEngine.initialize()
  })

  afterEach(() => {
    vectorEngine.dispose()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const engine = new VectorSearchEngine('test-key', 'test-env')
      await expect(engine.initialize()).resolves.not.toThrow()
    })
  })

  describe('content embedding generation', () => {
    it('should generate content embedding', async () => {
      const content = {
        id: 'content1',
        title: 'Traffic Sign Recognition',
        description: 'Learn to identify common traffic signs',
        conceptKey: 'traffic-signs',
        difficulty: 0.6,
        contentType: 'question',
        tags: ['signs', 'recognition'],
      }

      const embedding = await vectorEngine.generateContentEmbedding(content)

      expect(embedding.id).toBe('content1')
      expect(embedding.values).toHaveLength(384)
      expect(embedding.metadata.conceptKey).toBe('traffic-signs')
      expect(embedding.metadata.difficulty).toBe(0.6)
    })
  })

  describe('user profile embedding generation', () => {
    it('should generate user profile embedding', async () => {
      const userProfile = {
        userId: 'user1',
        learningHistory: [],
        preferences: { learningStyle: 'visual' },
        knowledgeStates: { 'traffic-signs': 0.8, 'road-rules': 0.4 },
      }

      const embedding = await vectorEngine.generateUserProfileEmbedding(userProfile)

      expect(embedding.id).toBe('user1')
      expect(embedding.values).toHaveLength(384)
      expect(embedding.metadata.userId).toBe('user1')
      expect(embedding.metadata.strongConcepts).toContain('traffic-signs')
      expect(embedding.metadata.weakConcepts).toContain('road-rules')
    })
  })

  describe('content indexing', () => {
    it('should index content successfully', async () => {
      const contentEmbedding = {
        id: 'content1',
        values: new Array(384).fill(0.1),
        metadata: {
          contentId: 'content1',
          conceptKey: 'traffic-signs',
          difficulty: 0.6,
          contentType: 'question' as const,
          tags: ['signs'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      await expect(vectorEngine.indexContent(contentEmbedding)).resolves.not.toThrow()
      expect(mockPineconeIndex.upsert).toHaveBeenCalled()
    })

    it('should batch index multiple content items', async () => {
      const contentEmbeddings = Array.from({ length: 5 }, (_, i) => ({
        id: `content${i}`,
        values: new Array(384).fill(0.1),
        metadata: {
          contentId: `content${i}`,
          conceptKey: 'traffic-signs',
          difficulty: 0.6,
          contentType: 'question' as const,
          tags: ['signs'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }))

      await expect(vectorEngine.batchIndexContent(contentEmbeddings)).resolves.not.toThrow()
      expect(mockPineconeIndex.upsert).toHaveBeenCalled()
    })
  })

  describe('similarity search', () => {
    it('should find similar content', async () => {
      const query = {
        userId: 'user1',
        conceptKey: 'traffic-signs',
        topK: 5,
      }

      const results = await vectorEngine.findSimilarContent(query)

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('score')
      expect(results[0]).toHaveProperty('metadata')
    })

    it('should find similar users', async () => {
      const results = await vectorEngine.findSimilarUsers('user1', 5)

      expect(Array.isArray(results)).toBe(true)
      expect(mockPineconeIndex.query).toHaveBeenCalled()
    })
  })

  describe('content recommendations', () => {
    it('should get hybrid content recommendations', async () => {
      const query = {
        userId: 'user1',
        conceptKey: 'traffic-signs',
        topK: 5,
      }

      const recommendations = await vectorEngine.getContentRecommendations(query)

      expect(recommendations).toHaveProperty('contentBased')
      expect(recommendations).toHaveProperty('collaborative')
      expect(recommendations).toHaveProperty('hybrid')
      expect(Array.isArray(recommendations.hybrid)).toBe(true)
    })
  })

  describe('user profile management', () => {
    it('should update user profile', async () => {
      const userProfile = {
        userId: 'user1',
        learningHistory: [],
        preferences: { learningStyle: 'visual' },
        knowledgeStates: { 'traffic-signs': 0.8 },
      }

      await expect(vectorEngine.updateUserProfile(userProfile)).resolves.not.toThrow()
    })
  })

  describe('content management', () => {
    it('should delete content from index', async () => {
      await expect(vectorEngine.deleteContent('content1')).resolves.not.toThrow()
      expect(mockPineconeIndex.deleteOne).toHaveBeenCalledWith('content1')
    })

    it('should delete user profile from index', async () => {
      await expect(vectorEngine.deleteUserProfile('user1')).resolves.not.toThrow()
      expect(mockPineconeIndex.deleteOne).toHaveBeenCalledWith('user1')
    })
  })

  describe('index statistics', () => {
    it('should get index statistics', async () => {
      const stats = await vectorEngine.getIndexStats()

      expect(stats).toHaveProperty('contentIndex')
      expect(stats).toHaveProperty('userIndex')
    })
  })

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const failingEngine = new VectorSearchEngine('invalid-key', 'invalid-env')

      // Mock to throw error
      mockPineconeIndex.query.mockRejectedValueOnce(new Error('API Error'))

      await expect(failingEngine.initialize()).resolves.not.toThrow()
    })

    it('should handle missing user embeddings', async () => {
      mockPineconeIndex.fetch.mockResolvedValueOnce({ vectors: {} })

      const query = {
        userId: 'non-existent-user',
        conceptKey: 'traffic-signs',
        topK: 5,
      }

      await expect(vectorEngine.findSimilarContent(query)).rejects.toThrow()
    })
  })

  describe('performance', () => {
    it('should handle concurrent queries efficiently', async () => {
      const queries = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        conceptKey: 'traffic-signs',
        topK: 3,
      }))

      const promises = queries.map((query) => vectorEngine.findSimilarContent(query))
      const results = await Promise.allSettled(promises)

      // At least some should succeed (depending on mocked user data)
      const successful = results.filter((r) => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(0)
    })
  })
})
