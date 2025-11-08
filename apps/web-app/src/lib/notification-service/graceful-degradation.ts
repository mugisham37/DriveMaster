/**
 * Graceful Degradation Strategies for Notification Service
 * Provides fallback mechanisms when the notification service is unavailable
 */

import type {
  NotificationList,
  NotificationPreferences,
  DeviceToken,
  NotificationTemplate,
} from "@/types/notification-service";
import {
  getNotificationCacheManager,
  NotificationCacheManager,
} from "./cache-manager";

// ============================================================================
// Degradation Strategy Types
// ============================================================================

export type DegradationLevel = "none" | "partial" | "full";

export interface DegradationState extends Record<string, unknown> {
  level: DegradationLevel;
  reason: string;
  timestamp: Date;
  affectedServices: string[];
  fallbacksActive: string[];
}

export interface FallbackOptions {
  useCache: boolean;
  useLocalStorage: boolean;
  showOfflineIndicator: boolean;
  queueActions: boolean;
  enablePolling: boolean;
  pollingInterval: number;
}

export interface OfflineAction extends Record<string, unknown> {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
}

// ============================================================================
// Graceful Degradation Manager
// ============================================================================

export class GracefulDegradationManager {
  private degradationState: DegradationState = {
    level: "none",
    reason: "",
    timestamp: new Date(),
    affectedServices: [],
    fallbacksActive: [],
  };

  private offlineQueue: OfflineAction[] = [];
  private pollingInterval: NodeJS.Timeout | undefined;
  private cacheManager: NotificationCacheManager;
  private eventListeners = new Map<
    string,
    Array<(data: Record<string, unknown>) => void>
  >();

  constructor() {
    this.cacheManager = getNotificationCacheManager();
    this.setupEventListeners();
  }

  /**
   * Activate degradation mode
   */
  activateDegradation(
    level: DegradationLevel,
    reason: string,
    affectedServices: string[] = [],
  ): void {
    const previousLevel = this.degradationState.level;

    this.degradationState = {
      level,
      reason,
      timestamp: new Date(),
      affectedServices,
      fallbacksActive: this.determineFallbacks(level),
    };

    this.handleDegradationActivation(previousLevel);
    this.emitEvent("degradation_activated", this.degradationState);
  }

  /**
   * Deactivate degradation mode
   */
  deactivateDegradation(): void {
    const previousState = { ...this.degradationState };

    this.degradationState = {
      level: "none",
      reason: "",
      timestamp: new Date(),
      affectedServices: [],
      fallbacksActive: [],
    };

    this.handleDegradationDeactivation(previousState);
    this.emitEvent("degradation_deactivated", previousState);
  }

  /**
   * Get current degradation state
   */
  getDegradationState(): DegradationState {
    return { ...this.degradationState };
  }

  /**
   * Check if service is degraded
   */
  isDegraded(): boolean {
    return this.degradationState.level !== "none";
  }

  /**
   * Check if specific service is affected
   */
  isServiceAffected(service: string): boolean {
    return this.degradationState.affectedServices.includes(service);
  }

  /**
   * Get fallback notifications from cache
   */
  async getFallbackNotifications(userId: string): Promise<NotificationList> {
    try {
      const cached = await this.cacheManager.getCachedNotifications(userId);

      return {
        results: cached || [],
        meta: {
          total: cached?.length || 0,
          unreadCount: cached?.filter((n) => !n.status.isRead).length || 0,
          hasMore: false,
        },
      };
    } catch (error) {
      console.warn("Failed to get cached notifications:", error);
      return this.getEmptyNotificationList();
    }
  }

