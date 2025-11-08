/**
 * Analytics WebSocket Manager Implementation
 *
 * Implements Task 4.1: Create WebSocket connection manager
 * - Real-time communication with analytics-dashboard service
 * - Connection lifecycle management: disconnected, connecting, connected, reconnecting
 * - Secure WebSocket connection with authentication
 * - Message routing and subscription management
 *
 * Requirements: 3.1, 3.2, 7.4
 */

import { integratedTokenManager } from "@/lib/auth/token-manager";
import {
  analyticsServiceConfig,
  createCorrelationId,
} from "@/lib/config/analytics-service";
import type {
  WebSocketMessage,
  MetricsUpdate,
  AlertMessage,
  SubscriptionMessage,
  WebSocketConfig,
  ConnectionStatus,
} from "@/types/analytics-service";

// ============================================================================
// WebSocket Event Types and Interfaces
// ============================================================================

export interface AnalyticsWebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onMetricsUpdate?: (data: MetricsUpdate) => void;
  onAlert?: (data: AlertMessage) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

export interface SubscriptionHandler {
  (message: WebSocketMessage): void;
}

export interface QueuedMessage {
  message: WebSocketMessage | SubscriptionMessage;
  timestamp: number;
  retryCount: number;
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
  currentConnectionDuration: number;
}

// ============================================================================
// Analytics WebSocket Manager Class
// ============================================================================

