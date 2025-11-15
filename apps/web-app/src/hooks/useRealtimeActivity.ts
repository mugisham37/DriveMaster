/**
 * Real-time activity updates via WebSocket
 * 
 * This hook connects to the WebSocket server to receive real-time activity updates
 * and automatically updates the React Query cache when events are received.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { globalConnectionPool } from "@/channels/connection-pool";
import { RealtimeConnection } from "@/channels/connection";
import { queryKeys } from "@/lib/cache/user-service-cache";
import type { ActivityRecord } from "@/types/user-service";

interface ActivityRecordedEvent {
  type: "activity:recorded";
  userId: string;
  data: ActivityRecord;
}

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export function useRealtimeActivity(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });
  const [lastActivity, setLastActivity] = useState<ActivityRecord | null>(null);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const subscriberIdRef = useRef<string>(`activity-${Math.random().toString(36).substr(2, 9)}`);

  const handleActivityRecorded = useCallback(
    (event: ActivityRecordedEvent) => {
      if (!userId || event.userId !== userId) return;

      const { data: activity } = event;

      // Update activity feed in real-time
      setLastActivity(activity);

      // Invalidate activity-related queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.activitySummary(userId, ""),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.engagementMetrics(userId, 30),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.activityInsights(userId),
      });

      // Dispatch custom event for activity feed components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("activity:new", {
            detail: activity,
          })
        );
      }
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
          `${wsUrl}/activity/${userId}`,
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
            const message = event.data as unknown as ActivityRecordedEvent;
            if (message.type === "activity:recorded") {
              handleActivityRecorded(message);
            }
          }
        });

        // Subscribe to activity updates
        if (connection.isReady()) {
          connection.send({
            type: "subscribe",
            channel: "activity",
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
            channel: "activity",
            userId,
          });
        } catch (error) {
          console.warn("Failed to unsubscribe from activity updates:", error);
        }
      }

      globalConnectionPool.releaseConnection(
        `${wsUrl}/activity/${userId}`,
        subscriberId
      );
    };
  }, [userId, handleActivityRecorded]);

  return {
    ...connectionStatus,
    lastActivity,
    reconnect: useCallback(() => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current.connect();
      }
    }, []),
  };
}
