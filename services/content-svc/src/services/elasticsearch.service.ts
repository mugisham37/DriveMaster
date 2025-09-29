import { Client } from '@elastic/elasticsearch'

export interface ElasticsearchConfig {
  node: string
  auth?: {
    username: string
    password: string
  }
}

export interface SearchDocument {
  entityType: string
  entityId: string
  title: string
  content: string
  keywords: string[]
  tags: string[]
  categoryKey?: string
  conceptKey?: string
  difficulty?: number
  successRate?: number
  engagementScore?: number
  itemType?: string
  status: string
  isActive: boolean
  publishedAt?: Date | null
  createdAt: Date | null
  boost?: number
  quality?: number
  popularity?: number
}

export interface SearchQuery {
  query: string
  entityTypes?: string[]
  categoryKeys?: string[]
  conceptKeys?: string[]
  difficulty?: { min: number; max: number }
  tags?: string[]
  itemTypes?: string[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'difficulty' | 'popularity' | 'created' | 'updated'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  hits: Array<{
    id: string
    type: string
    score: number
    source: any
    highlight?: any
  }>
  total: number
  aggregations?: any
  took: number
}

export class ElasticsearchService {
  private client: Client
  private indexName: string

  constructor(config: ElasticsearchConfig, indexName = 'drivemaster_content') {
    this.client = new Client(config)
    this.indexName = indexName
  }

  async initialize() {
    try {
      // Check if index exists
      const indexExists = await this.client.indices.exists({ index: this.indexName })

      if (!indexExists) {
        await this.createIndex()
      } else {
        // Update mapping if needed
        await this.updateMapping()
      }
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error)
      throw error
    }
  }

