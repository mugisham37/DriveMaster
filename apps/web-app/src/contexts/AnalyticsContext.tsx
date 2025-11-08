/**
 * Analytics Context Provider
 *
 * Provides centralized analytics state management and configuration
 * throughout the application component tree.
 *
 * Requirements: 4.1, 4.2, 10.2
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getAnalyticsServiceClient,
  getAnalyticsWebSocketManager,
  initializeAnalyticsService,
  shutdownAnalyticsService,
} from "@/lib/analytics-service";
import { analyticsServiceConfig } from "@/lib/config/analytics-service";
import type {
  AnalyticsServiceClient,
  CompleteAnalyticsWebSocketManager,
  ConnectionStatus,
  AnalyticsServiceConfig,
  AnalyticsPermissions,
  ServiceHealthStatus,
} from "@/types/analytics-service";

// ============================================================================
// Context Types
// ============================================================================

export interface AnalyticsContextValue {
  // Core clients
  client: AnalyticsServiceClient;
  webSocketManager: CompleteAnalyticsWebSocketManager;

  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastConnectionAttempt: Date | null;

  // Configuration
  config: AnalyticsServiceConfig;
  permissions: AnalyticsPermissions;

  // Service health
  serviceHealth: ServiceHealthStatus | null;
  isServiceAvailable: boolean;

  // Operations
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  checkServiceHealth: () => Promise<void>;

  // State management
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: Error | null;
}

// ============================================================================
// Context Creation
// ============================================================================

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface AnalyticsProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  enableRealtime?: boolean;
  enablePermissionChecking?: boolean;
}

export function AnalyticsProvider({
  children,
  autoConnect = true,
  enableRealtime = true,
  enablePermissionChecking = true,
}: AnalyticsProviderProps) {
  const { user, isAuthenticated } = useAuth();

  // Core clients (memoized to prevent recreation)
  const client = useMemo(() => getAnalyticsServiceClient(), []);
  const webSocketManager = useMemo(() => getAnalyticsWebSocketManager(), []);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [lastConnectionAttempt, setLastConnectionAttempt] =
    useState<Date | null>(null);

  // Service health
  const [serviceHealth, setServiceHealth] =
    useState<ServiceHealthStatus | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);

  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(
    null,
  );

  // Configuration (memoized based on user)
  const config = useMemo(
    () => ({
      ...analyticsServiceConfig,
      enableRealtime: enableRealtime && isAuthenticated,
      enablePermissionChecking,
      userId: user?.id,
      userRole: user?.userRole,
    }),
    [enableRealtime, enablePermissionChecking, isAuthenticated, user],
  );

  // Permissions (computed based on user role)
  const permissions = useMemo((): AnalyticsPermissions => {
    if (!user || !enablePermissionChecking) {
      return {
        viewEngagement: true,
        viewProgress: true,
        viewContent: true,
        viewSystem: false,
        viewAlerts: false,
        viewInsights: true,
        viewReports: true,
        viewUserAnalytics: true,
        viewSystemMetrics: false,
        manageAlerts: false,
        exportData: true,
        viewRealtime: true,
      };
    }

    // Role-based permissions
    switch (user.userRole) {
      case "admin":
        return {
          viewEngagement: true,
          viewProgress: true,
          viewContent: true,
          viewSystem: true,
          viewAlerts: true,
          viewInsights: true,
          viewReports: true,
          viewUserAnalytics: true,
          viewSystemMetrics: true,
          manageAlerts: true,
          exportData: true,
          viewRealtime: true,
        };

      case "mentor":
        return {
          viewEngagement: true,
          viewProgress: true,
          viewContent: true,
          viewSystem: false,
          viewAlerts: false,
          viewInsights: true,
          viewReports: true,
          viewUserAnalytics: true,
          viewSystemMetrics: false,
          manageAlerts: false,
          exportData: true,
          viewRealtime: true,
        };

      case "learner":
      default:
        return {
          viewEngagement: false,
          viewProgress: true,
          viewContent: false,
          viewSystem: false,
          viewAlerts: false,
          viewInsights: true,
          viewReports: false,
          viewUserAnalytics: true,
          viewSystemMetrics: false,
          manageAlerts: false,
          exportData: false,
          viewRealtime: false,
        };
    }
  }, [user, enablePermissionChecking]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const connect = useCallback(async () => {
    if (!enableRealtime || !isAuthenticated) {
      return;
    }

    try {
      setLastConnectionAttempt(new Date());
      setConnectionStatus("connecting");

      if (webSocketManager && typeof webSocketManager.connect === "function") {
        await webSocketManager.connect();
      }

      setIsConnected(true);
      setConnectionStatus("connected");
    } catch (error) {
      console.error("[AnalyticsContext] Connection failed:", error);
      setIsConnected(false);
      setConnectionStatus("error");
    }
  }, [webSocketManager, enableRealtime, isAuthenticated]);

  const disconnect = useCallback(async () => {
    try {
      setConnectionStatus("disconnecting");

      if (
        webSocketManager &&
        typeof webSocketManager.disconnect === "function"
      ) {
        await webSocketManager.disconnect();
      }

      setIsConnected(false);
      setConnectionStatus("disconnected");
    } catch (error) {
      console.error("[AnalyticsContext] Disconnect failed:", error);
      setConnectionStatus("error");
    }
  }, [webSocketManager]);

  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  // ============================================================================
  // Service Health Management
  // ============================================================================

  const checkServiceHealth = useCallback(async () => {
    try {
      const health = await client.getHealthStatus();
      setServiceHealth(health);
      setIsServiceAvailable(health.status === "healthy");
    } catch (error) {
      console.error("[AnalyticsContext] Health check failed:", error);
      setServiceHealth(null);
      setIsServiceAvailable(false);
    }
  }, [client]);

  // ============================================================================
  // Permission Management
  // ============================================================================

  const refreshPermissions = useCallback(async () => {
    // Permissions are computed from user role, so this is mainly for future extensibility
    // where permissions might be fetched from the server
    console.log("[AnalyticsContext] Permissions refreshed:", permissions);
  }, [permissions]);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (isInitialized || isInitializing) {
        return;
      }

      setIsInitializing(true);
      setInitializationError(null);

      try {
        // Initialize analytics service
        await initializeAnalyticsService();

        // Check service health
        await checkServiceHealth();

        // Auto-connect if enabled and authenticated
        if (autoConnect && isAuthenticated && enableRealtime) {
          await connect();
        }

        if (mounted) {
          setIsInitialized(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("[AnalyticsContext] Initialization failed:", error);
        if (mounted) {
          setInitializationError(
            error instanceof Error
              ? error
              : new Error("Unknown initialization error"),
          );
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    autoConnect,
    isAuthenticated,
    enableRealtime,
    connect,
    checkServiceHealth,
    isInitialized,
    isInitializing,
  ]);

  // ============================================================================
  // WebSocket Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!webSocketManager) return;

    const handleConnectionChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      setIsConnected(status === "connected");
    };

    const handleError = (error: Error) => {
      console.error("[AnalyticsContext] WebSocket error:", error);
      setConnectionStatus("error");
      setIsConnected(false);
    };

    // Set up event listeners if available
    if (typeof webSocketManager.addEventListener === "function") {
      webSocketManager.addEventListener(
        "connection_status_changed",
        handleConnectionChange,
      );
      webSocketManager.addEventListener("error", handleError);
    }

    return () => {
      if (typeof webSocketManager.removeEventListener === "function") {
        webSocketManager.removeEventListener(
          "connection_status_changed",
          handleConnectionChange,
        );
        webSocketManager.removeEventListener("error", handleError);
      }
    };
  }, [webSocketManager]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isConnected) {
        disconnect();
      }
      shutdownAnalyticsService();
    };
  }, [isConnected, disconnect]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo(
    (): AnalyticsContextValue => ({
      // Core clients
      client,
      webSocketManager,

      // Connection state
      isConnected,
      connectionStatus,
      lastConnectionAttempt,

      // Configuration
      config,
      permissions,

      // Service health
      serviceHealth,
      isServiceAvailable,

      // Operations
      connect,
      disconnect,
      reconnect,
      refreshPermissions,
      checkServiceHealth,

      // State management
      isInitialized,
      isInitializing,
      initializationError,
    }),
    [
      client,
      webSocketManager,
      isConnected,
      connectionStatus,
      lastConnectionAttempt,
      config,
      permissions,
      serviceHealth,
      isServiceAvailable,
      connect,
      disconnect,
      reconnect,
      refreshPermissions,
      checkServiceHealth,
      isInitialized,
      isInitializing,
      initializationError,
    ],
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access analytics context
 */
export function useAnalyticsContext(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error(
      "useAnalyticsContext must be used within an AnalyticsProvider",
    );
  }

  return context;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to check if analytics features are available
 */
export function useAnalyticsAvailable(): boolean {
  const { isServiceAvailable, isInitialized } = useAnalyticsContext();
  return isServiceAvailable && isInitialized;
}

/**
 * Hook to get analytics permissions
 */
export function useAnalyticsPermissions(): AnalyticsPermissions {
  const { permissions } = useAnalyticsContext();
  return permissions;
}

/**
 * Hook to get analytics connection status
 */
export function useAnalyticsConnection(): {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
} {
  const { isConnected, connectionStatus, connect, disconnect, reconnect } =
    useAnalyticsContext();
  return { isConnected, connectionStatus, connect, disconnect, reconnect };
}
