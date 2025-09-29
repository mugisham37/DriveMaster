import { Redis } from 'ioredis'
import { XPSystem } from './xp-system.js'
import { AchievementSystem } from './achievement-system.js'
import { StreakSystem } from './streak-system.js'
import { ChallengeSystem } from './challenge-system.js'
import { ProgressVisualizationService } from './progress-visualization.js'
import {
  UserGameProfile,
  Achievement,
  XPReward,
  StreakData,
  Challenge,
  ProgressVisualization,
  VisualizationType,
  ChallengeType,
  StreakType,
  CelebrationType,
} from '../types/gamification.js'

export class GamificationService {
  private redis: Redis
  private xpSystem: XPSystem
  private achievementSystem: AchievementSystem
  private streakSystem: StreakSystem
  private challengeSystem: ChallengeSystem
  private progressVisualization: ProgressVisualizationService

  constructor(redis: Redis) {
    this.redis = redis
    this.xpSystem = new XPSystem(redis)
    this.achievementSystem = new AchievementSystem(redis)
    this.streakSystem = new StreakSystem(redis)
    this.challengeSystem = new ChallengeSystem(redis)
    this.progressVisualization = new ProgressVisualizationService(redis)
  }

  async processUserActivity(
    userId: string,
    activityData: UserActivityData,
  ): Promise<GamificationResult> {
    const result: GamificationResult = {
      xpReward: null,
      achievementsUnlocked: [],
      streakUpdated: null,
      challengesUpdated: [],
      celebrations: [],
      progressUpdates: [],
    }

    try {
      // Update streak first (affects XP multipliers)
      if (activityData.type === 'study_session' || activityData.type === 'question_answered') {
        result.streakUpdated = await this.streakSystem.updateStreak(userId, StreakType.DAILY_STUDY)
      }

      // Calculate and award XP
      if (activityData.performance) {
        const context = {
          isComeback: await this.isComeback(userId),
          sessionType: activityData.type,
          difficulty: activityData.difficulty,
          topicId: activityData.topicId,
        }

        result.xpReward = await this.xpSystem.calculateXPReward(
          userId,
          activityData.type,
          activityData.performance,
          context,
        )
      }

      // Check for achievements
      result.achievementsUnlocked = await this.achievementSystem.checkAchievements(userId, {
        questionsAnswered: activityData.performance?.questionsAnswered,
        correctAnswers: activityData.performance?.isCorrect ? 1 : 0,
        sessionCompleted: activityData.type === 'session_completed',
        isPerfectSession: activityData.performance?.isPerfectSession,
        studyTime: activityData.performance?.studyTime,
        topicMastered: activityData.type === 'topic_mastered',
      })

      // Update active challenges
      const userChallenges = await this.challengeSystem.getUserChallenges(userId, 'active' as any)
      for (const challenge of userChallenges) {
        await this.challengeSystem.updateChallengeProgress(challenge.id, userId, {
          questionsAnswered: activityData.performance?.questionsAnswered,
          correctAnswers: activityData.performance?.isCorrect ? 1 : 0,
          studyTime: activityData.performance?.studyTime,
          accuracy: activityData.performance?.accuracy,
          averageResponseTime: activityData.performance?.averageResponseTime,
          isPerfectSession: activityData.performance?.isPerfectSession,
        })
        result.challengesUpdated.push(challenge.id)
      }

      // Create celebrations for significant events
      result.celebrations = await this.createCelebrations(userId, result)

      // Update user statistics
      await this.updateUserStatistics(userId, activityData)

      return result
    } catch (error) {
      console.error('Error processing user activity:', error)
      return result
    }
  }

