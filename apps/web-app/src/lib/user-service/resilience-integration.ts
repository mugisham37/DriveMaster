/**
 * User Service Resilience Integration Example
 *
 * Demonstrates how to integrate all error handling, graceful degradation,
 * and offline support components for a complete resilience solution.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4
 */

import React from "react";
import {
  enhancedUserServiceErrorHandler,
  gracefulDegradationManager,
  offlineManager,
  UserServiceErrorBoundary,
  OfflineIndicator,
  useGracefulDegradation,
  useOfflineManager,
} from "./index";
import type {
  UserProfile,
  UserPreferences,
  ProgressSummary,
  UserServiceError,
} from "@/types/user-service";
import type { DegradationState } from "./graceful-degradation";
import type { OfflineState } from "./offline-support";

// ============================================================================
// Resilient User Service Client
// ============================================================================

export class ResilientUserServiceClient {
  private baseClient: any; // Your actual UserServiceClient

  constructor(baseClient: any) {
    this.baseClient = baseClient;
    this.setupIntegration();
  }

  private setupIntegration(): void {
    // Set up error handling callbacks
    enhancedUserServiceErrorHandler.onError("user-profile", (error) => {
      this.handleUserProfileError(error);
    });

    enhancedUserServiceErrorHandler.onError("user-preferences", (error) => {
      this.handleUserPreferencesError(error);
    });

    enhancedUserServiceErrorHandler.onError("progress-tracking", (error) => {
      this.handleProgressError(error);
    });

    // Set up degradation state monitoring
    gracefulDegradationManager.onStateChange((state) => {
      this.handleDegradationStateChange(state);
    });

    // Set up offline state monitoring
    offlineManager.onStateChange((state) => {
      this.handleOfflineStateChange(state);
    });
  }

  // ============================================================================
  // Resilient Data Access Methods
  // ============================================================================

  async getUserProfile(userId: string): Promise<UserProfile> {
    return enhancedUserServiceErrorHandler.executeWithEnhancedProtection(
      async () => {
        return gracefulDegradationManager.getUserProfile(userId, () =>
          this.baseClient.getUser(userId),
        );
      },
      "user-profile",
    );
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    // Check if we're offline and should queue the operation
    if (offlineManager.isOffline() && offlineManager.canQueue()) {
      const operationId = offlineManager.queueOperation("update", "profile", {
        userId,
        ...updates,
      });

      console.log(
        "[ResilientClient] Queued profile update for offline sync:",
        operationId,
      );

      // Return optimistic update
      const currentProfile = await this.getUserProfile(userId);
      return { ...currentProfile, ...updates };
    }

    return enhancedUserServiceErrorHandler.executeWithEnhancedProtection(
      async () => {
        const result = await this.baseClient.updateUser(userId, updates);

        // Clear any queued operations for this profile
        const queuedOps = offlineManager.getQueuedOperations();
        const profileOps = queuedOps.filter(
          (op) => op.entity === "profile" && (op.data as any).userId === userId,
        );

        for (const op of profileOps) {
          offlineManager.removeOperation(op.id);
        }

        return result;
      },
      "user-profile",
    );
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return enhancedUserServiceErrorHandler.executeWithEnhancedProtection(
      async () => {
        return gracefulDegradationManager.getUserPreferences(userId, () =>
          this.baseClient.getUserPreferences(userId),
        );
      },
      "user-preferences",
    );
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    if (offlineManager.isOffline() && offlineManager.canQueue()) {
      const operationId = offlineManager.queueOperation(
        "update",
        "preferences",
        { userId, ...preferences },
      );

      console.log(
        "[ResilientClient] Queued preferences update for offline sync:",
        operationId,
      );

      const currentPrefs = await this.getUserPreferences(userId);
      return { ...currentPrefs, ...preferences };
    }

    return enhancedUserServiceErrorHandler.executeWithEnhancedProtection(
      async () => {
        return this.baseClient.updatePreferences(userId, preferences);
      },
      "user-preferences",
    );
  }

  async getProgressSummary(userId: string): Promise<ProgressSummary> {
    return enhancedUserServiceErrorHandler.executeWithEnhancedProtection(
      async () => {
        return gracefulDegradationManager.getProgressSummary(userId, () =>
          this.baseClient.getProgressSummary(userId),
        );
      },
      "progress-tracking",
    );
  }

  // ============================================================================
  // Error Handling Callbacks
  // ============================================================================

