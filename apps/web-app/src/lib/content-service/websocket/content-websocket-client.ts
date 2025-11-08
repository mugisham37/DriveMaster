/**
 * Content Service WebSocket Client
 *
 * Implements WebSocket connections for real-time content updates, collaboration features,
 * and presence indicators. Handles connection management, reconnection logic, and
 * subscription management for content changes.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { getContentServiceWebSocketUrl } from "@/lib/config/content-service";
import { integratedTokenManager } from "@/lib/auth/token-manager";
import type {
  WebSocketMessage,
  WebSocketSubscription,
  ContentChangeNotification,
  PresenceUpdate,
  CollaborationEvent,
  WebSocketConfig,
  WebSocketConnectionState,
  WebSocketError,
} from "../../../types/websocket";

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type WebSocketEventType =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"
  | "content_changed"
  | "presence_updated"
  | "collaboration_event"
  | "subscription_confirmed"
  | "subscription_error";

export interface WebSocketEventHandlers {
  connected?: () => void;
  disconnected?: (reason: string) => void;
  reconnecting?: (attempt: number) => void;
  error?: (error: WebSocketError) => void;
  content_changed?: (notification: ContentChangeNotification) => void;
  presence_updated?: (update: PresenceUpdate) => void;
  collaboration_event?: (event: CollaborationEvent) => void;
  subscription_confirmed?: (subscription: WebSocketSubscription) => void;
  subscription_error?: (error: {
    subscription: WebSocketSubscription;
    error: string;
  }) => void;
}

// ============================================================================
// Connection Statistics
// ============================================================================

interface ConnectionStats {
  totalConnections: number;
  totalReconnections: number;
  totalMessages: number;
  totalErrors: number;
  averageLatency: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  connectionDuration: number;
}

// ============================================================================
// Content WebSocket Client Class
// ============================================================================

export class ContentWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private eventHandlers: WebSocketEventHandlers = {};
  private subscriptions = new Map<string, WebSocketSubscription>();
  private connectionState: WebSocketConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStats: ConnectionStats;
  private messageQueue: WebSocketMessage[] = [];
  private isDestroyed = false;

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: getContentServiceWebSocketUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 10000,
      enableLogging: process.env.NODE_ENV === "development",
      enablePresence: true,
      enableCollaboration: true,
      ...config,
    };

    this.connectionStats = this.initializeStats();

    // Auto-connect if enabled
    if (this.config.autoConnect !== false) {
      this.connect();
    }
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establishes WebSocket connection with authentication
   * Requirements: 9.1, 9.5
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("WebSocket client has been destroyed");
    }

    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    this.connectionState = "connecting";
    this.log("Connecting to WebSocket...");

    try {
      // Get authentication token
      const accessToken = await integratedTokenManager.getValidAccessToken();
      if (!accessToken) {
        throw new Error(
          "No valid access token available for WebSocket connection",
        );
      }

      // Create WebSocket connection with auth token
      const wsUrl = new URL(this.config.url);
      wsUrl.searchParams.set("token", accessToken);

      this.ws = new WebSocket(wsUrl.toString());
      this.setupWebSocketEventHandlers();

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === "connecting") {
          this.handleConnectionError(new Error("Connection timeout"));
        }
      }, this.config.messageTimeout);

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          clearTimeout(connectionTimeout);
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          this.connectionStats.totalConnections++;
          this.connectionStats.lastConnectedAt = new Date();

          this.log("WebSocket connected successfully");
          this.emit("connected");

          // Start heartbeat
          this.startHeartbeat();

          // Process queued messages
          this.processMessageQueue();

          resolve();
        };

        const onError = (error: Event) => {
          clearTimeout(connectionTimeout);
          reject(new Error(`WebSocket connection failed: ${error}`));
        };

        if (this.ws) {
          this.ws.addEventListener("open", onOpen, { once: true });
          this.ws.addEventListener("error", onError, { once: true });
        }
      });
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnects WebSocket connection
   */
  disconnect(): void {
    this.log("Disconnecting WebSocket...");

    this.connectionState = "disconnected";
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.connectionStats.lastDisconnectedAt = new Date();
    this.emit("disconnected", "Client disconnect");
  }

  /**
   * Destroys the WebSocket client and cleans up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.subscriptions.clear();
    this.messageQueue = [];
    this.eventHandlers = {};
  }

  // ============================================================================
  // WebSocket Event Handlers Setup
  // ============================================================================

  private setupWebSocketEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      // Handled in connect() method
    };

    this.ws.onclose = (event) => {
      this.connectionState = "disconnected";
      this.stopHeartbeat();
      this.connectionStats.lastDisconnectedAt = new Date();

      const reason = event.reason || `Code: ${event.code}`;
      this.log(`WebSocket closed: ${reason}`);

      // Don't reconnect if it was a clean close or client initiated
      if (event.code === 1000 || this.isDestroyed) {
        this.emit("disconnected", reason);
        return;
      }

      // Attempt reconnection for unexpected disconnections
      this.emit("disconnected", reason);
      this.attemptReconnection();
    };

    this.ws.onerror = (event) => {
      this.connectionStats.totalErrors++;
      const error: WebSocketError = {
        type: "connection",
        message: "WebSocket connection error",
        timestamp: new Date(),
        event,
      };

      this.log(`WebSocket error: ${error.message}`);
      this.emit("error", error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handles incoming WebSocket messages
   * Requirements: 9.2, 9.3, 9.4
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.connectionStats.totalMessages++;

      this.log(`Received message: ${message.type}`, message);

      switch (message.type) {
        case "content_changed":
          this.handleContentChanged(
            message.payload as ContentChangeNotification,
          );
          break;

        case "presence_updated":
          this.handlePresenceUpdated(message.payload as PresenceUpdate);
          break;

        case "collaboration_event":
          this.handleCollaborationEvent(message.payload as CollaborationEvent);
          break;

        case "subscription_confirmed":
          this.handleSubscriptionConfirmed(
            message.payload as WebSocketSubscription,
          );
          break;

        case "subscription_error":
          this.handleSubscriptionError(
            message.payload as {
              subscription: WebSocketSubscription;
              error: string;
            },
          );
          break;

        case "pong":
          // Heartbeat response - update latency
          if (
            message.payload &&
            typeof message.payload === "object" &&
            "timestamp" in message.payload
          ) {
            const latency = Date.now() - (message.payload.timestamp as number);
            this.updateLatencyStats(latency);
          }
          break;

        case "error":
          const errorPayload = message.payload as
            | { message?: string; code?: string }
            | undefined;
          const error: WebSocketError = {
            type: "server",
            message: errorPayload?.message || "Server error",
            timestamp: new Date(),
            ...(errorPayload?.code !== undefined && {
              code: errorPayload.code,
            }),
          };
          this.emit("error", error);
          break;

        default:
          this.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.log(`Failed to parse WebSocket message: ${error}`);
      const parseError: WebSocketError = {
        type: "parse",
        message: `Failed to parse message: ${error}`,
        timestamp: new Date(),
      };
      this.emit("error", parseError);
    }
  }

  /**
   * Handles content change notifications
   * Requirements: 9.2, 9.4
   */
  private handleContentChanged(notification: ContentChangeNotification): void {
    this.log(
      `Content changed: ${notification.itemId} - ${notification.changeType}`,
    );
    this.emit("content_changed", notification);
  }

  /**
   * Handles presence updates
   * Requirements: 9.3
   */
  private handlePresenceUpdated(update: PresenceUpdate): void {
    this.log(`Presence updated: ${update.userId} - ${update.status}`);
    this.emit("presence_updated", update);
  }

  /**
   * Handles collaboration events
   * Requirements: 9.3
   */
  private handleCollaborationEvent(event: CollaborationEvent): void {
    this.log(`Collaboration event: ${event.type} from ${event.userId}`);
    this.emit("collaboration_event", event);
  }

  /**
   * Handles subscription confirmations
   */
  private handleSubscriptionConfirmed(
    subscription: WebSocketSubscription,
  ): void {
    this.subscriptions.set(subscription.id, subscription);
    this.log(
      `Subscription confirmed: ${subscription.type} - ${subscription.id}`,
    );
    this.emit("subscription_confirmed", subscription);
  }

  /**
   * Handles subscription errors
   */
  private handleSubscriptionError(payload: {
    subscription: WebSocketSubscription;
    error: string;
  }): void {
    this.log(
      `Subscription error: ${payload.subscription.id} - ${payload.error}`,
    );
    this.emit("subscription_error", payload);
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Sends a message through the WebSocket connection
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.connectionState !== "connected" || !this.ws) {
      // Queue message for later if not connected
      this.messageQueue.push(message);
      this.log(`Message queued: ${message.type}`);
      return;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      this.log(`Message sent: ${message.type}`, message);
    } catch (error) {
      this.log(`Failed to send message: ${error}`);
      const sendError: WebSocketError = {
        type: "send",
        message: `Failed to send message: ${error}`,
        timestamp: new Date(),
      };
      this.emit("error", sendError);
    }
  }

  /**
   * Processes queued messages when connection is established
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      this.sendMessage(message);
    });
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribes to content changes for a specific item
   * Requirements: 9.1, 9.2
   */
  subscribeToContentChanges(itemId: string): string {
    const subscription: WebSocketSubscription = {
      id: `content_${itemId}_${Date.now()}`,
      type: "content_changes",
      itemId,
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      type: "subscribe",
      payload: subscription,
      timestamp: new Date(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Subscribes to presence updates for a specific item
   * Requirements: 9.3
   */
  subscribeToPresence(itemId: string): string {
    const subscription: WebSocketSubscription = {
      id: `presence_${itemId}_${Date.now()}`,
      type: "presence",
      itemId,
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      type: "subscribe",
      payload: subscription,
      timestamp: new Date(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Subscribes to collaboration events for a specific item
   * Requirements: 9.3
   */
  subscribeToCollaboration(itemId: string): string {
    const subscription: WebSocketSubscription = {
      id: `collaboration_${itemId}_${Date.now()}`,
      type: "collaboration",
      itemId,
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      type: "subscribe",
      payload: subscription,
      timestamp: new Date(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Unsubscribes from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      this.log(`Subscription not found: ${subscriptionId}`);
      return;
    }

    const message: WebSocketMessage = {
      type: "unsubscribe",
      payload: { subscriptionId },
      timestamp: new Date(),
    };

    this.sendMessage(message);
    this.subscriptions.delete(subscriptionId);
    this.log(`Unsubscribed: ${subscriptionId}`);
  }

  /**
   * Unsubscribes from all subscriptions
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach((id) => this.unsubscribe(id));
  }

  // ============================================================================
  // Collaboration Features
  // ============================================================================

  /**
   * Sends cursor position for real-time collaboration
   * Requirements: 9.3
   */
  sendCursorPosition(
    itemId: string,
    position: { line: number; column: number },
  ): void {
    const event: CollaborationEvent = {
      type: "cursor_move",
      itemId,
      userId: "current_user", // This would come from auth context
      timestamp: new Date(),
      data: { position },
    };

    const message: WebSocketMessage = {
      type: "collaboration_event",
      payload: event,
      timestamp: new Date(),
    };

    this.sendMessage(message);
  }

  /**
   * Sends text selection for real-time collaboration
   * Requirements: 9.3
   */
  sendTextSelection(
    itemId: string,
    selection: { start: number; end: number; text: string },
  ): void {
    const event: CollaborationEvent = {
      type: "text_selection",
      itemId,
      userId: "current_user", // This would come from auth context
      timestamp: new Date(),
      data: { selection },
    };

    const message: WebSocketMessage = {
      type: "collaboration_event",
      payload: event,
      timestamp: new Date(),
    };

    this.sendMessage(message);
  }

  /**
   * Updates user presence status
   * Requirements: 9.3
   */
  updatePresence(itemId: string, status: "active" | "idle" | "away"): void {
    const update: PresenceUpdate = {
      itemId,
      userId: "current_user", // This would come from auth context
      status,
      timestamp: new Date(),
      metadata: {
        userAgent: navigator.userAgent,
        lastActivity: new Date(),
      },
    };

    const message: WebSocketMessage = {
      type: "presence_update",
      payload: update,
      timestamp: new Date(),
    };

    this.sendMessage(message);
  }

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  /**
   * Attempts to reconnect with exponential backoff
   * Requirements: 9.5
   */
  private attemptReconnection(): void {
    if (
      this.isDestroyed ||
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log(
        `Max reconnection attempts reached (${this.config.maxReconnectAttempts})`,
      );
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = "reconnecting";

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000, // Max 30 seconds
    );

    this.log(
      `Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`,
    );
    this.emit("reconnecting", this.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        this.connectionStats.totalReconnections++;
        await this.connect();

        // Resubscribe to all previous subscriptions
        this.resubscribeAll();
      } catch (error) {
        this.log(
          `Reconnection attempt ${this.reconnectAttempts} failed: ${error}`,
        );
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Resubscribes to all previous subscriptions after reconnection
   */
  private resubscribeAll(): void {
    const subscriptions = Array.from(this.subscriptions.values());
    this.subscriptions.clear();

    subscriptions.forEach((subscription) => {
      const message: WebSocketMessage = {
        type: "subscribe",
        payload: subscription,
        timestamp: new Date(),
      };
      this.sendMessage(message);
    });

    this.log(`Resubscribed to ${subscriptions.length} subscriptions`);
  }

  /**
   * Clears the reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ============================================================================
  // Heartbeat Management
  // ============================================================================

  /**
   * Starts heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === "connected") {
        const message: WebSocketMessage = {
          type: "ping",
          payload: { timestamp: Date.now() },
          timestamp: new Date(),
        };
        this.sendMessage(message);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stops heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  /**
   * Registers event handler
   */
  on<T extends WebSocketEventType>(
    event: T,
    handler: WebSocketEventHandlers[T],
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Removes event handler
   */
  off<T extends WebSocketEventType>(event: T): void {
    delete this.eventHandlers[event];
  }

  /**
   * Emits event to registered handlers
   */
  private emit<T extends WebSocketEventType>(
    event: T,
    ...args: Parameters<NonNullable<WebSocketEventHandlers[T]>>
  ): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      try {
        // @ts-expect-error - TypeScript can't infer the correct handler type
        handler(...args);
      } catch (error) {
        this.log(`Error in event handler for ${event}: ${error}`);
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Gets current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Gets active subscriptions
   */
  getActiveSubscriptions(): WebSocketSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  /**
   * Handles connection errors
   */
  private handleConnectionError(error: Error): void {
    this.connectionState = "disconnected";
    this.connectionStats.totalErrors++;

    const wsError: WebSocketError = {
      type: "connection",
      message: error.message,
      timestamp: new Date(),
    };

    this.log(`Connection error: ${error.message}`);
    this.emit("error", wsError);
  }

  /**
   * Updates latency statistics
   */
  private updateLatencyStats(latency: number): void {
    const currentAvg = this.connectionStats.averageLatency;
    const totalMessages = this.connectionStats.totalMessages;

    this.connectionStats.averageLatency =
      (currentAvg * (totalMessages - 1) + latency) / totalMessages;
  }

  /**
   * Initializes connection statistics
   */
  private initializeStats(): ConnectionStats {
    return {
      totalConnections: 0,
      totalReconnections: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageLatency: 0,
      connectionDuration: 0,
    };
  }

  /**
   * Logs messages if logging is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.enableLogging) {
      console.log(`[ContentWebSocket] ${message}`, data || "");
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new ContentWebSocketClient instance
 */
export function createContentWebSocketClient(
  config?: Partial<WebSocketConfig>,
): ContentWebSocketClient {
  return new ContentWebSocketClient(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalWebSocketClient: ContentWebSocketClient | null = null;

/**
 * Gets or creates the global WebSocket client instance
 */
export function getContentWebSocketClient(
  config?: Partial<WebSocketConfig>,
): ContentWebSocketClient {
  if (!globalWebSocketClient) {
    globalWebSocketClient = createContentWebSocketClient(config);
  }
  return globalWebSocketClient;
}

/**
 * Destroys the global WebSocket client instance
 */
export function destroyContentWebSocketClient(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.destroy();
    globalWebSocketClient = null;
  }
}
