/**
 * Offline Activity Queue Hook
 * 
 * Queues activity records when offline and automatically syncs them
 * when the connection is restored.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { useRecordActivitiesBatch } from "./useUserService";
import type { ActivityRecord } from "@/types/user-service";

const STORAGE_KEY = "offline_activity_queue";
const MAX_QUEUE_SIZE = 100;
const SYNC_INTERVAL = 5000; // Try to sync every 5 seconds when online

interface QueuedActivity extends ActivityRecord {
  queuedAt: string;
}

export function useOfflineActivityQueue(userId: string | undefined) {
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);
  const queueRef = useRef<QueuedActivity[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { mutateAsync: recordBatch } = useRecordActivitiesBatch();

  // Load queue from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const queue = JSON.parse(stored) as QueuedActivity[];
        queueRef.current = queue;
        setQueuedCount(queue.length);
      }
    } catch (error) {
      console.error("Failed to load offline activity queue:", error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  const saveQueue = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queueRef.current));
      setQueuedCount(queueRef.current.length);
    } catch (error) {
      console.error("Failed to save offline activity queue:", error);
    }
  }, []);

  // Add activity to queue
  const queueActivity = useCallback(
    (activity: ActivityRecord) => {
      if (!userId) return;

      const queuedActivity: QueuedActivity = {
        ...activity,
        queuedAt: new Date().toISOString(),
      };

      queueRef.current.push(queuedActivity);

      // Limit queue size
      if (queueRef.current.length > MAX_QUEUE_SIZE) {
        queueRef.current = queueRef.current.slice(-MAX_QUEUE_SIZE);
      }

      saveQueue();
    },
    [userId, saveQueue]
  );

  // Sync queued activities
  const syncQueue = useCallback(async () => {
    if (!userId || queueRef.current.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      // Get activities to sync
      const activitiesToSync = queueRef.current.map(({ queuedAt, ...activity }) => activity);

      // Send batch request
      await recordBatch(activitiesToSync);

      // Clear queue on success
      queueRef.current = [];
      saveQueue();

      console.log(`Successfully synced ${activitiesToSync.length} queued activities`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Sync failed");
      setLastSyncError(err);
      console.error("Failed to sync activity queue:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing, recordBatch, saveQueue]);

  // Auto-sync when online
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("Connection restored, syncing queued activities...");
      syncQueue();
    };

    // Listen for online event
    window.addEventListener("online", handleOnline);

    // Set up periodic sync attempts when online
    if (navigator.onLine && queueRef.current.length > 0) {
      syncTimerRef.current = setInterval(() => {
        if (navigator.onLine && queueRef.current.length > 0) {
          syncQueue();
        }
      }, SYNC_INTERVAL);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [userId, syncQueue]);

  // Check if offline
  const isOffline = typeof window !== "undefined" ? !navigator.onLine : false;

  return {
    queuedCount,
    isSyncing,
    lastSyncError,
    isOffline,
    queueActivity,
    syncQueue,
    clearQueue: useCallback(() => {
      queueRef.current = [];
      saveQueue();
    }, [saveQueue]),
  };
}

/**
 * Hook to automatically queue activities when offline
 */
export function useAutoQueueActivity(userId: string | undefined) {
  const { queueActivity, isOffline } = useOfflineActivityQueue(userId);
  const { mutateAsync: recordActivity } = useRecordActivitiesBatch();

  const recordActivityWithQueue = useCallback(
    async (activity: ActivityRecord) => {
      if (isOffline) {
        // Queue for later if offline
        queueActivity(activity);
        return null;
      }

      try {
        // Try to record immediately if online
        const result = await recordActivity([activity]);
        return result[0];
      } catch (error) {
        // Queue if request fails
        queueActivity(activity);
        throw error;
      }
    },
    [isOffline, queueActivity, recordActivity]
  );

  return {
    recordActivity: recordActivityWithQueue,
    isOffline,
  };
}
