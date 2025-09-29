import { Redis } from 'ioredis'
import {
  Achievement,
  AchievementCategory,
  AchievementType,
  AchievementRarity,
  AchievementCriteria,
  Reward,
  RewardType,
  UserGameProfile,
  CelebrationType,
} from '../types/gamification.js'

export class AchievementSystem {
  private redis: Redis
  private achievements: Map<string, Achievement> = new Map()

  constructor(redis: Redis) {
    this.redis = redis
    this.initializeAchievements()
  }

  async checkAchievements(userId: string, activityData: ActivityData): Promise<Achievement[]> {
    const userProfile = await this.getUserGameProfile(userId)
    const unlockedAchievements: Achievement[] = []

    for (const [achievementId, achievement] of this.achievements) {
      // Skip if already unlocked
      if (userProfile.achievements.some((a) => a.id === achievementId && a.isUnlocked)) {
        continue
      }

      // Check if achievement criteria is met
      const progress = await this.calculateAchievementProgress(userId, achievement, activityData)

      if (progress >= achievement.maxProgress) {
        const unlockedAchievement = await this.unlockAchievement(userId, achievement)
        unlockedAchievements.push(unlockedAchievement)
      } else {
        // Update progress for partial achievements
        await this.updateAchievementProgress(userId, achievementId, progress)
      }
    }

    return unlockedAchievements
  }

  async unlockAchievement(userId: string, achievement: Achievement): Promise<Achievement> {
    const userProfile = await this.getUserGameProfile(userId)

    // Create unlocked achievement
    const unlockedAchievement: Achievement = {
      ...achievement,
      unlockedAt: new Date(),
      progress: achievement.maxProgress,
      isUnlocked: true,
    }

    // Add to user profile
    const existingIndex = userProfile.achievements.findIndex((a) => a.id === achievement.id)
    if (existingIndex >= 0) {
      userProfile.achievements[existingIndex] = unlockedAchievement
    } else {
      userProfile.achievements.push(unlockedAchievement)
    }

    // Award rewards
    await this.awardAchievementRewards(userId, achievement.reward)

    // Store updated profile
    await this.storeUserGameProfile(userProfile)

    // Create celebration event
    await this.createAchievementCelebration(userId, unlockedAchievement)

    // Update achievement statistics
    await this.updateAchievementStats(achievement.id)

    return unlockedAchievement
  }

  async getAchievementProgress(userId: string, achievementId: string): Promise<number> {
    const userProfile = await this.getUserGameProfile(userId)
    const achievement = userProfile.achievements.find((a) => a.id === achievementId)
    return achievement ? achievement.progress : 0
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const userProfile = await this.getUserGameProfile(userId)
    return userProfile.achievements
  }

  async getAchievementLeaderboard(achievementId: string, limit = 100): Promise<any[]> {
    const key = `achievement_leaderboard:${achievementId}`
    const entries = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')

    const leaderboard = []
    for (let i = 0; i < entries.length; i += 2) {
      const userId = entries[i]
      const timestamp = parseInt(entries[i + 1])
      const rank = Math.floor(i / 2) + 1

      leaderboard.push({
        userId,
        rank,
        unlockedAt: new Date(timestamp),
      })
    }

    return leaderboard
  }

  async getAchievementStats(): Promise<any> {
    const stats = await this.redis.hgetall('achievement_stats')
    const result: any = {}

    for (const [achievementId, data] of Object.entries(stats)) {
      result[achievementId] = JSON.parse(data)
    }

    return result
  }

