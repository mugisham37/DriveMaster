import type { FastifyRequest, FastifyReply } from 'fastify'

import { RateLimitMiddleware } from './rate-limit.middleware'

interface RequestBody {
  email?: string
  [key: string]: unknown
}

export class RateLimitHandler {
  /**
   * Authentication rate limiting middleware
   */
  static authRateLimit() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = request.body as RequestBody
      const email =
        body?.email !== null && body?.email !== undefined && typeof body.email === 'string'
          ? body.email
          : 'unknown'
      const key = `auth:${request.ip}:${email}`

      const result = await RateLimitMiddleware.createProgressiveRateLimit(key, request)

      if (!result.allowed) {
        return reply.code(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: result.retryAfter,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    }
  }

  /**
   * Registration rate limiting middleware
   */
  static registrationRateLimit() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const key = `register:${request.ip}`

      const result = await RateLimitMiddleware.createProgressiveRateLimit(key, request)

      if (!result.allowed) {
        return reply.code(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many registration attempts. Please try again later.',
            retryAfter: result.retryAfter,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    }
  }

  /**
   * Password reset rate limiting middleware
   */
  static passwordResetRateLimit() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = request.body as RequestBody
      const email =
        body?.email !== null && body?.email !== undefined && typeof body.email === 'string'
          ? body.email
          : 'unknown'
      const key = `password-reset:${request.ip}:${email}`

      const result = await RateLimitMiddleware.createProgressiveRateLimit(key, request)

      if (!result.allowed) {
        return reply.code(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset attempts. Please try again later.',
            retryAfter: result.retryAfter,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    }
  }
}
