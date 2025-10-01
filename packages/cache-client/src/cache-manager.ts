import Redis from 'ioredis'
import NodeCache from 'node-cache'
import * as pako from 'pako'
import {
  CacheConfig,
  CacheLayer,
  CacheOptions,
  CacheEntry,
  CacheMetrics,
  BatchOperation,
  CacheInvalidationOptions,
  CacheConfigSchema,
} from './types'
import { createCacheKey, isExpired, serializeValue, deserializeValue } from './utils'

export class CacheManager {
  private redis: Redis
  private memory: NodeCache
  private config: CacheConfig
  private metrics: CacheMetrics

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = CacheConfigSchema.parse(config)
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgResponseTime: 0,
    }

    this.initializeRedis()
    this.initializeMemoryCache()
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      keyPrefix: this.config.redis.keyPrefix,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
      enableOfflineQueue: this.config.redis.enableOfflineQueue,
      lazyConnect: this.config.redis.lazyConnect,
    })

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
      this.metrics.errors++
    })

    this.redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }

  private initializeMemoryCache(): void {
    this.memory = new NodeCache({
      maxKeys: this.config.memory.maxKeys,
      stdTTL: this.config.memory.ttl,
      checkperiod: this.config.memory.checkperiod,
      useClones: this.config.memory.useClones,
    })

    this.memory.on('expired', (key, value) => {
      console.debug(`Memory cache key expired: ${key}`)
    })
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now()
    const cacheKey = createCacheKey(key, options)

    try {
      let result: T | null = null

      // Try memory cache first if enabled
      if (options.layer !== CacheLayer.REDIS) {
        result = await this.getFromMemory<T>(cacheKey)
        if (result !== null) {
          this.updateMetrics('hit', startTime)
          return result
        }
      }

      // Try Redis cache if memory miss or Redis-only
      if (options.layer !== CacheLayer.MEMORY) {
        result = await this.getFromRedis<T>(cacheKey)
        if (result !== null) {
          // Store in memory for faster subsequent access
          if (options.layer === CacheLayer.BOTH) {
            await this.setInMemory(cacheKey, result, options)
          }
          this.updateMetrics('hit', startTime)
          return result
        }
      }

      this.updateMetrics('miss', startTime)
      return null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      this.metrics.errors++
      return null
    }
  }

  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now()
    const cacheKey = createCacheKey(key, options)

    try {
      const entry: CacheEntry<T> = {
        value,
        ttl: options.ttl || this.config.memory.ttl,
        createdAt: Date.now(),
        tags: options.tags,
        version: options.version,
        compressed: false,
      }

      // Compress if enabled and value is large enough
      if (this.shouldCompress(value, options)) {
        entry.value = await this.compressValue(value)
        entry.compressed = true
      }

      let success = true

      // Set in memory cache
      if (options.layer !== CacheLayer.REDIS) {
        success = (await this.setInMemory(cacheKey, entry, options)) && success
      }

      // Set in Redis cache
      if (options.layer !== CacheLayer.MEMORY) {
        success = (await this.setInRedis(cacheKey, entry, options)) && success
      }

      if (success) {
        this.updateMetrics('set', startTime)
      }

      return success
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      this.metrics.errors++
      return false
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now()
    const cacheKey = createCacheKey(key, options)

    try {
      let success = true

      // Delete from memory
      if (options.layer !== CacheLayer.REDIS) {
        this.memory.del(cacheKey)
      }

      // Delete from Redis
      if (options.layer !== CacheLayer.MEMORY) {
        const result = await this.redis.del(cacheKey)
        success = result > 0
      }

      if (success) {
        this.updateMetrics('delete', startTime)
      }

      return success
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      this.metrics.errors++
      return false
    }
  }

  async invalidate(options: CacheInvalidationOptions): Promise<number> {
    let deletedCount = 0

    try {
      // Invalidate by pattern
      if (options.pattern) {
        const keys = await this.redis.keys(options.pattern)
        if (keys.length > 0) {
          deletedCount += await this.redis.del(...keys)
        }
      }

      // Invalidate by tags (requires additional metadata storage)
      if (options.tags) {
        for (const tag of options.tags) {
          const tagKey = `tag:${tag}`
          const keys = await this.redis.smembers(tagKey)
          if (keys.length > 0) {
            deletedCount += await this.redis.del(...keys)
            await this.redis.del(tagKey)
          }
        }
      }

      // Invalidate by version
      if (options.version) {
        const pattern = `*:v:${options.version}:*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          deletedCount += await this.redis.del(...keys)
        }
      }

      return deletedCount
    } catch (error) {
      console.error('Cache invalidation error:', error)
      this.metrics.errors++
      return 0
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    const results: (T | null)[] = []

    // Use pipeline for better performance
    if (keys.length >= this.config.performance.pipelineThreshold) {
      return this.pipelineGet<T>(keys, options)
    }

    // Sequential get for smaller batches
    for (const key of keys) {
      const result = await this.get<T>(key, options)
      results.push(result)
    }

    return results
  }

  async mset<T = any>(operations: BatchOperation[], options: CacheOptions = {}): Promise<boolean> {
    if (operations.length >= this.config.performance.pipelineThreshold) {
      return this.pipelineSet(operations, options)
    }

    let success = true
    for (const op of operations) {
      const result = await this.set(op.key, op.value, { ...options, ...op.options })
      success = success && result
    }

    return success
  }

  private async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memory.get<CacheEntry<T>>(key)
    if (!entry) return null

    if (isExpired(entry)) {
      this.memory.del(key)
      return null
    }

    return entry.compressed ? await this.decompressValue(entry.value) : entry.value
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key)
    if (!data) return null

    const entry: CacheEntry<T> = deserializeValue(data)
    if (isExpired(entry)) {
      await this.redis.del(key)
      return null
    }

    return entry.compressed ? await this.decompressValue(entry.value) : entry.value
  }

  private async setInMemory<T>(
    key: string,
    value: T | CacheEntry<T>,
    options: CacheOptions,
  ): Promise<boolean> {
    const entry = this.isEntry(value)
      ? value
      : { value, ttl: options.ttl || this.config.memory.ttl, createdAt: Date.now() }
    return this.memory.set(key, entry, entry.ttl)
  }

  private async setInRedis<T>(
    key: string,
    entry: CacheEntry<T>,
    options: CacheOptions,
  ): Promise<boolean> {
    const serialized = serializeValue(entry)
    const ttl = options.ttl || this.config.memory.ttl

    const result = await this.redis.setex(key, ttl, serialized)

    // Store tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, key)
        await this.redis.expire(`tag:${tag}`, ttl)
      }
    }

    return result === 'OK'
  }

  private async pipelineGet<T>(keys: string[], options: CacheOptions): Promise<(T | null)[]> {
    const pipeline = this.redis.pipeline()
    const cacheKeys = keys.map((key) => createCacheKey(key, options))

    cacheKeys.forEach((key) => pipeline.get(key))

    const results = await pipeline.exec()
    return (
      results?.map((result, index) => {
        if (result && result[1]) {
          const entry: CacheEntry<T> = deserializeValue(result[1] as string)
          return entry.compressed ? this.decompressValue(entry.value) : entry.value
        }
        return null
      }) || []
    )
  }

  private async pipelineSet(operations: BatchOperation[], options: CacheOptions): Promise<boolean> {
    const pipeline = this.redis.pipeline()

    for (const op of operations) {
      const cacheKey = createCacheKey(op.key, { ...options, ...op.options })
      const entry: CacheEntry = {
        value: op.value,
        ttl: op.options?.ttl || options.ttl || this.config.memory.ttl,
        createdAt: Date.now(),
        tags: op.options?.tags || options.tags,
        version: op.options?.version || options.version,
        compressed: false,
      }

      if (this.shouldCompress(op.value, { ...options, ...op.options })) {
        entry.value = await this.compressValue(op.value)
        entry.compressed = true
      }

      const serialized = serializeValue(entry)
      pipeline.setex(cacheKey, entry.ttl, serialized)
    }

    const results = await pipeline.exec()
    return results?.every((result) => result && result[1] === 'OK') || false
  }

  private shouldCompress<T>(value: T, options: CacheOptions): boolean {
    if (!this.config.compression.enabled || options.compress === false) {
      return false
    }

    const serialized = JSON.stringify(value)
    return serialized.length >= this.config.compression.threshold
  }

  private async compressValue<T>(value: T): Promise<Buffer> {
    const serialized = JSON.stringify(value)
    const compressed = pako.deflate(serialized)
    return Buffer.from(compressed)
  }

  private async decompressValue<T>(compressed: Buffer): Promise<T> {
    const decompressed = pako.inflate(compressed, { to: 'string' })
    return JSON.parse(decompressed)
  }

  private isEntry<T>(value: any): value is CacheEntry<T> {
    return (
      value &&
      typeof value === 'object' &&
      'value' in value &&
      'ttl' in value &&
      'createdAt' in value
    )
  }

  private updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete', startTime: number): void {
    if (!this.config.performance.enableMetrics) return

    const responseTime = Date.now() - startTime
    this.metrics[operation === 'hit' || operation === 'miss' ? operation + 's' : operation + 's']++

    // Update average response time
    const totalOps =
      this.metrics.hits + this.metrics.misses + this.metrics.sets + this.metrics.deletes
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (totalOps - 1) + responseTime) / totalOps
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  async flush(): Promise<void> {
    this.memory.flushAll()
    await this.redis.flushdb()
  }

  async disconnect(): Promise<void> {
    this.memory.close()
    await this.redis.quit()
  }
}