  private handleUserProfileError(error: UserServiceError): void {
    console.warn("[ResilientClient] User profile error:", error);

    // Trigger degradation if needed
    if (error.type === "service" && error.code === "SERVICE_UNAVAILABLE") {
      gracefulDegradationManager.enterDegradedMode(
        "User profile service unavailable",
        ["profile-updates", "real-time-sync"],
      );
    }
  }

  private handleUserPreferencesError(error: UserServiceError): void {
    console.warn("[ResilientClient] User preferences error:", error);

    if (error.type === "service") {
      gracefulDegradationManager.enterDegradedMode(
        "User preferences service degraded",
        ["preference-sync"],
      );
    }
  }

  private handleProgressError(error: UserServiceError): void {
    console.warn("[ResilientClient] Progress tracking error:", error);

    if (error.type === "service") {
      gracefulDegradationManager.enterDegradedMode(
        "Progress tracking service degraded",
        ["progress-updates", "real-time-progress"],
      );
    }
  }

  private handleDegradationStateChange(state: DegradationState): void {
    console.log("[ResilientClient] Degradation state changed:", state.mode);

    // Notify user about service status
    if (state.mode === "degraded") {
      this.showUserNotification(
        "Some features are temporarily limited due to service issues. We're working to restore full functionality.",
        "warning",
      );
    } else if (state.mode === "offline") {
      this.showUserNotification(
        "You're currently offline. Changes will be saved and synced when you're back online.",
        "info",
      );
    } else if (state.mode === "normal") {
      this.showUserNotification(
        "All services are now fully operational.",
        "success",
      );
    }
  }

  private handleOfflineStateChange(state: OfflineState): void {
    console.log("[ResilientClient] Offline state changed:", {
      isOffline: state.isOffline,
      queuedOperations: state.queuedOperations,
    });

    // Auto-sync when coming back online
    if (!state.isOffline && state.queuedOperations > 0) {
      this.syncOfflineChanges();
    }
  }

  private async syncOfflineChanges(): Promise<void> {
    try {
      const result = await offlineManager.syncWhenOnline();

      if (result.success) {
        this.showUserNotification(
          `Successfully synced ${result.processedOperations} offline changes.`,
          "success",
        );
      } else {
        this.showUserNotification(
          `Sync completed with ${result.failedOperations} errors. Some changes may need manual review.`,
          "warning",
        );
      }

      if (result.conflicts.length > 0) {
        this.handleSyncConflicts(result.conflicts);
      }
    } catch (error) {
      console.error("[ResilientClient] Sync failed:", error);
      this.showUserNotification(
        "Failed to sync offline changes. Will retry automatically.",
        "error",
      );
    }
  }

  private handleSyncConflicts(conflicts: any[]): void {
    // Handle conflicts that require manual resolution
    const manualConflicts = conflicts.filter((c) => c.resolution === "manual");

    if (manualConflicts.length > 0) {
      this.showUserNotification(
        `${manualConflicts.length} changes conflict with server data and need your review.`,
        "warning",
      );

      // You could show a conflict resolution UI here
      // this.showConflictResolutionModal(manualConflicts)
    }
  }

  private showUserNotification(
    message: string,
    type: "success" | "warning" | "error" | "info",
  ): void {
    // Integrate with your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Example: dispatch to a notification context or toast system
    // notificationService.show({ message, type })
  }

  // ============================================================================
  // Health and Status Methods
  // ============================================================================

  getServiceHealth(): {
    circuitBreaker: any;
    degradation: DegradationState;
    offline: OfflineState;
    contextHealth: Record<string, any>;
  } {
    return {
      circuitBreaker: enhancedUserServiceErrorHandler.getCircuitBreakerState(),
      degradation: gracefulDegradationManager.getState(),
      offline: offlineManager.getState(),
      contextHealth: enhancedUserServiceErrorHandler.getAllContextsHealth(),
    };
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      // Attempt a lightweight health check
      await this.baseClient.getHealth();

      // If successful and we're in degraded mode, try to recover
      const degradationState = gracefulDegradationManager.getState();
      if (degradationState.mode !== "normal") {
        gracefulDegradationManager.exitDegradedMode();
      }

      return true;
    } catch (error) {
      console.warn("[ResilientClient] Health check failed:", error);
      return false;
    }
  }

  cleanup(): void {
    enhancedUserServiceErrorHandler.resetAllContexts();
    gracefulDegradationManager.cleanup();
    offlineManager.cleanup();
  }
}

// ============================================================================
// React Components for Resilience UI
// ============================================================================

export interface ResilienceStatusProps {
  className?: string;
}

