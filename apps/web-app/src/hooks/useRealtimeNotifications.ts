/**
 * Real-Time Notifications Hook
 * 
 * Provides WebSocket integration for real-time notification delivery, connection management,
 * and toast notifications with comprehensive error handling and fallback support.
 * 
 * Requirements: 4.1, 4.3, 7.5
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { 
  getNotificationWebSocketClient,
  type NotificationWebSocketState,
  type NotificationConnectionStats
} from '@/lib/notification-service'
import { useAuth } from './useAuth'
import type {
  RealtimeNotification,
  Notification,
  NotificationError
} from '@/types/notification-service'

// ============================================================================
// Real-Time Notifications Hook
// ============================================================================

export interface UseRealtimeNotificationsOptions {
  enabled?: boolean
  showToasts?: boolean
  playSound?: boolean
  enableVibration?: boolean
  toastDuration?: number
  maxToastsVisible?: number
  filters?: {
    types?: string[]
    priorities?: string[]
    channels?: string[]
  }
}

export interface UseRealtimeNotificationsResult {
  // Connection state
  isConnected: boolean
  connectionState: NotificationWebSocketState
  connectionStats: NotificationConnectionStats | null
  
  // Real-time notifications
  realtimeNotifications: RealtimeNotification[]
  clearRealtimeNotifications: () => void
  
  // Connection management
  connect: () => void
  disconnect: () => void
  
  // Error state
  error: NotificationError | null
  clearError: () => void
  
  // Subscription management
  subscriptionId: string | null
}

/**
 * Hook for managing real-time notification delivery and WebSocket connections
 * Requirements: 4.1, 4.3, 7.5
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsResult {
  const { user } = useAuth()
  const wsClientRef = useRef(getNotificationWebSocketClient())
  
  const {
    enabled = true,
    showToasts = true,
    playSound = false,
    enableVibration = false,
    toastDuration = 5000,
    maxToastsVisible = 3,
    filters
  } = options

  // State management
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<NotificationWebSocketState>('disconnected')
  const [connectionStats, setConnectionStats] = useState<NotificationConnectionStats | null>(null)
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([])
  const [error, setError] = useState<NotificationError | null>(null)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  
  // Toast queue management
  const activeToastsRef = useRef<Set<string>>(new Set())
  const toastQueueRef = useRef<RealtimeNotification[]>([])

  // ============================================================================
  // Toast Management
  // ============================================================================

  const processToastQueue = useCallback(() => {
    if (toastQueueRef.current.length === 0 || activeToastsRef.current.size >= maxToastsVisible) {
      return
    }

    const notification = toastQueueRef.current.shift()
    if (!notification) return

    const toastId = toast(
      (t) => (
        <div className="flex items-start space-x-3 max-w-sm">
          {notification.iconUrl && (
            <img 
              src={notification.iconUrl} 
              alt="" 
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </p>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {notification.body}
            </p>
            {notification.actionUrl && (
              <button
                onClick={() => {
                  window.open(notification.actionUrl, '_blank')
                  toast.dismiss(t.id)
                }}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
              >
                View Details
              </button>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ),
      {
        duration: toastDuration,
        position: 'top-right',
        style: {
          background: '#fff',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxWidth: '400px'
        },
        onDismiss: () => {
          activeToastsRef.current.delete(toastId)
          // Process next toast in queue
          setTimeout(processToastQueue, 100)
        }
      }
    )

    activeToastsRef.current.add(toastId)

    // Process next toast after a short delay
    setTimeout(processToastQueue, 500)
  }, [maxToastsVisible, toastDuration])

  const showNotificationToast = useCallback((notification: RealtimeNotification) => {
    if (!showToasts || !notification.showToast) return

    // Add to queue
    toastQueueRef.current.push(notification)
    processToastQueue()
  }, [showToasts, processToastQueue])

  // ============================================================================
  // Notification Handlers
  // ============================================================================

  const handleNotificationReceived = useCallback((notification: RealtimeNotification) => {
    console.log('Real-time notification received:', notification)
    
    // Add to real-time notifications list
    setRealtimeNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
    
    // Show toast notification
    showNotificationToast(notification)
    
    // Play sound if enabled
    if (playSound && notification.playSound) {
      try {
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.3
        audio.play().catch(console.warn)
      } catch (error) {
        console.warn('Failed to play notification sound:', error)
      }
    }
    
    // Vibrate if enabled and supported
    if (enableVibration && notification.vibrate && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200])
      } catch (error) {
        console.warn('Failed to vibrate:', error)
      }
    }
  }, [showNotificationToast, playSound, enableVibration])

  const handleNotificationUpdated = useCallback((notification: Notification) => {
    console.log('Notification updated:', notification.id)
    
    // Update existing real-time notification if present
    setRealtimeNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, ...notification } : n)
    )
  }, [])

  const handleNotificationDeleted = useCallback((notificationId: string) => {
    console.log('Notification deleted:', notificationId)
    
    // Remove from real-time notifications
    setRealtimeNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  const handleConnectionStateChange = useCallback((newState: NotificationWebSocketState) => {
    setConnectionState(newState)
    setIsConnected(newState === 'connected')
    
    // Update connection stats
    const stats = wsClientRef.current.getConnectionStats()
    setConnectionStats(stats)
  }, [])

  const handleError = useCallback((error: NotificationError) => {
    console.error('Real-time notification error:', error)
    setError(error)
    
    // Show error toast for critical errors
    if (error.type === 'websocket' && showToasts) {
      toast.error('Connection issue with notifications. Some notifications may be delayed.', {
        duration: 8000,
        position: 'top-right'
      })
    }
  }, [showToasts])

  // ============================================================================
  // Connection Management
  // ============================================================================

  const connect = useCallback(async () => {
    if (!user?.id || !enabled) return

    try {
      setError(null)
      await wsClientRef.current.connect()
    } catch (error) {
      console.error('Failed to connect to notification WebSocket:', error)
      setError(error as NotificationError)
    }
  }, [user?.id, enabled])

  const disconnect = useCallback(() => {
    wsClientRef.current.disconnect()
    setSubscriptionId(null)
  }, [])

  // ============================================================================
  // Effects
  // ============================================================================

  // Set up WebSocket event handlers
  useEffect(() => {
    const wsClient = wsClientRef.current

    // Connection events
    wsClient.on('connected', () => handleConnectionStateChange('connected'))
    wsClient.on('disconnected', () => handleConnectionStateChange('disconnected'))
    wsClient.on('reconnecting', () => handleConnectionStateChange('reconnecting'))
    wsClient.on('error', handleError)

    // Notification events
    wsClient.on('notification.received', handleNotificationReceived)
    wsClient.on('notification.updated', handleNotificationUpdated)
    wsClient.on('notification.deleted', handleNotificationDeleted)

    // Connection status updates
    wsClient.on('connection.status', (status) => {
      setIsConnected(status.connected)
      const stats = wsClient.getConnectionStats()
      setConnectionStats(stats)
    })

    return () => {
      wsClient.off('connected')
      wsClient.off('disconnected')
      wsClient.off('reconnecting')
      wsClient.off('error')
      wsClient.off('notification.received')
      wsClient.off('notification.updated')
      wsClient.off('notification.deleted')
      wsClient.off('connection.status')
    }
  }, [
    handleConnectionStateChange,
    handleError,
    handleNotificationReceived,
    handleNotificationUpdated,
    handleNotificationDeleted
  ])

  // Auto-connect and subscribe when user is available
  useEffect(() => {
    if (!user?.id || !enabled) {
      disconnect()
      return
    }

    // Connect and subscribe
    const setupConnection = async () => {
      try {
        await connect()
        
        // Subscribe to user notifications with filters
        const subId = wsClientRef.current.subscribeToUserNotifications(user.id, filters)
        setSubscriptionId(subId)
      } catch (error) {
        console.error('Failed to setup real-time notifications:', error)
      }
    }

    setupConnection()

    return () => {
      if (subscriptionId) {
        wsClientRef.current.unsubscribe(subscriptionId)
      }
    }
  }, [user?.id, enabled, connect, disconnect, JSON.stringify(filters)])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear active toasts
      activeToastsRef.current.forEach(toastId => {
        toast.dismiss(toastId)
      })
      activeToastsRef.current.clear()
      toastQueueRef.current = []
      
      // Disconnect WebSocket
      disconnect()
    }
  }, [disconnect])

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearRealtimeNotifications = useCallback(() => {
    setRealtimeNotifications([])
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // Return Hook Result
  // ============================================================================

  return {
    // Connection state
    isConnected,
    connectionState,
    connectionStats,
    
    // Real-time notifications
    realtimeNotifications,
    clearRealtimeNotifications,
    
    // Connection management
    connect,
    disconnect,
    
    // Error state
    error,
    clearError,
    
    // Subscription management
    subscriptionId
  }
}

// ============================================================================
// Connection Status Hook
// ============================================================================

export interface UseNotificationConnectionResult {
  isConnected: boolean
  connectionState: NotificationWebSocketState
  connectionStats: NotificationConnectionStats | null
  latency: number | null
  reconnectAttempts: number
  connect: () => void
  disconnect: () => void
}

/**
 * Hook for monitoring notification WebSocket connection status
 * Requirements: 4.4, 4.5
 */
