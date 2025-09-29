import { Redis } from 'ioredis'
import {
  StreakData,
  StreakType,
  StreakMilestone,
  UserGameProfile,
  Reward,
  RewardType,
  CelebrationType,
} from '../types/gamification.js'

export class StreakSystem {
  private redis: Redis
  private streakMilestones: StreakMilestone[]

  constructor(redis: Redis) {
    this.redis = redis
    this.initializeStreakMilestones()
  }

  async updateStreak(
    userId: string,
    streakType: StreakType = StreakType.DAILY_STUDY,
    activityDate: Date = new Date(),
  ): Promise<StreakData> {
    const streakData = await this.getStreakData(userId, streakType)
    const today = this.getDateKey(activityDate)
    const yesterday = this.getDateKey(new Date(activityDate.getTime() - 24 * 60 * 60 * 1000))
    const lastActivityKey = this.getDateKey(streakData.lastActivityDate)

    // Check if user already has activity for today
    const hasActivityToday = await this.hasActivityForDate(userId, streakType, today)
    if (hasActivityToday) {
      return streakData // No update needed
    }

    // Mark activity for today
    await this.markActivityForDate(userId, streakType, today)

    // Update streak logic
    if (lastActivityKey === yesterday) {
      // Consecutive day - increment streak
      streakData.currentStreak += 1
    } else if (lastActivityKey === today) {
      // Same day - no change to streak
      return streakData
    } else {
      // Gap in activity - check for streak freeze
      const daysSinceLastActivity = this.getDaysDifference(
        streakData.lastActivityDate,
        activityDate,
      )

      if (daysSinceLastActivity === 1) {
        // One day gap - can use streak freeze
        if (streakData.streakFreezes > 0) {
          const useFreeze = await this.shouldUseStreakFreeze(userId, streakData)
          if (useFreeze) {
            streakData.streakFreezes -= 1
            streakData.currentStreak += 1
            await this.recordStreakFreezeUsage(userId, streakType, activityDate)
          } else {
            streakData.currentStreak = 1 // Reset streak
          }
        } else {
          streakData.currentStreak = 1 // Reset streak
        }
      } else {
        // Multiple days gap - reset streak
        streakData.currentStreak = 1
      }
    }

    // Update longest streak
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak
    }

    // Update last activity date
    streakData.lastActivityDate = activityDate

    // Check for milestone rewards
    const milestoneRewards = await this.checkStreakMilestones(userId, streakData)

    // Store updated streak data
    await this.storeStreakData(userId, streakType, streakData)

    // Update user game profile
    await this.updateUserGameProfile(userId, streakData)

    // Create celebrations for milestones
    for (const milestone of milestoneRewards) {
      await this.createStreakMilestoneCelebration(userId, streakData, milestone)
    }

