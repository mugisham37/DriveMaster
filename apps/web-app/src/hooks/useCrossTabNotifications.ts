"use client";

/**
 * Hook for Cross-Tab Event Notifications
 * 
 * Provides toast notifications when authentication events occur in other tabs
 * Requirements: 12.1, 12.2, 12.3
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { crossTabSync, type AuthSyncMessage } from "@/lib/auth/cross-tab-sync";

export interface CrossTabNotificationOptions {
  /**
   * Enable login notifications
   * @default true
   */
  showLoginNotifications?: boolean;

  /**
   * Enable logout notifications
   * @default true
   */
  showLogoutNotifications?: boolean;

  /**
   * Enable profile update notifications
   * @default true
   */
  showProfileUpdateNotifications?: boolean;

  /**
   * Enable token refresh notifications
   * @default false (usually too frequent)
   */
  showTokenRefreshNotifications?: boolean;
}

/**
 * Hook to display toast notifications for cross-tab authentication events
 * 
 * @param options - Configuration for which notifications to show
 * 
 * @example
 * ```tsx
 * function MyApp() {
 *   useCrossTabNotifications({
 *     showLoginNotifications: true,
 *     showLogoutNotifications: true,
 *     showProfileUpdateNotifications: true,
 *   });
 *   
 *   return <div>My App</div>;
 * }
 * ```
 */
export function useCrossTabNotifications(
  options: CrossTabNotificationOptions = {}
) {
  const {
    showLoginNotifications = true,
    showLogoutNotifications = true,
    showProfileUpdateNotifications = true,
    showTokenRefreshNotifications = false,
  } = options;

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    const handleCrossTabMessage = (message: AuthSyncMessage) => {
      switch (message.type) {
        case "LOGIN":
          if (showLoginNotifications) {
            toast.info("Signed in from another tab", {
              description: "Your session has been synchronized",
              duration: 3000,
            });
          }
          break;

        case "LOGOUT":
          if (showLogoutNotifications) {
            toast.warning("Signed out from another tab", {
              description: "You have been logged out",
              duration: 4000,
            });
          }
          break;

        case "TOKEN_REFRESH":
          if (showTokenRefreshNotifications) {
            toast.success("Session refreshed", {
              description: "Your session has been extended",
              duration: 2000,
            });
          }
          break;

        case "SESSION_EXPIRED":
          if (showLogoutNotifications) {
            toast.error("Session expired", {
              description: "Please sign in again",
              duration: 5000,
            });
          }
          break;

        case "CONFLICT_RESOLUTION":
          // Only show for force logout
          const payload = message.payload as { action: string; reason: string };
          if (payload.action === "FORCE_LOGOUT" && showLogoutNotifications) {
            toast.warning("Session conflict resolved", {
              description: payload.reason,
              duration: 4000,
            });
          }
          break;
      }
    };

    // Register listener
    const unsubscribe = crossTabSync.addMessageListener(handleCrossTabMessage);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [
    showLoginNotifications,
    showLogoutNotifications,
    showProfileUpdateNotifications,
    showTokenRefreshNotifications,
  ]);
}

/**
 * Hook to get cross-tab sync status for debugging
 * 
 * @returns Status information about cross-tab synchronization
 * 
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const status = useCrossTabSyncStatus();
 *   
 *   return (
 *     <div>
 *       <p>Tab ID: {status.tabId}</p>
 *       <p>Initialized: {status.isInitialized ? 'Yes' : 'No'}</p>
 *       <p>Supported: {status.isSupported ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCrossTabSyncStatus() {
  return crossTabSync.getStatus();
}
