"use client";

/**
 * Offline Banner Component
 * 
 * Displays a banner when the user is offline or connection is lost.
 * Provides clear feedback about offline status and cached content availability.
 * 
 * Requirements: 11.1, 14.1
 * Task: 12.1
 */

import { useOffline } from "@/contexts/OfflineContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OfflineBannerProps {
  className?: string;
  showDismiss?: boolean;
  showRetry?: boolean;
  position?: "top" | "bottom";
}

export function OfflineBanner({
  className,
  showDismiss = true,
  showRetry = true,
  position = "top",
}: OfflineBannerProps) {
  const { state, isOffline, dismissBanner, forceHeartbeat } = useOffline();

  // Don't show if online and banner is dismissed
  if (!state.showOfflineBanner || !isOffline) {
    return null;
  }

  const handleRetry = async () => {
    const online = await forceHeartbeat();
    if (online) {
      dismissBanner();
    }
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 px-4 py-2",
        position === "top" ? "top-0" : "bottom-0",
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <WifiOff
            className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5"
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0">
            <AlertTitle className="text-amber-900 dark:text-amber-100 text-sm font-semibold">
              You&apos;re offline
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm mt-1">
              {state.heartbeatFailed
                ? "Connection to the server was lost. Some features are unavailable but you can continue learning with cached content."
                : "Your device is offline. Some features are unavailable but you can continue learning with cached content."}
            </AlertDescription>

            {state.networkStatus.effectiveType && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Network: {state.networkStatus.effectiveType}
                {state.networkStatus.rtt && ` • RTT: ${state.networkStatus.rtt}ms`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-800"
                aria-label="Retry connection"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {showDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissBanner}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-800"
                aria-label="Dismiss offline banner"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Compact Offline Indicator Badge
 * Shows a small badge when offline without taking up much space
 */
export interface OfflineBadgeProps {
  className?: string;
}

export function OfflineBadge({ className }: OfflineBadgeProps) {
  const { isOffline } = useOffline();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3 w-3" aria-hidden="true" />
      <span>Offline</span>
    </div>
  );
}

/**
 * Inline Offline Message
 * Shows an inline message about offline status
 */
export interface OfflineMessageProps {
  className?: string;
  message?: string;
}

export function OfflineMessage({ className, message }: OfflineMessageProps) {
  const { isOffline, state } = useOffline();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>
        {message ||
          (state.heartbeatFailed
            ? "Connection lost - showing cached content"
            : "You're offline - showing cached content")}
      </span>
    </div>
  );
}