    return streakData
  }

  async useStreakFreeze(
    userId: string,
    streakType: StreakType = StreakType.DAILY_STUDY,
  ): Promise<boolean> {
    const streakData = await this.getStreakData(userId, streakType)

    if (streakData.streakFreezes <= 0) {
      return false
    }

    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastActivityKey = this.getDateKey(streakData.lastActivityDate)
    const yesterdayKey = this.getDateKey(yesterday)

    // Can only use freeze if missed exactly one day
    if (lastActivityKey !== yesterdayKey) {
      return false
    }

    // Use the freeze
    streakData.streakFreezes -= 1
    await this.markActivityForDate(userId, streakType, yesterdayKey)
    await this.storeStreakData(userId, streakType, streakData)
    await this.recordStreakFreezeUsage(userId, streakType, yesterday)

    return true
  }

  async addStreakFreeze(userId: string, count: number = 1): Promise<void> {
    const streakData = await this.getStreakData(userId, StreakType.DAILY_STUDY)
    streakData.streakFreezes = Math.min(
      streakData.streakFreezes + count,
      streakData.maxStreakFreezes,
    )
    await this.storeStreakData(userId, StreakType.DAILY_STUDY, streakData)
  }

  async getStreakData(
    userId: string,
    streakType: StreakType = StreakType.DAILY_STUDY,
  ): Promise<StreakData> {
    const key = `streak:${userId}:${streakType}`
    const data = await this.redis.get(key)

    if (data) {
      const parsed = JSON.parse(data)
      return {
        ...parsed,
        lastActivityDate: new Date(parsed.lastActivityDate),
      }
    }

    // Return default streak data
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(0), // Epoch
      streakFreezes: 3,
      maxStreakFreezes: 3,
      streakType,
      milestones: [...this.streakMilestones],
    }
  }

  async getStreakLeaderboard(
    streakType: StreakType = StreakType.DAILY_STUDY,
    period: 'current' | 'longest' = 'current',
    limit: number = 100,
  ): Promise<any[]> {
    const key = `streak_leaderboard:${streakType}:${period}`
    const entries = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')

    const leaderboard = []
    for (let i = 0; i < entries.length; i += 2) {
      const userId = entries[i]
      const streak = parseInt(entries[i + 1])
      const rank = Math.floor(i / 2) + 1

      leaderboard.push({
        userId,
        streak,
        rank,
      })
    }

    return leaderboard
  }

  async getComebackBonus(userId: string): Promise<Reward | null> {
    const streakData = await this.getStreakData(userId, StreakType.DAILY_STUDY)
    const daysSinceLastActivity = this.getDaysDifference(streakData.lastActivityDate, new Date())

    // Comeback bonus for users who return after 3+ days
    if (daysSinceLastActivity >= 3 && daysSinceLastActivity <= 30) {
      const bonusXP = Math.min(daysSinceLastActivity * 10, 200) // Max 200 XP

      return {
        type: RewardType.XP,
        value: bonusXP,
        description: `Welcome back! ${bonusXP} XP comeback bonus`,
        metadata: { daysMissed: daysSinceLastActivity },
      }
    }

    return null
  }

  private async hasActivityForDate(
    userId: string,
    streakType: StreakType,
    dateKey: string,
  ): Promise<boolean> {
    const key = `activity:${userId}:${streakType}:${dateKey}`
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  private async markActivityForDate(
    userId: string,
    streakType: StreakType,
    dateKey: string,
  ): Promise<void> {
    const key = `activity:${userId}:${streakType}:${dateKey}`
    await this.redis.setex(key, 90 * 24 * 60 * 60, '1') // 90 days TTL
  }

  private async shouldUseStreakFreeze(userId: string, streakData: StreakData): Promise<boolean> {
    // Auto-use streak freeze for streaks >= 7 days
    if (streakData.currentStreak >= 7) {
      return true
    }

    // For shorter streaks, use freeze if user has multiple freezes available
    if (streakData.streakFreezes > 1) {
      return true
    }

    return false
  }

  private async checkStreakMilestones(
    userId: string,
    streakData: StreakData,
  ): Promise<StreakMilestone[]> {
    const rewardedMilestones: StreakMilestone[] = []

    for (const milestone of streakData.milestones) {
      if (!milestone.achieved && streakData.currentStreak >= milestone.days) {
        milestone.achieved = true
        milestone.achievedAt = new Date()
        rewardedMilestones.push(milestone)

        // Award the milestone reward
        await this.awardMilestoneReward(userId, milestone.reward)
      }
    }

    return rewardedMilestones
  }

  private async awardMilestoneReward(userId: string, reward: Reward): Promise<void> {
    switch (reward.type) {
      case RewardType.XP:
        // Would integrate with XP system
        break
      case RewardType.STREAK_FREEZE:
        await this.addStreakFreeze(userId, reward.value)
        break
      // Add other reward types as needed
    }
  }

  private async storeStreakData(
    userId: string,
    streakType: StreakType,
    streakData: StreakData,
  ): Promise<void> {
    const key = `streak:${userId}:${streakType}`
    await this.redis.setex(key, 90 * 24 * 60 * 60, JSON.stringify(streakData))

    // Update leaderboards
    await Promise.all([
      this.redis.zadd(`streak_leaderboard:${streakType}:current`, streakData.currentStreak, userId),
      this.redis.zadd(`streak_leaderboard:${streakType}:longest`, streakData.longestStreak, userId),
    ])
  }

  private async updateUserGameProfile(userId: string, streakData: StreakData): Promise<void> {
    const profile = await this.getUserGameProfile(userId)
    profile.currentStreak = streakData.currentStreak
    profile.longestStreak = streakData.longestStreak
    profile.streakFreezes = streakData.streakFreezes
    profile.lastActivityDate = streakData.lastActivityDate

    await this.storeUserGameProfile(profile)
  }

  private async createStreakMilestoneCelebration(
    userId: string,
    streakData: StreakData,
    milestone: StreakMilestone,
  ): Promise<void> {
    const celebration = {
      id: `streak_milestone_${userId}_${milestone.days}_${Date.now()}`,
      userId,
      type: CelebrationType.STREAK_MILESTONE,
      title: 'Streak Milestone!',
      message: `Amazing! You've reached a ${milestone.days}-day streak!`,
      data: {
        streakDays: milestone.days,
        currentStreak: streakData.currentStreak,
        reward: milestone.reward,
        streakType: streakData.streakType,
      },
      timestamp: new Date(),
      isViewed: false,
    }

    await this.redis.lpush(`celebrations:${userId}`, JSON.stringify(celebration))
    await this.redis.ltrim(`celebrations:${userId}`, 0, 99)
    await this.redis.expire(`celebrations:${userId}`, 30 * 24 * 60 * 60)
  }

  private async recordStreakFreezeUsage(
    userId: string,
    streakType: StreakType,
    date: Date,
  ): Promise<void> {
    const record = {
      userId,
      streakType,
      usedAt: date.toISOString(),
      reason: 'missed_day',
    }

    await this.redis.lpush(`streak_freeze_usage:${userId}`, JSON.stringify(record))
    await this.redis.ltrim(`streak_freeze_usage:${userId}`, 0, 99)
    await this.redis.expire(`streak_freeze_usage:${userId}`, 90 * 24 * 60 * 60)
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private async getUserGameProfile(userId: string): Promise<UserGameProfile> {
    const data = await this.redis.get(`game_profile:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default profile
    return {
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
  }

  private async storeUserGameProfile(profile: UserGameProfile): Promise<void> {
    await this.redis.setex(
      `game_profile:${profile.userId}`,
      90 * 24 * 60 * 60,
      JSON.stringify(profile),
    )
  }

  private initializeStreakMilestones(): void {
    this.streakMilestones = [
      {
        days: 3,
        reward: { type: RewardType.XP, value: 50, description: '50 XP bonus' },
        achieved: false,
      },
      {
        days: 7,
        reward: { type: RewardType.STREAK_FREEZE, value: 1, description: '1 streak freeze' },
        achieved: false,
      },
      {
        days: 14,
        reward: { type: RewardType.XP, value: 200, description: '200 XP bonus' },
        achieved: false,
      },
      {
        days: 30,
        reward: { type: RewardType.STREAK_FREEZE, value: 2, description: '2 streak freezes' },
        achieved: false,
      },
      {
        days: 60,
        reward: { type: RewardType.XP, value: 500, description: '500 XP bonus' },
        achieved: false,
      },
      {
        days: 100,
        reward: { type: RewardType.XP, value: 1000, description: '1000 XP bonus' },
        achieved: false,
      },
      {
        days: 365,
        reward: { type: RewardType.XP, value: 5000, description: '5000 XP bonus' },
        achieved: false,
      },
    ]
  }
}