  /**
   * Get fallback notification preferences
   */
  async getFallbackPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      return await this.cacheManager.getCachedPreferences(userId);
    } catch (error) {
      console.warn("Failed to get cached preferences:", error);
      return null;
    }
  }

  /**
   * Get fallback device tokens
   */
  async getFallbackDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      return (await this.cacheManager.getCachedDeviceTokens(userId)) || [];
    } catch (error) {
      console.warn("Failed to get cached device tokens:", error);
      return [];
    }
  }

  /**
   * Get fallback templates
   */
  async getFallbackTemplates(): Promise<NotificationTemplate[]> {
    try {
      return (await this.cacheManager.getCachedTemplates()) || [];
    } catch (error) {
      console.warn("Failed to get cached templates:", error);
      return [];
    }
  }

  /**
   * Queue action for later execution
   */
  queueAction(type: string, data: Record<string, unknown>): string {
    const action: OfflineAction = {
      id: this.generateActionId(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    this.offlineQueue.push(action);
    this.saveOfflineQueue();
    this.emitEvent("action_queued", action);

    return action.id;
  }

  /**
   * Process queued actions when service is restored
   */
  async processQueuedActions(): Promise<{
    processed: number;
    failed: number;
    errors: Array<{ actionId: string; error: string }>;
  }> {
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as Array<{ actionId: string; error: string }>,
    };

    const actionsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const action of actionsToProcess) {
      try {
        await this.processQueuedAction(action);
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          actionId: action.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Re-queue if retry count is below threshold
        if (action.retryCount < 3) {
          action.retryCount++;
          this.offlineQueue.push(action);
        }
      }
    }

    this.saveOfflineQueue();
    this.emitEvent("queue_processed", results);

    return results;
  }

  /**
   * Get queued actions count
   */
  getQueuedActionsCount(): number {
    return this.offlineQueue.length;
  }

  /**
   * Clear queued actions
   */
  clearQueuedActions(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
    this.emitEvent("queue_cleared", {});
  }

  /**
   * Start polling for service recovery
   */
  startPolling(interval: number = 30000): void {
    this.stopPolling();

    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkServiceHealth();
      } catch (error) {
        console.warn("Polling health check failed:", error);
      }
    }, interval) as NodeJS.Timeout;

    this.emitEvent("polling_started", { interval });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.emitEvent("polling_stopped", {});
    }
  }

  /**
   * Add event listener
   */
  addEventListener(
    event: string,
    listener: (data: Record<string, unknown>) => void,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    event: string,
    listener: (data: Record<string, unknown>) => void,
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPolling();
    this.eventListeners.clear();
    this.cacheManager.destroy();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private determineFallbacks(level: DegradationLevel): string[] {
    const fallbacks: string[] = [];

    switch (level) {
      case "partial":
        fallbacks.push("cache", "offline_indicator");
        break;
      case "full":
        fallbacks.push("cache", "offline_indicator", "action_queue", "polling");
        break;
    }

    return fallbacks;
  }

  private handleDegradationActivation(previousLevel: DegradationLevel): void {
    const { level, fallbacksActive } = this.degradationState;

    // Show offline indicator
    if (fallbacksActive.includes("offline_indicator")) {
      this.showOfflineIndicator();
    }

    // Start polling if needed
    if (fallbacksActive.includes("polling") && previousLevel === "none") {
      this.startPolling();
    }

    // Load offline queue from storage
    if (fallbacksActive.includes("action_queue")) {
      this.loadOfflineQueue();
    }

    console.warn(
      `Graceful degradation activated: ${level} (${this.degradationState.reason})`,
    );
  }

  private handleDegradationDeactivation(previousState: DegradationState): void {
    // Hide offline indicator
    this.hideOfflineIndicator();

    // Stop polling
    this.stopPolling();

    // Process queued actions
    if (previousState.fallbacksActive.includes("action_queue")) {
      this.processQueuedActions().then((results) => {
        console.log("Processed queued actions:", results);
      });
    }

    console.log("Graceful degradation deactivated - service restored");
  }

  private async checkServiceHealth(): Promise<void> {
    // This would typically make a health check request
    // For now, we'll simulate it
    const isHealthy = await this.performHealthCheck();

    if (isHealthy && this.isDegraded()) {
      this.deactivateDegradation();
    }
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      // Simulate health check - in real implementation, this would call the health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async processQueuedAction(action: OfflineAction): Promise<void> {
    // This would process different types of queued actions
    switch (action.type) {
      case "mark_as_read":
        // Process mark as read action
        break;
      case "delete_notification":
        // Process delete notification action
        break;
      case "update_preferences":
        // Process preference update action
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(
        "notification_offline_queue",
        JSON.stringify(this.offlineQueue),
      );
    } catch (error) {
      console.warn("Failed to save offline queue:", error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem("notification_offline_queue");
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load offline queue:", error);
      this.offlineQueue = [];
    }
  }

  private showOfflineIndicator(): void {
    this.emitEvent("show_offline_indicator", {
      message: "Notifications service is temporarily unavailable",
      level: this.degradationState.level,
    });
  }

  private hideOfflineIndicator(): void {
    this.emitEvent("hide_offline_indicator", {});
  }

  private getEmptyNotificationList(): NotificationList {
    return {
      results: [],
      meta: {
        total: 0,
        unreadCount: 0,
        hasMore: false,
      },
    };
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        if (this.isDegraded()) {
          this.checkServiceHealth();
        }
      });

      window.addEventListener("offline", () => {
        this.activateDegradation("full", "Network connection lost", ["all"]);
      });
    }
  }

  private emitEvent(event: string, data: Record<string, unknown>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Old cache manager removed - now using enhanced NotificationCacheManager from cache-manager.ts

// ============================================================================
// Singleton Export
// ============================================================================

export const gracefulDegradationManager = new GracefulDegradationManager();
export default gracefulDegradationManager;
