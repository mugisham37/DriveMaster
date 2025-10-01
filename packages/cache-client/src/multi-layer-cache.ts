import { createHash } from 'crypto'

import Redis from 'ioredis'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LRUCache } = require('lru-cache')

export interface MultiLayerCacheConfig {
  redis: {
    host: string
    port: number
    password?: string | undefined
    db: number
  }
  memory: {
    maxSize: number
    ttl: number
  }
  compression: {
    enabled: boolean
    threshold: number // bytes
  }
}

export interface MultiLayerCacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  compressed: boolean
  etag: string
}

export interface MultiLayerCacheOptions {
  ttl?: number | undefined
  tags?: string[] | undefined
  compress?: boolean | undefined
  skipMemory?: boolean | undefined
  skipRedis?: boolean | undefined
}

export class MultiLayerCache {
  private redis: Redis
  private memoryCache: any
  private config: MultiLayerCacheConfig
  private compressionThreshold: number

  constructor(config: MultiLayerCacheConfig) {
    this.config = config
    this.compressionThreshold = config.compression.threshold

    // Initialize Redis connection
    const redisConfig: any = {
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    }

    if (config.redis.password) {
      redisConfig.password = config.redis.password
    }

    this.redis = new Redis(redisConfig)

    // Initialize memory cache
    this.memoryCache = new LRUCache({
      max: config.memory.maxSize,
      ttl: config.memory.ttl * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      allowStale: false,
    })

    this.setupRedisEventHandlers()
  }

  /**
   * Get value from cache with multi-layer fallback
   */
  async get<T = any>(key: string, options: MultiLayerCacheOptions = {}): Promise<T | null> {
    const cacheKey = this.generateCacheKey(key)

    try {
      // Layer 1: Memory cache
      if (!options.skipMemory) {
        const memoryEntry = this.memoryCache.get(cacheKey)
        if (memoryEntry && this.isValidEntry(memoryEntry)) {
          return this.deserializeData<T>(memoryEntry)
        }
      }

      // Layer 2: Redis cache
      if (!options.skipRedis) {
        const redisData = await this.redis.get(cacheKey)
        if (redisData) {
          const entry: MultiLayerCacheEntry = JSON.parse(redisData)
          if (this.isValidEntry(entry)) {
            // Populate memory cache for faster subsequent access
            if (!options.skipMemory) {
              this.memoryCache.set(cacheKey, entry)
            }
            return this.deserializeData<T>(entry)
          }
        }
      }

      return null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value in cache with multi-layer storage
   */
  async set<T = any>(key: string, value: T, options: MultiLayerCacheOptions = {}): Promise<void> {
    const cacheKey = this.generateCacheKey(key)
    const ttl = options.ttl || this.config.memory.ttl
    const shouldCompress = options.compress ?? this.shouldCompress(value)

    const entry: MultiLayerCacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      compressed: shouldCompress,
      etag: this.generateETag(value),
    }

    try {
      // Store in memory cache
      if (!options.skipMemory) {
        this.memoryCache.set(cacheKey, entry)
      }

      // Store in Redis cache
      if (!options.skipRedis) {
        const serializedEntry = JSON.stringify(entry)
        await this.redis.setex(cacheKey, ttl, serializedEntry)

        // Set cache tags for invalidation
        if (options.tags && options.tags.length > 0) {
          await this.setTags(cacheKey, options.tags)
        }
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key)

    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey)

      // Remove from Redis cache
      await this.redis.del(cacheKey)
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline()

      for (const tag of tags) {
        const tagKey = `tag:${tag}`
        const keys = await this.redis.smembers(tagKey)

        for (const key of keys) {
          pipeline.del(key)
          this.memoryCache.delete(key)
        }

        pipeline.del(tagKey)
      }

      await pipeline.exec()
    } catch (error) {
      console.error('Cache invalidation error:', error)
      throw error
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: MultiLayerCacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, options)
    return value
  }

  /**
   * Batch get multiple keys
   */
  async mget<T = any>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()

    try {
      const cacheKeys = keys.map((key) => this.generateCacheKey(key))
      const redisValues = await this.redis.mget(...cacheKeys)

      for (let i = 0; i < keys.length; i++) {
        const originalKey = keys[i]
        const redisValue = redisValues[i]

        if (originalKey && redisValue) {
          const entry: MultiLayerCacheEntry = JSON.parse(redisValue)
          if (this.isValidEntry(entry)) {
            result.set(originalKey, this.deserializeData<T>(entry))
          } else {
            result.set(originalKey, null)
          }
        } else if (originalKey) {
          result.set(originalKey, null)
        }
      }
    } catch (error) {
      console.error('Cache mget error:', error)
      // Return empty results for all keys on error
      keys.forEach((key) => result.set(key, null))
    }

