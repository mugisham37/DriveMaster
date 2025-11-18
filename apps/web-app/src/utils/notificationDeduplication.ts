/**
 * Notification Deduplication
 * 
 * Prevents duplicate notifications from being displayed
 * 
 * Features:
 * - Deduplication by notification ID
 * - Time-based deduplication (5 minutes)
 * - Notification grouping
 * - Update handling
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 * Task: 8.5
 */

const DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutes

export interface DeduplicationEntry {
  id: string;
  timestamp: number;
  hash: string;
}

// ============================================================================
// Deduplication Manager
// ============================================================================

export class NotificationDeduplicationManager {
  private seen: Map<string, DeduplicationEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Check if notification should be shown
   */
  shouldShow(notification: { id: string; title: string; body: string }): boolean {
    const now = Date.now();
    const hash = this.generateHash(notification);

    // Check by ID
    const existingById = this.seen.get(notification.id);
    if (existingById && now - existingById.timestamp < DEDUP_WINDOW) {
      return false;
    }

    // Check by content hash
    for (const entry of this.seen.values()) {
      if (entry.hash === hash && now - entry.timestamp < DEDUP_WINDOW) {
        return false;
      }
    }

    // Mark as seen
    this.seen.set(notification.id, {
      id: notification.id,
      timestamp: now,
      hash,
    });

    return true;
  }

  /**
   * Check if notification is an update
   */
  isUpdate(notificationId: string): boolean {
    return this.seen.has(notificationId);
  }

  /**
   * Mark notification as seen
   */
  markSeen(notification: { id: string; title: string; body: string }): void {
    const hash = this.generateHash(notification);
    this.seen.set(notification.id, {
      id: notification.id,
      timestamp: Date.now(),
      hash,
    });
  }

  /**
   * Clear all deduplication data
   */
  clear(): void {
    this.seen.clear();
  }

  /**
   * Generate content hash for deduplication
   */
  private generateHash(notification: { title: string; body: string }): string {
    const content = `${notification.title}|${notification.body}`;
    return btoa(content).substring(0, 32);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, entry] of this.seen.entries()) {
      if (now - entry.timestamp > DEDUP_WINDOW) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.seen.delete(id));
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global instance
export const notificationDeduplicationManager = new NotificationDeduplicationManager();
