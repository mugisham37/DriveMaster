/**
 * Real-time Progress Updates Hook
 * 
 * Subscribes to user-specific progress updates via WebSocket:
 * - Subscribes to progress channel on mount
 * - Listens for progress update messages
 * - Updates ProgressContext when messages received
 * - Handles message parsing errors
 * 
 * Requirements: 10.3, 10.4
 */

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ProgressUpdateData,
  MilestoneData,
  StreakData,
} from '@/lib/realtime/websocket-manager';

export interface UseRealtimeProgressOptions {
  enabled?: boolean;
  onProgressUpdate?: (data: ProgressUpdateData) => void;
  onMilestoneAchieved?: (data: MilestoneData) => void;
  onStreakUpdate?: (data: StreakData) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to subscribe to real-time progress updates
 */
export function useRealtimeProgress(options: UseRealtimeProgressOptions = {}) {
  const {
    enabled = true,
    onProgressUpdate,
    onMilestoneAchieved,
    onStreakUpdate,
    onError,
  } = options;

  const { wsManager, connectionState } = useWebSocket();
  const { updateMastery, updateStreak, addMilestone } = useProgress();
  const { user } = useAuth();
  
  const isSubscribedRef = useRef(false);

  // Subscribe to progress channel
  useEffect(() => {
    if (!enabled || !wsManager || !connectionState.isConnected || !user) {
      return;
    }

    // Subscribe to user-specific progress channel
    const channels = [
      `progress:${user.id}`,
      `milestones:${user.id}`,
      `streaks:${user.id}`,
    ];

    try {
      wsManager.subscribe(channels);
      isSubscribedRef.current = true;

      console.log('[useRealtimeProgress] Subscribed to channels:', channels);
    } catch (error) {
      const errorObj = error i
      if (data.milestone) {
        // Show celebration for new milestone
        queryClient.invalidateQueries({
          queryKey: queryKeys.milestones(userId),
        });
        
        // Trigger celebration notification
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("milestone:achieved", {
              detail: data.milestone,
            })
          );
        }
      }

      setLastUpdate(new Date());
    },
    [userId, queryClient]
  );

  useEffect(() => {
    if (!userId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
    const subscriberId = subscriberIdRef.current;

    let mounted = true;

    const connectToWebSocket = async () => {
      try {
        setConnectionStatus({
          isConnected: false,
          isConnecting: true,
          error: null,
        });

        const connection = await globalConnectionPool.getConnection(
          `${wsUrl}/progress/${userId}`,
          subscriberId,
          {
            reconnectInterval: 1000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
          }
        );

        if (!mounted) return;

        connectionRef.current = connection;

        // Set up event listeners
        connection.on("connected", () => {
          if (mounted) {
            setConnectionStatus({
              isConnected: true,
              isConnecting: false,
              error: null,
            });
          }
        });

        connection.on("disconnected", () => {
          if (mounted) {
            setConnectionStatus({
              isConnected: false,
              isConnecting: false,
              error: null,
            });
          }
        });

        connection.on("error", (event) => {
          if (mounted) {
            setConnectionStatus({
              isConnected: false,
              isConnecting: false,
              error: event.error || new Error("WebSocket error"),
            });
          }
        });

        connection.on("message", (event) => {
          if (mounted && event.data) {
            const message = event.data as unknown as ProgressUpdateEvent;
            if (message.type === "progress:updated") {
              handleProgressUpdate(message);
            }
          }
        });

        // Subscribe to progress updates
        if (connection.isReady()) {
          connection.send({
            type: "subscribe",
            channel: "progress",
            userId,
          });
        }
      } catch (error) {
        if (mounted) {
          setConnectionStatus({
            isConnected: false,
            isConnecting: false,
            error: error instanceof Error ? error : new Error("Connection failed"),
          });
        }
      }
    };

    connectToWebSocket();

    return () => {
      mounted = false;
      
      // Unsubscribe and release connection
      if (connectionRef.current?.isReady()) {
        try {
          connectionRef.current.send({
            type: "unsubscribe",
            channel: "progress",
            userId,
          });
        } catch (error) {
          console.warn("Failed to unsubscribe from progress updates:", error);
        }
      }

      globalConnectionPool.releaseConnection(
        `${wsUrl}/progress/${userId}`,
        subscriberId
      );
    };
  }, [userId, handleProgressUpdate]);

  return {
    ...connectionStatus,
    lastUpdate,
    reconnect: useCallback(() => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current.connect();
      }
    }, []),
  };
}
