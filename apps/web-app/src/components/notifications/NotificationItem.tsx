'use client'

import React from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/common/Avatar'
import { ExerciseIcon } from '@/components/common/ExerciseIcon'
import { TrackIcon } from '@/components/common/TrackIcon'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface Notification {
  id: string
  uuid: string
  type: string
  url: string
  text: string
  imageType: 'avatar' | 'icon' | 'exercise' | 'track'
  imageUrl: string
  createdAt: string
  readAt?: string
  isRead: boolean
  status: 'pending' | 'unread' | 'read'
  links: {
    markAsRead: string
    all: string
  }
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
  }

  const renderImage = () => {
    const commonProps = {
      className: "w-10 h-10 rounded-full",
      alt: ""
    }

    switch (notification.imageType) {
      case 'avatar':
        return <Avatar src={notification.imageUrl} {...commonProps} />
      case 'exercise':
        return <ExerciseIcon iconUrl={notification.imageUrl} {...commonProps} />
      case 'track':
        return <TrackIcon iconUrl={notification.imageUrl} {...commonProps} />
      case 'icon':
      default:
        return <GraphicalIcon icon={notification.imageUrl} {...commonProps} />
    }
  }

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'acquired_badge':
        return 'trophy'
      case 'mentor_started_discussion':
      case 'mentor_replied_to_discussion':
      case 'student_replied_to_discussion':
        return 'mentoring'
      case 'mentor_finished_discussion':
      case 'student_finished_discussion':
        return 'completed-check-circle'
      default:
        return 'notification'
    }
  }

  const formatDate = (dateString: string) => {
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

  return (
    <div 
      className={`notification-item p-4 border rounded-lg transition-colors ${
        notification.isRead 
          ? 'bg-backgroundColorA border-borderColor7' 
          : 'bg-backgroundColorB border-borderColor6'
      }`}
    >
      <Link 
        href={notification.url}
        onClick={handleClick}
        className="flex items-start gap-4 hover:no-underline"
      >
        <div className="flex-shrink-0 relative">
          {renderImage()}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-backgroundColorA rounded-full flex items-center justify-center border border-borderColor7">
            <GraphicalIcon 
              icon={getTypeIcon()} 
              className="w-3 h-3 text-textColor6"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p 
              className={`text-15 leading-150 ${
                notification.isRead ? 'text-textColor6' : 'text-textColor2 font-medium'
              }`}
              dangerouslySetInnerHTML={{ __html: notification.text }}
            />
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-13 text-textColor6">
                {formatDate(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-prominentLinkColor rounded-full"></div>
              )}
            </div>
          </div>

          {notification.readAt && (
            <p className="text-12 text-textColor6 mt-1">
              Read {formatDate(notification.readAt)}
            </p>
          )}
        </div>
      </Link>
    </div>
  )
}