import { io, Socket } from 'socket.io-client'
import NetInfo from '@react-native-community/netinfo'
import { useAuthStore, useLearningStore, useSocialStore, useOfflineStore } from '../store'
import { User, Friend, Achievement, LearningSession } from '../types'

// Real-time event types
export interface RealTimeEvents {
  // Connection events
  connect: () => void
  disconnect: (reason: string) => void
  reconnect: (attemptNumber: number) => void
  reconnect_error: (error: Error) => void

  // User events
  user_online: (user: Pick<User, 'id' | 'email'>) => void
  user_offline: (userId: string) => void
  user_progress_update: (data: { userId: string; progress: any }) => void

  // Friend events
  friend_request: (friend: Friend) => void
  friend_accepted: (friend: Friend) => void
  friend_activity: (data: { friendId: string; activity: string; timestamp: string }) => void
  friend_challenge: (data: { challengeId: string; fromUser: Friend; challenge: any }) => void

  // Learning events
  live_challenge_start: (data: {
    challengeId: string
    participants: string[]
    questions: any[]
  }) => void
  live_challenge_answer: (data: {
    challengeId: string
    userId: string
    answer: any
    score: number
  }) => void
  live_challenge_end: (data: { challengeId: string; results: any[] }) => void

  // Achievement events
  achievement_unlocked: (achievement: Achievement) => void
  streak_milestone: (data: { userId: string; streakCount: number; milestone: string }) => void

  // System events
  system_notification: (notification: { title: string; message: string; type: string }) => void
  maintenance_mode: (data: { enabled: boolean; message?: string }) => void
}

export interface LiveChallenge {
  id: string
  type: 'speed_quiz' | 'accuracy_challenge' | 'knowledge_duel'
  participants: string[]
  questions: any[]
  timeLimit: number
  startTime: string
  endTime?: string
  scores: Record<string, number>
  status: 'waiting' | 'active' | 'completed'
}

export interface ChallengeAnswer {
  challengeId: string
  questionId: string
  selectedAnswer: string
  responseTime: number
  timestamp: string
}

