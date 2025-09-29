import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentService } from '../services/content.service.js'

// Mock the database connection
vi.mock('../db/connection.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      categories: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      concepts: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      items: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
  categories: {
    key: 'key',
    id: 'id',
    isActive: 'isActive',
    order: 'order',
  },
  concepts: {
    key: 'key',
    id: 'id',
    categoryId: 'categoryId',
    isActive: 'isActive',
    order: 'order',
    name: 'name',
    difficulty: 'difficulty',
    totalItems: 'totalItems',
    updatedAt: 'updatedAt',
  },
  items: {
    slug: 'slug',
    conceptId: 'conceptId',
    isActive: 'isActive',
    status: 'status',
    type: 'type',
    difficulty: 'difficulty',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  conceptPrerequisites: {},
  searchIndex: {
    entityType: 'entityType',
    entityId: 'entityId',
    isIndexed: 'isIndexed',
    title: 'title',
    content: 'content',
    keywords: 'keywords',
    tags: 'tags',
    boost: 'boost',
    quality: 'quality',
    popularity: 'popularity',
    updatedAt: 'updatedAt',
  },
  contentAnalytics: {
    entityType: 'entityType',
    entityId: 'entityId',
    period: 'period',
    periodStart: 'periodStart',
    totalViews: 'totalViews',
    totalAttempts: 'totalAttempts',
    successfulAttempts: 'successfulAttempts',
    avgResponseTime: 'avgResponseTime',
    engagementScore: 'engagementScore',
  },
}))

describe('ContentService', () => {
  let contentService: ContentService
  let mockDb: any

  beforeEach(async () => {
    contentService = new ContentService()
    mockDb = vi.mocked(await import('../db/connection.js')).db
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Category Management', () => {
    it('should create a category successfully', async () => {
      const categoryData = {
        key: 'traffic_signs',
        name: 'Traffic Signs',
        description: 'Learn about traffic signs',
        order: 1,
      }

      // Mock database responses
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing category
          }),
        }),
      })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'cat-1',
              ...categoryData,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined), // Search index
        }),
      })

      const result = await contentService.createCategory(categoryData)

      expect(result).toMatchObject({
        id: 'cat-1',
        key: 'traffic_signs',
        name: 'Traffic Signs',
      })
    })

    it('should throw error for duplicate category key', async () => {
      const categoryData = {
        key: 'traffic_signs',
        name: 'Traffic Signs',
      }

      // Mock existing category
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      })

      await expect(contentService.createCategory(categoryData)).rejects.toThrow(
        'Category key already exists',
      )
    })

    it('should get categories with hierarchy', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          children: [],
          concepts: [],
        },
      ]

      mockDb.query.categories.findMany.mockResolvedValue(mockCategories)

      const result = await contentService.getCategories()

      expect(result).toEqual(mockCategories)
      expect(mockDb.query.categories.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        with: expect.objectContaining({
          children: expect.any(Object),
          concepts: expect.any(Object),
        }),
        orderBy: expect.any(Array),
      })
    })
  })

  describe('Concept Management', () => {
    it('should create a concept successfully', async () => {
      const conceptData = {
        key: 'stop_signs',
        name: 'Stop Signs',
        categoryId: 'cat-1',
        difficulty: 0.3,
      }

      // Mock no existing concept
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      // Mock category exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
          }),
        }),
      })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'concept-1',
              ...conceptData,
              learningGoals: [],
              tags: [],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined), // Search index
        }),
      })

      const result = await contentService.createConcept(conceptData)

      expect(result).toMatchObject({
        id: 'concept-1',
        key: 'stop_signs',
        name: 'Stop Signs',
      })
    })

    it('should throw error for invalid category', async () => {
      const conceptData = {
        key: 'stop_signs',
        name: 'Stop Signs',
        categoryId: 'invalid-cat',
      }

      // Mock no existing concept
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      // Mock category doesn't exist
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      await expect(contentService.createConcept(conceptData)).rejects.toThrow('Category not found')
    })
  })

  describe('Item Management', () => {
    it('should create an item successfully', async () => {
      const itemData = {
        title: 'Stop Sign Question',
        body: 'What does a stop sign mean?',
        conceptId: 'concept-1',
        type: 'MULTIPLE_CHOICE' as const,
        correctAnswer: 'A',
      }

      // Mock concept exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'concept-1' }]),
          }),
        }),
      })

      // Mock slug generation (no existing item)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'item-1',
              slug: 'stop-sign-question',
              ...itemData,
              options: {},
              hints: [],
              feedback: {},
              tags: [],
              keywords: [],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      })

      // Mock concept update
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      // Mock search index
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const result = await contentService.createItem(itemData)

      expect(result).toMatchObject({
        id: 'item-1',
        slug: 'stop-sign-question',
        title: 'Stop Sign Question',
      })
    })
  })

  describe('Content Search', () => {
    it('should search content successfully', async () => {
      const searchParams = {
        query: 'stop sign',
        limit: 10,
        offset: 0,
      }

      const mockSearchResults = [
        {
          entityType: 'item',
          entityId: 'item-1',
          title: 'Stop Sign Question',
          content: 'What does a stop sign mean?',
          keywords: ['stop', 'sign'],
          tags: ['traffic'],
          boost: 1.0,
          quality: 0.8,
          popularity: 0.6,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockSearchResults),
              }),
            }),
          }),
        }),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })

      const result = await contentService.searchContent(searchParams)

      expect(result.hits).toHaveLength(1)
      expect(result.hits[0]).toMatchObject({
        id: 'item-1',
        type: 'item',
      })
      expect(result.total).toBe(1)
    })
  })

  describe('Content Analytics', () => {
    it('should track content performance', async () => {
      const metrics = {
        views: 10,
        attempts: 5,
        successfulAttempts: 4,
        responseTime: 2500,
        engagement: 0.8,
      }

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })

      await expect(
        contentService.trackContentPerformance('item', 'item-1', metrics),
      ).resolves.not.toThrow()
    })

    it('should get content analytics', async () => {
      const mockAnalytics = [
        {
          entityType: 'item',
          entityId: 'item-1',
          period: 'daily',
          periodStart: new Date('2024-01-01'),
          totalViews: 100,
          totalAttempts: 50,
          successfulAttempts: 40,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockAnalytics),
          }),
        }),
      })

      const result = await contentService.getContentAnalytics('item', 'item-1')

      expect(result).toEqual(mockAnalytics)
    })
  })
})
