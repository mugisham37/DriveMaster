/**
 * WebSocket Connection Hook
 * 
 * Manages WebSocket connection lifecycle for real-time features:
 * - Connection initialization on app mount
 * - Reconnection logic with exponential backoff
 * - Connection state monitoring
 * - Authentication handling
 * 
 * Requirements: 10.3, 14.1
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketManager, createWebSocketManager } from '@/lib/realtime/websocket-manager';
import { useAuth } from '@/contexts/AuthContext';
import { tokenStorage } from '@/lib/http/interceptors';

export interface WebSocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnectAttempts: number;
}

export interface UseWebSocketConnectionOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to manage WebSocket connection lifecycle
 */
export function useWebSocketConnection(options: UseWebSocketConnectionOptions = {}) {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  // Initialize WebSocket manager
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = createWebSocketManager();
      
      // Set up event handlers
      wsManagerRef.current.setEventHandlers({
        onConnect: () => {
          setConnectionState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            error: null,
            reconnectAttempts: 0,
          }));
          onConnect?.();
        },
        onDisconnect: (code, reason) => {
          setConnectionState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
          }));
          onDisconnect?.(code, reason);
        },
        onError: (error) => {
          const errorObj = new Error(error.message);
          setConnectionState(prev => ({
            ...prev,
            error: errorObj,
            isConnecting: false,
          }));
          onError?.(errorObj);
        },
      });
    }

    return () => {
      // Cleanup on unmount
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, [onConnect, onDisconnect, onError]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && user && wsManagerRef.current) {
      const connect = async () => {
        try {
          setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
          
          // Get auth token from token storage
          const authToken = (await tokenStorage.getAccessToken()) || '';
          
          await wsManagerRef.current!.connect(String(user.id), authToken);
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Connection failed');
          setConnectionState(prev => ({
            ...prev,
            isConnecting: false,
            error: errorObj,
          }));
          onError?.(errorObj);
        }
      };

      connect();
    }
  }, [autoConnect, isAuthenticated, user, onError]);

  // Manual connect function
  const connect = useCallback(async () => {
    if (!wsManagerRef.current || !user) {
      throw new Error('WebSocket manager not initialized or user not authenticated');
    }

    try {
      setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
      
        const authToken = (await tokenStorage.getAccessToken()) || '';
        await wsManagerRef.current.connect(String(user.id), authToken);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Connection failed');
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorObj,
      }));
      throw errorObj;
    }
  }, [user]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
    }
  }, []);

  // Get connection status
  const getStatus = useCallback(() => {
    if (!wsManagerRef.current) {
      return {
        connected: false,
        reconnectAttempts: 0,
        subscriptions: [],
        queuedMessages: 0,
      };
    }
    return wsManagerRef.current.getConnectionStatus();
  }, []);

  // Get connection metrics
  const getMetrics = useCallback(() => {
    if (!wsManagerRef.current) {
      return null;
    }
    return wsManagerRef.current.getMetrics();
  }, []);

  return {
    wsManager: wsManagerRef.current,
    connectionState,
    connect,
    disconnect,
    getStatus,
    getMetrics,
  };
}
