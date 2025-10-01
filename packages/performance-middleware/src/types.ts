export interface PerformanceConfig {
  compression: {
    enabled: boolean
    threshold: number
    level: number
    algorithms: string[]
  }
  etag: {
    enabled: boolean
    weak: boolean
  }
  rateLimit: {
    enabled: boolean
    max: number
    timeWindow: number
    skipOnError: boolean
  }
  metrics: {
    enabled: boolean
    collectDefaultMetrics: boolean
    prefix: string
  }
  batching: {
    enabled: boolean
    maxBatchSize: number
    timeout: number
  }
  responseOptimization: {
    enabled: boolean
    minifyJson: boolean
    removeNullValues: boolean
  }
}

export interface RequestMetrics {
  startTime: number
  method: string
  route: string
  statusCode?: number
  responseTime?: number
  contentLength?: number
}

export interface BatchRequest {
  id: string
  method: string
  url: string
  headers: Record<string, string>
  body?: unknown
}

export interface BatchResponse {
  id: string
  statusCode: number
  headers: Record<string, string>
  body: unknown
}

export interface PerformanceMetrics {
  requestsTotal: number
  requestDuration: number[]
  requestsInFlight: number
  responseSize: number[]
  errorRate: number
  cacheHitRate: number
}
