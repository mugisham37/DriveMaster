'use client'

import React from 'react'
import Link from 'next/link'
import type { Notification } from './types'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.status.isRead) {
      onMarkAsRead()
    }
  }

  return (
    <div 
      className={`notification-item p-4 border rounded-lg transition-colors ${
        notification.status.isRead 
          ? 'bg-backgroundColorA border-borderColor7' 
          : 'bg-backgroundColorB border-borderColor6'
      }`}
    >
      <Link 
        href={notification.links.view}
        onClick={handleClick}
        className="flex items-start gap-4 hover:no-underline"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 
              className={`text-15 leading-150 ${
                notification.status.isRead ? 'text-textColor6' : 'text-textColor2 font-medium'
              }`}
            >
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <time className="text-13 text-textColor6">
                {formatDate(notification.timestamp)}
              </time>
              {!notification.status.isRead && (
                <div className="w-2 h-2 bg-prominentLinkColor rounded-full"></div>
              )}
            </div>
          </div>

          <p className="c-notification-item__message mt-2">{notification.content}</p>
        </div>
      </Link>
    </div>
  )
}