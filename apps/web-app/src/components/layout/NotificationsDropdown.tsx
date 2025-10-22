'use client';

import React, { useEffect, useRef, useState } from 'react'
import consumer from '../../utils/action-cable-consumer'
import { GraphicalIcon } from '../common/GraphicalIcon'
import { NotificationsIcon } from './notifications/NotificationsIcon'
import { NotificationItem } from '../notifications/NotificationItem'
import { Notification as NotificationType } from '../../types'
import { useNotificationDropdown } from './notifications/useNotificationDropdown'
import { DropdownAttributes } from '../../hooks/useAdvancedDropdown'
import { usePaginatedRequestQuery } from '../../hooks/request-query'
import { useErrorHandler, ErrorBoundary } from '../ErrorBoundary'
import { Loading } from '../common/Loading'
import { QueryStatus, useQueryClient } from '@tanstack/react-query'
import { NotificationsChannel } from '../../lib/realtime/channels/notifications-channel'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type APIResponse = {
  results: NotificationType[]
  meta: {
    total: number
    unreadCount: number
    links: {
      all: string
    }
  }
}

const DEFAULT_ERROR = new Error('Unable to load notifications')

const ErrorMessage = ({ error }: { error: unknown }) => {
  useErrorHandler(error, { defaultError: DEFAULT_ERROR })

  return null
}

const ErrorFallback = ({ error }: { error: Error }) => {
  return <p>{error.message}</p>
}

const DropdownContent = ({
  data,
  status,
  error,
  listAttributes,
  itemAttributes,
}: {
  data: APIResponse | undefined
  status: QueryStatus
  error: unknown
} & Pick<DropdownAttributes, 'listAttributes' | 'itemAttributes'>) => {
  const { t } = useAppTranslation('components/dropdowns')
  if (data) {
    return (
      <ul {...listAttributes}>
        {data.results.map((notification, i) => {
          return (
            <li {...itemAttributes(i)} key={i}>
              <NotificationItem notification={notification} onMarkAsRead={() => {}} />
            </li>
          )
        })}
        <li {...itemAttributes(data.results.length)}>
          <a href={data.meta.links.all} className="c-prominent-link">
            <span>{t('notifications.seeAllYourNotifications')}</span>
            <GraphicalIcon icon="arrow-right" />
          </a>
        </li>
      </ul>
    )
  } else {
    const { id, hidden } = listAttributes

    return (
      <div id={id} hidden={hidden}>
        {status === 'pending' ? <Loading /> : null}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorMessage error={error} />
        </ErrorBoundary>
      </div>
    )
  }
}

const MAX_NOTIFICATIONS = 5
export const NOTIFICATIONS_CACHE_KEY = 'notifications'

export function NotificationsDropdown({
  endpoint,
}: {
  endpoint: string
}): JSX.Element {
  const queryClient = useQueryClient()
  const {
    data: resolvedData,
    error,
    status,
  } = usePaginatedRequestQuery<APIResponse, unknown>(
    [NOTIFICATIONS_CACHE_KEY],
    {
      endpoint: endpoint,
      query: { per_page: MAX_NOTIFICATIONS },
      options: {
        staleTime: 30 * 1000,
        refetchOnMount: true,
      },
    }
  )
  const {
    buttonAttributes,
    panelAttributes,
    listAttributes,
    itemAttributes,
    open,
  } = useNotificationDropdown(resolvedData)

  const connectionRef = useRef<NotificationsChannel | null>(null)

  useEffect(() => {
    if (!connectionRef.current) {
      connectionRef.current = new NotificationsChannel((message) => {
        if (!message) return

        if (message.type === 'notifications.changed' && listAttributes.hidden) {
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_CACHE_KEY] })
        }
      })
    }

    if (!listAttributes.hidden) {
      queryClient.refetchQueries({ queryKey: [NOTIFICATIONS_CACHE_KEY] })
    }

    return () => {
      connectionRef.current?.disconnect()
      connectionRef.current = null
    }
  }, [listAttributes.hidden, queryClient])

  return (
    <div className="notifications-dropdown" ref={dropdownRef}>
      <button
        className="notifications-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon icon="notification" alt="Notifications" />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown-content">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <Link 
              href="/notifications" 
              className="view-all-link"
              onClick={() => setIsOpen(false)}
            >
              View all
            </Link>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <Icon icon="notification-empty" alt="" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.url}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="notification-content">
                    <p>{notification.text}</p>
                    <time className="notification-time">
                      {formatTime(notification.createdAt)}
                    </time>
                  </div>
                  {!notification.isRead && (
                    <div className="unread-indicator" />
                  )}
                </Link>
              ))
            )}
          </div>

          {notifications.length > 5 && (
            <div className="notifications-footer">
              <Link 
                href="/notifications" 
                className="view-all-btn"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}