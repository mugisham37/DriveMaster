/**
 * Real-Time Provider Component
 * 
 * Initializes and manages real-time features for the application.
 * Should be placed high in the component tree, typically in the root layout.
 */

"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useRealtimeSync, RealtimeSyncStatus } from "@/hooks/useRealtimeSync";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RealtimeContextValue {
  status: RealtimeSyncStatus;
  reconnect: () => void;
  syncOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within RealtimeProvider");
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
  showToasts?: boolean;
}

export function RealtimeProvider({
  children,
  showToasts = true,
}: RealtimeProviderProps) {
  const { user } = useAuth();
  const userId = user?.id?.toString();

  const {
    status,
    reconnect,
    syncOfflineQueue,
    clearOfflineQueue,
  } = useRealtimeSync(userId);

  // Show toast notifications for connection status changes
  useEffect(() => {
    if (!showToasts) return;

    if (status.overall.isFullyConnected) {
      toast.success("Connected", {
        description: "Real-time updates are active",
        duration: 2000,
      });
    }
  }, [status.overall.isFullyConnected, showToasts]);

  useEffect(() => {
    if (!showToasts) return;

    if (status.offline.isOffline) {
      toast.warning("You're offline", {
        description: "Changes will sync when you reconnect",
        duration: 5000,
      });
    }
  }, [status.offline.isOffline, showToasts]);

  useEffect(() => {
    if (!showToasts) return;

    if (status.overall.hasErrors && !status.overall.isReconnecting) {
      toast.error("Connection error", {
        description: "Some features may be limited. Click to retry.",
        action: {
          label: "Retry",
          onClick: reconnect,
        },
        duration: 10000,
      });
    }
  }, [status.overall.hasErrors, status.overall.isReconnecting, showToasts, reconnect]);

  // Listen for milestone achievements
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMilestone = (event: Event) => {
      const customEvent = event as CustomEvent;
      const milestone = customEvent.detail;

      if (showToasts) {
        toast.success("🎉 Milestone Achieved!", {
          description: milestone.title || "You've reached a new milestone!",
          duration: 5000,
        });
      }
    };

    window.addEventListener("milestone:achieved", handleMilestone);

    return () => {
      window.removeEventListener("milestone:achieved", handleMilestone);
    };
  }, [showToasts]);

  const value: RealtimeContextValue = {
    status,
    reconnect,
    syncOfflineQueue,
    clearOfflineQueue,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to check if real-time features are available
 */
export function useRealtimeAvailable() {
  const { status } = useRealtimeContext();
  return status.overall.isFullyConnected;
}

/**
 * Hook to get offline queue status
 */
export function useOfflineStatus() {
  const { status, syncOfflineQueue } = useRealtimeContext();
  return {
    isOffline: status.offline.isOffline,
    queuedCount: status.offline.queuedCount,
    isSyncing: status.offline.isSyncing,
    syncQueue: syncOfflineQueue,
  };
}
