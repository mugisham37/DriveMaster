/**
 * Notification Service WebSocket Client
 *
 * Implements WebSocket connections for real-time notification delivery, status updates,
 * and subscription management. Handles connection management, reconnection logic, and
 * event routing for notification changes.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */

import { notificationServiceConfig } from "@/lib/config/notification-service";
import { integratedTokenManager } from "@/lib/auth";
import { gracefulDegradationManager } from "./graceful-degradation";
import { getNotificationCacheManager } from "./cache-manager";
import type {
  RealtimeNotification,
  WebSocketMessage,
  NotificationError,
  Notification,
  NotificationPreferences,
} from "@/types/notification-service";

// ============================================================================
// WebSocket Event Types and Handlers
// ============================================================================

export type NotificationWebSocketEventType =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"
  | "notification.received"
  | "notification.updated"
  | "notification.deleted"
  | "preferences.updated"
  | "connection.status"
  | "subscription_confirmed"
  | "subscription_error";

export interface NotificationWebSocketEventHandlers {
  connected?: () => void;
  disconnected?: (reason: string) => void;
  reconnecting?: (attempt: number) => void;
  error?: (error: NotificationError) => void;
  "notification.received"?: (notification: RealtimeNotification) => void;
  "notification.updated"?: (notification: Notification) => void;
  "notification.deleted"?: (notificationId: string) => void;
  "preferences.updated"?: (preferences: NotificationPreferences) => void;
  "connection.status"?: (status: {
    connected: boolean;
    latency?: number;
  }) => void;
  subscription_confirmed?: (subscription: NotificationSubscription) => void;
  subscription_error?: (error: {
    subscription: NotificationSubscription;
    error: string;
  }) => void;
}

// ============================================================================
// Subscription Management Types
// ============================================================================

export interface NotificationSubscription {
  id: string;
  type: "user_notifications" | "notification_updates" | "preference_changes";
  userId?: string | undefined;
  filters?:
    | {
        types?: string[] | undefined;
        priorities?: string[] | undefined;
        channels?: string[] | undefined;
      }
    | undefined;
  createdAt: Date;
}

// ============================================================================
// Connection Configuration
// ============================================================================

export interface NotificationWebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableLogging: boolean;
  autoConnect: boolean;
  enableFallback: boolean;
  fallbackPollInterval: number;
}

// ============================================================================
// Connection Statistics
// ============================================================================

interface NotificationConnectionStats {
  totalConnections: number;
  totalReconnections: number;
  totalMessages: number;
  totalErrors: number;
  averageLatency: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  connectionDuration: number;
  messagesReceived: number;
  messagesSent: number;
}

// ============================================================================
// Connection State Management
// ============================================================================

export type NotificationWebSocketState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "fallback";

// ============================================================================
// Notification WebSocket Client Class
// ============================================================================

export class NotificationWebSocketClient {
  private ws: WebSocket | null = null;
  private config: NotificationWebSocketConfig;
  private eventHandlers: NotificationWebSocketEventHandlers = {};
  private subscriptions = new Map<string, NotificationSubscription>();
  private connectionState: NotificationWebSocketState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private connectionStats: NotificationConnectionStats;
  private messageQueue: WebSocketMessage[] = [];
  private isDestroyed = false;
  private lastHeartbeatTime = 0;
  private connectionStartTime = 0;

