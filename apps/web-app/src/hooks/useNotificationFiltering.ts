/**
 * Notification Filtering Hook
 *
 * Integrates preference enforcement with notification display logic,
 * providing filtered notifications based on user preferences.
 *
 * Requirements: 9.3, 9.4, 9.5
 */

import { useMemo, useCallback } from "react";
import { useNotifications } from "./useNotifications";
import { useNotificationPreferences } from "./useNotificationPreferences";
// Note: preferenceEnforcementManager is not used in this implementation
// Filtering is done directly in the hook using preferences
import type {
  Notification,
  NotificationQueryParams,
  DeliveryChannel,
  NotificationType,
  NotificationPreferences,
  NotificationError,
  FrequencySettings,
} from "@/types/notification-service";

// ============================================================================
// Helper Functions (replacing preferenceEnforcementManager)
// ============================================================================

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(
  quietHours: NonNullable<NotificationPreferences["quietHours"]>,
): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMin] = quietHours.start.split(":").map(Number);
  const [endHour, endMin] = quietHours.end.split(":").map(Number);

  const startTime = (startHour || 0) * 60 + (startMin || 0);
  const endTime = (endHour || 0) * 60 + (endMin || 0);

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    // Quiet hours cross midnight
    return currentTime >= startTime || currentTime < endTime;
  }
}

/**
 * Check if notification should be displayed based on preferences
 */
function shouldDisplayNotification(
  notification: Notification,
  preferences: NotificationPreferences,
  channel: DeliveryChannel,
): {
  allowed: boolean;
  reason?: string;
  suggestedDelay?: number;
  alternativeChannels?: DeliveryChannel[];
} {
  // Check if notification type is enabled
  if (!preferences.enabledTypes.includes(notification.type)) {
    return {
      allowed: false,
      reason: "Notification type is disabled",
    };
  }

  // Check if channel is allowed for this notification type
  const allowedChannels = preferences.channels?.[notification.type] || [];
  if (!allowedChannels.includes(channel)) {
    return {
      allowed: false,
      reason: "Channel not allowed for this notification type",
      alternativeChannels: allowedChannels,
    };
  }

  // Check quiet hours
  if (
    preferences.quietHours?.enabled &&
    isInQuietHours(preferences.quietHours)
  ) {
    // Allow critical notifications to override quiet hours if configured
    const isCritical =
      notification.priority === "high" || notification.priority === "urgent";
    const allowCritical =
      preferences.globalSettings?.allowCriticalOverride ?? true;

    if (!isCritical || !allowCritical) {
      return {
        allowed: false,
        reason: "Currently in quiet hours",
        suggestedDelay: 3600000, // 1 hour
      };
    }
  }

  return { allowed: true };
}

/**
 * Track notification frequency for batching logic
 */
function updateFrequencyTracking(notification: Notification): void {
  // Track notification frequency in localStorage for persistence
  if (typeof window === "undefined") return;

  try {
    const key = `notification_frequency_${notification.type}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);
    const history: number[] = stored ? JSON.parse(stored) : [];

    // Add current timestamp
    history.push(now);

    // Keep only last 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const filtered = history.filter((ts) => ts > oneDayAgo);

    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to update frequency tracking:", error);
  }
}

/**
 * Get batched notifications for a specific type
 */
function getBatchedNotifications(
  type: NotificationType,
): { notifications: Notification[] } | null {
  // Retrieve batched notifications from localStorage
  if (typeof window === "undefined") return null;

  try {
    const key = `notification_batch_${type}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const data = JSON.parse(stored);

    // Check if batch is still valid (within last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (data.timestamp < oneHourAgo) {
      localStorage.removeItem(key);
      return null;
    }

    return { notifications: data.notifications || [] };
  } catch (error) {
    console.error("Failed to get batched notifications:", error);
    return null;
  }
}

/**
 * Calculate next scheduled time based on frequency settings
 */
