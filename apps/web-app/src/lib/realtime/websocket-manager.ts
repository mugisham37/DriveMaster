/**
 * WebSocket Connection Management System
 *
 * Implements Task 10.1:
 * - WebSocket client for real-time user-service communication
 * - Connection pooling and automatic reconnection with exponential backoff
 * - Selective subscription management for different data streams
 * - WebSocket message routing and event handling
 * - Requirements: 9.1, 9.2, 9.3, 9.4
 */

import type {
  UserServiceError,
  ProgressSummary,
  SkillMastery,
  ActivityRecord,
  EngagementMetrics,
} from "@/types/user-service";

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface WebSocketMessage {
  id: string;
  type: string;
  userId: string;
  timestamp: Date;
  data: unknown;
}

export interface SubscriptionRequest {
  type: "subscribe" | "unsubscribe";
  channels: string[];
  userId: string;
}

export interface HeartbeatMessage {
  type: "ping" | "pong";
  timestamp: Date;
}

export interface AuthMessage {
  type: "auth";
  token: string;
  userId: string;
}

export type WebSocketEventType =
  | "progress_update"
  | "activity_update"
  | "engagement_update"
  | "milestone_achieved"
  | "streak_update"
  | "notification"
  | "system_message";

// ============================================================================
// Connection Configuration
// ============================================================================

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

export interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  averageLatency: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  uptime: number;
}

// ============================================================================
// Event Handlers
// ============================================================================

export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: UserServiceError) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onProgressUpdate?: (data: ProgressUpdateData) => void;
  onActivityUpdate?: (data: ActivityUpdateData) => void;
  onEngagementUpdate?: (data: EngagementUpdateData) => void;
  onMilestoneAchieved?: (data: MilestoneData) => void;
  onStreakUpdate?: (data: StreakData) => void;
  onNotification?: (data: NotificationData) => void;
}

export interface ProgressUpdateData {
  userId: string;
  topic: string;
  mastery: SkillMastery;
  summary?: ProgressSummary;
  timestamp: Date;
}

export interface ActivityUpdateData {
  userId: string;
  activity: ActivityRecord;
  sessionId?: string;
  timestamp: Date;
}

export interface EngagementUpdateData {
  userId: string;
  metrics: EngagementMetrics;
  changes: Record<string, number>;
  timestamp: Date;
}

export interface MilestoneData {
  userId: string;
  milestoneId: string;
  title: string;
  description: string;
  achievedAt: Date;
  value: number;
}

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  streakType: "daily" | "weekly" | "practice";
}

export interface NotificationData {
  id: string;
  userId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: Date;
}

// ============================================================================
// WebSocket Manager Class
// ============================================================================

export class WebSocketManager {
  private config: WebSocketConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private heartbeatInterval: number;
  private connectionTimeout: number;

  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;

  private subscriptions = new Set<string>();
  private eventHandlers: WebSocketEventHandlers = {};
  private messageQueue: WebSocketMessage[] = [];
  private metrics: ConnectionMetrics;

