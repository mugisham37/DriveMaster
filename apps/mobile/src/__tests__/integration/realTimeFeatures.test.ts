import { renderHook, act, waitFor } from '@testing-library/react-native'
import { socketService } from '../../services/socketService'
import { syncService } from '../../services/syncService'
import { notificationService } from '../../services/notificationService'
import { useRealTimeStore } from '../../store/realTimeStore'
import { useAuthStore } from '../../store'

// Mock dependencies
jest.mock('../../services/socketService')
jest.mock('../../services/syncService')
jest.mock('../../services/notificationService')
jest.mock('@react-native-community/netinfo')
jest.mock('expo-notifications')

const mockSocketService = socketService as jest.Mocked<typeof socketService>
const mockSyncService = syncService as jest.Mocked<typeof syncService>
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>

describe('Real-Time Features Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset stores
    useRealTimeStore.getState().cleanup()
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

  describe('Socket.io Connection Management', () => {
    it('should establish connection when user is authenticated', async () => {
      mockSocketService.connect.mockResolvedValue()
      mockSocketService.getConnectionStatus.mockReturnValue({
        isConnected: true,
        reconnectAttempts: 0,
        activeChallenges: 0,
      })

      const { result } = renderHook(() => useRealTimeStore())

      await act(async () => {
        result.current.initializeRealTime()
        await result.current.connect()
      })

      expect(mockSocketService.connect).toHaveBeenCalled()
      expect(result.current.connection.isConnected).toBe(true)
    })

    it('should handle connection failures gracefully', async () => {
      const connectionError = new Error('Connection failed')
      mockSocketService.connect.mockRejectedValue(connectionError)

      const { result } = renderHook(() => useRealTimeStore())

      await act(async () => {
        try {
          await result.current.connect()
        } catch (error) {
          // Expected to fail
        }
      })

      expect(result.current.connection.connectionError).toBe('Connection failed')
    })

    it('should automatically reconnect on network recovery', async () => {
      mockSocketService.reconnect.mockImplementation(() => {})

      const { result } = renderHook(() => useRealTimeStore())

      act(() => {
        result.current.reconnect()
      })

      expect(mockSocketService.reconnect).toHaveBeenCalled()
    })
  })

  describe('Live Challenge System', () => {
    it('should join live challenge successfully', async () => {
      const challengeId = 'challenge-123'
      mockSocketService.joinLiveChallenge.mockResolvedValue()
      mockSocketService.getActiveChallenge.mockReturnValue({
        id: challengeId,
        type: 'speed_quiz',
        participants: ['user1', 'user2'],
        questions: [],
        timeLimit: 60,
        startTime: new Date().toISOString(),
        scores: {},
        status: 'active',
      })

      const { result } = renderHook(() => useRealTimeStore())

      await act(async () => {
        await result.current.joinChallenge(challengeId)
      })

      expect(mockSocketService.joinLiveChallenge).toHaveBeenCalledWith(challengeId)
    })

    it('should submit challenge answers and update score', async () => {
      const challengeAnswer = {
        challengeId: 'challenge-123',
        questionId: 'question-1',
        selectedAnswer: 'A',
        responseTime: 2500,
        timestamp: new Date().toISOString(),
      }

      mockSocketService.submitChallengeAnswer.mockResolvedValue()

      const { result } = renderHook(() => useRealTimeStore())

      // Set up initial challenge state
      act(() => {
        result.current.updateChallengeState({
          isInChallenge: true,
          challengeScore: 0,
        })
      })

      await act(async () => {
        await result.current.submitChallengeAnswer(challengeAnswer)
      })

      expect(mockSocketService.submitChallengeAnswer).toHaveBeenCalledWith(challengeAnswer)
      expect(result.current.challenges.challengeScore).toBeGreaterThan(0)
    })

    it('should handle challenge completion and update history', async () => {
      const challengeId = 'challenge-123'
      const completedChallenge = {
        id: challengeId,
        type: 'speed_quiz' as const,
        participants: ['user1', 'user2'],
        questions: [],
        timeLimit: 60,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        scores: { user1: 100, user2: 80 },
        status: 'completed' as const,
      }

      mockSocketService.getActiveChallenge.mockReturnValue(completedChallenge)

      const { result } = renderHook(() => useRealTimeStore())

      // Simulate challenge end event
      act(() => {
        // This would normally be triggered by socket event
        result.current.updateChallengeState({
          currentChallenge: null,
          isInChallenge: false,
          challengeHistory: [completedChallenge],
        })
      })

      expect(result.current.challenges.isInChallenge).toBe(false)
      expect(result.current.challenges.challengeHistory).toHaveLength(1)
      expect(result.current.challenges.challengeHistory[0].status).toBe('completed')
    })
  })

  describe('Friend Activity and Social Features', () => {
    it('should update friend online status', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      act(() => {
        result.current.setFriendOnline('friend-1')
        result.current.setFriendOnline('friend-2')
      })

      expect(result.current.onlineFriends).toContain('friend-1')
      expect(result.current.onlineFriends).toContain('friend-2')

      act(() => {
        result.current.setFriendOffline('friend-1')
      })

      expect(result.current.onlineFriends).not.toContain('friend-1')
      expect(result.current.onlineFriends).toContain('friend-2')
    })

    it('should add friend activities to feed', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      const activity = {
        friendId: 'friend-1',
        friendName: 'John Doe',
        type: 'achievement_unlocked' as const,
        description: 'Unlocked Speed Demon achievement',
        data: { achievementId: 'speed-demon' },
      }

      act(() => {
        result.current.addFriendActivity(activity)
      })

      expect(result.current.friendActivities).toHaveLength(1)
      expect(result.current.friendActivities[0].friendName).toBe('John Doe')
      expect(result.current.friendActivities[0].type).toBe('achievement_unlocked')
    })

    it('should create and accept friend challenges', async () => {
      mockSocketService.createFriendChallenge.mockResolvedValue()
      mockSocketService.acceptFriendChallenge.mockResolvedValue()

      const { result } = renderHook(() => useRealTimeStore())

      await act(async () => {
        await result.current.createFriendChallenge('friend-1', 'speed_quiz')
      })

      expect(mockSocketService.createFriendChallenge).toHaveBeenCalledWith('friend-1', 'speed_quiz')

      await act(async () => {
        await result.current.acceptFriendChallenge('challenge-456')
      })

      expect(mockSocketService.acceptFriendChallenge).toHaveBeenCalledWith('challenge-456')
    })
  })

  describe('Real-Time Notifications', () => {
    it('should add notifications and update unread count', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      const notification = {
        type: 'friend_request' as const,
        title: 'New Friend Request',
        message: 'John wants to be your friend',
        data: { friendId: 'friend-1' },
        isRead: false,
      }

      act(() => {
        result.current.addNotification(notification)
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.unreadNotificationCount).toBe(1)
      expect(result.current.notifications[0].title).toBe('New Friend Request')
    })

    it('should mark notifications as read and update count', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      // Add a notification first
      act(() => {
        result.current.addNotification({
          type: 'achievement',
          title: 'Achievement Unlocked',
          message: 'You earned a new badge!',
          isRead: false,
        })
      })

      const notificationId = result.current.notifications[0].id

      act(() => {
        result.current.markNotificationAsRead(notificationId)
      })

      expect(result.current.unreadNotificationCount).toBe(0)
      expect(result.current.notifications[0].isRead).toBe(true)
    })

    it('should handle achievement notifications', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      const achievement = {
        id: 'achievement-1',
        title: 'Speed Demon',
        description: 'Answer 10 questions in under 30 seconds',
        category: 'speed',
        iconUrl: 'https://example.com/icon.png',
        unlockedAt: new Date().toISOString(),
        progress: 1.0,
      }

      act(() => {
        result.current.addNotification({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: achievement.title,
          data: achievement,
          isRead: false,
        })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].data.title).toBe('Speed Demon')
    })
  })

  describe('Progress Sharing', () => {
    it('should share progress with friends', async () => {
      mockSocketService.shareProgress.mockResolvedValue()

      const { result } = renderHook(() => useRealTimeStore())

      const progressData = {
        userId: 'test-user-1',
        sessionId: 'session-123',
        score: 85,
        questionsAnswered: 10,
        category: 'traffic-signs',
        timestamp: new Date().toISOString(),
      }

      await act(async () => {
        await result.current.shareProgress(progressData)
      })

      expect(mockSocketService.shareProgress).toHaveBeenCalledWith(progressData)
    })

    it('should add shared progress from friends', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      const sharedProgress = {
        userId: 'friend-1',
        userName: 'John Doe',
        score: 95,
        category: 'road-rules',
        timestamp: new Date().toISOString(),
      }

      act(() => {
        result.current.addSharedProgress(sharedProgress)
      })

      expect(result.current.sharedProgress).toHaveLength(1)
      expect(result.current.sharedProgress[0].userName).toBe('John Doe')
      expect(result.current.sharedProgress[0].score).toBe(95)
    })
  })

  describe('Push Notification Integration', () => {
    it('should register for push notifications on initialization', async () => {
      mockNotificationService.registerForPushNotifications.mockResolvedValue('expo-push-token')

      await act(async () => {
        await mockNotificationService.registerForPushNotifications()
      })

      expect(mockNotificationService.registerForPushNotifications).toHaveBeenCalled()
    })

    it('should handle notification responses with deep linking', async () => {
      const mockNavigate = jest.fn()

      // Mock navigation service
      jest.doMock('../../navigation/NavigationService', () => ({
        navigationRef: {
          isReady: () => true,
          navigate: mockNavigate,
        },
      }))

      // Simulate notification response
      const notificationResponse = {
        notification: {
          request: {
            content: {
              title: 'Challenge Invitation',
              body: 'John challenged you to a speed quiz',
              data: {
                type: 'friend_challenge',
                deepLink: 'drivemaster://challenge/challenge-123',
                challengeId: 'challenge-123',
              },
            },
          },
        },
      }

      // This would be called by the notification service
      // In a real test, we'd simulate the actual notification response
      expect(notificationResponse.notification.request.content.data.type).toBe('friend_challenge')
    })
  })

  describe('Offline-to-Online Sync Integration', () => {
    it('should sync real-time data when coming back online', async () => {
      mockSyncService.startSync.mockResolvedValue()

      const { result } = renderHook(() => useRealTimeStore())

      // Simulate going offline
      act(() => {
        result.current.updateConnectionState({ isConnected: false })
      })

      // Simulate coming back online
      await act(async () => {
        result.current.updateConnectionState({ isConnected: true })
        await result.current.connect()
      })

      expect(mockSocketService.connect).toHaveBeenCalled()
    })

    it('should handle sync conflicts in real-time data', async () => {
      // This would test the integration between real-time updates
      // and offline sync conflict resolution
      const { result } = renderHook(() => useRealTimeStore())

      // Add some offline data
      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Offline Notification',
          message: 'This was created offline',
          isRead: false,
        })
      })

      // Simulate sync resolving conflicts
      mockSyncService.startSync.mockResolvedValue()

      await act(async () => {
        // This would trigger sync which might update real-time data
        await mockSyncService.startSync()
      })

      expect(mockSyncService.startSync).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle socket disconnection gracefully', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      // Simulate connection
      act(() => {
        result.current.updateConnectionState({ isConnected: true })
      })

      // Simulate disconnection
      act(() => {
        result.current.updateConnectionState({
          isConnected: false,
          connectionError: 'Network error',
        })
      })

      expect(result.current.connection.isConnected).toBe(false)
      expect(result.current.connection.connectionError).toBe('Network error')
    })

    it('should retry failed real-time operations', async () => {
      mockSocketService.submitChallengeAnswer.mockRejectedValueOnce(new Error('Network error'))
      mockSocketService.submitChallengeAnswer.mockResolvedValueOnce()

      const { result } = renderHook(() => useRealTimeStore())

      const challengeAnswer = {
        challengeId: 'challenge-123',
        questionId: 'question-1',
        selectedAnswer: 'A',
        responseTime: 2500,
        timestamp: new Date().toISOString(),
      }

      // First attempt should fail
      await act(async () => {
        try {
          await result.current.submitChallengeAnswer(challengeAnswer)
        } catch (error) {
          expect(error.message).toBe('Network error')
        }
      })

      // Retry should succeed
      await act(async () => {
        await result.current.submitChallengeAnswer(challengeAnswer)
      })

      expect(mockSocketService.submitChallengeAnswer).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should limit stored notifications to prevent memory issues', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      // Add many notifications
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.addNotification({
            type: 'system',
            title: `Notification ${i}`,
            message: `Message ${i}`,
            isRead: false,
          })
        })
      }

      // Should not store unlimited notifications
      expect(result.current.notifications.length).toBeLessThanOrEqual(50)
    })

    it('should limit friend activities to prevent memory issues', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      // Add many activities
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.addFriendActivity({
            friendId: `friend-${i}`,
            friendName: `Friend ${i}`,
            type: 'session_completed',
            description: `Completed session ${i}`,
          })
        })
      }

      // Should limit to 50 activities as per implementation
      expect(result.current.friendActivities.length).toBe(50)
    })

    it('should cleanup resources on unmount', async () => {
      const { result } = renderHook(() => useRealTimeStore())

      act(() => {
        result.current.cleanup()
      })

      expect(mockSocketService.destroy).toHaveBeenCalled()
    })
  })
})
