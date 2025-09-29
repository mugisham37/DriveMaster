import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware'

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })

  await server.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-session-id', 'x-api-key'],
  })

  // Cookie support for session management
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })

  // Rate limiting
  await RateLimitMiddleware.registerGlobalRateLimit(server)

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
