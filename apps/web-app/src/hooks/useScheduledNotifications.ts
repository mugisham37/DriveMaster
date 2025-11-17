/**
 * Scheduled Notifications Management Hook
 *
 * Provides hooks for managing scheduled notifications with timezone support,
 * recurring patterns, and calendar integration.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { notificationApiClient } from "@/lib/notification-service";
import { useAuth } from "./useAuth";
import { requireStringUserId } from "@/utils/user-id-helpers";
import type {
  ScheduledNotification,
  ScheduleNotificationRequest,
  RecurringPattern,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Query Keys
// ============================================================================

export const scheduledNotificationQueryKeys = {
  all: ["scheduledNotifications"] as const,
  lists: () => [...scheduledNotificationQueryKeys.all, "list"] as const,
  list: (userId: string, filters?: Record<string, unknown>) =>
    [...scheduledNotificationQueryKeys.lists(), userId, filters] as const,
  detail: (id: string) =>
    [...scheduledNotificationQueryKeys.all, "detail", id] as const,
};

// ============================================================================
// Scheduled Notifications Hook
// ============================================================================

export interface UseScheduledNotificationsOptions {
  type?: string;
  status?: "pending" | "sent" | "cancelled" | "failed";
  startDate?: Date;
  endDate?: Date;
  includeRecurring?: boolean;
}

export interface UseScheduledNotificationsResult {
  scheduledNotifications: ScheduledNotification[];
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;
  refetch: () => void;
  scheduleNotification: (
    request: ScheduleNotificationRequest,
  ) => Promise<ScheduledNotification>;
  cancelNotification: (id: string, reason?: string) => Promise<void>;
  rescheduleNotification: (id: string, newTime: Date) => Promise<void>;
  updateNotification: (
    id: string,
    updates: Partial<ScheduledNotification>,
  ) => Promise<void>;
}

/**
 * Hook for managing scheduled notifications
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function useScheduledNotifications(
  options: UseScheduledNotificationsOptions = {},
): UseScheduledNotificationsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userIdStr = user?.id ? requireStringUserId(user.id) : "";

  // Build filters
  const filters: Record<string, unknown> = {};
  if (options.type) filters.type = options.type;
  if (options.status) filters.status = options.status;
  if (options.startDate) filters.startDate = options.startDate.toISOString();
  if (options.endDate) filters.endDate = options.endDate.toISOString();
  if (options.includeRecurring !== undefined)
    filters.includeRecurring = options.includeRecurring;

  // Fetch scheduled notifications
  const query = useQuery({
    queryKey: scheduledNotificationQueryKeys.list(userIdStr, filters),
    queryFn: async () => {
      if (!userIdStr) throw new Error("User not authenticated");
      const response = await notificationApiClient.getScheduledNotifications(
        userIdStr,
        filters,
      );
      return response.notifications;
    },
    enabled: !!userIdStr,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Schedule notification mutation
  const scheduleNotificationMutation = useMutation({
    mutationFn: (request: ScheduleNotificationRequest) =>
      notificationApiClient.scheduleNotification(request),
    onSuccess: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({
          queryKey: scheduledNotificationQueryKeys.list(userIdStr),
        });
      }
    },
  });

  // Cancel notification mutation
  const cancelNotificationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      notificationApiClient.cancelScheduledNotification(id, reason),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: scheduledNotificationQueryKeys.list(userIdStr),
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        scheduledNotificationQueryKeys.list(userIdStr, filters),
      );

      // Optimistically update
      queryClient.setQueryData<ScheduledNotification[]>(
        scheduledNotificationQueryKeys.list(userIdStr, filters),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((notification) =>
            notification.id === id
              ? { ...notification, status: "cancelled" as const }
              : notification,
          );
        },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          scheduledNotificationQueryKeys.list(userIdStr, filters),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({
          queryKey: scheduledNotificationQueryKeys.list(userIdStr),
        });
      }
    },
  });

  // Reschedule notification mutation
  const rescheduleNotificationMutation = useMutation({
    mutationFn: ({ id, newTime }: { id: string; newTime: Date }) =>
      notificationApiClient.rescheduleNotification(id, newTime),
    onMutate: async ({ id, newTime }) => {
      await queryClient.cancelQueries({
        queryKey: scheduledNotificationQueryKeys.list(userIdStr),
      });

      const previousData = queryClient.getQueryData(
        scheduledNotificationQueryKeys.list(userIdStr, filters),
      );

      // Optimistically update
      queryClient.setQueryData<ScheduledNotification[]>(
        scheduledNotificationQueryKeys.list(userIdStr, filters),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((notification) =>
            notification.id === id
              ? { ...notification, scheduledFor: newTime }
              : notification,
          );
        },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          scheduledNotificationQueryKeys.list(userIdStr, filters),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({
          queryKey: scheduledNotificationQueryKeys.list(userIdStr),
        });
      }
    },
  });

  // Update notification mutation
  const updateNotificationMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ScheduledNotification>;
    }) => notificationApiClient.updateScheduledNotification(id, updates),
    onSuccess: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({
          queryKey: scheduledNotificationQueryKeys.list(userIdStr),
        });
      }
    },
  });

  return {
    scheduledNotifications: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
    scheduleNotification: scheduleNotificationMutation.mutateAsync,
    cancelNotification: (id: string, reason?: string) =>
      cancelNotificationMutation.mutateAsync({ id, reason }),
    rescheduleNotification: (id: string, newTime: Date) =>
      rescheduleNotificationMutation.mutateAsync({ id, newTime }),
    updateNotification: (id: string, updates: Partial<ScheduledNotification>) =>
      updateNotificationMutation.mutateAsync({ id, updates }),
  };
}

// ============================================================================
// Timezone Utilities Hook
// ============================================================================

export interface UseTimezoneUtilitiesResult {
  convertToUserTimezone: (date: Date, timezone?: string) => Date;
  convertToUTC: (date: Date, timezone?: string) => Date;
  formatInTimezone: (
    date: Date,
    timezone?: string,
    format?: Intl.DateTimeFormatOptions,
  ) => string;
  getUserTimezone: () => string;
  validateTimezone: (timezone: string) => boolean;
}

/**
 * Hook for timezone conversion utilities
 * Requirements: 12.3, 12.4
 */
