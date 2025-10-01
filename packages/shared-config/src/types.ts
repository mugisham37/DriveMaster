// Common type definitions for shared-config package

// HTTP Request/Response types for logging
export interface HttpRequest {
  method: string
  url: string
  headers: Record<string, string | string[] | undefined>
  ip: string
}

export interface HttpResponse {
  statusCode: number
  getHeader: (name: string) => string | number | string[] | undefined
}

// Elasticsearch types
export interface ElasticsearchHit<T = unknown> {
  _source: T
  _id: string
  _score: number
}

export interface ElasticsearchResponse<T = unknown> {
  hits: {
    hits: ElasticsearchHit<T>[]
  }
}

export interface ElasticsearchBulkItem {
  index?: {
    error?: {
      type: string
      reason: string
    }
  }
}

export interface ElasticsearchBulkResponse {
  errors: boolean
  items: ElasticsearchBulkItem[]
}

// Redis types
export interface RedisOptions {
  host: string
  port: number
  db: number
  password?: string
  maxRetriesPerRequest: number
  enableReadyCheck: boolean
  lazyConnect: boolean
  keepAlive: number
  family: number
}

// Kafka types
export interface KafkaMessage {
  key?: Buffer | string | null
  value: Buffer | string | null
  timestamp?: string
  offset: string
}

// Logger types
export interface LoggerRequestSerializer {
  (req: HttpRequest): {
    method: string
    url: string
    headers: {
      'user-agent'?: string | string[]
      'content-type'?: string | string[]
    }
    remoteAddress: string
  }
}

export interface LoggerResponseSerializer {
  (res: HttpResponse): {
    statusCode: number
    headers: {
      'content-type'?: string | number | string[] | undefined
    }
  }
}

export interface RequestLoggerConfig {
  logger: unknown // pino.Logger type - using unknown to avoid any
  serializers: {
    req: LoggerRequestSerializer
    res: LoggerResponseSerializer
  }
}
