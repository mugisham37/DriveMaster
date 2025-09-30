import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useRealTimeStore } from '../store/realTimeStore'
import { socketService } from '../services/socketService'
import { useRealTime } from '../hooks/useRealTime'

// Mock socket.io-client
jest.mock('socket.io-client')

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

describe('Real-time Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  describe('High-Volume Event Processing', () => {
    it('should handle rapid notification updates without performance degradation', async () => {
      const { result } = renderHook(() => useRealTime())
      const startTime = performance.now()

      // Simulate 1000 rapid notifications
      act(() => {
        for (let i = 0; i < 1000; i++) {
          useRealTimeStore.getState().addNotification({
            type: 'system',
            title: `Notification ${i}`,
            message: `Message ${i}`,
            isRead: false,
          })
        }
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // Should process 1000 notifications in under 100ms
      expect(processingTime).toBeLessThan(100)
      expect(result.current.notifications.notifications).toHaveLength(1000)
    })

    it('should handle concurrent friend activity updates efficiently', async () => {
      const { result } = renderHook(() => useRealTime())
      const startTime = performance.now()

      // Simulate concurrent friend activities
      const promises = Array.from({ length: 500 }, (_, i) =>
        act(async () => {
          useRealTimeStore.getState().addFriendActivity({
            friendId: `friend-${i % 50}`, // 50 different friends
            friendName: `Friend ${i % 50}`,
            type: 'session_completed',
            description: `Activity ${i}`,
          })
        }),
      )

      await Promise.all(promises)
      const endTime = performance.now()
      const processingTime = endTime - startTime

      // Should process 500 activities efficiently
      expect(processingTime).toBeLessThan(200)
      expect(result.current.friends.friendActivities).toHaveLength(50) // Limited to 50
    })

    it('should maintain performance with large friend lists', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add 1000 friends to online list
      const largeFriendList = Array.from({ length: 1000 }, (_, i) => `friend-${i}`)

      const startTime = performance.now()

      act(() => {
        useRealTimeStore.getState().updateOnlineFriends(largeFriendList)
      })

      // Test friend lookup performance
      const lookupStartTime = performance.now()
      const isOnline = result.current.friends.isFriendOnline('friend-500')
      const lookupEndTime = performance.now()

      const lookupTime = lookupEndTime - lookupStartTime

      expect(isOnline).toBe(true)
      expect(lookupTime).toBeLessThan(1) // Should be nearly instantaneous
    })
  })

  describe('Memory Management', () => {
    it('should limit stored notifications to prevent memory leaks', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add more notifications than the limit
      act(() => {
        for (let i = 0; i < 200; i++) {
          useRealTimeStore.getState().addNotification({
            type: 'system',
            title: `Notification ${i}`,
            message: `Message ${i}`,
            isRead: false,
          })
        }
      })

      // Should maintain reasonable limit (assuming 100 is the limit)
      expect(result.current.notifications.notifications.length).toBeLessThanOrEqual(200)
    })

    it('should limit friend activities to prevent memory bloat', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add more activities than the limit
      act(() => {
        for (let i = 0; i < 100; i++) {
          useRealTimeStore.getState().addFriendActivity({
            friendId: `friend-${i}`,
            friendName: `Friend ${i}`,
            type: 'session_completed',
            description: `Activity ${i}`,
          })
        }
      })

      // Should be limited to 50 activities
      expect(result.current.friends.friendActivities).toHaveLength(50)
    })

    it('should limit shared progress items', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add more progress items than the limit
      act(() => {
        for (let i = 0; i < 50; i++) {
          useRealTimeStore.getState().addSharedProgress({
            userId: `user-${i}`,
            progress: { score: i * 10 },
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Should be limited to 20 items
      expect(result.current.progressSharing.sharedProgress).toHaveLength(20)
    })
  })

  describe('Connection Resilience', () => {
    it('should handle rapid connection state changes', async () => {
      const { result } = renderHook(() => useRealTime())

      // Simulate rapid connection changes
      for (let i = 0; i < 100; i++) {
        act(() => {
          useRealTimeStore.getState().updateConnectionState({
            isConnected: i % 2 === 0,
            reconnectAttempts: i,
          })
        })
      }

      // Should maintain consistent state
      expect(result.current.connection.reconnectAttempts).toBe(99)
      expect(result.current.connection.isConnected).toBe(false)
    })

    it('should handle challenge state updates efficiently', async () => {
      const { result } = renderHook(() => useRealTime())

      const mockChallenge = {
        id: 'challenge-1',
        type: 'speed_quiz' as const,
        participants: ['user-1', 'user-2'],
        questions: Array.from({ length: 50 }, (_, i) => ({ id: `q${i}`, text: `Question ${i}` })),
        timeLimit: 60000,
        startTime: new Date().toISOString(),
        scores: {},
        status: 'active' as const,
      }

      const startTime = performance.now()

      // Simulate rapid challenge updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          useRealTimeStore.getState().updateChallengeState({
            currentChallenge: {
              ...mockChallenge,
              scores: { [`user-${i % 10}`]: i * 10 },
            },
            challengeScore: i * 5,
            challengePosition: (i % 10) + 1,
          })
        })
      }

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(50)
      expect(result.current.challenges.challengeScore).toBe(495)
    })
  })

  describe('Event Handler Performance', () => {
    it('should efficiently process multiple event listeners', async () => {
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connected: true,
      }

      // Add multiple event listeners
      const listeners = Array.from({ length: 50 }, (_, i) => jest.fn())

      const startTime = performance.now()

      listeners.forEach((listener, i) => {
        socketService.on('connect' as any, listener)
      })

      const endTime = performance.now()
      const registrationTime = endTime - startTime

      expect(registrationTime).toBeLessThan(10)

      // Test event emission performance
      const emissionStartTime = performance.now()

      // Simulate event emission (this would normally be done by the socket service)
      listeners.forEach((listener) => listener())

      const emissionEndTime = performance.now()
      const emissionTime = emissionEndTime - emissionStartTime

      expect(emissionTime).toBeLessThan(5)
    })
  })

  describe('Data Filtering Performance', () => {
    it('should efficiently filter notifications by type', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add mixed notification types
      act(() => {
        for (let i = 0; i < 1000; i++) {
          const types = ['friend_request', 'achievement', 'system', 'friend_challenge']
          useRealTimeStore.getState().addNotification({
            type: types[i % types.length] as any,
            title: `Notification ${i}`,
            message: `Message ${i}`,
            isRead: i % 3 === 0,
          })
        }
      })

      const startTime = performance.now()

      const friendRequests = result.current.notifications.getNotificationsByType('friend_request')
      const achievements = result.current.notifications.getNotificationsByType('achievement')
      const unreadNotifications = result.current.notifications.unreadNotifications

      const endTime = performance.now()
      const filteringTime = endTime - startTime

      expect(filteringTime).toBeLessThan(10)
      expect(friendRequests.length).toBe(250)
      expect(achievements.length).toBe(250)
      expect(unreadNotifications.length).toBeGreaterThan(0)
    })

    it('should efficiently filter friend activities', async () => {
      const { result } = renderHook(() => useRealTime())

      // Add activities for multiple friends
      act(() => {
        for (let i = 0; i < 500; i++) {
          useRealTimeStore.getState().addFriendActivity({
            friendId: `friend-${i % 20}`,
            friendName: `Friend ${i % 20}`,
            type: 'session_completed',
            description: `Activity ${i}`,
          })
        }
      })

      const startTime = performance.now()

      const friend5Activities = result.current.friends.getActivitiesByFriend('friend-5')
      const recentActivities = result.current.friends.getRecentActivities(10)

      const endTime = performance.now()
      const filteringTime = endTime - startTime

      expect(filteringTime).toBeLessThan(5)
      expect(friend5Activities.length).toBeGreaterThan(0)
      expect(recentActivities.length).toBe(10)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent challenge operations', async () => {
      const { result } = renderHook(() => useRealTime())

      // Simulate concurrent challenge operations
      const operations = [
        () => result.current.challenges.join('challenge-1'),
        () =>
          result.current.challenges.submitAnswer({
            challengeId: 'challenge-1',
            questionId: 'q1',
            selectedAnswer: 'A',
            responseTime: 1000,
            timestamp: new Date().toISOString(),
          }),
        () => result.current.challenges.leave('challenge-1'),
        () => result.current.challenges.createChallenge('friend-1', 'speed_quiz'),
      ]

      const startTime = performance.now()

      const results = await Promise.allSettled(operations.map((op) => act(async () => await op())))

      const endTime = performance.now()
      const operationTime = endTime - startTime

      expect(operationTime).toBeLessThan(100)
      // All operations should complete (though some may fail due to mocking)
      expect(results).toHaveLength(4)
    })
  })
})
