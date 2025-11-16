"use client";

/**
 * Offline Detection Context
 * 
 * Provides centralized offline detection with:
 * - navigator.onLine event listeners
 * - Periodic heartbeat checks (30 second interval)
 * - UI state management for offline banner
 * - Network status monitoring
 * 
 * Requirements: 11.1, 14.1
 * Task: 12.1
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

// ============================================================================
// Types
// ============================================================================

export interface NetworkStatus {
  online: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
}

export interface OfflineState {
  isOffline: boolean;
  networkStatus: NetworkStatus;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
  lastHeartbeatTime: Date | null;
  heartbeatFailed: boolean;
  showOfflineBanner: boolean;
}

export interface OfflineContextValue {
  state: OfflineState;
  isOffline: boolean;
  networkStatus: NetworkStatus;
  dismissBanner: () => void;
  forceHeartbeat: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const OfflineContext = createContext<OfflineContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface OfflineProviderProps {
  children: ReactNode;
  heartbeatInterval?: number; // milliseconds
  heartbeatEndpoint?: string;
}

export function OfflineProvider({
  children,
  heartbeatInterval = 30000, // 30 seconds
  heartbeatEndpoint = "/api/health",
}: OfflineProviderProps) {
  const [state, setState] = useState<OfflineState>(() => ({
    isOffline: typeof window !== "undefined" ? !navigator.onLine : false,
    networkStatus: getNetworkStatus(),
    lastOnlineTime: null,
    lastOfflineTime: null,
    lastHeartbeatTime: null,
    heartbeatFailed: false,
    showOfflineBanner: false,
  }));

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Network Status Detection
  // ============================================================================

  const updateNetworkStatus = useCallback(() => {
    const networkStatus = getNetworkStatus();
    setState((prev) => ({
      ...prev,
      networkStatus,
    }));
  }, []);

  // ============================================================================
  // Heartbeat Check
  // ============================================================================

  const performHeartbeat = useCallback(async (): Promise<boolean> => {
    // Cancel any pending heartbeat
    if (heartbeatControllerRef.current) {
      heartbeatControllerRef.current.abort();
    }

    // Create new abort controller
    heartbeatControllerRef.current = new AbortController();

    try {
      const response = await fetch(heartbeatEndpoint, {
        method: "HEAD",
        signal: heartbeatControllerRef.current.signal,
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const isOnline = response.ok;

      setState((prev) => ({
        ...prev,
        lastHeartbeatTime: new Date(),
        heartbeatFailed: !isOnline,
      }));

      return isOnline;
    } catch (_error) {
      // Heartbeat failed
      setState((prev) => ({
        ...prev,
        lastHeartbeatTime: new Date(),
        heartbeatFailed: true,
      }));

      return false;
    }
  }, [heartbeatEndpoint]);

  // ============================================================================
  // Online/Offline Event Handlers
  // ============================================================================

  const handleOnline = useCallback(() => {
    console.log("[OfflineContext] Network came online");

    setState((prev) => ({
      ...prev,
      isOffline: false,
      lastOnlineTime: new Date(),
      showOfflineBanner: false,
      heartbeatFailed: false,
    }));

    updateNetworkStatus();

    // Perform immediate heartbeat to confirm
    performHeartbeat();
  }, [updateNetworkStatus, performHeartbeat]);

  const handleOffline = useCallback(() => {
    console.log("[OfflineContext] Network went offline");

    setState((prev) => ({
      ...prev,
      isOffline: true,
      lastOfflineTime: new Date(),
      showOfflineBanner: true,
    }));

    updateNetworkStatus();
  }, [updateNetworkStatus]);

  // ============================================================================
  // Banner Management
  // ============================================================================

  const dismissBanner = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showOfflineBanner: false,
    }));
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // Set up online/offline event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Also listen for network information changes
    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (event: string, handler: () => void) => void;
        removeEventListener?: (event: string, handler: () => void) => void;
      };
    }).connection;

    if (connection?.addEventListener) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (connection?.removeEventListener) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkStatus]);

  // Set up periodic heartbeat check
  useEffect(() => {
    if (typeof window === "undefined" || heartbeatInterval <= 0) return;

    // Perform initial heartbeat
    performHeartbeat();

    // Set up periodic heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      // Only perform heartbeat if navigator says we're online
      if (navigator.onLine) {
        performHeartbeat();
      }
    }, heartbeatInterval);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      if (heartbeatControllerRef.current) {
        heartbeatControllerRef.current.abort();
        heartbeatControllerRef.current = null;
      }
    };
  }, [heartbeatInterval, performHeartbeat]);

  // Show banner when offline is detected
  useEffect(() => {
    if (state.isOffline || state.heartbeatFailed) {
      setState((prev) => ({
        ...prev,
        showOfflineBanner: true,
      }));
    }
  }, [state.isOffline, state.heartbeatFailed]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: OfflineContextValue = {
    state,
    isOffline: state.isOffline || state.heartbeatFailed,
    networkStatus: state.networkStatus,
    dismissBanner,
    forceHeartbeat: performHeartbeat,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);

  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }

  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getNetworkStatus(): NetworkStatus {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { online: true };
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  }).connection;

  const status: NetworkStatus = {
    online: navigator.onLine,
  };

  if (connection?.effectiveType !== undefined) {
    status.effectiveType = connection.effectiveType;
  }
  if (connection?.downlink !== undefined) {
    status.downlink = connection.downlink;
  }
  if (connection?.rtt !== undefined) {
    status.rtt = connection.rtt;
  }
  if (connection?.saveData !== undefined) {
    status.saveData = connection.saveData;
  }

  return status;
}
