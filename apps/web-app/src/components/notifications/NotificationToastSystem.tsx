/**
 * Notification Toast System
 * 
 * Implements toast notification system for real-time notification display with
 * customizable styles, queuing, stacking, and interactive notifications.
 * 
 * Requirements: 4.3, 1.1
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast, Toaster, ToastOptions } from 'react-hot-toast'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { 
  Notification, 
  NotificationType, 
  NotificationPriority,
  RealtimeNotification 
} from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface NotificationToastOptions extends Omit<ToastOptions, 'id'> {
  priority?: NotificationPriority
  type?: NotificationType
  actionUrl?: string
  actionLabel?: string
  onAction?: () => void
  showAvatar?: boolean
  avatarUrl?: string
  persistent?: boolean
  sound?: boolean
  vibrate?: boolean
}

export interface ToastNotification extends Notification {
  toastId?: string
  isToast?: boolean
}

export interface NotificationToastSystemProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  maxVisible?: number
  defaultDuration?: number
  enableSounds?: boolean
  enableVibration?: boolean
  enableGrouping?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const TOAST_STYLES: Record<string, {
  icon: string
  className: string
  iconColor: string
  duration: number
}> = {
  achievement: {
    icon: 'trophy',
    className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0',
    iconColor: 'text-white',
    duration: 6000
  },
  streak_reminder: {
    icon: 'fire',
    className: 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-0',
    iconColor: 'text-white',
    duration: 5000
  },
  spaced_repetition: {
    icon: 'academic-cap',
    className: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0',
    iconColor: 'text-white',
    duration: 5000
  },
  mock_test_reminder: {
    icon: 'clipboard-document-check',
    className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0',
    iconColor: 'text-white',
    duration: 5000
  },
  system: {
    icon: 'cog',
    className: 'bg-gray-100 text-gray-800 border border-gray-300',
    iconColor: 'text-gray-600',
    duration: 4000
  },
  social: {
    icon: 'users',
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
    iconColor: 'text-blue-600',
    duration: 4000
  },
  content: {
    icon: 'document-text',
    className: 'bg-purple-100 text-purple-800 border border-purple-300',
    iconColor: 'text-purple-600',
    duration: 4000
  },
  // Add fallback for other notification types
  mentoring: {
    icon: 'users',
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
    iconColor: 'text-blue-600',
    duration: 4000
  }
}

const PRIORITY_STYLES = {
  low: {
    className: 'opacity-90',
    duration: 3000
  },
  normal: {
    className: '',
    duration: 4000
  },
  high: {
    className: 'ring-2 ring-blue-500 ring-opacity-50',
    duration: 6000
  },
  urgent: {
    className: 'ring-2 ring-red-500 ring-opacity-75 shadow-lg',
    duration: 8000
  }
} as const

// ============================================================================
// Custom Toast Component
// ============================================================================

interface CustomToastProps {
  notification: ToastNotification
  onAction?: () => void
  onDismiss?: () => void
  showAvatar?: boolean
}

const CustomToast: React.FC<CustomToastProps> = ({
  notification,
  onAction,
  onDismiss,
  showAvatar = false
}) => {
  const typeStyle = TOAST_STYLES[notification.type] || TOAST_STYLES.system
  const priorityStyle = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.normal

  const handleAction = useCallback(() => {
    onAction?.()
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
    }
  }, [onAction, notification.actionUrl])

  return (
    <div className={`
      notification-toast flex items-start gap-3 p-4 rounded-lg shadow-md max-w-sm
      ${typeStyle.className} ${priorityStyle.className}
    `}>
      {/* Avatar or Icon */}
      <div className="flex-shrink-0">
        {showAvatar && notification.data?.avatarUrl ? (
          <img
            src={notification.data.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <Icon 
            icon={typeStyle.icon} 
            className={`w-6 h-6 ${typeStyle.iconColor}`} 
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm leading-tight">
              {notification.title}
            </h4>
            {notification.body && (
              <p className="text-sm opacity-90 mt-1 leading-tight">
                {notification.body}
              </p>
            )}
          </div>
          
          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <Icon icon="x-mark" className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        {(notification.actionUrl || onAction) && (
          <div className="mt-3">
            <FormButton
              onClick={handleAction}
              className="btn-ghost btn-xs text-current border-current hover:bg-white hover:bg-opacity-20"
            >
              {notification.data?.actionLabel || 'View'}
              <Icon icon="arrow-top-right-on-square" className="w-3 h-3 ml-1" />
            </FormButton>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Toast System Component
// ============================================================================

export function NotificationToastSystem({
  position = 'top-right',
  maxVisible = 3,
  defaultDuration = 4000,
  enableSounds = false,
  enableVibration = false,
  enableGrouping = true,
  className = ''
}: NotificationToastSystemProps): React.JSX.Element {
  const [activeToasts, setActiveToasts] = useState<Map<string, ToastNotification>>(new Map())
  const [toastQueue, setToastQueue] = useState<ToastNotification[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ============================================================================
  // Audio and Vibration
  // ============================================================================

  const playNotificationSound = useCallback((type: NotificationType) => {
    if (!enableSounds) return

    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      // Different sounds for different notification types
      const soundMap: Record<string, string> = {
        achievement: '/sounds/achievement.mp3',
        streak_reminder: '/sounds/streak.mp3',
        spaced_repetition: '/sounds/reminder.mp3',
        mock_test_reminder: '/sounds/test.mp3',
        system: '/sounds/notification.mp3',
        social: '/sounds/social.mp3',
        content: '/sounds/content.mp3',
        mentoring: '/sounds/social.mp3'
      }

      const soundUrl = soundMap[type] || soundMap.system
      audioRef.current.src = soundUrl
      audioRef.current.volume = 0.3
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      })
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }, [enableSounds])

  const triggerVibration = useCallback((priority: NotificationPriority) => {
    if (!enableVibration || !navigator.vibrate) return

    const vibrationPatterns = {
      low: [100],
      normal: [200],
      high: [100, 50, 100],
      urgent: [200, 100, 200, 100, 200]
    }

    const pattern = vibrationPatterns[priority] || vibrationPatterns.normal
    navigator.vibrate(pattern)
  }, [enableVibration])

  // ============================================================================
  // Toast Management
  // ============================================================================

  const processToastQueue = useCallback(() => {
    if (toastQueue.length === 0 || activeToasts.size >= maxVisible) {
      return
    }

    const nextNotification = toastQueue[0]
    if (!nextNotification) return
    
    setToastQueue(prev => prev.slice(1))
    showToast(nextNotification)
  }, [toastQueue, activeToasts.size, maxVisible, showToast])

  const showToast = useCallback((notification: ToastNotification) => {
    const typeStyle = TOAST_STYLES[notification.type] || TOAST_STYLES.system
    const priorityStyle = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.normal
    
    const duration = notification.data?.persistent ? Infinity : 
      (notification.data?.duration || priorityStyle.duration || defaultDuration)

    const toastId = toast.custom(
      (t) => (
        <CustomToast
          notification={notification}
          onAction={() => {
            // Handle action
            if (notification.actionUrl) {
              window.open(notification.actionUrl, '_blank')
            }
            // Track click event
            // analyticsService.trackNotificationClick(notification.id)
          }}
          onDismiss={() => {
            toast.dismiss(t.id)
            setActiveToasts(prev => {
              const newMap = new Map(prev)
              newMap.delete(notification.id)
              return newMap
            })
          }}
          showAvatar={!!notification.data?.showAvatar}
        />
      ),
      {
        duration,
        position,
        id: notification.id
      }
    )

    // Update active toasts
    setActiveToasts(prev => new Map(prev).set(notification.id, {
      ...notification,
      toastId
    }))

    // Play sound and vibration
    playNotificationSound(notification.type)
    triggerVibration(notification.priority)

    // Auto-remove from active toasts when dismissed
    if (duration !== Infinity) {
      setTimeout(() => {
        setActiveToasts(prev => {
          const newMap = new Map(prev)
          newMap.delete(notification.id)
          return newMap
        })
      }, duration)
    }
  }, [position, defaultDuration, playNotificationSound, triggerVibration])

  // Process queue when active toasts change
  useEffect(() => {
    processToastQueue()
  }, [processToastQueue])

  // ============================================================================
  // Public API
  // ============================================================================

  const showNotificationToast = useCallback((
    notification: Notification | RealtimeNotification,
    options: NotificationToastOptions = {}
  ) => {
    const toastNotification: ToastNotification = {
      ...notification,
      isToast: true,
      data: {
        ...notification.data,
        ...options,
        actionLabel: options.actionLabel || notification.data?.actionLabel,
        persistent: options.persistent || false,
        showAvatar: options.showAvatar || false
      }
    }

    // Check if we should group similar notifications
    if (enableGrouping) {
      const existingToast = Array.from(activeToasts.values()).find(
        t => t.type === notification.type && 
             t.userId === notification.userId &&
             Date.now() - new Date(t.createdAt).getTime() < 30000 // Within 30 seconds
      )

      if (existingToast && existingToast.toastId) {
        // Update existing toast instead of creating new one
        toast.dismiss(existingToast.toastId)
        setActiveToasts(prev => {
          const newMap = new Map(prev)
          newMap.delete(existingToast.id)
          return newMap
        })
      }
    }

    // Add to queue or show immediately
    if (activeToasts.size < maxVisible) {
      showToast(toastNotification)
    } else {
      setToastQueue(prev => [...prev, toastNotification])
    }
  }, [activeToasts, maxVisible, enableGrouping, showToast])

  const dismissToast = useCallback((notificationId: string) => {
    const activeToast = activeToasts.get(notificationId)
    if (activeToast?.toastId) {
      toast.dismiss(activeToast.toastId)
    }
    
    setActiveToasts(prev => {
      const newMap = new Map(prev)
      newMap.delete(notificationId)
      return newMap
    })
  }, [activeToasts])

  const dismissAllToasts = useCallback(() => {
    toast.dismiss()
    setActiveToasts(new Map())
    setToastQueue([])
  }, [])

  const clearQueue = useCallback(() => {
    setToastQueue([])
  }, [])

  // ============================================================================
  // Expose API via ref or context
  // ============================================================================

  // Make the API available globally
  useEffect(() => {
    // Attach to window for global access
    if (typeof window !== 'undefined') {
      interface NotificationToastAPI {
        show: typeof showNotificationToast
        dismiss: typeof dismissToast
        dismissAll: typeof dismissAllToasts
        clearQueue: typeof clearQueue
      }
      
      (window as typeof window & { notificationToast?: NotificationToastAPI }).notificationToast = {
        show: showNotificationToast,
        dismiss: dismissToast,
        dismissAll: dismissAllToasts,
        clearQueue
      }
    }
  }, [showNotificationToast, dismissToast, dismissAllToasts, clearQueue])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`notification-toast-system ${className}`}>
      <Toaster
        position={position}
        toastOptions={{
          className: 'notification-toast-container',
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0
          }
        }}
        containerStyle={{
          top: position.includes('top') ? 20 : undefined,
          bottom: position.includes('bottom') ? 20 : undefined,
          left: position.includes('left') ? 20 : undefined,
          right: position.includes('right') ? 20 : undefined,
          zIndex: 9999
        }}
      />
      
      {/* Queue indicator */}
      {toastQueue.length > 0 && (
        <div className="toast-queue-indicator fixed bottom-4 right-4 z-50">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
            +{toastQueue.length} more
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Hook for using the toast system
// ============================================================================

export function useNotificationToast() {
  const showToast = useCallback((
    notification: Notification | RealtimeNotification,
    options?: NotificationToastOptions
  ) => {
    if (typeof window !== 'undefined') {
      const windowWithToast = window as typeof window & { 
        notificationToast?: {
          show: (notification: Notification | RealtimeNotification, options?: NotificationToastOptions) => void
          dismiss: (notificationId: string) => void
          dismissAll: () => void
        }
      }
      windowWithToast.notificationToast?.show(notification, options)
    }
  }, [])

  const dismissToast = useCallback((notificationId: string) => {
    if (typeof window !== 'undefined') {
      const windowWithToast = window as typeof window & { 
        notificationToast?: {
          show: (notification: Notification | RealtimeNotification, options?: NotificationToastOptions) => void
          dismiss: (notificationId: string) => void
          dismissAll: () => void
        }
      }
      windowWithToast.notificationToast?.dismiss(notificationId)
    }
  }, [])

  const dismissAllToasts = useCallback(() => {
    if (typeof window !== 'undefined') {
      const windowWithToast = window as typeof window & { 
        notificationToast?: {
          show: (notification: Notification | RealtimeNotification, options?: NotificationToastOptions) => void
          dismiss: (notificationId: string) => void
          dismissAll: () => void
        }
      }
      windowWithToast.notificationToast?.dismissAll()
    }
  }, [])

  return {
    showToast,
    dismissToast,
    dismissAllToasts
  }
}

export default NotificationToastSystem