"use client";

/**
 * Sync Status Indicator Component
 * 
 * Displays sync progress and status when syncing offline activities.
 * 
 * Requirements: 11.4, 11.5
 * Task: 12.4
 */

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SyncStatusIndicatorProps {
  className?: string;
  showProgress?: boolean;
  showRetry?: boolean;
}

export function SyncStatusIndicator({
  className,
  showProgress = true,
  showRetry = true,
}: SyncStatusIndicatorProps) {
  const { state, syncAll, isSyncing, isOffline } = useOfflineSync();

  // Don't show if idle and no recent sync
  if (state.status === "idle" && !state.lastSyncResult) {
    return null;
  }

  // Don't show if offline
  if (isOffline) {
    return null;
  }

  const handleRetry = async () => {
    await syncAll();
  };

  // Syncing state
  if (isSyncing && state.progress) {
    return (
      <div
        className={cn(
          "rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20",
          className
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-start gap-3">
          <Loader2
            className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5"
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0">
            <AlertTitle className="text-blue-900 dark:text-blue-100 text-sm font-semibold">
              Syncing offline progress...
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              {state.progress.processed} of {state.progress.total} activities synced
            </AlertDescription>

            {showProgress && (
              <Progress
                value={state.progress.percentage}
                className="mt-3 h-2"
                aria-label={`Sync progress: ${state.progress.percentage}%`}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state (show briefly)
  if (state.status === "success" && state.lastSyncResult) {
    const result = state.lastSyncResult;

    if (result.successCount === 0) {
      return null;
    }

    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-start gap-3">
          <CheckCircle
            className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5"
            aria-hidden="true"
          />

          <div className="flex-1">
            <AlertTitle className="text-green-900 dark:text-green-100 text-sm font-semibold">
              Sync Complete
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300 text-sm mt-1">
              Successfully synced {result.successCount}{" "}
              {result.successCount === 1 ? "activity" : "activities"}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  // Error state
  if (state.status === "error" && state.lastSyncResult) {
    const result = state.lastSyncResult;

    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <XCircle
            className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5"
            aria-hidden="true"
          />

          <div className="flex-1">
            <AlertTitle className="text-red-900 dark:text-red-100 text-sm font-semibold">
              Sync Failed
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300 text-sm mt-1">
              {result.failedCount} {result.failedCount === 1 ? "activity" : "activities"} could
              not be synced. {result.errors.length > 0 && result.errors[0] && result.errors[0].retryable && "Will retry automatically."}
            </AlertDescription>
          </div>

          {showRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-red-700 hover:text-red-900 hover:bg-red-100 dark:text-red-300 dark:hover:text-red-100 dark:hover:bg-red-800"
              aria-label="Retry sync"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return null;
}

/**
 * Compact sync status badge
 */
export interface SyncStatusBadgeProps {
  className?: string;
}

export function SyncStatusBadge({ className }: SyncStatusBadgeProps) {
  const { isSyncing, state } = useOfflineSync();

  if (!isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      <span>Syncing</span>
      {state.progress && (
        <span className="text-blue-700 dark:text-blue-400">
          {state.progress.processed}/{state.progress.total}
        </span>
      )}
    </div>
  );
}
