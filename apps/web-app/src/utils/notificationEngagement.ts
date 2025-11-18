/**
 * Notification Engagement Tracking
 * 
 * Tracks notification lifecycle events for analytics
 * 
 * Features:
 * - Delivery event tracking
 * - Open event tracking
 * - Click event tracking
 * - Dismiss event tracking
 * - Correlation ID for lifecycle tracking
 * 
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 * Task: 8.8
 */

export interface EngagementEvent {
  notificationId: string;
  userId: string;
  eventType: 'delivered' | 'opened' | 'clicked' | 'dismissed';
  timestamp: number;
  channel: 'push' | 'email' | 'in-app' | 'sms';
  correlationId: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Engagement Tracker
// ============================================================================

export class NotificationEngagementTracker {
  private apiEndpoint: string;
  private queue: EngagementEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  constructor(apiEndpoint: string = '/api/notifications/analytics/track') {
    this.apiEndpoint = apiEndpoint;
    this.startFlushInterval();
  }

  /**
   * Track delivery event
   */
  trackDelivery(
    notificationId: string,
    userId: string,
    channel: EngagementEvent['channel'],
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.addEvent({
      notificationId,
      userId,
      eventType: 'delivered',
      timestamp: Date.now(),
      channel,
      correlationId,
      metadata,
    });
  }

  /**
   * Track open event
   */
  trackOpen(
    notificationId: string,
    userId: string,
    channel: EngagementEvent['channel'],
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.addEvent({
      notificationId,
      userId,
      eventType: 'opened',
      timestamp: Date.now(),
      channel,
      correlationId,
      metadata,
    });
  }

  /**
   * Track click event
   */
  trackClick(
    notificationId: string,
    userId: string,
    channel: EngagementEvent['channel'],
    correlationId: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.addEvent({
      notificationId,
      userId,
      eventType: 'clicked',
      timestamp: Date.now(),
      channel,
      correlationId,
      metadata: {
        ...metadata,
        actionUrl,
      },
    });
  }

  /**
   * Track dismiss event
   */
  trackDismiss(
    notificationId: string,
    userId: string,
    channel: EngagementEvent['channel'],
    correlationId: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.addEvent({
      notificationId,
      userId,
      eventType: 'dismissed',
      timestamp: Date.now(),
      channel,
      correlationId,
      metadata: {
        ...metadata,
        reason,
      },
    });
  }

  /**
   * Add event to queue
   */
  private addEvent(event: EngagementEvent): void {
    this.queue.push(event);

    // Flush if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush events to server
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error('Failed to send engagement events:', error);
      // Re-queue events on failure
      this.queue.unshift(...events);
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop flush interval and flush remaining events
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Global instance
export const notificationEngagementTracker = new NotificationEngagementTracker();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    notificationEngagementTracker.destroy();
  });
}
