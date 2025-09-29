import { Redis } from 'ioredis'
import {
  NotificationContext,
  NotificationSchedule,
  NotificationPreferences,
  UserActivityPattern,
  OptimalTiming,
  NotificationType,
  NotificationPriority,
  EngagementMetrics,
  NotificationDeliveryResult,
} from '../types/notification.js'
import { PersonalizationEngine } from './personalization-engine.js'
import { TimingOptimizer } from './timing-optimizer.js'
import { DeliveryManager } from './delivery-manager.js'
import { nanoid } from 'nanoid'

export class NotificationService {
  private redis: Redis
  private personalizationEngine: PersonalizationEngine
  private timingOptimizer: TimingOptimizer
  private deliveryManager: DeliveryManager

  constructor(redis: Redis) {
    this.redis = redis
    this.personalizationEngine = new PersonalizationEngine(redis)
    this.timingOptimizer = new TimingOptimizer(redis)
    this.deliveryManager = new DeliveryManager(redis)
  }

  async schedulePersonalizedNotification(
    userId: string,
    notificationType: NotificationType,
    context: Partial<NotificationContext> = {},
  ): Promise<NotificationSchedule> {
    // Get user preferences and activity patterns
    const [preferences, activityPattern] = await Promise.all([
      this.getUserPreferences(userId),
      this.getUserActivityPattern(userId),
    ])

    // Check if user has notifications enabled for this type
    if (!this.isNotificationAllowed(preferences, notificationType)) {
      throw new Error(`Notifications disabled for type: ${notificationType}`)
    }

    // Generate personalized content
    const personalizedContent = await this.personalizationEngine.generateContent(
      userId,
      notificationType,
      context.metadata || {},
    )

    // Optimize delivery timing
    const optimalTiming = await this.timingOptimizer.calculateOptimalTiming(
      userId,
      activityPattern,
      preferences,
      notificationType,
    )

    // Create notification context
    const notificationContext: NotificationContext = {
      userId,
      type: notificationType,
      priority: context.priority || NotificationPriority.NORMAL,
      content: personalizedContent,
      scheduledFor: optimalTiming.recommendedTime,
      expiresAt: context.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: context.metadata,
    }

    // Create schedule entry
    const schedule: NotificationSchedule = {
      id: nanoid(),
      userId,
      notificationId: nanoid(),
      scheduledFor: optimalTiming.recommendedTime,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.getMaxRetries(notificationType),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Store notification and schedule
    await Promise.all([
      this.storeNotification(schedule.notificationId, notificationContext),
      this.storeSchedule(schedule),
      this.scheduleDelivery(schedule),
    ])

    return schedule
  }

  async optimizeDeliveryTiming(
    userId: string,
    userActivityPattern: UserActivityPattern,
  ): Promise<OptimalTiming> {
    return this.timingOptimizer.calculateOptimalTiming(
      userId,
      userActivityPattern,
      await this.getUserPreferences(userId),
      NotificationType.STUDY_REMINDER,
    )
  }

  async trackEngagementMetrics(
    notificationId: string,
    engagement: Partial<EngagementMetrics>,
  ): Promise<void> {
    const metrics: EngagementMetrics = {
      notificationId,
      userId: engagement.userId!,
      delivered: engagement.delivered || false,
      opened: engagement.opened || false,
      clicked: engagement.clicked || false,
      actionTaken: engagement.actionTaken || false,
      deliveryTime: engagement.deliveryTime || new Date(),
      openTime: engagement.openTime,
      clickTime: engagement.clickTime,
      actionTime: engagement.actionTime,
      platform: engagement.platform || 'push',
    }

    // Store metrics
    await this.storeEngagementMetrics(metrics)

    // Update personalization model with engagement data
    await this.personalizationEngine.updateEngagementData(
      metrics.userId,
      metrics.notificationId,
      metrics,
    )

    // Update timing optimization model
    await this.timingOptimizer.updateTimingData(
      metrics.userId,
      metrics.deliveryTime,
      metrics.opened || metrics.clicked,
    )
  }

  async processScheduledNotifications(): Promise<void> {
    const now = new Date()
    const pendingNotifications = await this.getPendingNotifications(now)

    for (const schedule of pendingNotifications) {
      try {
        await this.deliverNotification(schedule)
      } catch (error) {
        console.error(`Failed to deliver notification ${schedule.id}:`, error)
        await this.handleDeliveryFailure(schedule, error as Error)
      }
    }
  }

  private async deliverNotification(schedule: NotificationSchedule): Promise<void> {
    const notification = await this.getNotification(schedule.notificationId)
    if (!notification) {
      throw new Error(`Notification not found: ${schedule.notificationId}`)
    }

    // Check if notification has expired
    if (notification.expiresAt && notification.expiresAt < new Date()) {
      await this.markScheduleStatus(schedule.id, 'cancelled')
      return
    }

    // Deliver notification
    const result = await this.deliveryManager.deliver(notification)

    if (result.success) {
      await this.markScheduleStatus(schedule.id, 'sent')
      await this.trackEngagementMetrics(schedule.notificationId, {
        userId: notification.userId,
        delivered: true,
        deliveryTime: result.timestamp,
        platform: result.platform,
      })
    } else {
      throw new Error(result.error || 'Delivery failed')
    }
  }

  private async handleDeliveryFailure(schedule: NotificationSchedule, error: Error): Promise<void> {
    const updatedSchedule = {
      ...schedule,
      retryCount: schedule.retryCount + 1,
      updatedAt: new Date(),
    }

    if (updatedSchedule.retryCount >= schedule.maxRetries) {
      await this.markScheduleStatus(schedule.id, 'failed')
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, updatedSchedule.retryCount) * 60 * 1000 // minutes
      updatedSchedule.scheduledFor = new Date(Date.now() + retryDelay)
      await this.storeSchedule(updatedSchedule)
    }
  }

