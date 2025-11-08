/**
 * Real-time Analytics Hooks
 *
 * Provides WebSocket integration with React Query for real-time analytics updates.
 * Handles direct cache updates, query invalidation, and cache conflict resolution.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { analyticsQueryKeys } from "../lib/analytics-service/query-config";
import { getAnalyticsWebSocketManager } from "../lib/analytics-service";
import type {
  MetricsUpdate,
  AlertMessage,
  WebSocketMessage,
  ConnectionStatus,
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  Alert,
} from "../types/analytics-service";

// ============================================================================
// Types
// ============================================================================

interface RealtimeMetricsOptions {
  enabled?: boolean;
  autoConnect?: boolean;
  subscriptions?: string[];
  onConnectionChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

interface RealtimeMetricsResult {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (messageType: string) => () => void;
  unsubscribe: (messageType: string) => void;
}

interface CacheUpdateStrategy {
  merge: boolean; // Whether to merge with existing data or replace
  invalidateRelated: boolean; // Whether to invalidate related queries
  timestamp: boolean; // Whether to add timestamp to updates
}

// ============================================================================
// Main Real-time Metrics Hook
// ============================================================================

/**
 * Main hook for real-time analytics metrics with WebSocket integration.
 * Automatically updates React Query cache when real-time data arrives.
 */
export function useRealtimeMetrics(
  options: RealtimeMetricsOptions = {},
): RealtimeMetricsResult {
  const {
    enabled = true,
    autoConnect = true,
    subscriptions = ["metrics", "alerts"],
    onConnectionChange,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use refs to store current values for callbacks
  const webSocketManagerRef = useRef(getAnalyticsWebSocketManager());
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Connection status handler
  const handleConnectionChange = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      setIsConnected(status === "connected");
      onConnectionChange?.(status);
    },
    [onConnectionChange],
  );

  // Error handler
  const handleError = useCallback(
    (error: Error) => {
      console.error("Real-time analytics error:", error);
      onError?.(error);
    },
    [onError],
  );

  // Message handlers for different types of real-time updates
  const handleMetricsUpdate = useCallback(
    (message: MetricsUpdate) => {
      const timestamp = new Date();
      setLastUpdate(timestamp);

      // Update engagement metrics cache
      if (message.engagement) {
        updateEngagementCache(queryClient, message.engagement, {
          merge: true,
          invalidateRelated: false,
          timestamp: true,
        });
      }

      // Update progress metrics cache
      if (message.progress) {
        updateProgressCache(queryClient, message.progress, {
          merge: true,
          invalidateRelated: false,
          timestamp: true,
        });
      }

      // Update content metrics cache
      if (message.content) {
        updateContentCache(queryClient, message.content, {
          merge: true,
          invalidateRelated: false,
          timestamp: true,
        });
      }

      // Update system metrics cache
      if (message.system) {
        updateSystemCache(queryClient, message.system, {
          merge: true,
          invalidateRelated: false,
          timestamp: true,
        });
      }

      // Update real-time snapshot cache
      queryClient.setQueryData(analyticsQueryKeys.realtimeSnapshot(), {
        timestamp: message.timestamp,
        engagement: message.engagement,
        progress: message.progress,
        content: message.content,
        system: message.system,
      });
    },
    [queryClient],
  );

  const handleAlertsUpdate = useCallback(
    (message: AlertMessage) => {
      setLastUpdate(new Date());

      // Update alerts cache
      queryClient.setQueryData(analyticsQueryKeys.alerts(), message.alerts);

      // Invalidate system metrics if there are critical alerts
      const hasCriticalAlerts = message.alerts.some(
        (alert) => alert.severity === "critical",
      );
      if (hasCriticalAlerts) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.system(),
        });
      }
    },
    [queryClient],
  );

  // Generic message handler that routes to specific handlers
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      try {
        switch (message.type) {
          case "metrics_update":
            handleMetricsUpdate(message as MetricsUpdate);
            break;
          case "alert":
            handleAlertsUpdate(message as AlertMessage);
            break;
          case "heartbeat":
            // Handle heartbeat messages
            break;
          default:
            console.warn("Unknown WebSocket message type:", message.type);
        }
      } catch (error) {
        handleError(error as Error);
      }
    },
    [handleMetricsUpdate, handleAlertsUpdate, handleError],
  );

  // Connection management functions
  const connect = useCallback(async () => {
    try {
      const manager = webSocketManagerRef.current;
      await manager.connect();
      handleConnectionChange("connected");
    } catch (error) {
      handleConnectionChange("error");
      handleError(error as Error);
    }
  }, [handleConnectionChange, handleError]);

  const disconnect = useCallback(() => {
    const manager = webSocketManagerRef.current;
    manager.disconnect();
    handleConnectionChange("disconnected");

    // Clean up subscriptions
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    subscriptionsRef.current.clear();
  }, [handleConnectionChange]);

  const subscribe = useCallback(
    (messageType: string) => {
      const manager = webSocketManagerRef.current;
      const unsubscribe = manager.subscribe(messageType, handleMessage);
      subscriptionsRef.current.set(messageType, unsubscribe);
      return unsubscribe;
    },
    [handleMessage],
  );

  const unsubscribe = useCallback((messageType: string) => {
    const unsubscribeFn = subscriptionsRef.current.get(messageType);
    if (unsubscribeFn) {
      unsubscribeFn();
      subscriptionsRef.current.delete(messageType);
    }
  }, []);

  // Setup effect
  useEffect(() => {
    if (!enabled) return;

    // Set up connection status listener
    const manager = webSocketManagerRef.current;
    manager.onConnectionStatusChange = handleConnectionChange;

    // Auto-connect if enabled
    if (autoConnect) {
      connect().catch(handleError);
    }

    // Set up default subscriptions
    subscriptions.forEach((subscription) => {
      subscribe(subscription);
    });

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [
    enabled,
    autoConnect,
    subscriptions,
    connect,
    disconnect,
    subscribe,
    handleConnectionChange,
    handleError,
  ]);

  return {
    isConnected,
    connectionStatus,
    lastUpdate,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

// ============================================================================
// Cache Update Utilities
// ============================================================================

/**
 * Updates engagement metrics cache with real-time data.
 */
function updateEngagementCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: UserEngagementMetrics,
  strategy: CacheUpdateStrategy,
) {
  const queryKey = analyticsQueryKeys.engagement();

  if (strategy.merge) {
    // Merge with existing data
    queryClient.setQueryData(
      queryKey,
      (oldData: UserEngagementMetrics | undefined) => {
        if (!oldData) return data;

        return {
          ...oldData,
          ...data,
          ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
        };
      },
    );
  } else {
    // Replace existing data
    queryClient.setQueryData(queryKey, {
      ...data,
      ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
    });
  }

  if (strategy.invalidateRelated) {
    // Invalidate related queries
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "analytics" && query.queryKey[2] === "hourly",
    });
  }
}

