/**
 * Notification Item Component
 * 
 * Individual notification display component with actions, status indicators,
 * and accessibility features.
 */

'use client'

import React, { useCallback } from 'react'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { NotificationType } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface LocalNotification {
  id: string
  title: string
  body?: string
  type: NotificationType
  timestamp: Date
  isRead?: boolean
  actionUrl?: string
  imageUrl?: string
  iconUrl?: string
  data?: Record<string, unknown>
}

export interface NotificationItemProps {
  notification: LocalNotification
  onMarkAsRead?: () => void
  onClick?: () => void
  onDelete?: () => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_STYLES: Record<NotificationType, {
  icon: string
  iconColor: string
  bgColor: string
  borderColor: string
}> = {
  achievement: {
    icon: 'trophy',
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  spaced_repetition: {
    icon: 'academic-cap',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  streak_reminder: {
    icon: 'fire',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  mock_test_reminder: {
    icon: 'clipboard-document-check',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  system: {
    icon: 'cog',
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  mentoring: {
    icon: 'users',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  course_update: {
    icon: 'document-text',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  community: {
    icon: 'chat-bubble-left-right',
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  marketing: {
    icon: 'megaphone',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  onDelete,
  showActions = true,
  compact = false,
  className = ''
}: NotificationItemProps): React.JSX.Element {
  const typeStyle = TYPE_STYLES[notification.type] || TYPE_STYLES.system
  
  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleClick = useCallback((event: React.MouseEvent) => {
    // Don't trigger click if clicking on action buttons
    if ((event.target as HTMLElement).closest('.notification-actions')) {
      return
    }
    onClick?.()
  }, [onClick])

  const handleMarkAsRead = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    onMarkAsRead?.()
  }, [onMarkAsRead])

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    onDelete?.()
  }, [onDelete])

  const handleActionClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
    }
  }, [notification.actionUrl])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return timestamp.toLocaleDateString()
  }

  const renderIcon = () => {
    if (notification.iconUrl) {
      return (
        <img
          src={notification.iconUrl}
          alt=""
          className="w-8 h-8 rounded-full"
        />
      )
    }

    return (
      <div className={`
        flex items-center justify-center w-8 h-8 rounded-full
        ${typeStyle.bgColor} ${typeStyle.borderColor} border
      `}>
        <Icon 
          icon={typeStyle.icon} 
          className={`w-4 h-4 ${typeStyle.iconColor}`} 
        />
      </div>
    )
  }

  const renderActions = () => {
    if (!showActions) return null

    return (
      <div className="notification-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && onMarkAsRead && (
          <FormButton
            onClick={handleMarkAsRead}
            className="btn-ghost btn-xs"
            title="Mark as read"
          >
            <Icon icon="check" className="w-3 h-3" />
          </FormButton>
        )}
        
        {notification.actionUrl && (
          <FormButton
            onClick={handleActionClick}
            className="btn-ghost btn-xs"
            title="Open link"
          >
            <Icon icon="arrow-top-right-on-square" className="w-3 h-3" />
          </FormButton>
        )}
        
        {onDelete && (
          <FormButton
            onClick={handleDelete}
            className="btn-ghost btn-xs text-red-600 hover:text-red-700"
            title="Delete notification"
          >
            <Icon icon="trash" className="w-3 h-3" />
          </FormButton>
        )}
      </div>
    )
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div
      className={`
        notification-item group relative p-4 border-b border-borderColor6 
        hover:bg-gray-50 transition-colors cursor-pointer
        ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
        ${compact ? 'py-2' : ''}
        ${className}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // Create a synthetic mouse event for the click handler
          const syntheticEvent = {
            ...e,
            target: e.target,
            currentTarget: e.currentTarget,
            stopPropagation: e.stopPropagation.bind(e),
            preventDefault: e.preventDefault.bind(e)
          } as unknown as React.MouseEvent
          handleClick(syntheticEvent)
        }
      }}
      aria-label={`Notification: ${notification.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`
                font-medium leading-tight
                ${!notification.isRead ? 'text-textColor2' : 'text-textColor4'}
                ${compact ? 'text-sm' : 'text-base'}
              `}>
                {notification.title}
              </h4>
              
              {notification.body && (
                <p className={`
                  text-textColor6 mt-1 leading-relaxed
                  ${compact ? 'text-xs' : 'text-sm'}
                `}>
                  {notification.body}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`
                  text-textColor6 
                  ${compact ? 'text-xs' : 'text-sm'}
                `}>
                  {formatTimestamp(notification.timestamp)}
                </span>
                
                {!notification.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full" aria-label="Unread" />
                )}
              </div>
            </div>

            {/* Actions */}
            {renderActions()}
          </div>

          {/* Image */}
          {notification.imageUrl && (
            <div className="mt-3">
              <img
                src={notification.imageUrl}
                alt=""
                className="max-w-full h-auto rounded-8 max-h-48 object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationItem