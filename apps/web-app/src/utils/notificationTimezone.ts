/**
 * Notification Timezone Utilities
 * 
 * Handles timezone conversions for notifications
 * 
 * Features:
 * - UTC to user timezone conversion
 * - User timezone to UTC conversion
 * - Quiet hours timezone handling
 * - Relative time display
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 * Task: 8.6
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// ============================================================================
// Timezone Utilities
// ============================================================================

/**
 * Get user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert UTC date to user's timezone
 */
export function utcToUserTime(utcDate: Date | string, timezone?: string): Date {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const tz = timezone || getUserTimezone();
  return utcToZonedTime(date, tz);
}

/**
 * Convert user's timezone to UTC
 */
export function userTimeToUtc(localDate: Date, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  return zonedTimeToUtc(localDate, tz);
}

/**
 * Format timestamp for display
 */
export function formatNotificationTime(
  timestamp: Date | string,
  formatType: 'relative' | 'absolute' | 'both' = 'relative',
  timezone?: string
): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const localDate = utcToUserTime(date, timezone);

  switch (formatType) {
    case 'relative':
      return formatDistanceToNow(localDate, { addSuffix: true });
    case 'absolute':
      return format(localDate, 'PPp'); // e.g., "Apr 29, 2023, 9:30 AM"
    case 'both':
      return `${formatDistanceToNow(localDate, { addSuffix: true })} (${format(localDate, 'PPp')})`;
    default:
      return formatDistanceToNow(localDate, { addSuffix: true });
  }
}

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
    daysOfWeek?: number[]; // 0-6
  }
): boolean {
  if (!quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const userTime = utcToUserTime(now, quietHours.timezone);
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentDay = userTime.getDay();

  // Check day of week
  if (quietHours.daysOfWeek && !quietHours.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Parse start and end times
  const [startHour, startMinute] = quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = quietHours.end.split(':').map(Number);

  const currentMinutes = currentHour * 60 + currentMinute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  // Normal quiet hours (e.g., 08:00 - 22:00)
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Convert time string to user's timezone
 */
export function convertTimeToTimezone(
  time: string, // HH:mm
  fromTimezone: string,
  toTimezone: string
): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  const fromZoned = zonedTimeToUtc(date, fromTimezone);
  const toZoned = utcToZonedTime(fromZoned, toTimezone);

  return format(toZoned, 'HH:mm');
}

/**
 * Get timezone offset string
 */
export function getTimezoneOffset(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  const now = new Date();
  const formatted = format(utcToZonedTime(now, tz), 'XXX'); // e.g., "+05:30"
  return formatted;
}