export class AnalyticsWebSocketManager {
  private connection: WebSocket | null = null;
  private connectionState: ConnectionStatus = "disconnected";
  private subscriptions: Map<string, Set<SubscriptionHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private eventHandlers: AnalyticsWebSocketEventHandlers = {};
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    averageLatency: 0,
    uptime: 0,
    currentConnectionDuration: 0,
  };
  private connectionStartTime: number = 0;
  private lastPingTime: number = 0;
  private config: WebSocketConfig;

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: analyticsServiceConfig.wsUrl,
      protocols: ["analytics-v1"],
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      enableLogging: analyticsServiceConfig.enableRequestLogging,
      enableMetrics: analyticsServiceConfig.enableMetrics,
      maxMessageQueue: 100,
      messageTimeout: 30000,
      ...config,
    };

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establishes WebSocket connection with authentication
   */
  async connect(): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    this.setConnectionState("connecting");
    this.metrics.totalConnections++;
    this.connectionStartTime = Date.now();

    try {
      // Get authentication token
      const accessToken = await integratedTokenManager.getValidAccessToken();

      // Build WebSocket URL with authentication
      const wsUrl = new URL(this.config.url);
      if (accessToken) {
        wsUrl.searchParams.set("token", accessToken);
      }
      wsUrl.searchParams.set("correlationId", createCorrelationId());

      // Create WebSocket connection
      this.connection = new WebSocket(wsUrl.toString(), this.config.protocols);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection to be established
      await this.waitForConnection();

      this.log("WebSocket connection established successfully");
    } catch (error) {
      this.metrics.failedConnections++;
      this.setConnectionState("disconnected");
      this.log("Failed to establish WebSocket connection:", error);
      throw error;
    }
  }

  /**
   * Gracefully disconnects WebSocket connection
   */
  disconnect(): void {
    if (this.connection) {
      this.log("Disconnecting WebSocket connection");

      // Clear intervals and timeouts
      this.clearHeartbeat();
      this.clearReconnectTimeout();

      // Close connection
      this.connection.close(1000, "Client disconnect");
      this.connection = null;
    }

    this.setConnectionState("disconnected");
    this.updateConnectionMetrics();
  }

  /**
   * Reconnects with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.log("Maximum reconnection attempts reached");
      this.setConnectionState("disconnected");
      return;
    }

    this.setConnectionState("reconnecting");
    this.reconnectAttempts++;
    this.metrics.reconnectionAttempts++;

    const delay = this.calculateReconnectDelay();
    this.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0; // Reset on successful connection
      } catch (error) {
        this.log("Reconnection failed:", error);
        this.reconnect(); // Try again
      }
    }, delay);
  }

  /**
   * Calculates reconnection delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay!;
    const exponentialDelay =
      baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 60000; // 1 minute maximum
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Waits for WebSocket connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        reject(new Error("No WebSocket connection"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, this.config.connectionTimeout);

      const onOpen = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = (error: Event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error}`));
      };

      this.connection.addEventListener("open", onOpen, { once: true });
      this.connection.addEventListener("error", onError, { once: true });
    });
  }

  // ============================================================================
  // Event Handler Setup
  // ============================================================================

  /**
   * Sets up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.addEventListener("open", this.handleOpen);
    this.connection.addEventListener("close", this.handleClose);
    this.connection.addEventListener("error", this.handleError);
    this.connection.addEventListener("message", this.handleMessage);
  }

  /**
   * Handles WebSocket open event
   */
  private handleOpen(): void {
    this.log("WebSocket connection opened");
    this.setConnectionState("connected");
    this.metrics.successfulConnections++;
    this.metrics.lastConnectedAt = new Date();

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processQueuedMessages();

    // Notify handlers
    this.eventHandlers.onConnect?.();
  }

  /**
   * Handles WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
    this.metrics.lastDisconnectedAt = new Date();
    this.updateConnectionMetrics();

    // Clear heartbeat
    this.clearHeartbeat();

    // Notify handlers
    this.eventHandlers.onDisconnect?.(event.code, event.reason);

    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.connectionState !== "disconnected") {
      this.reconnect();
    } else {
      this.setConnectionState("disconnected");
    }
  }

  /**
   * Handles WebSocket error event
   */
  private handleError(event: Event): void {
    const error = new Error(`WebSocket error: ${event}`);
    this.log("WebSocket error:", error);

    this.eventHandlers.onError?.(error);
  }

  /**
   * Handles incoming WebSocket messages
   */
  protected handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.metrics.messagesReceived++;

      // Update latency metrics if this is a pong response
      if (message.type === "pong" && this.lastPingTime) {
        const latency = Date.now() - this.lastPingTime;
        this.updateLatencyMetrics(latency);
      }

      this.log("Received WebSocket message:", message.type);

      // Route message to appropriate handlers
      this.routeMessage(message);

      // Notify general message handler
      this.eventHandlers.onMessage?.(message);
    } catch (error) {
      this.log("Failed to parse WebSocket message:", error);
    }
  }

  // ============================================================================
  // Message Routing and Subscription Management
  // ============================================================================

  /**
   * Routes incoming messages to appropriate handlers
   */
  protected routeMessage(message: WebSocketMessage): void {
    const messageType = this.determineMessageType(message);

    // Route to specific event handlers
    switch (messageType) {
      case "metrics":
        this.eventHandlers.onMetricsUpdate?.(message.data as MetricsUpdate);
        break;
      case "alert":
        this.eventHandlers.onAlert?.(message.data as AlertMessage);
        break;
    }

    // Route to subscription handlers
    const handlers = this.subscriptions.get(messageType) || new Set();
    handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        this.log("Error in subscription handler:", error);
      }
    });
  }

  /**
   * Determines message type from WebSocket message
   */
  protected determineMessageType(message: WebSocketMessage): string {
    // Check explicit type field
    if (message.type) {
      return message.type;
    }

    // Infer type from data structure
    const data = message.data as Record<string, unknown>;
    if (data?.engagement || data?.progress || data?.content || data?.system) {
      return "metrics";
    }

    if (data?.alerts || data?.severity) {
      return "alert";
    }

    return "unknown";
  }

  /**
   * Subscribes to specific message types
   */
  subscribe(messageType: string, handler: SubscriptionHandler): () => void {
    if (!this.subscriptions.has(messageType)) {
      this.subscriptions.set(messageType, new Set());
    }

    this.subscriptions.get(messageType)!.add(handler);

    // Send subscription message to server
    this.sendSubscriptionMessage("subscribe", messageType);

    this.log(`Subscribed to ${messageType}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(messageType, handler);
    };
  }

  /**
   * Unsubscribes from specific message types
   */
  private unsubscribe(messageType: string, handler: SubscriptionHandler): void {
    const handlers = this.subscriptions.get(messageType);
    if (handlers) {
      handlers.delete(handler);

      // If no more handlers, unsubscribe from server
      if (handlers.size === 0) {
        this.subscriptions.delete(messageType);
        this.sendSubscriptionMessage("unsubscribe", messageType);
      }
    }

    this.log(`Unsubscribed from ${messageType}`);
  }

  /**
   * Sends subscription/unsubscription message to server
   */
  protected sendSubscriptionMessage(
    action: "subscribe" | "unsubscribe",
    messageType: string,
  ): void {
    const subscriptionMessage: SubscriptionMessage = {
      type: action,
      messageType,
      timestamp: new Date().toISOString(),
      correlationId: createCorrelationId(),
    };

    this.send(subscriptionMessage);
  }

  // ============================================================================
  // Message Sending and Queue Management
  // ============================================================================

  /**
   * Sends a message through WebSocket connection
   */
  send(message: WebSocketMessage | SubscriptionMessage): void {
    if (this.connectionState === "connected" && this.connection) {
      try {
        const messageString = JSON.stringify(message);
        this.connection.send(messageString);
        this.metrics.messagesSent++;
        this.log("Sent WebSocket message:", message.type || "unknown");
      } catch (error) {
        this.log("Failed to send WebSocket message:", error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Queues message for later delivery
   */
  private queueMessage(message: WebSocketMessage | SubscriptionMessage): void {
    // Remove old messages if queue is full
    if (this.messageQueue.length >= this.config.maxMessageQueue!) {
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      message,
      timestamp: Date.now(),
      retryCount: 0,
    });

    this.log("Queued message for later delivery");
  }

  /**
   * Processes queued messages when connection is restored
   */
  private processQueuedMessages(): void {
    const now = Date.now();
    const validMessages = this.messageQueue.filter(
      (queuedMsg) => now - queuedMsg.timestamp < this.config.messageTimeout!,
    );

    this.messageQueue = [];

    validMessages.forEach((queuedMsg) => {
      this.send(queuedMsg.message);
    });

    if (validMessages.length > 0) {
      this.log(`Processed ${validMessages.length} queued messages`);
    }
  }

  // ============================================================================
  // Heartbeat and Connection Health
  // ============================================================================

  /**
   * Starts heartbeat mechanism
   */
  protected startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval!);
  }

  /**
   * Clears heartbeat interval
   */
  protected clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Sends heartbeat ping message
   */
  private sendHeartbeat(): void {
    if (this.connectionState === "connected") {
      this.lastPingTime = Date.now();

      const pingMessage: WebSocketMessage = {
        type: "ping",
        timestamp: new Date().toISOString(),
        correlationId: createCorrelationId(),
        data: { timestamp: this.lastPingTime.toString() },
      };

      this.send(pingMessage);
    }
  }

  // ============================================================================
  // State Management and Utilities
  // ============================================================================

  /**
   * Sets connection state and notifies handlers
   */
  protected setConnectionState(state: ConnectionStatus): void {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;

      this.log(`Connection state changed: ${previousState} -> ${state}`);
      this.eventHandlers.onConnectionStatusChange?.(state);
    }
  }

  /**
   * Clears reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Updates connection metrics
   */
  private updateConnectionMetrics(): void {
    if (this.connectionStartTime) {
      this.metrics.currentConnectionDuration =
        Date.now() - this.connectionStartTime;
      this.metrics.uptime += this.metrics.currentConnectionDuration;
    }
  }

  /**
   * Updates latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    // Simple moving average for latency
    if (this.metrics.averageLatency === 0) {
      this.metrics.averageLatency = latency;
    } else {
      this.metrics.averageLatency =
        this.metrics.averageLatency * 0.9 + latency * 0.1;
    }
  }

  /**
   * Logs messages if logging is enabled
   */
  protected log(message: string, ...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log(`[AnalyticsWebSocket] ${message}`, ...args);
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Gets current connection state
   */
  getConnectionState(): ConnectionStatus {
    return this.connectionState;
  }

  /**
   * Checks if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  /**
   * Gets connection metrics
   */
  getMetrics(): ConnectionMetrics {
    this.updateConnectionMetrics();
    return { ...this.metrics };
  }

  /**
   * Gets current configuration
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  /**
   * Sets event handlers
   */
  setEventHandlers(handlers: AnalyticsWebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Gets list of active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Gets queue status
   */
  getQueueStatus(): { length: number; maxSize: number } {
    return {
      length: this.messageQueue.length,
      maxSize: this.config.maxMessageQueue!,
    };
  }

  /**
   * Forces reconnection
   */
  forceReconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.messageQueue = [];
    this.eventHandlers = {};
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsWebSocketManager = new AnalyticsWebSocketManager();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new analytics WebSocket manager instance
 */
export function createAnalyticsWebSocketManager(
  config?: Partial<WebSocketConfig>,
): AnalyticsWebSocketManager {
  return new AnalyticsWebSocketManager(config);
}

// ============================================================================
// Advanced Subscription Management (Task 4.2)
// ============================================================================

/**
 * Advanced subscription manager for handling complex subscription patterns
 */
export class SubscriptionManager {
  private subscriptions: Map<string, Set<SubscriptionHandler>> = new Map();
  private subscriptionFilters: Map<
    string,
    (message: WebSocketMessage) => boolean
  > = new Map();
  private subscriptionMetrics: Map<
    string,
    { count: number; lastMessage: Date }
  > = new Map();

  /**
   * Subscribes to messages with optional filtering
   */
  subscribe(
    messageType: string,
    handler: SubscriptionHandler,
    filter?: (message: WebSocketMessage) => boolean,
  ): () => void {
    // Add handler to subscription set
    if (!this.subscriptions.has(messageType)) {
      this.subscriptions.set(messageType, new Set());
      this.subscriptionMetrics.set(messageType, {
        count: 0,
        lastMessage: new Date(),
      });
    }

    this.subscriptions.get(messageType)!.add(handler);

    // Store filter if provided
    if (filter) {
      this.subscriptionFilters.set(
        `${messageType}_${handler.toString()}`,
        filter,
      );
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(messageType, handler);
    };
  }

  /**
   * Unsubscribes from message type
   */
  unsubscribe(messageType: string, handler: SubscriptionHandler): void {
    const handlers = this.subscriptions.get(messageType);
    if (handlers) {
      handlers.delete(handler);

      // Clean up filter
      this.subscriptionFilters.delete(`${messageType}_${handler.toString()}`);

      // Remove subscription if no handlers left
      if (handlers.size === 0) {
        this.subscriptions.delete(messageType);
        this.subscriptionMetrics.delete(messageType);
      }
    }
  }

  /**
   * Routes message to appropriate handlers with filtering
   */
  routeMessage(messageType: string, message: WebSocketMessage): void {
    const handlers = this.subscriptions.get(messageType);
    if (!handlers) return;

    // Update metrics
    const metrics = this.subscriptionMetrics.get(messageType);
    if (metrics) {
      metrics.count++;
      metrics.lastMessage = new Date();
    }

    // Route to each handler
    handlers.forEach((handler) => {
      try {
        // Check filter if exists
        const filterKey = `${messageType}_${handler.toString()}`;
        const filter = this.subscriptionFilters.get(filterKey);

        if (!filter || filter(message)) {
          handler(message);
        }
      } catch (error) {
        console.error(
          `Error in subscription handler for ${messageType}:`,
          error,
        );
      }
    });
  }

  /**
   * Gets subscription statistics
   */
  getSubscriptionStats(): Record<
    string,
    { handlerCount: number; messageCount: number; lastMessage: Date }
  > {
    const stats: Record<
      string,
      { handlerCount: number; messageCount: number; lastMessage: Date }
    > = {};

    this.subscriptions.forEach((handlers, messageType) => {
      const metrics = this.subscriptionMetrics.get(messageType);
      stats[messageType] = {
        handlerCount: handlers.size,
        messageCount: metrics?.count || 0,
        lastMessage: metrics?.lastMessage || new Date(0),
      };
    });

    return stats;
  }

  /**
   * Clears all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.subscriptionFilters.clear();
    this.subscriptionMetrics.clear();
  }
}

// ============================================================================
// Message Validation and Processing (Task 4.2)
// ============================================================================

/**
 * Message validator for ensuring message integrity
 */
export class MessageValidator {
  private schemas: Map<string, (data: unknown) => boolean> = new Map();

  /**
   * Registers validation schema for message type
   */
  registerSchema(
    messageType: string,
    validator: (data: unknown) => boolean,
  ): void {
    this.schemas.set(messageType, validator);
  }

  /**
   * Validates message against registered schema
   */
  validateMessage(message: WebSocketMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic structure validation
    if (!message.type) {
      errors.push("Message type is required");
    }

    if (!message.timestamp) {
      errors.push("Message timestamp is required");
    }

    if (!message.correlationId) {
      errors.push("Message correlation ID is required");
    }

    // Schema-specific validation
    const validator = this.schemas.get(message.type);
    if (validator && !validator(message.data)) {
      errors.push(
        `Message data does not match schema for type: ${message.type}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sets up default validation schemas
   */
  setupDefaultSchemas(): void {
    // Metrics update validation
    this.registerSchema("metrics", (data: unknown): boolean => {
      const record = data as Record<string, unknown>;
      return !!(
        record &&
        (record.engagement ||
          record.progress ||
          record.content ||
          record.system)
      );
    });

    // Alert message validation
    this.registerSchema("alert", (data: unknown): boolean => {
      const record = data as Record<string, unknown>;
      return !!(
        record &&
        typeof record.severity === "string" &&
        typeof record.message === "string"
      );
    });

    // Heartbeat validation
    this.registerSchema("ping", (data: unknown): boolean => {
      const record = data as Record<string, unknown>;
      return !!(record && typeof record.timestamp === "number");
    });

    this.registerSchema("pong", (data: unknown): boolean => {
      const record = data as Record<string, unknown>;
      return !!(record && typeof record.timestamp === "number");
    });
  }
}

// ============================================================================
// Enhanced WebSocket Manager with Advanced Features
// ============================================================================

/**
 * Enhanced analytics WebSocket manager with advanced subscription and message handling
 */
export class EnhancedAnalyticsWebSocketManager extends AnalyticsWebSocketManager {
  private subscriptionManager: SubscriptionManager;
  private messageValidator: MessageValidator;
  private messageBuffer: WebSocketMessage[] = [];
  private bufferSize: number = 100;

  constructor(config?: Partial<WebSocketConfig>) {
    super(config);
    this.subscriptionManager = new SubscriptionManager();
    this.messageValidator = new MessageValidator();
    this.messageValidator.setupDefaultSchemas();
  }

  /**
   * Enhanced subscription with filtering support
   */
  subscribeWithFilter(
    messageType: string,
    handler: SubscriptionHandler,
    filter?: (message: WebSocketMessage) => boolean,
  ): () => void {
    // Subscribe through subscription manager
    const unsubscribe = this.subscriptionManager.subscribe(
      messageType,
      handler,
      filter,
    );

    // Also send subscription message to server
    this.sendSubscriptionMessage("subscribe", messageType);

    return unsubscribe;
  }

  /**
   * Subscribes to multiple message types at once
   */
  subscribeToMultiple(
    subscriptions: Array<{
      messageType: string;
      handler: SubscriptionHandler;
      filter?: (message: WebSocketMessage) => boolean;
    }>,
  ): () => void {
    const unsubscribeFunctions = subscriptions.map((sub) =>
      this.subscribeWithFilter(sub.messageType, sub.handler, sub.filter),
    );

    return () => {
      unsubscribeFunctions.forEach((unsub) => unsub());
    };
  }

  /**
   * Enhanced message routing with validation
   */
  protected override routeMessage(message: WebSocketMessage): void {
    // Validate message
    const validation = this.messageValidator.validateMessage(message);
    if (!validation.valid) {
      this.log("Invalid message received:", validation.errors);
      return;
    }

    // Buffer message for replay capability
    this.bufferMessage(message);

    // Determine message type and route
    const messageType = this.determineMessageType(message);

    // Route through subscription manager
    this.subscriptionManager.routeMessage(messageType, message);

    // Call parent routing for backward compatibility
    super.routeMessage(message);
  }

  /**
   * Buffers messages for replay capability
   */
  private bufferMessage(message: WebSocketMessage): void {
    this.messageBuffer.push(message);

    // Keep buffer size manageable
    if (this.messageBuffer.length > this.bufferSize) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Replays buffered messages to a handler
   */
  replayMessages(
    messageType: string,
    handler: SubscriptionHandler,
    count?: number,
  ): void {
    const messagesToReplay = this.messageBuffer
      .filter((msg) => this.determineMessageType(msg) === messageType)
      .slice(count ? -count : undefined);

    messagesToReplay.forEach((message) => {
      try {
        handler(message);
      } catch (error) {
        this.log("Error replaying message:", error);
      }
    });
  }

  /**
   * Gets subscription statistics
   */
  getSubscriptionStats(): Record<
    string,
    { handlerCount: number; messageCount: number; lastMessage: Date }
  > {
    return this.subscriptionManager.getSubscriptionStats();
  }

  /**
   * Gets buffered messages for a specific type
   */
  getBufferedMessages(messageType?: string): WebSocketMessage[] {
    if (messageType) {
      return this.messageBuffer.filter(
        (msg) => this.determineMessageType(msg) === messageType,
      );
    }
    return [...this.messageBuffer];
  }

  /**
   * Clears message buffer
   */
  clearMessageBuffer(): void {
    this.messageBuffer = [];
  }

  /**
   * Enhanced cleanup
   */
  override destroy(): void {
    this.subscriptionManager.clear();
    this.messageBuffer = [];
    super.destroy();
  }
}

// ============================================================================
// Updated Singleton and Factory
// ============================================================================

export const enhancedAnalyticsWebSocketManager =
  new EnhancedAnalyticsWebSocketManager();

export function createEnhancedAnalyticsWebSocketManager(
  config?: Partial<WebSocketConfig>,
): EnhancedAnalyticsWebSocketManager {
  return new EnhancedAnalyticsWebSocketManager(config);
}

// ============================================================================
// Advanced Reconnection and Heartbeat Mechanisms (Task 4.3)
// ============================================================================

/**
 * Advanced reconnection manager with sophisticated backoff strategies
 */
export class ReconnectionManager {
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoffFactor: number;
  private jitterEnabled: boolean;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectionHistory: Array<{
    attempt: number;
    timestamp: Date;
    success: boolean;
  }> = [];

  constructor(config: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay?: number;
    backoffFactor?: number;
    jitterEnabled?: boolean;
  }) {
    this.maxReconnectAttempts = config.maxAttempts;
    this.baseDelay = config.baseDelay;
    this.maxDelay = config.maxDelay || 60000;
    this.backoffFactor = config.backoffFactor || 2;
    this.jitterEnabled = config.jitterEnabled !== false;
  }

  /**
   * Calculates next reconnection delay with exponential backoff and jitter
   */
  calculateDelay(): number {
    const exponentialDelay =
      this.baseDelay * Math.pow(this.backoffFactor, this.reconnectAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);

    if (this.jitterEnabled) {
      // Add jitter to prevent thundering herd (±25% of delay)
      const jitterRange = cappedDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, cappedDelay + jitter);
    }

    return cappedDelay;
  }

  /**
   * Schedules reconnection attempt
   */
  scheduleReconnection(reconnectFn: () => Promise<void>): boolean {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;
    const delay = this.calculateDelay();

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await reconnectFn();
        this.recordReconnectionAttempt(true);
        this.reset(); // Reset on successful connection
      } catch {
        this.recordReconnectionAttempt(false);
        // Will be handled by the calling code to schedule next attempt
      }
    }, delay);

    return true;
  }

  /**
   * Records reconnection attempt in history
   */
  private recordReconnectionAttempt(success: boolean): void {
    this.reconnectionHistory.push({
      attempt: this.reconnectAttempts,
      timestamp: new Date(),
      success,
    });

    // Keep history manageable
    if (this.reconnectionHistory.length > 50) {
      this.reconnectionHistory.shift();
    }
  }

  /**
   * Cancels scheduled reconnection
   */
  cancel(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Resets reconnection state
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.cancel();
  }

  /**
   * Gets reconnection statistics
   */
  getStats(): {
    currentAttempts: number;
    maxAttempts: number;
    nextDelay: number;
    history: Array<{ attempt: number; timestamp: Date; success: boolean }>;
  } {
    return {
      currentAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextDelay: this.calculateDelay(),
      history: [...this.reconnectionHistory],
    };
  }

  /**
   * Checks if more reconnection attempts are available
   */
  canReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }
}

