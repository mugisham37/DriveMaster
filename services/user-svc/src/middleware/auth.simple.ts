import type { FastifyRequest, FastifyReply } from 'fastify'

import { AuthService } from '../services/auth.simple'

export interface AuthMiddlewareOptions {
  required?: boolean
  roles?: string[]
  permissions?: string[]
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

        if (!(authHeader?.startsWith('Bearer ') ?? false)) {
          if (required === true) {
            void reply.code(401).send({
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
            return
          }
          return // Optional authentication, continue without user context
        }

        const token = authHeader.substring(7)

        // Validate token and get user context
        const userContext = await AuthService.validateToken(token)

        // Check role requirements
        if (roles.length > 0 && !AuthService.hasRole(userContext, roles)) {
          void reply.code(403).send({
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
          return
        }

        // Check permission requirements
        for (const permission of permissions) {
          if (!AuthService.hasPermission(userContext, permission)) {
            void reply.code(403).send({
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
            return
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

        if (required === true) {
          void reply.code(401).send({
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
          return
        }
      }
    }
  }

  /**
   * Device fingerprinting middleware for additional security
   */
  static deviceFingerprint() {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const userAgent = request.headers['user-agent']
      const acceptLanguage = request.headers['accept-language']
      const acceptEncoding = request.headers['accept-encoding']

      // Create device fingerprint
      const fingerprint = Buffer.from(
        `${userAgent}:${acceptLanguage}:${acceptEncoding}:${request.ip}`,
      ).toString('base64')

      // Store fingerprint in request for later use
      ;(request as FastifyRequest & { deviceFingerprint: string }).deviceFingerprint = fingerprint

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
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const startTime = Date.now()

      // Log request
      request.log.info(
        {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          userId: (request.user?.userId as string) ?? 'anonymous',
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
            userId: (request.user?.userId as string) ?? 'anonymous',
            timestamp: new Date().toISOString(),
          },
          'API response audit',
        )
      })
    }
  }
}
