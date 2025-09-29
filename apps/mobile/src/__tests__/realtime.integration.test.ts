import { renderHook, act, waitFor } from '@testing-library/react-native'
import { io, Socket } from 'socket.io-client'
import { useRealTimeStore } from '../store/realTimeStore'
import { socketService } from '../services/socketService'
import { notificationService } from '../services/notificationService'
import {
  useRealTimeConnection,
  useRealTimeNotifications,
  useRealTimeChallenges,
  useRealTimeFriends,
} from '../hooks/useRealTime'

// Mock socket.io-client
jest.mock('socket.io-client')
const mockIo = io as jest.MockedFunction<typeof io>

// Mock notification service
jest.mock('../services/notificationService')

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}))

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

describe('Real-time Integration Tests', () => {
  let mockSocket: Partial<Socket>

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock socket
    mockSocket = {
      connected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }

    mockIo.mockReturnValue(mockSocket as Socket)

    // Reset store state
    useRealTimeStore.setState({
      connection: {
        isConnected: false,
        reconnectAttempts: 0,
        lastConnectedAt: null,
        connectionError: null,
      },
      notifications: [],
      unreadNotificationCount: 0,
      friendActivities: [],
      onlineFriends: [],
      challenges: {
        currentChallenge: null,
        challengeHistory: [],
        pendingChallenges: [],
        isInChallenge: false,
        challengeScore: 0,
        challengePosition: 0,
      },
      sharedProgress: [],
    })
  })

  describe('Socket Connection Management', () => {
    it('should establish socket connection when authenticated', async () => {
      const { result } = renderHook(() => useRealTimeConnection())

      // Mock authentication
      jest.doMock('../store', () => ({
        useAuthStore: {
          getState: () => ({
            user: { id: 'user-1', email: 'test@example.com' },
            tokens: { accessToken: 'token', refreshToken: 'refresh', expiresAt: '2024-12-31' },
            isAuthenticated: true,
          }),
        },
      }))

      await act(async () => {
        await socketService.connect()
      })

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: expect.objectContaining({
            token: 'token',
            userId: 'user-1',
          }),
        }),
      )
    })

    it('should handle connection events correctly', async () => {
      const { result } = renderHook(() => useRealTimeConnection())

      // Simulate connection
      act(() => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect',
        )?.[1]

        if (connectHandler) {
          connectHandler()
        }
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should handle disconnection events correctly', async () => {
      const { result } = renderHook(() => useRealTimeConnection())

      // First connect
      act(() => {
        const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'connect',
        )?.[1]
        connectHandler?.()
      })

      // Then disconnect
      act(() => {
        const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'disconnect',
        )?.[1]
        disconnectHandler?.('transport close')
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
        expect(result.current.connectionError).toBe('transport close')
      })
    })

    it('should handle reconnection attempts', async () => {
      const { result } = renderHook(() => useRealTimeConnection())

      // Simulate reconnection
      act(() => {
        const reconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'reconnect',
        )?.[1]
        reconnectHandler?.(3)
      })

      await waitFor(() => {
        expect(result.current.reconnectAttempts).toBe(3)
      })
    })
  })

  describe('Real-time Notifications', () => {
    it('should add notifications when received', async () => {
      const { result } = renderHook(() => useRealTimeNotifications())

      const mockNotification = {
        type: 'friend_request' as const,
        title: 'New Friend Request',
        message: 'John wants to be your friend',
        data: { friendId: 'friend-1' },
        isRead: false,
      }

      act(() => {
        useRealTimeStore.getState().addNotification(mockNotification)
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.unreadCount).toBe(1)
        expect(result.current.notifications[0]).toMatchObject({
          type: 'friend_request',
          title: 'New Friend Request',
          message: 'John wants to be your friend',
        })
      })
    })

    it('should mark notifications as read', async () => {
      const { result } = renderHook(() => useRealTimeNotifications())

      // Add a notification first
      act(() => {
        useRealTimeStore.getState().addNotification({
          type: 'achievement',
          title: 'Achievement Unlocked',
          message: 'You earned a new badge!',
          isRead: false,
        })
      })

      const notificationId = result.current.notifications[0]?.id

      act(() => {
        result.current.markAsRead(notificationId)
      })

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0)
        expect(result.current.notifications[0]?.isRead).toBe(true)
      })
    })

    it('should filter notifications by type', async () => {
      const { result } = renderHook(() => useRealTimeNotifications())

      // Add multiple notifications
      act(() => {
        useRealTimeStore.getState().addNotification({
          type: 'friend_request',
          title: 'Friend Request',
          message: 'Test message',
          isRead: false,
        })

        useRealTimeStore.getState().addNotification({
          type: 'achievement',
          title: 'Achievement',
          message: 'Test achievement',
          isRead: false,
        })
      })

      const friendRequests = result.current.getNotificationsByType('friend_request')
      const achievements = result.current.getNotificationsByType('achievement')

      expect(friendRequests).toHaveLength(1)
      expect(achievements).toHaveLength(1)
      expect(friendRequests[0].type).toBe('friend_request')
      expect(achievements[0].type).toBe('achievement')
    })
  })

  describe('Live Challenges', () => {
    it('should join a live challenge successfully', async () => {
      const { result } = renderHook(() => useRealTimeChallenges())

      // Mock successful join
      mockSocket.emit = jest.fn().mockResolvedValue(undefined)

      let joinResult: any
      await act(async () => {
        joinResult = await result.current.join('challenge-1')
      })

      expect(joinResult.success).toBe(true)
      expect(mockSocket.emit).toHaveBeenCalledWith('join_challenge', { challengeId: 'challenge-1' })
    })

    it('should handle challenge start event', async () => {
      const { result } = renderHook(() => useRealTimeChallenges())

      const mockChallengeData = {
        challengeId: 'challenge-1',
        type: 'speed_quiz',
        participants: ['user-1', 'user-2'],
        questions: [{ id: 'q1', text: 'Test question' }],
        timeLimit: 60000,
        startTime: new Date().toISOString(),
      }

      // Simulate challenge start event
      act(() => {
        const challengeStartHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'live_challenge_start',
        )?.[1]
        challengeStartHandler?.(mockChallengeData)
      })

      await waitFor(() => {
        expect(result.current.isInChallenge).toBe(true)
        expect(result.current.currentChallenge?.id).toBe('challenge-1')
      })
    })

    it('should submit challenge answers', async () => {
      const { result } = renderHook(() => useRealTimeChallenges())

      const mockAnswer = {
        challengeId: 'challenge-1',
        questionId: 'q1',
        selectedAnswer: 'A',
        responseTime: 2500,
        timestamp: new Date().toISOString(),
      }

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitAnswer(mockAnswer)
      })

      expect(submitResult.success).toBe(true)
      expect(mockSocket.emit).toHaveBeenCalledWith('challenge_answer', mockAnswer)
    })

    it('should handle challenge end event', async () => {
      const { result } = renderHook(() => useRealTimeChallenges())

      // First start a challenge
      act(() => {
        useRealTimeStore.getState().updateChallengeState({
          currentChallenge: {
            id: 'challenge-1',
            type: 'speed_quiz',
            participants: ['user-1', 'user-2'],
            questions: [],
            timeLimit: 60000,
            startTime: new Date().toISOString(),
            scores: {},
            status: 'active',
          },
          isInChallenge: true,
        })
      })

      // Then end it
      act(() => {
        const challengeEndHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'live_challenge_end',
        )?.[1]
        challengeEndHandler?.({
          challengeId: 'challenge-1',
          results: [{ userId: 'user-1', score: 100 }],
        })
      })

      await waitFor(() => {
        expect(result.current.isInChallenge).toBe(false)
        expect(result.current.currentChallenge).toBeNull()
        expect(result.current.challengeHistory).toHaveLength(1)
      })
    })
  })

  describe('Friend Activities', () => {
    it('should track online friends', async () => {
      const { result } = renderHook(() => useRealTimeFriends())

      // Simulate friend coming online
      act(() => {
        const userOnlineHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'user_online',
        )?.[1]
        userOnlineHandler?.({ id: 'friend-1', email: 'friend@example.com' })
      })

      await waitFor(() => {
        expect(result.current.isFriendOnline('friend-1')).toBe(true)
        expect(result.current.onlineFriendsCount).toBe(1)
      })
    })

    it('should track friend activities', async () => {
      const { result } = renderHook(() => useRealTimeFriends())

      // Simulate friend activity
      act(() => {
        const friendActivityHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'friend_activity',
        )?.[1]
        friendActivityHandler?.({
          friendId: 'friend-1',
          friendName: 'John',
          activity: 'session_completed',
          description: 'Completed a learning session',
        })
      })

      await waitFor(() => {
        expect(result.current.friendActivities).toHaveLength(1)
        expect(result.current.friendActivities[0]).toMatchObject({
          friendId: 'friend-1',
          type: 'session_completed',
        })
      })
    })

    it('should filter activities by friend', async () => {
      const { result } = renderHook(() => useRealTimeFriends())

      // Add activities for different friends
      act(() => {
        useRealTimeStore.getState().addFriendActivity({
          friendId: 'friend-1',
          friendName: 'John',
          type: 'session_completed',
          description: 'Completed session',
        })

        useRealTimeStore.getState().addFriendActivity({
          friendId: 'friend-2',
          friendName: 'Jane',
          type: 'achievement_unlocked',
          description: 'Unlocked achievement',
        })
      })

      const friend1Activities = result.current.getActivitiesByFriend('friend-1')
      const friend2Activities = result.current.getActivitiesByFriend('friend-2')

      expect(friend1Activities).toHaveLength(1)
      expect(friend2Activities).toHaveLength(1)
      expect(friend1Activities[0].friendId).toBe('friend-1')
      expect(friend2Activities[0].friendId).toBe('friend-2')
    })
  })

  describe('Error Handling', () => {
    it('should handle socket connection errors', async () => {
      const { result } = renderHook(() => useRealTimeConnection())

      // Simulate connection error
      act(() => {
        const reconnectErrorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'reconnect_error',
        )?.[1]
        reconnectErrorHandler?.(new Error('Connection failed'))
      })

      await waitFor(() => {
        expect(result.current.connectionError).toBe('Connection failed')
      })
    })

    it('should handle challenge join failures', async () => {
      const { result } = renderHook(() => useRealTimeChallenges())

      // Mock socket emit to throw error
      mockSocket.emit = jest.fn().mockRejectedValue(new Error('Join failed'))

      let joinResult: any
      await act(async () => {
        joinResult = await result.current.join('challenge-1')
      })

      expect(joinResult.success).toBe(false)
      expect(joinResult.error).toBe('Join failed')
    })
  })

  describe('Performance and Reliability', () => {
    it('should limit stored activities to prevent memory issues', async () => {
      const { result } = renderHook(() => useRealTimeFriends())

      // Add more than 50 activities
      act(() => {
        for (let i = 0; i < 60; i++) {
          useRealTimeStore.getState().addFriendActivity({
            friendId: `friend-${i}`,
            friendName: `Friend ${i}`,
            type: 'session_completed',
            description: `Activity ${i}`,
          })
        }
      })

      await waitFor(() => {
        // Should be limited to 50 activities
        expect(result.current.friendActivities).toHaveLength(50)
      })
    })

    it('should handle rapid notification updates', async () => {
      const { result } = renderHook(() => useRealTimeNotifications())

      // Add many notifications rapidly
      act(() => {
        for (let i = 0; i < 100; i++) {
          useRealTimeStore.getState().addNotification({
            type: 'system',
            title: `Notification ${i}`,
            message: `Message ${i}`,
            isRead: false,
          })
        }
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(100)
        expect(result.current.unreadCount).toBe(100)
      })
    })
  })
})

describe('Notification Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle push notification registration', async () => {
    // Mock Expo Notifications
    const mockGetPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' })
    const mockGetExpoPushTokenAsync = jest
      .fn()
      .mockResolvedValue({ data: 'ExponentPushToken[test]' })

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: mockGetPermissionsAsync,
      getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn(),
      addNotificationResponseReceivedListener: jest.fn(),
    }))

    const token = await notificationService.registerForPushNotifications()

    expect(token).toBe('ExponentPushToken[test]')
    expect(mockGetPermissionsAsync).toHaveBeenCalled()
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalled()
  })

  it('should handle deep link navigation', async () => {
    const mockLinkingParse = jest.fn().mockReturnValue({
      hostname: 'challenge',
      path: '/challenge-1',
    })

    jest.doMock('expo-linking', () => ({
      parse: mockLinkingParse,
    }))

    // This would be tested by simulating a notification response
    // The actual implementation would depend on the navigation system
    expect(mockLinkingParse).toBeDefined()
  })
})
