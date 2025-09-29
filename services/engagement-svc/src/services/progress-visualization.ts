import { Redis } from 'ioredis'
import {
  ProgressVisualization,
  ProgressData,
  ProgressPoint,
  Milestone,
  ProgressProjection,
  VisualizationType,
  UserGameProfile,
} from '../types/gamification.js'

export class ProgressVisualizationService {
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async generateProgressVisualization(
    userId: string,
    type: VisualizationType,
    timeframe: number = 30, // days
  ): Promise<ProgressVisualization> {
    const userProfile = await this.getUserGameProfile(userId)

    switch (type) {
      case VisualizationType.XP_PROGRESS:
        return this.generateXPProgress(userId, userProfile, timeframe)

      case VisualizationType.STREAK_CALENDAR:
        return this.generateStreakCalendar(userId, userProfile, timeframe)

      case VisualizationType.ACCURACY_TREND:
        return this.generateAccuracyTrend(userId, userProfile, timeframe)

      case VisualizationType.STUDY_TIME:
        return this.generateStudyTimeProgress(userId, userProfile, timeframe)

      case VisualizationType.TOPIC_MASTERY:
        return this.generateTopicMasteryProgress(userId, userProfile, timeframe)

      default:
        throw new Error(`Unsupported visualization type: ${type}`)
    }
  }

  async createCelebrationVisualization(
    userId: string,
    achievementType: string,
    data: any,
  ): Promise<any> {
    switch (achievementType) {
      case 'level_up':
        return this.createLevelUpVisualization(userId, data)

      case 'streak_milestone':
        return this.createStreakMilestoneVisualization(userId, data)

      case 'achievement_unlocked':
        return this.createAchievementVisualization(userId, data)

      case 'perfect_session':
        return this.createPerfectSessionVisualization(userId, data)

      default:
        return this.createGenericCelebration(userId, data)
    }
  }

  private async generateXPProgress(
    userId: string,
    userProfile: UserGameProfile,
    timeframe: number,
  ): Promise<ProgressVisualization> {
    const history = await this.getXPHistory(userId, timeframe)
    const nextLevelXP = this.calculateXPForLevel(userProfile.level + 1)
    const currentLevelXP = this.calculateXPForLevel(userProfile.level)
    const progressToNextLevel = userProfile.totalXP - currentLevelXP
    const xpNeededForNextLevel = nextLevelXP - userProfile.totalXP

    const progressData: ProgressData = {
      current: progressToNextLevel,
      target: nextLevelXP - currentLevelXP,
      percentage: (progressToNextLevel / (nextLevelXP - currentLevelXP)) * 100,
      trend: this.calculateTrend(history),
      history,
    }

    const milestones: Milestone[] = [
      {
        id: 'next_level',
        name: `Level ${userProfile.level + 1}`,
        description: `Reach level ${userProfile.level + 1}`,
        targetValue: nextLevelXP,
        currentValue: userProfile.totalXP,
        isAchieved: false,
      },
    ]

    const projections = await this.calculateXPProjections(userId, history)

    return {
      userId,
      type: VisualizationType.XP_PROGRESS,
      data: progressData,
      milestones,
      projections,
    }
  }

  private async generateStreakCalendar(
    userId: string,
    userProfile: UserGameProfile,
    timeframe: number,
  ): Promise<ProgressVisualization> {
    const streakHistory = await this.getStreakHistory(userId, timeframe)

    const progressData: ProgressData = {
      current: userProfile.currentStreak,
      target: Math.max(userProfile.longestStreak + 1, userProfile.currentStreak + 7),
      percentage: (userProfile.currentStreak / userProfile.longestStreak) * 100,
      trend: userProfile.currentStreak > 0 ? 'up' : 'down',
      history: streakHistory,
    }

    const milestones: Milestone[] = [
      {
        id: 'beat_longest_streak',
        name: 'Beat Personal Best',
        description: `Reach ${userProfile.longestStreak + 1} day streak`,
        targetValue: userProfile.longestStreak + 1,
        currentValue: userProfile.currentStreak,
        isAchieved: userProfile.currentStreak > userProfile.longestStreak,
      },
    ]

    return {
      userId,
      type: VisualizationType.STREAK_CALENDAR,
      data: progressData,
      milestones,
      projections: [],
    }
  }

