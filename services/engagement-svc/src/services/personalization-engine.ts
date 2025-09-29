import { Redis } from 'ioredis'
import {
  NotificationContent,
  NotificationType,
  NotificationTemplate,
  PersonalizationRule,
  EngagementMetrics,
} from '../types/notification.js'

export class PersonalizationEngine {
  private redis: Redis
  private templates: Map<NotificationType, NotificationTemplate[]> = new Map()

  constructor(redis: Redis) {
    this.redis = redis
    this.initializeTemplates()
  }

  async generateContent(
    userId: string,
    type: NotificationType,
    metadata: Record<string, any> = {},
  ): Promise<NotificationContent> {
    // Get user's personalization profile
    const profile = await this.getUserPersonalizationProfile(userId)

    // Get templates for this notification type
    const templates = this.templates.get(type) || []
    if (templates.length === 0) {
      throw new Error(`No templates found for notification type: ${type}`)
    }

    // Select best template based on user profile and engagement history
    const selectedTemplate = await this.selectOptimalTemplate(userId, templates, profile)

    // Apply personalization rules
    const personalizedContent = await this.applyPersonalizationRules(
      selectedTemplate,
      userId,
      profile,
      metadata,
    )

    return personalizedContent
  }

  async updateEngagementData(
    userId: string,
    notificationId: string,
    metrics: EngagementMetrics,
  ): Promise<void> {
    // Update user's engagement profile
    const profile = await this.getUserPersonalizationProfile(userId)

    // Calculate engagement score for this notification
    const engagementScore = this.calculateEngagementScore(metrics)

    // Update profile with new engagement data
    profile.totalNotifications += 1
    profile.totalEngagements += engagementScore
    profile.averageEngagement = profile.totalEngagements / profile.totalNotifications

    // Update type-specific engagement rates
    if (!profile.typeEngagement[metrics.notificationId]) {
      profile.typeEngagement[metrics.notificationId] = {
        sent: 0,
        opened: 0,
        clicked: 0,
        actionTaken: 0,
      }
    }

    const typeStats = profile.typeEngagement[metrics.notificationId]
    typeStats.sent += 1
    if (metrics.opened) typeStats.opened += 1
    if (metrics.clicked) typeStats.clicked += 1
    if (metrics.actionTaken) typeStats.actionTaken += 1

    // Update timing preferences based on engagement
    if (metrics.opened || metrics.clicked) {
      const hour = metrics.deliveryTime.getHours()
      profile.preferredHours[hour] = (profile.preferredHours[hour] || 0) + 1
    }

    // Store updated profile
    await this.storeUserPersonalizationProfile(userId, profile)
  }

  private async selectOptimalTemplate(
    userId: string,
    templates: NotificationTemplate[],
    profile: PersonalizationProfile,
  ): Promise<NotificationTemplate> {
    // If user is new, use A/B testing approach
    if (profile.totalNotifications < 10) {
      return templates[Math.floor(Math.random() * templates.length)]
    }

    // For experienced users, use engagement-based selection
    let bestTemplate = templates[0]
    let bestScore = 0

    for (const template of templates) {
      const score = await this.calculateTemplateScore(template, profile)
      if (score > bestScore) {
        bestScore = score
        bestTemplate = template
      }
    }

    return bestTemplate
  }

  private async calculateTemplateScore(
    template: NotificationTemplate,
    profile: PersonalizationProfile,
  ): Promise<number> {
    // Base score from historical performance
    let score = 0.5

    // Adjust based on user's engagement with this template type
    const typeEngagement = profile.typeEngagement && profile.typeEngagement[template.type]
    if (typeEngagement && typeEngagement.sent > 0) {
      const openRate = typeEngagement.opened / typeEngagement.sent
      const clickRate = typeEngagement.clicked / typeEngagement.sent
      const actionRate = typeEngagement.actionTaken / typeEngagement.sent

      score = openRate * 0.3 + clickRate * 0.4 + actionRate * 0.3
    }

    // Adjust based on personalization rules match
    for (const rule of template.personalizationRules) {
      if (await this.evaluatePersonalizationRule(rule, profile)) {
        score += 0.1 // Boost score for matching rules
      }
    }

    return Math.min(score, 1.0)
  }

  private async applyPersonalizationRules(
    template: NotificationTemplate,
    userId: string,
    profile: PersonalizationProfile,
    metadata: Record<string, any>,
  ): Promise<NotificationContent> {
    let title = template.title
    let body = template.body

    // Apply template variables
    title = this.replaceVariables(title, userId, metadata)
    body = this.replaceVariables(body, userId, metadata)

    // Apply personalization rules
    for (const rule of template.personalizationRules) {
      if (await this.evaluatePersonalizationRule(rule, profile)) {
        if (rule.titleModifier) {
          title = this.applyModifier(title, rule.titleModifier, metadata)
        }
        if (rule.bodyModifier) {
          body = this.applyModifier(body, rule.bodyModifier, metadata)
        }
      }
    }

    return {
      title,
      body,
      actionUrl: metadata.actionUrl,
      imageUrl: metadata.imageUrl,
      customData: metadata.customData,
    }
  }