  private isNotificationAllowed(
    preferences: NotificationPreferences,
    type: NotificationType,
  ): boolean {
    if (!preferences.enablePushNotifications) return false

    switch (type) {
      case NotificationType.STUDY_REMINDER:
        return preferences.studyReminders
      case NotificationType.ACHIEVEMENT_UNLOCKED:
        return preferences.achievementNotifications
      case NotificationType.FRIEND_CHALLENGE:
        return preferences.socialNotifications
      case NotificationType.STREAK_REMINDER:
        return preferences.streakReminders
      default:
        return true
    }
  }

  private getMaxRetries(type: NotificationType): number {
    switch (type) {
      case NotificationType.URGENT:
        return 5
      case NotificationType.ACHIEVEMENT_UNLOCKED:
      case NotificationType.FRIEND_CHALLENGE:
        return 3
      default:
        return 2
    }
  }

  // Redis storage methods
  private async storeNotification(
    notificationId: string,
    notification: NotificationContext,
  ): Promise<void> {
    await this.redis.setex(
      `notification:${notificationId}`,
      24 * 60 * 60, // 24 hours TTL
      JSON.stringify(notification),
    )
  }

  private async getNotification(notificationId: string): Promise<NotificationContext | null> {
    const data = await this.redis.get(`notification:${notificationId}`)
    return data ? JSON.parse(data) : null
  }

  private async storeSchedule(schedule: NotificationSchedule): Promise<void> {
    const pipeline = this.redis.pipeline()

    // Store schedule data
    pipeline.setex(
      `schedule:${schedule.id}`,
      7 * 24 * 60 * 60, // 7 days TTL
      JSON.stringify(schedule),
    )

    // Add to time-based sorted set for efficient querying
    pipeline.zadd('scheduled_notifications', schedule.scheduledFor.getTime(), schedule.id)

    await pipeline.exec()
  }

  private async getPendingNotifications(before: Date): Promise<NotificationSchedule[]> {
    const scheduleIds = await this.redis.zrangebyscore(
      'scheduled_notifications',
      0,
      before.getTime(),
    )

    const schedules: NotificationSchedule[] = []
    for (const id of scheduleIds) {
      const data = await this.redis.get(`schedule:${id}`)
      if (data) {
        const schedule = JSON.parse(data)
        if (schedule.status === 'pending') {
          schedules.push(schedule)
        }
      }
    }

    return schedules
  }

  private async markScheduleStatus(scheduleId: string, status: string): Promise<void> {
    const data = await this.redis.get(`schedule:${scheduleId}`)
    if (data) {
      const schedule = JSON.parse(data)
      schedule.status = status
      schedule.updatedAt = new Date()
      await this.redis.setex(`schedule:${scheduleId}`, 7 * 24 * 60 * 60, JSON.stringify(schedule))

      // Remove from pending queue if completed
      if (status !== 'pending') {
        await this.redis.zrem('scheduled_notifications', scheduleId)
      }
    }
  }

  private async scheduleDelivery(schedule: NotificationSchedule): Promise<void> {
    // This would integrate with a job queue system like Bull or Agenda
    // For now, we'll use a simple setTimeout approach for immediate delivery
    const delay = schedule.scheduledFor.getTime() - Date.now()

    if (delay <= 0) {
      // Deliver immediately
      setImmediate(() => this.deliverNotification(schedule))
    } else {
      // Schedule for later (in production, use a proper job queue)
      setTimeout(() => this.deliverNotification(schedule), Math.min(delay, 2147483647))
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const data = await this.redis.get(`user_preferences:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default preferences
    return {
      enablePushNotifications: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      studyReminders: true,
      achievementNotifications: true,
      socialNotifications: true,
      streakReminders: true,
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      },
      frequency: {
        studyReminders: 'daily',
        achievementNotifications: 'immediate',
        socialNotifications: 'hourly',
      },
    }
  }

  private async getUserActivityPattern(userId: string): Promise<UserActivityPattern> {
    const data = await this.redis.get(`activity_pattern:${userId}`)
    if (data) {
      return JSON.parse(data)
    }

    // Return default pattern
    return {
      userId,
      peakHours: [9, 10, 11, 19, 20, 21], // Morning and evening
      preferredDays: [1, 2, 3, 4, 5], // Weekdays
      averageSessionDuration: 15,
      lastActiveTime: new Date(),
      timezone: 'UTC',
      studyStreak: 0,
      totalSessions: 0,
    }
  }

  private async storeEngagementMetrics(metrics: EngagementMetrics): Promise<void> {
    const key = `engagement:${metrics.notificationId}:${metrics.userId}`
    await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(metrics)) // 30 days TTL

    // Also store in time-series for analytics
    const timeSeriesKey = `engagement_ts:${new Date().toISOString().split('T')[0]}`
    await this.redis.lpush(timeSeriesKey, JSON.stringify(metrics))
    await this.redis.expire(timeSeriesKey, 90 * 24 * 60 * 60) // 90 days TTL
  }
}