/**
 * Advanced heartbeat manager with health monitoring
 */
export class HeartbeatManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private interval: number;
  private timeout: number;
  private lastPingTime: number = 0;
  private lastPongTime: number = 0;
  private missedHeartbeats: number = 0;
  private maxMissedHeartbeats: number;
  private latencyHistory: number[] = [];
  private isHealthy: boolean = true;
  private onHealthChange?: (healthy: boolean) => void;
  private onLatencyUpdate?: (latency: number) => void;

  constructor(config: {
    interval: number;
    timeout: number;
    maxMissedHeartbeats?: number;
    onHealthChange?: (healthy: boolean) => void;
    onLatencyUpdate?: (latency: number) => void;
  }) {
    this.interval = config.interval;
    this.timeout = config.timeout;
    this.maxMissedHeartbeats = config.maxMissedHeartbeats || 3;
    if (config.onHealthChange) {
      this.onHealthChange = config.onHealthChange;
    }
    if (config.onLatencyUpdate) {
      this.onLatencyUpdate = config.onLatencyUpdate;
    }
  }

  /**
   * Starts heartbeat mechanism
   */
  start(sendPing: () => void): void {
    this.stop();

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(sendPing);
    }, this.interval);
  }

  /**
   * Stops heartbeat mechanism
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Sends heartbeat ping
   */
  private sendHeartbeat(sendPing: () => void): void {
    this.lastPingTime = Date.now();
    sendPing();

    // Set timeout for pong response
    this.heartbeatTimeout = setTimeout(() => {
      this.handleMissedHeartbeat();
    }, this.timeout);
  }

  /**
   * Handles received pong response
   */
  handlePong(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    this.lastPongTime = Date.now();
    const latency = this.lastPongTime - this.lastPingTime;

    // Update latency history
    this.updateLatencyHistory(latency);

    // Reset missed heartbeats
    this.missedHeartbeats = 0;

    // Update health status
    if (!this.isHealthy) {
      this.isHealthy = true;
      this.onHealthChange?.(true);
    }

    this.onLatencyUpdate?.(latency);
  }

  /**
   * Handles missed heartbeat
   */
  private handleMissedHeartbeat(): void {
    this.missedHeartbeats++;

    if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
      this.isHealthy = false;
      this.onHealthChange?.(false);
    }
  }

  /**
   * Updates latency history
   */
  private updateLatencyHistory(latency: number): void {
    this.latencyHistory.push(latency);

    // Keep history manageable
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
  }

  /**
   * Gets heartbeat statistics
   */
  getStats(): {
    isHealthy: boolean;
    missedHeartbeats: number;
    maxMissedHeartbeats: number;
    lastPingTime: number;
    lastPongTime: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    latencyHistory: number[];
  } {
    const latencies = this.latencyHistory;

    return {
      isHealthy: this.isHealthy,
      missedHeartbeats: this.missedHeartbeats,
      maxMissedHeartbeats: this.maxMissedHeartbeats,
      lastPingTime: this.lastPingTime,
      lastPongTime: this.lastPongTime,
      averageLatency:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      latencyHistory: [...latencies],
    };
  }

  /**
   * Resets heartbeat state
   */
  reset(): void {
    this.missedHeartbeats = 0;
    this.isHealthy = true;
    this.lastPingTime = 0;
    this.lastPongTime = 0;
    this.latencyHistory = [];
  }
}

