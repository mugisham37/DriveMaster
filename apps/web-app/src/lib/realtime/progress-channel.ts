/**
 * Real-time Progress Channel
 *
 * Implements WebSocket-based real-time updates for progress and activity data
 * Used by ProgressContext and ActivityContext for live updates
 */

import type {
  ProgressSummary,
  SkillMastery,
  LearningStreak,
  Milestone,
  ActivityRecord,
  EngagementMetrics,
} from "@/types/user-service";

// ============================================================================
// Event Types
// ============================================================================

export interface ProgressUpdateEvent {
  type: "progress_update";
  userId: string;
  topic: string;
  mastery: SkillMastery;
  timestamp: Date;
}

export interface MilestoneAchievedEvent {
  type: "milestone_achieved";
  userId: string;
  milestone: Milestone;
  timestamp: Date;
}

export interface StreakUpdateEvent {
  type: "streak_update";
  userId: string;
  streak: LearningStreak;
  timestamp: Date;
}

export interface ProgressSummaryUpdateEvent {
  type: "progress_summary_update";
  userId: string;
  summary: ProgressSummary;
  timestamp: Date;
}

export interface ActivityUpdateEvent {
  type: "activity_update";
  userId: string;
  activity: ActivityRecord;
  timestamp: Date;
}

export interface EngagementUpdateEvent {
  type: "engagement_update";
  userId: string;
  metrics: EngagementMetrics;
  timestamp: Date;
}

export type RealtimeEvent =
  | ProgressUpdateEvent
  | MilestoneAchievedEvent
  | StreakUpdateEvent
  | ProgressSummaryUpdateEvent
  | ActivityUpdateEvent
  | EngagementUpdateEvent;

// ============================================================================
// Channel Configuration
// ============================================================================

