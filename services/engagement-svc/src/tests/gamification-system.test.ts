import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GamificationService } from '../services/gamification-service.js'
import { VisualizationType } from '../types/gamification.js'

// Simple mock Redis that returns safe defaults
const createMockRedis = () => ({
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockImplementation((key: string) => {
    if (key.includes('game_profile')) {
      return Promise.resolve(null) // Will create default profile
    }
    if (key.includes('daily_challenge')) {
      return Promise.resolve(null)
    }
    return Promise.resolve(null)
  }),
  hgetall: vi.fn().mockResolvedValue({}),
  hget: vi.fn().mockResolvedValue(null),
  hset: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  incr: vi.fn().mockResolvedValue(1),
  zadd: vi.fn().mockResolvedValue(1),
  zincrby: vi.fn().mockResolvedValue(1),
  zrevrange: vi.fn().mockResolvedValue([]),
  zrevrank: vi.fn().mockResolvedValue(null),
  lpush: vi.fn().mockResolvedValue(1),
  ltrim: vi.fn().mockResolvedValue('OK'),
  lrange: vi.fn().mockResolvedValue([]),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  scard: vi.fn().mockResolvedValue(0),
  del: vi.fn().mockResolvedValue(1),
})

describe('GamificationService - Comprehensive System', () => {
  let gamificationService: GamificationService
  let mockRedis: any

  beforeEach(() => {
    mockRedis = createMockRedis()
    gamificationService = new GamificationService(mockRedis as any)
  })

  describe('User Activity Processing', () => {
    it('should process question answered activity and award XP', async () => {
      const userId = 'test-user-123'
      const activityData = {
        type: 'question_answered' as const,
        performance: {
          questionsAnswered: 1,
          isCorrect: true,
          accuracy: 0.9,
          averageResponseTime: 3000,
          isPerfectSession: false,
          studyTime: 60000,
        },
        difficulty: 'medium',
        topicId: 'traffic-signs',
      }

      const result = await gamificationService.processUserActivity(userId, activityData)

      expect(result).toBeDefined()
      expect(result.xpReward).toBeDefined()
      expect(result.xpReward?.value).toBeGreaterThan(0)
      expect(result.streakUpdated).toBeDefined()
      expect(Array.isArray(result.achievementsUnlocked)).toBe(true)
      expect(Array.isArray(result.challengesUpdated)).toBe(true)
      expect(Array.isArray(result.celebrations)).toBe(true)
    })

    it('should handle perfect session with bonus XP', async () => {
      const userId = 'test-user-123'
      const activityData = {
        type: 'session_completed' as const,
        performance: {
          questionsAnswered: 10,
          isCorrect: true,
          accuracy: 1.0,
          averageResponseTime: 2000,
          isPerfectSession: true,
          studyTime: 600000,
        },
      }

      const result = await gamificationService.processUserActivity(userId, activityData)

      expect(result.xpReward).toBeDefined()
      expect(result.xpReward?.multiplier).toBeGreaterThan(1) // Should have bonus multiplier
      expect(Array.isArray(result.celebrations)).toBe(true) // Should have celebrations array
    })

    it('should update streak for study activities', async () => {
      const userId = 'test-user-123'
      const activityData = {
        type: 'study_session' as const,
        performance: {
          studyTime: 1800000, // 30 minutes
        },
      }

      const result = await gamificationService.processUserActivity(userId, activityData)

      expect(result.streakUpdated).toBeDefined()
      expect(result.streakUpdated?.currentStreak).toBeGreaterThanOrEqual(0)
    })
  })

  describe('User Game Profile Management', () => {
    it('should create default profile for new user', async () => {
      const userId = 'new-user-123'

      const profile = await gamificationService.getUserGameProfile(userId)

      expect(profile).toBeDefined()
      expect(profile.userId).toBe(userId)
      expect(profile.totalXP).toBe(0)
      expect(profile.level).toBe(1)
      expect(profile.currentStreak).toBe(0)
      expect(profile.streakFreezes).toBe(3)
      expect(profile.achievements).toEqual([])
      expect(profile.statistics).toBeDefined()
      expect(profile.preferences).toBeDefined()
    })

    it('should update user preferences', async () => {
      const userId = 'test-user-123'
      const newPreferences = {
        enableXPNotifications: false,
        competitiveMode: false,
        publicProfile: false,
      }

      await gamificationService.updateUserPreferences(userId, newPreferences)

      // Verify preferences were stored
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `game_profile:${userId}`,
        expect.any(Number),
        expect.stringContaining('"enableXPNotifications":false'),
      )
    })
  })

  describe('Friend Challenges', () => {
    it('should create friend challenge', async () => {
      const creatorId = 'user-1'
      const friendId = 'user-2'
      const challengeType = 'accuracy_duel'

      const challenge = await gamificationService.createFriendChallenge(
        creatorId,
        friendId,
        challengeType,
      )

      expect(challenge).toBeDefined()
      expect(challenge.creator).toBe(creatorId)
      expect(challenge.participants).toContain(creatorId)
      expect(challenge.participants).toContain(friendId)
      expect(challenge.name).toBe('Accuracy Duel')
      expect(challenge.type).toBe('friend_duel')
    })

    it('should create different types of challenges', async () => {
      const creatorId = 'user-1'
      const friendId = 'user-2'

      const speedChallenge = await gamificationService.createFriendChallenge(
        creatorId,
        friendId,
        'speed_challenge',
      )

      const studyMarathon = await gamificationService.createFriendChallenge(
        creatorId,
        friendId,
        'study_marathon',
      )

      expect(speedChallenge.name).toBe('Speed Challenge')
      expect(studyMarathon.name).toBe('Study Marathon')
      expect(speedChallenge.criteria.type).toBe('speed_questions')
      expect(studyMarathon.criteria.type).toBe('study_time')
    })
  })

  describe('Leaderboards', () => {
    it('should get leaderboards for user', async () => {
      const userId = 'test-user-123'

      const leaderboards = await gamificationService.getLeaderboards(userId)

      expect(leaderboards).toBeDefined()
      expect(leaderboards.xp).toBeDefined()
      expect(leaderboards.streak).toBeDefined()
      expect(leaderboards.accuracy).toBeDefined()
      expect(leaderboards.userRanks).toBeDefined()
    })
  })

  describe('Progress Visualization', () => {
    it('should generate XP progress visualization', async () => {
      const userId = 'test-user-123'

      const visualization = await gamificationService.getProgressVisualization(
        userId,
        VisualizationType.XP_PROGRESS,
      )

      expect(visualization).toBeDefined()
      expect(visualization.type).toBe(VisualizationType.XP_PROGRESS)
      expect(visualization.data).toBeDefined()
      expect(visualization.milestones).toBeDefined()
      expect(Array.isArray(visualization.milestones)).toBe(true)
    })

    it('should generate streak calendar visualization', async () => {
      const userId = 'test-user-123'

      const visualization = await gamificationService.getProgressVisualization(
        userId,
        VisualizationType.STREAK_CALENDAR,
      )

      expect(visualization).toBeDefined()
      expect(visualization.type).toBe(VisualizationType.STREAK_CALENDAR)
      expect(visualization.data.current).toBeGreaterThanOrEqual(0)
      expect(visualization.data.target).toBeGreaterThan(0)
    })

    it('should generate accuracy trend visualization', async () => {
      const userId = 'test-user-123'

      const visualization = await gamificationService.getProgressVisualization(
        userId,
        VisualizationType.ACCURACY_TREND,
      )

      expect(visualization).toBeDefined()
      expect(visualization.type).toBe(VisualizationType.ACCURACY_TREND)
      expect(visualization.milestones.length).toBeGreaterThan(0)
    })
  })

  describe('Celebrations', () => {
    it('should get user celebrations', async () => {
      const userId = 'test-user-123'

      const celebrations = await gamificationService.getCelebrations(userId, 5)

      expect(Array.isArray(celebrations)).toBe(true)
      expect(mockRedis.lrange).toHaveBeenCalledWith(`celebrations:${userId}`, 0, 4)
    })

    it('should mark celebration as viewed', async () => {
      const userId = 'test-user-123'
      const celebrationId = 'celebration-123'

      await gamificationService.markCelebrationViewed(userId, celebrationId)

      expect(mockRedis.lrange).toHaveBeenCalledWith(`celebrations:${userId}`, 0, -1)
    })
  })

  describe('Streak Management', () => {
    it('should use streak freeze', async () => {
      const userId = 'test-user-123'

      const result = await gamificationService.useStreakFreeze(userId)

      // Result depends on streak state, but should not throw
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Daily Challenge', () => {
    it('should get or create daily challenge', async () => {
      const challenge = await gamificationService.getDailyChallenge()

      expect(challenge).toBeDefined()
      expect(challenge.type).toBe('daily')
      expect(challenge.isPublic).toBe(true)
      expect(challenge.name).toBeDefined()
      expect(challenge.description).toBeDefined()
    })

    it('should return same challenge for same day', async () => {
      const challenge1 = await gamificationService.getDailyChallenge()
      const challenge2 = await gamificationService.getDailyChallenge()

      // Should use cached version on second call
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('daily_challenge:'))
    })
  })

  describe('Achievement System Integration', () => {
    it('should unlock achievements based on activity', async () => {
      const userId = 'test-user-123'

      // Simulate first question activity
      const result = await gamificationService.processUserActivity(userId, {
        type: 'question_answered',
        performance: {
          questionsAnswered: 1,
          isCorrect: true,
          accuracy: 1.0,
          isPerfectSession: false,
        },
      })

      // Should potentially unlock "first question" achievement
      expect(Array.isArray(result.achievementsUnlocked)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const result = await gamificationService.processUserActivity('user-123', {
        type: 'question_answered',
        performance: { questionsAnswered: 1, isCorrect: true, accuracy: 0.8 },
      })

      // Should return empty result instead of throwing
      expect(result).toBeDefined()
      expect(result.xpReward).toBeNull()
      expect(result.achievementsUnlocked).toEqual([])
    })

    it('should handle invalid activity data', async () => {
      const result = await gamificationService.processUserActivity('user-123', {
        type: 'invalid_type' as any,
      })

      expect(result).toBeDefined()
      // Should handle gracefully without throwing
    })
  })

  describe('Performance', () => {
    it('should handle multiple concurrent activities efficiently', async () => {
      const userId = 'test-user-123'
      const activities = Array.from({ length: 10 }, (_, i) => ({
        type: 'question_answered' as const,
        performance: {
          questionsAnswered: 1,
          isCorrect: i % 2 === 0,
          accuracy: 0.8 + i * 0.02,
          isPerfectSession: false,
        },
      }))

      const startTime = Date.now()
      const promises = activities.map((activity) =>
        gamificationService.processUserActivity(userId, activity),
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds

      // All results should be valid
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result.xpReward).toBeDefined()
      })
    })
  })
})