/**
 * Connection health monitor
 */
export class ConnectionHealthMonitor {
  private healthChecks: Map<string, () => boolean> = new Map();
  private healthHistory: Array<{
    timestamp: Date;
    healthy: boolean;
    details: Record<string, boolean>;
  }> = [];
  private monitorInterval: NodeJS.Timeout | null = null;
  private onHealthChange?: (
    healthy: boolean,
    details: Record<string, boolean>,
  ) => void;

  constructor(config?: {
    checkInterval?: number;
    onHealthChange?: (
      healthy: boolean,
      details: Record<string, boolean>,
    ) => void;
  }) {
    if (config?.onHealthChange) {
      this.onHealthChange = config.onHealthChange;
    }

    if (config?.checkInterval) {
      this.startMonitoring(config.checkInterval);
    }
  }

  /**
   * Registers a health check
   */
  registerHealthCheck(name: string, check: () => boolean): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Performs health check
   */
  performHealthCheck(): { healthy: boolean; details: Record<string, boolean> } {
    const details: Record<string, boolean> = {};
    let overallHealthy = true;

    this.healthChecks.forEach((check, name) => {
      try {
        const result = check();
        details[name] = result;
        if (!result) {
          overallHealthy = false;
        }
      } catch {
        details[name] = false;
        overallHealthy = false;
      }
    });

    // Record in history
    this.healthHistory.push({
      timestamp: new Date(),
      healthy: overallHealthy,
      details: { ...details },
    });

    // Keep history manageable
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    return { healthy: overallHealthy, details };
  }

