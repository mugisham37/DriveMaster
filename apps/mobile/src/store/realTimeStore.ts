import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { socketService, LiveChallenge, ChallengeAnswer } from '../services/socketService'
import { Friend, Achievement } from '../types'

// Real-time notification types
export interface RealTimeNotification {
  id: string
  type: 'friend_request' | 'friend_challenge' | 'achievement' | 'system' | 'progress_share'
  title: string
  message: string
  data?: any
  timestamp: string
  isRead: boolean
  actionRequired?: boolean
}

// Friend activity types
export interface FriendActivity {
  id: string
  friendId: string
  friendName: string
  type: 'session_completed' | 'achievement_unlocked' | 'streak_milestone' | 'challenge_completed'
  description: string
  timestamp: string
  data?: any
}

// Live challenge state
export interface ChallengeState {
  currentChallenge: LiveChallenge | null
  challengeHistory: LiveChallenge[]
  pendingChallenges: any[]
  isInChallenge: boolean
  challengeScore: number
  challengePosition: number
}

// Connection state
export interface ConnectionState {
  isConnected: boolean
  reconnectAttempts: number
  lastConnectedAt: string | null
  connectionError: string | null
}

interface RealTimeState {
  // Connection state
  connection: ConnectionState

  // Notifications
  notifications: RealTimeNotification[]
  unreadNotificationCount: number

  // Friend activities
  friendActivities: FriendActivity[]
  onlineFriends: string[]

  // Live challenges
  challenges: ChallengeState

  // Real-time progress sharing
  sharedProgress: any[]

  // Actions
  initializeRealTime: () => void
  cleanup: () => void

  // Connection actions
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => void
  updateConnectionState: (state: Partial<ConnectionState>) => void

  // Notification actions
  addNotification: (notification: Omit<RealTimeNotification, 'id' | 'timestamp'>) => void
  markNotificationAsRead: (notificationId: string) => void
  clearNotifications: () => void
  removeNotification: (notificationId: string) => void

  // Friend activity actions
  addFriendActivity: (activity: Omit<FriendActivity, 'id' | 'timestamp'>) => void
  updateOnlineFriends: (friendIds: string[]) => void
  setFriendOnline: (friendId: string) => void
  setFriendOffline: (friendId: string) => void

  // Challenge actions
  joinChallenge: (challengeId: string) => Promise<void>
  leaveChallenge: (challengeId: string) => Promise<void>
  submitChallengeAnswer: (answer: ChallengeAnswer) => Promise<void>
  createFriendChallenge: (friendId: string, challengeType: string) => Promise<void>
  acceptFriendChallenge: (challengeId: string) => Promise<void>
  updateChallengeState: (state: Partial<ChallengeState>) => void

  // Progress sharing actions
  shareProgress: (progressData: any) => Promise<void>
  addSharedProgress: (progress: any) => void
}

