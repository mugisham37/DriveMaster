/**
 * Real-time progress updates via WebSocket
 * 
 * This hook connects to the WebSocket server to receive real-time progress updates
 * and automatically updates the React Query cache when events are received.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { globalConnectionPool } from "@/channels/connection-pool";
import { RealtimeConnection } from "@/channels/connection";
import { queryKeys } from "@/lib/cache/user-service-cache";
import type { ProgressSummary, SkillMastery, Milestone } from "@/types/user-service";

interface ProgressUpdateEvent {
  type: "progress:updated";
  userId: string;
  data: {
    summary?: ProgressSummary;
    skillMastery?: SkillMastery;
    milestone?: Milestone;
  };
}

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export function useRealtimeProgress(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const subscriberIdRef = useRef<string>(`progress-${Math.random().toString(36).substr(2, 9)}`);

  const handleProgressUpdate = useCallback(
    (event: ProgressUpdateEvent) => {
      if (!userId || event.userId !== userId) return;

      const { data } = event;

      // Update React Query cache with new data
      if (data.summary) {
        queryClient.setQueryData(
          queryKeys.progressSummary(userId),
          data.summary
        );
      }

      if (data.skillMastery) {
        const topic = data.skillMastery.topic;
        queryClient.setQueryData(
          queryKeys.skillMastery(userId, topic),
          data.skillMastery
        );
        
        // Also invalidate the list query
        queryClient.invalidateQueries({
          queryKey: queryKeys.skillMastery(userId),
        });
      }

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