export function useNotificationConnection(): UseNotificationConnectionResult {
  const wsClientRef = useRef(getNotificationWebSocketClient())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<NotificationWebSocketState>('disconnected')
  const [connectionStats, setConnectionStats] = useState<NotificationConnectionStats | null>(null)
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    const wsClient = wsClientRef.current

    const updateConnectionState = () => {
      setConnectionState(wsClient.getConnectionState())
      setIsConnected(wsClient.isConnected())
      setConnectionStats(wsClient.getConnectionStats())
    }

    const handleConnectionStatus = (status: { connected: boolean; latency?: number }) => {
      setIsConnected(status.connected)
      if (status.latency !== undefined) {
        setLatency(status.latency)
      }
    }

    // Set up event handlers
    wsClient.on('connected', updateConnectionState)
    wsClient.on('disconnected', updateConnectionState)
    wsClient.on('reconnecting', updateConnectionState)
    wsClient.on('connection.status', handleConnectionStatus)

    // Initial state
    updateConnectionState()

    return () => {
      wsClient.off('connected')
      wsClient.off('disconnected')
      wsClient.off('reconnecting')
      wsClient.off('connection.status')
    }
  }, [])

  const connect = useCallback(async () => {
    try {
      await wsClientRef.current.connect()
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }, [])

  const disconnect = useCallback(() => {
    wsClientRef.current.disconnect()
  }, [])

  return {
    isConnected,
    connectionState,
    connectionStats,
    latency,
    reconnectAttempts: connectionStats?.totalReconnections || 0,
    connect,
    disconnect
  }
}