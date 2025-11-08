/**
 * Notification Preference Enforcement Logic
 *
 * Client-side filtering and enforcement of user notification preferences
 * including quiet hours, frequency limits, and channel preferences.
 *
 * Requirements: 9.3, 9.4, 9.5
 */

import type {
  Notification,
  NotificationPreferences,
  NotificationType,
  DeliveryChannel,
  QuietHours,
  FrequencySettings,
  GlobalNotificationSettings,
} from "@/types/notification-service";

// ============================================================================
// Types
// ============================================================================

export interface PreferenceEnforcementResult {
  allowed: boolean;
  reason?: string;
  suggestedDelay?: number;
  alternativeChannels?: DeliveryChannel[];
}

export interface NotificationBatch {
  notifications: Notification[];
  scheduledFor: Date;
  channels: DeliveryChannel[];
}

export interface FrequencyTracker {
  hourlyCount: number;
  dailyCount: number;
  lastReset: {
    hour: Date;
    day: Date;
  };
  recentNotifications: Array<{
    timestamp: Date;
    type: NotificationType;
  }>;
}

// ============================================================================
// Preference Enforcement Manager
// ============================================================================

export class PreferenceEnforcementManager {
  private frequencyTracker: FrequencyTracker = {
    hourlyCount: 0,
    dailyCount: 0,
    lastReset: {
      hour: new Date(),
      day: new Date(),
    },
    recentNotifications: [],
  };

  private batchedNotifications: Map<NotificationType, NotificationBatch> =
    new Map();
  private batchTimers: Map<NotificationType, NodeJS.Timeout> = new Map();

  /**
   * Check if a notification should be displayed based on user preferences
   */
  shouldDisplayNotification(
    notification: Notification,
    preferences: NotificationPreferences,
    channel: DeliveryChannel = "in_app",
  ): PreferenceEnforcementResult {
    // Check if notification type is enabled
    if (!this.isTypeEnabled(notification.type, preferences)) {
      return {
        allowed: false,
        reason: "Notification type is disabled in preferences",
      };
    }

    // Check if channel is allowed for this notification type
    if (!this.isChannelAllowed(notification.type, channel, preferences)) {
      const allowedChannels = preferences.channels[notification.type] || [];
      return {
        allowed: false,
        reason: `Channel ${channel} not allowed for ${notification.type}`,
        alternativeChannels: allowedChannels,
      };
    }

    // Check quiet hours (unless critical override is allowed)
    const quietHoursResult = this.checkQuietHours(
      notification,
      preferences,
      channel,
    );
    if (!quietHoursResult.allowed) {
      return quietHoursResult;
    }

    // Check frequency limits
    const frequencyResult = this.checkFrequencyLimits(
      notification,
      preferences,
    );
    if (!frequencyResult.allowed) {
      return frequencyResult;
    }

    // Check global limits
    const globalLimitsResult = this.checkGlobalLimits(
      notification,
      preferences,
    );
    if (!globalLimitsResult.allowed) {
      return globalLimitsResult;
    }

    return { allowed: true };
  }

  /**
   * Filter notifications based on user preferences
   */
  filterNotifications(
    notifications: Notification[],
    preferences: NotificationPreferences,
    channel: DeliveryChannel = "in_app",
  ): Notification[] {
    return notifications.filter(
      (notification) =>
        this.shouldDisplayNotification(notification, preferences, channel)
          .allowed,
    );
  }

  /**
   * Apply frequency-based batching for notifications
   */
  applyFrequencyBatching(
    notification: Notification,
    preferences: NotificationPreferences,
  ): "immediate" | "batched" | "scheduled" {
    const frequencySettings = preferences.frequency[notification.type];
    if (!frequencySettings) return "immediate";

    switch (frequencySettings.type) {
      case "immediate":
        return "immediate";

      case "batched":
        this.addToBatch(notification, frequencySettings);
        return "batched";

      case "daily":
      case "weekly":
        this.scheduleNotification(notification, frequencySettings);
        return "scheduled";

      case "disabled":
        return "batched"; // Don't show, but don't error

      default:
        return "immediate";
    }
  }

  /**
   * Get the next scheduled time for a notification type based on frequency settings
   */
  getNextScheduledTime(
    type: NotificationType,
    frequencySettings: FrequencySettings,
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
  ): Date {
    const now = new Date();

    switch (frequencySettings.type) {
      case "daily":
        return this.getNextDailyTime(
          frequencySettings.dailyTime || "09:00",
          timezone,
        );

      case "weekly":
        return this.getNextWeeklyTime(
          frequencySettings.weeklyDay || 1,
          frequencySettings.weeklyTime || "10:00",
          timezone,
        );

      case "batched":
        const batchInterval = frequencySettings.batchInterval || 60;
        return new Date(now.getTime() + batchInterval * 60 * 1000);

      default:
        return now;
    }
  }