    return result
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset<T = any>(
    entries: Map<string, T>,
    options: MultiLayerCacheOptions = {},
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline()
      const ttl = options.ttl || this.config.memory.ttl

      for (const [key, value] of entries) {
        const cacheKey = this.generateCacheKey(key)
        const shouldCompress = options.compress ?? this.shouldCompress(value)

        const entry: MultiLayerCacheEntry<T> = {
          data: value,
          timestamp: Date.now(),
          ttl: ttl * 1000,
          compressed: shouldCompress,
          etag: this.generateETag(value),
        }

        // Store in memory cache
        if (!options.skipMemory) {
          this.memoryCache.set(cacheKey, entry)
        }

        // Queue for Redis storage
        const serializedEntry = JSON.stringify(entry)
        pipeline.setex(cacheKey, ttl, serializedEntry)
      }

      await pipeline.exec()
    } catch (error) {
      console.error('Cache mset error:', error)
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: {
        size: this.memoryCache.size,
        maxSize: this.memoryCache.max,
        calculatedSize: this.memoryCache.calculatedSize,
      },
      redis: {
        status: this.redis.status,
        commandQueue: this.redis.commandQueue.length,
      },
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear()
      await this.redis.flushdb()
    } catch (error) {
      console.error('Cache clear error:', error)
      throw error
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      this.memoryCache.clear()
      await this.redis.quit()
    } catch (error) {
      console.error('Cache close error:', error)
    }
  }

  // Private methods

  private generateCacheKey(key: string): string {
    return `drivemaster:cache:${key}`
  }

  public generateETag(data: any): string {
    const hash = createHash('md5')
    hash.update(JSON.stringify(data))
    return hash.digest('hex')
  }

  private isValidEntry(entry: MultiLayerCacheEntry): boolean {
    const now = Date.now()
    return now - entry.timestamp < entry.ttl
  }

  private shouldCompress(data: any): boolean {
    if (!this.config.compression.enabled) {
      return false
    }

    const serialized = JSON.stringify(data)
    return Buffer.byteLength(serialized, 'utf8') > this.compressionThreshold
  }

  private deserializeData<T>(entry: MultiLayerCacheEntry): T {
    // In a real implementation, you would handle decompression here
    // if entry.compressed is true
    return entry.data as T
  }

  private async setTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline()

    for (const tag of tags) {
      const tagKey = `tag:${tag}`
      pipeline.sadd(tagKey, key)
      pipeline.expire(tagKey, 3600) // Tags expire in 1 hour
    }

    await pipeline.exec()
  }

  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis cache connected')
    })

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error)
    })

    this.redis.on('close', () => {
      console.log('Redis cache connection closed')
    })

    this.redis.on('reconnecting', () => {
      console.log('Redis cache reconnecting...')
    })
  }
}

// Cache middleware for Fastify
export interface CacheMiddlewareOptions {
  ttl?: number | undefined
  tags?: string[] | undefined
  keyGenerator?: ((request: any) => string) | undefined
  skipCache?: ((request: any) => boolean) | undefined
}

export function createCacheMiddleware(
  cache: MultiLayerCache,
  options: CacheMiddlewareOptions = {},
) {
  return async function cacheMiddleware(request: any, reply: any) {
    // Skip cache for non-GET requests
    if (request.method !== 'GET') {
      return
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(request)) {
      return
    }

    const cacheKey = options.keyGenerator
      ? options.keyGenerator(request)
      : `${request.method}:${request.url}`

    try {
      // Check for cached response
      const cached = await cache.get(cacheKey)
      if (cached) {
        reply.header('X-Cache-Status', 'HIT')
        reply.header('ETag', cached.etag)

        // Check if client has fresh copy
        if (request.headers['if-none-match'] === cached.etag) {
          reply.code(304)
          return reply.send()
        }

        reply.code(200)
        return reply.send(cached.data)
      }

      // Cache miss - continue to handler
      reply.header('X-Cache-Status', 'MISS')

      // Hook into response to cache it
      reply.hijack()
      const originalSend = reply.send.bind(reply)

      reply.send = function (payload: any) {
        // Cache successful responses
        if (reply.statusCode === 200) {
          const etag = cache.generateETag(payload)
          reply.header('ETag', etag)

          const cacheOptions: MultiLayerCacheOptions = {}
          if (options.ttl !== undefined) cacheOptions.ttl = options.ttl
          if (options.tags !== undefined) cacheOptions.tags = options.tags

          cache
            .set(
              cacheKey,
              {
                data: payload,
                etag,
                statusCode: reply.statusCode,
                headers: reply.getHeaders(),
              },
              cacheOptions,
            )
            .catch((error) => {
              console.error('Cache set error in middleware:', error)
            })
        }

        return originalSend(payload)
      }
    } catch (error) {
      console.error('Cache middleware error:', error)
      // Continue without caching on error
    }
  }
}
