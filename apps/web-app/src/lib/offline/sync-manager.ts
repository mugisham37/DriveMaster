/**
 * Offline Sync Manager
 * 
 * Handles synchronization of offline activities when connection is restored.
 * Implements retry logic, error handling, and progress notifications.
 * 
 * Requirements: 11.4, 11.5
 * Task: 12.4
 */

import { getIndexedDBManager, type OfflineActivity } from "./indexeddb-manager";

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  activityId: string;
  error: string;
  retryable: boolean;
}

export interface SyncProgress {
  total: number;
  processed: number;
  current: string | null;
  percentage: number;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncState {
  status: SyncStatus;
  progress: SyncProgress | null;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
}

// ============================================================================
// Sync Manager
// ============================================================================

export class SyncManager {
  private dbManager = getIndexedDBManager();
  private state: SyncState = {
    status: "idle",
    progress: null,
    lastSyncTime: null,
    lastSyncResult: null,
  };
  private listeners: Array<(state: SyncState) => void> = [];
  private isSyncing = false;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  /**
   * Initialize the sync manager
   */
  async init(): Promise<void> {
    await this.dbManager.init();
  }

  /**
   * Sync all pending activities
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error("Sync already in progress");
    }

    this.isSyncing = true;
    this.updateState({ status: "syncing" });

    const startTime = Date.now();

    try {
      // Get all pending activities
      const pendingActivities = await this.dbManager.getActivitiesByStatus("pending");

      if (pendingActivities.length === 0) {
        const result: SyncResult = {
          success: true,
          totalProcessed: 0,
          successCount: 0,
          failedCount: 0,
          errors: [],
          duration: Date.now() - startTime,
        };

        this.updateState({
          status: "success",
          lastSyncTime: new Date(),
          lastSyncResult: result,
          progress: null,
        });

        this.isSyncing = false;
        return result;
      }

      console.log(`[SyncManager] Starting sync of ${pendingActivities.length} activities`);

      // Sort by timestamp (oldest first)
      const sortedActivities = pendingActivities.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      let successCount = 0;
      let failedCount = 0;
      const errors: SyncError[] = [];

      // Process each activity
      for (let i = 0; i < sortedActivities.length; i++) {
        const activity = sortedActivities[i];

        if (!activity) continue;

        // Update progress
        this.updateState({
          progress: {
            total: sortedActivities.length,
            processed: i,
            current: activity.id,
            percentage: Math.round((i / sortedActivities.length) * 100),
          },
        });

        try {
          // Mark as syncing
          const syncingActivity: OfflineActivity = {
            ...activity,
            status: "syncing",
          };
          await this.dbManager.updateActivity(syncingActivity);

          // Attempt to sync with retry logic
          await this.syncActivityWithRetry(activity);

          // Delete successfully synced activity
          await this.dbManager.deleteActivity(activity.id);
          successCount++;

          console.log(`[SyncManager] Activity synced: ${activity.id}`);
        } catch (error) {
          failedCount++;

          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const retryable = this.isRetryableError(error);

          errors.push({
            activityId: activity.id,
            error: errorMessage,
            retryable,
          });

          // Update activity status
          const updatedActivity: OfflineActivity = {
            id: activity.id,
            userId: activity.userId,
            activityType: activity.activityType,
            data: activity.data,
            timestamp: activity.timestamp,
            queuedAt: activity.queuedAt,
            retryCount: activity.retryCount + 1,
            maxRetries: activity.maxRetries,
            status: activity.retryCount + 1 >= activity.maxRetries ? "failed" : "pending",
            error: errorMessage,
          };

          await this.dbManager.updateActivity(updatedActivity);

          console.error(`[SyncManager] Failed to sync activity: ${activity.id}`, error);
        }
      }

      const result: SyncResult = {
        success: failedCount === 0,
        totalProcessed: sortedActivities.length,
        successCount,
        failedCount,
        errors,
        duration: Date.now() - startTime,
      };

      this.updateState({
        status: result.success ? "success" : "error",
        lastSyncTime: new Date(),
        lastSyncResult: result,
        progress: {
          total: sortedActivities.length,
          processed: sortedActivities.length,
          current: null,
          percentage: 100,
        },
      });

      console.log(`[SyncManager] Sync complete:`, result);

      // Dispatch success notification event
      if (result.success && result.successCount > 0) {
        window.dispatchEvent(
          new CustomEvent("offline-sync-complete", {
            detail: result,
          })
        );
      }

      this.isSyncing = false;
      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        errors: [
          {
            activityId: "unknown",
            error: error instanceof Error ? error.message : "Unknown error",
            retryable: true,
          },
        ],
        duration: Date.now() - startTime,
      };

      this.updateState({
        status: "error",
        lastSyncResult: result,
        progress: null,
      });

      this.isSyncing = false;
      throw error;
    }
  }

  /**
   * Sync a single activity with retry logic
   */
  private async syncActivityWithRetry(activity: OfflineActivity): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.syncActivity(activity);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Sync a single activity (integrate with your API)
   */
  private async syncActivity(activity: OfflineActivity): Promise<void> {
    // Import the user service client dynamically to avoid circular dependencies
    const { userServiceClient } = await import("@/lib/user-service");
    
    const activityData = activity.data as Record<string, unknown>;

    // Record the activity using the user service client
    await userServiceClient.recordActivity(activityData as never);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Network errors are retryable
      if (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("fetch")
      ) {
        return true;
      }

      // 5xx server errors are retryable
      if (message.includes("500") || message.includes("502") || message.includes("503")) {
        return true;
      }

      // 4xx client errors are generally not retryable
      if (message.includes("400") || message.includes("401") || message.includes("404")) {
        return false;
      }
    }

    // Default to retryable
    return true;
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Add a state change listener
   */
  addListener(listener: (state: SyncState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error("[SyncManager] Error in listener:", error);
      }
    }
  }

  /**
   * Get current state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncManager: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager();
  }

  return syncManager;
}
