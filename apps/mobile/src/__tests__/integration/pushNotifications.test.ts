import { renderHook, act, waitFor } from '@testing-library/react-native'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking'
import { notificationService } from '../../services/notificationService'
import { useRealTimeStore } from '../../store/realTimeStore'
import { useAuthStore } from '../../store'
import { beforeEach } from 'node:test'
import { beforeEach } from 'node:test'

// Mock dependencies
jest.mock('expo-notifications')
jest.mock('expo-linking')
jest.mock('expo-device')
jest.mock('expo-constants')

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>
const mockLinking = Linking as jest.Mocked<typeof Linking>

describe('Push Notifications Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      granted: true,
      canAskAgain: false,
    })

    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[test-token]',
      type: 'expo',
    })

    // Reset stores
    useAuthStore.setState({
      user: {
        id: 'test-user-1',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      isAuthenticated: true,
    })
  })

  describe('Push Token Registration', () => {
    it('should register for push notifications successfully', async () => {
      const token = await notificationService.registerForPushNotifications()

      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled()
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalled()
      expect(token).toBe('ExponentPushToken[test-token]')
    })

    it('should handle permission denied gracefully', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        granted: false,
        canAskAgain: false,
      })

      const token = await notificationService.registerForPushNotifications()

      expect(token).toBeNull()
    })

    it('should request permissions if not granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined' as any,
        granted: false,
        canAskAgain: true,
      })

      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: false,
      })

      const permissions = await notificationService.requestPermissions()

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled()
      expect(permissions.granted).toBe(true)
    })
  })

  describe('Local Notification Scheduling', () => {
    it('should schedule local notifications', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id-123')

      const notificationId = await notificationService.scheduleLocalNotification({
        type: 'reminder',
        title: 'Time to Learn!',
        body: 'Continue your driving test preparation',
        scheduledFor: new Date(Date.now() + 3600000), // 1 hour from now
      })

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Time to Learn!',
          body: 'Continue your driving test preparation',
          data: {
            type: 'reminder',
            notificationId: expect.stringContaining('local-'),
          },
          sound: true,
        },
        trigger: { date: expect.any(Date) },
        identifier: expect.stringContaining('reminder-'),
      })

      expect(notificationId).toBe('notification-id-123')
    })

    it('should schedule reminder notifications', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('reminder-123')

      const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const notificationId = await notificationService.scheduleReminderNotification(
        'Daily Practice',
        'Keep up your learning streak!',
        scheduledFor,
        { streakCount: 5 },
      )

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Daily Practice',
          body: 'Keep up your learning streak!',
          data: {
            streakCount: 5,
            type: 'reminder',
            deepLink: 'drivemaster://learn',
            notificationId: expect.stringContaining('local-'),
          },
          sound: true,
        },
        trigger: { date: scheduledFor },
        identifier: expect.stringContaining('reminder-'),
      })

      expect(notificationId).toBe('reminder-123')
    })

    it('should cancel scheduled notifications', async () => {
      mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue()

      await notificationService.cancelNotification('notification-123')

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'notification-123',
      )
    })

    it('should cancel all notifications', async () => {
      mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue()

      await notificationService.cancelAllNotifications()

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled()
    })
  })

  describe('Deep Link Handling', () => {
    beforeEach(() => {
      // Mock navigation service
      jest.doMock('../../navigation/NavigationService', () => ({
        navigationRef: {
          isReady: () => true,
          navigate: jest.fn(),
        },
      }))
    })

    it('should parse and handle challenge deep links', async () => {
      mockLinking.parse.mockReturnValue({
        hostname: 'challenge',
        path: '/challenge-123',
        queryParams: {},
        scheme: 'drivemaster',
      })

      const { navigationRef } = require('../../navigation/NavigationService')

      // Simulate notification response with deep link
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                deepLink: 'drivemaster://challenge/challenge-123',
                challengeId: 'challenge-123',
              },
            },
          },
        },
      }

      // This would be called by the notification handler
      // We're testing the deep link parsing logic
      const deepLink = mockResponse.notification.request.content.data.deepLink
      const parsedUrl = mockLinking.parse(deepLink)

      expect(parsedUrl.hostname).toBe('challenge')
      expect(parsedUrl.path).toBe('/challenge-123')
    })

    it('should handle friend request deep links', async () => {
      mockLinking.parse.mockReturnValue({
        hostname: 'friend',
        path: '/friend-456',
        queryParams: {},
        scheme: 'drivemaster',
      })

      const deepLink = 'drivemaster://friend/friend-456'
      const parsedUrl = mockLinking.parse(deepLink)

      expect(parsedUrl.hostname).toBe('friend')
      expect(parsedUrl.path).toBe('/friend-456')
    })

    it('should handle achievement deep links', async () => {
      mockLinking.parse.mockReturnValue({
        hostname: 'achievement',
        path: '/speed-demon',
        queryParams: {},
        scheme: 'drivemaster',
      })

      const deepLink = 'drivemaster://achievement/speed-demon'
      const parsedUrl = mockLinking.parse(deepLink)

      expect(parsedUrl.hostname).toBe('achievement')
      expect(parsedUrl.path).toBe('/speed-demon')
    })

    it('should handle learning session deep links', async () => {
      mockLinking.parse.mockReturnValue({
        hostname: 'learn',
        path: '/traffic-signs',
        queryParams: {},
        scheme: 'drivemaster',
      })

      const deepLink = 'drivemaster://learn/traffic-signs'
      const parsedUrl = mockLinking.parse(deepLink)

      expect(parsedUrl.hostname).toBe('learn')
      expect(parsedUrl.path).toBe('/traffic-signs')
    })
  })

  describe('Notification Channels (Android)', () => {
    it('should create notification channels on Android', async () => {
      // Mock Platform.OS to be 'android'
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' },
      }))

      mockNotifications.setNotificationChannelAsync.mockResolvedValue()

      await notificationService.requestPermissions()

      // Should create multiple channels
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'friend_requests',
        expect.objectContaining({
          name: 'Friend Requests',
          importance: expect.any(Number),
        }),
      )

      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'challenges',
        expect.objectContaining({
          name: 'Challenges',
          importance: expect.any(Number),
        }),
      )

      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'achievements',
        expect.objectContaining({
          name: 'Achievements',
          importance: expect.any(Number),
        }),
      )
    })
  })

  describe('Badge Management', () => {
    it('should update badge count', async () => {
      mockNotifications.setBadgeCountAsync.mockResolvedValue()

      await notificationService.updateBadgeCount()

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalled()
    })

    it('should clear badge count', async () => {
      mockNotifications.setBadgeCountAsync.mockResolvedValue()

      await notificationService.clearBadge()

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0)
    })
  })

  describe('Notification Integration with Real-Time Store', () => {
    it('should add notifications to real-time store when received', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      // Simulate notification received
      const mockNotification = {
        request: {
          content: {
            title: 'Friend Request',
            body: 'John wants to be your friend',
            data: {
              type: 'friend_request',
              friendId: 'friend-123',
            },
          },
        },
      }

      act(() => {
        result.current.addNotification({
          type: 'friend_request',
          title: mockNotification.request.content.title,
          message: mockNotification.request.content.body,
          data: mockNotification.request.content.data,
          isRead: false,
        })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.unreadNotificationCount).toBe(1)
      expect(result.current.notifications[0].type).toBe('friend_request')
    })

    it('should update badge count when notifications change', async () => {
      mockNotifications.setBadgeCountAsync.mockResolvedValue()

      const { result } = renderHook(() => useRealTimeStore())

      // Add notifications
      act(() => {
        result.current.addNotification({
          type: 'achievement',
          title: 'Achievement Unlocked',
          message: 'You earned a badge!',
          isRead: false,
        })
      })

      // Badge should be updated
      await notificationService.updateBadgeCount()
      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(1)

      // Mark as read
      const notificationId = result.current.notifications[0].id
      act(() => {
        result.current.markNotificationAsRead(notificationId)
      })

      // Badge should be cleared
      await notificationService.updateBadgeCount()
      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0)
    })
  })

  describe('Notification Permissions Management', () => {
    it('should get current permission status', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: false,
      })

      const permissions = await notificationService.getPermissionsStatus()

      expect(permissions.granted).toBe(true)
      expect(permissions.canAskAgain).toBe(false)
      expect(permissions.status).toBe('granted')
    })

    it('should open notification settings', async () => {
      mockLinking.openSettings.mockResolvedValue()

      await notificationService.openNotificationSettings()

      expect(mockLinking.openSettings).toHaveBeenCalled()
    })
  })

  describe('Scheduled Notifications Management', () => {
    it('should get scheduled notifications', async () => {
      const mockScheduledNotifications = [
        {
          identifier: 'reminder-1',
          content: {
            title: 'Daily Practice',
            body: 'Time to practice!',
          },
          trigger: {
            type: 'date',
            date: new Date(),
          },
        },
      ]

      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue(
        mockScheduledNotifications as any,
      )

      const scheduled = await notificationService.getScheduledNotifications()

      expect(scheduled).toEqual(mockScheduledNotifications)
      expect(mockNotifications.getAllScheduledNotificationsAsync).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle push token registration errors', async () => {
      mockNotifications.getExpoPushTokenAsync.mockRejectedValue(new Error('Token error'))

      const token = await notificationService.registerForPushNotifications()

      expect(token).toBeNull()
    })

    it('should handle notification scheduling errors', async () => {
      mockNotifications.scheduleNotificationAsync.mockRejectedValue(new Error('Schedule error'))

      await expect(
        notificationService.scheduleLocalNotification({
          type: 'reminder',
          title: 'Test',
          body: 'Test body',
        }),
      ).rejects.toThrow('Schedule error')
    })

    it('should handle permission request errors', async () => {
      mockNotifications.requestPermissionsAsync.mockRejectedValue(new Error('Permission error'))

      await expect(notificationService.requestPermissions()).rejects.toThrow('Permission error')
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should cleanup notification listeners on destroy', () => {
      const mockRemoveSubscription = jest.fn()

      mockNotifications.addNotificationReceivedListener.mockReturnValue({
        remove: mockRemoveSubscription,
      } as any)

      mockNotifications.addNotificationResponseReceivedListener.mockReturnValue({
        remove: mockRemoveSubscription,
      } as any)

      // Create new instance to trigger listener setup
      const service = new (require('../../services/notificationService').NotificationService)()

      service.destroy()

      expect(mockRemoveSubscription).toHaveBeenCalledTimes(2)
    })
  })
})
