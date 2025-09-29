import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { NotificationService } from '../services/notification-service.js'
import {
  NotificationType,
  NotificationPriority,
  NotificationPreferences,
  UserActivityPattern,
} from '../types/notification.js'

export async function notificationRoutes(fastify: FastifyInstance) {
  const notificationService = fastify.notificationService as NotificationService

  // Schedule a personalized notification
  fastify.post<{
    Body: {
      userId: string
      type: NotificationType
      priority?: NotificationPriority
      metadata?: Record<string, any>
      scheduledFor?: string
    }
  }>('/notifications/schedule', async (request, reply) => {
    const { userId, type, priority, metadata, scheduledFor } = request.body

    try {
      const context = {
        priority: priority || NotificationPriority.NORMAL,
        metadata,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      }

      const schedule = await notificationService.schedulePersonalizedNotification(
        userId,
        type,
        context,
      )

      return { success: true, schedule }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get optimal timing for a user
  fastify.post<{
    Body: {
      userId: string
      activityPattern: UserActivityPattern
    }
  }>('/notifications/optimal-timing', async (request, reply) => {
    const { userId, activityPattern } = request.body

    try {
      const optimalTiming = await notificationService.optimizeDeliveryTiming(
        userId,
        activityPattern,
      )

      return { success: true, optimalTiming }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Track engagement metrics
  fastify.post<{
    Body: {
      notificationId: string
      userId: string
      delivered?: boolean
      opened?: boolean
      clicked?: boolean
      actionTaken?: boolean
      platform?: 'push' | 'email' | 'sms'
    }
  }>('/notifications/track-engagement', async (request, reply) => {
    const { notificationId, userId, delivered, opened, clicked, actionTaken, platform } =
      request.body

    try {
      await notificationService.trackEngagementMetrics(notificationId, {
        userId,
        delivered,
        opened,
        clicked,
        actionTaken,
        deliveryTime: new Date(),
        platform: platform || 'push',
      })

      return { success: true }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Update user notification preferences
  fastify.put<{
    Params: { userId: string }
    Body: NotificationPreferences
  }>('/users/:userId/notification-preferences', async (request, reply) => {
    const { userId } = request.params
    const preferences = request.body

    try {
      // Store preferences in Redis
      await fastify.redis.setex(
        `user_preferences:${userId}`,
        90 * 24 * 60 * 60, // 90 days TTL
        JSON.stringify(preferences),
      )

      return { success: true, preferences }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get user notification preferences
  fastify.get<{
    Params: { userId: string }
  }>('/users/:userId/notification-preferences', async (request, reply) => {
    const { userId } = request.params

    try {
      const data = await fastify.redis.get(`user_preferences:${userId}`)
      const preferences = data ? JSON.parse(data) : getDefaultPreferences()

      return { success: true, preferences }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Update user activity pattern
  fastify.put<{
    Params: { userId: string }
    Body: UserActivityPattern
  }>('/users/:userId/activity-pattern', async (request, reply) => {
    const { userId } = request.params
    const activityPattern = request.body

    try {
      await fastify.redis.setex(
        `activity_pattern:${userId}`,
        90 * 24 * 60 * 60, // 90 days TTL
        JSON.stringify(activityPattern),
      )

      return { success: true, activityPattern }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Register device token for push notifications
  fastify.post<{
    Body: {
      userId: string
      deviceToken: string
      platform: 'ios' | 'android' | 'web'
    }
  }>('/notifications/register-device', async (request, reply) => {
    const { userId, deviceToken, platform } = request.body

    try {
      // Store device token
      await fastify.redis.sadd(`device_tokens:${userId}`, deviceToken)

      // Store platform info
      await fastify.redis.setex(
        `device_platform:${deviceToken}`,
        365 * 24 * 60 * 60, // 1 year TTL
        platform,
      )

      return { success: true }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Unregister device token
  fastify.delete<{
    Body: {
      userId: string
      deviceToken: string
    }
  }>('/notifications/unregister-device', async (request, reply) => {
    const { userId, deviceToken } = request.body

    try {
      await fastify.redis.srem(`device_tokens:${userId}`, deviceToken)
      await fastify.redis.del(`device_platform:${deviceToken}`)

      return { success: true }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get notification analytics for a user
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      days?: number
    }
  }>('/users/:userId/notification-analytics', async (request, reply) => {
    const { userId } = request.params
    const { days = 30 } = request.query

    try {
      const analytics = await getNotificationAnalytics(fastify.redis, userId, days)
      return { success: true, analytics }
    } catch (error) {
      reply.code(400)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Process scheduled notifications (internal endpoint)
  fastify.post('/notifications/process-scheduled', async (request, reply) => {
    try {
      await notificationService.processScheduledNotifications()
      return { success: true }
    } catch (error) {
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

function getDefaultPreferences(): NotificationPreferences {
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

async function getNotificationAnalytics(redis: any, userId: string, days: number): Promise<any> {
  const analytics = {
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    byType: {} as Record<string, any>,
    byHour: {} as Record<number, number>,
  }

  // Get engagement data from time series
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateKey = date.toISOString().split('T')[0]
    const timeSeriesKey = `engagement_ts:${dateKey}`
    const dayData = await redis.lrange(timeSeriesKey, 0, -1)

    for (const item of dayData) {
      try {
        const metrics = JSON.parse(item)
        if (metrics.userId === userId) {
          analytics.totalSent += 1
          if (metrics.delivered) analytics.totalDelivered += 1
          if (metrics.opened) analytics.totalOpened += 1
          if (metrics.clicked) analytics.totalClicked += 1

          // Track by hour
          const hour = new Date(metrics.deliveryTime).getHours()
          analytics.byHour[hour] = (analytics.byHour[hour] || 0) + 1
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }
  }

  // Calculate rates
  if (analytics.totalSent > 0) {
    analytics.deliveryRate = analytics.totalDelivered / analytics.totalSent
    analytics.openRate = analytics.totalOpened / analytics.totalSent
    analytics.clickRate = analytics.totalClicked / analytics.totalSent
  }

  return analytics
}