function getNextScheduledTime(
  type: NotificationType,
  settings: FrequencySettings,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Date {
  const now = new Date();

  // Log for debugging purposes
  console.debug(`Calculating next scheduled time for ${type} in ${timezone}`);

  switch (settings.type) {
    case "immediate":
      return now;

    case "batched": {
      const intervalMs = (settings.batchInterval || 60) * 60 * 1000;
      const nextTime = new Date(now.getTime() + intervalMs);
      return nextTime;
    }

    case "daily": {
      const [hours = 9, minutes = 0] = (settings.dailyTime || "09:00")
        .split(":")
        .map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      return scheduledTime;
    }

    case "weekly": {
      const [hours = 10, minutes = 0] = (settings.weeklyTime || "10:00")
        .split(":")
        .map(Number);
      const targetDay = settings.weeklyDay || 1; // Default to Monday
      const scheduledTime = new Date(now);

      // Set to target day of week
      const currentDay = scheduledTime.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      scheduledTime.setDate(scheduledTime.getDate() + daysUntilTarget);
      scheduledTime.setHours(hours, minutes, 0, 0);

      return scheduledTime;
    }

    default:
      return now;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface UseNotificationFilteringOptions
  extends NotificationQueryParams {
  channel?: DeliveryChannel;
  respectPreferences?: boolean;
  includeBlocked?: boolean;
}

export interface FilteredNotificationResult {
  notification: Notification;
  isBlocked: boolean;
  blockReason?: string | undefined;
  suggestedDelay?: number | undefined;
  alternativeChannels?: DeliveryChannel[] | undefined;
}

export interface UseNotificationFilteringResult {
  // Filtered notifications
  notifications: Notification[];
  blockedNotifications: FilteredNotificationResult[];

  // Counts
  totalCount: number;
  allowedCount: number;
  blockedCount: number;

  // Status
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;

  // Preference status
  isInQuietHours: boolean;
  preferences: NotificationPreferences | null;

  // Methods
  checkNotification: (
    notification: Notification,
    channel?: DeliveryChannel,
  ) => FilteredNotificationResult;
  refreshNotifications: () => void;

  // Batching info
  batchedNotifications: Record<NotificationType, Notification[]>;
  nextBatchTimes: Record<NotificationType, Date>;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook that provides notifications filtered by user preferences
 */
export function useNotificationFiltering(
  options: UseNotificationFilteringOptions = {},
): UseNotificationFilteringResult {
  const {
    channel = "in_app",
    respectPreferences = true,
    includeBlocked = false,
    ...queryOptions
  } = options;

  // Get raw notifications and preferences
  const notificationsQuery = useNotifications(queryOptions);
  const { preferences } = useNotificationPreferences();

  // Filter notifications based on preferences
  const filteredResults = useMemo(() => {
    if (
      !notificationsQuery.notifications ||
      !preferences ||
      !respectPreferences
    ) {
      return {
        allowed: notificationsQuery.notifications || [],
        blocked: [],
      };
    }

    const allowed: Notification[] = [];
    const blocked: FilteredNotificationResult[] = [];

    notificationsQuery.notifications.forEach((notification) => {
      const enforcementResult = shouldDisplayNotification(
        notification,
        preferences,
        channel,
      );

      if (enforcementResult.allowed) {
        allowed.push(notification);
        // Update frequency tracking for allowed notifications
        updateFrequencyTracking(notification);
      } else {
        blocked.push({
          notification,
          isBlocked: true,
          blockReason: enforcementResult.reason || undefined,
          suggestedDelay: enforcementResult.suggestedDelay || undefined,
          alternativeChannels:
            enforcementResult.alternativeChannels || undefined,
        });
      }
    });

    return { allowed, blocked };
  }, [
    notificationsQuery.notifications,
    preferences,
    channel,
    respectPreferences,
  ]);

  // Get batched notifications
  const batchedNotifications = useMemo(() => {
    if (!preferences) return {} as Record<NotificationType, Notification[]>;

    const batched: Partial<Record<NotificationType, Notification[]>> = {};

    // Get batched notifications for each type
    Object.keys(preferences.frequency || {}).forEach((type) => {
      const notificationType = type as NotificationType;
      const batch = getBatchedNotifications(notificationType);
      if (batch && batch.notifications.length > 0) {
        batched[notificationType] = batch.notifications;
      }
    });

    return batched as Record<NotificationType, Notification[]>;
  }, [preferences]);

  // Calculate next batch times
  const nextBatchTimes = useMemo(() => {
    if (!preferences) return {} as Record<NotificationType, Date>;

    const times: Partial<Record<NotificationType, Date>> = {};

    Object.entries(preferences.frequency || {}).forEach(([type, settings]) => {
      if (
        settings.type === "batched" ||
        settings.type === "daily" ||
        settings.type === "weekly"
      ) {
        times[type as NotificationType] = getNextScheduledTime(
          type as NotificationType,
          settings,
          preferences.quietHours?.timezone,
        );
      }
    });

    return times as Record<NotificationType, Date>;
  }, [preferences]);

  // Check if currently in quiet hours
  const isInQuietHoursNow = useMemo(() => {
    if (!preferences?.quietHours?.enabled) return false;
    return isInQuietHours(preferences.quietHours);
  }, [preferences]);

  // Method to check a single notification
  const checkNotification = useCallback(
    (
      notification: Notification,
      checkChannel: DeliveryChannel = channel,
    ): FilteredNotificationResult => {
      if (!preferences) {
        return {
          notification,
          isBlocked: false,
        };
      }

      const enforcementResult = shouldDisplayNotification(
        notification,
        preferences,
        checkChannel,
      );

      return {
        notification,
        isBlocked: !enforcementResult.allowed,
        blockReason: enforcementResult.reason || undefined,
        suggestedDelay: enforcementResult.suggestedDelay || undefined,
        alternativeChannels: enforcementResult.alternativeChannels || undefined,
      };
    },
    [preferences, channel],
  );

  return {
    // Filtered notifications
    notifications: includeBlocked
      ? [
          ...filteredResults.allowed,
          ...filteredResults.blocked.map((b) => b.notification),
        ]
      : filteredResults.allowed,
    blockedNotifications: filteredResults.blocked,

    // Counts
    totalCount: notificationsQuery.totalCount,
    allowedCount: filteredResults.allowed.length,
    blockedCount: filteredResults.blocked.length,

    // Status
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,

    // Preference status
    isInQuietHours: isInQuietHoursNow,
    preferences,

    // Methods
    checkNotification,
    refreshNotifications: notificationsQuery.refetch,

    // Batching info
    batchedNotifications,
    nextBatchTimes,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for getting notifications for a specific channel with filtering
 */
export function useChannelNotifications(
  channel: DeliveryChannel,
  options: Omit<UseNotificationFilteringOptions, "channel"> = {},
) {
  return useNotificationFiltering({
    ...options,
    channel,
  });
}

/**
 * Hook for getting push notifications with preference filtering
 */
export function usePushNotifications(
  options: UseNotificationFilteringOptions = {},
) {
  return useChannelNotifications("push", options);
}

/**
 * Hook for getting in-app notifications with preference filtering
 */
export function useInAppNotifications(
  options: UseNotificationFilteringOptions = {},
) {
  return useChannelNotifications("in_app", options);
}

/**
 * Hook for getting email notifications with preference filtering
 */
export function useEmailNotifications(
  options: UseNotificationFilteringOptions = {},
) {
  return useChannelNotifications("email", options);
}

/**
 * Hook for checking if notifications should be shown for a specific type
 */
export function useNotificationTypeStatus(type: NotificationType) {
  const { preferences } = useNotificationPreferences();

  return useMemo(() => {
    if (!preferences) {
      return {
        enabled: false,
        channels: [],
        frequency: null,
        inQuietHours: false,
      };
    }

    const enabled = preferences.enabledTypes.includes(type);
    const channels = preferences.channels[type] || [];
    const frequency = preferences.frequency[type] || null;
    const inQuietHours = preferences.quietHours?.enabled
      ? isInQuietHours(preferences.quietHours)
      : false;

    return {
      enabled,
      channels,
      frequency,
      inQuietHours,
    };
  }, [preferences, type]);
}

/**
 * Hook for getting notification statistics and insights
 */
export function useNotificationInsights() {
  const { preferences } = useNotificationPreferences();
  const allNotifications = useNotifications();

  return useMemo(() => {
    if (!preferences || !allNotifications.notifications) {
      return {
        totalTypes: 0,
        enabledTypes: 0,
        disabledTypes: 0,
        quietHoursActive: false,
        estimatedDailyNotifications: 0,
        mostActiveChannel: null as DeliveryChannel | null,
        leastActiveChannel: null as DeliveryChannel | null,
      };
    }

    const totalTypes = Object.keys(preferences.frequency).length;
    const enabledTypes = preferences.enabledTypes.length;
    const disabledTypes = totalTypes - enabledTypes;
    const quietHoursActive = preferences.quietHours?.enabled || false;

    // Calculate channel usage
    const channelCounts: Record<DeliveryChannel, number> = {
      push: 0,
      in_app: 0,
      email: 0,
      sms: 0,
    };

    Object.values(preferences.channels).forEach((channels) => {
      channels.forEach((channel) => {
        channelCounts[channel]++;
      });
    });

    const sortedChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as DeliveryChannel);

    const mostActiveChannel = sortedChannels[0] || null;
    const leastActiveChannel =
      sortedChannels[sortedChannels.length - 1] || null;

    // Estimate daily notifications (simplified calculation)
    const estimatedDailyNotifications = enabledTypes * 2; // Rough estimate

    return {
      totalTypes,
      enabledTypes,
      disabledTypes,
      quietHoursActive,
      estimatedDailyNotifications,
      mostActiveChannel,
      leastActiveChannel,
    };
  }, [preferences, allNotifications.notifications]);
}
