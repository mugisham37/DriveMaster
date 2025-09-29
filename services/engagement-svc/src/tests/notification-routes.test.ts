import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'
import { NotificationService } from '../services/notification-service.js'
import { notificationRoutes } from '../routes/notifications.js'
import { NotificationType, NotificationPriority } from '../types/notification.js'

// Mock Redis
const mockRedis = {
  setex: vi.fn(),
  get: vi.fn(),
  hgetall: vi.fn(),
  hset: vi.fn(),
  expire: vi.fn(),
  pipeline: vi.fn(() => ({
    setex: vi.fn(),
    zadd: vi.fn(),
    exec: vi.fn(),
  })),
  zrangebyscore: vi.fn(),
  zrem: vi.fn(),
  lpush: vi.fn(),
  ltrim: vi.fn(),
  lrange: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  del: vi.fn(),
  smembers: vi.fn(),
} as unknown as Redis

describe('Notification Routes', () => {
  let app: FastifyInstance
  const testUserId = 'test-user-123'

  beforeEach(async () => {
    vi.clearAllMocks()

    app = Fastify()

    // Register Redis and NotificationService as decorators
    app.decorate('redis', mockRedis)
    app.decorate('notificationService', new NotificationService(mockRedis))

    // Register routes
    await app.register(notificationRoutes)
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  describe('POST /notifications/schedule', () => {
    it('should schedule a notification successfully', async () => {
      // Mock successful responses
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            enablePushNotifications: true,
            studyReminders: true,
            quietHours: { enabled: false },
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            userId: testUserId,
            peakHours: [9, 10, 19, 20],
            preferredDays: [1, 2, 3, 4, 5],
            averageSessionDuration: 15,
            lastActiveTime: new Date(),
            timezone: 'UTC',
            studyStreak: 5,
            totalSessions: 25,
          }),
        )
        .mockResolvedValueOnce(null) // personalization profile
        .mockResolvedValueOnce('[]') // engagement history

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/schedule',
        payload: {
          userId: testUserId,
          type: NotificationType.STUDY_REMINDER,
          priority: NotificationPriority.NORMAL,
          metadata: {
            userName: 'Test User',
            streakCount: 5,
          },
        },
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.schedule).toBeDefined()
      expect(result.schedule.userId).toBe(testUserId)
    })

    it('should return error for disabled notifications', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(
        JSON.stringify({
          enablePushNotifications: false,
          studyReminders: false,
        }),
      )

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/schedule',
        payload: {
          userId: testUserId,
          type: NotificationType.STUDY_REMINDER,
        },
      })

      expect(response.statusCode).toBe(400)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Notifications disabled')
    })

    it('should handle invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/notifications/schedule',
        payload: {
          // Missing required fields
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /notifications/optimal-timing', () => {
    it('should return optimal timing for user', async () => {
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            enablePushNotifications: true,
            quietHours: { enabled: false },
          }),
        )
        .mockResolvedValueOnce('[]') // engagement history

      const activityPattern = {
        userId: testUserId,
        peakHours: [9, 10, 19, 20],
        preferredDays: [1, 2, 3, 4, 5],
        averageSessionDuration: 15,
        lastActiveTime: new Date(),
        timezone: 'UTC',
        studyStreak: 5,
        totalSessions: 25,
      }

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/optimal-timing',
        payload: {
          userId: testUserId,
          activityPattern,
        },
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.optimalTiming).toBeDefined()
      expect(result.optimalTiming.recommendedTime).toBeDefined()
      expect(result.optimalTiming.confidence).toBeGreaterThan(0)
    })
  })

  describe('POST /notifications/track-engagement', () => {
    it('should track engagement metrics successfully', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(
        JSON.stringify({
          userId: testUserId,
          totalNotifications: 10,
          totalEngagements: 5,
          averageEngagement: 0.5,
          typeEngagement: {},
          preferredHours: {},
          lastUpdated: new Date(),
        }),
      )

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/track-engagement',
        payload: {
          notificationId: 'test-notification-123',
          userId: testUserId,
          delivered: true,
          opened: true,
          clicked: false,
          actionTaken: false,
          platform: 'push',
        },
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)

      // Verify that engagement data was stored
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('engagement:'),
        expect.any(Number),
        expect.any(String),
      )
    })
  })

  describe('PUT /users/:userId/notification-preferences', () => {
    it('should update user notification preferences', async () => {
      const preferences = {
        enablePushNotifications: true,
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        studyReminders: true,
        achievementNotifications: true,
        socialNotifications: false,
        streakReminders: true,
        quietHours: {
          enabled: true,
          startTime: '23:00',
          endTime: '07:00',
          timezone: 'America/New_York',
        },
        frequency: {
          studyReminders: 'daily',
          achievementNotifications: 'immediate',
          socialNotifications: 'daily_digest',
        },
      }

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${testUserId}/notification-preferences`,
        payload: preferences,
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.preferences).toEqual(preferences)

      // Verify preferences were stored in Redis
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `user_preferences:${testUserId}`,
        expect.any(Number),
        JSON.stringify(preferences),
      )
    })
  })

  describe('GET /users/:userId/notification-preferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = {
        enablePushNotifications: true,
        studyReminders: true,
        quietHours: { enabled: false },
      }

      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(mockPreferences))

      const response = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}/notification-preferences`,
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.preferences).toEqual(mockPreferences)
    })

    it('should return default preferences for new user', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}/notification-preferences`,
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.preferences).toBeDefined()
      expect(result.preferences.enablePushNotifications).toBe(true)
    })
  })

  describe('POST /notifications/register-device', () => {
    it('should register device token successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/notifications/register-device',
        payload: {
          userId: testUserId,
          deviceToken: 'device-token-123',
          platform: 'ios',
        },
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)

      // Verify device token was stored
      expect(mockRedis.sadd).toHaveBeenCalledWith(`device_tokens:${testUserId}`, 'device-token-123')
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'device_platform:device-token-123',
        expect.any(Number),
        'ios',
      )
    })
  })

  describe('DELETE /notifications/unregister-device', () => {
    it('should unregister device token successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/notifications/unregister-device',
        payload: {
          userId: testUserId,
          deviceToken: 'device-token-123',
        },
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)

      // Verify device token was removed
      expect(mockRedis.srem).toHaveBeenCalledWith(`device_tokens:${testUserId}`, 'device-token-123')
      expect(mockRedis.del).toHaveBeenCalledWith('device_platform:device-token-123')
    })
  })

  describe('GET /users/:userId/notification-analytics', () => {
    it('should return notification analytics', async () => {
      // Mock engagement data
      const mockEngagementData = [
        JSON.stringify({
          userId: testUserId,
          delivered: true,
          opened: true,
          clicked: false,
          deliveryTime: new Date().toISOString(),
        }),
        JSON.stringify({
          userId: testUserId,
          delivered: true,
          opened: false,
          clicked: false,
          deliveryTime: new Date().toISOString(),
        }),
      ]

      mockRedis.lrange = vi.fn().mockResolvedValue(mockEngagementData)

      const response = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}/notification-analytics?days=7`,
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
      expect(result.analytics).toBeDefined()
      expect(result.analytics.totalSent).toBeGreaterThan(0)
      expect(result.analytics.deliveryRate).toBeGreaterThanOrEqual(0)
      expect(result.analytics.openRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('POST /notifications/process-scheduled', () => {
    it('should process scheduled notifications', async () => {
      // Mock scheduled notifications
      mockRedis.zrangebyscore = vi.fn().mockResolvedValue(['schedule-123'])
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            id: 'schedule-123',
            userId: testUserId,
            notificationId: 'notification-123',
            status: 'pending',
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            userId: testUserId,
            type: NotificationType.STUDY_REMINDER,
            content: { title: 'Test', body: 'Test notification' },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }),
        )

      mockRedis.smembers = vi.fn().mockResolvedValue(['device-token-123'])

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/process-scheduled',
      })

      expect(response.statusCode).toBe(200)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedis.get = vi.fn().mockRejectedValue(new Error('Redis connection failed'))

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/schedule',
        payload: {
          userId: testUserId,
          type: NotificationType.STUDY_REMINDER,
        },
      })

      expect(response.statusCode).toBe(400)
      const result = JSON.parse(response.payload)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Redis connection failed')
    })

    it('should validate request parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/notifications/track-engagement',
        payload: {
          // Missing required notificationId and userId
          delivered: true,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('performance and load testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockRedis.get = vi.fn().mockResolvedValue(
        JSON.stringify({
          enablePushNotifications: true,
          studyReminders: true,
        }),
      )

      const promises = []
      const startTime = Date.now()

      // Send 50 concurrent requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          app.inject({
            method: 'POST',
            url: '/notifications/track-engagement',
            payload: {
              notificationId: `notification-${i}`,
              userId: `user-${i}`,
              delivered: true,
              opened: Math.random() > 0.5,
              platform: 'push',
            },
          }),
        )
      }

      const responses = await Promise.all(promises)
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000) // 2 seconds
    })
  })
})