export function useTimezoneUtilities(): UseTimezoneUtilitiesResult {
  const getUserTimezone = useCallback((): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const validateTimezone = useCallback((timezone: string): boolean => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }, []);

  const convertToUserTimezone = useCallback(
    (date: Date, timezone?: string): Date => {
      const tz = timezone || getUserTimezone();
      const dateStr = date.toLocaleString("en-US", { timeZone: tz });
      return new Date(dateStr);
    },
    [getUserTimezone],
  );

  const convertToUTC = useCallback(
    (date: Date, timezone?: string): Date => {
      const tz = timezone || getUserTimezone();
      // Get the offset for the given timezone
      const dateInTz = new Date(
        date.toLocaleString("en-US", { timeZone: tz }),
      );
      const dateInUTC = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
      const offset = dateInUTC.getTime() - dateInTz.getTime();
      return new Date(date.getTime() + offset);
    },
    [getUserTimezone],
  );

  const formatInTimezone = useCallback(
    (
      date: Date,
      timezone?: string,
      format: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    ): string => {
      const tz = timezone || getUserTimezone();
      return date.toLocaleString("en-US", { ...format, timeZone: tz });
    },
    [getUserTimezone],
  );

  return {
    convertToUserTimezone,
    convertToUTC,
    formatInTimezone,
    getUserTimezone,
    validateTimezone,
  };
}

// ============================================================================
// Recurring Pattern Utilities
// ============================================================================

export interface UseRecurringPatternResult {
  calculateNextOccurrence: (
    pattern: RecurringPattern,
    fromDate?: Date,
  ) => Date | null;
  calculateOccurrences: (
    pattern: RecurringPattern,
    startDate: Date,
    count: number,
  ) => Date[];
  validatePattern: (pattern: RecurringPattern) => {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Hook for recurring pattern utilities
 * Requirements: 12.5
 */
export function useRecurringPattern(): UseRecurringPatternResult {
  const calculateNextOccurrence = useCallback(
    (pattern: RecurringPattern, fromDate: Date = new Date()): Date | null => {
      if (pattern.endDate && fromDate >= pattern.endDate) {
        return null;
      }

      const next = new Date(fromDate);

      switch (pattern.type) {
        case "daily":
          next.setDate(next.getDate() + pattern.interval);
          break;

        case "weekly":
          next.setDate(next.getDate() + pattern.interval * 7);
          break;

        case "monthly":
          next.setMonth(next.getMonth() + pattern.interval);
          if (pattern.dayOfMonth) {
            next.setDate(pattern.dayOfMonth);
          }
          break;

        case "custom":
          // Custom logic based on daysOfWeek
          if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
            const currentDay = next.getDay();
            const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
            const nextDay =
              sortedDays.find((day) => day > currentDay) || sortedDays[0];
            const daysToAdd =
              nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
            next.setDate(next.getDate() + daysToAdd);
          }
          break;
      }

      if (pattern.endDate && next >= pattern.endDate) {
        return null;
      }

      return next;
    },
    [],
  );

  const calculateOccurrences = useCallback(
    (pattern: RecurringPattern, startDate: Date, count: number): Date[] => {
      const occurrences: Date[] = [startDate];
      let current = startDate;

      for (let i = 1; i < count; i++) {
        const next = calculateNextOccurrence(pattern, current);
        if (!next) break;
        occurrences.push(next);
        current = next;

        if (pattern.maxOccurrences && occurrences.length >= pattern.maxOccurrences) {
          break;
        }
      }

      return occurrences;
    },
    [calculateNextOccurrence],
  );

  const validatePattern = useCallback(
    (pattern: RecurringPattern): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (pattern.interval < 1) {
        errors.push("Interval must be at least 1");
      }

      if (pattern.type === "monthly" && pattern.dayOfMonth) {
        if (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
          errors.push("Day of month must be between 1 and 31");
        }
      }

      if (pattern.type === "custom" && pattern.daysOfWeek) {
        const invalidDays = pattern.daysOfWeek.filter(
          (day) => day < 0 || day > 6,
        );
        if (invalidDays.length > 0) {
          errors.push("Days of week must be between 0 (Sunday) and 6 (Saturday)");
        }
      }

      if (pattern.endDate && pattern.maxOccurrences) {
        errors.push("Cannot specify both endDate and maxOccurrences");
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [],
  );

  return {
    calculateNextOccurrence,
    calculateOccurrences,
    validatePattern,
  };
}
