import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Redis from 'ioredis'

interface RequestBody {
  email?: string
  [key: string]: unknown
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Global rate limits
  global: {
    max: 1000, // requests per window
    timeWindow: '15 minutes',
  },
  // Authentication endpoints (more restrictive)
  auth: {
    max: 10, // requests per window
    timeWindow: '15 minutes',
  },
  // Registration endpoint (very restrictive)
  register: {
    max: 3, // requests per window
    timeWindow: '1 hour',
  },
  // Password reset (restrictive)
  passwordReset: {
    max: 5, // requests per window
    timeWindow: '1 hour',
  },
  // Profile updates (moderate)
  profile: {
    max: 50, // requests per window
    timeWindow: '15 minutes',
  },
}

// Redis configuration for distributed rate limiting
const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_RATE_LIMIT_DB ?? '1'), // Separate DB for rate limiting
}

export interface RateLimitOptions {
  max: number
  timeWindow: string | number
  keyGenerator?: (request: FastifyRequest) => string
  skipOnError?: boolean
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onExceeded?: (request: FastifyRequest, reply: FastifyReply) => void
}

export class RateLimitMiddleware {
  private static redis: Redis

  /**
   * Initialize Redis connection for rate limiting
   */
  static async initialize(): Promise<void> {
    if (this.redis === undefined) {
      this.redis = new Redis(redisConfig)

      this.redis.on('connect', () => {
        // Use proper logging in production
        process.stdout.write('✅ Redis connected for rate limiting\n')
      })

      this.redis.on('error', (error) => {
        // Use proper logging in production
        process.stderr.write(`❌ Redis rate limit connection error: ${error.message}\n`)
      })

      // Test the connection
      await this.redis.ping()
    }
  }

