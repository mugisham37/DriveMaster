import Redis from 'ioredis'

import type { RedisConfig } from './environment'
import type { RedisOptions } from './types'

// Simple logger for internal use - in production, inject proper logger
const logger = {
  error: (message: string, error?: unknown): void => {
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

export interface RedisConnection {
  client: Redis
  close: () => Promise<void>
}

export function createRedisConnection(config: RedisConfig): RedisConnection {
  const redisOptions: RedisOptions = {
    host: config.host,
    port: config.port,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
  }

  if (config.password !== undefined && config.password !== '') {
    redisOptions.password = config.password
  }

  const client = new Redis(redisOptions)

  // Error handling
  client.on('error', (error) => {
    logger.error('Redis connection error:', error)
  })

  client.on('connect', () => {
    logger.info('Redis connected successfully')
  })

  client.on('ready', () => {
    logger.info('Redis ready for operations')
  })

  client.on('close', () => {
    logger.info('Redis connection closed')
  })

  return {
    client,
    close: async (): Promise<void> => {
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
    logger.error('Redis health check failed:', error)
    return false
  }
}

// Cache utilities
export class CacheManager {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value !== null && value !== undefined ? (JSON.parse(value) as T) : null
    } catch (error) {
      logger.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      logger.error('Cache set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      logger.error('Cache delete error:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Cache exists error:', error)
      return false
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      return await this.redis.incrby(key, by)
    } catch (error) {
      logger.error('Cache increment error:', error)
      return null
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttlSeconds)
      return result === 1
    } catch (error) {
      logger.error('Cache expire error:', error)
      return false
    }
  }
}
