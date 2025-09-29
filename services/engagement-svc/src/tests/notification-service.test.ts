import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Redis } from 'ioredis'
import { NotificationService } from '../services/notification-service.js'
import {
  NotificationType,
  NotificationPriority,
  NotificationPreferences,
  UserActivityPattern,
} from '../types/notification.js'

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

describe('NotificationService', () => {
  let notificationService: NotificationService
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    notificationService = new NotificationService(mockRedis)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('schedulePersonalizedNotification', () => {
    it('should schedule a notification with optimal timing', async () => {
      // Mock user preferences
      const mockPreferences: NotificationPreferences = {
        enablePushNotifications: true,
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        studyReminders: true,
        achievementNotifications: true,
        socialNotifications: true,
        streakReminders: true,
        quietHours: {
          enabled: false,
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

      const mockActivityPattern: UserActivityPattern = {
        userId: testUserId,
        peakHours: [9, 10, 19, 20],
        preferredDays: [1, 2, 3, 4, 5],
        averageSessionDuration: 15,
        lastActiveTime: new Date(),
        timezone: 'UTC',
        studyStreak: 5,
        totalSessions: 25,
      }

      // Mock Redis responses
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockPreferences)) // user preferences
        .mockResolvedValueOnce(JSON.stringify(mockActivityPattern)) // activity pattern
        .mockResolvedValueOnce(null) // personalization profile (new user)

      mockRedis.lrange = vi.fn().mockResolvedValue([]) // engagement history
      mockRedis.hgetall = vi.fn().mockResolvedValue({}) // hourly engagement data

      const schedule = await notificationService.schedulePersonalizedNotification(
        testUserId,
        NotificationType.STUDY_REMINDER,
      )

      expect(schedule).toBeDefined()
      expect(schedule.userId).toBe(testUserId)
      expect(schedule.status).toBe('pending')
      expect(schedule.scheduledFor).toBeInstanceOf(Date)
      expect(mockRedis.setex).toHaveBeenCalled()
    })

    it('should respect user notification preferences', async () => {
      const mockPreferences: NotificationPreferences = {
        enablePushNotifications: false, // Disabled
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        studyReminders: false, // Disabled
        achievementNotifications: true,
        socialNotifications: true,
        streakReminders: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        frequency: {
          studyReminders: 'never',
          achievementNotifications: 'immediate',
          socialNotifications: 'hourly',
        },
      }

      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(mockPreferences))

      await expect(
        notificationService.schedulePersonalizedNotification(
          testUserId,
          NotificationType.STUDY_REMINDER,
        ),
      ).rejects.toThrow('Notifications disabled for type: study_reminder')
    })

    it('should handle quiet hours correctly', async () => {
      const mockPreferences: NotificationPreferences = {
        enablePushNotifications: true,
        enableEmailNotifications: false,
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

      const mockActivityPattern: UserActivityPattern = {
        userId: testUserId,
        peakHours: [23], // During quiet hours
        preferredDays: [1, 2, 3, 4, 5],
        averageSessionDuration: 15,
        lastActiveTime: new Date(),
        timezone: 'UTC',
        studyStreak: 5,
        totalSessions: 25,
      }

      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockPreferences))
        .mockResolvedValueOnce(JSON.stringify(mockActivityPattern))
        .mockResolvedValueOnce(null) // personalization profile
        .mockResolvedValueOnce('[]') // engagement history

      const schedule = await notificationService.schedulePersonalizedNotification(
        testUserId,
        NotificationType.STUDY_REMINDER,
      )

      // Should be scheduled after quiet hours (8 AM)
      expect(schedule.scheduledFor.getHours()).toBeGreaterThanOrEqual(8)
    })
  })

  describe('trackEngagementMetrics', () => {
    it('should store engagement metrics and update user profile', async () => {
      const notificationId = 'test-notification-123'
      const engagementMetrics = {
        userId: testUserId,
        delivered: true,
        opened: true,
        clicked: false,
        actionTaken: false,
        deliveryTime: new Date(),
        platform: 'push' as const,
      }

      // Mock existing personalization profile
      const mockProfile = {
        userId: testUserId,
        totalNotifications: 10,
        totalEngagements: 5,
        averageEngagement: 0.5,
        typeEngagement: {},
        preferredHours: {},
        lastUpdated: new Date(),
      }

      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(mockProfile))

      await notificationService.trackEngagementMetrics(notificationId, engagementMetrics)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('engagement:'),
        expect.any(Number),
        expect.any(String),
      )

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('engagement_ts:'),
        expect.any(String),
      )
    })

    it('should update timing preferences based on engagement', async () => {
      const deliveryTime = new Date()
      deliveryTime.setHours(10) // 10 AM

      const engagementMetrics = {
        userId: testUserId,
        delivered: true,
        opened: true,
        clicked: true,
        actionTaken: true,
        deliveryTime,
        platform: 'push' as const,
      }

      const mockProfile = {
        userId: testUserId,
        totalNotifications: 5,
        totalEngagements: 2,
        averageEngagement: 0.4,
        typeEngagement: {},
        preferredHours: { 10: 2 }, // Already has some data for 10 AM
        lastUpdated: new Date(),
      }

      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify(mockProfile))

      await notificationService.trackEngagementMetrics('test-notification', engagementMetrics)

      // Should update the profile with increased preference for 10 AM
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `personalization_profile:${testUserId}`,
        expect.any(Number),
        expect.stringContaining('"10":3'), // Should increment from 2 to 3
      )
    })
  })

  describe('optimizeDeliveryTiming', () => {
    it('should return optimal timing based on user activity pattern', async () => {
      const mockActivityPattern: UserActivityPattern = {
        userId: testUserId,
        peakHours: [9, 10, 19, 20],
        preferredDays: [1, 2, 3, 4, 5],
        averageSessionDuration: 15,
        lastActiveTime: new Date(),
        timezone: 'UTC',
        studyStreak: 5,
        totalSessions: 25,
      }

      const mockPreferences: NotificationPreferences = {
        enablePushNotifications: true,
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        studyReminders: true,
        achievementNotifications: true,
        socialNotifications: true,
        streakReminders: true,
        quietHours: {
          enabled: false,
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

      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockPreferences))
        .mockResolvedValueOnce('[]') // engagement history

      const optimalTiming = await notificationService.optimizeDeliveryTiming(
        testUserId,
        mockActivityPattern,
      )

      expect(optimalTiming).toBeDefined()
      expect(optimalTiming.recommendedTime).toBeInstanceOf(Date)
      expect(optimalTiming.confidence).toBeGreaterThan(0)
      expect(optimalTiming.confidence).toBeLessThanOrEqual(1)
      expect(optimalTiming.reasoning).toBeTruthy()
      expect(Array.isArray(optimalTiming.alternativeTimes)).toBe(true)
    })

    it('should have higher confidence with more engagement data', async () => {
      const mockActivityPattern: UserActivityPattern = {
        userId: testUserId,
        peakHours: [9, 10, 19, 20],
        preferredDays: [1, 2, 3, 4, 5],
        averageSessionDuration: 15,
        lastActiveTime: new Date(),
        timezone: 'UTC',
        studyStreak: 5,
        totalSessions: 100, // More sessions
      }

      const mockPreferences: NotificationPreferences = {
        enablePushNotifications: true,
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        studyReminders: true,
        achievementNotifications: true,
        socialNotifications: true,
        streakReminders: true,
        quietHours: {
          enabled: false,
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

      // Mock extensive engagement history
      const mockEngagementHistory = Array.from({ length: 60 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        hour: 10,
        dayOfWeek: 1,
        engaged: true,
      }))

      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockPreferences))
        .mockResolvedValueOnce('[]') // timing history (will be mocked in lrange)

      mockRedis.lrange = vi
        .fn()
        .mockResolvedValue(mockEngagementHistory.map((h) => JSON.stringify(h)))

      const optimalTiming = await notificationService.optimizeDeliveryTiming(
        testUserId,
        mockActivityPattern,
      )

      expect(optimalTiming.confidence).toBeGreaterThan(0.7) // Should have high confidence
    })
  })

  describe('processScheduledNotifications', () => {
    it('should process pending notifications', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        userId: testUserId,
        notificationId: 'notification-123',
        scheduledFor: new Date(Date.now() - 1000), // 1 second ago
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockNotification = {
        userId: testUserId,
        type: NotificationType.STUDY_REMINDER,
        priority: NotificationPriority.NORMAL,
        content: {
          title: 'Test Notification',
          body: 'This is a test notification',
        },
        scheduledFor: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      mockRedis.zrangebyscore = vi.fn().mockResolvedValue(['schedule-123'])
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockSchedule))
        .mockResolvedValueOnce(JSON.stringify(mockNotification))

      mockRedis.smembers = vi.fn().mockResolvedValue(['device-token-123'])

      await notificationService.processScheduledNotifications()

      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'scheduled_notifications',
        0,
        expect.any(Number),
      )
    })

    it('should handle expired notifications', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        userId: testUserId,
        notificationId: 'notification-123',
        scheduledFor: new Date(Date.now() - 1000),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const expiredNotification = {
        userId: testUserId,
        type: NotificationType.STUDY_REMINDER,
        priority: NotificationPriority.NORMAL,
        content: {
          title: 'Expired Notification',
          body: 'This notification has expired',
        },
        scheduledFor: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      }

      mockRedis.zrangebyscore = vi.fn().mockResolvedValue(['schedule-123'])
      mockRedis.get = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify(mockSchedule))
        .mockResolvedValueOnce(JSON.stringify(expiredNotification))

      await notificationService.processScheduledNotifications()

      // Should mark as cancelled instead of delivering
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'schedule:schedule-123',
        expect.any(Number),
        expect.stringContaining('"status":"cancelled"'),
      )
    })
  })

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get = vi.fn().mockRejectedValue(new Error('Redis connection failed'))

      await expect(
        notificationService.schedulePersonalizedNotification(
          testUserId,
          NotificationType.STUDY_REMINDER,
        ),
      ).rejects.toThrow('Redis connection failed')
    })

    it('should handle invalid notification types', async () => {
      await expect(
        notificationService.schedulePersonalizedNotification(
          testUserId,
          'invalid_type' as NotificationType,
        ),
      ).rejects.toThrow()
    })
  })

  describe('performance', () => {
    it('should handle high volume of notifications efficiently', async () => {
      const startTime = Date.now()
      const promises = []

      // Mock successful responses
      mockRedis.get = vi.fn().mockResolvedValue(
        JSON.stringify({
          enablePushNotifications: true,
          studyReminders: true,
          quietHours: { enabled: false },
        }),
      )

      // Schedule 100 notifications concurrently
      for (let i = 0; i < 100; i++) {
        promises.push(
          notificationService.schedulePersonalizedNotification(
            `user-${i}`,
            NotificationType.STUDY_REMINDER,
          ),
        )
      }

      await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds
    })
  })
})