  /**
   * Register global rate limiting
   */
  static async registerGlobalRateLimit(server: FastifyInstance): Promise<void> {
    await this.initialize()

    await server.register(rateLimit, {
      max: RATE_LIMIT_CONFIG.global.max,
      timeWindow: RATE_LIMIT_CONFIG.global.timeWindow,
      redis: this.redis,
      keyGenerator: (request: FastifyRequest): string => {
        // Use IP address as the key, but consider user ID if authenticated
        const userKey = this.extractUserKey(request)
        return userKey ?? request.ip
      },
      errorResponseBuilder: (request: FastifyRequest, context: { max: number; ttl: number }) => {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Limit: ${context.max} requests per window`,
            retryAfter: context.ttl,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        }
      },
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      },
    })
  }

  /**
   * Create authentication rate limiter
   */
  static createAuthRateLimit(): RateLimitOptions {
    return {
      max: RATE_LIMIT_CONFIG.auth.max,
      timeWindow: RATE_LIMIT_CONFIG.auth.timeWindow,
      keyGenerator: (request: FastifyRequest): string => {
        // For auth endpoints, use IP + email combination for more granular control
        const body = request.body as RequestBody
        const email =
          body?.email !== null && body?.email !== undefined && typeof body.email === 'string'
            ? body.email
            : 'unknown'
        return `auth:${request.ip}:${email}`
      },
      skipSuccessfulRequests: false, // Count all attempts
      skipFailedRequests: false,
      onExceeded: (request: FastifyRequest, _reply: FastifyReply): void => {
        request.log.warn(
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            endpoint: request.url,
          },
          'Authentication rate limit exceeded',
        )
      },
    }
  }

  /**
   * Create registration rate limiter
   */
  static createRegistrationRateLimit(): RateLimitOptions {
    return {
      max: RATE_LIMIT_CONFIG.register.max,
      timeWindow: RATE_LIMIT_CONFIG.register.timeWindow,
      keyGenerator: (request: FastifyRequest): string => {
        // For registration, use IP address to prevent abuse
        return `register:${request.ip}`
      },
      skipSuccessfulRequests: true, // Only count failed attempts
      onExceeded: (request: FastifyRequest, _reply: FastifyReply): void => {
        request.log.warn(
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
          },
          'Registration rate limit exceeded',
        )
      },
    }
  }

  /**
   * Create password reset rate limiter
   */
  static createPasswordResetRateLimit(): RateLimitOptions {
    return {
      max: RATE_LIMIT_CONFIG.passwordReset.max,
      timeWindow: RATE_LIMIT_CONFIG.passwordReset.timeWindow,
      keyGenerator: (request: FastifyRequest): string => {
        const body = request.body as RequestBody
        const email =
          body?.email !== null && body?.email !== undefined && typeof body.email === 'string'
            ? body.email
            : 'unknown'
        return `password-reset:${request.ip}:${email}`
      },
      skipFailedRequests: false,
      onExceeded: (request: FastifyRequest, _reply: FastifyReply): void => {
        const body = request.body as RequestBody
        const email =
          body?.email !== null && body?.email !== undefined && typeof body.email === 'string'
            ? body.email
            : 'unknown'
        request.log.warn(
          {
            ip: request.ip,
            email,
          },
          'Password reset rate limit exceeded',
        )
      },
    }
  }

  /**
   * Create profile update rate limiter
   */
  static createProfileRateLimit(): RateLimitOptions {
    return {
      max: RATE_LIMIT_CONFIG.profile.max,
      timeWindow: RATE_LIMIT_CONFIG.profile.timeWindow,
      keyGenerator: (request: FastifyRequest): string => {
        const userKey = this.extractUserKey(request)
        return `profile:${userKey ?? request.ip}`
      },
      skipSuccessfulRequests: false,
    }
  }

  /**
   * Create custom rate limiter with specific options
   */
  static createCustomRateLimit(options: RateLimitOptions): RateLimitOptions {
    return {
      skipOnError: true, // Don't block on Redis errors
      ...options,
    }
  }

  /**
   * Advanced rate limiting with progressive penalties
   */
  static async createProgressiveRateLimit(
    baseKey: string,
    request: FastifyRequest,
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    await this.initialize()

    const key = `progressive:${baseKey}`
    const windowSize = 15 * 60 * 1000 // 15 minutes in milliseconds

    // Get current violation count
    const violationCount = (await this.redis.get(`${key}:violations`)) ?? '0'
    const violations = parseInt(violationCount, 10)

    // Calculate dynamic limit based on violations
    let currentLimit = RATE_LIMIT_CONFIG.auth.max
    if (violations > 0) {
      // Exponential backoff: reduce limit by half for each violation
      currentLimit = Math.max(1, Math.floor(currentLimit / Math.pow(2, violations)))
    }

    // Check current request count
    const requestCount = (await this.redis.get(key)) ?? '0'
    const requests = parseInt(requestCount, 10)

    if (requests >= currentLimit) {
      // Increment violation count
      await this.redis.setex(`${key}:violations`, windowSize / 1000, violations + 1) // cspell:disable-line

      // Calculate retry after time (exponential backoff)
      const retryAfter = Math.min(3600, 60 * Math.pow(2, violations)) // Max 1 hour

      request.log.warn(
        {
          key: baseKey,
          violations,
          currentLimit,
          requests,
          retryAfter,
        },
        'Progressive rate limit exceeded',
      )

      return { allowed: false, retryAfter }
    }

    // Increment request count
    await this.redis
      .multi()
      .incr(key)
      .expire(key, windowSize / 1000)
      .exec()

    return { allowed: true }
  }

  /**
   * Whitelist IP addresses (for trusted sources)
   */
  static createWhitelistMiddleware(whitelistedIPs: string[]) {
    return async (
      request: FastifyRequest,
      _reply: FastifyReply,
      done: () => void,
    ): Promise<void> => {
      const clientIP = request.ip

      if (whitelistedIPs.includes(clientIP)) {
        // Skip rate limiting for whitelisted IPs
        request.log.info({ ip: clientIP }, 'Request from whitelisted IP')
        return done()
      }

      done()
    }
  }

  /**
   * Blacklist IP addresses (for known bad actors)
   */
  static createBlacklistMiddleware(blacklistedIPs: string[]) {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: () => void,
    ): Promise<void> => {
      const clientIP = request.ip

      if (blacklistedIPs.includes(clientIP)) {
        request.log.warn({ ip: clientIP }, 'Request from blacklisted IP')

        void reply.code(403).send({
          success: false,
          error: {
            code: 'IP_BLACKLISTED',
            message: 'Access denied',
          },
        })
        return
      }

      done()
    }
  }

  /**
   * Monitor rate limit violations and auto-blacklist
   */
  static async monitorViolations(): Promise<void> {
    await this.initialize()

    const pattern = 'progressive:*:violations'
    const keys = await this.redis.keys(pattern)

    for (const key of keys) {
      const violations = await this.redis.get(key)
      if (violations !== null && violations !== undefined && parseInt(violations, 10) > 10) {
        // Extract IP from key and consider blacklisting
        const ip = key.split(':')[1]
        process.stderr.write(`High violation count for IP ${ip}: ${violations}\n`)

        // In production, you might want to automatically blacklist or alert administrators
      }
    }
  }

  /**
   * Extract user key from request (user ID if authenticated, IP otherwise)
   */
  private static extractUserKey(request: FastifyRequest): string | null {
    // Try to extract user ID from JWT token in Authorization header
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ') ?? false) {
      try {
        const token = authHeader.substring(7)
        // This is a simplified extraction - in practice, you'd validate the token
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as {
          userId?: string
        }
        return payload.userId !== undefined && payload.userId !== null && payload.userId !== ''
          ? payload.userId
          : null
      } catch (error) {
        // Invalid token, fall back to IP
        return null
      }
    }

    return null
  }

  /**
   * Get rate limit status for a key
   */
  static async getRateLimitStatus(key: string): Promise<{
    requests: number
    limit: number
    remaining: number
    resetTime: number
  }> {
    await this.initialize()

    const requests = parseInt((await this.redis.get(key)) ?? '0', 10)
    const ttl = await this.redis.ttl(key)
    const limit = RATE_LIMIT_CONFIG.global.max // Default limit

    return {
      requests,
      limit,
      remaining: Math.max(0, limit - requests),
      resetTime: ttl > 0 ? Date.now() + ttl * 1000 : 0,
    }
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  static async resetRateLimit(key: string): Promise<boolean> {
    await this.initialize()

    const result = await this.redis.del(key)
    return result > 0
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.redis !== undefined) {
      await this.redis.quit()
    }
  }
}
