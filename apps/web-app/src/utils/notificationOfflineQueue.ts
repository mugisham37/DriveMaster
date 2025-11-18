/**
 * Notification Offline Queue
 * 
 * Manages offline notification queuing and replay
 * 
 * Features:
 * - Queue notifications when offline
 * - Replay on reconnection
 * - localStorage persistence
 * - Queue size limits
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 * Task: 8.4
 */

const QUEUE_KEY = 'notification_offline_queue';
const MAX_QUEUE_SIZE = 100;

export interface QueuedNotification {
  id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Queue Management
// ============================================================================

export class NotificationOfflineQueue {
  private queue: QueuedNotification[] = [];

  constructor() {
    this.loadQueue();
  }

  /**
   * Add notification to queue
   */
  enqueue(notification: Record<string, unknown>): void {
    const queued: QueuedNotification = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: notification,
    };

    this.queue.push(queued);

    // Enforce size limit (remove oldest)
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }

    this.saveQueue();
  }

  /**
   * Get all queued notifications
   */
  getAll(): QueuedNotification[] {
    return [...this.queue];
  }

  /**
   * Clear all queued notifications
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline notification queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline notification queue:', error);
    }
  }
}

// Global instance
export const notificationOfflineQueue = new NotificationOfflineQueue();
