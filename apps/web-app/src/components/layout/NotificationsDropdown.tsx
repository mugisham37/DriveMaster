'use client';

import React, { useEffect, useRef } from 'react';
import { Icon } from '../common/Icon';
import Link from 'next/link';
import Image from 'next/image';
import type { APIResponse, NotificationsDropdownProps } from '../notifications/types';
import { useNotificationDropdown } from '../notifications/useNotificationDropdown';
import { usePaginatedRequestQuery } from '../../hooks/request-query';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationsChannel } from '../../lib/realtime/channels/notifications-channel';
import { useAppTranslation } from '../../hooks/use-app-translation';
import { useErrorHandler } from '../../hooks/use-error-handler';
import { ErrorBoundary } from 'react-error-boundary';
import { NotificationItem } from '../notifications/NotificationItem';
import { GraphicalIcon } from '../common/GraphicalIcon';
import { Loading } from '../common/Loading';

const MAX_NOTIFICATIONS = 5;
export const NOTIFICATIONS_CACHE_KEY = 'notifications';

const DEFAULT_ERROR = 'Something went wrong loading notifications';

type QueryStatus = 'pending' | 'error' | 'success';

interface DropdownAttributes {
  listAttributes: {
    id: string;
    hidden: boolean;
  };
  itemAttributes: (index: number) => Record<string, unknown>;
}

const ErrorMessage = ({ error }: { error: unknown }) => {
  useErrorHandler(error, { defaultError: DEFAULT_ERROR });
  return null;
};

const ErrorFallback = ({ error }: { error: Error }) => {
  return <p>{error.message}</p>;
};

const DropdownContent = ({
  data,
  status,
  error,
  listAttributes,
  itemAttributes,
}: {
  data: APIResponse | undefined;
  status: QueryStatus;
  error: unknown;
} & Pick<DropdownAttributes, 'listAttributes' | 'itemAttributes'>) => {
  const { t } = useAppTranslation('components/dropdowns');
  
  if (data) {
    return (
      <ul {...listAttributes}>
        {data.results.map((notification, i) => {
          return (
            <li {...itemAttributes(i)} key={i}>
              <NotificationItem notification={notification} onMarkAsRead={() => {}} />
            </li>
          );
        })}
        <li {...itemAttributes(data.results.length)}>
          <a href={data.meta.links.all} className="c-prominent-link">
            <span>{t('notifications.seeAllYourNotifications')}</span>
            <GraphicalIcon icon="arrow-right" />
          </a>
        </li>
      </ul>
    );
  } else {
    const { id, hidden } = listAttributes;

    return (
      <div id={id} hidden={hidden}>
        {status === 'pending' ? <Loading /> : null}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorMessage error={error} />
        </ErrorBoundary>
      </div>
    );
  }
};

export function NotificationsDropdown({ endpoint }: NotificationsDropdownProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { t } = useAppTranslation('components/dropdowns');
  
  const { data: resolvedData } = usePaginatedRequestQuery<APIResponse>([NOTIFICATIONS_CACHE_KEY], {
    endpoint,
    query: { per_page: MAX_NOTIFICATIONS },
    options: { staleTime: 30 * 1000 }
  });

  const {
    buttonAttributes,
    panelAttributes,
    listAttributes,
    itemAttributes,
    isOpen,
    setIsOpen
  } = useNotificationDropdown(resolvedData);

  const connectionRef = useRef<NotificationsChannel | null>(null);
  const unreadCount = resolvedData?.meta.unreadCount || 0;

  useEffect(() => {
    if (!connectionRef.current) {
      connectionRef.current = new NotificationsChannel((message) => {
        if (!message) return;
        if (message.type === 'notifications.changed' && listAttributes.hidden) {
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_CACHE_KEY] });
        }
      });
    }

    if (!listAttributes.hidden) {
      queryClient.refetchQueries({ queryKey: [NOTIFICATIONS_CACHE_KEY] });
    }

    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, [listAttributes.hidden, queryClient]);

  return (
    <div className="c-notifications-dropdown">
      <button {...buttonAttributes} className="c-notifications-dropdown__button">
        <Icon icon="notification" alt={t('notifications.buttonLabel')} />
        {unreadCount > 0 && (
          <span className="c-notifications-dropdown__count">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div {...panelAttributes} className="c-notifications-dropdown__panel">
          <div className="c-notifications-dropdown__header">
            <h3>{t('notifications.title')}</h3>
            <Link 
              href="/notifications"
              className="c-notifications-dropdown__view-all"
              onClick={() => setIsOpen(false)}
            >
              {t('notifications.viewAll')}
            </Link>
          </div>

          {resolvedData && (
            <div {...listAttributes} className="c-notifications-dropdown__list">
              {resolvedData.results.length === 0 ? (
                <div className="c-notifications-dropdown__empty">
                  <Icon icon="notification-empty" alt="" />
                  <p>{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                <>
                  {resolvedData.results.map((notification, index) => (
                    <div 
                      {...itemAttributes(index)}
                      key={notification.id}
                      className={`c-notifications-dropdown__item ${!notification.status.isRead ? 'is-unread' : ''}`}
                    >
                      <NotificationItem 
                        notification={notification}
                        onMarkAsRead={() => {
                          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_CACHE_KEY] });
                        }}
                      />
                    </div>
                  ))}

                  {resolvedData.results.length > MAX_NOTIFICATIONS && (
                    <Link
                      href="/notifications"
                      className="c-notifications-dropdown__more"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('notifications.showMore')}
                      <Image 
                        src="/assets/icons/arrow-right.svg"
                        alt=""
                        width={16}
                        height={16}
                      />
                    </Link>
                  )}
                </>
              )}
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