/**
 * Notification Batching
 * 
 * Manages notification batching based on user preferences
 * 
 * Features:
 * - Collect notifications during batch interval
 * - Display batch notification with count
 * - Bypass batching for critical notifications
 * - Configurable batch intervals
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 * Task: 8.7
 */

export interface BatchedNotification {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  type: string;
  timestamp: number;
}

export interface BatchConfig {
  enabled: boolean;
  interval: number; // minutes
  bypassPriorities: string[]; // priorities that bypass batching
}

// ============================================================================
// Batching Manager
// ============================================================================

export class NotificationBatchingManager {
  private batches: Map<string, BatchedNotification[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private configs: Map<string, BatchConfig> = new Map();

  /**
   * Add notification to batch
   */
  addToBatch(
    userId: string,
    notification: BatchedNotification,
    config: BatchConfig,
    onBatchReady: (notifications: BatchedNotification[]) => void
  ): boolean {
    // Check if batching is enabled
    if (!config.enabled) {
      return false;
    }

    // Bypass batching for critical notifications
    if (config.bypassPriorities.includes(notification.priority)) {
      return false;
    }

    // Get or create batch
    if (!this.batches.has(userId)) {
      this.batches.set(userId, []);
    }

    const batch = this.batches.get(userId)!;
    batch.push(notification);

    // Store config
    this.configs.set(userId, config);

    // Set timer if not already set
    if (!this.timers.has(userId)) {
      const timer = setTimeout(() => {
        this.deliverBatch(userId, onBatchReady);
      }, config.interval * 60 * 1000);

      this.timers.set(userId, timer);
    }

    return true;
  }

  /**
   * Deliver batch immediately
   */
  deliverBatch(
    userId: string,
    onBatchReady: (notifications: BatchedNotification[]) => void
  ): void {
    const batch = this.batches.get(userId);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer
    const timer = this.timers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(userId);
    }

    // Deliver batch
    onBatchReady([...batch]);

    // Clear batch
    this.batches.set(userId, []);
  }

  /**
   * Get current batch size
   */
  getBatchSize(userId: string): number {
    return this.batches.get(userId)?.length || 0;
  }

  /**
   * Clear batch
   */
  clearBatch(userId: string): void {
    const timer = this.timers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(userId);
    }

    this.batches.delete(userId);
    this.configs.delete(userId);
  }

  /**
   * Clear all batches
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.batches.clear();
    this.configs.clear();
  }
}

// Global instance
export const notificationBatchingManager = new NotificationBatchingManager();
