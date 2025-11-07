'use client'

import React from 'react'

export interface NotificationsListProps {
  notifications?: unknown[]
  onNotificationClick?: (id: string) => void
}

export function NotificationsList({ notifications = [], onNotificationClick }: NotificationsListProps) {
  return (
    <div className="notifications-list">
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul>
          {notifications.map((_, index) => (
            <li key={index} onClick={() => onNotificationClick?.(`notification-${index}`)}>
              Notification {index + 1}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default NotificationsList
