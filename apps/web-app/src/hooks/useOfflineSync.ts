/**
 * Offline Sync Hook
 * 
 * Provides access to offline sync functionality.
 * Automatically syncs when connection is restored.
 * Displays sync notifications.
 * 
 * Requirements: 11.4, 11.5
 * Task: 12.4
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useOffline } from "@/contexts/OfflineContext";
import { getSyncManager, type SyncState, type SyncResult } from "@/lib/offline/sync-manager";
import { toast } from "sonner";

// ============================================================================
// Hook
// ============================================================================

export function useOfflineSync() {
  const { isOffline } = useOffline();
  const [state, setState] = useState<SyncState>(() => getSyncManager().getState());
  const syncManagerRef = useRef(getSyncManager());
  const isInitializedRef = useRef(false);
  const hasShownSuccessToastRef = useRef(false);

  // ============================================================================
  // Initialize
  // ============================================================================

  useEffect(() => {
    if (isInitializedRef.current) return;

    const init = async () => {
      try {
        await syncManagerRef.current.init();
        isInitializedRef.current = true;

        // Subscribe to state changes
        const unsubscribe = syncManagerRef.current.addListener((newState) => {
          setState(newState);
        });

        return unsubscribe;
      } catch (error) {
        console.error("[OfflineSync] Failed to initialize:", error);
        return undefined;
      }
    };

    const unsubscribePromise = init();

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  // ============================================================================
  // Sync All
  // ============================================================================

  const syncAll = useCallback(async (): Promise<SyncResult | null> => {
    if (!isInitializedRef.current || isOffline) {
      return null;
    }

    try {
      const result = await syncManagerRef.current.syncAll();
      return result;
    } catch (error) {
      console.error("[OfflineSync] Sync failed:", error);
      return null;
    }
  }, [isOffline]);

  // ============================================================================
  // Auto-sync on reconnection
  // ============================================================================

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const handleOnline = async () => {
      console.log("[OfflineSync] Connection restored, starting sync...");

      // Reset toast flag
      hasShownSuccessToastRef.current = false;

      // Wait a bit for connection to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Trigger sync
      await syncAll();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [syncAll]);

  // ============================================================================
  // Listen for sync complete events
  // ============================================================================

  useEffect(() => {
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<SyncResult>;
      const result = customEvent.detail;

      // Only show toast once per sync
      if (hasShownSuccessToastRef.current) return;
      hasShownSuccessToastRef.current = true;

      if (result.success && result.successCount > 0) {
        toast.success("Your offline progress has been saved", {
          description: `Successfully synced ${result.successCount} ${result.successCount === 1 ? "activity" : "activities"}.`,
        });
      } else if (result.failedCount > 0) {
        toast.error("Some activities failed to sync", {
          description: `${result.failedCount} ${result.failedCount === 1 ? "activity" : "activities"} could not be synced. They will be retried later.`,
        });
      }
    };

    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, []);

  // ============================================================================
  // Show error notifications
  // ============================================================================

  useEffect(() => {
    if (state.status === "error" && state.lastSyncResult) {
      const result = state.lastSyncResult;

      if (result.failedCount > 0) {
        toast.error("Sync Error", {
          description: `Failed to sync ${result.failedCount} ${result.failedCount === 1 ? "activity" : "activities"}. Will retry automatically.`,
        });
      }
    }
  }, [state.status, state.lastSyncResult]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    state,
    syncAll,
    isSyncing: state.status === "syncing",
    lastSyncTime: state.lastSyncTime,
    lastSyncResult: state.lastSyncResult,
    progress: state.progress,
    isOffline,
  };
}
