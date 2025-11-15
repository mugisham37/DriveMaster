/**
 * Real-Time Status Bar Component
 * 
 * Displays comprehensive real-time connection status including:
 * - WebSocket connection status
 * - Offline queue status
 * - Cross-tab sync status
 */

"use client";

import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { ConnectionStatusIndicator } from "../atoms/ConnectionStatusIndicator";
import { AlertCircle, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeStatusBarProps {
  userId: string | undefined;
  className?: string;
  compact?: boolean;
}

export function RealtimeStatusBar({
  userId,
  className,
  compact = false,
}: RealtimeStatusBarProps) {
  const { status, reconnect, syncOfflineQueue } = useRealtimeSync(userId);

  // Don't show if fully connected and no queued items
  if (
    status.overall.isFullyConnected &&
    !status.offline.queuedCount &&
    !compact
  ) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <ConnectionStatusIndicator
          isConnected={status.overall.isFullyConnected}
          isConnecting={status.overall.isReconnecting}
          error={status.progress.error || status.activity.error || null}
          showLabel={false}
          onReconnect={reconnect}
        />
        {status.offline.queuedCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CloudOff className="h-3 w-3" />
            <span>{status.offline.queuedCount}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-b bg-muted/50 px-4 py-2",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <ConnectionStatusIndicator
            isConnected={status.overall.isFullyConnected}
            isConnecting={status.overall.isReconnecting}
            error={status.progress.error || status.activity.error || null}
            onReconnect={reconnect}
          />

          {/* Offline Queue Status */}
          {status.offline.queuedCount > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm dark:bg-blue-950">
              {status.offline.isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <CloudOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {status.offline.isSyncing
                  ? "Syncing queued activities..."
                  : `${status.offline.queuedCount} activities queued`}
              </span>
              {!status.offline.isSyncing && !status.offline.isOffline && (
                <button
                  onClick={syncOfflineQueue}
                  className="ml-2 text-xs underline hover:no-underline"
                >
                  Sync now
                </button>
              )}
            </div>
          )}

          {/* Offline Indicator */}
          {status.offline.isOffline && (
            <div className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-1.5 text-sm dark:bg-orange-950">
              <Cloud className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="font-medium text-orange-600 dark:text-orange-400">
                You're offline. Changes will sync when reconnected.
              </span>
            </div>
          )}

          {/* Error Status */}
          {status.overall.hasErrors && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-600 dark:text-red-400">
                Connection error. Some features may be limited.
              </span>
            </div>
          )}
        </div>

        {/* Last Update Info */}
        {status.progress.lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last update: {new Date(status.progress.lastUpdate).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Floating status indicator for minimal UI
 */
export function FloatingRealtimeStatus({
  userId,
  className,
}: Omit<RealtimeStatusBarProps, "compact">) {
  const { status, reconnect } = useRealtimeSync(userId);

  // Only show when there's something to report
  if (
    status.overall.isFullyConnected &&
    !status.offline.queuedCount &&
    !status.overall.hasErrors
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-lg border bg-background p-3 shadow-lg",
        className
      )}
    >
      <RealtimeStatusBar userId={userId} compact />
      {!status.overall.isFullyConnected && (
        <button
          onClick={reconnect}
          className="mt-2 w-full rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