  private async createIndex() {
    const mapping = {
      mappings: {
        properties: {
          entityType: { type: 'keyword' },
          entityId: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'search_as_you_type' },
            },
          },
          content: {
            type: 'text',
            analyzer: 'standard',
          },
          keywords: { type: 'keyword' },
          tags: { type: 'keyword' },
          categoryKey: { type: 'keyword' },
          conceptKey: { type: 'keyword' },
          difficulty: { type: 'float' },
          successRate: { type: 'float' },
          engagementScore: { type: 'float' },
          itemType: { type: 'keyword' },
          status: { type: 'keyword' },
          isActive: { type: 'boolean' },
          publishedAt: { type: 'date' },
          createdAt: { type: 'date' },
          boost: { type: 'float' },
          quality: { type: 'float' },
          popularity: { type: 'float' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            content_analyzer: {
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'stemmer'],
            },
          },
        },
      },
    }

    await this.client.indices.create({
      index: this.indexName,
      ...mapping,
    })
  }

  private async updateMapping() {
    const mapping = {
      properties: {
        entityType: { type: 'keyword' },
        entityId: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
            suggest: { type: 'search_as_you_type' },
          },
        },
        content: {
          type: 'text',
          analyzer: 'standard',
        },
        keywords: { type: 'keyword' },
        tags: { type: 'keyword' },
        categoryKey: { type: 'keyword' },
        conceptKey: { type: 'keyword' },
        difficulty: { type: 'float' },
        successRate: { type: 'float' },
        engagementScore: { type: 'float' },
        itemType: { type: 'keyword' },
        status: { type: 'keyword' },
        isActive: { type: 'boolean' },
        publishedAt: { type: 'date' },
        createdAt: { type: 'date' },
        boost: { type: 'float' },
        quality: { type: 'float' },
        popularity: { type: 'float' },
      },
    }

    try {
      await this.client.indices.putMapping({
        index: this.indexName,
        ...mapping,
      })
    } catch (error) {
      // Ignore mapping conflicts for existing fields
      console.warn('Mapping update warning:', error)
    }
  }

  async indexDocument(document: SearchDocument) {
    try {
      await this.client.index({
        index: this.indexName,
        id: `${document.entityType}_${document.entityId}`,
        document: {
          ...document,
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Failed to index document:', error)
      throw error
    }
  }

  async removeDocument(entityType: string, entityId: string) {
    try {
      await this.client.delete({
        index: this.indexName,
        id: `${entityType}_${entityId}`,
      })
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        console.error('Failed to remove document:', error)
        throw error
      }
    }
  }

  async search(searchParams: SearchQuery): Promise<SearchResult> {
    try {
      // Build Elasticsearch query
      const must: any[] = []
      const filter: any[] = []

      // Main search query
      if (searchParams.query) {
        must.push({
          multi_match: {
            query: searchParams.query,
            fields: ['title^3', 'content^2', 'keywords^2', 'tags'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        })
      }

      // Filters
      filter.push({ term: { isActive: true } })

      if (searchParams.entityTypes) {
        filter.push({ terms: { entityType: searchParams.entityTypes } })
      }

      if (searchParams.categoryKeys) {
        filter.push({ terms: { categoryKey: searchParams.categoryKeys } })
      }

      if (searchParams.conceptKeys) {
        filter.push({ terms: { conceptKey: searchParams.conceptKeys } })
      }

      if (searchParams.difficulty) {
        filter.push({
          range: {
            difficulty: {
              gte: searchParams.difficulty.min,
              lte: searchParams.difficulty.max,
            },
          },
        })
      }

      if (searchParams.tags) {
        filter.push({ terms: { tags: searchParams.tags } })
      }

      if (searchParams.itemTypes) {
        filter.push({ terms: { itemType: searchParams.itemTypes } })
      }

      // Sort configuration
      let sort: any[] = []

      switch (searchParams.sortBy) {
        case 'relevance':
          sort = [{ _score: { order: searchParams.sortOrder || 'desc' } }]
          break
        case 'difficulty':
          sort = [{ difficulty: { order: searchParams.sortOrder || 'desc' } }]
          break
        case 'popularity':
          sort = [{ popularity: { order: searchParams.sortOrder || 'desc' } }]
          break
        case 'created':
          sort = [{ createdAt: { order: searchParams.sortOrder || 'desc' } }]
          break
        case 'updated':
          sort = [{ updatedAt: { order: searchParams.sortOrder || 'desc' } }]
          break
      }

      const searchQuery = {
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              filter,
            },
          },
          sort,
          from: searchParams.offset || 0,
          size: searchParams.limit || 20,
          highlight: {
            fields: {
              title: {},
              content: {
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
          aggs: {
            categories: {
              terms: { field: 'categoryKey', size: 10 },
            },
            concepts: {
              terms: { field: 'conceptKey', size: 20 },
            },
            itemTypes: {
              terms: { field: 'itemType', size: 10 },
            },
            difficultyRange: {
              histogram: {
                field: 'difficulty',
                interval: 0.1,
              },
            },
          },
        },
      }

      const response = await this.client.search(searchQuery)

      return {
        hits: response.hits.hits.map((hit: any) => ({
          id: hit._source.entityId,
          type: hit._source.entityType,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight,
        })),
        total:
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value || 0,
        aggregations: response.aggregations,
        took: response.took,
      }
    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  async bulkIndex(documents: SearchDocument[]) {
    if (documents.length === 0) return

    const body = documents.flatMap((doc) => [
      { index: { _index: this.indexName, _id: `${doc.entityType}_${doc.entityId}` } },
      { ...doc, updatedAt: new Date().toISOString() },
    ])

    try {
      const response = await this.client.bulk({ body })

      if (response.errors) {
        console.error(
          'Bulk indexing errors:',
          response.items.filter((item) => item.index?.error),
        )
      }

      return response
    } catch (error) {
      console.error('Bulk indexing failed:', error)
      throw error
    }
  }

  async reindex() {
    try {
      // Delete existing index
      await this.client.indices.delete({ index: this.indexName })

      // Recreate index
      await this.createIndex()

      console.log('Elasticsearch index recreated successfully')
    } catch (error) {
      console.error('Reindexing failed:', error)
      throw error
    }
  }

  async getHealth() {
    try {
      const health = await this.client.cluster.health()
      const indexStats = await this.client.indices.stats({ index: this.indexName })

      return {
        cluster: health,
        index: indexStats.indices?.[this.indexName] || null,
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return null
    }
  }
}
