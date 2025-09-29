import Redis from 'ioredis'

import type { RedisConfig } from './environment'

export interface RedisConnection {
  client: Redis
  close: () => Promise<void>
}

export function createRedisConnection(config: RedisConfig): RedisConnection {
  const redisOptions: any = {
    host: config.host,
    port: config.port,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
  }

  if (config.password) {
    redisOptions.password = config.password
  }

  const client = new Redis(redisOptions)

  // Error handling
  client.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  client.on('connect', () => {
    console.log('Redis connected successfully')
  })

  client.on('ready', () => {
    console.log('Redis ready for operations')
  })

  client.on('close', () => {
    console.log('Redis connection closed')
  })

  return {
    client,
    close: async () => {
      await client.quit()
    },
  }
}

// Redis health check utility
export async function checkRedisHealth(client: Redis): Promise<boolean> {
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

// Cache utilities
export class CacheManager {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      return await this.redis.incrby(key, by)
    } catch (error) {
      console.error('Cache increment error:', error)
      return null
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttlSeconds)
      return result === 1
    } catch (error) {
      console.error('Cache expire error:', error)
      return false
    }
  }
}
