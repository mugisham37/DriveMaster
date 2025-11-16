/**
 * Offline Integration Component
 * 
 * Integrates all offline functionality:
 * - Offline detection
 * - Activity queueing
 * - Automatic sync on reconnection
 * - Progress notifications
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * Task: 12.4
 */

"use client";

import { useEffect } from "react";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineBanner } from "./OfflineBanner";

export function OfflineIntegration() {
  const { isOffline, state: offlineState } = useOffline();
  const { syncAll, state: syncState } = useOfflineSync();

  // Log offline state changes for debugging
  useEffect(() => {
    if (isOffline) {
      console.log("[OfflineIntegration] Device is offline");
    } else {
      console.log("[OfflineIntegration] Device is online");
    }
  }, [isOffline]);

  // Log sync state changes for debugging
  useEffect(() => {
    if (syncState.status === "syncing") {
      console.log("[OfflineIntegration] Sync started");
    } else if (syncState.status === "success") {
      console.log("[OfflineIntegration] Sync completed successfully", syncState.lastSyncResult);
    } else if (syncState.status === "error") {
      console.log("[OfflineIntegration] Sync failed", syncState.lastSyncResult);
    }
  }, [syncState.status, syncState.lastSyncResult]);

  // Trigger manual sync when coming back online after being offline
  useEffect(() => {
    if (!isOffline && offlineState.lastOfflineTime) {
      const timeSinceOffline = Date.now() - offlineState.lastOfflineTime.getTime();
      
      // If we were offline recently (within last 5 minutes), trigger sync
      if (timeSinceOffline < 5 * 60 * 1000) {
        console.log("[OfflineIntegration] Triggering manual sync after reconnection");
        syncAll().catch((error) => {
          console.error("[OfflineIntegration] Manual sync failed:", error);
        });
      }
    }
  }, [isOffline, offlineState.lastOfflineTime, syncAll]);

  return <OfflineBanner />;
}