export function ResilienceStatus({ className = "" }: ResilienceStatusProps) {
  const degradation = useGracefulDegradation();
  const offline = useOfflineManager();

  return React.createElement(
    "div",
    {
      className: `space-y-2 ${className}`,
    },
    [
      // Offline Indicator
      React.createElement(OfflineIndicator, {
        key: "offline-indicator",
        state: offline.state,
      }),

      // Degradation Status
      degradation.state.mode !== "normal" &&
        React.createElement(
          "div",
          {
            key: "degradation-status",
            className:
              "flex items-center space-x-2 px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-md text-sm",
          },
          [
            React.createElement("div", {
              key: "status-dot",
              className: "w-2 h-2 bg-yellow-500 rounded-full",
            }),
            React.createElement(
              "span",
              {
                key: "status-text",
                className: "text-yellow-800 font-medium",
              },
              degradation.state.mode === "degraded"
                ? "Limited Service"
                : degradation.state.mode === "minimal"
                  ? "Minimal Service"
                  : "Service Issue",
            ),
            React.createElement(
              "span",
              {
                key: "status-reason",
                className: "text-yellow-700",
              },
              degradation.state.reason,
            ),
          ],
        ),

      // Cache Status
      degradation.state.cacheStatus === "stale" &&
        React.createElement(
          "div",
          {
            key: "cache-status",
            className:
              "flex items-center space-x-2 px-3 py-2 bg-blue-100 border border-blue-200 rounded-md text-sm",
          },
          [
            React.createElement("div", {
              key: "cache-dot",
              className: "w-2 h-2 bg-blue-500 rounded-full",
            }),
            React.createElement(
              "span",
              {
                key: "cache-text",
                className: "text-blue-800",
              },
              "Using cached data",
            ),
          ],
        ),
    ].filter(Boolean),
  );
}

export interface ResilientUserServiceProviderProps {
  children: React.ReactNode;
  client: ResilientUserServiceClient;
}

export function ResilientUserServiceProvider({
  children,
  client,
}: ResilientUserServiceProviderProps) {
  React.useEffect(() => {
    // Perform initial health check
    client.performHealthCheck();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      client.performHealthCheck();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(healthCheckInterval);
      client.cleanup();
    };
  }, [client]);

  return React.createElement(
    UserServiceErrorBoundary,
    {
      context: "User Service Integration",
      enableRetry: true,
      enableOfflineMode: true,
    },
    children,
  );
}

// ============================================================================
// Factory Function
// ============================================================================

export function createResilientUserServiceClient(
  baseClient: unknown,
): ResilientUserServiceClient {
  return new ResilientUserServiceClient(baseClient);
}

// ============================================================================
// Usage Example
// ============================================================================

export function ExampleUsage() {
  // This demonstrates how to use the resilient client in a React component
  const [client] = React.useState(() => {
    // Create your base client (this would be your actual UserServiceClient)
    const baseClient = {}; // Your actual client instance
    return createResilientUserServiceClient(baseClient);
  });

  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadUserProfile = React.useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        const profile = await client.getUserProfile(userId);
        setUserProfile(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const updateProfile = React.useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!userProfile) return;

      setLoading(true);
      setError(null);

      try {
        const updatedProfile = await client.updateUserProfile(
          userProfile.id,
          updates,
        );
        setUserProfile(updatedProfile);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update profile",
        );
      } finally {
        setLoading(false);
      }
    },
    [client, userProfile],
  );

  const content = React.createElement(
    "div",
    {
      className: "space-y-4",
    },
    [
      // Resilience Status
      React.createElement(ResilienceStatus, { key: "status" }),

      // Your actual UI components
      React.createElement(
        "div",
        { key: "content" },
        [
          loading &&
            React.createElement("div", { key: "loading" }, "Loading..."),
          error &&
            React.createElement(
              "div",
              {
                key: "error",
                className: "text-red-600",
              },
              `Error: ${error}`,
            ),
          userProfile &&
            React.createElement("div", { key: "profile" }, [
              React.createElement("h2", { key: "title" }, "User Profile"),
              React.createElement(
                "p",
                { key: "email" },
                `Email: ${userProfile.email}`,
              ),
              React.createElement(
                "p",
                { key: "language" },
                `Language: ${userProfile.language}`,
              ),
            ]),
        ].filter(Boolean),
      ),
    ],
  );

  // eslint-disable-next-line react/no-children-prop
  return React.createElement(ResilientUserServiceProvider, {
    client,
    children: content,
  });
}