  private replaceVariables(text: string, userId: string, metadata: Record<string, any>): string {
    let result = text

    // Replace user-specific variables
    result = result.replace(/\{userId\}/g, userId)
    result = result.replace(/\{userName\}/g, metadata.userName || 'there')

    // Replace metadata variables
    Object.entries(metadata).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      result = result.replace(regex, String(value))
    })

    return result
  }

  private applyModifier(text: string, modifier: string, metadata: Record<string, any>): string {
    // Simple modifier system - in production, this would be more sophisticated
    if (modifier.includes('urgent')) {
      return `🚨 ${text}`
    }
    if (modifier.includes('celebration')) {
      return `🎉 ${text}`
    }
    if (modifier.includes('streak')) {
      return `🔥 ${text}`
    }
    return text
  }

  private async evaluatePersonalizationRule(
    rule: PersonalizationRule,
    profile: PersonalizationProfile,
  ): Promise<boolean> {
    // Simple rule evaluation - in production, use a proper rule engine
    try {
      // Example conditions:
      // "averageEngagement > 0.5"
      // "totalNotifications > 10"
      // "preferredTime == 'morning'"

      if (rule.condition.includes('averageEngagement >')) {
        const threshold = parseFloat(rule.condition.split('>')[1].trim())
        return profile.averageEngagement > threshold
      }

      if (rule.condition.includes('totalNotifications >')) {
        const threshold = parseInt(rule.condition.split('>')[1].trim())
        return profile.totalNotifications > threshold
      }

      return false
    } catch (error) {
      console.error('Error evaluating personalization rule:', error)
      return false
    }
  }

  private calculateEngagementScore(metrics: EngagementMetrics): number {
    let score = 0
    if (metrics.delivered) score += 0.1
    if (metrics.opened) score += 0.3
    if (metrics.clicked) score += 0.4
    if (metrics.actionTaken) score += 0.2
    return score
  }

  private async getUserPersonalizationProfile(userId: string): Promise<PersonalizationProfile> {
    const data = await this.redis.get(`personalization_profile:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default profile for new users
    return {
      userId,
      totalNotifications: 0,
      totalEngagements: 0,
      averageEngagement: 0,
      typeEngagement: {},
      preferredHours: {},
      lastUpdated: new Date(),
    }
  }

  private async storeUserPersonalizationProfile(
    userId: string,
    profile: PersonalizationProfile,
  ): Promise<void> {
    profile.lastUpdated = new Date()
    await this.redis.setex(
      `personalization_profile:${userId}`,
      90 * 24 * 60 * 60, // 90 days TTL
      JSON.stringify(profile),
    )
  }

  private initializeTemplates(): void {
    // Study reminder templates
    this.templates.set(NotificationType.STUDY_REMINDER, [
      {
        id: 'study_reminder_1',
        type: NotificationType.STUDY_REMINDER,
        title: 'Time to practice! 📚',
        body: "Your daily study session is ready. Let's keep your streak going!",
        variables: ['userName', 'streakCount'],
        personalizationRules: [
          {
            condition: 'averageEngagement > 0.7',
            titleModifier: 'celebration',
            timing: 'optimal',
          },
        ],
        isActive: true,
      },
      {
        id: 'study_reminder_2',
        type: NotificationType.STUDY_REMINDER,
        title: "Ready for today's lesson?",
        body: 'Hi {userName}! Your personalized study session is waiting.',
        variables: ['userName'],
        personalizationRules: [
          {
            condition: 'totalNotifications > 5',
            bodyModifier: 'Just 15 minutes can make a big difference!',
          },
        ],
        isActive: true,
      },
    ])

    // Achievement templates
    this.templates.set(NotificationType.ACHIEVEMENT_UNLOCKED, [
      {
        id: 'achievement_1',
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        title: 'Achievement Unlocked! 🏆',
        body: 'Congratulations! You\'ve earned the "{achievementName}" badge!',
        variables: ['userName', 'achievementName'],
        personalizationRules: [
          {
            condition: 'averageEngagement > 0.5',
            titleModifier: 'celebration',
          },
        ],
        isActive: true,
      },
    ])

    // Streak reminder templates
    this.templates.set(NotificationType.STREAK_REMINDER, [
      {
        id: 'streak_reminder_1',
        type: NotificationType.STREAK_REMINDER,
        title: "Don't break your streak! 🔥",
        body: "You're on a {streakCount}-day streak! Keep it going with a quick session.",
        variables: ['streakCount'],
        personalizationRules: [
          {
            condition: 'streakCount > 7',
            titleModifier: 'urgent',
          },
        ],
        isActive: true,
      },
    ])

    // Friend challenge templates
    this.templates.set(NotificationType.FRIEND_CHALLENGE, [
      {
        id: 'friend_challenge_1',
        type: NotificationType.FRIEND_CHALLENGE,
        title: 'Challenge from {friendName}! 🎯',
        body: '{friendName} challenged you to a study duel. Are you ready?',
        variables: ['friendName', 'challengeType'],
        personalizationRules: [],
        isActive: true,
      },
    ])
  }
}

interface PersonalizationProfile {
  userId: string
  totalNotifications: number
  totalEngagements: number
  averageEngagement: number
  typeEngagement: Record<
    string,
    {
      sent: number
      opened: number
      clicked: number
      actionTaken: number
    }
  >
  preferredHours: Record<number, number>
  lastUpdated: Date
}