  private async generateAccuracyTrend(
    userId: string,
    userProfile: UserGameProfile,
    timeframe: number,
  ): Promise<ProgressVisualization> {
    const accuracyHistory = await this.getAccuracyHistory(userId, timeframe)

    const progressData: ProgressData = {
      current: userProfile.statistics.averageAccuracy * 100,
      target: 95, // Target 95% accuracy
      percentage: userProfile.statistics.averageAccuracy * 100,
      trend: this.calculateTrend(accuracyHistory),
      history: accuracyHistory,
    }

    const milestones: Milestone[] = [
      {
        id: 'accuracy_80',
        name: 'Good Accuracy',
        description: 'Maintain 80% accuracy',
        targetValue: 80,
        currentValue: userProfile.statistics.averageAccuracy * 100,
        isAchieved: userProfile.statistics.averageAccuracy >= 0.8,
      },
      {
        id: 'accuracy_90',
        name: 'Great Accuracy',
        description: 'Maintain 90% accuracy',
        targetValue: 90,
        currentValue: userProfile.statistics.averageAccuracy * 100,
        isAchieved: userProfile.statistics.averageAccuracy >= 0.9,
      },
      {
        id: 'accuracy_95',
        name: 'Excellent Accuracy',
        description: 'Maintain 95% accuracy',
        targetValue: 95,
        currentValue: userProfile.statistics.averageAccuracy * 100,
        isAchieved: userProfile.statistics.averageAccuracy >= 0.95,
      },
    ]

    return {
      userId,
      type: VisualizationType.ACCURACY_TREND,
      data: progressData,
      milestones,
      projections: [],
    }
  }

  private async generateStudyTimeProgress(
    userId: string,
    userProfile: UserGameProfile,
    timeframe: number,
  ): Promise<ProgressVisualization> {
    const studyTimeHistory = await this.getStudyTimeHistory(userId, timeframe)
    const weeklyTarget = 7 * 60 * 60 * 1000 // 7 hours per week
    const currentWeekStudyTime = await this.getCurrentWeekStudyTime(userId)

    const progressData: ProgressData = {
      current: currentWeekStudyTime,
      target: weeklyTarget,
      percentage: (currentWeekStudyTime / weeklyTarget) * 100,
      trend: this.calculateTrend(studyTimeHistory),
      history: studyTimeHistory,
    }

    const milestones: Milestone[] = [
      {
        id: 'daily_goal',
        name: 'Daily Goal',
        description: 'Study for 1 hour today',
        targetValue: 60 * 60 * 1000,
        currentValue: await this.getTodayStudyTime(userId),
        isAchieved: (await this.getTodayStudyTime(userId)) >= 60 * 60 * 1000,
      },
      {
        id: 'weekly_goal',
        name: 'Weekly Goal',
        description: 'Study for 7 hours this week',
        targetValue: weeklyTarget,
        currentValue: currentWeekStudyTime,
        isAchieved: currentWeekStudyTime >= weeklyTarget,
      },
    ]

    return {
      userId,
      type: VisualizationType.STUDY_TIME,
      data: progressData,
      milestones,
      projections: [],
    }
  }

  private async generateTopicMasteryProgress(
    userId: string,
    userProfile: UserGameProfile,
    timeframe: number,
  ): Promise<ProgressVisualization> {
    const topicProgress = await this.getTopicMasteryData(userId)
    const totalTopics = await this.getTotalTopicsCount()

    const progressData: ProgressData = {
      current: userProfile.statistics.topicsMastered,
      target: totalTopics,
      percentage: (userProfile.statistics.topicsMastered / totalTopics) * 100,
      trend: 'up', // Topics mastered generally only goes up
      history: topicProgress,
    }

    const milestones: Milestone[] = [
      {
        id: 'first_topic',
        name: 'First Mastery',
        description: 'Master your first topic',
        targetValue: 1,
        currentValue: userProfile.statistics.topicsMastered,
        isAchieved: userProfile.statistics.topicsMastered >= 1,
      },
      {
        id: 'ten_topics',
        name: 'Topic Explorer',
        description: 'Master 10 topics',
        targetValue: 10,
        currentValue: userProfile.statistics.topicsMastered,
        isAchieved: userProfile.statistics.topicsMastered >= 10,
      },
      {
        id: 'half_topics',
        name: 'Halfway There',
        description: `Master ${Math.floor(totalTopics / 2)} topics`,
        targetValue: Math.floor(totalTopics / 2),
        currentValue: userProfile.statistics.topicsMastered,
        isAchieved: userProfile.statistics.topicsMastered >= Math.floor(totalTopics / 2),
      },
    ]

    return {
      userId,
      type: VisualizationType.TOPIC_MASTERY,
      data: progressData,
      milestones,
      projections: [],
    }
  }

