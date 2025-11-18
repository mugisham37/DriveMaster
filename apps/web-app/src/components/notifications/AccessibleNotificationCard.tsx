/**
 * Accessible Notification Card
 * 
 * Enhanced notification card with full accessibility and mobile support
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 30.1, 30.2, 30.3, 30.4
 */

"use client";

import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2, Clock, ExternalLink } from 'lucide-react';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getNotificationAriaLabel, announceToScreenReader } from '@/utils/accessibility';
import type { Notification } from '@/types/notification-service';

export interface AccessibleNotificationCardProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  onSnooze?: (id: string, duration: number) => void;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export function AccessibleNotificationCard({
  notification,
  onRead,
  onDelete,
  onClick,
  onSnooze,
  compact = false,
  showActions = true,
  className = '',
}: AccessibleNotificationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { trigger: triggerHaptic } = useHapticFeedback();

  const isRead = notification.status.isRead;
  const isUrgent = notification.priority === 'urgent' || notification.priority === 'high';

  // Touch gestures
  const touchHandlers = useTouchGestures({
    onSwipeLeft: () => {
      if (onDelete) {
        triggerHaptic('warning');
        setSwipeOffset(-80);
      }
    },
    onSwipeRight: () => {
      setSwipeOffset(0);
    },
    onLongPress: () => {
      triggerHaptic('medium');
      // Could open context menu
    },
  });

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onRead?.(notification.id);
    announceToScreenReader(
      `Notification marked as ${isRead ? 'unread' : 'read'}`,
      'polite'
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('warning');
    onDelete?.(notification.id);
    announceToScreenReader('Notification deleted', 'polite');
  };

  const handleClick = () => {
    triggerHaptic('light');
    onClick?.(notification);
    if (!isRead) {
      onRead?.(notification.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Delete' && onDelete) {
      e.preventDefault();
      handleDelete(e as unknown as React.MouseEvent);
    } else if (e.key === 'm' && onRead) {
      e.preventDefault();
      handleMarkRead(e as unknown as React.MouseEvent);
    }
  };

  const ariaLabel = getNotificationAriaLabel(
    notification.type,
    notification.title,
    isRead,
    notification.priority
  );

  return (
    <div className="relative">
      {/* Swipe action background */}
      {swipeOffset < 0 && (
        <div 
          className="absolute right-0 top-0 bottom-0 bg-destructive flex items-center justify-center px-4 rounded-r-lg"
          style={{ width: Math.abs(swipeOffset) }}
        >
          <Trash2 className="w-5 h-5 text-destructive-foreground" />
        </div>
      )}

      <Card
        ref={cardRef}
        className={`
          relative cursor-pointer transition-all
          ${!isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''}
          ${isUrgent ? 'border-destructive' : ''}
          ${!prefersReducedMotion ? 'hover:shadow-md' : ''}
          ${className}
        `}
        style={{
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: prefersReducedMotion ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...touchHandlers}
        role="article"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <div className={`p-4 ${compact ? 'py-3' : ''}`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            {notification.iconUrl && (
              <div className="flex-shrink-0">
                <img
                  src={notification.iconUrl}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 
                  className={`font-semibold ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}
                  id={`notification-title-${notification.id}`}
                >
                  {notification.title}
                </h3>
                
                {/* Priority badge */}
                {isUrgent && (
                  <Badge 
                    variant="destructive" 
                    className="flex-shrink-0"
                    aria-label={`${notification.priority} priority`}
                  >
                    {notification.priority}
                  </Badge>
                )}
              </div>

              <p 
                className={`text-sm mt-1 ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}
                aria-describedby={`notification-title-${notification.id}`}
              >
                {notification.body}
              </p>

              {/* Timestamp */}
              <time 
                className="text-xs text-muted-foreground mt-2 block"
                dateTime={notification.createdAt.toISOString()}
                aria-label={`Received ${formatTimeForScreenReader(notification.createdAt)}`}
              >
                {formatRelativeTime(notification.createdAt)}
              </time>

              {/* Actions */}
              {showActions && (isHovered || compact) && (
                <div 
                  className="flex items-center gap-2 mt-3"
                  role="group"
                  aria-label="Notification actions"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkRead}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </Button>

                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="min-h-[44px] min-w-[44px]"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}

                  {notification.actionUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="min-h-[44px]"
                      aria-label="Open notification link"
                    >
                      <a 
                        href={notification.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function formatTimeForScreenReader(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}

export default AccessibleNotificationCard;
