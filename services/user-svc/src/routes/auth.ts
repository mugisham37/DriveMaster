import type { FastifyInstance } from 'fastify'

function createSuccessResponse<T>(data: T, requestId?: string) {
  return {
    success: true as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

export async function authRoutes(server: FastifyInstance): Promise<void> {
  // Login endpoint
  server.post(
    '/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'User login',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
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
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      createdAt: { type: 'string' },
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
        },
      },
    },
    async (request, reply) => {
      // This is a placeholder implementation
      // The actual authentication logic will be implemented in task 3.1
      const { email, password } = request.body as { email: string; password: string }

      server.log.info({ email }, 'Login attempt')

      // Placeholder response
      return createSuccessResponse(
        {
          accessToken: 'placeholder-jwt-token',
          refreshToken: 'placeholder-refresh-token',
          user: {
            id: 'placeholder-user-id',
            email,
            createdAt: new Date().toISOString(),
          },
        },
        request.id,
      )
    },
  )

  // Register endpoint
  server.post(
    '/register',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'User registration',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      // Placeholder implementation
      const { email, password } = request.body as { email: string; password: string }

      server.log.info({ email }, 'Registration attempt')

      return createSuccessResponse(
        {
          message: 'User registered successfully',
          user: {
            id: 'placeholder-user-id',
            email,
            createdAt: new Date().toISOString(),
          },
        },
        request.id,
      )
    },
  )

  // Token refresh endpoint
  server.post(
    '/refresh',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      // Placeholder implementation
      const { refreshToken } = request.body as { refreshToken: string }

      server.log.info('Token refresh attempt')

      return createSuccessResponse(
        {
          accessToken: 'new-placeholder-jwt-token',
          refreshToken: 'new-placeholder-refresh-token',
        },
        request.id,
      )
    },
  )
}