  private async calculateAchievementProgress(
    userId: string,
    achievement: Achievement,
    activityData: ActivityData,
  ): Promise<number> {
    const userProfile = await this.getUserGameProfile(userId)
    const criteria = achievement.criteria

    switch (achievement.type) {
      case AchievementType.PROGRESS:
        return this.calculateProgressAchievement(userProfile, criteria, activityData)

      case AchievementType.THRESHOLD:
        return this.calculateThresholdAchievement(userProfile, criteria)

      case AchievementType.STREAK:
        return this.calculateStreakAchievement(userProfile, criteria)

      case AchievementType.PERFECT:
        return this.calculatePerfectAchievement(userProfile, criteria, activityData)

      case AchievementType.SOCIAL:
        return this.calculateSocialAchievement(userId, criteria, activityData)

      case AchievementType.TIME_BASED:
        return this.calculateTimeBasedAchievement(userProfile, criteria)

      default:
        return 0
    }
  }

  private calculateProgressAchievement(
    userProfile: UserGameProfile,
    criteria: AchievementCriteria,
    activityData: ActivityData,
  ): number {
    switch (criteria.type) {
      case 'questions_answered':
        return userProfile.statistics.totalQuestionsAnswered
      case 'correct_answers':
        return userProfile.statistics.correctAnswers
      case 'study_time':
        return userProfile.statistics.totalStudyTime
      case 'sessions_completed':
        return userProfile.statistics.sessionsCompleted
      case 'topics_mastered':
        return userProfile.statistics.topicsMastered
      default:
        return 0
    }
  }

  private calculateThresholdAchievement(
    userProfile: UserGameProfile,
    criteria: AchievementCriteria,
  ): number {
    switch (criteria.type) {
      case 'accuracy_threshold':
        return userProfile.statistics.averageAccuracy >= criteria.target ? criteria.target : 0
      case 'xp_threshold':
        return userProfile.totalXP >= criteria.target ? criteria.target : 0
      case 'level_threshold':
        return userProfile.level >= criteria.target ? criteria.target : 0
      default:
        return 0
    }
  }

  private calculateStreakAchievement(
    userProfile: UserGameProfile,
    criteria: AchievementCriteria,
  ): number {
    switch (criteria.type) {
      case 'current_streak':
        return userProfile.currentStreak
      case 'longest_streak':
        return userProfile.longestStreak
      default:
        return 0
    }
  }

  private calculatePerfectAchievement(
    userProfile: UserGameProfile,
    criteria: AchievementCriteria,
    activityData: ActivityData,
  ): number {
    switch (criteria.type) {
      case 'perfect_sessions':
        return userProfile.statistics.perfectSessions
      case 'consecutive_perfect':
        // This would require additional tracking
        return 0
      default:
        return 0
    }
  }

  private async calculateSocialAchievement(
    userId: string,
    criteria: AchievementCriteria,
    activityData: ActivityData,
  ): Promise<number> {
    switch (criteria.type) {
      case 'friends_invited':
        const inviteCount = await this.redis.scard(`friend_invites:${userId}`)
        return inviteCount || 0
      case 'challenges_won':
        const challengeWins = await this.redis.get(`challenge_wins:${userId}`)
        return challengeWins ? parseInt(challengeWins) : 0
      case 'leaderboard_rank':
        // Check if user is in top N of any leaderboard
        return 0 // Implementation would depend on leaderboard system
      default:
        return 0
    }
  }

  private calculateTimeBasedAchievement(
    userProfile: UserGameProfile,
    criteria: AchievementCriteria,
  ): number {
    const now = new Date()
    const accountAge = now.getTime() - new Date(userProfile.lastActivityDate).getTime()
    const daysActive = Math.floor(accountAge / (1000 * 60 * 60 * 24))

    switch (criteria.type) {
      case 'days_active':
        return daysActive
      case 'weekly_goals':
        return userProfile.statistics.weeklyGoalsMet
      case 'monthly_goals':
        return userProfile.statistics.monthlyGoalsMet
      default:
        return 0
    }
  }

  private async updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<void> {
    const userProfile = await this.getUserGameProfile(userId)
    const existingIndex = userProfile.achievements.findIndex((a) => a.id === achievementId)

    if (existingIndex >= 0) {
      userProfile.achievements[existingIndex].progress = progress
    } else {
      const achievement = this.achievements.get(achievementId)
      if (achievement) {
        userProfile.achievements.push({
          ...achievement,
          progress,
          isUnlocked: false,
        })
      }
    }

    await this.storeUserGameProfile(userProfile)
  }