  /**
   * Starts continuous health monitoring
   */
  startMonitoring(interval: number): void {
    this.stopMonitoring();

    this.monitorInterval = setInterval(() => {
      const result = this.performHealthCheck();
      this.onHealthChange?.(result.healthy, result.details);
    }, interval);
  }

  /**
   * Stops health monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Gets health history
   */
  getHealthHistory(): Array<{
    timestamp: Date;
    healthy: boolean;
    details: Record<string, boolean>;
  }> {
    return [...this.healthHistory];
  }

  /**
   * Gets current health status
   */
  getCurrentHealth(): { healthy: boolean; details: Record<string, boolean> } {
    return this.performHealthCheck();
  }
}

// ============================================================================
// Enhanced WebSocket Manager with Advanced Reconnection and Heartbeat
// ============================================================================

/**
 * WebSocket manager with advanced reconnection and heartbeat capabilities
 */
export class AdvancedAnalyticsWebSocketManager extends EnhancedAnalyticsWebSocketManager {
  private reconnectionManager: ReconnectionManager;
  private heartbeatManager: HeartbeatManager;
  private healthMonitor: ConnectionHealthMonitor;
  private connectionQuality: "excellent" | "good" | "poor" | "critical" =
    "excellent";

  constructor(config?: Partial<WebSocketConfig>) {
    super(config);

    // Initialize advanced managers
    this.reconnectionManager = new ReconnectionManager({
      maxAttempts: this.getConfig().maxReconnectAttempts || 10,
      baseDelay: this.getConfig().reconnectDelay || 1000,
      maxDelay: 60000,
      backoffFactor: 2,
      jitterEnabled: true,
    });

    this.heartbeatManager = new HeartbeatManager({
      interval: this.getConfig().heartbeatInterval || 30000,
      timeout: 10000,
      maxMissedHeartbeats: 3,
      onHealthChange: (healthy) => {
        this.handleHeartbeatHealthChange(healthy);
      },
      onLatencyUpdate: (latency) => {
        this.updateConnectionQuality(latency);
      },
    });

    this.healthMonitor = new ConnectionHealthMonitor({
      checkInterval: 60000,
      onHealthChange: (healthy, details) => {
        this.log(`Health check: ${healthy ? "HEALTHY" : "UNHEALTHY"}`, details);
      },
    });

    // Register health checks
    this.setupHealthChecks();
  }

  /**
   * Enhanced connection with advanced reconnection
   */
  override async connect(): Promise<void> {
    try {
      await super.connect();
      this.reconnectionManager.reset();
    } catch (error) {
      // Schedule reconnection if connection fails
      if (this.reconnectionManager.canReconnect()) {
        this.scheduleReconnection();
      }
      throw error;
    }
  }

  /**
   * Enhanced reconnection with advanced backoff
   */
  private scheduleReconnection(): void {
    const reconnected = this.reconnectionManager.scheduleReconnection(
      async () => {
        await super.connect();
      },
    );

    if (!reconnected) {
      this.log("Maximum reconnection attempts reached");
      this.setConnectionState("disconnected");
    }
  }

  /**
   * Enhanced heartbeat handling
   */
  protected override startHeartbeat(): void {
    this.heartbeatManager.start(() => {
      this.sendAdvancedHeartbeat();
    });
  }

  /**
   * Enhanced heartbeat clearing
   */
  protected override clearHeartbeat(): void {
    this.heartbeatManager.stop();
  }

  /**
   * Sends advanced heartbeat with additional metadata
   */
  private sendAdvancedHeartbeat(): void {
    if (this.getConnectionState() === "connected") {
      const pingMessage: WebSocketMessage = {
        type: "ping",
        timestamp: new Date().toISOString(),
        correlationId: createCorrelationId(),
        data: {
          timestamp: Date.now(),
          connectionQuality: this.connectionQuality,
          subscriptions: this.getActiveSubscriptions(),
          queueStatus: this.getQueueStatus(),
        },
      };

      this.send(pingMessage);
    }
  }

  /**
   * Enhanced message handling with heartbeat processing
   */
  protected override handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle pong responses
      if (message.type === "pong") {
        this.heartbeatManager.handlePong();
      }