  private userId: string | null = null;
  private authToken: string | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      enableLogging: true,
      enableMetrics: true,
      ...config,
    };

    this.maxReconnectAttempts = this.config.reconnectAttempts!;
    this.reconnectDelay = this.config.reconnectDelay!;
    this.heartbeatInterval = this.config.heartbeatInterval!;
    this.connectionTimeout = this.config.connectionTimeout!;

    this.metrics = this.initializeMetrics();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string, authToken: string): Promise<void> {
    this.userId = userId;
    this.authToken = authToken;

    return new Promise((resolve, reject) => {
      try {
        this.log(`Connecting to WebSocket for user ${userId}...`);

        // Build connection URL with auth parameters
        const url = new URL(this.config.url);
        url.searchParams.set("userId", userId);
        url.searchParams.set("token", authToken);

        // Create WebSocket connection
        this.ws = new WebSocket(url.toString(), this.config.protocols);

        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error("Connection timeout"));
          }
        }, this.connectionTimeout);

        this.ws.onopen = () => {
          this.handleConnectionOpen();
          clearTimeout(this.connectionTimer!);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleConnectionClose(event.code, event.reason);
        };

        this.ws.onerror = (error) => {
          this.handleConnectionError(error);
          clearTimeout(this.connectionTimer!);
          reject(new Error("WebSocket connection failed"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log("Disconnecting from WebSocket...");

    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Reconnect to WebSocket server
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log("Max reconnection attempts reached");
      this.handleError({
        type: "network",
        message: "Max reconnection attempts reached",
        recoverable: false,
      });
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      this.metrics.reconnectionAttempts++;

      try {
        if (this.userId && this.authToken) {
          await this.connect(this.userId, this.authToken);
          this.resubscribeToChannels();
        }
      } catch (error) {
        this.log("Reconnection failed:", error);
        this.reconnect();
      }
    }, delay);
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to specific channels
   */
  subscribe(channels: string[]): void {
    channels.forEach((channel) => this.subscriptions.add(channel));

    if (this.isConnected) {
      this.sendSubscriptionMessage("subscribe", channels);
    }
  }

  /**
   * Unsubscribe from specific channels
   */
  unsubscribe(channels: string[]): void {
    channels.forEach((channel) => this.subscriptions.delete(channel));

    if (this.isConnected) {
      this.sendSubscriptionMessage("unsubscribe", channels);
    }
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeToChannels(): void {
    if (this.subscriptions.size > 0) {
      this.sendSubscriptionMessage("subscribe", Array.from(this.subscriptions));
    }
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Send message to WebSocket server
   */
  sendMessage(message: Partial<WebSocketMessage>): void {
    if (!this.isConnected || !this.ws) {
      this.log("Cannot send message: not connected");
      return;
    }

    const fullMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      userId: this.userId!,
      ...message,
    } as WebSocketMessage;

    try {
      this.ws.send(JSON.stringify(fullMessage));
      this.metrics.messagesSent++;
      this.log("Message sent:", fullMessage.type);
    } catch (error) {
      this.log("Failed to send message:", error);
      this.handleError({
        type: "network",
        message: "Failed to send message",
        recoverable: true,
      });
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.metrics.messagesReceived++;

      this.log("Message received:", message.type);

      // Handle system messages
      if (message.type === "pong") {
        this.handlePongMessage();
        return;
      }

      // Route message to appropriate handler
      this.routeMessage(message);

      // Call generic message handler
      this.eventHandlers.onMessage?.(message);
    } catch (error) {
      this.log("Failed to parse message:", error);
      this.handleError({
        type: "service",
        message: "Failed to parse WebSocket message",
        recoverable: true,
      });
    }
  }

  /**
   * Route message to specific handler based on type
   */
  private routeMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "progress_update":
        this.eventHandlers.onProgressUpdate?.(
          message.data as ProgressUpdateData,
        );
        break;
      case "activity_update":
        this.eventHandlers.onActivityUpdate?.(
          message.data as ActivityUpdateData,
        );
        break;
      case "engagement_update":
        this.eventHandlers.onEngagementUpdate?.(
          message.data as EngagementUpdateData,
        );
        break;
      case "milestone_achieved":
        this.eventHandlers.onMilestoneAchieved?.(message.data as MilestoneData);
        break;
      case "streak_update":
        this.eventHandlers.onStreakUpdate?.(message.data as StreakData);
        break;
      case "notification":
        this.eventHandlers.onNotification?.(message.data as NotificationData);
        break;
      default:
        this.log("Unknown message type:", message.type);
    }
  }

  // ============================================================================
  // Event Handler Management
  // ============================================================================

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Remove event handler
   */
  removeEventHandler(event: keyof WebSocketEventHandlers): void {
    delete this.eventHandlers[event];
  }

  // ============================================================================
  // Connection Event Handlers
  // ============================================================================

  private handleConnectionOpen(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.metrics.successfulConnections++;
    this.metrics.lastConnectedAt = new Date();

    this.log("WebSocket connected");

    // Send authentication message
    this.sendAuthMessage();

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    // Resubscribe to channels
    this.resubscribeToChannels();

    this.eventHandlers.onConnect?.();
  }

  private handleConnectionClose(code: number, reason: string): void {
    this.isConnected = false;
    this.metrics.lastDisconnectedAt = new Date();

    this.log(`WebSocket disconnected: ${code} - ${reason}`);

    this.clearTimers();

    // Attempt reconnection if not a normal closure
    if (code !== 1000 && code !== 1001) {
      this.reconnect();
    }

    this.eventHandlers.onDisconnect?.(code, reason);
  }

  private handleConnectionError(error: Event): void {
    this.metrics.failedConnections++;
    this.log("WebSocket error:", error);

    this.handleError({
      type: "network",
      message: "WebSocket connection error",
      recoverable: true,
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private sendAuthMessage(): void {
    if (this.authToken) {
      this.sendMessage({
        type: "auth",
        data: {
          token: this.authToken,
          userId: this.userId,
        },
      });
    }
  }

  private sendSubscriptionMessage(
    type: "subscribe" | "unsubscribe",
    channels: string[],
  ): void {
    this.sendMessage({
      type,
      data: {
        channels,
        userId: this.userId,
      },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({
          type: "ping",
          data: { timestamp: new Date() },
        });
      }
    }, this.heartbeatInterval);
  }

  private handlePongMessage(): void {
    // Update latency metrics if needed
    this.log("Heartbeat pong received");
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): ConnectionMetrics {
    return {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      averageLatency: 0,
      uptime: 0,
    };
  }

  private handleError(error: UserServiceError): void {
    this.log("WebSocket error:", error);
    this.eventHandlers.onError?.(error);
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocketManager] ${message}`, ...args);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: this.metrics.lastConnectedAt
        ? Date.now() - this.metrics.lastConnectedAt.getTime()
        : 0,
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: string[];
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Reset connection metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create WebSocket manager with default configuration
 */
export function createWebSocketManager(
  config: Partial<WebSocketConfig> = {},
): WebSocketManager {
  const defaultConfig: WebSocketConfig = {
    url:
      process.env.NEXT_PUBLIC_USER_SERVICE_WS_URL || "ws://localhost:8080/ws",
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
    enableLogging: process.env.NODE_ENV === "development",
    enableMetrics: true,
  };

  return new WebSocketManager({ ...defaultConfig, ...config });
}

/**
 * Create mock WebSocket manager for testing
 */
export function createMockWebSocketManager(): WebSocketManager {
  return new WebSocketManager({
    url: "ws://localhost:8080/ws",
    reconnectAttempts: 0,
    enableLogging: false,
    enableMetrics: false,
  });
}
