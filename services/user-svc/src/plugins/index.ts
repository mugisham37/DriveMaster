import cookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'

import { validateSecurityConfig } from '../config/security.config'
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware'

import securityPlugin from './security.plugin'

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Validate security configuration before starting
  const securityValidation = validateSecurityConfig()
  if (!securityValidation.valid) {
    server.log.error('Security configuration validation failed: %o', securityValidation.errors)
    throw new Error(`Security configuration invalid: ${securityValidation.errors.join(', ')}`)
  }

  if (securityValidation.warnings.length > 0) {
    server.log.warn('Security configuration warnings: %o', securityValidation.warnings)
  }

  // Cookie support for session management (must be registered before security plugin)
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })

  // Redis plugin for rate limiting (if available)
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl != null && redisUrl.trim() !== '') {
      const fastifyRedis = await import('@fastify/redis')
      await server.register(fastifyRedis.default, {
        url: redisUrl,
      })
      server.log.info('Redis connected for rate limiting')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    server.log.warn('Redis connection failed, using in-memory rate limiting: %s', errorMessage)
  }

  // Comprehensive security plugin
  await server.register(securityPlugin, {
    enableHelmet: true,
    enableCors: true,
    enableRateLimit: true,
    enableCSRF: true,
    enableXSS: true,
    enableSQLInjection: true,
  })

  // Legacy rate limiting (fallback if security plugin rate limiting fails)
  try {
    await RateLimitMiddleware.registerGlobalRateLimit(server)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    server.log.warn('Legacy rate limiting registration failed: %s', errorMessage)
  }

  // API Documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'DriveMaster User Service API',
        description: 'User management and authentication service for DriveMaster platform',
        version: '0.1.0',
      },
      host: 'localhost:3001',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Health', description: 'Service health endpoints' },
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'JWT token for authentication',
        },
      },
    },
  })

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  })

  // Health check plugin
  server.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              service: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'user-svc',
        version: '0.1.0',
      }
    },
  )

  // Ready check plugin (for Kubernetes)
  server.get('/ready', async (_request, reply) => {
    try {
      return { status: 'ready' }
    } catch (error) {
      void reply.code(503)
      return { status: 'not ready', error: (error as Error).message }
    }
  })
}
