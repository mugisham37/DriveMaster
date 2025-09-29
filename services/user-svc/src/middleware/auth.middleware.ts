import type { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService, type UserContext } from '../services/auth.simple'
import { SessionService } from '../services/session.service'

// Extend FastifyRequest to include user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: UserContext
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean
  roles?: string[]
  permissions?: string[]
  sessionRequired?: boolean
}

export class AuthMiddleware {
  /**
   * JWT Authentication middleware
   */
  static authenticate(options: AuthMiddlewareOptions = {}) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { required = true, roles = [], permissions = [] } = options

      try {
        // Extract token from Authorization header
        const authHeader = request.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (required) {
            return reply.code(401).send({
              success: false,
              error: {
                code: 'MISSING_TOKEN',
                message: 'Authorization token is required',
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
          return undefined // Optional authentication, continue without user context
        }

        const token = authHeader.substring(7)

        // Validate token and get user context
        const userContext = await AuthService.validateToken(token)

        // Check role requirements
        if (roles.length > 0 && !AuthService.hasRole(userContext, roles)) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_ROLE',
              message: `Required roles: ${roles.join(', ')}`,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Check permission requirements
        for (const permission of permissions) {
          if (!AuthService.hasPermission(userContext, permission)) {
            return reply.code(403).send({
              success: false,
              error: {
                code: 'INSUFFICIENT_PERMISSION',
                message: `Required permission: ${permission}`,
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
        }

        // Attach user context to request
        request.user = userContext

        request.log.info(
          {
            userId: userContext.userId,
            roles: userContext.roles,
            endpoint: request.url,
          },
          'Authenticated request',
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed'

        request.log.warn(
          {
            error: errorMessage,
            endpoint: request.url,
            ip: request.ip,
          },
          'Authentication error',
        )

        if (required) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: errorMessage,
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

  /**
   * Session-based authentication middleware
   */
  static authenticateSession(options: AuthMiddlewareOptions = {}) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { required = true, roles = [], permissions = [] } = options

      try {
        // Extract session ID from cookie or header
        const sessionId = request.cookies?.sessionId || (request.headers['x-session-id'] as string)

        if (!sessionId) {
          if (required) {
            return reply.code(401).send({
              success: false,
              error: {
                code: 'MISSING_SESSION',
                message: 'Session ID is required',
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
          return undefined
        }

        // Validate session and get user context
        const sessionContext = await SessionService.validateSession(sessionId)

        if (!sessionContext) {
          if (required) {
            return reply.code(401).send({
              success: false,
              error: {
                code: 'INVALID_SESSION',
                message: 'Session is invalid or expired',
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
          return undefined
        }

        // Get full user context with permissions
        const userContext = await AuthService.validateToken(
          // Create a temporary token for permission resolution
          AuthService.generateAccessToken({
            userId: sessionContext.userId,
            email: sessionContext.email,
            roles: sessionContext.roles,
          }),
        )

        // Check role requirements
        if (roles.length > 0 && !AuthService.hasRole(userContext, roles)) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_ROLE',
              message: `Required roles: ${roles.join(', ')}`,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Check permission requirements
        for (const permission of permissions) {
          if (!AuthService.hasPermission(userContext, permission)) {
            return reply.code(403).send({
              success: false,
              error: {
                code: 'INSUFFICIENT_PERMISSION',
                message: `Required permission: ${permission}`,
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
        }

        // Attach user context to request
        request.user = userContext

        // Update session last accessed time
        await SessionService.updateSession(sessionId, {
          lastAccessedAt: new Date(),
        })

        request.log.info(
          {
            userId: userContext.userId,
            sessionId,
            roles: userContext.roles,
            endpoint: request.url,
          },
          'Session authenticated request',
        )
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Session authentication failed'

        request.log.warn(
          {
            error: errorMessage,
            endpoint: request.url,
            ip: request.ip,
          },
          'Session authentication error',
        )

        if (required) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'SESSION_AUTH_FAILED',
              message: errorMessage,
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

  /**
   * Hybrid authentication (JWT or Session)
   */
  static authenticateHybrid(options: AuthMiddlewareOptions = {}) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Try JWT first, then session
      const authHeader = request.headers.authorization
      const sessionId = request.cookies?.sessionId || (request.headers['x-session-id'] as string)

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Use JWT authentication
        return this.authenticate(options)(request, reply)
      } else if (sessionId) {
        // Use session authentication
        return this.authenticateSession(options)(request, reply)
      } else if (options.required !== false) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'NO_AUTH_METHOD',
            message: 'Either JWT token or session ID is required',
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
   * Admin-only middleware
   */
  static requireAdmin() {
    return this.authenticate({
      required: true,
      roles: ['admin'],
    })
  }

  /**
   * Premium user middleware
   */
  static requirePremium() {
    return this.authenticate({
      required: true,
      roles: ['premium', 'admin'],
    })
  }

  /**
   * Self-access middleware (user can only access their own resources)
   */
  static requireSelfAccess(userIdParam: string = 'userId') {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // First authenticate the user
      await this.authenticate({ required: true })(request, reply)

      if (reply.sent) return undefined // Authentication failed

      const requestedUserId = (request.params as any)[userIdParam]
      const authenticatedUserId = request.user?.userId

      // Admin can access any user's resources
      if (request.user && AuthService.hasRole(request.user, ['admin'])) {
        return undefined
      }

      // User can only access their own resources
      if (requestedUserId !== authenticatedUserId) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own resources',
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
   * Optional authentication middleware
   */
  static optionalAuth() {
    return this.authenticate({ required: false })
  }

  /**
   * API Key authentication (for service-to-service communication)
   */
  static authenticateApiKey() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const apiKey = request.headers['x-api-key'] as string
      const validApiKeys = process.env.API_KEYS?.split(',') || []

      if (!apiKey || !validApiKeys.includes(apiKey)) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Valid API key is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }

      // Set service context
      request.user = {
        userId: 'service',
        email: 'service@drivemaster.com',
        roles: ['service'],
        permissions: ['*'], // Service has all permissions
      }

      request.log.info(
        {
          apiKey: apiKey.substring(0, 8) + '...',
          endpoint: request.url,
        },
        'API key authenticated request',
      )
    }
  }

  /**
   * Device fingerprinting middleware for additional security
   */
  static deviceFingerprint() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userAgent = request.headers['user-agent']
      const acceptLanguage = request.headers['accept-language']
      const acceptEncoding = request.headers['accept-encoding']

      // Create device fingerprint
      const fingerprint = Buffer.from(
        `${userAgent}:${acceptLanguage}:${acceptEncoding}:${request.ip}`,
      ).toString('base64')

      // Store fingerprint in request for later use
      ;(request as any).deviceFingerprint = fingerprint

      request.log.debug(
        {
          fingerprint: fingerprint.substring(0, 16) + '...',
          ip: request.ip,
        },
        'Device fingerprint generated',
      )
    }
  }

  /**
   * Audit logging middleware
   */
  static auditLog() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now()

      // Log request
      request.log.info(
        {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          userId: request.user?.userId,
          timestamp: new Date().toISOString(),
        },
        'API request audit',
      )

      // Hook into response to log completion
      reply.raw.on('finish', () => {
        const duration = Date.now() - startTime

        request.log.info(
          {
            method: request.method,
            url: request.url,
            statusCode: reply.raw.statusCode,
            duration,
            userId: request.user?.userId,
            timestamp: new Date().toISOString(),
          },
          'API response audit',
        )
      })
    }
  }
}
