import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import fp from 'fastify-plugin'

import { securityConfig, securityHeaders, httpsConfig } from '../config/security.config'
import { SecurityMiddleware } from '../middleware/security.middleware'

// Type for Fastify instance that might have Redis
type FastifyWithOptionalRedis = FastifyInstance & {
  redis?: unknown
}

// Helper function to safely get user agent
function getUserAgent(headers: Record<string, string | string[] | undefined>): string {
  const userAgent = headers['user-agent']
  return typeof userAgent === 'string' ? userAgent : 'unknown'
}

// Helper function to safely get user ID
function getUserId(user: unknown): string {
  if (user != null && typeof user === 'object' && 'userId' in user) {
    const userId = (user as { userId: unknown }).userId
    return typeof userId === 'string' ? userId : 'anonymous'
  }
  return 'anonymous'
}

export interface SecurityPluginOptions extends FastifyPluginOptions {
  enableHelmet?: boolean
  enableCors?: boolean
  enableRateLimit?: boolean
  enableCSRF?: boolean
  enableXSS?: boolean
  enableSQLInjection?: boolean
}

async function securityPlugin(
  fastify: FastifyWithOptionalRedis,
  options: SecurityPluginOptions = {},
): Promise<void> {
  const {
    enableHelmet = true,
    enableCors = true,
    enableRateLimit = true,
    enableCSRF = true,
    enableXSS = true,
    enableSQLInjection = true,
  } = options

  // Helmet for security headers
  if (enableHelmet) {
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
      // cspell:disable-line
      hsts:
        process.env.NODE_ENV === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
    })
  }

  // CORS configuration
  if (enableCors) {
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (origin == null || origin.trim() === '') return callback(null, true)

        // In production, restrict to specific domains
        if (process.env.NODE_ENV === 'production') {
          const allowedOrigins = [
            'https://drivemaster.com',
            'https://app.drivemaster.com',
            'https://admin.drivemaster.com',
          ]

          if (allowedOrigins.includes(origin)) {
            return callback(null, true)
          }

          return callback(new Error('Not allowed by CORS'), false)
        }

        // In development, allow all origins
        return callback(null, true)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'X-API-Key',
      ],
    })
  }

  // Rate limiting
  if (enableRateLimit) {
    // Check if Redis is available
    const hasRedis = 'redis' in fastify

    await fastify.register(rateLimit, {
      global: true,
      max: securityConfig.rateLimit.api.max,
      timeWindow: securityConfig.rateLimit.api.timeWindow,
      ...(hasRedis && { redis: fastify.redis }), // Use Redis if available
      keyGenerator: (request) => {
        // Use user ID if authenticated, otherwise IP
        const userId = getUserId(request.user)
        return userId !== 'anonymous' ? userId : request.ip
      },
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
          },
          meta: {
            limit: context.max,
            remaining: 0, // Set default value since context.remaining might not exist
            resetTime: new Date(Date.now() + context.ttl),
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        }
      },
      onExceeding: (request) => {
        request.log.warn(
          {
            ip: request.ip,
            userAgent: getUserAgent(request.headers),
            userId: getUserId(request.user),
            url: request.url,
            method: request.method,
          },
          'Rate limit exceeded',
        )
      },
    })
  }

  // Security middleware hooks
  if (enableXSS) {
    fastify.addHook('preHandler', SecurityMiddleware.xssProtection())
  }

  if (enableSQLInjection) {
    fastify.addHook('preHandler', SecurityMiddleware.sqlInjectionProtection())
  }

  if (enableCSRF) {
    // CSRF protection for state-changing operations
    fastify.addHook('preHandler', async (request, reply) => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        await SecurityMiddleware.csrfProtection()(request, reply)
      }
    })
  }

  // Security headers hook
  fastify.addHook('onSend', async (request, reply) => {
    // Add custom security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      void reply.header(header, value)
    })

    // Add HTTPS headers in production
    if (process.env.NODE_ENV === 'production' && request.protocol === 'https') {
      Object.entries(httpsConfig).forEach(([header, value]) => {
        void reply.header(header, value)
      })
    }

    // Add security-related response headers
    void reply.header('X-Request-ID', request.id)
    void reply.header('X-Response-Time', Date.now() - request.startTime)
  })

  // Security event logging and timing
  fastify.addHook('onRequest', (request) => {
    // Set start time for response time calculation
    request.startTime = Date.now()

    if (securityConfig.monitoring.enableSecurityEventLogging) {
      request.log.debug(
        {
          ip: request.ip,
          userAgent: getUserAgent(request.headers),
          method: request.method,
          url: request.url,
          headers: request.headers,
        },
        'Security event: Request received',
      )
    }
  })

  // Error handling for security-related errors
  fastify.setErrorHandler(async (error, request, reply) => {
    // Log security-related errors
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 429) {
      request.log.warn(
        {
          error: error.message,
          statusCode: error.statusCode,
          ip: request.ip,
          userAgent: getUserAgent(request.headers),
          url: request.url,
          method: request.method,
          userId: getUserId(request.user),
        },
        'Security error occurred',
      )
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      })
    }

    // Re-throw the error for default handling
    throw error
  })

  // Health check endpoint with security validation
  fastify.get('/health/security', async (request, reply) => {
    const securityStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      security: {
        https: request.protocol === 'https',
        headers: {
          helmet: enableHelmet,
          cors: enableCors,
          csrf: enableCSRF,
        },
        rateLimit: enableRateLimit,
        xssProtection: enableXSS,
        sqlInjectionProtection: enableSQLInjection,
      },
      compliance: {
        gdpr: true,
        ccpa: true,
        auditLogging: securityConfig.monitoring.enableAuditLogging,
      },
    }

    return reply.send({
      success: true,
      data: securityStatus,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
      },
    })
  })

  fastify.log.info('Security plugin registered successfully')
}

export default fp(securityPlugin, {
  name: 'security-plugin',
  dependencies: ['redis'], // Depends on Redis for rate limiting
})
