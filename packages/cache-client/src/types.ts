import { z } from 'zod'

export const CacheConfigSchema = z.object({
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
    keyPrefix: z.string().default('cache:'),
    maxRetriesPerRequest: z.number().default(3),
    retryDelayOnFailover: z.number().default(100),
    enableOfflineQueue: z.boolean().default(false),
    lazyConnect: z.boolean().default(true),
  }),
  memory: z.object({
    maxKeys: z.number().default(1000),
    ttl: z.number().default(600), // 10 minutes
    checkperiod: z.number().default(120), // 2 minutes
    useClones: z.boolean().default(false),
  }),
  compression: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(1024), // 1KB
    algorithm: z.enum(['lz4']).default('lz4'),
  }),
  performance: z.object({
    batchSize: z.number().default(100),
    pipelineThreshold: z.number().default(10),
    enableMetrics: z.boolean().default(true),
  }),
})

export type CacheConfig = z.infer<typeof CacheConfigSchema>

export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  BOTH = 'both',
}

export interface CacheOptions {
  ttl?: number
  layer?: CacheLayer
  compress?: boolean
  tags?: string[]
  version?: string
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  avgResponseTime: number
}

export interface CacheEntry<T = any> {
  value: T
  ttl: number
  createdAt: number
  tags?: string[]
  version?: string
  compressed?: boolean
}

export interface BatchOperation {
  key: string
  value?: any
  options?: CacheOptions
}

export interface CacheInvalidationOptions {
  tags?: string[]
  pattern?: string
  version?: string
}
