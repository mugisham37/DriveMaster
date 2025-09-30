import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { LRUCache } from 'lru-cache'

export interface RateLimitOptions {
  max?: number
  timeWindow?: number
  skipOnError?: boolean
  keyGenerator?: (request: any) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  redis?: {
    host: string
    port: number
    password?: string
    db?: number
  }
}

interface RateLimitInfo {
  count: number
  resetTime: number
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitOptions> = async (fastify, options) => {
  const config = {
    max: options.max || 100,
    timeWindow: options.timeWindow || 60000, // 1 minute
    skipOnError: options.skipOnError !== false,
    keyGenerator: options.keyGenerator || ((request: any) => request.ip),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  }

  // Use LRU cache for in-memory rate limiting
  const cache = new LRUCache<string, RateLimitInfo>({
    max: 10000,
    ttl: config.timeWindow,
  })

  // Redis client for distributed rate limiting (if configured)
  let redisClient: any = null
  if (options.redis) {
    const Redis = await import('ioredis')
    redisClient = new Redis.default({
      host: options.redis.host,
      port: options.redis.port,
      password: options.redis.password,
      db: options.redis.db || 0,
    })
  }

  async function getRateLimitInfo(key: string): Promise<RateLimitInfo> {
    const now = Date.now()
    const resetTime = now + config.timeWindow

    if (redisClient) {
      // Distributed rate limiting with Redis
      const pipeline = redisClient.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, Math.ceil(config.timeWindow / 1000))

      const results = await pipeline.exec()
      const count = results?.[0]?.[1] || 0

      return { count, resetTime }
    } else {
      // In-memory rate limiting
      const existing = cache.get(key)

      if (existing && existing.resetTime > now) {
        existing.count++
        cache.set(key, existing)
        return existing
      } else {
        const newInfo = { count: 1, resetTime }
        cache.set(key, newInfo)
        return newInfo
      }
    }
  }

  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const key = config.keyGenerator(request)
      const rateLimitInfo = await getRateLimitInfo(key)

      // Add rate limit headers
      reply.header('x-ratelimit-limit', config.max)
      reply.header('x-ratelimit-remaining', Math.max(0, config.max - rateLimitInfo.count))
      reply.header('x-ratelimit-reset', Math.ceil(rateLimitInfo.resetTime / 1000))

      // Check if rate limit exceeded
      if (rateLimitInfo.count > config.max) {
        reply.code(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000),
        })
        return
      }
    } catch (error) {
      if (!config.skipOnError) {
        throw error
      }
      fastify.log.warn('Rate limiting error:', error)
    }
  })

  // Optional: Clean up on response based on success/failure
  if (config.skipSuccessfulRequests || config.skipFailedRequests) {
    fastify.addHook('onResponse', async (request, reply) => {
      const isSuccess = reply.statusCode < 400
      const shouldSkip =
        (isSuccess && config.skipSuccessfulRequests) || (!isSuccess && config.skipFailedRequests)

      if (shouldSkip) {
        // Decrement the counter for skipped requests
        const key = config.keyGenerator(request)

        if (redisClient) {
          await redisClient.decr(key)
        } else {
          const existing = cache.get(key)
          if (existing) {
            existing.count = Math.max(0, existing.count - 1)
            cache.set(key, existing)
          }
        }
      }
    })
  }

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    if (redisClient) {
      await redisClient.quit()
    }
  })
}

export { rateLimitPlugin }
export default fp(rateLimitPlugin, {
  fastify: '4.x',
  name: 'rate-limit-plugin',
})
