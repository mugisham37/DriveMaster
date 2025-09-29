import { Redis } from 'ioredis'
import {
  UserGameProfile,
  XPReward,
  RewardType,
  UserStatistics,
  CelebrationType,
} from '../types/gamification.js'

export class XPSystem {
  private redis: Redis
  private baseXPPerQuestion = 10
  private perfectSessionMultiplier = 1.5
  private streakMultiplier = 1.2
  private comebackBonus = 50

  constructor(redis: Redis) {
    this.redis = redis
  }

  async calculateXPReward(
    userId: string,
    activityType: string,
    performance: PerformanceData,
    context: ActivityContext = {},
  ): Promise<XPReward> {
    const userProfile = await this.getUserGameProfile(userId)
    const baseXP = this.getBaseXP(activityType, performance)

    let totalXP = baseXP
    let multiplier = 1.0
    let bonusAmount = 0
    const reasons: string[] = []

    // Apply streak multiplier
    if (userProfile.currentStreak > 0) {
      const streakBonus = Math.min(userProfile.currentStreak * 0.1, 1.0) // Max 100% bonus
      multiplier += streakBonus
      reasons.push(`${Math.round(streakBonus * 100)}% streak bonus`)
    }

    // Apply accuracy multiplier
    if (performance.accuracy >= 0.9) {
      multiplier += 0.3 // 30% bonus for 90%+ accuracy
      reasons.push('30% accuracy bonus')
    } else if (performance.accuracy >= 0.8) {
      multiplier += 0.15 // 15% bonus for 80%+ accuracy
      reasons.push('15% accuracy bonus')
    }

    // Apply speed bonus
    if (performance.averageResponseTime && performance.averageResponseTime < 5000) {
      multiplier += 0.2 // 20% bonus for fast responses
      reasons.push('20% speed bonus')
    }

    // Perfect session bonus
    if (performance.isPerfectSession) {
      multiplier += 0.5 // 50% bonus for perfect session
      reasons.push('50% perfect session bonus')
    }

    // Comeback bonus (after being inactive)
    if (context.isComeback) {
      bonusAmount += this.comebackBonus
      reasons.push(`${this.comebackBonus} comeback bonus`)
    }

    // Apply variable reward schedule
    const variableMultiplier = this.getVariableRewardMultiplier(userId, activityType)
    multiplier += variableMultiplier
    if (variableMultiplier > 0) {
      reasons.push(`${Math.round(variableMultiplier * 100)}% bonus reward`)
    }

    totalXP = Math.round(baseXP * multiplier) + bonusAmount

    const reward: XPReward = {
      type: RewardType.XP,
      value: totalXP,
      description: `Earned ${totalXP} XP`,
      multiplier,
      baseAmount: baseXP,
      bonusAmount,
      reason: reasons.join(', '),
    }

    // Award the XP
    await this.awardXP(userId, reward)

    return reward
  }

  async awardXP(userId: string, reward: XPReward): Promise<void> {
    const userProfile = await this.getUserGameProfile(userId)
    const oldLevel = userProfile.level

    // Update XP
    userProfile.totalXP += reward.value

    // Calculate new level
    const newLevel = this.calculateLevel(userProfile.totalXP)
    userProfile.level = newLevel

    // Store updated profile
    await this.storeUserGameProfile(userProfile)

    // Check for level up
    if (newLevel > oldLevel) {
      await this.handleLevelUp(userId, oldLevel, newLevel)
    }

    // Record XP transaction
    await this.recordXPTransaction(userId, reward)
  }

  async getXPToNextLevel(userId: string): Promise<number> {
    const userProfile = await this.getUserGameProfile(userId)
    const currentLevelXP = this.getXPForLevel(userProfile.level)
    const nextLevelXP = this.getXPForLevel(userProfile.level + 1)

    return nextLevelXP - userProfile.totalXP
  }

