import { FastifyInstance } from 'fastify'
import { GamificationService } from '../services/gamification-service.js'
import { VisualizationType, ChallengeType } from '../types/gamification.js'

export async function gamificationRoutes(fastify: FastifyInstance) {
  const gamificationService = fastify.gamificationService as GamificationService

  // Process user activity and update gamification elements
  fastify.post<{
    Body: {
      userId: string
      activityType: string
      performance?: {
        questionsAnswered?: number
        isCorrect?: boolean
        accuracy?: number
        averageResponseTime?: number
        isPerfectSession?: boolean
        studyTime?: number
      }
      difficulty?: string
      topicId?: string
      sessionId?: string
    }
  }>('/gamification/activity', async (request, reply) => {
    const { userId, activityType, performance, difficulty, topicId, sessionId } = request.body

    try {
      const result = await gamificationService.processUserActivity(userId, {
        type: activityType as any,
        performance,
        difficulty,
        topicId,
        sessionId,
      })

      return { success: true, result }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get user's complete game profile
  fastify.get<{
    Params: { userId: string }
  }>('/users/:userId/game-profile', async (request, reply) => {
    const { userId } = request.params

    try {
      const profile = await gamificationService.getUserGameProfile(userId)
      return { success: true, profile }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Update user gamification preferences
  fastify.put<{
    Params: { userId: string }
    Body: {
      enableXPNotifications?: boolean
      enableAchievementNotifications?: boolean
      enableStreakReminders?: boolean
      enableChallengeInvitations?: boolean
      enableLeaderboardUpdates?: boolean
      enableProgressCelebrations?: boolean
      competitiveMode?: boolean
      publicProfile?: boolean
    }
  }>('/users/:userId/gamification-preferences', async (request, reply) => {
    const { userId } = request.params
    const preferences = request.body

    try {
      await gamificationService.updateUserPreferences(userId, preferences)
      return { success: true }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Create a friend challenge
  fastify.post<{
    Body: {
      creatorId: string
      friendId: string
      challengeType: string
      duration?: number
    }
  }>('/gamification/challenges/friend', async (request, reply) => {
    const { creatorId, friendId, challengeType, duration } = request.body

    try {
      const challenge = await gamificationService.createFriendChallenge(
        creatorId,
        friendId,
        challengeType,
        duration,
      )

      return { success: true, challenge }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get leaderboards
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      type?: 'xp' | 'streak' | 'accuracy'
      period?: 'daily' | 'weekly' | 'monthly' | 'all_time'
      limit?: number
    }
  }>('/users/:userId/leaderboards', async (request, reply) => {
    const { userId } = request.params
    const { type, period, limit } = request.query

    try {
      const leaderboards = await gamificationService.getLeaderboards(userId)

      if (type) {
        return { success: true, leaderboard: leaderboards[type] }
      }

      return { success: true, leaderboards }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get progress visualization
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      type: VisualizationType
      timeframe?: number
    }
  }>('/users/:userId/progress-visualization', async (request, reply) => {
    const { userId } = request.params
    const { type, timeframe } = request.query

    try {
      const visualization = await gamificationService.getProgressVisualization(userId, type)
      return { success: true, visualization }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get user celebrations
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      limit?: number
      unviewedOnly?: boolean
    }
  }>('/users/:userId/celebrations', async (request, reply) => {
    const { userId } = request.params
    const { limit = 10, unviewedOnly } = request.query

    try {
      let celebrations = await gamificationService.getCelebrations(userId, limit)

      if (unviewedOnly) {
        celebrations = celebrations.filter((c) => !c.isViewed)
      }

      return { success: true, celebrations }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Mark celebration as viewed
  fastify.post<{
    Params: { userId: string; celebrationId: string }
  }>('/users/:userId/celebrations/:celebrationId/viewed', async (request, reply) => {
    const { userId, celebrationId } = request.params

    try {
      await gamificationService.markCelebrationViewed(userId, celebrationId)
      return { success: true }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Use streak freeze
  fastify.post<{
    Params: { userId: string }
  }>('/users/:userId/streak-freeze', async (request, reply) => {
    const { userId } = request.params

    try {
      const success = await gamificationService.useStreakFreeze(userId)

      if (success) {
        return { success: true, message: 'Streak freeze used successfully' }
      } else {
        return { success: false, message: 'Unable to use streak freeze' }
      }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get daily challenge
  fastify.get('/gamification/daily-challenge', async (request, reply) => {
    try {
      const challenge = await gamificationService.getDailyChallenge()
      return { success: true, challenge }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get XP to next level
  fastify.get<{
    Params: { userId: string }
  }>('/users/:userId/xp-to-next-level', async (request, reply) => {
    const { userId } = request.params

    try {
      // This would be implemented in the XP system
      const profile = await gamificationService.getUserGameProfile(userId)
      const currentLevelXP = Math.pow(profile.level - 1, 2) * 100
      const nextLevelXP = Math.pow(profile.level, 2) * 100
      const xpToNext = nextLevelXP - profile.totalXP

      return {
        success: true,
        data: {
          currentLevel: profile.level,
          currentXP: profile.totalXP,
          currentLevelXP,
          nextLevelXP,
          xpToNext,
          progressPercentage:
            ((profile.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
        },
      }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get user achievements
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      category?: string
      unlocked?: boolean
    }
  }>('/users/:userId/achievements', async (request, reply) => {
    const { userId } = request.params
    const { category, unlocked } = request.query

    try {
      const profile = await gamificationService.getUserGameProfile(userId)
      let achievements = profile.achievements

      if (category) {
        achievements = achievements.filter((a) => a.category === category)
      }

      if (unlocked !== undefined) {
        achievements = achievements.filter((a) => a.isUnlocked === unlocked)
      }

      return { success: true, achievements }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get user challenges
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      status?: 'pending' | 'active' | 'completed'
      type?: ChallengeType
    }
  }>('/users/:userId/challenges', async (request, reply) => {
    const { userId } = request.params
    const { status, type } = request.query

    try {
      // This would be implemented in the challenge system
      const profile = await gamificationService.getUserGameProfile(userId)
      let challenges = profile.challenges

      if (status) {
        challenges = challenges.filter((c) => c.status === status)
      }

      if (type) {
        challenges = challenges.filter((c) => c.type === type)
      }

      return { success: true, challenges }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get gamification statistics
  fastify.get<{
    Params: { userId: string }
  }>('/users/:userId/gamification-stats', async (request, reply) => {
    const { userId } = request.params

    try {
      const profile = await gamificationService.getUserGameProfile(userId)
      const leaderboards = await gamificationService.getLeaderboards(userId)

      const stats = {
        level: profile.level,
        totalXP: profile.totalXP,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        achievementsUnlocked: profile.achievements.filter((a) => a.isUnlocked).length,
        totalAchievements: profile.achievements.length,
        activeChallenges: profile.challenges.filter((c) => c.status === 'active').length,
        completedChallenges: profile.challenges.filter((c) => c.status === 'completed').length,
        leaderboardRanks: leaderboards.userRanks,
        statistics: profile.statistics,
      }

      return { success: true, stats }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
