import type { FastifyInstance } from 'fastify'
import { UserProfileService } from '../services/user-profile.service'
import {
  profileUpdateSchema,
  progressUpdateSchema,
  dataDeletionRequestSchema,
  userProfileResponseSchema,
  userProgressResponseSchema,
  cognitiveAnalysisResponseSchema,
} from '../schemas/user-profile.schemas'

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

function createErrorResponse(message: string, code: string, requestId?: string) {
  return {
    success: false as const,
    error: {
      message,
      code,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

export async function userRoutes(server: FastifyInstance): Promise<void> {
  // Get user profile
  server.get(
    '/profile',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user profile',
        description:
          "Retrieve the authenticated user's profile including cognitive patterns and learning preferences",
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: userProfileResponseSchema,
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const profile = await UserProfileService.getProfile(userId)
        if (!profile) {
          reply.code(404)
          return createErrorResponse('User profile not found', 'PROFILE_NOT_FOUND', request.id)
        }

        return createSuccessResponse(profile, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting user profile')
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Update user profile
  server.put(
    '/profile',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user profile',
        description:
          'Update user profile information, cognitive patterns, and learning preferences',
        security: [{ Bearer: [] }],
        body: profileUpdateSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: userProfileResponseSchema,
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const updates = request.body as any
        const updatedProfile = await UserProfileService.updateProfile(userId, updates)

        return createSuccessResponse(updatedProfile, request.id)
      } catch (error) {
        server.log.error(error, 'Error updating user profile')
        if (error instanceof Error && error.message === 'User not found') {
          reply.code(404)
          return createErrorResponse('User not found', 'USER_NOT_FOUND', request.id)
        }
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Get user progress analytics
  server.get(
    '/progress',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user progress analytics',
        description:
          'Retrieve comprehensive user progress including sessions, accuracy, streaks, and achievements',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: userProgressResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const progress = await UserProfileService.getUserProgress(userId)
        return createSuccessResponse(progress, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting user progress')
        if (error instanceof Error && error.message === 'User not found') {
          reply.code(404)
          return createErrorResponse('User not found', 'USER_NOT_FOUND', request.id)
        }
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Update user progress after learning activity
  server.post(
    '/progress',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user progress',
        description: 'Record learning activity and update user progress metrics',
        security: [{ Bearer: [] }],
        body: progressUpdateSchema,
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
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const progressUpdate = request.body as any
        await UserProfileService.updateProgress(userId, progressUpdate)

        return createSuccessResponse({ message: 'Progress updated successfully' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error updating user progress')
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Analyze cognitive patterns
  server.post(
    '/cognitive-analysis',
    {
      schema: {
        tags: ['Users'],
        summary: 'Analyze cognitive patterns',
        description: 'Analyze user behavior to detect and update cognitive learning patterns',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: cognitiveAnalysisResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const analysis = await UserProfileService.analyzeCognitivePatterns(userId)
        return createSuccessResponse(analysis, request.id)
      } catch (error) {
        server.log.error(error, 'Error analyzing cognitive patterns')
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Export user data (GDPR/CCPA compliance)
  server.get(
    '/export',
    {
      schema: {
        tags: ['Users'],
        summary: 'Export user data',
        description: 'Export all user data for GDPR/CCPA compliance',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const exportData = await UserProfileService.exportUserData(userId)

        // Set appropriate headers for file download
        reply.header('Content-Type', 'application/json')
        reply.header('Content-Disposition', `attachment; filename="user-data-${userId}.json"`)

        return createSuccessResponse(exportData, request.id)
      } catch (error) {
        server.log.error(error, 'Error exporting user data')
        if (error instanceof Error && error.message === 'User not found') {
          reply.code(404)
          return createErrorResponse('User not found', 'USER_NOT_FOUND', request.id)
        }
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Request data deletion (GDPR/CCPA compliance)
  server.post(
    '/delete-request',
    {
      schema: {
        tags: ['Users'],
        summary: 'Request data deletion',
        description: 'Schedule user data deletion for GDPR/CCPA compliance',
        security: [{ Bearer: [] }],
        body: dataDeletionRequestSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  reason: { type: 'string' },
                  requestedAt: { type: 'string' },
                  scheduledFor: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId
        if (!userId) {
          reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { reason, scheduledFor } = request.body as any
        const deletionRequest = await UserProfileService.scheduleDataDeletion(
          userId,
          reason,
          scheduledFor,
        )

        return createSuccessResponse(deletionRequest, request.id)
      } catch (error) {
        server.log.error(error, 'Error scheduling data deletion')
        reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )
}
