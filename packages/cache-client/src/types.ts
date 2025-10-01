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
    checkPeriod: z.number().default(120), // 2 minutes
    useClones: z.boolean().default(false),
  }),
  compression: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(1024), // 1KB
    algorithm: z.enum(['deflate']).default('deflate'),
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
  ttl?: number | undefined
  layer?: CacheLayer | undefined
  compress?: boolean | undefined
  tags?: string[] | undefined
  version?: string | undefined
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
  tags?: string[] | undefined
  version?: string | undefined
  compressed?: boolean | undefined
}

export interface BatchOperation {
  key: string
  value?: any
  options?: CacheOptions | undefined
}

export interface CacheInvalidationOptions {
  tags?: string[] | undefined
  pattern?: string | undefined
  version?: string | undefined
}