  async getUserGameProfile(userId: string): Promise<UserGameProfile> {
    const data = await this.redis.get(`game_profile:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Create default profile
    const defaultProfile: UserGameProfile = {
      userId,
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 3,
      maxStreakFreezes: 3,
      lastActivityDate: new Date(),
      achievements: [],
      badges: [],
      challenges: [],
      statistics: {
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        averageAccuracy: 0,
        totalStudyTime: 0,
        sessionsCompleted: 0,
        averageSessionLength: 0,
        topicsMastered: 0,
        perfectSessions: 0,
        comebackSessions: 0,
        weeklyGoalsMet: 0,
        monthlyGoalsMet: 0,
      },
      preferences: {
        enableXPNotifications: true,
        enableAchievementNotifications: true,
        enableStreakReminders: true,
        enableChallengeInvitations: true,
        enableLeaderboardUpdates: true,
        enableProgressCelebrations: true,
        competitiveMode: true,
        publicProfile: true,
      },
    }

    await this.storeUserGameProfile(defaultProfile)
    return defaultProfile
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserGameProfile['preferences']>,
  ): Promise<void> {
    const profile = await this.getUserGameProfile(userId)
    profile.preferences = { ...profile.preferences, ...preferences }
    await this.storeUserGameProfile(profile)
  }

  async createFriendChallenge(
    creatorId: string,
    friendId: string,
    challengeType: string,
    duration: number = 7 * 24 * 60 * 60 * 1000,
  ): Promise<Challenge> {
    const challengeTemplates = {
      accuracy_duel: {
        name: 'Accuracy Duel',
        description: 'Who can maintain the highest accuracy?',
        criteria: {
          type: 'accuracy_challenge',
          target: 50,
          conditions: { minAccuracy: 0.8 },
          metric: 'questions',
        },
      },
      speed_challenge: {
        name: 'Speed Challenge',
        description: 'Answer questions as fast as possible!',
        criteria: { type: 'speed_questions', target: 100, timeLimit: 30000, metric: 'questions' },
      },
      study_marathon: {
        name: 'Study Marathon',
        description: 'Who can study longer?',
        criteria: { type: 'study_time', target: 10 * 60 * 60 * 1000, metric: 'time' },
      },
      question_race: {
        name: 'Question Race',
        description: 'First to answer 100 questions wins!',
        criteria: { type: 'questions_answered', target: 100, metric: 'questions' },
      },
    }

    const template = challengeTemplates[challengeType] || challengeTemplates['question_race']

    return this.challengeSystem.createChallenge(
      creatorId,
      ChallengeType.FRIEND_DUEL,
      template.name,
      template.description,
      template.criteria,
      [friendId],
      duration,
      false,
    )
  }

  async getLeaderboards(userId: string): Promise<any> {
    const [xpLeaderboard, streakLeaderboard, accuracyLeaderboard] = await Promise.all([
      this.xpSystem.getXPLeaderboard('weekly', 10),
      this.streakSystem.getStreakLeaderboard(StreakType.DAILY_STUDY, 'current', 10),
      this.getAccuracyLeaderboard(10),
    ])

    return {
      xp: xpLeaderboard,
      streak: streakLeaderboard,
      accuracy: accuracyLeaderboard,
      userRanks: await this.getUserLeaderboardRanks(userId),
    }
  }

  async getProgressVisualization(
    userId: string,
    type: VisualizationType,
  ): Promise<ProgressVisualization> {
    return this.progressVisualization.generateProgressVisualization(userId, type)
  }

  async getCelebrations(userId: string, limit: number = 10): Promise<any[]> {
    const celebrations = await this.redis.lrange(`celebrations:${userId}`, 0, limit - 1)
    return celebrations.map((c) => JSON.parse(c))
  }

  async markCelebrationViewed(userId: string, celebrationId: string): Promise<void> {
    const celebrations = await this.redis.lrange(`celebrations:${userId}`, 0, -1)
    const updatedCelebrations = celebrations.map((c) => {
      const celebration = JSON.parse(c)
      if (celebration.id === celebrationId) {
        celebration.isViewed = true
      }
      return JSON.stringify(celebration)
    })

    // Replace the list
    await this.redis.del(`celebrations:${userId}`)
    if (updatedCelebrations.length > 0) {
      await this.redis.lpush(`celebrations:${userId}`, ...updatedCelebrations)
    }
  }

  async useStreakFreeze(userId: string): Promise<boolean> {
    return this.streakSystem.useStreakFreeze(userId)
  }

  async getDailyChallenge(): Promise<Challenge> {
    // Check if today's challenge already exists
    const today = new Date().toISOString().split('T')[0]
    const existingChallenge = await this.redis.get(`daily_challenge:${today}`)

    if (existingChallenge) {
      return JSON.parse(existingChallenge)
    }

    // Create new daily challenge
    const challenge = await this.challengeSystem.createDailyChallenge()
    await this.redis.setex(`daily_challenge:${today}`, 24 * 60 * 60, JSON.stringify(challenge))

    return challenge
  }

  private async createCelebrations(userId: string, result: GamificationResult): Promise<any[]> {
    const celebrations: any[] = []

    // XP milestone celebrations
    if (result.xpReward && result.xpReward.value >= 100) {
      celebrations.push(
        await this.progressVisualization.createCelebrationVisualization(userId, 'xp_milestone', {
          xpEarned: result.xpReward.value,
        }),
      )
    }

    // Achievement celebrations
    for (const achievement of result.achievementsUnlocked) {
      celebrations.push(
        await this.progressVisualization.createCelebrationVisualization(
          userId,
          'achievement_unlocked',
          {
            achievementName: achievement.name,
            achievementDescription: achievement.description,
            rarity: achievement.rarity,
          },
        ),
      )
    }

    // Streak milestone celebrations
    if (
      result.streakUpdated &&
      [3, 7, 14, 30, 60, 100].includes(result.streakUpdated.currentStreak)
    ) {
      celebrations.push(
        await this.progressVisualization.createCelebrationVisualization(
          userId,
          'streak_milestone',
          { streakDays: result.streakUpdated.currentStreak },
        ),
      )
    }

    return celebrations
  }

  private async updateUserStatistics(
    userId: string,
    activityData: UserActivityData,
  ): Promise<void> {
    const profile = await this.getUserGameProfile(userId)
    const stats = profile.statistics

    if (activityData.performance) {
      const perf = activityData.performance

      if (perf.questionsAnswered) {
        stats.totalQuestionsAnswered += perf.questionsAnswered
      }

      if (perf.isCorrect !== undefined) {
        if (perf.isCorrect) {
          stats.correctAnswers += 1
        } else {
          stats.incorrectAnswers += 1
        }
      }

      if (perf.studyTime) {
        stats.totalStudyTime += perf.studyTime
      }

      if (perf.isPerfectSession) {
        stats.perfectSessions += 1
      }

      // Recalculate average accuracy
      const totalAnswered = stats.correctAnswers + stats.incorrectAnswers
      if (totalAnswered > 0) {
        stats.averageAccuracy = stats.correctAnswers / totalAnswered
      }
    }

    if (activityData.type === 'session_completed') {
      stats.sessionsCompleted += 1
      if (stats.totalStudyTime > 0 && stats.sessionsCompleted > 0) {
        stats.averageSessionLength = stats.totalStudyTime / stats.sessionsCompleted
      }
    }

    if (activityData.type === 'topic_mastered') {
      stats.topicsMastered += 1
    }

    profile.lastActivityDate = new Date()
    await this.storeUserGameProfile(profile)
  }

  private async isComeback(userId: string): Promise<boolean> {
    const profile = await this.getUserGameProfile(userId)
    const daysSinceLastActivity = Math.floor(
      (Date.now() - profile.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    return daysSinceLastActivity >= 3
  }

  private async getAccuracyLeaderboard(limit: number): Promise<any[]> {
    // This would be implemented based on stored accuracy data
    // For now, return mock data
    return []
  }

  private async getUserLeaderboardRanks(userId: string): Promise<any> {
    // Get user's rank in various leaderboards
    const xpRank = await this.redis.zrevrank('xp_leaderboard:all_time', userId)
    const streakRank = await this.redis.zrevrank('streak_leaderboard:daily_study:current', userId)

    return {
      xp: xpRank !== null ? xpRank + 1 : null,
      streak: streakRank !== null ? streakRank + 1 : null,
      accuracy: null, // Would be implemented with accuracy leaderboard
    }
  }

  private async storeUserGameProfile(profile: UserGameProfile): Promise<void> {
    await this.redis.setex(
      `game_profile:${profile.userId}`,
      90 * 24 * 60 * 60,
      JSON.stringify(profile),
    )
  }
}

// Supporting interfaces
interface UserActivityData {
  type: 'question_answered' | 'session_completed' | 'topic_mastered' | 'study_session'
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

interface GamificationResult {
  xpReward: XPReward | null
  achievementsUnlocked: Achievement[]
  streakUpdated: StreakData | null
  challengesUpdated: string[]
  celebrations: any[]
  progressUpdates: any[]
}