  private async createLevelUpVisualization(userId: string, data: any): Promise<any> {
    return {
      type: 'level_up',
      animation: 'burst',
      colors: ['#FFD700', '#FFA500', '#FF6347'],
      elements: [
        {
          type: 'text',
          content: `LEVEL ${data.newLevel}!`,
          style: { fontSize: '48px', fontWeight: 'bold', color: '#FFD700' },
        },
        {
          type: 'progress_bar',
          from: data.oldLevel,
          to: data.newLevel,
          duration: 2000,
        },
        {
          type: 'particle_effect',
          particles: 50,
          colors: ['#FFD700', '#FFA500'],
        },
      ],
    }
  }

  private async createStreakMilestoneVisualization(userId: string, data: any): Promise<any> {
    return {
      type: 'streak_milestone',
      animation: 'fire',
      colors: ['#FF4500', '#FF6347', '#FFD700'],
      elements: [
        {
          type: 'text',
          content: `🔥 ${data.streakDays} DAY STREAK! 🔥`,
          style: { fontSize: '36px', fontWeight: 'bold', color: '#FF4500' },
        },
        {
          type: 'streak_calendar',
          days: data.streakDays,
          highlight: true,
        },
        {
          type: 'flame_effect',
          intensity: Math.min(data.streakDays / 10, 1),
        },
      ],
    }
  }

  private async createAchievementVisualization(userId: string, data: any): Promise<any> {
    const rarityColors = {
      common: '#C0C0C0',
      uncommon: '#00FF00',
      rare: '#0080FF',
      epic: '#8000FF',
      legendary: '#FFD700',
    }

    return {
      type: 'achievement_unlocked',
      animation: 'shine',
      colors: [rarityColors[data.rarity] || '#FFD700'],
      elements: [
        {
          type: 'text',
          content: 'ACHIEVEMENT UNLOCKED!',
          style: { fontSize: '32px', fontWeight: 'bold' },
        },
        {
          type: 'achievement_badge',
          name: data.achievementName,
          description: data.achievementDescription,
          rarity: data.rarity,
        },
        {
          type: 'shine_effect',
          color: rarityColors[data.rarity] || '#FFD700',
        },
      ],
    }
  }

  private async createPerfectSessionVisualization(userId: string, data: any): Promise<any> {
    return {
      type: 'perfect_session',
      animation: 'sparkle',
      colors: ['#FFD700', '#FFFFFF', '#87CEEB'],
      elements: [
        {
          type: 'text',
          content: 'PERFECT SESSION!',
          style: { fontSize: '40px', fontWeight: 'bold', color: '#FFD700' },
        },
        {
          type: 'accuracy_display',
          percentage: 100,
          animated: true,
        },
        {
          type: 'sparkle_effect',
          count: 30,
        },
      ],
    }
  }

