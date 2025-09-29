import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '../services/notification-service.js'
import { NotificationType, NotificationPriority } from '../types/notification.js'

// Simple mock Redis that returns safe defaults
const createMockRedis = () => ({
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockImplementation((key: string) => {
    if (key.includes('user_preferences')) {
      return Promise.resolve(
        JSON.stringify({
          enablePushNotifications: true,
          studyReminders: true,
          quietHours: { enabled: false },
        }),
      )
    }
    if (key.includes('activity_pattern')) {
      return Promise.resolve(
        JSON.stringify({
          userId: 'test-user',
          peakHours: [9, 10, 19, 20],
          preferredDays: [1, 2, 3, 4, 5],
          averageSessionDuration: 15,
          lastActiveTime: new Date(),
          timezone: 'UTC',
          studyStreak: 5,
          totalSessions: 25,
        }),
      )
    }
    return Promise.resolve(null)
  }),
  hgetall: vi.fn().mockResolvedValue({}),
  hset: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  pipeline: vi.fn(() => ({
    setex: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
  zrangebyscore: vi.fn().mockResolvedValue([]),
  zrem: vi.fn().mockResolvedValue(1),
  lpush: vi.fn().mockResolvedValue(1),
  ltrim: vi.fn().mockResolvedValue('OK'),
  lrange: vi.fn().mockResolvedValue([]),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  del: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue(['device-token-123']),
})

describe('NotificationService - Basic Functionality', () => {
  let notificationService: NotificationService
  let mockRedis: any

  beforeEach(() => {
    mockRedis = createMockRedis()
    notificationService = new NotificationService(mockRedis as any)
  })

  it('should create notification service instance', () => {
    expect(notificationService).toBeDefined()
  })

  it('should schedule a basic notification', async () => {
    const schedule = await notificationService.schedulePersonalizedNotification(
      'test-user-123',
      NotificationType.STUDY_REMINDER,
    )

    expect(schedule).toBeDefined()
    expect(schedule.userId).toBe('test-user-123')
    expect(schedule.status).toBe('pending')
    expect(schedule.scheduledFor).toBeInstanceOf(Date)
    expect(mockRedis.setex).toHaveBeenCalled()
  })

  it('should track engagement metrics', async () => {
    await notificationService.trackEngagementMetrics('notification-123', {
      userId: 'test-user-123',
      delivered: true,
      opened: true,
      clicked: false,
      actionTaken: false,
      deliveryTime: new Date(),
      platform: 'push',
    })

    expect(mockRedis.setex).toHaveBeenCalled()
    expect(mockRedis.lpush).toHaveBeenCalled()
  })

  it('should calculate optimal timing', async () => {
    const activityPattern = {
      userId: 'test-user-123',
      peakHours: [9, 10, 19, 20],
      preferredDays: [1, 2, 3, 4, 5],
      averageSessionDuration: 15,
      lastActiveTime: new Date(),
      timezone: 'UTC',
      studyStreak: 5,
      totalSessions: 25,
    }

    const optimalTiming = await notificationService.optimizeDeliveryTiming(
      'test-user-123',
      activityPattern,
    )

    expect(optimalTiming).toBeDefined()
    expect(optimalTiming.recommendedTime).toBeInstanceOf(Date)
    expect(optimalTiming.confidence).toBeGreaterThan(0)
    expect(optimalTiming.confidence).toBeLessThanOrEqual(1)
  })

  it('should process scheduled notifications', async () => {
    // Mock a scheduled notification
    mockRedis.zrangebyscore.mockResolvedValue(['schedule-123'])
    mockRedis.get
      .mockResolvedValueOnce(
        JSON.stringify({
          id: 'schedule-123',
          userId: 'test-user-123',
          notificationId: 'notification-123',
          scheduledFor: new Date(Date.now() - 1000),
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          userId: 'test-user-123',
          type: NotificationType.STUDY_REMINDER,
          priority: NotificationPriority.NORMAL,
          content: {
            title: 'Test Notification',
            body: 'This is a test notification',
          },
          scheduledFor: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      )

    await notificationService.processScheduledNotifications()

    expect(mockRedis.zrangebyscore).toHaveBeenCalled()
  })
})