  async getXPLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    limit = 100,
  ): Promise<any[]> {
    const key = `xp_leaderboard:${period}`
    const entries = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')

    const leaderboard = []
    for (let i = 0; i < entries.length; i += 2) {
      const userId = entries[i]
      const xp = parseInt(entries[i + 1])
      const rank = Math.floor(i / 2) + 1

      leaderboard.push({
        userId,
        xp,
        rank,
        // Additional user data would be fetched separately
      })
    }

    return leaderboard
  }

  private getBaseXP(activityType: string, performance: PerformanceData): number {
    switch (activityType) {
      case 'question_answered':
        return performance.isCorrect
          ? this.baseXPPerQuestion
          : Math.round(this.baseXPPerQuestion * 0.3)
      case 'session_completed':
        return Math.round(performance.questionsAnswered * this.baseXPPerQuestion * 0.1)
      case 'topic_mastered':
        return 100
      case 'daily_goal_met':
        return 50
      case 'weekly_goal_met':
        return 200
      default:
        return 5
    }
  }

  private getVariableRewardMultiplier(userId: string, activityType: string): number {
    // Implement variable ratio reinforcement schedule
    // This creates unpredictable bonus rewards to maintain engagement
    const hash = this.simpleHash(userId + activityType + Date.now().toString())
    const random = (hash % 100) / 100

    // 20% chance of bonus reward
    if (random < 0.2) {
      return Math.random() * 0.5 // 0-50% bonus
    }

    return 0
  }

  private calculateLevel(totalXP: number): number {
    // Exponential leveling curve: level = floor(sqrt(totalXP / 100))
    return Math.floor(Math.sqrt(totalXP / 100)) + 1
  }

  private getXPForLevel(level: number): number {
    // XP required for level: (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100
  }

  private async handleLevelUp(userId: string, oldLevel: number, newLevel: number): Promise<void> {
    // Create celebration event
    const celebration = {
      id: `levelup_${userId}_${Date.now()}`,
      userId,
      type: CelebrationType.LEVEL_UP,
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${newLevel}!`,
      data: {
        oldLevel,
        newLevel,
        xpEarned: this.getXPForLevel(newLevel) - this.getXPForLevel(oldLevel),
      },
      timestamp: new Date(),
      isViewed: false,
    }

    await this.storeCelebrationEvent(celebration)

    // Update leaderboards
    await this.updateLeaderboards(userId, newLevel)

    // Trigger level up notification (would integrate with notification service)
    // await this.notificationService.schedulePersonalizedNotification(...)
  }

  private async recordXPTransaction(userId: string, reward: XPReward): Promise<void> {
    const transaction = {
      userId,
      amount: reward.value,
      type: 'earned',
      reason: reward.reason,
      timestamp: new Date().toISOString(),
      metadata: {
        baseAmount: reward.baseAmount,
        multiplier: reward.multiplier,
        bonusAmount: reward.bonusAmount,
      },
    }

    // Store in Redis list for transaction history
    await this.redis.lpush(`xp_transactions:${userId}`, JSON.stringify(transaction))
    await this.redis.ltrim(`xp_transactions:${userId}`, 0, 999) // Keep last 1000 transactions
    await this.redis.expire(`xp_transactions:${userId}`, 90 * 24 * 60 * 60) // 90 days TTL

    // Update daily/weekly/monthly XP totals for leaderboards
    const today = new Date().toISOString().split('T')[0]
    const thisWeek = this.getWeekKey(new Date())
    const thisMonth = new Date().toISOString().substring(0, 7)

    await Promise.all([
      this.redis.zincrby(`xp_leaderboard:daily:${today}`, reward.value, userId),
      this.redis.zincrby(`xp_leaderboard:weekly:${thisWeek}`, reward.value, userId),
      this.redis.zincrby(`xp_leaderboard:monthly:${thisMonth}`, reward.value, userId),
      this.redis.zincrby(`xp_leaderboard:all_time`, reward.value, userId),
    ])

    // Set TTL for time-based leaderboards
    await Promise.all([
      this.redis.expire(`xp_leaderboard:daily:${today}`, 7 * 24 * 60 * 60), // 7 days
      this.redis.expire(`xp_leaderboard:weekly:${thisWeek}`, 30 * 24 * 60 * 60), // 30 days
      this.redis.expire(`xp_leaderboard:monthly:${thisMonth}`, 90 * 24 * 60 * 60), // 90 days
    ])
  }

  private async updateLeaderboards(userId: string, level: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const thisWeek = this.getWeekKey(new Date())
    const thisMonth = new Date().toISOString().substring(0, 7)

    await Promise.all([
      this.redis.zadd(`level_leaderboard:daily:${today}`, level, userId),
      this.redis.zadd(`level_leaderboard:weekly:${thisWeek}`, level, userId),
      this.redis.zadd(`level_leaderboard:monthly:${thisMonth}`, level, userId),
      this.redis.zadd(`level_leaderboard:all_time`, level, userId),
    ])
  }

  private async getUserGameProfile(userId: string): Promise<UserGameProfile> {
    const data = await this.redis.get(`game_profile:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default profile for new users
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
      90 * 24 * 60 * 60, // 90 days TTL
      JSON.stringify(profile),
    )
  }

  private async storeCelebrationEvent(event: any): Promise<void> {
    await this.redis.lpush(`celebrations:${event.userId}`, JSON.stringify(event))
    await this.redis.ltrim(`celebrations:${event.userId}`, 0, 99) // Keep last 100 celebrations
    await this.redis.expire(`celebrations:${event.userId}`, 30 * 24 * 60 * 60) // 30 days TTL
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const week = this.getWeekNumber(date)
    return `${year}-W${week.toString().padStart(2, '0')}`
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

// Supporting interfaces
interface PerformanceData {
  isCorrect?: boolean
  accuracy: number
  questionsAnswered: number
  averageResponseTime?: number
  isPerfectSession: boolean
  studyTime?: number
}

interface ActivityContext {
  isComeback?: boolean
  sessionType?: string
  difficulty?: string
  topicId?: string
}