export interface ProgressChannelConfig {
  onProgressUpdate?: (event: ProgressUpdateEvent) => void;
  onMilestoneAchieved?: (event: MilestoneAchievedEvent) => void;
  onStreakUpdate?: (event: StreakUpdateEvent) => void;
  onProgressSummaryUpdate?: (event: ProgressSummaryUpdateEvent) => void;
  onActivityUpdate?: (event: ActivityUpdateEvent) => void;
  onEngagementUpdate?: (event: EngagementUpdateEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

// ============================================================================
// Progress Channel Implementation
// ============================================================================

export class ProgressChannel {
  private userId: string;
  private config: ProgressChannelConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Set<string>();

  constructor(userId: string, config: ProgressChannelConfig = {}) {
    this.userId = userId;
    this.config = config;
    this.maxReconnectAttempts = config.reconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 1000;
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribe(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connect();

        // Wait for connection or timeout
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000); // 10 second timeout

        const checkConnection = () => {
          if (this.isConnected) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };

        checkConnection();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(): void {
    this.disconnect();
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(eventTypes: string[]): void {
    eventTypes.forEach((eventType) => {
      this.subscriptions.add(eventType);
    });

    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: "subscribe",
        events: eventTypes,
      });
    }
  }

  /**
   * Unsubscribe from specific event types
   */
  unsubscribeFromEvents(eventTypes: string[]): void {
    eventTypes.forEach((eventType) => {
      this.subscriptions.delete(eventType);
    });

    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: "unsubscribe",
        events: eventTypes,
      });
    }
  }

  /**
   * Check if channel is connected
   */
  isChannelConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: string[];
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private connect(): void {
    try {
      console.log(`[ProgressChannel] Connecting for user ${this.userId}...`);

      // Get WebSocket URL from environment or config
      const wsUrl =
        process.env.NEXT_PUBLIC_USER_SERVICE_WS_URL || "ws://localhost:8080/ws";
      const fullUrl = `${wsUrl}?userId=${this.userId}&token=${this.getAuthToken()}`;

      // Create WebSocket connection
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        console.log(`[ProgressChannel] Connected for user ${this.userId}`);
        this.config.onConnect?.();

        // Start heartbeat
        this.startHeartbeat();

        // Subscribe to default events
        this.subscribeToEvents([
          "progress_update",
          "milestone_achieved",
          "streak_update",
          "progress_summary_update",
          "activity_update",
          "engagement_update",
        ]);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        console.log(
          `[ProgressChannel] Connection closed for user ${this.userId}:`,
          event.code,
          event.reason,
        );

        if (event.code !== 1000) {
          // Not a normal closure
          this.scheduleReconnect();
        }

        this.config.onDisconnect?.();
      };

      this.ws.onerror = (error) => {
        console.error("[ProgressChannel] WebSocket error:", error);
        this.handleError(new Error("WebSocket connection error"));
      };
    } catch (error) {
      console.error("[ProgressChannel] Connection failed:", error);
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  private getAuthToken(): string {
    // Get auth token from localStorage, cookies, or auth context
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token") || "anonymous";
    }
    return "server_side";
  }

  private simulateEvents(): void {
    // Simulate periodic events for demo purposes
    const eventTimer = setInterval(
      () => {
        if (!this.isConnected) {
          clearInterval(eventTimer);
          return;
        }

        // Randomly simulate different types of events
        const eventType = Math.random();

        if (eventType < 0.3) {
          // Simulate progress update
          this.handleProgressUpdate({
            type: "progress_update",
            userId: this.userId,
            topic: "JavaScript",
            mastery: {
              userId: this.userId,
              topic: "JavaScript",
              mastery: Math.random() * 0.3 + 0.7, // 70-100%
              confidence: Math.random() * 0.2 + 0.8, // 80-100%
              practiceCount: Math.floor(Math.random() * 50) + 50,
              lastPracticed: new Date(),
              correctStreak: Math.floor(Math.random() * 10) + 5,
              longestStreak: Math.floor(Math.random() * 20) + 10,
              totalTimeMs: Math.floor(Math.random() * 3600000) + 1800000, // 30min - 1.5hr
              createdAt: new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
              ),
              updatedAt: new Date(),
            },
            timestamp: new Date(),
          });
        } else if (eventType < 0.5) {
          // Simulate activity update
          this.handleActivityUpdate({
            type: "activity_update",
            userId: this.userId,
            activity: {
              id: `activity_${Date.now()}`,
              userId: this.userId,
              activityType: "practice_complete",
              deviceType: "desktop",
              appVersion: "1.0.0",
              platform: "Web",
              userAgent: "Realtime Simulation",
              ipAddress: "127.0.0.1",
              timestamp: new Date(),
              metadata: {
                topic: "JavaScript",
                duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
                source: "realtime_simulation",
              },
            },
            timestamp: new Date(),
          });
        } else if (eventType < 0.7) {
          // Simulate engagement update
          this.handleEngagementUpdate({
            type: "engagement_update",
            userId: this.userId,
            metrics: {
              dailyActiveStreak: Math.floor(Math.random() * 30) + 1,
              weeklyActiveStreak: Math.floor(Math.random() * 10) + 1,
              averageSessionLength: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes
              averageSessionDuration: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes
              sessionsPerDay: Math.random() * 3 + 1,
              activitiesPerSession: Math.floor(Math.random() * 10) + 5,
              returnRate: Math.random() * 0.3 + 0.7,
              engagementScore: Math.random() * 0.3 + 0.7, // 70-100%
              churnRisk:
                Math.random() > 0.8
                  ? "high"
                  : Math.random() > 0.5
                    ? "medium"
                    : "low",
            },
            timestamp: new Date(),
          });
        }
      },
      10000 + Math.random() * 20000,
    ); // Every 10-30 seconds
  }

  private disconnect(): void {
    console.log(`[ProgressChannel] Disconnecting for user ${this.userId}`);

    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.config.onDisconnect?.();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[ProgressChannel] Max reconnection attempts reached for user ${this.userId}`,
      );
      this.handleError(new Error("Max reconnection attempts reached"));
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff

    console.log(
      `[ProgressChannel] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.sendMessage({ type: "ping" });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("[ProgressChannel] Failed to send message:", error);
        this.handleError(error as Error);
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as RealtimeEvent;

      // Route message to appropriate handler
      switch (data.type) {
        case "progress_update":
          this.handleProgressUpdate(data);
          break;
        case "milestone_achieved":
          this.handleMilestoneAchieved(data);
          break;
        case "streak_update":
          this.handleStreakUpdate(data);
          break;
        case "progress_summary_update":
          this.handleProgressSummaryUpdate(data);
          break;
        case "activity_update":
          this.handleActivityUpdate(data);
          break;
        case "engagement_update":
          this.handleEngagementUpdate(data);
          break;
        default:
          console.warn("[ProgressChannel] Unknown message type:", data);
      }
    } catch (error) {
      console.error("[ProgressChannel] Failed to parse message:", error);
      this.handleError(error as Error);
    }
  }

  private handleProgressUpdate(event: ProgressUpdateEvent): void {
    console.log("[ProgressChannel] Progress update received:", event);
    this.config.onProgressUpdate?.(event);
  }

  private handleMilestoneAchieved(event: MilestoneAchievedEvent): void {
    console.log("[ProgressChannel] Milestone achieved:", event);
    this.config.onMilestoneAchieved?.(event);
  }

  private handleStreakUpdate(event: StreakUpdateEvent): void {
    console.log("[ProgressChannel] Streak update:", event);
    this.config.onStreakUpdate?.(event);
  }

  private handleProgressSummaryUpdate(event: ProgressSummaryUpdateEvent): void {
    console.log("[ProgressChannel] Progress summary update:", event);
    this.config.onProgressSummaryUpdate?.(event);
  }

  private handleActivityUpdate(event: ActivityUpdateEvent): void {
    console.log("[ProgressChannel] Activity update:", event);
    this.config.onActivityUpdate?.(event);
  }

  private handleEngagementUpdate(event: EngagementUpdateEvent): void {
    console.log("[ProgressChannel] Engagement update:", event);
    this.config.onEngagementUpdate?.(event);
  }

  private handleError(error: Error): void {
    console.error("[ProgressChannel] Error:", error);
    this.config.onError?.(error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a progress channel with default configuration
 */
export function createProgressChannel(
  userId: string,
  config?: ProgressChannelConfig,
): ProgressChannel {
  return new ProgressChannel(userId, {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    ...config,
  });
}

/**
 * Create a mock progress channel for testing
 */
export function createMockProgressChannel(
  userId: string,
  config?: ProgressChannelConfig,
): ProgressChannel {
  return new ProgressChannel(userId, {
    ...config,
    reconnectAttempts: 0, // Don't reconnect in tests
  });
}