  private async awardAchievementRewards(userId: string, reward: Reward): Promise<void> {
    switch (reward.type) {
      case RewardType.XP:
        // Award XP (would integrate with XP system)
        break
      case RewardType.BADGE:
        await this.awardBadge(userId, reward.metadata?.badgeId)
        break
      case RewardType.STREAK_FREEZE:
        await this.awardStreakFreeze(userId, reward.value)
        break
      // Add other reward types as needed
    }
  }

  private async awardBadge(userId: string, badgeId: string): Promise<void> {
    // Implementation would depend on badge system
    await this.redis.sadd(`user_badges:${userId}`, badgeId)
  }

  private async awardStreakFreeze(userId: string, count: number): Promise<void> {
    const userProfile = await this.getUserGameProfile(userId)
    userProfile.streakFreezes = Math.min(
      userProfile.streakFreezes + count,
      userProfile.maxStreakFreezes,
    )
    await this.storeUserGameProfile(userProfile)
  }

  private async createAchievementCelebration(
    userId: string,
    achievement: Achievement,
  ): Promise<void> {
    const celebration = {
      id: `achievement_${userId}_${achievement.id}_${Date.now()}`,
      userId,
      type: CelebrationType.ACHIEVEMENT_UNLOCKED,
      title: 'Achievement Unlocked!',
      message: `You've earned the "${achievement.name}" achievement!`,
      data: {
        achievementId: achievement.id,
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        rarity: achievement.rarity,
        reward: achievement.reward,
      },
      timestamp: new Date(),
      isViewed: false,
    }

    await this.redis.lpush(`celebrations:${userId}`, JSON.stringify(celebration))
    await this.redis.ltrim(`celebrations:${userId}`, 0, 99)
    await this.redis.expire(`celebrations:${userId}`, 30 * 24 * 60 * 60)
  }

  private async updateAchievementStats(achievementId: string): Promise<void> {
    const key = 'achievement_stats'
    const currentStats = await this.redis.hget(key, achievementId)

    let stats = { unlockCount: 0, lastUnlocked: new Date() }
    if (currentStats) {
      stats = JSON.parse(currentStats)
    }

    stats.unlockCount += 1
    stats.lastUnlocked = new Date()

    await this.redis.hset(key, achievementId, JSON.stringify(stats))
  }

