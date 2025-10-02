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

export interface SearchHit {
  id: string
  type: string
  score: number
  source: Record<string, unknown>
  highlight?: Record<string, string[]> | undefined
}

export interface SearchResult {
  hits: SearchHit[]
  total: number
  aggregations?: Record<string, unknown> | undefined
  took: number
}

export class ElasticsearchService {
  private client: Client
  private indexName: string

  constructor(config: ElasticsearchConfig, indexName = 'drivemaster_content') {
    this.client = new Client(config)
    this.indexName = indexName
  }

  async initialize(): Promise<void> {
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
      // Using console.error is acceptable for initialization errors
      // eslint-disable-next-line no-console
      console.error('Failed to initialize Elasticsearch:', error)
      throw error
    }
  }

  private async createIndex(): Promise<void> {
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

  private async updateMapping(): Promise<void> {
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
      // Ignore mapping conflicts for existing fields - this is expected behavior
      // eslint-disable-next-line no-console
      console.warn('Mapping update warning:', error)
    }
  }

  async indexDocument(document: SearchDocument): Promise<void> {
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
      // eslint-disable-next-line no-console
      console.error('Failed to index document:', error)
      throw error
    }
  }

  async removeDocument(entityType: string, entityId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: `${entityType}_${entityId}`,
      })
    } catch (error: unknown) {
      const esError = error as { meta?: { statusCode?: number } }
      if (esError.meta?.statusCode !== 404) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove document:', error)
        throw error
      }
    }
  }

  async search(searchParams: SearchQuery): Promise<SearchResult> {
    try {
      // Build Elasticsearch query
      const must: Record<string, unknown>[] = []
      const filter: Record<string, unknown>[] = []

      // Main search query
      if (searchParams.query.trim() !== '') {
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

      if (searchParams.entityTypes != null && searchParams.entityTypes.length > 0) {
        filter.push({ terms: { entityType: searchParams.entityTypes } })
      }

      if (searchParams.categoryKeys != null && searchParams.categoryKeys.length > 0) {
        filter.push({ terms: { categoryKey: searchParams.categoryKeys } })
      }

      if (searchParams.conceptKeys != null && searchParams.conceptKeys.length > 0) {
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

      if (searchParams.tags != null && searchParams.tags.length > 0) {
        filter.push({ terms: { tags: searchParams.tags } })
      }

      if (searchParams.itemTypes != null && searchParams.itemTypes.length > 0) {
        filter.push({ terms: { itemType: searchParams.itemTypes } })
      }

      // Sort configuration
      const sort: Record<string, unknown>[] = []

      switch (searchParams.sortBy) {
        case 'relevance':
          sort.push({ _score: { order: searchParams.sortOrder ?? 'desc' } })
          break
        case 'difficulty':
          sort.push({ difficulty: { order: searchParams.sortOrder ?? 'desc' } })
          break
        case 'popularity':
          sort.push({ popularity: { order: searchParams.sortOrder ?? 'desc' } })
          break
        case 'created':
          sort.push({ createdAt: { order: searchParams.sortOrder ?? 'desc' } })
          break
        case 'updated':
          sort.push({ updatedAt: { order: searchParams.sortOrder ?? 'desc' } })
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
          from: searchParams.offset ?? 0,
          size: searchParams.limit ?? 20,
          highlight: {
            fields: {
              title: {},
              content: {
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
          // cSpell:ignore aggs
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

      interface ElasticsearchHit {
        _source: Record<string, unknown>
        _score: number
        highlight?: Record<string, string[]>
      }

      const hits = response.hits.hits as ElasticsearchHit[]

      return {
        hits: hits.map((hit) => ({
          id: String(hit._source.entityId),
          type: String(hit._source.entityType),
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight,
        })),
        total:
          typeof response.hits.total === 'number'
            ? response.hits.total
            : (response.hits.total?.value ?? 0),
        aggregations: response.aggregations,
        took: response.took,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Search error:', error)
      throw error
    }
  }

  async bulkIndex(documents: SearchDocument[]): Promise<unknown> {
    if (documents.length === 0) return

    const body = documents.flatMap((doc) => [
      { index: { _index: this.indexName, _id: `${doc.entityType}_${doc.entityId}` } },
      { ...doc, updatedAt: new Date().toISOString() },
    ])

    try {
      const response = await this.client.bulk({ body })

      if (response.errors) {
        // eslint-disable-next-line no-console
        console.error(
          'Bulk indexing errors:',
          response.items.filter((item: { index?: { error?: unknown } }) => item.index?.error),
        )
      }

      return response
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Bulk indexing failed:', error)
      throw error
    }
  }

  async reindex(): Promise<void> {
    try {
      // Delete existing index
      await this.client.indices.delete({ index: this.indexName })

      // Recreate index
      await this.createIndex()

      // eslint-disable-next-line no-console
      console.log('Elasticsearch index recreated successfully')
    } catch (error) {
      // eslint-disable-next-line no-console
      // cSpell:ignore Reindexing
      // eslint-disable-next-line no-console
      console.error('Reindexing failed:', error)
      throw error
    }
  }

  async getHealth(): Promise<{
    cluster: unknown
    index: unknown
  } | null> {
    try {
      const health = await this.client.cluster.health()
      const indexStats = await this.client.indices.stats({ index: this.indexName })

      return {
        cluster: health,
        index: indexStats.indices?.[this.indexName] ?? null,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Health check failed:', error)
      return null
    }
  }
}