/**
 * Updates progress metrics cache with real-time data.
 */
function updateProgressCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: LearningProgressMetrics,
  strategy: CacheUpdateStrategy,
) {
  const queryKey = analyticsQueryKeys.progress();

  if (strategy.merge) {
    queryClient.setQueryData(
      queryKey,
      (oldData: LearningProgressMetrics | undefined) => {
        if (!oldData) return data;

        return {
          ...oldData,
          ...data,
          ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
        };
      },
    );
  } else {
    queryClient.setQueryData(queryKey, {
      ...data,
      ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
    });
  }

  if (strategy.invalidateRelated) {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "analytics" && query.queryKey[2] === "journey",
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "analytics" && query.queryKey[2] === "cohort",
    });
  }
}

/**
 * Updates content metrics cache with real-time data.
 */
function updateContentCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: ContentPerformanceMetrics,
  strategy: CacheUpdateStrategy,
) {
  const queryKey = analyticsQueryKeys.content();

  if (strategy.merge) {
    queryClient.setQueryData(
      queryKey,
      (oldData: ContentPerformanceMetrics | undefined) => {
        if (!oldData) return data;

        return {
          ...oldData,
          ...data,
          ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
        };
      },
    );
  } else {
    queryClient.setQueryData(queryKey, {
      ...data,
      ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
    });
  }

  if (strategy.invalidateRelated) {
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.contentGaps(),
    });
  }
}

/**
 * Updates system metrics cache with real-time data.
 */
function updateSystemCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: SystemPerformanceMetrics,
  strategy: CacheUpdateStrategy,
) {
  const queryKey = analyticsQueryKeys.system();

  if (strategy.merge) {
    queryClient.setQueryData(
      queryKey,
      (oldData: SystemPerformanceMetrics | undefined) => {
        if (!oldData) return data;

        return {
          ...oldData,
          ...data,
          ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
        };
      },
    );
  } else {
    queryClient.setQueryData(queryKey, {
      ...data,
      ...(strategy.timestamp && { lastUpdated: new Date().toISOString() }),
    });
  }

  if (strategy.invalidateRelated) {
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.systemStatus(),
    });
    queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.alerts() });
  }
}

// ============================================================================
// Specialized Real-time Hooks
// ============================================================================

/**
 * Hook specifically for real-time engagement metrics.
 */
export function useRealtimeEngagement() {
  const queryClient = useQueryClient();
  const [lastEngagementUpdate] = useState<Date | null>(null);

  const { isConnected, connectionStatus } = useRealtimeMetrics({
    subscriptions: ["engagement"],
    onConnectionChange: (status) => {
      if (status === "connected") {
        // Optionally refresh engagement data on reconnection
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.engagement(),
        });
      }
    },
  });

  return {
    isConnected,
    connectionStatus,
    lastUpdate: lastEngagementUpdate,
  };
}

/**
 * Hook specifically for real-time system alerts.
 */
export function useRealtimeAlerts() {
  const queryClient = useQueryClient();
  const [alertCount, setAlertCount] = useState(0);
  const [lastAlertUpdate, setLastAlertUpdate] = useState<Date | null>(null);

  const { isConnected, connectionStatus } = useRealtimeMetrics({
    subscriptions: ["alerts"],
    onConnectionChange: (status) => {
      if (status === "connected") {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.alerts(),
        });
      }
    },
  });

  // Monitor alerts data changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "analytics" &&
        event.query.queryKey[2] === "alerts"
      ) {
        const alerts = event.query.state.data as Alert[] | undefined;
        if (alerts) {
          setAlertCount(alerts.length);
          setLastAlertUpdate(new Date());
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return {
    isConnected,
    connectionStatus,
    alertCount,
    lastUpdate: lastAlertUpdate,
  };
}

/**
 * Hook for managing real-time connection with manual controls.
 */
export function useRealtimeConnection() {
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

  const realtimeMetrics = useRealtimeMetrics({
    enabled: !isManuallyDisconnected,
    autoConnect: !isManuallyDisconnected,
  });

  const manualConnect = useCallback(async () => {
    setIsManuallyDisconnected(false);
    await realtimeMetrics.connect();
  }, [realtimeMetrics]);

  const manualDisconnect = useCallback(() => {
    setIsManuallyDisconnected(true);
    realtimeMetrics.disconnect();
  }, [realtimeMetrics]);

  return {
    ...realtimeMetrics,
    isManuallyDisconnected,
    manualConnect,
    manualDisconnect,
  };
}