export class SocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private activeChallenges: Map<string, LiveChallenge> = new Map()

  constructor() {
    this.initializeNetworkListener()
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable

      if (isOnline && !this.isConnected) {
        this.connect()
      } else if (!isOnline && this.isConnected) {
        this.handleOffline()
      }
    })
  }

  async connect(): Promise<void> {
    const { user, tokens } = useAuthStore.getState()

    if (!user || !tokens) {
      console.log('Cannot connect: user not authenticated')
      return
    }

    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    try {
      console.log('Connecting to Socket.io server...')

      // In production, this would be the actual server URL
      const serverUrl = process.env.EXPO_PUBLIC_SOCKET_URL || 'ws://localhost:3001'

      this.socket = io(serverUrl, {
        auth: {
          token: tokens.accessToken,
          userId: user.id,
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
      })

      this.setupEventHandlers()
    } catch (error) {
      console.error('Failed to connect to Socket.io server:', error)
      this.handleConnectionError(error as Error)
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.io connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.emit('connect')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason)
      this.isConnected = false
      this.stopHeartbeat()
      this.emit('disconnect', reason)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.io reconnected after ${attemptNumber} attempts`)
      this.reconnectAttempts = 0
      this.emit('reconnect', attemptNumber)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket.io reconnection error:', error)
      this.reconnectAttempts++
      this.emit('reconnect_error', error)
    })

    // User presence events
    this.socket.on('user_online', (user: Pick<User, 'id' | 'email'>) => {
      console.log('User came online:', user.email)
      this.updateFriendOnlineStatus(user.id, true)
      this.emit('user_online', user)
    })

    this.socket.on('user_offline', (userId: string) => {
      console.log('User went offline:', userId)
      this.updateFriendOnlineStatus(userId, false)
      this.emit('user_offline', userId)
    })

    // Friend events
    this.socket.on('friend_request', (friend: Friend) => {
      console.log('Received friend request from:', friend.email)
      this.handleFriendRequest(friend)
      this.emit('friend_request', friend)
    })

    this.socket.on('friend_accepted', (friend: Friend) => {
      console.log('Friend request accepted by:', friend.email)
      this.handleFriendAccepted(friend)
      this.emit('friend_accepted', friend)
    })

    this.socket.on('friend_activity', (data) => {
      console.log('Friend activity:', data)
      this.emit('friend_activity', data)
    })

    this.socket.on('friend_challenge', (data) => {
      console.log('Received friend challenge:', data)
      this.handleFriendChallenge(data)
      this.emit('friend_challenge', data)
    })

    // Live challenge events
    this.socket.on('live_challenge_start', (data) => {
      console.log('Live challenge started:', data.challengeId)
      this.handleLiveChallengeStart(data)
      this.emit('live_challenge_start', data)
    })

    this.socket.on('live_challenge_answer', (data) => {
      console.log('Live challenge answer received:', data)
      this.handleLiveChallengeAnswer(data)
      this.emit('live_challenge_answer', data)
    })

    this.socket.on('live_challenge_end', (data) => {
      console.log('Live challenge ended:', data.challengeId)
      this.handleLiveChallengeEnd(data)
      this.emit('live_challenge_end', data)
    })

    // Progress and achievement events
    this.socket.on('user_progress_update', (data) => {
      console.log('User progress update:', data)
      this.handleProgressUpdate(data)
      this.emit('user_progress_update', data)
    })

    this.socket.on('achievement_unlocked', (achievement: Achievement) => {
      console.log('Achievement unlocked:', achievement.title)
      this.handleAchievementUnlocked(achievement)
      this.emit('achievement_unlocked', achievement)
    })

    this.socket.on('streak_milestone', (data) => {
      console.log('Streak milestone reached:', data)
      this.emit('streak_milestone', data)
    })

    // System events
    this.socket.on('system_notification', (notification) => {
      console.log('System notification:', notification)
      this.emit('system_notification', notification)
    })

    this.socket.on('maintenance_mode', (data) => {
      console.log('Maintenance mode:', data)
      this.emit('maintenance_mode', data)
    })
  }

  // Event emission and listening
  private emit(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach((listener) => {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }

  on<K extends keyof RealTimeEvents>(event: K, listener: RealTimeEvents[K]): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.push(listener)
    this.eventListeners.set(event, listeners)
  }

  off<K extends keyof RealTimeEvents>(event: K, listener: RealTimeEvents[K]): void {
    const listeners = this.eventListeners.get(event) || []
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
      this.eventListeners.set(event, listeners)
    }
  }

  // Real-time feature methods
  async joinLiveChallenge(challengeId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Joining live challenge:', challengeId)
    this.socket.emit('join_challenge', { challengeId })
  }

  async leaveLiveChallenge(challengeId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Leaving live challenge:', challengeId)
    this.socket.emit('leave_challenge', { challengeId })
    this.activeChallenges.delete(challengeId)
  }

  async submitChallengeAnswer(answer: ChallengeAnswer): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Submitting challenge answer:', answer)
    this.socket.emit('challenge_answer', answer)
  }

  async createFriendChallenge(friendId: string, challengeType: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Creating friend challenge:', { friendId, challengeType })
    this.socket.emit('create_friend_challenge', { friendId, challengeType })
  }

  async acceptFriendChallenge(challengeId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Accepting friend challenge:', challengeId)
    this.socket.emit('accept_friend_challenge', { challengeId })
  }

  async shareProgress(progressData: any): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    console.log('Sharing progress:', progressData)
    this.socket.emit('share_progress', progressData)
  }

  // Event handlers
  private updateFriendOnlineStatus(userId: string, isOnline: boolean) {
    const { friends } = useSocialStore.getState()
    const updatedFriends = friends.map((friend) =>
      friend.id === userId ? { ...friend, isOnline } : friend,
    )

    // Update the social store (this would need to be added to the store)
    // useSocialStore.getState().updateFriends(updatedFriends)
  }

  private handleFriendRequest(friend: Friend) {
    // Add to pending friend requests
    // This would need to be implemented in the social store
    console.log('Handling friend request from:', friend.email)
  }

  private handleFriendAccepted(friend: Friend) {
    // Add to friends list
    const { friends } = useSocialStore.getState()
    const updatedFriends = [...friends, friend]

    // Update the social store
    // useSocialStore.getState().updateFriends(updatedFriends)
  }

  private handleFriendChallenge(data: any) {
    // Store the challenge for later acceptance/rejection
    console.log('Handling friend challenge:', data)
  }

  private handleLiveChallengeStart(data: any) {
    const challenge: LiveChallenge = {
      id: data.challengeId,
      type: data.type || 'speed_quiz',
      participants: data.participants,
      questions: data.questions,
      timeLimit: data.timeLimit,
      startTime: data.startTime,
      scores: {},
      status: 'active',
    }

    this.activeChallenges.set(data.challengeId, challenge)
  }

  private handleLiveChallengeAnswer(data: any) {
    const challenge = this.activeChallenges.get(data.challengeId)
    if (challenge) {
      challenge.scores[data.userId] = data.score
      this.activeChallenges.set(data.challengeId, challenge)
    }
  }

  private handleLiveChallengeEnd(data: any) {
    const challenge = this.activeChallenges.get(data.challengeId)
    if (challenge) {
      challenge.status = 'completed'
      challenge.endTime = new Date().toISOString()
      this.activeChallenges.set(data.challengeId, challenge)
    }
  }

  private handleProgressUpdate(data: any) {
    // Update local progress data
    console.log('Handling progress update:', data)
  }

  private handleAchievementUnlocked(achievement: Achievement) {
    // Add to local achievements
    const { achievements } = useLearningStore.getState()
    const updatedAchievements = [...achievements, achievement]

    // Update the learning store
    // useLearningStore.getState().updateAchievements(updatedAchievements)
  }

  // Connection management
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000) // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleOffline() {
    console.log('Device went offline, disconnecting socket')
    this.disconnect()
  }

  private handleConnectionError(error: Error) {
    console.error('Socket connection error:', error)

    // Store error for offline handling
    useOfflineStore.getState().addAction({
      type: 'SYNC_PROGRESS',
      payload: { error: error.message, timestamp: new Date().toISOString() },
    })
  }

  // Public methods
  disconnect(): void {
    console.log('Disconnecting Socket.io')

    this.stopHeartbeat()
    this.activeChallenges.clear()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.isConnected = false
  }

  reconnect(): void {
    console.log('Manually reconnecting Socket.io')
    this.disconnect()
    setTimeout(() => this.connect(), 1000)
  }

  getConnectionStatus(): {
    isConnected: boolean
    reconnectAttempts: number
    activeChallenges: number
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeChallenges: this.activeChallenges.size,
    }
  }

  getActiveChallenge(challengeId: string): LiveChallenge | undefined {
    return this.activeChallenges.get(challengeId)
  }

  getAllActiveChallenges(): LiveChallenge[] {
    return Array.from(this.activeChallenges.values())
  }

  // Cleanup
  destroy(): void {
    this.disconnect()
    this.eventListeners.clear()
  }
}

// Singleton instance
export const socketService = new SocketService()
export default socketService
