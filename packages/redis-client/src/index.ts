import { createClient, RedisClientType } from 'redis'

export type { RedisClientType }

export interface RedisConfig {
  url: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
  connectTimeout?: number
  commandTimeout?: number
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

/**
 * Create a Redis client with configuration
 */
export function createRedisClient(url: string, config?: Partial<RedisConfig>): RedisClientType {
  const client = createClient({
    url,
    socket: {
      connectTimeout: config?.connectTimeout ?? 10000,
      commandTimeout: config?.commandTimeout ?? 5000,
    },
    retryDelayOnFailover: config?.retryDelayOnFailover ?? 100,
  })

  // Handle connection events
  client.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  client.on('connect', () => {
    console.log('Redis Client Connected')
  })

  client.on('ready', () => {
    console.log('Redis Client Ready')
  })

  client.on('end', () => {
    console.log('Redis Client Disconnected')
  })

  return client
}

/**
 * Redis cache wrapper with additional functionality
 */
export class RedisCache {
  private client: RedisClientType
  private defaultTTL: number
  private keyPrefix: string

  constructor(client: RedisClientType, options?: CacheOptions) {
    this.client = client
    this.defaultTTL = options?.ttl ?? 3600 // 1 hour default
    this.keyPrefix = options?.prefix ?? 'drivemaster:'
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }

  /**
   * Generate a prefixed key
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value)
    const cacheKey = this.getKey(key)
    const expiration = ttl ?? this.defaultTTL

    await this.client.setEx(cacheKey, expiration, serializedValue)
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key)
    const value = await this.client.get(cacheKey)

    if (value === null) {
      return null
    }

    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Failed to parse cached value:', error)
      return null
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = this.getKey(key)
    const result = await this.client.del(cacheKey)
    return result > 0
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const cacheKey = this.getKey(key)
    const result = await this.client.exists(cacheKey)
    return result > 0
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const cacheKey = this.getKey(key)
    const result = await this.client.expire(cacheKey, ttl)
    return result
  }

  /**
   * Get multiple values
   */
  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    const cacheKeys = keys.map((key) => this.getKey(key))
    const values = await this.client.mGet(cacheKeys)

    return values.map((value) => {
      if (value === null) {
        return null
      }
      try {
        return JSON.parse(value) as T
      } catch (error) {
        console.error('Failed to parse cached value:', error)
        return null
      }
    })
  }

  /**
   * Set multiple values
   */
  async mset(keyValuePairs: Record<string, unknown>, ttl?: number): Promise<void> {
    const pipeline = this.client.multi()
    const expiration = ttl ?? this.defaultTTL

    for (const [key, value] of Object.entries(keyValuePairs)) {
      const cacheKey = this.getKey(key)
      const serializedValue = JSON.stringify(value)
      pipeline.setEx(cacheKey, expiration, serializedValue)
    }

    await pipeline.exec()
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const cacheKey = this.getKey(key)
    return await this.client.incrBy(cacheKey, amount)
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const searchPattern = this.getKey(pattern)
    const keys = await this.client.keys(searchPattern)
    // Remove prefix from returned keys
    return keys.map((key) => key.replace(this.keyPrefix, ''))
  }

  /**
   * Clear all keys with the current prefix
   */
  async clear(): Promise<void> {
    const keys = await this.client.keys(`${this.keyPrefix}*`)
    if (keys.length > 0) {
      await this.client.del(keys)
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean
    keyCount: number
    memoryUsage: string
  }> {
    const connected = this.client.isOpen
    const keys = await this.client.keys(`${this.keyPrefix}*`)
    const info = await this.client.info('memory')

    // Parse memory usage from info string
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
    const memoryUsage = memoryMatch ? (memoryMatch[1]?.trim() ?? 'unknown') : 'unknown'

    return {
      connected,
      keyCount: keys.length,
      memoryUsage,
    }
  }
}
