/**
 * Local Notification Component Types
 * 
 * Types specific to notification UI components that may differ from
 * the main notification service types.
 */

import type { NotificationType } from '@/types/notification-service'

// ============================================================================
// Local Notification Types
// ============================================================================

export interface Notification {
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

// ============================================================================
// Component Props Types
// ============================================================================

export interface NotificationComponentProps {
  className?: string
  onClose?: () => void
}

export interface NotificationListProps extends NotificationComponentProps {
  notifications: Notification[]
  onNotificationClick?: (notification: Notification) => void
  onNotificationAction?: (notification: Notification, action: string) => void
}

// ============================================================================
// Event Types
// ============================================================================

export interface NotificationActionEvent {
  notification: Notification
  action: 'read' | 'delete' | 'click' | 'dismiss'
  timestamp: Date
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface NotificationFilters {
  type?: NotificationType | 'all'
  status?: 'read' | 'unread' | 'all'
  dateRange?: 'today' | 'week' | 'month' | 'all'
}

export interface NotificationSort {
  field: 'timestamp' | 'type' | 'status'
  direction: 'asc' | 'desc'
}