  /**
   * Check if notifications are currently in quiet hours
   */
  isInQuietHours(
    quietHours: QuietHours,
    timestamp: Date = new Date(),
  ): boolean {
    if (!quietHours.enabled) return false;

    const timeZone =
      quietHours.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = new Date(timestamp.toLocaleString("en-US", { timeZone }));

    const currentTime = localTime.getHours() * 60 + localTime.getMinutes();
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Get batched notifications ready for delivery
   */
  getBatchedNotifications(type: NotificationType): NotificationBatch | null {
    return this.batchedNotifications.get(type) || null;
  }

  /**
   * Clear batched notifications for a type
   */
  clearBatch(type: NotificationType): void {
    this.batchedNotifications.delete(type);
    const timer = this.batchTimers.get(type);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(type);
    }
  }

  /**
   * Update frequency tracking counters
   */
  updateFrequencyTracking(notification: Notification): void {
    const now = new Date();

    // Reset counters if needed
    this.resetCountersIfNeeded(now);

    // Update counters
    this.frequencyTracker.hourlyCount++;
    this.frequencyTracker.dailyCount++;

    // Add to recent notifications
    this.frequencyTracker.recentNotifications.push({
      timestamp: now,
      type: notification.type,
    });

    // Keep only last 100 notifications for memory efficiency
    if (this.frequencyTracker.recentNotifications.length > 100) {
      this.frequencyTracker.recentNotifications =
        this.frequencyTracker.recentNotifications.slice(-100);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isTypeEnabled(
    type: NotificationType,
    preferences: NotificationPreferences,
  ): boolean {
    return preferences.enabledTypes.includes(type);
  }

  private isChannelAllowed(
    type: NotificationType,
    channel: DeliveryChannel,
    preferences: NotificationPreferences,
  ): boolean {
    const allowedChannels = preferences.channels[type] || [];
    return allowedChannels.includes(channel);
  }

  private checkQuietHours(
    notification: Notification,
    preferences: NotificationPreferences,
    channel: DeliveryChannel,
  ): PreferenceEnforcementResult {
    const { quietHours, globalSettings } = preferences;

    if (!quietHours?.enabled) {
      return { allowed: true };
    }

    const isQuietTime = this.isInQuietHours(quietHours);
    if (!isQuietTime) {
      return { allowed: true };
    }

    // Check if critical notifications can override quiet hours
    const isCritical =
      (notification.priority as string) === "critical" ||
      notification.type === "system";
    if (isCritical && globalSettings?.allowCriticalOverride) {
      return { allowed: true };
    }

    // For non-critical notifications during quiet hours
    if (channel === "push") {
      // Completely block push notifications during quiet hours
      return {
        allowed: false,
        reason: "Push notifications are disabled during quiet hours",
        alternativeChannels: ["in_app"],
      };
    }

    // Allow in-app notifications but suggest delay for others
    const nextAllowedTime = this.getNextAllowedTime(quietHours);
    return {
      allowed: channel === "in_app",
      reason: "Currently in quiet hours",
      suggestedDelay: nextAllowedTime.getTime() - Date.now(),
    };
  }

  private checkFrequencyLimits(
    notification: Notification,
    preferences: NotificationPreferences,
  ): PreferenceEnforcementResult {
    const frequencySettings = preferences.frequency[notification.type];

    if (!frequencySettings || frequencySettings.type === "disabled") {
      return {
        allowed: false,
        reason: "Notifications disabled for this type",
      };
    }

    // For batched notifications, always allow (they'll be batched)
    if (frequencySettings.type === "batched") {
      return { allowed: true };
    }

    // For daily/weekly, check if it's time
    if (
      frequencySettings.type === "daily" ||
      frequencySettings.type === "weekly"
    ) {
      const nextScheduledTime = this.getNextScheduledTime(
        notification.type,
        frequencySettings,
      );
      const now = new Date();

      if (now < nextScheduledTime) {
        return {
          allowed: false,
          reason: "Not yet time for scheduled notification",
          suggestedDelay: nextScheduledTime.getTime() - now.getTime(),
        };
      }
    }

    return { allowed: true };
  }

  private checkGlobalLimits(
    notification: Notification,
    preferences: NotificationPreferences,
  ): PreferenceEnforcementResult {
    const { globalSettings } = preferences;
    if (!globalSettings) return { allowed: true };

    // Reset counters if needed
    this.resetCountersIfNeeded(new Date());

    // Check hourly limit
    if (
      globalSettings.maxPerHour &&
      this.frequencyTracker.hourlyCount >= globalSettings.maxPerHour
    ) {
      return {
        allowed: false,
        reason: `Hourly notification limit (${globalSettings.maxPerHour}) reached`,
      };
    }

    // Check daily limit
    if (
      globalSettings.maxPerDay &&
      this.frequencyTracker.dailyCount >= globalSettings.maxPerDay
    ) {
      return {
        allowed: false,
        reason: `Daily notification limit (${globalSettings.maxPerDay}) reached`,
      };
    }

    return { allowed: true };
  }

  private addToBatch(
    notification: Notification,
    frequencySettings: FrequencySettings,
  ): void {
    const batchInterval = frequencySettings.batchInterval || 60; // minutes
    const scheduledFor = new Date(Date.now() + batchInterval * 60 * 1000);

    let batch = this.batchedNotifications.get(notification.type);
    if (!batch) {
      batch = {
        notifications: [],
        scheduledFor,
        channels: [], // Will be determined when batch is sent
      };
      this.batchedNotifications.set(notification.type, batch);

      // Set timer to send batch
      const timer = setTimeout(
        () => {
          this.sendBatch(notification.type);
        },
        batchInterval * 60 * 1000,
      );

      this.batchTimers.set(notification.type, timer);
    }

    batch.notifications.push(notification);
  }

  private scheduleNotification(
    notification: Notification,
    frequencySettings: FrequencySettings,
  ): void {
    // This would integrate with the notification service's scheduling system
    // For now, we'll just log the scheduling intent
    console.log(
      `Scheduling notification ${notification.id} for type ${notification.type}`,
      {
        frequencySettings,
        nextTime: this.getNextScheduledTime(
          notification.type,
          frequencySettings,
        ),
      },
    );
  }

  private sendBatch(type: NotificationType): void {
    const batch = this.batchedNotifications.get(type);
    if (!batch || batch.notifications.length === 0) return;

    // This would trigger the actual batch notification display
    console.log(
      `Sending batch of ${batch.notifications.length} notifications for type ${type}`,
    );

    // Clear the batch
    this.clearBatch(type);
  }

  private getNextDailyTime(timeString: string, _timezone: string): Date {
    const now = new Date();
    const parts = timeString.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;

    const nextTime = new Date(now);
    nextTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    return nextTime;
  }

  private getNextWeeklyTime(
    dayOfWeek: number,
    timeString: string,
    _timezone: string,
  ): Date {
    const now = new Date();
    const parts = timeString.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;

    const nextTime = new Date(now);
    nextTime.setHours(hours, minutes, 0, 0);

    // Calculate days until target day of week
    const currentDay = now.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;

    if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextTime <= now)) {
      daysUntilTarget += 7;
    }

    nextTime.setDate(nextTime.getDate() + daysUntilTarget);
    return nextTime;
  }

