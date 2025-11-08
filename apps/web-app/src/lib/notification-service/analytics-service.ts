/**
 * Analytics Service for Notification System
 *
 * Provides comprehensive analytics tracking for notification delivery and engagement
 * with event batching, offline queuing, and automatic retry capabilities.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  DeliveryResult,
  AnalyticsQueryParams,
  AnalyticsData,
} from "../../types/notification-service";
import { notificationApiClient } from "./api-client";
import { getNotificationCacheManager } from "./cache-manager";

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  id: string;
  type: "delivery" | "open" | "click" | "dismiss";
  notificationId: string;
  userId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  retryCount?: number;
}

export interface BatchedAnalyticsEvent {
  events: AnalyticsEvent[];
  batchId: string;
  createdAt: Date;
  retryCount: number;
}

export interface AnalyticsServiceConfig {
  batchSize: number;
  batchTimeout: number;
  maxRetries: number;
  retryDelay: number;
  offlineQueueSize: number;
  enableOfflineQueue: boolean;
}

export interface AnalyticsMetrics {
  eventsQueued: number;
  eventsSent: number;
  eventsFailedToSend: number;
  batchesSent: number;
  averageBatchSize: number;
  offlineQueueSize: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AnalyticsServiceConfig = {
  batchSize: 10,
  batchTimeout: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
  offlineQueueSize: 1000,
  enableOfflineQueue: true,
};

// ============================================================================
// Analytics Service Implementation
// ============================================================================

export class NotificationAnalyticsService {
  private config: AnalyticsServiceConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private offlineQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private metrics: AnalyticsMetrics = {
    eventsQueued: 0,
    eventsSent: 0,
    eventsFailedToSend: 0,
    batchesSent: 0,
    averageBatchSize: 0,
    offlineQueueSize: 0,
  };

  constructor(config: Partial<AnalyticsServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupOnlineStatusListener();
    this.loadOfflineQueue();
  }

  // ============================================================================
  // Event Tracking Methods
  // ============================================================================

  /**
   * Track notification delivery
   * Requirements: 5.1, 5.2
   */
  async trackDelivery(
    notificationId: string,
    userId: string,
    result: DeliveryResult,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: "delivery",
      notificationId,
      userId,
      timestamp: new Date(),
      data: { result },
    };

    await this.queueEvent(event);
  }

  /**
   * Track notification open
   * Requirements: 5.1, 5.2
   */
  async trackOpen(notificationId: string, userId: string): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: "open",
      notificationId,
      userId,
      timestamp: new Date(),
    };

    await this.queueEvent(event);
  }

  /**
   * Track notification click
   * Requirements: 5.1, 5.2
   */
  async trackClick(
    notificationId: string,
    userId: string,
    action?: string,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: "click",
      notificationId,
      userId,
      timestamp: new Date(),
      ...(action && { data: { action } }),
    };

    await this.queueEvent(event);
  }

  /**
   * Track notification dismissal
   * Requirements: 5.1, 5.2
   */
  async trackDismiss(notificationId: string, userId: string): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: "dismiss",
      notificationId,
      userId,
      timestamp: new Date(),
    };

    await this.queueEvent(event);
  }

  // ============================================================================
  // Analytics Data Retrieval
  // ============================================================================

  /**
   * Get analytics data with caching
   * Requirements: 5.4, 5.5
   */
  async getAnalytics(params: AnalyticsQueryParams): Promise<AnalyticsData[]> {
    const cacheKey = this.generateAnalyticsCacheKey(params);
    const cacheManager = getNotificationCacheManager();

    // Try to get from cache first
    const cached = await cacheManager.get<AnalyticsData[]>(
      cacheKey,
      "analytics",
    );
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await notificationApiClient.getAnalytics(params);

      // Cache the results
      await cacheManager.set<AnalyticsData[]>(cacheKey, data, "analytics");

      return data;
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);

      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get real-time analytics updates
   * Requirements: 5.4, 5.5
   */
  async getRealtimeAnalytics(
    params: AnalyticsQueryParams,
    callback: (data: AnalyticsData[]) => void,
  ): Promise<() => void> {
    const fetchAndUpdate = async () => {
      try {
        const data = await this.getAnalytics(params);
        callback(data);
      } catch (error) {
        console.error("Failed to fetch real-time analytics:", error);
      }
    };

    // Initial fetch
    await fetchAndUpdate();

    // Set up polling
    const intervalId = setInterval(fetchAndUpdate, 30000); // 30 seconds

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }

  // ============================================================================
  // Event Batching and Queue Management
  // ============================================================================

  /**
   * Queue an event for batched sending
   * Requirements: 5.1, 5.3
   */
  private async queueEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isOnline && this.config.enableOfflineQueue) {
      this.addToOfflineQueue(event);
      return;
    }

    this.eventQueue.push(event);
    this.metrics.eventsQueued++;

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchTimeout);
    }

    // Process immediately if batch is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Process queued events in batches
   * Requirements: 5.1, 5.3
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.eventQueue.length === 0) {
      return;
    }

    const batch = this.eventQueue.splice(0, this.config.batchSize);
    const batchedEvent: BatchedAnalyticsEvent = {
      events: batch,
      batchId: this.generateBatchId(),
      createdAt: new Date(),
      retryCount: 0,
    };

    await this.sendBatch(batchedEvent);
  }

  /**
   * Send a batch of events to the analytics service
   * Requirements: 5.1, 5.3
   */
  private async sendBatch(batch: BatchedAnalyticsEvent): Promise<void> {
    try {
      // Send each event in the batch
      for (const event of batch.events) {
        switch (event.type) {
          case "delivery":
            await notificationApiClient.trackDelivery(
              event.notificationId,
              event.data?.result as DeliveryResult,
            );
            break;
          case "open":
            await notificationApiClient.trackOpen(
              event.notificationId,
              event.userId,
            );
            break;
          case "click":
            await notificationApiClient.trackClick(
              event.notificationId,
              event.userId,
              event.data?.action as string | undefined,
            );
            break;
          case "dismiss":
            // Note: This would need to be added to the API client
            // For now, we'll track it as a click with dismiss action
            await notificationApiClient.trackClick(
              event.notificationId,
              event.userId,
              "dismiss",
            );
            break;
        }
      }

      // Update metrics
      this.metrics.eventsSent += batch.events.length;
      this.metrics.batchesSent++;
      this.updateAverageBatchSize();
    } catch (error) {
      console.error("Failed to send analytics batch:", error);
      this.metrics.eventsFailedToSend += batch.events.length;

      // Retry logic
      if (batch.retryCount < this.config.maxRetries) {
        batch.retryCount++;
        setTimeout(
          () => {
            this.sendBatch(batch);
          },
          this.config.retryDelay * Math.pow(2, batch.retryCount),
        );
      } else {
        // Add failed events to offline queue if enabled
        if (this.config.enableOfflineQueue) {
          batch.events.forEach((event) => this.addToOfflineQueue(event));
        }
      }
    }
  }

  // ============================================================================
  // Offline Queue Management
  // ============================================================================

  /**
   * Add event to offline queue
   * Requirements: 5.3
   */
  private addToOfflineQueue(event: AnalyticsEvent): void {
    if (this.offlineQueue.length >= this.config.offlineQueueSize) {
      // Remove oldest event to make room
      this.offlineQueue.shift();
    }

    this.offlineQueue.push(event);
    this.metrics.offlineQueueSize = this.offlineQueue.length;
    this.saveOfflineQueue();
  }

  /**
   * Process offline queue when coming back online
   * Requirements: 5.3
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    console.log(
      `Processing ${this.offlineQueue.length} offline analytics events`,
    );

    // Move offline events to main queue
    const offlineEvents = this.offlineQueue.splice(0);
    this.metrics.offlineQueueSize = 0;

    for (const event of offlineEvents) {
      await this.queueEvent(event);
    }

    this.saveOfflineQueue();
  }

  /**
   * Save offline queue to localStorage
   * Requirements: 5.3
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(
        "notification-analytics-offline-queue",
        JSON.stringify(this.offlineQueue),
      );
    } catch (error) {
      console.error("Failed to save offline analytics queue:", error);
    }
  }

  /**
   * Load offline queue from localStorage
   * Requirements: 5.3
   */
  private loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem(
        "notification-analytics-offline-queue",
      );
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
        this.metrics.offlineQueueSize = this.offlineQueue.length;
      }
    } catch (error) {
      console.error("Failed to load offline analytics queue:", error);
      this.offlineQueue = [];
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Setup online/offline status listener
   */
  private setupOnlineStatusListener(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key for analytics data
   */
  private generateAnalyticsCacheKey(params: AnalyticsQueryParams): string {
    const key = [
      "analytics",
      params.userId || "all",
      params.notificationId || "all",
      params.type || "all",
      params.startDate.toISOString(),
      params.endDate.toISOString(),
      params.groupBy || "day",
      (params.metrics || []).join(","),
    ].join(":");

    return key;
  }

  /**
   * Update average batch size metric
   */
  private updateAverageBatchSize(): void {
    if (this.metrics.batchesSent > 0) {
      this.metrics.averageBatchSize =
        this.metrics.eventsSent / this.metrics.batchesSent;
    }
  }

  /**
   * Get current analytics metrics
   */
  getMetrics(): AnalyticsMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset analytics metrics
   */
  resetMetrics(): void {
    this.metrics = {
      eventsQueued: 0,
      eventsSent: 0,
      eventsFailedToSend: 0,
      batchesSent: 0,
      averageBatchSize: 0,
      offlineQueueSize: this.offlineQueue.length,
    };
  }

  /**
   * Flush all queued events immediately
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining events
    this.flush();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyticsServiceInstance: NotificationAnalyticsService | null = null;

export function getNotificationAnalyticsService(): NotificationAnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new NotificationAnalyticsService();
  }
  return analyticsServiceInstance;
}

export function createNotificationAnalyticsService(
  config?: Partial<AnalyticsServiceConfig>,
): NotificationAnalyticsService {
  return new NotificationAnalyticsService(config);
}
