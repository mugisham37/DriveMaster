import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ElasticsearchService } from '../services/elasticsearch.service.js'

// Mock Elasticsearch client
const mockClient = {
  indices: {
    exists: vi.fn(),
    create: vi.fn(),
    putMapping: vi.fn(),
    delete: vi.fn(),
    stats: vi.fn(),
  },
  index: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
  bulk: vi.fn(),
  cluster: {
    health: vi.fn(),
  },
}

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => mockClient),
}))

describe('ElasticsearchService', () => {
  let esService: ElasticsearchService

  beforeEach(() => {
    esService = new ElasticsearchService({
      node: 'http://localhost:9200',
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create index if it does not exist', async () => {
      mockClient.indices.exists.mockResolvedValue(false)
      mockClient.indices.create.mockResolvedValue({ acknowledged: true })

      await esService.initialize()

      expect(mockClient.indices.exists).toHaveBeenCalledWith({
        index: 'drivemaster_content',
      })
      expect(mockClient.indices.create).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        mappings: expect.any(Object),
        settings: expect.any(Object),
      })
    })

    it('should update mapping if index exists', async () => {
      mockClient.indices.exists.mockResolvedValue(true)
      mockClient.indices.putMapping.mockResolvedValue({ acknowledged: true })

      await esService.initialize()

      expect(mockClient.indices.exists).toHaveBeenCalled()
      expect(mockClient.indices.putMapping).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        properties: expect.any(Object),
      })
    })
  })

  describe('Document Operations', () => {
    it('should index a document successfully', async () => {
      const document = {
        entityType: 'item',
        entityId: 'item-1',
        title: 'Test Item',
        content: 'Test content',
        keywords: ['test'],
        tags: ['sample'],
        status: 'PUBLISHED',
        isActive: true,
        createdAt: new Date(),
      }

      mockClient.index.mockResolvedValue({
        _id: 'item_item-1',
        result: 'created',
      })

      await esService.indexDocument(document)

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        id: 'item_item-1',
        document: expect.objectContaining({
          ...document,
          updatedAt: expect.any(String),
        }),
      })
    })

    it('should remove a document successfully', async () => {
      mockClient.delete.mockResolvedValue({
        _id: 'item_item-1',
        result: 'deleted',
      })

      await esService.removeDocument('item', 'item-1')

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        id: 'item_item-1',
      })
    })

    it('should handle document not found when removing', async () => {
      const error = new Error('Not found')
      error.meta = { statusCode: 404 }
      mockClient.delete.mockRejectedValue(error)

      await expect(esService.removeDocument('item', 'item-1')).resolves.not.toThrow()
    })
  })

  describe('Search Operations', () => {
    it('should perform basic search', async () => {
      const searchParams = {
        query: 'traffic signs',
        limit: 10,
        offset: 0,
      }

      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                entityId: 'item-1',
                entityType: 'item',
                title: 'Traffic Signs',
                content: 'Learn about traffic signs',
              },
              _score: 1.5,
              highlight: {
                title: ['<em>Traffic</em> <em>Signs</em>'],
              },
            },
          ],
          total: { value: 1 },
        },
        aggregations: {
          categories: {
            buckets: [{ key: 'traffic_signs', doc_count: 1 }],
          },
        },
        took: 15,
      }

      mockClient.search.mockResolvedValue(mockResponse)

      const result = await esService.search(searchParams)

      expect(result.hits).toHaveLength(1)
      expect(result.hits[0]).toMatchObject({
        id: 'item-1',
        type: 'item',
        score: 1.5,
      })
      expect(result.total).toBe(1)
      expect(result.took).toBe(15)
    })

    it('should apply filters in search', async () => {
      const searchParams = {
        query: 'test',
        entityTypes: ['item'],
        categoryKeys: ['traffic_signs'],
        difficulty: { min: 0.3, max: 0.7 },
        tags: ['beginner'],
        limit: 20,
        offset: 0,
      }

      mockClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {},
        took: 5,
      })

      await esService.search(searchParams)

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        body: expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.any(Object),
                }),
              ]),
              filter: expect.arrayContaining([
                { term: { isActive: true } },
                { terms: { entityType: ['item'] } },
                { terms: { categoryKey: ['traffic_signs'] } },
                { terms: { tags: ['beginner'] } },
                {
                  range: {
                    difficulty: {
                      gte: 0.3,
                      lte: 0.7,
                    },
                  },
                },
              ]),
            },
          },
          from: 0,
          size: 20,
        }),
      })
    })

    it('should handle different sort options', async () => {
      const searchParams = {
        query: 'test',
        sortBy: 'difficulty' as const,
        sortOrder: 'asc' as const,
      }

      mockClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {},
        took: 5,
      })

      await esService.search(searchParams)

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        body: expect.objectContaining({
          sort: [{ difficulty: { order: 'asc' } }],
        }),
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should perform bulk indexing', async () => {
      const documents = [
        {
          entityType: 'item',
          entityId: 'item-1',
          title: 'Item 1',
          content: 'Content 1',
          keywords: [],
          tags: [],
          status: 'PUBLISHED',
          isActive: true,
          createdAt: new Date(),
        },
        {
          entityType: 'item',
          entityId: 'item-2',
          title: 'Item 2',
          content: 'Content 2',
          keywords: [],
          tags: [],
          status: 'PUBLISHED',
          isActive: true,
          createdAt: new Date(),
        },
      ]

      mockClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { index: { _id: 'item_item-1', result: 'created' } },
          { index: { _id: 'item_item-2', result: 'created' } },
        ],
      })

      const result = await esService.bulkIndex(documents)

      expect(mockClient.bulk).toHaveBeenCalledWith({
        body: expect.arrayContaining([
          { index: { _index: 'drivemaster_content', _id: 'item_item-1' } },
          expect.objectContaining({
            entityType: 'item',
            entityId: 'item-1',
            updatedAt: expect.any(String),
          }),
          { index: { _index: 'drivemaster_content', _id: 'item_item-2' } },
          expect.objectContaining({
            entityType: 'item',
            entityId: 'item-2',
            updatedAt: expect.any(String),
          }),
        ]),
      })

      expect(result.errors).toBe(false)
    })

    it('should handle empty document array', async () => {
      const result = await esService.bulkIndex([])
      expect(mockClient.bulk).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('Health Check', () => {
    it('should return health information', async () => {
      const mockHealth = {
        cluster_name: 'elasticsearch',
        status: 'green',
        number_of_nodes: 1,
      }

      const mockStats = {
        indices: {
          drivemaster_content: {
            total: {
              docs: { count: 100 },
              store: { size_in_bytes: 1024 },
            },
          },
        },
      }

      mockClient.cluster.health.mockResolvedValue(mockHealth)
      mockClient.indices.stats.mockResolvedValue(mockStats)

      const result = await esService.getHealth()

      expect(result).toEqual({
        cluster: mockHealth,
        index: mockStats.indices.drivemaster_content,
      })
    })

    it('should handle health check errors', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection failed'))

      const result = await esService.getHealth()

      expect(result).toBeNull()
    })
  })

  describe('Reindexing', () => {
    it('should recreate index during reindexing', async () => {
      mockClient.indices.delete.mockResolvedValue({ acknowledged: true })
      mockClient.indices.create.mockResolvedValue({ acknowledged: true })

      await esService.reindex()

      expect(mockClient.indices.delete).toHaveBeenCalledWith({
        index: 'drivemaster_content',
      })
      expect(mockClient.indices.create).toHaveBeenCalledWith({
        index: 'drivemaster_content',
        mappings: expect.any(Object),
        settings: expect.any(Object),
      })
    })
  })
})