  private createGenericCelebration(userId: string, data: any): any {
    return {
      type: 'generic',
      animation: 'bounce',
      colors: ['#4CAF50', '#2196F3', '#FF9800'],
      elements: [
        {
          type: 'text',
          content: 'Great Job!',
          style: { fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' },
        },
        {
          type: 'confetti',
          count: 20,
        },
      ],
    }
  }

  // Helper methods for data retrieval
  private async getXPHistory(userId: string, days: number): Promise<ProgressPoint[]> {
    const history: ProgressPoint[] = []
    const transactions = await this.redis.lrange(`xp_transactions:${userId}`, 0, -1)

    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    let cumulativeXP = 0
    for (const transaction of transactions.reverse()) {
      try {
        const data = JSON.parse(transaction)
        const date = new Date(data.timestamp)

        if (date >= startDate) {
          cumulativeXP += data.amount
          history.push({
            date,
            value: cumulativeXP,
            label: `+${data.amount} XP`,
          })
        }
      } catch (error) {
        // Skip invalid transactions
      }
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  private async getStreakHistory(userId: string, days: number): Promise<ProgressPoint[]> {
    const history: ProgressPoint[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const hasActivity = await this.redis.exists(`activity:${userId}:daily_study:${dateKey}`)

      history.push({
        date,
        value: hasActivity ? 1 : 0,
        label: hasActivity ? 'Active' : 'Inactive',
      })
    }

    return history
  }

  private async getAccuracyHistory(userId: string, days: number): Promise<ProgressPoint[]> {
    // This would require storing daily accuracy data
    // For now, return mock data
    const history: ProgressPoint[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      // Mock accuracy data - in real implementation, this would come from stored daily stats
      const accuracy = 75 + Math.random() * 20 // 75-95% range

      history.push({
        date,
        value: accuracy,
        label: `${accuracy.toFixed(1)}%`,
      })
    }

    return history
  }

  private async getStudyTimeHistory(userId: string, days: number): Promise<ProgressPoint[]> {
    // Similar to accuracy, this would require storing daily study time data
    const history: ProgressPoint[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const studyTime = await this.redis.get(`daily_study_time:${userId}:${dateKey}`)

      history.push({
        date,
        value: studyTime ? parseInt(studyTime) : 0,
        label: studyTime ? `${Math.round(parseInt(studyTime) / 60000)} min` : '0 min',
      })
    }

    return history
  }

  private async getTopicMasteryData(userId: string): Promise<ProgressPoint[]> {
    const masteryEvents = await this.redis.lrange(`topic_mastery:${userId}`, 0, -1)
    const history: ProgressPoint[] = []

    let count = 0
    for (const event of masteryEvents.reverse()) {
      try {
        const data = JSON.parse(event)
        count++
        history.push({
          date: new Date(data.timestamp),
          value: count,
          label: data.topicName,
        })
      } catch (error) {
        // Skip invalid events
      }
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  private calculateTrend(history: ProgressPoint[]): 'up' | 'down' | 'stable' {
    if (history.length < 2) return 'stable'

    const recent = history.slice(-7) // Last 7 data points
    const older = history.slice(-14, -7) // Previous 7 data points

    if (recent.length === 0 || older.length === 0) return 'stable'

    const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length
    const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length

    const change = (recentAvg - olderAvg) / olderAvg

    if (change > 0.05) return 'up'
    if (change < -0.05) return 'down'
    return 'stable'
  }

  private async calculateXPProjections(
    userId: string,
    history: ProgressPoint[],
  ): Promise<ProgressProjection[]> {
    if (history.length < 7) return []

    // Simple linear projection based on recent trend
    const recentPoints = history.slice(-7)
    const dailyGrowth =
      recentPoints.length > 1
        ? (recentPoints[recentPoints.length - 1].value - recentPoints[0].value) /
          (recentPoints.length - 1)
        : 0

    const projections: ProgressProjection[] = []
    const lastValue = history[history.length - 1]?.value || 0

    for (let i = 1; i <= 30; i++) {
      const projectedDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      const projectedValue = lastValue + dailyGrowth * i
      const confidence = Math.max(0.1, 1 - i * 0.02) // Decreasing confidence over time

      projections.push({
        date: projectedDate,
        projectedValue: Math.max(0, projectedValue),
        confidence,
      })
    }

    return projections
  }

  private calculateXPForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100
  }

  private async getCurrentWeekStudyTime(userId: string): Promise<number> {
    const now = new Date()
    const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000)

    let totalTime = 0
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const dayTime = await this.redis.get(`daily_study_time:${userId}:${dateKey}`)
      totalTime += dayTime ? parseInt(dayTime) : 0
    }

    return totalTime
  }

  private async getTodayStudyTime(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const studyTime = await this.redis.get(`daily_study_time:${userId}:${today}`)
    return studyTime ? parseInt(studyTime) : 0
  }

  private async getTotalTopicsCount(): Promise<number> {
    // This would come from the content service
    // For now, return a mock value
    return 50
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
}
