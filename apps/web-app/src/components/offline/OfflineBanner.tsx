/**
 * Offline Banner Component
 * 
 * Displays a banner when the user is offline and shows sync progress
 * when connection is restored.
 * 
 * Requirements: 11.1, 11.4, 11.5
 * Task: 12.4
 */

"use client";

import { useEffect, useState } from "react";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { AlertCircle, CheckCircle, Loader2, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { state: offlineState, dismissBanner } = useOffline();
  const { state: syncState, isSyncing, progress } = useOfflineSync();
  const [isVisible, setIsVisible] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Show banner when offline or syncing
  useEffect(() => {
    if (offlineState.showOfflineBanner || isSyncing) {
      setIsVisible(true);
    }
  }, [offlineState.showOfflineBanner, isSyncing]);

  // Show success message briefly after sync completes
  useEffect(() => {
    if (
      syncState.status === "success" &&
      syncState.lastSyncResult &&
      syncState.lastSyncResult.successCount > 0
    ) {
      setShowSyncSuccess(true);
      setIsVisible(true);

      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setShowSyncSuccess(false);
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [syncState.status, syncState.lastSyncResult]);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowSyncSuccess(false);
    dismissBanner();
  };

  if (!isVisible) return null;

  // Sync success state
  if (showSyncSuccess && syncState.lastSyncResult) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Your offline progress has been saved</p>
                <p className="text-sm text-green-100">
                  Successfully synced {syncState.lastSyncResult.successCount}{" "}
                  {syncState.lastSyncResult.successCount === 1 ? "activity" : "activities"}.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-green-700 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Syncing state
  if (isSyncing && progress) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <div className="bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              <div className="flex-1">
                <p className="font-medium">Syncing offline activities...</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-blue-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-blue-100 whitespace-nowrap">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Offline state
  if (offlineState.isOffline || offlineState.heartbeatFailed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <div className="bg-yellow-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">You&apos;re offline</p>
                <p className="text-sm text-yellow-100">
                  Some features are unavailable but you can continue learning with cached content.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-yellow-700 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sync error state
  if (syncState.status === "error" && syncState.lastSyncResult) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Some activities failed to sync</p>
                <p className="text-sm text-red-100">
                  {syncState.lastSyncResult.failedCount}{" "}
                  {syncState.lastSyncResult.failedCount === 1 ? "activity" : "activities"} could
                  not be synced. They will be retried automatically.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-red-700 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Compact Offline Indicator
 * 
 * A smaller indicator that can be placed in the header or sidebar
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const { isOffline } = useOffline();
  const { isSyncing } = useOfflineSync();

  if (!isOffline && !isSyncing) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        isSyncing && "bg-blue-100 text-blue-700",
        isOffline && !isSyncing && "bg-yellow-100 text-yellow-700",
        className
      )}
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
