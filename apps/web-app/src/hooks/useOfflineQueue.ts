/**
 * Enhanced Offline Activity Queue Hook
 * 
 * Uses IndexedDB for persistent storage of offline activities.
 * Provides immediate UI feedback for queued activities.
 * 
 * Requirements: 11.2, 11.3
 * Task: 12.2
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useOffline } from "@/contexts/OfflineContext";
import { getIndexedDBManager, isIndexedDBSupported, type OfflineActivity } from "@/lib/offline/indexeddb-manager";
import type { ActivityRecord } from "@/types/user-service";

// ============================================================================
// Types
// ============================================================================

export interface OfflineQueueState {
  queuedCount: number;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncError: Error | null;
}

export interface QueueActivityOptions {
  maxRetries?: number;
  immediate?: boolean; // Show immediate UI feedback
}

// ============================================================================
// Hook
// ============================================================================

export function useOfflineQueue(userId: string | undefined) {
  const { isOffline } = useOffline();
  const [state, setState] = useState<OfflineQueueState>({
    queuedCount: 0,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastSyncError: null,
  });

  const dbManagerRef = useRef(getIndexedDBManager());
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // ============================================================================
  // Update Counts
  // ============================================================================

  const updateCounts = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      const [total, pending, syncing, failed] = await Promise.all([
        dbManagerRef.current.getCount(),
        dbManagerRef.current.getCountByStatus("pending"),
        dbManagerRef.current.getCountByStatus("syncing"),
        dbManagerRef.current.getCountByStatus("failed"),
      ]);

      setState((prev) => ({
        ...prev,
        queuedCount: total,
        pendingCount: pending,
        syncingCount: syncing,
        failedCount: failed,
      }));
    } catch (error) {
      console.error("[OfflineQueue] Failed to update counts:", error);
    }
  }, []);

  // ============================================================================
  // Initialize IndexedDB
  // ============================================================================

  useEffect(() => {
    if (!isIndexedDBSupported() || isInitializedRef.current) {
      return;
    }

    const initDB = async () => {
      try {
        await dbManagerRef.current.init();
        isInitializedRef.current = true;

        // Load initial counts
        await updateCounts();
      } catch (error) {
        console.error("[OfflineQueue] Failed to initialize IndexedDB:", error);
      }
    };

    initDB();
  }, [updateCounts]);

  // ============================================================================
  // Queue Activity
  // ============================================================================

  const queueActivity = useCallback(
    async (
      activity: Omit<ActivityRecord, "id" | "timestamp">,
      options: QueueActivityOptions = {}
    ): Promise<string> => {
      if (!userId || !isInitializedRef.current) {
        throw new Error("Cannot queue activity: user not authenticated or DB not initialized");
      }

      const { maxRetries = 3, immediate = true } = options;

      const offlineActivity: OfflineActivity = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        activityType: activity.activityType,
        data: activity,
        timestamp: new Date(),
        queuedAt: new Date(),
        retryCount: 0,
        maxRetries,
        status: "pending",
      };

      try {
        await dbManagerRef.current.addActivity(offlineActivity);
        await updateCounts();

        console.log("[OfflineQueue] Activity queued:", offlineActivity.id);

        // Provide immediate UI feedback if requested
        if (immediate) {
          // Dispatch custom event for immediate UI updates
          window.dispatchEvent(
            new CustomEvent("offline-activity-queued", {
              detail: offlineActivity,
            })
          );
        }

        return offlineActivity.id;
      } catch (error) {
        console.error("[OfflineQueue] Failed to queue activity:", error);
        throw error;
      }
    },
    [userId, updateCounts]
  );

  // ============================================================================
  // Sync Queue
  // ============================================================================

  const syncQueue = useCallback(async (): Promise<void> => {
    if (!userId || !isInitializedRef.current || state.isSyncing || isOffline) {
      return;
    }

    setState((prev) => ({ ...prev, isSyncing: true, lastSyncError: null }));

    try {
      // Get all pending activities
      const pendingActivities = await dbManagerRef.current.getActivitiesByStatus("pending");

      if (pendingActivities.length === 0) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
        }));
        return;
      }

      console.log(`[OfflineQueue] Syncing ${pendingActivities.length} activities`);

      // Sort by timestamp (oldest first)
      const sortedActivities = pendingActivities.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      let successCount = 0;
      let failCount = 0;

      // Process each activity
      for (const activity of sortedActivities) {
        try {
          // Mark as syncing
          await dbManagerRef.current.updateActivity({
            ...activity,
            status: "syncing",
          });

          // Attempt to sync (this would call your actual API)
          await syncActivity(activity);

          // Mark as synced and delete
          await dbManagerRef.current.deleteActivity(activity.id);
          successCount++;

          console.log("[OfflineQueue] Activity synced:", activity.id);
        } catch (error) {
          failCount++;

          // Increment retry count
          const updatedActivity: OfflineActivity = {
            ...activity,
            retryCount: activity.retryCount + 1,
            status: activity.retryCount + 1 >= activity.maxRetries ? "failed" : "pending",
            error: error instanceof Error ? error.message : "Unknown error",
          };

          await dbManagerRef.current.updateActivity(updatedActivity);

          console.error("[OfflineQueue] Failed to sync activity:", activity.id, error);
        }
      }

      await updateCounts();

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncError: failCount > 0 ? new Error(`${failCount} activities failed to sync`) : null,
      }));

      console.log(`[OfflineQueue] Sync complete: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Sync failed");

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncError: err,
      }));

      console.error("[OfflineQueue] Sync error:", error);
    }
  }, [userId, state.isSyncing, isOffline, updateCounts]);

  // ============================================================================
  // Sync Activity (integrate with user service API)
  // ============================================================================

  const syncActivity = async (activity: OfflineActivity): Promise<void> => {
    // Import the user service client dynamically
    const { userServiceClient } = await import("@/lib/user-service");
    
    const activityData = activity.data as Record<string, unknown>;

    // Record the activity using the user service client
    await userServiceClient.recordActivity(activityData as never);
  };

  // ============================================================================
  // Auto-sync when online
  // ============================================================================

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const handleOnline = () => {
      console.log("[OfflineQueue] Connection restored, syncing queue...");
      syncQueue();
    };

    window.addEventListener("online", handleOnline);

    // Set up periodic sync attempts when online
    if (!isOffline && state.pendingCount > 0) {
      syncTimerRef.current = setInterval(() => {
        if (!isOffline && state.pendingCount > 0) {
          syncQueue();
        }
      }, 30000); // Try every 30 seconds
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [isOffline, state.pendingCount, syncQueue]);

  // ============================================================================
  // Periodic count updates
  // ============================================================================

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const interval = setInterval(updateCounts, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [updateCounts]);

  // ============================================================================
  // Clear Queue
  // ============================================================================

  const clearQueue = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      await dbManagerRef.current.clearAll();
      await updateCounts();
      console.log("[OfflineQueue] Queue cleared");
    } catch (error) {
      console.error("[OfflineQueue] Failed to clear queue:", error);
    }
  }, [updateCounts]);

  // ============================================================================
  // Get Queued Activities
  // ============================================================================

  const getQueuedActivities = useCallback(async (): Promise<OfflineActivity[]> => {
    if (!isInitializedRef.current) return [];

    try {
      return await dbManagerRef.current.getAllActivities();
    } catch (error) {
      console.error("[OfflineQueue] Failed to get queued activities:", error);
      return [];
    }
  }, []);

  // ============================================================================
  // Retry Failed Activities
  // ============================================================================

  const retryFailedActivities = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      const failedActivities = await dbManagerRef.current.getActivitiesByStatus("failed");

      for (const activity of failedActivities) {
        await dbManagerRef.current.updateActivity({
          ...activity,
          status: "pending",
          retryCount: 0,
        });
      }

      await updateCounts();
      console.log(`[OfflineQueue] Retrying ${failedActivities.length} failed activities`);

      // Trigger sync
      if (!isOffline) {
        syncQueue();
      }
    } catch (error) {
      console.error("[OfflineQueue] Failed to retry activities:", error);
    }
  }, [isOffline, syncQueue, updateCounts]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    state,
    queueActivity,
    syncQueue,
    clearQueue,
    getQueuedActivities,
    retryFailedActivities,
    isOffline,
    isSupported: isIndexedDBSupported(),
  };
}
