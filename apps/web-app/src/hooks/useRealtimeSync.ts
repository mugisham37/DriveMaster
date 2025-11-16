/**
 * Combined Real-Time Synchronization Hook
 * 
 * Integrates WebSocket connections, cross-tab sync, and offline queue
 * for a complete real-time experience.
 */

import { useRealtimeProgress } from "./useRealtimeProgress";
import { useRealtimeActivity } from "./useRealtimeActivity";
import { useOfflineActivityQueue } from "./useOfflineActivityQueue";
import { useCrossTabSync } from "./useCrossTabSync";

export interface RealtimeSyncStatus {
  progress: {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    lastUpdate: Date | null;
  };
  activity: {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    lastActivity: unknown;
  };
  offline: {
    queuedCount: number;
    isSyncing: boolean;
    isOffline: boolean;
    lastSyncError: Error | null;
  };
  overall: {
    isFullyConnected: boolean;
    hasErrors: boolean;
    isReconnecting: boolean;
  };
}

/**
 * Main hook for real-time synchronization
 */
export function useRealtimeSync(userId: string | undefined) {
  const progressSync = useRealtimeProgress({ enabled: !!userId });
  const activitySync = useRealtimeActivity(userId);
  const offlineQueue = useOfflineActivityQueue(userId);
  const crossTabSync = useCrossTabSync();

  const status: RealtimeSyncStatus = {
    progress: {
      isConnected: progressSync.isConnected,
      isConnecting: false,
      error: null,
      lastUpdate: null,
    },
    activity: {
      isConnected: activitySync.isConnected,
      isConnecting: activitySync.isConnecting || false,
      error: activitySync.error || null,
      lastActivity: activitySync.lastActivity,
    },
    offline: {
      queuedCount: offlineQueue.queuedCount,
      isSyncing: offlineQueue.isSyncing,
      isOffline: offlineQueue.isOffline,
      lastSyncError: offlineQueue.lastSyncError,
    },
    overall: {
      isFullyConnected: progressSync.isConnected && activitySync.isConnected,
      hasErrors: !!(activitySync.error || offlineQueue.lastSyncError),
      isReconnecting: activitySync.isConnecting || false,
    },
  };

  return {
    status,
    reconnect: () => {
      if (typeof activitySync.reconnect === 'function') {
        activitySync.reconnect();
      }
    },
    syncOfflineQueue: offlineQueue.syncQueue,
    clearOfflineQueue: offlineQueue.clearQueue,
    crossTabSync,
  };
}
