import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware'
import securityPlugin from './security.plugin'
import { validateSecurityConfig } from '../config/security.config'

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Validate security configuration before starting
  const securityValidation = validateSecurityConfig()
  if (!securityValidation.valid) {
    server.log.error('Security configuration validation failed:', securityValidation.errors)
    throw new Error(`Security configuration invalid: ${securityValidation.errors.join(', ')}`)
  }

  if (securityValidation.warnings.length > 0) {
    server.log.warn('Security configuration warnings:', securityValidation.warnings)
  }

  // Cookie support for session management (must be registered before security plugin)
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })

  // Redis plugin for rate limiting (if available)
  try {
    if (process.env.REDIS_URL) {
      await server.register(require('@fastify/redis'), {
        url: process.env.REDIS_URL,
      })
      server.log.info('Redis connected for rate limiting')
    }
  } catch (error) {
    server.log.warn('Redis connection failed, using in-memory rate limiting:', error)
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
    server.log.warn('Legacy rate limiting registration failed:', error)
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
    async (request, reply) => {
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
  server.get('/ready', async (request, reply) => {
    try {
      return { status: 'ready' }
    } catch (error) {
      reply.code(503)
      return { status: 'not ready', error: (error as Error).message }
    }
  })
}
