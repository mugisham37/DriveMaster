import { Client } from '@elastic/elasticsearch'
import type { ElasticsearchConfig } from './environment'
export interface ElasticsearchConnection {
  client: Client
  close: () => Promise<void>
}
export declare function createElasticsearchConnection(
  config: ElasticsearchConfig,
): ElasticsearchConnection
export declare function checkElasticsearchHealth(client: Client): Promise<boolean>
export declare class IndexManager {
  private client
  constructor(client: Client)
  createIndex(
    name: string,
    mapping: Record<string, any>,
    settings?: Record<string, any>,
  ): Promise<boolean>
  deleteIndex(name: string): Promise<boolean>
  indexExists(name: string): Promise<boolean>
}
export declare class SearchManager {
  private client
  constructor(client: Client)
  search<T>(index: string, query: Record<string, any>): Promise<T[]>
  index<T>(index: string, id: string, document: T): Promise<boolean>
  bulkIndex<T>(
    index: string,
    documents: Array<{
      id: string
      document: T
    }>,
  ): Promise<boolean>
  delete(index: string, id: string): Promise<boolean>
}
//# sourceMappingURL=elasticsearch.d.ts.map