export const useRealTimeStore = create<RealTimeState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Initialize real-time functionality
      initializeRealTime: () => {
        console.log('Initializing real-time functionality')

        // Set up socket event listeners
        socketService.on('connect', () => {
          set({
            connection: {
              ...get().connection,
              isConnected: true,
              lastConnectedAt: new Date().toISOString(),
              connectionError: null,
              reconnectAttempts: 0,
            },
          })
        })

        socketService.on('disconnect', (reason) => {
          set({
            connection: {
              ...get().connection,
              isConnected: false,
              connectionError: reason,
            },
          })
        })

        socketService.on('reconnect', (attemptNumber) => {
          set({
            connection: {
              ...get().connection,
              isConnected: true,
              reconnectAttempts: attemptNumber,
              connectionError: null,
            },
          })
        })

        socketService.on('reconnect_error', (error) => {
          set({
            connection: {
              ...get().connection,
              connectionError: error.message,
              reconnectAttempts: get().connection.reconnectAttempts + 1,
            },
          })
        })

        // Friend events
        socketService.on('user_online', (user) => {
          get().setFriendOnline(user.id)
        })

        socketService.on('user_offline', (userId) => {
          get().setFriendOffline(userId)
        })

        socketService.on('friend_request', (friend) => {
          get().addNotification({
            type: 'friend_request',
            title: 'New Friend Request',
            message: `${friend.email} wants to be your friend`,
            data: friend,
            isRead: false,
            actionRequired: true,
          })
        })

        socketService.on('friend_accepted', (friend) => {
          get().addNotification({
            type: 'friend_request',
            title: 'Friend Request Accepted',
            message: `${friend.email} accepted your friend request`,
            data: friend,
            isRead: false,
          })
        })

        socketService.on('friend_activity', (data) => {
          get().addFriendActivity({
            friendId: data.friendId,
            friendName: data.friendName || 'Friend',
            type: data.activity,
            description: data.description || 'Completed an activity',
            data: data,
          })
        })

        socketService.on('friend_challenge', (data) => {
          get().addNotification({
            type: 'friend_challenge',
            title: 'Challenge Received',
            message: `${data.fromUser.email} challenged you to a ${data.challenge.type}`,
            data: data,
            isRead: false,
            actionRequired: true,
          })
        })

        // Challenge events
        socketService.on('live_challenge_start', (data) => {
          const challenge = socketService.getActiveChallenge(data.challengeId)
          if (challenge) {
            set({
              challenges: {
                ...get().challenges,
                currentChallenge: challenge,
                isInChallenge: true,
                challengeScore: 0,
                challengePosition: 0,
              },
            })
          }
        })

        socketService.on('live_challenge_answer', (data) => {
          const { challenges } = get()
          if (challenges.currentChallenge?.id === data.challengeId) {
            // Update challenge scores and positions
            const challenge = socketService.getActiveChallenge(data.challengeId)
            if (challenge) {
              const sortedScores = Object.entries(challenge.scores).sort(
                ([, a], [, b]) => (b as number) - (a as number),
              )

              const userPosition = sortedScores.findIndex(([userId]) => userId === data.userId) + 1

              set({
                challenges: {
                  ...challenges,
                  currentChallenge: challenge,
                  challengePosition: userPosition,
                },
              })
            }
          }
        })

        socketService.on('live_challenge_end', (data) => {
          const { challenges } = get()
          const challenge = socketService.getActiveChallenge(data.challengeId)

          if (challenge) {
            set({
              challenges: {
                ...challenges,
                currentChallenge: null,
                isInChallenge: false,
                challengeHistory: [...challenges.challengeHistory, challenge],
              },
            })

            get().addNotification({
              type: 'system',
              title: 'Challenge Completed',
              message: `Challenge "${challenge.type}" has ended`,
              data: { challenge, results: data.results },
              isRead: false,
            })
          }
        })

        // Achievement events
        socketService.on('achievement_unlocked', (achievement) => {
          get().addNotification({
            type: 'achievement',
            title: 'Achievement Unlocked!',
            message: achievement.title,
            data: achievement,
            isRead: false,
          })
        })

        socketService.on('streak_milestone', (data) => {
          get().addNotification({
            type: 'achievement',
            title: 'Streak Milestone!',
            message: `You've reached a ${data.streakCount} day streak!`,
            data: data,
            isRead: false,
          })
        })

        // Progress sharing events
        socketService.on('user_progress_update', (data) => {
          get().addSharedProgress(data)
        })

        // System events
        socketService.on('system_notification', (notification) => {
          get().addNotification({
            type: 'system',
            title: notification.title,
            message: notification.message,
            data: notification,
            isRead: false,
          })
        })

        // Auto-connect if user is authenticated
        const authStore = require('./index').useAuthStore
        if (authStore.getState().isAuthenticated) {
          get().connect()
        }
      },

      cleanup: () => {
        console.log('Cleaning up real-time functionality')
        socketService.destroy()
      },

      // Connection actions
      connect: async () => {
        try {
          await socketService.connect()
        } catch (error) {
          console.error('Failed to connect to real-time service:', error)
          set({
            connection: {
              ...get().connection,
              connectionError: (error as Error).message,
            },
          })
        }
      },

      disconnect: () => {
        socketService.disconnect()
      },

      reconnect: () => {
        socketService.reconnect()
      },

      updateConnectionState: (state) => {
        set({
          connection: {
            ...get().connection,
            ...state,
          },
        })
      },

      // Notification actions
      addNotification: (notification) => {
        const newNotification: RealTimeNotification = {
          ...notification,
          id: `notification-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
        }

        const { notifications } = get()
        set({
          notifications: [newNotification, ...notifications],
          unreadNotificationCount: get().unreadNotificationCount + 1,
        })
      },

      markNotificationAsRead: (notificationId) => {
        const { notifications } = get()
        const updatedNotifications = notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        )

        const unreadCount = updatedNotifications.filter((n) => !n.isRead).length

        set({
          notifications: updatedNotifications,
          unreadNotificationCount: unreadCount,
        })
      },

      clearNotifications: () => {
        set({
          notifications: [],
          unreadNotificationCount: 0,
        })
      },

      removeNotification: (notificationId) => {
        const { notifications } = get()
        const filteredNotifications = notifications.filter((n) => n.id !== notificationId)
        const unreadCount = filteredNotifications.filter((n) => !n.isRead).length

        set({
          notifications: filteredNotifications,
          unreadNotificationCount: unreadCount,
        })
      },

      // Friend activity actions
      addFriendActivity: (activity) => {
        const newActivity: FriendActivity = {
          ...activity,
          id: `activity-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
        }

        const { friendActivities } = get()
        set({
          friendActivities: [newActivity, ...friendActivities].slice(0, 50), // Keep last 50 activities
        })
      },

      updateOnlineFriends: (friendIds) => {
        set({ onlineFriends: friendIds })
      },

      setFriendOnline: (friendId) => {
        const { onlineFriends } = get()
        if (!onlineFriends.includes(friendId)) {
          set({ onlineFriends: [...onlineFriends, friendId] })
        }
      },

      setFriendOffline: (friendId) => {
        const { onlineFriends } = get()
        set({ onlineFriends: onlineFriends.filter((id) => id !== friendId) })
      },

      // Challenge actions
      joinChallenge: async (challengeId) => {
        try {
          await socketService.joinLiveChallenge(challengeId)
        } catch (error) {
          console.error('Failed to join challenge:', error)
          throw error
        }
      },

      leaveChallenge: async (challengeId) => {
        try {
          await socketService.leaveLiveChallenge(challengeId)
          set({
            challenges: {
              ...get().challenges,
              currentChallenge: null,
              isInChallenge: false,
            },
          })
        } catch (error) {
          console.error('Failed to leave challenge:', error)
          throw error
        }
      },

      submitChallengeAnswer: async (answer) => {
        try {
          await socketService.submitChallengeAnswer(answer)

          // Update local challenge score (this would be confirmed by server)
          const { challenges } = get()
          set({
            challenges: {
              ...challenges,
              challengeScore: challenges.challengeScore + (answer.responseTime < 5000 ? 10 : 5),
            },
          })
        } catch (error) {
          console.error('Failed to submit challenge answer:', error)
          throw error
        }
      },

      createFriendChallenge: async (friendId, challengeType) => {
        try {
          await socketService.createFriendChallenge(friendId, challengeType)
        } catch (error) {
          console.error('Failed to create friend challenge:', error)
          throw error
        }
      },

      acceptFriendChallenge: async (challengeId) => {
        try {
          await socketService.acceptFriendChallenge(challengeId)
        } catch (error) {
          console.error('Failed to accept friend challenge:', error)
          throw error
        }
      },

      updateChallengeState: (state) => {
        set({
          challenges: {
            ...get().challenges,
            ...state,
          },
        })
      },

      // Progress sharing actions
      shareProgress: async (progressData) => {
        try {
          await socketService.shareProgress(progressData)
        } catch (error) {
          console.error('Failed to share progress:', error)
          throw error
        }
      },

      addSharedProgress: (progress) => {
        const { sharedProgress } = get()
        set({
          sharedProgress: [progress, ...sharedProgress].slice(0, 20), // Keep last 20 shared progress items
        })
      },
    }),
    {
      name: 'realtime-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        friendActivities: state.friendActivities,
        challenges: {
          challengeHistory: state.challenges.challengeHistory,
          pendingChallenges: state.challenges.pendingChallenges,
        },
        sharedProgress: state.sharedProgress,
      }),
    },
  ),
)

export default useRealTimeStore
