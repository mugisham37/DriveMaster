import type { FastifyInstance } from 'fastify'

import {
  friendRequestSchema,
  friendRequestResponseSchema,
  friendsListResponseSchema,
  pendingRequestsResponseSchema,
  leaderboardResponseSchema,
  userSearchResponseSchema,
  progressShareSchema,
  socialStatsResponseSchema,
} from '../schemas/social.schemas'
import { SocialService } from '../services/social.service'

// Type definitions for request bodies
interface FriendRequestBody {
  addresseeId: string
}

interface ProgressShareBody {
  achievementId?: string
  xpGained?: number
  streakMilestone?: number
  customMessage?: string
  shareToSocial?: boolean
}

// Type guard for authenticated user
function isAuthenticatedUser(user: unknown): user is { userId: string } {
  return (
    typeof user === 'object' &&
    user !== null &&
    'userId' in user &&
    typeof (user as { userId: unknown }).userId === 'string'
  )
}

function createSuccessResponse<T>(
  data: T,
  requestId?: string,
): {
  success: true
  data: T
  meta: {
    timestamp: string
    requestId?: string
  }
} {
  return {
    success: true as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

function createErrorResponse(
  message: string,
  code: string,
  requestId?: string,
): {
  success: false
  error: {
    message: string
    code: string
  }
  meta: {
    timestamp: string
    requestId?: string
  }
} {
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

export function socialRoutes(server: FastifyInstance): void {
  // Send friend request
  server.post(
    '/friends/request',
    {
      schema: {
        tags: ['Social'],
        summary: 'Send friend request',
        description: 'Send a friend request to another user',
        security: [{ Bearer: [] }],
        body: friendRequestSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: friendRequestResponseSchema,
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { addresseeId } = request.body as FriendRequestBody
        const friendRequest = await SocialService.sendFriendRequest(
          request.user.userId,
          addresseeId,
        )

        return createSuccessResponse(friendRequest, request.id)
      } catch (error) {
        server.log.error(error, 'Error sending friend request')
        const message = error instanceof Error ? error.message : 'Internal server error'
        const code = message.includes('not found')
          ? 'USER_NOT_FOUND'
          : message.includes('already')
            ? 'ALREADY_EXISTS'
            : message.includes('disabled')
              ? 'SOCIAL_DISABLED'
              : 'INTERNAL_ERROR'

        await reply.code(message.includes('not found') ? 404 : 400)
        return createErrorResponse(message, code, request.id)
      }
    },
  )

  // Accept friend request
  server.post(
    '/friends/accept/:friendshipId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Accept friend request',
        description: 'Accept a pending friend request',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            friendshipId: { type: 'string', format: 'uuid' },
          },
          required: ['friendshipId'],
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { friendshipId } = request.params as { friendshipId: string }
        await SocialService.acceptFriendRequest(request.user.userId, friendshipId)

        return createSuccessResponse({ message: 'Friend request accepted' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error accepting friend request')
        const message = error instanceof Error ? error.message : 'Internal server error'
        await reply.code(message.includes('not found') ? 404 : 400)
        return createErrorResponse(message, 'REQUEST_ERROR', request.id)
      }
    },
  )

  // Decline friend request
  server.post(
    '/friends/decline/:friendshipId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Decline friend request',
        description: 'Decline a pending friend request',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            friendshipId: { type: 'string', format: 'uuid' },
          },
          required: ['friendshipId'],
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { friendshipId } = request.params as { friendshipId: string }
        await SocialService.declineFriendRequest(request.user.userId, friendshipId)

        return createSuccessResponse({ message: 'Friend request declined' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error declining friend request')
        const message = error instanceof Error ? error.message : 'Internal server error'
        await reply.code(message.includes('not found') ? 404 : 400)
        return createErrorResponse(message, 'REQUEST_ERROR', request.id)
      }
    },
  )

  // Remove friend
  server.delete(
    '/friends/:friendId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Remove friend',
        description: 'Remove a friend from friends list',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            friendId: { type: 'string', format: 'uuid' },
          },
          required: ['friendId'],
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { friendId } = request.params as { friendId: string }
        await SocialService.removeFriend(request.user.userId, friendId)

        return createSuccessResponse({ message: 'Friend removed successfully' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error removing friend')
        const message = error instanceof Error ? error.message : 'Internal server error'
        await reply.code(message.includes('not found') ? 404 : 400)
        return createErrorResponse(message, 'FRIENDSHIP_ERROR', request.id)
      }
    },
  )

  // Block user
  server.post(
    '/users/block/:userId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Block user',
        description: 'Block a user from sending friend requests',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { userId } = request.params as { userId: string }
        await SocialService.blockUser(request.user.userId, userId)

        return createSuccessResponse({ message: 'User blocked successfully' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error blocking user')
        const message = error instanceof Error ? error.message : 'Internal server error'
        await reply.code(400)
        return createErrorResponse(message, 'BLOCK_ERROR', request.id)
      }
    },
  )

  // Unblock user
  server.post(
    '/users/unblock/:userId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Unblock user',
        description: 'Unblock a previously blocked user',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const { userId } = request.params as { userId: string }
        await SocialService.unblockUser(request.user.userId, userId)

        return createSuccessResponse({ message: 'User unblocked successfully' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error unblocking user')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Get friends list
  server.get(
    '/friends',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get friends list',
        description: 'Get list of user friends with online status',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: friendsListResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const friends = await SocialService.getFriends(request.user.userId)
        return createSuccessResponse({ friends }, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting friends list')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Get pending friend requests
  server.get(
    '/friends/pending',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get pending friend requests',
        description: 'Get sent and received pending friend requests',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: pendingRequestsResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const pendingRequests = await SocialService.getPendingRequests(request.user.userId)
        return createSuccessResponse(pendingRequests, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting pending requests')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Get leaderboard
  server.get(
    '/leaderboard',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get leaderboard',
        description: 'Get leaderboard with ranking and privacy controls',
        security: [{ Bearer: [] }],
        querystring: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              enum: ['global', 'friends'],
              default: 'global',
            },
            timeframe: {
              type: 'string',
              enum: ['all_time', 'weekly', 'monthly'],
              default: 'all_time',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: leaderboardResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const query = request.query as {
          scope?: 'global' | 'friends'
          timeframe?: 'all_time' | 'weekly' | 'monthly'
          limit?: number
        }

        const leaderboard = await SocialService.getLeaderboard(
          request.user.userId,
          query.scope ?? 'global',
          query.timeframe ?? 'all_time',
          query.limit ?? 50,
        )

        return createSuccessResponse({ leaderboard }, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting leaderboard')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Search users
  server.get(
    '/users/search',
    {
      schema: {
        tags: ['Social'],
        summary: 'Search users',
        description: 'Search for users with privacy settings respected',
        security: [{ Bearer: [] }],
        querystring: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              default: 20,
            },
          },
          required: ['q'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: userSearchResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const query = request.query as { q: string; limit?: number }
        const searchResults = await SocialService.searchUsers(
          request.user.userId,
          query.q,
          query.limit ?? 20,
        )

        return createSuccessResponse({ users: searchResults }, request.id)
      } catch (error) {
        server.log.error(error, 'Error searching users')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Share progress
  server.post(
    '/progress/share',
    {
      schema: {
        tags: ['Social'],
        summary: 'Share progress',
        description: 'Share progress with friends and social media',
        security: [{ Bearer: [] }],
        body: progressShareSchema,
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
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const shareData = request.body as ProgressShareBody
        const progressShareData = { ...shareData, userId: request.user.userId }
        await SocialService.shareProgress(request.user.userId, progressShareData)

        return createSuccessResponse({ message: 'Progress shared successfully' }, request.id)
      } catch (error) {
        server.log.error(error, 'Error sharing progress')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )

  // Get social statistics
  server.get(
    '/stats',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get social statistics',
        description: 'Get comprehensive social statistics for the user',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: socialStatsResponseSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!isAuthenticatedUser(request.user)) {
          await reply.code(401)
          return createErrorResponse('Unauthorized', 'UNAUTHORIZED', request.id)
        }

        const stats = await SocialService.getSocialStats(request.user.userId)
        return createSuccessResponse(stats, request.id)
      } catch (error) {
        server.log.error(error, 'Error getting social stats')
        await reply.code(500)
        return createErrorResponse('Internal server error', 'INTERNAL_ERROR', request.id)
      }
    },
  )
}
