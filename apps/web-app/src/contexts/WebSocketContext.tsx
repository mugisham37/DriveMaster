"use client";

/**
 * WebSocket Context Provider
 * 
 * Provides WebSocket connection management at the application level:
 * - Initializes connection on app mount
 * - Manages connection state across the app
 * - Provides WebSocket manager instance to child components
 * 
 * Requirements: 10.3, 14.1
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { WebSocketManager } from '@/lib/realtime/websocket-manager';
import { 
  useWebSocketConnection, 
  type WebSocketConnectionState 
} from '@/hooks/useWebSocketConnection';

// ============================================================================
// Context Types
// ============================================================================

export interface WebSocketContextValue {
  wsManager: WebSocketManager | null;
  connectionState: WebSocketConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  getStatus: () => {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: string[];
    queuedMessages: number;
  };
  getMetrics: () => ReturnType<WebSocketManager['getMetrics']> | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
}

export function WebSocketProvider({ 
  children, 
  autoConnect = true,
  onConnect,
  onDisconnect,
  onError,
}: WebSocketProviderProps) {
  const {
    wsManager,
    connectionState,
    connect,
    disconnect,
    getStatus,
    getMetrics,
  } = useWebSocketConnection({
    autoConnect,
    onConnect,
    onDisconnect,
    onError,
  });

  const contextValue: WebSocketContextValue = {
    wsManager,
    connectionState,
    connect,
    disconnect,
    getStatus,
    getMetrics,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ============================================================================
// Hook to use WebSocket context
// ============================================================================

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
}