      // Call parent handler
      super.handleMessage(event);
    } catch (error) {
      this.log("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handles heartbeat health changes
   */
  private handleHeartbeatHealthChange(healthy: boolean): void {
    if (!healthy) {
      this.log("Heartbeat health degraded - connection may be unstable");
      // Could trigger reconnection or other recovery actions
    } else {
      this.log("Heartbeat health restored");
    }
  }

  /**
   * Updates connection quality based on latency
   */
  private updateConnectionQuality(latency: number): void {
    let quality: typeof this.connectionQuality;

    if (latency < 100) {
      quality = "excellent";
    } else if (latency < 300) {
      quality = "good";
    } else if (latency < 1000) {
      quality = "poor";
    } else {
      quality = "critical";
    }

    if (quality !== this.connectionQuality) {
      this.connectionQuality = quality;
      this.log(`Connection quality changed to: ${quality} (${latency}ms)`);
    }
  }

  /**
   * Gets connection quality metrics as numeric values
   */
  private getConnectionQualityMetrics(): {
    latency: number;
    stability: number;
    reliability: number;
    overallScore: number;
  } {
    const heartbeatStats = this.heartbeatManager.getStats();
    const reconnectionStats = this.reconnectionManager.getStats();

    // Calculate latency score (0-100)
    const latency = heartbeatStats.averageLatency;
    const latencyScore = Math.max(0, 100 - latency / 10);

    // Calculate stability score based on missed heartbeats
    const stabilityScore = Math.max(
      0,
      100 - heartbeatStats.missedHeartbeats * 20,
    );

    // Calculate reliability score based on reconnection attempts
    const reconnectionRate =
      reconnectionStats.currentAttempts /
      Math.max(1, reconnectionStats.maxAttempts);
    const reliabilityScore = Math.max(0, 100 - reconnectionRate * 100);

    // Calculate overall score
    const overallScore = (latencyScore + stabilityScore + reliabilityScore) / 3;

    return {
      latency: Math.round(latencyScore),
      stability: Math.round(stabilityScore),
      reliability: Math.round(reliabilityScore),
      overallScore: Math.round(overallScore),
    };
  }

  /**
   * Sets up health checks
   */
  private setupHealthChecks(): void {
    this.healthMonitor.registerHealthCheck("connection", () => {
      return this.isConnected();
    });

    this.healthMonitor.registerHealthCheck("heartbeat", () => {
      return this.heartbeatManager.getStats().isHealthy;
    });

    this.healthMonitor.registerHealthCheck("reconnection", () => {
      return this.reconnectionManager.canReconnect();
    });

    this.healthMonitor.registerHealthCheck("queue", () => {
      const queueStatus = this.getQueueStatus();
      return queueStatus.length < queueStatus.maxSize * 0.8; // 80% threshold
    });
  }

  /**
   * Gets comprehensive connection statistics
   */
  getAdvancedStats(): {
    connection: ConnectionMetrics;
    reconnection: ReturnType<ReconnectionManager["getStats"]>;
    heartbeat: ReturnType<HeartbeatManager["getStats"]>;
    health: ReturnType<ConnectionHealthMonitor["getCurrentHealth"]>;
    quality: {
      latency: number;
      stability: number;
      reliability: number;
      overallScore: number;
    };
    subscriptions: Record<
      string,
      { handlerCount: number; messageCount: number; lastMessage: Date }
    >;
  } {
    return {
      connection: this.getMetrics(),
      reconnection: this.reconnectionManager.getStats(),
      heartbeat: this.heartbeatManager.getStats(),
      health: this.healthMonitor.getCurrentHealth(),
      quality: this.getConnectionQualityMetrics(),
      subscriptions: this.getSubscriptionStats(),
    };
  }

  /**
   * Forces immediate health check
   */
  performHealthCheck(): { healthy: boolean; details: Record<string, boolean> } {
    return this.healthMonitor.performHealthCheck();
  }

  /**
   * Enhanced cleanup
   */
  override destroy(): void {
    this.reconnectionManager.cancel();
    this.heartbeatManager.stop();
    this.healthMonitor.stopMonitoring();
    super.destroy();
  }
}

// ============================================================================
// Updated Singleton and Factory for Advanced Manager
// ============================================================================

export const advancedAnalyticsWebSocketManager =
  new AdvancedAnalyticsWebSocketManager();

export function createAdvancedAnalyticsWebSocketManager(
  config?: Partial<WebSocketConfig>,
): AdvancedAnalyticsWebSocketManager {
  return new AdvancedAnalyticsWebSocketManager(config);
}

// ============================================================================
// Fallback Mechanisms Implementation (Task 4.4)
// ============================================================================

/**
 * Server-Sent Events fallback implementation
 */
export class ServerSentEventsManager {
  private eventSource: EventSource | null = null;
  private url: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private onConnectionChange?: (connected: boolean) => void;

  constructor(config: {
    url: string;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    onConnectionChange?: (connected: boolean) => void;
  }) {
    this.url = config.url;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 2000;
    if (config.onConnectionChange) {
      this.onConnectionChange = config.onConnectionChange;
    }
  }

  /**
   * Connects to SSE endpoint
   */
  async connect(): Promise<void> {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      // Add authentication token to URL
      const accessToken = await integratedTokenManager.getValidAccessToken();
      const sseUrl = new URL(this.url);
      if (accessToken) {
        sseUrl.searchParams.set("token", accessToken);
      }

      this.eventSource = new EventSource(sseUrl.toString());

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
        console.log("[SSE] Connected to analytics service");
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        this.onConnectionChange?.(false);
        console.error("[SSE] Connection error:", error);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage("message", event.data);
      };

      // Set up custom event listeners
      this.setupCustomEventListeners();
    } catch (error) {
      console.error("[SSE] Failed to connect:", error);
      throw error;
    }
  }

  /**
   * Disconnects from SSE endpoint
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }

  /**
   * Sets up custom event listeners for different message types
   */
  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // Listen for metrics updates
    this.eventSource.addEventListener("metrics", (event) => {
      this.handleMessage("metrics", event.data);
    });

    // Listen for alerts
    this.eventSource.addEventListener("alert", (event) => {
      this.handleMessage("alert", event.data);
    });

    // Listen for system messages
    this.eventSource.addEventListener("system", (event) => {
      this.handleMessage("system", event.data);
    });
  }

  /**
   * Handles incoming SSE messages
   */
  private handleMessage(eventType: string, data: string): void {
    try {
      const parsedData = JSON.parse(data);
      const handlers = this.eventHandlers.get(eventType);

      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(parsedData);
          } catch (error) {
            console.error(`[SSE] Error in ${eventType} handler:`, error);
          }
        });
      }
    } catch (error) {
      console.error("[SSE] Failed to parse message:", error);
    }
  }

  /**
   * Subscribes to SSE events
   */
  subscribe(eventType: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Schedules reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("[SSE] Reconnection failed:", error);
      });
    }, delay);
  }

  /**
   * Gets connection status
   */
  getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

/**
 * Simple HTTP client interface for polling
 */
interface SimpleHttpClient {
  get(endpoint: string): Promise<unknown>;
}

/**
 * Polling fallback implementation
 */
export class PollingManager {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private interval: number;
  private httpClient: SimpleHttpClient;
  private endpoints: string[];
  private dataHandlers: Map<string, (data: unknown) => void> = new Map();
  private errorCount: number = 0;
  private maxErrors: number = 5;
  private adaptiveInterval: boolean = true;
  private baseInterval: number;

  constructor(config: {
    interval: number;
    endpoints: string[];
    httpClient: SimpleHttpClient;
    adaptiveInterval?: boolean;
    maxErrors?: number;
  }) {
    this.interval = config.interval;
    this.baseInterval = config.interval;
    this.endpoints = config.endpoints;
    this.httpClient = config.httpClient;
    this.adaptiveInterval = config.adaptiveInterval !== false;
    this.maxErrors = config.maxErrors || 5;
  }

