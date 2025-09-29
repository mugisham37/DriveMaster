import { useEffect, useCallback, useRef } from 'react'
import { useRealTimeStore } from '../store/realTimeStore'
import { socketService } from '../services/socketService'
import { useAuthStore } from '../store'
import { ChallengeAnswer } from '../services/socketService'

// Hook for managing real-time connection
export const useRealTimeConnection = () => {
  const { connection, connect, disconnect, reconnect, initializeRealTime, cleanup } =
    useRealTimeStore()

  const { isAuthenticated } = useAuthStore()
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isInitialized.current) {
      initializeRealTime()
      isInitialized.current = true
    }

    return () => {
      cleanup()
    }
  }, [initializeRealTime, cleanup])

  useEffect(() => {
    if (isAuthenticated && !connection.isConnected) {
      connect()
    } else if (!isAuthenticated && connection.isConnected) {
      disconnect()
    }
  }, [isAuthenticated, connection.isConnected, connect, disconnect])

  const handleReconnect = useCallback(() => {
    reconnect()
  }, [reconnect])

  return {
    isConnected: connection.isConnected,
    reconnectAttempts: connection.reconnectAttempts,
    lastConnectedAt: connection.lastConnectedAt,
    connectionError: connection.connectionError,
    reconnect: handleReconnect,
  }
}

// Hook for managing notifications
export const useRealTimeNotifications = () => {
  const {
    notifications,
    unreadNotificationCount,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    removeNotification,
  } = useRealTimeStore()

  const markAsRead = useCallback(
    (notificationId: string) => {
      markNotificationAsRead(notificationId)
    },
    [markNotificationAsRead],
  )

  const clearAll = useCallback(() => {
    clearNotifications()
  }, [clearNotifications])

  const remove = useCallback(
    (notificationId: string) => {
      removeNotification(notificationId)
    },
    [removeNotification],
  )

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.isRead)
  }, [notifications])

  const getNotificationsByType = useCallback(
    (type: string) => {
      return notifications.filter((n) => n.type === type)
    },
    [notifications],
  )

  return {
    notifications,
    unreadCount: unreadNotificationCount,
    unreadNotifications: getUnreadNotifications(),
    markAsRead,
    clearAll,
    remove,
    getNotificationsByType,
  }
}

// Hook for managing friend activities and online status
export const useRealTimeFriends = () => {
  const { friendActivities, onlineFriends, setFriendOnline, setFriendOffline, addFriendActivity } =
    useRealTimeStore()

  const isFriendOnline = useCallback(
    (friendId: string) => {
      return onlineFriends.includes(friendId)
    },
    [onlineFriends],
  )

  const getRecentActivities = useCallback(
    (limit: number = 10) => {
      return friendActivities.slice(0, limit)
    },
    [friendActivities],
  )

  const getActivitiesByFriend = useCallback(
    (friendId: string) => {
      return friendActivities.filter((activity) => activity.friendId === friendId)
    },
    [friendActivities],
  )

  return {
    friendActivities,
    onlineFriends,
    isFriendOnline,
    getRecentActivities,
    getActivitiesByFriend,
    onlineFriendsCount: onlineFriends.length,
  }
}

// Hook for managing live challenges
export const useRealTimeChallenges = () => {
  const {
    challenges,
    joinChallenge,
    leaveChallenge,
    submitChallengeAnswer,
    createFriendChallenge,
    acceptFriendChallenge,
    updateChallengeState,
  } = useRealTimeStore()

  const join = useCallback(
    async (challengeId: string) => {
      try {
        await joinChallenge(challengeId)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [joinChallenge],
  )

  const leave = useCallback(
    async (challengeId: string) => {
      try {
        await leaveChallenge(challengeId)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [leaveChallenge],
  )

  const submitAnswer = useCallback(
    async (answer: ChallengeAnswer) => {
      try {
        await submitChallengeAnswer(answer)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [submitChallengeAnswer],
  )

  const createChallenge = useCallback(
    async (friendId: string, challengeType: string) => {
      try {
        await createFriendChallenge(friendId, challengeType)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [createFriendChallenge],
  )

  const acceptChallenge = useCallback(
    async (challengeId: string) => {
      try {
        await acceptFriendChallenge(challengeId)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [acceptFriendChallenge],
  )

  const getCurrentChallengeProgress = useCallback(() => {
    if (!challenges.currentChallenge) return null

    const challenge = challenges.currentChallenge
    const totalQuestions = challenge.questions.length
    const timeRemaining = challenge.timeLimit
      ? Math.max(0, challenge.timeLimit - (Date.now() - new Date(challenge.startTime).getTime()))
      : null

    return {
      challengeId: challenge.id,
      type: challenge.type,
      totalQuestions,
      currentScore: challenges.challengeScore,
      position: challenges.challengePosition,
      timeRemaining,
      participants: challenge.participants.length,
    }
  }, [challenges])

  return {
    currentChallenge: challenges.currentChallenge,
    challengeHistory: challenges.challengeHistory,
    pendingChallenges: challenges.pendingChallenges,
    isInChallenge: challenges.isInChallenge,
    challengeScore: challenges.challengeScore,
    challengePosition: challenges.challengePosition,
    join,
    leave,
    submitAnswer,
    createChallenge,
    acceptChallenge,
    getCurrentChallengeProgress,
  }
}

// Hook for managing progress sharing
export const useRealTimeProgressSharing = () => {
  const { sharedProgress, shareProgress, addSharedProgress } = useRealTimeStore()

  const share = useCallback(
    async (progressData: any) => {
      try {
        await shareProgress(progressData)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    },
    [shareProgress],
  )

  const getRecentSharedProgress = useCallback(
    (limit: number = 10) => {
      return sharedProgress.slice(0, limit)
    },
    [sharedProgress],
  )

  const getSharedProgressByUser = useCallback(
    (userId: string) => {
      return sharedProgress.filter((progress) => progress.userId === userId)
    },
    [sharedProgress],
  )

  return {
    sharedProgress,
    share,
    getRecentSharedProgress,
    getSharedProgressByUser,
  }
}

// Combined hook for all real-time features
export const useRealTime = () => {
  const connection = useRealTimeConnection()
  const notifications = useRealTimeNotifications()
  const friends = useRealTimeFriends()
  const challenges = useRealTimeChallenges()
  const progressSharing = useRealTimeProgressSharing()

  return {
    connection,
    notifications,
    friends,
    challenges,
    progressSharing,
  }
}

// Hook for real-time event listening
export const useRealTimeEvents = () => {
  const addEventListener = useCallback((event: string, listener: Function) => {
    socketService.on(event as any, listener as any)

    return () => {
      socketService.off(event as any, listener as any)
    }
  }, [])

  return {
    addEventListener,
  }
}