  private async getUserGameProfile(userId: string): Promise<UserGameProfile> {
    const data = await this.redis.get(`game_profile:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default profile (same as XP system)
    return {
      userId,
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 0,
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
  }

  private async storeUserGameProfile(profile: UserGameProfile): Promise<void> {
    await this.redis.setex(
      `game_profile:${profile.userId}`,
      90 * 24 * 60 * 60,
      JSON.stringify(profile),
    )
  }

  private initializeAchievements(): void {
    // Learning achievements
    this.achievements.set('first_question', {
      id: 'first_question',
      name: 'Getting Started',
      description: 'Answer your first question',
      category: AchievementCategory.LEARNING,
      type: AchievementType.PROGRESS,
      criteria: { type: 'questions_answered', target: 1 },
      reward: { type: RewardType.XP, value: 50, description: '50 XP bonus' },
      progress: 0,
      maxProgress: 1,
      isUnlocked: false,
      rarity: AchievementRarity.COMMON,
    })

    this.achievements.set('hundred_questions', {
      id: 'hundred_questions',
      name: 'Century Club',
      description: 'Answer 100 questions correctly',
      category: AchievementCategory.LEARNING,
      type: AchievementType.PROGRESS,
      criteria: { type: 'correct_answers', target: 100 },
      reward: { type: RewardType.XP, value: 500, description: '500 XP bonus' },
      progress: 0,
      maxProgress: 100,
      isUnlocked: false,
      rarity: AchievementRarity.UNCOMMON,
    })

    this.achievements.set('thousand_questions', {
      id: 'thousand_questions',
      name: 'Knowledge Seeker',
      description: 'Answer 1000 questions correctly',
      category: AchievementCategory.LEARNING,
      type: AchievementType.PROGRESS,
      criteria: { type: 'correct_answers', target: 1000 },
      reward: { type: RewardType.XP, value: 2000, description: '2000 XP bonus' },
      progress: 0,
      maxProgress: 1000,
      isUnlocked: false,
      rarity: AchievementRarity.RARE,
    })

    // Streak achievements
    this.achievements.set('week_streak', {
      id: 'week_streak',
      name: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      category: AchievementCategory.STREAK,
      type: AchievementType.STREAK,
      criteria: { type: 'current_streak', target: 7 },
      reward: { type: RewardType.STREAK_FREEZE, value: 1, description: '1 streak freeze' },
      progress: 0,
      maxProgress: 7,
      isUnlocked: false,
      rarity: AchievementRarity.COMMON,
    })

    this.achievements.set('month_streak', {
      id: 'month_streak',
      name: 'Dedication Master',
      description: 'Maintain a 30-day study streak',
      category: AchievementCategory.STREAK,
      type: AchievementType.STREAK,
      criteria: { type: 'current_streak', target: 30 },
      reward: { type: RewardType.XP, value: 1000, description: '1000 XP bonus' },
      progress: 0,
      maxProgress: 30,
      isUnlocked: false,
      rarity: AchievementRarity.EPIC,
    })

    // Accuracy achievements
    this.achievements.set('perfectionist', {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Complete 10 perfect sessions (100% accuracy)',
      category: AchievementCategory.ACCURACY,
      type: AchievementType.PERFECT,
      criteria: { type: 'perfect_sessions', target: 10 },
      reward: { type: RewardType.XP, value: 750, description: '750 XP bonus' },
      progress: 0,
      maxProgress: 10,
      isUnlocked: false,
      rarity: AchievementRarity.RARE,
    })

    // Milestone achievements
    this.achievements.set('level_10', {
      id: 'level_10',
      name: 'Rising Star',
      description: 'Reach level 10',
      category: AchievementCategory.MILESTONE,
      type: AchievementType.THRESHOLD,
      criteria: { type: 'level_threshold', target: 10 },
      reward: { type: RewardType.XP, value: 500, description: '500 XP bonus' },
      progress: 0,
      maxProgress: 10,
      isUnlocked: false,
      rarity: AchievementRarity.UNCOMMON,
    })

    this.achievements.set('level_50', {
      id: 'level_50',
      name: 'Expert Learner',
      description: 'Reach level 50',
      category: AchievementCategory.MILESTONE,
      type: AchievementType.THRESHOLD,
      criteria: { type: 'level_threshold', target: 50 },
      reward: { type: RewardType.XP, value: 2500, description: '2500 XP bonus' },
      progress: 0,
      maxProgress: 50,
      isUnlocked: false,
      rarity: AchievementRarity.EPIC,
    })

    // Social achievements
    this.achievements.set('social_butterfly', {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Invite 5 friends to join',
      category: AchievementCategory.SOCIAL,
      type: AchievementType.SOCIAL,
      criteria: { type: 'friends_invited', target: 5 },
      reward: { type: RewardType.XP, value: 300, description: '300 XP bonus' },
      progress: 0,
      maxProgress: 5,
      isUnlocked: false,
      rarity: AchievementRarity.UNCOMMON,
    })
  }
}

// Supporting interfaces
interface ActivityData {
  questionsAnswered?: number
  correctAnswers?: number
  sessionCompleted?: boolean
  isPerfectSession?: boolean
  studyTime?: number
  topicMastered?: boolean
  challengeWon?: boolean
  friendInvited?: boolean
}