  private getNextAllowedTime(quietHours: QuietHours): Date {
    const now = new Date();
    const endTime = this.parseTime(quietHours.end);

    const nextAllowed = new Date(now);
    nextAllowed.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0);

    // If end time is tomorrow (overnight quiet hours)
    const startTime = this.parseTime(quietHours.start);
    if (startTime > endTime) {
      nextAllowed.setDate(nextAllowed.getDate() + 1);
    }

    return nextAllowed;
  }

  private parseTime(timeString: string): number {
    const parts = timeString.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    return hours * 60 + minutes;
  }

  private resetCountersIfNeeded(now: Date): void {
    const { lastReset } = this.frequencyTracker;

    // Reset hourly counter
    if (now.getTime() - lastReset.hour.getTime() >= 60 * 60 * 1000) {
      this.frequencyTracker.hourlyCount = 0;
      this.frequencyTracker.lastReset.hour = now;
    }

    // Reset daily counter
    if (
      now.getDate() !== lastReset.day.getDate() ||
      now.getMonth() !== lastReset.day.getMonth() ||
      now.getFullYear() !== lastReset.day.getFullYear()
    ) {
      this.frequencyTracker.dailyCount = 0;
      this.frequencyTracker.lastReset.day = now;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const preferenceEnforcementManager = new PreferenceEnforcementManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a notification should be shown based on preferences
 */
export function shouldShowNotification(
  notification: Notification,
  preferences: NotificationPreferences,
  channel: DeliveryChannel = "in_app",
): boolean {
  return preferenceEnforcementManager.shouldDisplayNotification(
    notification,
    preferences,
    channel,
  ).allowed;
}

/**
 * Filter notifications array based on preferences
 */
export function filterNotificationsByPreferences(
  notifications: Notification[],
  preferences: NotificationPreferences,
  channel: DeliveryChannel = "in_app",
): Notification[] {
  return preferenceEnforcementManager.filterNotifications(
    notifications,
    preferences,
    channel,
  );
}

/**
 * Check if currently in quiet hours
 */
export function isCurrentlyInQuietHours(
  preferences: NotificationPreferences,
): boolean {
  if (!preferences.quietHours?.enabled) return false;
  return preferenceEnforcementManager.isInQuietHours(preferences.quietHours);
}

/**
 * Get the reason why a notification was blocked
 */
export function getNotificationBlockReason(
  notification: Notification,
  preferences: NotificationPreferences,
  channel: DeliveryChannel = "in_app",
): string | null {
  const result = preferenceEnforcementManager.shouldDisplayNotification(
    notification,
    preferences,
    channel,
  );

  return result.allowed ? null : result.reason || "Unknown reason";
}
