'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NotificationIcon } from '../atoms/NotificationIcon';
import { NotificationTimestamp } from '../atoms/NotificationTimestamp';
import { NotificationActionButton } from '../atoms/NotificationActionButton';
import { NotificationStatusIndicator } from '../atoms/NotificationStatusIndicator';
import { NotificationPriorityBadge } from '../atoms/NotificationPriorityBadge';
import { useNotificationMutations } from '@/hooks/useNotifications';
import type { Notification } from '@/types/notification-service';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'isomorphic-dompurify';

export interface NotificationCardProps {
  notification: Notification;
  compact?: boolean;
  showActions?: boolean;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  onSnooze?: (id: string, duration: number) => void;
  onArchive?: (id: string) => void;
  className?: string;
}

export function NotificationCard({
  notification,
  compact = false,
  showActions = true,
  onRead,
  onDelete,
  onClick,
  className,
}: NotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { markAsRead, deleteNotification } = useNotificationMutations();

  const handleClick = () => {
    if (!notification.status.isRead) {
      markAsRead.mutate(notification.id);
      onRead?.(notification.id);
    }

    if (onClick) {
      onClick(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification.mutate(notification.id);
    onDelete?.(notification.id);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead.mutate(notification.id);
    onRead?.(notification.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const shouldTruncate = notification.body.length > 200 && !isExpanded;
  const displayBody = shouldTruncate
    ? `${notification.body.substring(0, 200)}...`
    : notification.body;

  // Sanitize markdown content
  const sanitizedBody = DOMPurify.sanitize(displayBody, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        !notification.status.isRead && 'border-l-4 border-l-blue-500 bg-blue-50/50',
        compact && 'p-2',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className={cn('flex gap-3', compact ? 'p-3' : 'p-4')}>
        {/* Icon */}
        <div className="flex-shrink-0">
          <NotificationIcon
            type={notification.type}
            iconUrl={notification.iconUrl}
            priority={notification.priority}
            isRead={notification.status.isRead}
            size={compact ? 'sm' : 'md'}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={cn(
                'font-semibold text-sm',
                !notification.status.isRead && 'font-bold'
              )}
            >
              {notification.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationPriorityBadge
                priority={notification.priority}
                size="sm"
              />
              <NotificationStatusIndicator
                status={notification.status.deliveryStatus}
                size="sm"
              />
            </div>
          </div>

          {/* Body */}
          <div className={cn('text-sm text-muted-foreground mb-2', compact && 'text-xs')}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {sanitizedBody}
            </ReactMarkdown>
            {notification.body.length > 200 && (
              <button
                onClick={handleToggleExpand}
                className="text-blue-600 hover:underline text-xs mt-1"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Image */}
          {notification.imageUrl && (
            <div className="mb-2">
              <img
                src={notification.imageUrl}
                alt={notification.title}
                className="rounded-md max-w-full h-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <NotificationTimestamp
              timestamp={notification.createdAt}
              format="relative"
              className="text-xs"
            />

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.status.isRead && (
                  <NotificationActionButton
                    action="markRead"
                    size="sm"
                    onAction={handleMarkAsRead}
                    loading={markAsRead.isPending}
                  />
                )}
                <NotificationActionButton
                  action="delete"
                  size="sm"
                  variant="ghost"
                  onAction={handleDelete}
                  loading={deleteNotification.isPending}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
