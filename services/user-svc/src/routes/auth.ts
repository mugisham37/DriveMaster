import type { FastifyInstance } from 'fastify'

import { AuthMiddleware } from '../middleware/auth.middleware'
import { RateLimitHandler } from '../middleware/rate-limit-handler.middleware'
import { AuthService, type LoginCredentials, type RegisterData } from '../services/auth.service'
import { SessionService } from '../services/session.service'
import type { UserContext } from '../types/auth.types'

interface SuccessResponse<T> {
  success: true
  data: T
  meta: {
    timestamp: string
    requestId?: string
  }
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
  meta: {
    timestamp: string
    requestId?: string
  }
}

function createSuccessResponse<T>(data: T, requestId?: string): SuccessResponse<T> {
  return {
    success: true as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

function createErrorResponse(code: string, message: string, requestId?: string): ErrorResponse {
  return {
    success: false as const,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

export function authRoutes(server: FastifyInstance): void {
  // Login endpoint with rate limiting
  server.post(
    '/login',
    {
      preHandler: [
        RateLimitHandler.authRateLimit(),
        AuthMiddleware.deviceFingerprint(),
        AuthMiddleware.auditLog(),
      ],
      schema: {
        tags: ['Authentication'],
        summary: 'User login with JWT and session creation',
        description:
          'Authenticate user with email and password, returns JWT tokens and creates session',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
            },
            createSession: {
              type: 'boolean',
              default: false,
              description: 'Whether to create a server-side session',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  sessionId: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      createdAt: { type: 'string' },
                      cognitivePatterns: { type: 'object' },
                      learningPreferences: { type: 'object' },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          email,
          password,
          createSession = false,
        } = request.body as LoginCredentials & { createSession?: boolean }

        server.log.info({ email, createSession }, 'Login attempt')

        // Authenticate user
        const authResult = await AuthService.authenticate({ email, password })

        let sessionId: string | undefined

        // Create session if requested
        if (createSession) {
          const userAgent = request.headers['user-agent']

          sessionId = await SessionService.createSession({
            userId: authResult.user.id,
            email: authResult.user.email,
            roles: ['user'], // Default role
            deviceInfo: {
              userAgent,
              ip: request.ip,
              deviceType: detectDeviceType(userAgent),
            },
          })

          // Set session cookie
          void reply.setCookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          })
        }

        server.log.info(
          {
            userId: authResult.user.id,
            email: authResult.user.email,
            sessionCreated: sessionId !== undefined && sessionId.length > 0,
          },
          'Login successful',
        )

        return createSuccessResponse(
          {
            ...authResult,
            sessionId,
          },
          request.id,
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed'

        const requestBody = request.body as LoginCredentials | undefined
        server.log.warn(
          {
            email: requestBody?.email,
            error: errorMessage,
            ip: request.ip,
          },
          'Login failed',
        )

        void reply.code(401)
        return createErrorResponse('LOGIN_FAILED', errorMessage, request.id)
      }
    },
  )

  // Register endpoint with rate limiting
  server.post(
    '/register',
    {
      preHandler: [
        RateLimitHandler.registrationRateLimit(),
        AuthMiddleware.deviceFingerprint(),
        AuthMiddleware.auditLog(),
      ],
      schema: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Register a new user account with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
            },
            firstName: {
              type: 'string',
              maxLength: 100,
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              description: 'User last name',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'User date of birth (YYYY-MM-DD)',
            },
            cognitivePatterns: {
              type: 'object',
              description: 'Initial cognitive learning patterns',
              properties: {
                learningStyle: {
                  type: 'string',
                  enum: ['visual', 'auditory', 'kinesthetic', 'mixed'],
                },
                processingSpeed: {
                  type: 'number',
                  minimum: 0.1,
                  maximum: 2.0,
                },
                attentionSpan: {
                  type: 'number',
                  minimum: 5,
                  maximum: 120,
                },
                preferredSessionLength: {
                  type: 'number',
                  minimum: 10,
                  maximum: 180,
                },
                optimalTimeOfDay: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['morning', 'afternoon', 'evening', 'night'],
                  },
                },
                difficultyPreference: {
                  type: 'string',
                  enum: ['gradual', 'challenging', 'mixed'],
                },
                feedbackPreference: {
                  type: 'string',
                  enum: ['immediate', 'delayed', 'summary'],
                },
              },
            },
            learningPreferences: {
              type: 'object',
              description: 'User learning preferences and settings',
              properties: {
                enableNotifications: { type: 'boolean' },
                notificationFrequency: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                },
                studyReminders: { type: 'boolean' },
                socialFeatures: { type: 'boolean' },
                gamificationEnabled: { type: 'boolean' },
                preferredLanguage: { type: 'string' },
                accessibilityOptions: {
                  type: 'object',
                  properties: {
                    highContrast: { type: 'boolean' },
                    largeText: { type: 'boolean' },
                    screenReader: { type: 'boolean' },
                    reducedMotion: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      createdAt: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userData = request.body as RegisterData

        server.log.info({ email: userData.email }, 'Registration attempt')

        // Register user
        const authResult = await AuthService.register(userData)

        server.log.info(
          {
            userId: authResult.user.id,
            email: authResult.user.email,
          },
          'Registration successful',
        )

        void reply.code(201)
        return createSuccessResponse(authResult, request.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Registration failed'

        const requestBody = request.body as RegisterData | undefined
        server.log.warn(
          {
            email: requestBody?.email,
            error: errorMessage,
            ip: request.ip,
          },
          'Registration failed',
        )

        void reply.code(400)
        return createErrorResponse('REGISTRATION_FAILED', errorMessage, request.id)
      }
    },
  )

  // Token refresh endpoint
  server.post(
    '/refresh',
    {
      preHandler: [AuthMiddleware.auditLog()],
      schema: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Refresh an expired access token using a valid refresh token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string }

        server.log.info('Token refresh attempt')

        // Refresh tokens
        const tokenPair = await AuthService.refreshToken(refreshToken)

        server.log.info('Token refresh successful')

        return createSuccessResponse(tokenPair, request.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'

        server.log.warn(
          {
            error: errorMessage,
            ip: request.ip,
          },
          'Token refresh failed',
        )

        void reply.code(401)
        return createErrorResponse('TOKEN_REFRESH_FAILED', errorMessage, request.id)
      }
    },
  )

  // Logout endpoint
  server.post(
    '/logout',
    {
      preHandler: [AuthMiddleware.authenticate({ required: false }), AuthMiddleware.auditLog()],
      schema: {
        tags: ['Authentication'],
        summary: 'User logout',
        description: 'Logout user and invalidate session if exists',
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string' },
            'x-session-id': { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const sessionId = request.cookies?.sessionId ?? (request.headers['x-session-id'] as string)

        if (sessionId !== undefined && sessionId !== null && sessionId.length > 0) {
          await SessionService.deleteSession(sessionId)
          void reply.clearCookie('sessionId')
        }

        server.log.info(
          {
            userId: getUserId(request.user),
            sessionId,
          },
          'Logout successful',
        )

        return createSuccessResponse({ message: 'Logged out successfully' }, request.id)
      } catch (error) {
        server.log.warn(
          {
            error: error instanceof Error ? error.message : 'Logout error',
            userId: getUserId(request.user),
          },
          'Logout error',
        )

        return createSuccessResponse({ message: 'Logged out successfully' }, request.id)
      }
    },
  )

  // Validate token endpoint
  server.get(
    '/validate',
    {
      preHandler: [AuthMiddleware.authenticate({ required: true })],
      schema: {
        tags: ['Authentication'],
        summary: 'Validate access token',
        description: 'Validate the current access token and return user context',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      email: { type: 'string' },
                      roles: { type: 'array', items: { type: 'string' } },
                      permissions: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, _reply) => {
      return createSuccessResponse({ user: request.user }, request.id)
    },
  )

  // Session info endpoint
  server.get(
    '/session',
    {
      preHandler: [AuthMiddleware.authenticate({ required: true })],
      schema: {
        tags: ['Authentication'],
        summary: 'Get current session information',
        description: 'Get information about the current user session',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  sessions: { type: 'array' },
                },
              },
            },
          },
        },
      },
    },
    async (request, _reply) => {
      try {
        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const sessions = await SessionService.getUserSessions(user.userId)

        return createSuccessResponse({ sessions }, request.id)
      } catch (error) {
        server.log.warn(
          {
            error: error instanceof Error ? error.message : 'Session info error',
            userId: getUserId(request.user),
          },
          'Session info error',
        )

        return createSuccessResponse({ sessions: [] }, request.id)
      }
    },
  )
}

// Helper function to detect device type
function detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
  if (userAgent === undefined || userAgent === null || userAgent.length === 0) return 'desktop'

  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile'
  }

  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet'
  }

  return 'desktop'
}

function getUserId(user?: UserContext): string {
  return user?.userId ?? 'unknown'
}
