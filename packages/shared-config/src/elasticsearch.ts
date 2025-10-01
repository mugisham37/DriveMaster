import { Client } from '@elastic/elasticsearch'

import type { ElasticsearchConfig } from './environment'
import type { ElasticsearchResponse, ElasticsearchBulkResponse } from './types'

// Simple logger for internal use - in production, inject proper logger
const logger = {
  error: (message: string, error?: unknown): void => {
    // In production, this should use the proper logger instance
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error(message, error)
    }
  },
  info: (message: string): void => {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(message)
    }
  },
}

export interface ElasticsearchConnection {
  client: Client
  close: () => Promise<void>
}

export function createElasticsearchConnection(
  config: ElasticsearchConfig,
): ElasticsearchConnection {
  const client = new Client({
    node: config.node,
    maxRetries: config.maxRetries,
    requestTimeout: config.requestTimeout,
    pingTimeout: config.pingTimeout,
    // Performance optimizations
    compression: true,
    // Connection pool settings
    resurrectStrategy: 'ping',
    // Sniffing disabled for development
    sniffOnStart: false,
    sniffInterval: false,
    sniffOnConnectionFault: false,
  })

  return {
    client,
    close: async (): Promise<void> => {
      await client.close()
    },
  }
}

// Elasticsearch health check utility
export async function checkElasticsearchHealth(client: Client): Promise<boolean> {
  try {
    const response = await client.cluster.health()
    return response.status === 'green' || response.status === 'yellow'
  } catch (error) {
    logger.error('Elasticsearch health check failed:', error)
    return false
  }
}

// Index management utilities
export class IndexManager {
  constructor(private client: Client) {}

  async createIndex(
    name: string,
    mapping: Record<string, unknown>,
    settings?: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const exists = await this.client.indices.exists({ index: name })
      if (exists) {
        logger.info(`Index ${name} already exists`)
        return true
      }

      await this.client.indices.create({
        index: name,
        body: {
          settings: settings ?? {
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.mapping.total_fields.limit': 2000,
          },
          mappings: mapping,
        },
      })

      logger.info(`Index ${name} created successfully`)
      return true
    } catch (error) {
      logger.error(`Failed to create index ${name}:`, error)
      return false
    }
  }

  async deleteIndex(name: string): Promise<boolean> {
    try {
      await this.client.indices.delete({ index: name })
      logger.info(`Index ${name} deleted successfully`)
      return true
    } catch (error) {
      logger.error(`Failed to delete index ${name}:`, error)
      return false
    }
  }

  async indexExists(name: string): Promise<boolean> {
    try {
      return await this.client.indices.exists({ index: name })
    } catch (error) {
      logger.error(`Failed to check if index ${name} exists:`, error)
      return false
    }
  }
}

// Search utilities
export class SearchManager {
  constructor(private client: Client) {}

  async search<T>(index: string, query: Record<string, unknown>): Promise<T[]> {
    try {
      const response = (await this.client.search({
        index,
        body: query,
      })) as ElasticsearchResponse<T>

      return response.hits.hits.map((hit) => ({
        ...hit._source,
        _id: hit._id,
        _score: hit._score,
      })) as T[]
    } catch (error) {
      logger.error('Search error:', error)
      return []
    }
  }

  async index<T>(index: string, id: string, document: T): Promise<boolean> {
    try {
      await this.client.index({
        index,
        id,
        body: document,
        refresh: 'wait_for',
      })
      return true
    } catch (error) {
      logger.error('Indexing error:', error)
      return false
    }
  }

  async bulkIndex<T>(
    index: string,
    documents: Array<{ id: string; document: T }>,
  ): Promise<boolean> {
    try {
      const body = documents.flatMap(({ id, document }) => [
        { index: { _index: index, _id: id } },
        document,
      ])

      const response = (await this.client.bulk({
        body,
        refresh: 'wait_for',
      })) as ElasticsearchBulkResponse

      if (response.errors) {
        // Use structured logging instead of console
        const errors = response.items.filter((item) => item.index?.error)
        throw new Error(`Bulk indexing errors: ${JSON.stringify(errors)}`)
      }

      return true
    } catch (error) {
      logger.error('Bulk indexing error:', error)
      return false
    }
  }

  async delete(index: string, id: string): Promise<boolean> {
    try {
      await this.client.delete({
        index,
        id,
        refresh: 'wait_for',
      })
      return true
    } catch (error) {
      logger.error('Delete error:', error)
      return false
    }
  }
}