  constructor(config?: Partial<NotificationWebSocketConfig>) {
    this.config = {
      url: this.getWebSocketUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 10000,
      enableLogging: notificationServiceConfig.isDevelopment || false,
      autoConnect: true,
      enableFallback: true,
      fallbackPollInterval: 30000,
      ...config,
    };

    this.connectionStats = this.initializeStats();

    // Auto-connect if enabled
    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // ============================================================================
  // Connection Management (Task 5.1)
  // ============================================================================

  /**
   * Establishes WebSocket connection with JWT authentication
   * Requirements: 4.1, 4.2, 8.1
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
    this.connectionStartTime = Date.now();
    this.log("Connecting to notification WebSocket...");

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
      wsUrl.searchParams.set("client", "web-app");
      wsUrl.searchParams.set("version", "1.0.0");

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

          this.log("Notification WebSocket connected successfully");
          this.emit("connected");

          // Start heartbeat
          this.startHeartbeat();

          // Process queued messages
          this.processMessageQueue();

          // Deactivate fallback mode if it was active
          if (gracefulDegradationManager.isDegraded()) {
            gracefulDegradationManager.deactivateDegradation();
          }

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

      // Activate fallback mode if enabled
      if (this.config.enableFallback) {
        this.activateFallbackMode();
      }

      throw error;
    }
  }

  /**
   * Disconnects WebSocket connection gracefully
   */
  disconnect(): void {
    this.log("Disconnecting notification WebSocket...");

    this.connectionState = "disconnected";
    this.stopHeartbeat();
    this.stopFallback();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.connectionStats.lastDisconnectedAt = new Date();
    this.updateConnectionDuration();
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
  // WebSocket Event Handlers Setup (Task 5.1)
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
      this.updateConnectionDuration();

      const reason = event.reason || `Code: ${event.code}`;
      this.log(`Notification WebSocket closed: ${reason}`);

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
      const error: NotificationError = {
        type: "websocket",
        message: "WebSocket connection error",
        recoverable: true,
        timestamp: new Date(),
        details: { event },
      };

      this.log(`Notification WebSocket error: ${error.message}`);
      this.emit("error", error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  // ============================================================================
  // Message Handling (Task 5.3)
  // ============================================================================

  /**
   * Handles incoming WebSocket messages with routing and filtering
   * Requirements: 4.1, 4.3
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.connectionStats.totalMessages++;
      this.connectionStats.messagesReceived++;

      this.log(`Received notification message: ${message.event}`, message);

      // Route message based on event type
      switch (message.event) {
        case "notification.received":
          this.handleNotificationReceived(message.data as RealtimeNotification);
          break;

        case "notification.updated":
          this.handleNotificationUpdated(message.data as Notification);
          break;

        case "notification.deleted":
          this.handleNotificationDeleted(
            message.data as { notificationId: string },
          );
          break;

        case "preferences.updated":
          this.handlePreferencesUpdated(
            message.data as NotificationPreferences,
          );
          break;

        case "connection.status":
          this.handleConnectionStatus(
            message.data as { connected: boolean; latency?: number },
          );
          break;

        case "subscription.confirmed":
          this.handleSubscriptionConfirmed(
            message.data as NotificationSubscription,
          );
          break;

        case "subscription.error":
          this.handleSubscriptionError(
            message.data as {
              subscription: NotificationSubscription;
              error: string;
            },
          );
          break;

        case "pong":
          // Heartbeat response - update latency
          if (
            message.data &&
            typeof message.data === "object" &&
            "timestamp" in message.data
          ) {
            const latency = Date.now() - (message.data.timestamp as number);
            this.updateLatencyStats(latency);
            this.emit("connection.status", { connected: true, latency });
          }
          break;

        case "error":
          const errorPayload = message.data as
            | { message?: string; code?: string }
            | undefined;
          const error: NotificationError = {
            type: "service",
            message: errorPayload?.message || "Server error",
            recoverable: true,
            timestamp: new Date(),
            code: errorPayload?.code,
          };
          this.emit("error", error);
          break;

        default:
          this.log(`Unknown notification message type: ${message.event}`);
      }
    } catch (error) {
      this.log(`Failed to parse notification WebSocket message: ${error}`);
      const parseError: NotificationError = {
        type: "websocket",
        message: `Failed to parse message: ${error}`,
        recoverable: false,
        timestamp: new Date(),
      };
      this.emit("error", parseError);
    }
  }

  /**
   * Handles new notification received events
   * Requirements: 4.1, 4.3
   */
  private async handleNotificationReceived(
    notification: RealtimeNotification,
  ): Promise<void> {
    this.log(
      `New notification received: ${notification.id} - ${notification.title}`,
    );

    // Update cache with new notification
    try {
      const cacheManager = getNotificationCacheManager();
      await cacheManager.cacheNotifications(notification.userId, [
        notification,
      ]);
    } catch (error) {
      this.log(`Failed to cache notification: ${error}`);
    }

    this.emit("notification.received", notification);
  }

  /**
   * Handles notification update events
   * Requirements: 4.1, 4.3
   */
  private async handleNotificationUpdated(
    notification: Notification,
  ): Promise<void> {
    this.log(`Notification updated: ${notification.id}`);

    // Update cache with modified notification
    try {
      const cacheManager = getNotificationCacheManager();
      await cacheManager.cacheNotifications(notification.userId, [
        notification,
      ]);
    } catch (error) {
      this.log(`Failed to update cached notification: ${error}`);
    }

    this.emit("notification.updated", notification);
  }

  /**
   * Handles notification deletion events
   * Requirements: 4.1, 4.3
   */
  private async handleNotificationDeleted(data: {
    notificationId: string;
  }): Promise<void> {
    this.log(`Notification deleted: ${data.notificationId}`);

    // Remove from cache
    try {
      const cacheManager = getNotificationCacheManager();
      await cacheManager.invalidateByPattern(`*${data.notificationId}*`);
    } catch (error) {
      this.log(`Failed to remove notification from cache: ${error}`);
    }

    this.emit("notification.deleted", data.notificationId);
  }

  /**
   * Handles preference update events
   */
  private handlePreferencesUpdated(preferences: NotificationPreferences): void {
    this.log(`Notification preferences updated`);
    this.emit("preferences.updated", preferences);
  }

  /**
   * Handles connection status updates
   */
  private handleConnectionStatus(status: {
    connected: boolean;
    latency?: number;
  }): void {
    this.emit("connection.status", status);
  }

  /**
   * Handles subscription confirmations
   */
  private handleSubscriptionConfirmed(
    subscription: NotificationSubscription,
  ): void {
    this.subscriptions.set(subscription.id, subscription);
    this.log(
      `Notification subscription confirmed: ${subscription.type} - ${subscription.id}`,
    );
    this.emit("subscription_confirmed", subscription);
  }

  /**
   * Handles subscription errors
   */
  private handleSubscriptionError(payload: {
    subscription: NotificationSubscription;
    error: string;
  }): void {
    this.log(
      `Notification subscription error: ${payload.subscription.id} - ${payload.error}`,
    );
    this.emit("subscription_error", payload);
  }

  // ============================================================================
  // Message Sending (Task 5.1)
  // ============================================================================

  /**
   * Sends a message through the WebSocket connection
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.connectionState !== "connected" || !this.ws) {
      // Queue message for later if not connected
      this.messageQueue.push(message);
      this.log(`Notification message queued: ${message.event}`);
      return;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      this.connectionStats.messagesSent++;
      this.log(`Notification message sent: ${message.event}`, message);
    } catch (error) {
      this.log(`Failed to send notification message: ${error}`);
      const sendError: NotificationError = {
        type: "websocket",
        message: `Failed to send message: ${error}`,
        recoverable: true,
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

    this.log(
      `Processing ${this.messageQueue.length} queued notification messages`,
    );

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      this.sendMessage(message);
    });
  }

  // ============================================================================
  // Subscription Management (Task 5.3)
  // ============================================================================

  /**
   * Subscribes to user notifications with filtering
   * Requirements: 4.1, 4.3
   */
  subscribeToUserNotifications(
    userId: string,
    filters?: {
      types?: string[];
      priorities?: string[];
      channels?: string[];
    },
  ): string {
    const subscription: NotificationSubscription = {
      id: `user_notifications_${userId}_${Date.now()}`,
      type: "user_notifications",
      userId,
      filters,
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      event: "subscribe",
      data: subscription,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Subscribes to notification updates for specific notifications
   * Requirements: 4.1, 4.3
   */
  subscribeToNotificationUpdates(notificationIds: string[]): string {
    const subscription: NotificationSubscription = {
      id: `notification_updates_${Date.now()}`,
      type: "notification_updates",
      filters: { types: notificationIds },
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      event: "subscribe",
      data: subscription,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Subscribes to preference changes for a user
   * Requirements: 4.1
   */
  subscribeToPreferenceChanges(userId: string): string {
    const subscription: NotificationSubscription = {
      id: `preference_changes_${userId}_${Date.now()}`,
      type: "preference_changes",
      userId,
      createdAt: new Date(),
    };

    const message: WebSocketMessage = {
      event: "subscribe",
      data: subscription,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
    };

    this.sendMessage(message);
    return subscription.id;
  }

  /**
   * Unsubscribes from a specific subscription
   * Requirements: 4.3
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      this.log(`Notification subscription not found: ${subscriptionId}`);
      return;
    }

    const message: WebSocketMessage = {
      event: "unsubscribe",
      data: { subscriptionId },
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
    };

    this.sendMessage(message);
    this.subscriptions.delete(subscriptionId);
    this.log(`Unsubscribed from notifications: ${subscriptionId}`);
  }

  /**
   * Unsubscribes from all subscriptions
   * Requirements: 4.3
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach((id) => this.unsubscribe(id));
  }

  // ============================================================================
  // Reconnection Logic (Task 5.2)
  // ============================================================================

  /**
   * Attempts to reconnect with exponential backoff strategy
   * Requirements: 4.4, 4.5
   */
  private attemptReconnection(): void {
    if (
      this.isDestroyed ||
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log(
        `Max notification reconnection attempts reached (${this.config.maxReconnectAttempts})`,
      );

      // Activate fallback mode if available
      if (this.config.enableFallback) {
        this.activateFallbackMode();
      }
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = "reconnecting";

    // Exponential backoff with jitter
    const baseDelay =
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 30000); // Max 30 seconds

    this.log(
      `Notification reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${Math.round(delay)}ms`,
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
          `Notification reconnection attempt ${this.reconnectAttempts} failed: ${error}`,
        );
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Resubscribes to all previous subscriptions after reconnection
   * Requirements: 4.3
   */
  private resubscribeAll(): void {
    const subscriptions = Array.from(this.subscriptions.values());
    this.subscriptions.clear();

    subscriptions.forEach((subscription) => {
      const message: WebSocketMessage = {
        event: "subscribe",
        data: subscription,
        timestamp: new Date().toISOString(),
        correlationId: this.generateCorrelationId(),
      };
      this.sendMessage(message);
    });

    this.log(
      `Resubscribed to ${subscriptions.length} notification subscriptions`,
    );
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
  // Heartbeat Management (Task 5.2)
  // ============================================================================

  /**
   * Starts heartbeat to keep connection alive and monitor health
   * Requirements: 4.4, 4.5
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === "connected") {
        this.lastHeartbeatTime = Date.now();
        const message: WebSocketMessage = {
          event: "ping",
          data: { timestamp: this.lastHeartbeatTime },
          timestamp: new Date().toISOString(),
          correlationId: this.generateCorrelationId(),
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
  // Fallback Communication (Task 5.4)
  // ============================================================================

  /**
   * Activates fallback polling mode when WebSocket is unavailable
   * Requirements: 4.2, 6.5
   */
  private activateFallbackMode(): void {
    if (this.connectionState === "fallback") {
      return; // Already in fallback mode
    }

    this.connectionState = "fallback";
    this.log("Activating notification fallback polling mode");

    // Activate graceful degradation
    gracefulDegradationManager.activateDegradation(
      "partial",
      "WebSocket unavailable, using polling fallback",
      ["notification_websocket"],
    );

    // Start polling for notifications
    this.startFallbackPolling();
  }

  /**
   * Starts fallback polling for notifications
   */
  private startFallbackPolling(): void {
    this.stopFallback();

    this.fallbackTimer = setInterval(async () => {
      try {
        // This would typically poll the REST API for new notifications
        // For now, we'll just emit a connection status update
        this.emit("connection.status", { connected: false });

        // Attempt to upgrade back to WebSocket periodically
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.log("Attempting to upgrade from fallback to WebSocket");
          try {
            await this.connect();
          } catch {
            // Continue with fallback mode
            this.log("WebSocket upgrade failed, continuing with fallback");
          }
        }
      } catch (error) {
        this.log(`Fallback polling error: ${error}`);
      }
    }, this.config.fallbackPollInterval);
  }

  /**
   * Stops fallback polling
   */
  private stopFallback(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  /**
   * Registers event handler
   */
  on<T extends NotificationWebSocketEventType>(
    event: T,
    handler: NotificationWebSocketEventHandlers[T],
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Removes event handler
   */
  off<T extends NotificationWebSocketEventType>(event: T): void {
    delete this.eventHandlers[event];
  }

  /**
   * Emits event to registered handlers
   */
  private emit<T extends NotificationWebSocketEventType>(
    event: T,
    ...args: Parameters<NonNullable<NotificationWebSocketEventHandlers[T]>>
  ): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      try {
        // @ts-expect-error - TypeScript can't infer the correct handler type
        handler(...args);
      } catch (error) {
        this.log(`Error in notification event handler for ${event}: ${error}`);
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Gets current connection state
   */
  getConnectionState(): NotificationWebSocketState {
    return this.connectionState;
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats(): NotificationConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Gets active subscriptions
   */
  getActiveSubscriptions(): NotificationSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  /**
   * Checks if in fallback mode
   */
  isFallbackMode(): boolean {
    return this.connectionState === "fallback";
  }

  /**
   * Gets WebSocket URL from configuration
   */
  private getWebSocketUrl(): string {
    // This would typically come from configuration
    const baseUrl =
      notificationServiceConfig.baseUrl || "http://localhost:3000";
    return baseUrl.replace(/^http/, "ws") + "/ws/notifications";
  }

  /**
   * Handles connection errors
   */
  private handleConnectionError(error: Error): void {
    this.connectionState = "error";
    this.connectionStats.totalErrors++;

    const wsError: NotificationError = {
      type: "websocket",
      message: error.message,
      recoverable: true,
      timestamp: new Date(),
    };

    this.log(`Notification connection error: ${error.message}`);
    this.emit("error", wsError);
  }

  /**
   * Updates latency statistics
   */
  private updateLatencyStats(latency: number): void {
    const currentAvg = this.connectionStats.averageLatency;
    const totalMessages = this.connectionStats.messagesReceived;

    if (totalMessages === 0) {
      this.connectionStats.averageLatency = latency;
    } else {
      this.connectionStats.averageLatency =
        (currentAvg * (totalMessages - 1) + latency) / totalMessages;
    }
  }

  /**
   * Updates connection duration statistics
   */
  private updateConnectionDuration(): void {
    if (this.connectionStartTime > 0) {
      const duration = Date.now() - this.connectionStartTime;
      this.connectionStats.connectionDuration += duration;
      this.connectionStartTime = 0;
    }
  }

  /**
   * Initializes connection statistics
   */
  private initializeStats(): NotificationConnectionStats {
    return {
      totalConnections: 0,
      totalReconnections: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageLatency: 0,
      connectionDuration: 0,
      messagesReceived: 0,
      messagesSent: 0,
    };
  }

  /**
   * Generates correlation ID for message tracking
   */
  private generateCorrelationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs messages if logging is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.enableLogging) {
      console.log(`[NotificationWebSocket] ${message}`, data || "");
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new NotificationWebSocketClient instance
 */
export function createNotificationWebSocketClient(
  config?: Partial<NotificationWebSocketConfig>,
): NotificationWebSocketClient {
  return new NotificationWebSocketClient(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalNotificationWebSocketClient: NotificationWebSocketClient | null =
  null;

/**
 * Gets or creates the global notification WebSocket client instance
 */
export function getNotificationWebSocketClient(
  config?: Partial<NotificationWebSocketConfig>,
): NotificationWebSocketClient {
  if (!globalNotificationWebSocketClient) {
    globalNotificationWebSocketClient =
      createNotificationWebSocketClient(config);
  }
  return globalNotificationWebSocketClient;
}

/**
 * Destroys the global notification WebSocket client instance
 */
export function destroyNotificationWebSocketClient(): void {
  if (globalNotificationWebSocketClient) {
    globalNotificationWebSocketClient.destroy();
    globalNotificationWebSocketClient = null;
  }
}
