/**
 * Memoization Utilities
 * Prevents unnecessary re-renders and computations
 */

import { useMemo, useCallback, memo } from 'react';
import type { Notification, NotificationQueryParams } from '@/types/notifications';

/**
 * Memoized notification grouping by date
 */
export const useGroupedNotifications = (notifications: Notification[]) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      thisWeek: [] as Notification[],
      older: [] as Notification[],
    };

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notifDate >= thisWeek) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [notifications]);
};

/**
 * Memoized notification filtering
 */
export const useFilteredNotifications = (
  notifications: Notification[],
  filters: NotificationQueryParams
) => {
  return useMemo(() => {
    let filtered = [...notifications];

    // Filter by type
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((n) => filters.type?.includes(n.type));
    }

    // Filter by read status
    if (filters.isRead !== undefined) {
      filtered = filtered.filter((n) => n.status.isRead === filters.isRead);
    }

    // Filter by search query
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.body.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (n) => new Date(n.createdAt) >= new Date(filters.startDate!)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (n) => new Date(n.createdAt) <= new Date(filters.endDate!)
      );
    }

    return filtered;
  }, [notifications, filters]);
};

/**
 * Memoized notification statistics
 */
export const useNotificationStats = (notifications: Notification[]) => {
  return useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.status.isRead).length;
    const urgent = notifications.filter((n) => n.priority === 'urgent').length;

    const typeBreakdown = notifications.reduce(
      (acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      unread,
      urgent,
      read: total - unread,
      typeBreakdown,
    };
  }, [notifications]);
};

/**
 * Memoized comparison function for notification equality
 */
export const areNotificationsEqual = (
  prev: Notification,
  next: Notification
): boolean => {
  return (
    prev.id === next.id &&
    prev.status.isRead === next.status.isRead &&
    prev.updatedAt === next.updatedAt
  );
};

/**
 * Memoized notification card component
 */
export const createMemoizedNotificationCard = <P extends { notification: Notification }>(
  Component: React.ComponentType<P>
) => {
  return memo(Component, (prevProps, nextProps) => {
    return areNotificationsEqual(
      prevProps.notification,
      nextProps.notification
    );
  });
};

/**
 * Hook for memoized event handlers
 */
export const useMemoizedHandlers = <T extends Record<string, (...args: any[]) => any>>(
  handlers: T
): T => {
  const memoizedHandlers = {} as T;

  Object.keys(handlers).forEach((key) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    memoizedHandlers[key as keyof T] = useCallback(
      handlers[key as keyof T],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    ) as T[keyof T];
  });

  return memoizedHandlers;
};

/**
 * Memoized selector for notification by ID
 */
export const useNotificationById = (
  notifications: Notification[],
  id: string
) => {
  return useMemo(
    () => notifications.find((n) => n.id === id),
    [notifications, id]
  );
};
