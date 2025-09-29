// Social feature schemas for request/response validation

export const friendRequestSchema = {
  type: 'object',
  properties: {
    addresseeId: {
      type: 'string',
      format: 'uuid',
      description: 'ID of the user to send friend request to',
    },
  },
  required: ['addresseeId'],
  additionalProperties: false,
} as const

export const friendRequestResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    requesterId: { type: 'string', format: 'uuid' },
    addresseeId: { type: 'string', format: 'uuid' },
    requesterProfile: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: ['string', 'null'] },
        lastName: { type: ['string', 'null'] },
        totalXP: { type: 'number' },
        currentStreak: { type: 'number' },
      },
      required: ['id', 'firstName', 'lastName', 'totalXP', 'currentStreak'],
    },
    addresseeProfile: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: ['string', 'null'] },
        lastName: { type: ['string', 'null'] },
        totalXP: { type: 'number' },
        currentStreak: { type: 'number' },
      },
      required: ['id', 'firstName', 'lastName', 'totalXP', 'currentStreak'],
    },
    status: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'requesterId',
    'addresseeId',
    'requesterProfile',
    'addresseeProfile',
    'status',
    'createdAt',
  ],
} as const

export const friendSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    firstName: { type: ['string', 'null'] },
    lastName: { type: ['string', 'null'] },
    totalXP: { type: 'number' },
    currentStreak: { type: 'number' },
    longestStreak: { type: 'number' },
    lastActiveAt: { type: ['string', 'null'], format: 'date-time' },
    isOnline: { type: 'boolean' },
  },
  required: [
    'id',
    'firstName',
    'lastName',
    'totalXP',
    'currentStreak',
    'longestStreak',
    'lastActiveAt',
    'isOnline',
  ],
} as const

export const friendsListResponseSchema = {
  type: 'object',
  properties: {
    friends: {
      type: 'array',
      items: friendSchema,
    },
  },
  required: ['friends'],
} as const

export const pendingRequestsResponseSchema = {
  type: 'object',
  properties: {
    sent: {
      type: 'array',
      items: friendRequestResponseSchema,
    },
    received: {
      type: 'array',
      items: friendRequestResponseSchema,
    },
  },
  required: ['sent', 'received'],
} as const

export const leaderboardEntrySchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
    firstName: { type: ['string', 'null'] },
    lastName: { type: ['string', 'null'] },
    totalXP: { type: 'number' },
    currentStreak: { type: 'number' },
    longestStreak: { type: 'number' },
    rank: { type: 'number' },
    weeklyXP: { type: 'number' },
    monthlyXP: { type: 'number' },
  },
  required: [
    'userId',
    'firstName',
    'lastName',
    'totalXP',
    'currentStreak',
    'longestStreak',
    'rank',
  ],
} as const

export const leaderboardResponseSchema = {
  type: 'object',
  properties: {
    leaderboard: {
      type: 'array',
      items: leaderboardEntrySchema,
    },
  },
  required: ['leaderboard'],
} as const

export const userSearchResultSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    firstName: { type: ['string', 'null'] },
    lastName: { type: ['string', 'null'] },
    totalXP: { type: 'number' },
    currentStreak: { type: 'number' },
    friendshipStatus: {
      type: 'string',
      enum: ['none', 'pending_sent', 'pending_received', 'friends', 'blocked'],
    },
  },
  required: ['id', 'firstName', 'lastName', 'totalXP', 'currentStreak', 'friendshipStatus'],
} as const

export const userSearchResponseSchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      items: userSearchResultSchema,
    },
  },
  required: ['users'],
} as const

export const progressShareSchema = {
  type: 'object',
  properties: {
    achievementId: {
      type: 'string',
      format: 'uuid',
      description: 'ID of the achievement to share',
    },
    xpGained: {
      type: 'number',
      minimum: 0,
      description: 'Amount of XP gained to share',
    },
    streakMilestone: {
      type: 'number',
      minimum: 1,
      description: 'Streak milestone reached',
    },
    customMessage: {
      type: 'string',
      maxLength: 280,
      description: 'Custom message to include with the share',
    },
    shareToSocial: {
      type: 'boolean',
      default: false,
      description: 'Whether to share to external social media platforms',
    },
  },
  additionalProperties: false,
} as const

export const socialStatsResponseSchema = {
  type: 'object',
  properties: {
    friendsCount: { type: 'number' },
    pendingRequestsCount: { type: 'number' },
    globalRank: { type: 'number' },
    friendsRank: { type: 'number' },
    weeklyXP: { type: 'number' },
    monthlyXP: { type: 'number' },
    recentAchievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          completedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'completedAt'],
      },
    },
  },
  required: [
    'friendsCount',
    'pendingRequestsCount',
    'globalRank',
    'friendsRank',
    'weeklyXP',
    'monthlyXP',
    'recentAchievements',
  ],
} as const
