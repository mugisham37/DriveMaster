'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { NotificationIcon } from './atoms/NotificationIcon';
import { NotificationTimestamp } from './atoms/NotificationTimestamp';
import { NotificationPriorityBadge } from './atoms/NotificationPriorityBadge';
import { notificationDeduplicationManager } from '@/utils/notificationDeduplication';
import { notificationEngagementTracker } from '@/utils/notificationEngagement';
import { notificationOfflineQueue } from '@/utils/notificationOfflineQueue';
import type { Notification, NotificationPriority } from '@/types/notifications';

export interface NotificationToastSystemProps {
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
  maxToasts?: number;
  autoClose?: boolean;
  enableSound?: boolean;
  className?: string;
}

interface ToastNotification extends Notification {
  toastId?: string | number;
}

// Deduplication cache to prevent showing same notification multiple times
const recentToasts = new Map<string, number>();
const DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutes

export function NotificationToastSystem({
  position = 'top-right',
  maxToasts = 3,
  autoClose = true,
  enableSound = true,
  className = '',
}: NotificationToastSystemProps) {
  const [toastQueue, setToastQueue] = useState<ToastNotification[]>([]);
  const [displayedToasts, setDisplayedToasts] = useState<Set<string>>(new Set());
  
  const { notifications: realtimeNotifications, connectionStatus } = useRealtimeNotifications();
  const { playSound, isEnabled: soundEnabled } = useNotificationSound();

  // Clean up old entries from deduplication cache
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [id, timestamp] of recentToasts.entries()) {
        if (now - timestamp > DEDUP_WINDOW) {
          recentToasts.delete(id);
        }
      }
    }, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, []);

  // Check if notification should be deduplicated using the manager
  const shouldDedup = useCallback((notification: Notification): boolean => {
    return !notificationDeduplicationManager.shouldShow({
      id: notification.id,
      title: notification.title,
      body: notification.body,
    });
  }, []);

  // Get auto-dismiss duration based on priority
  const getAutoDismissDuration = useCallback((priority: NotificationPriority): number => {
    switch (priority) {
      case 'critical':
        return 10000; // 10 seconds
      case 'urgent':
        return 7000; // 7 seconds
      case 'high':
        return 5000; // 5 seconds
      case 'normal':
      case 'low':
      default:
        return 4000; // 4 seconds
    }
  }, []);

  // Display a notification toast
  const displayToast = useCallback(
    (notification: Notification) => {
      // Check deduplication
      if (shouldDedup(notification)) {
        console.log('Skipping duplicate notification:', notification.id);
        return;
      }

      // Mark as shown
      recentToasts.set(notification.id, Date.now());
      setDisplayedToasts((prev) => new Set(prev).add(notification.id));

      // Track delivery event
      notificationEngagementTracker.trackDelivery(
        notification.id,
        notification.userId,
        'in-app',
        notification.id // Using notification ID as correlation ID
      );

      // Play sound if enabled
      if (enableSound && soundEnabled && (notification.priority === 'urgent' || notification.priority === 'critical')) {
        playSound(notification.type);
      }

      // Trigger vibration for urgent notifications on mobile
      if (
        typeof window !== 'undefined' &&
        'vibrate' in navigator &&
        (notification.priority === 'urgent' || notification.priority === 'critical')
      ) {
        navigator.vibrate([200, 100, 200]);
      }

      // Determine toast variant based on notification type/priority
      const getToastVariant = () => {
        if (notification.priority === 'critical' || notification.priority === 'urgent') {
          return 'destructive';
        }
        return 'default';
      };

      // Custom toast content
      const toastContent = (
        <div className="flex items-start gap-3 w-full">
          <NotificationIcon
            type={notification.type}
            priority={notification.priority}
            isRead={false}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm truncate">{notification.title}</p>
              <NotificationPriorityBadge priority={notification.priority} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
            <NotificationTimestamp timestamp={new Date(notification.createdAt)} format="relative" className="text-xs mt-1" />
          </div>
        </div>
      );

      // Show toast with appropriate settings
      const toastId = toast(toastContent, {
        duration: autoClose ? getAutoDismissDuration(notification.priority) : Infinity,
        // @ts-ignore - sonner types may not include all props
        variant: getToastVariant(),
        dismissible: true,
        onDismiss: () => {
          setDisplayedToasts((prev) => {
            const next = new Set(prev);
            next.delete(notification.id);
            return next;
          });
          // Track dismiss event
          notificationEngagementTracker.trackDismiss(
            notification.id,
            notification.userId,
            'in-app',
            notification.id,
            'user_dismissed'
          );
        },
        onAutoClose: () => {
          setDisplayedToasts((prev) => {
            const next = new Set(prev);
            next.delete(notification.id);
            return next;
          });
        },
        action: notification.actionUrl
          ? {
              label: 'View',
              onClick: () => {
                // Track click event
                notificationEngagementTracker.trackClick(
                  notification.id,
                  notification.userId,
                  'in-app',
                  notification.id,
                  notification.actionUrl
                );
                if (notification.actionUrl) {
                  window.location.href = notification.actionUrl;
                }
              },
            }
          : undefined,
      });

      // Store toast ID with notification
      const toastNotification: ToastNotification = {
        ...notification,
        toastId,
      };

      setToastQueue((prev) => [...prev, toastNotification]);
    },
    [shouldDedup, enableSound, soundEnabled, playSound, autoClose, getAutoDismissDuration]
  );

  // Process queue when new notifications arrive
  useEffect(() => {
    if (!realtimeNotifications || realtimeNotifications.length === 0) return;

    // Get new notifications that haven't been displayed yet
    const newNotifications = realtimeNotifications.filter(
      (n) => !displayedToasts.has(n.id)
    );

    if (newNotifications.length === 0) return;

    // Sort by priority (critical/urgent first)
    const sortedNotifications = [...newNotifications].sort((a, b) => {
      const priorityOrder: Record<NotificationPriority, number> = {
        critical: 0,
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Display notifications respecting max toast limit
    sortedNotifications.forEach((notification, index) => {
      // For urgent/critical, dismiss normal priority toasts to make room
      if (
        (notification.priority === 'urgent' || notification.priority === 'critical') &&
        displayedToasts.size >= maxToasts
      ) {
        // Dismiss oldest normal priority toast
        const oldestNormalToast = toastQueue.find(
          (t) => t.priority === 'normal' || t.priority === 'low'
        );
        if (oldestNormalToast && oldestNormalToast.toastId) {
          toast.dismiss(oldestNormalToast.toastId);
        }
      }

      // Add slight delay between toasts for better UX
      setTimeout(() => {
        displayToast(notification);
      }, index * 100);
    });
  }, [realtimeNotifications, displayedToasts, maxToasts, toastQueue, displayToast]);

  // Connection status indicator
  const connectionIndicator = useMemo(() => {
    if (connectionStatus === 'connected') return null;

    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected - Reconnecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
          </span>
        </div>
      </div>
    );
  }, [connectionStatus]);

  return (
    <>
      <Toaster
        position={position}
        toastOptions={{
          className: className,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
        closeButton
        richColors
        expand={false}
        visibleToasts={maxToasts}
      />
      {connectionIndicator}
    </>
  );
}

export default NotificationToastSystem;