  /**
   * Starts polling
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.errorCount = 0;
    this.scheduleNextPoll();
    console.log("[Polling] Started with interval:", this.interval);
  }

  /**
   * Stops polling
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    console.log("[Polling] Stopped");
  }

  /**
   * Schedules next polling cycle
   */
  private scheduleNextPoll(): void {
    if (!this.isActive) return;

    this.intervalId = setTimeout(() => {
      this.performPoll();
    }, this.interval);
  }

  /**
   * Performs polling cycle
   */
  private async performPoll(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Poll all endpoints concurrently
      const promises = this.endpoints.map((endpoint) =>
        this.pollEndpoint(endpoint),
      );

      await Promise.allSettled(promises);

      // Reset error count on successful poll
      this.errorCount = 0;

      // Adjust interval if adaptive
      if (this.adaptiveInterval) {
        this.adjustInterval();
      }
    } catch (error) {
      this.handlePollingError(error);
    }

    // Schedule next poll
    this.scheduleNextPoll();
  }

  /**
   * Polls a specific endpoint
   */
  private async pollEndpoint(endpoint: string): Promise<void> {
    try {
      const data = await this.httpClient.get(endpoint);
      const handler = this.dataHandlers.get(endpoint);

      if (handler) {
        handler(data);
      }
    } catch (error) {
      console.error(`[Polling] Failed to poll ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handles polling errors
   */
  private handlePollingError(error: unknown): void {
    this.errorCount++;
    console.error("[Polling] Error during poll cycle:", error);

    if (this.errorCount >= this.maxErrors) {
      console.error("[Polling] Too many errors, stopping polling");
      this.stop();
    } else {
      // Increase interval on errors
      this.interval = Math.min(this.interval * 1.5, 60000);
    }
  }

  /**
   * Adjusts polling interval based on conditions
   */
  private adjustInterval(): void {
    // Gradually return to base interval if no errors
    if (this.interval > this.baseInterval) {
      this.interval = Math.max(this.interval * 0.9, this.baseInterval);
    }
  }

  /**
   * Registers data handler for endpoint
   */
  registerHandler(endpoint: string, handler: (data: unknown) => void): void {
    this.dataHandlers.set(endpoint, handler);
  }

  /**
   * Gets polling status
   */
  getStatus(): { active: boolean; interval: number; errorCount: number } {
    return {
      active: this.isActive,
      interval: this.interval,
      errorCount: this.errorCount,
    };
  }
}

/**
 * Graceful degradation manager
 */
export class GracefulDegradationManager {
  private currentMode: "websocket" | "sse" | "polling" | "offline" =
    "websocket";
  private websocketManager: AdvancedAnalyticsWebSocketManager;
  private sseManager: ServerSentEventsManager;
  private pollingManager: PollingManager;
  private cachedData: Map<
    string,
    { data: unknown; timestamp: Date; ttl: number }
  > = new Map();
  private onModeChange?: (
    mode: "websocket" | "sse" | "polling" | "offline",
  ) => void;
  private degradationHistory: Array<{
    mode: "websocket" | "sse" | "polling" | "offline";
    timestamp: Date;
    reason: string;
  }> = [];

  constructor(config: {
    websocketManager: AdvancedAnalyticsWebSocketManager;
    sseUrl: string;
    pollingEndpoints: string[];
    httpClient: SimpleHttpClient;
    onModeChange?: (mode: "websocket" | "sse" | "polling" | "offline") => void;
  }) {
    this.websocketManager = config.websocketManager;
    if (config.onModeChange) {
      this.onModeChange = config.onModeChange;
    }

    // Initialize SSE manager
    this.sseManager = new ServerSentEventsManager({
      url: config.sseUrl,
      onConnectionChange: (connected) => {
        if (!connected && this.currentMode === "sse") {
          this.degradeToPolling("SSE connection lost");
        }
      },
    });

    // Initialize polling manager
    this.pollingManager = new PollingManager({
      interval: 30000, // 30 seconds
      endpoints: config.pollingEndpoints,
      httpClient: config.httpClient,
      adaptiveInterval: true,
    });

    // Set up WebSocket health monitoring
    this.setupWebSocketMonitoring();
  }

  /**
   * Sets up WebSocket health monitoring
   */
  private setupWebSocketMonitoring(): void {
    this.websocketManager.setEventHandlers({
      onConnect: () => {
        if (this.currentMode !== "websocket") {
          this.upgradeToWebSocket("WebSocket connection restored");
        }
      },
      onDisconnect: () => {
        this.degradeToSSE("WebSocket connection lost");
      },
      onError: () => {
        this.degradeToSSE("WebSocket error occurred");
      },
    });
  }

  /**
   * Starts with optimal mode (WebSocket)
   */
  async start(): Promise<void> {
    try {
      await this.websocketManager.connect();
      this.setMode("websocket", "Initial connection");
    } catch {
      this.degradeToSSE("WebSocket initial connection failed");
    }
  }

  /**
   * Degrades to SSE fallback
   */
  private async degradeToSSE(reason: string): Promise<void> {
    if (this.currentMode === "sse") return;

    try {
      await this.sseManager.connect();
      this.setMode("sse", reason);
    } catch {
      this.degradeToPolling("SSE connection failed");
    }
  }

  /**
   * Degrades to polling fallback
   */
  private degradeToPolling(reason: string): void {
    if (this.currentMode === "polling") return;

    this.pollingManager.start();
    this.setMode("polling", reason);
  }

  /**
   * Upgrades to WebSocket when available
   */
  private async upgradeToWebSocket(reason: string): Promise<void> {
    if (this.currentMode === "websocket") return;

    // Stop current fallback mechanisms
    this.sseManager.disconnect();
    this.pollingManager.stop();

    this.setMode("websocket", reason);
  }

  /**
   * Sets current mode and notifies handlers
   */
  private setMode(mode: typeof this.currentMode, reason: string): void {
    if (this.currentMode !== mode) {
      const previousMode = this.currentMode;
      this.currentMode = mode;

      // Record in history
      this.degradationHistory.push({
        mode,
        timestamp: new Date(),
        reason,
      });

      // Keep history manageable
      if (this.degradationHistory.length > 50) {
        this.degradationHistory.shift();
      }

      console.log(
        `[Degradation] Mode changed: ${previousMode} -> ${mode} (${reason})`,
      );
      this.onModeChange?.(mode);
    }
  }

  /**
   * Caches data with TTL
   */
  cacheData(key: string, data: unknown, ttl: number = 300000): void {
    // 5 minutes default
    this.cachedData.set(key, {
      data,
      timestamp: new Date(),
      ttl,
    });
  }

  /**
   * Gets cached data if available and not expired
   */
  getCachedData(key: string): unknown | null {
    const cached = this.cachedData.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp.getTime();

    if (age > cached.ttl) {
      this.cachedData.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Gets data with fallback to cache
   */
  async getDataWithFallback<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<{
    data: T | unknown;
    source: "live" | "cache" | "fallback";
    degraded: boolean;
  }> {
    try {
      // Try to get live data
      const data = await fetcher();
      this.cacheData(key, data);

      return {
        data,
        source: "live",
        degraded: this.currentMode !== "websocket",
      };
    } catch {
      // Fall back to cached data
      const cachedData = this.getCachedData(key);
      if (cachedData) {
        return {
          data: cachedData,
          source: "cache",
          degraded: true,
        };
      }

      // No cached data available
      throw new Error(`No data available for ${key}`);
    }
  }

  /**
   * Gets current status
   */
  getStatus(): {
    mode: "websocket" | "sse" | "polling" | "offline";
    websocket: {
      connected: boolean;
      stats: ReturnType<AdvancedAnalyticsWebSocketManager["getAdvancedStats"]>;
    };
    sse: { connected: boolean; reconnectAttempts: number };
    polling: { active: boolean; interval: number; errorCount: number };
    cacheSize: number;
    degradationHistory: Array<{
      mode: "websocket" | "sse" | "polling" | "offline";
      timestamp: Date;
      reason: string;
    }>;
  } {
    return {
      mode: this.currentMode,
      websocket: {
        connected: this.websocketManager.isConnected(),
        stats: this.websocketManager.getAdvancedStats(),
      },
      sse: this.sseManager.getStatus(),
      polling: this.pollingManager.getStatus(),
      cacheSize: this.cachedData.size,
      degradationHistory: [...this.degradationHistory],
    };
  }

  /**
   * Forces mode change for testing
   */
  forceMode(mode: typeof this.currentMode): void {
    switch (mode) {
      case "websocket":
        this.upgradeToWebSocket("Forced mode change");
        break;
      case "sse":
        this.degradeToSSE("Forced mode change");
        break;
      case "polling":
        this.degradeToPolling("Forced mode change");
        break;
      case "offline":
        this.websocketManager.disconnect();
        this.sseManager.disconnect();
        this.pollingManager.stop();
        this.setMode("offline", "Forced offline mode");
        break;
    }
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.websocketManager.destroy();
    this.sseManager.disconnect();
    this.pollingManager.stop();
    this.cachedData.clear();
    this.degradationHistory = [];
  }
}

// ============================================================================
// Complete WebSocket Manager with All Fallback Mechanisms
// ============================================================================

/**
 * Complete analytics WebSocket manager with all fallback mechanisms
 */
export class CompleteAnalyticsWebSocketManager {
  private degradationManager: GracefulDegradationManager;
  private websocketManager: AdvancedAnalyticsWebSocketManager;
  private statusIndicators: Map<string, boolean> = new Map();
  private connectionStatusHandler?:
    | ((status: ConnectionStatus) => void)
    | undefined;

  constructor(
    config?: Partial<
      WebSocketConfig & {
        sseUrl?: string;
        pollingEndpoints?: string[];
        httpClient?: SimpleHttpClient;
      }
    >,
  ) {
    // Create advanced WebSocket manager
    this.websocketManager = new AdvancedAnalyticsWebSocketManager(config);

    // Create degradation manager with fallbacks
    this.degradationManager = new GracefulDegradationManager({
      websocketManager: this.websocketManager,
      sseUrl:
        config?.sseUrl ||
        analyticsServiceConfig.baseUrl.replace("http", "ws") + "/events",
      pollingEndpoints: config?.pollingEndpoints || [
        "/api/v1/analytics/realtime",
        "/api/v1/analytics/alerts",
      ],
      httpClient: config?.httpClient || { get: async () => ({}) },
      onModeChange: (mode) => {
        this.updateStatusIndicators(mode);
        // Notify connection status change when mode changes
        if (this.connectionStatusHandler) {
          const status: ConnectionStatus =
            mode === "websocket"
              ? "connected"
              : mode === "offline"
                ? "disconnected"
                : "connecting";
          this.connectionStatusHandler(status);
        }
      },
    });
  }

  /**
   * Starts the complete WebSocket system with fallbacks
   */
  async start(): Promise<void> {
    await this.degradationManager.start();
  }

  /**
   * Connects the WebSocket (alias for start for backward compatibility)
   */
  async connect(): Promise<void> {
    await this.start();
  }

  /**
   * Disconnects the WebSocket and stops all fallback mechanisms
   */
  disconnect(): void {
    this.websocketManager.disconnect();
    this.degradationManager.destroy();
  }

  /**
   * Subscribes to analytics data with automatic fallback handling
   */
  subscribe(messageType: string, handler: SubscriptionHandler): () => void {
    return this.websocketManager.subscribeWithFilter(messageType, handler);
  }

  /**
   * Connection status change handler
   */
  set onConnectionStatusChange(
    handler: ((status: ConnectionStatus) => void) | undefined,
  ) {
    this.connectionStatusHandler = handler;
  }

  /**
   * Gets current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.websocketManager.isConnected() ? "connected" : "disconnected";
  }

  /**
   * Gets data with automatic fallback to cache and degraded modes
   */
  async getDataWithFallback<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<{
    data: T | unknown;
    source: "live" | "cache" | "fallback";
    degraded: boolean;
  }> {
    return this.degradationManager.getDataWithFallback(key, fetcher);
  }

  /**
   * Updates status indicators based on current mode
   */
  private updateStatusIndicators(
    mode: "websocket" | "sse" | "polling" | "offline",
  ): void {
    this.statusIndicators.set("realtime", mode === "websocket");
    this.statusIndicators.set("degraded", mode !== "websocket");
    this.statusIndicators.set("offline", mode === "offline");
  }

  /**
   * Gets comprehensive status
   */
  getStatus(): {
    mode: "websocket" | "sse" | "polling" | "offline";
    realtime: boolean;
    degraded: boolean;
    offline: boolean;
    details: ReturnType<GracefulDegradationManager["getStatus"]>;
  } {
    const status = this.degradationManager.getStatus();

    return {
      mode: status.mode,
      realtime: this.statusIndicators.get("realtime") || false,
      degraded: this.statusIndicators.get("degraded") || false,
      offline: this.statusIndicators.get("offline") || false,
      details: status,
    };
  }

  /**
   * Forces specific mode for testing
   */
  forceMode(mode: "websocket" | "sse" | "polling" | "offline"): void {
    this.degradationManager.forceMode(mode);
  }

  /**
   * Cleans up all resources
   */
  destroy(): void {
    this.degradationManager.destroy();
    this.statusIndicators.clear();
  }
}

// ============================================================================
// Final Singleton and Factory
// ============================================================================

export const completeAnalyticsWebSocketManager =
  new CompleteAnalyticsWebSocketManager();

export function createCompleteAnalyticsWebSocketManager(
  config?: Partial<
    WebSocketConfig & {
      sseUrl?: string;
      pollingEndpoints?: string[];
      httpClient?: SimpleHttpClient;
    }
  >,
): CompleteAnalyticsWebSocketManager {
  return new CompleteAnalyticsWebSocketManager(config);
}
