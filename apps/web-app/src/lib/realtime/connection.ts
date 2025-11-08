/**
 * RealtimeConnection class for managing WebSocket connections
 * Replaces ActionCable functionality with identical behavior
 */

export interface ConnectionOptions {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError?: Error | undefined;
}

export type ConnectionEventType =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"
  | "message";

export interface ConnectionEvent {
  type: ConnectionEventType;
  data?: Record<string, unknown>;
  error?: Error;
}

export type ConnectionEventHandler = (event: ConnectionEvent) => void;

/**
 * Message queue for handling messages when connection is not available
 */
interface QueuedMessage {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export class RealtimeConnection {
  private ws: WebSocket | null = null;
  private options: Required<ConnectionOptions>;
  private state: ConnectionState;
  private eventHandlers: Map<ConnectionEventType, Set<ConnectionEventHandler>>;
  private messageQueue: QueuedMessage[];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(options: ConnectionOptions) {
    this.options = {
      protocols: [],
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...options,
    };

    this.state = {
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
    };

    this.eventHandlers = new Map();
    this.messageQueue = [];

    // Initialize event handler sets
    const eventTypes: ConnectionEventType[] = [
      "connected",
      "disconnected",
      "reconnecting",
      "error",
      "message",
    ];
    eventTypes.forEach((type) => {
      this.eventHandlers.set(type, new Set());
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error("Connection has been destroyed"));
        return;
      }

      if (this.state.isConnected || this.state.isConnecting) {
        resolve();
        return;
      }

      this.state.isConnecting = true;
      this.emit("reconnecting", { attempts: this.state.reconnectAttempts });

      try {
        this.ws = new WebSocket(this.options.url, this.options.protocols);

        this.ws.onopen = () => {
          this.state.isConnected = true;
          this.state.isConnecting = false;
          this.state.reconnectAttempts = 0;
          this.state.lastError = undefined;

          this.startHeartbeat();
          this.processMessageQueue();
          this.emit("connected");
          resolve();
        };

        this.ws.onclose = (event) => {
          this.handleDisconnection(event.code, event.reason);
        };

        this.ws.onerror = (event) => {
          const error = new Error(`WebSocket error: ${event.type}`);
          this.state.lastError = error;
          this.emit("error", { error });

          if (this.state.isConnecting) {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit("message", { data });
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
            this.emit("error", { error: error as Error });
          }
        };
      } catch (error) {
        this.state.isConnecting = false;
        this.state.lastError = error as Error;
        this.emit("error", { error: error as Error });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.state.isConnected = false;
    this.state.isConnecting = false;
  }

  /**
   * Destroy the connection and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }

  /**
   * Send message through WebSocket
   */
  send(data: Record<string, unknown>): boolean {
    if (this.state.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        this.queueMessage(data);
        return false;
      }
    } else {
      this.queueMessage(data);
      return false;
    }
  }

  /**
   * Add event listener
   */
  on(event: ConnectionEventType, handler: ConnectionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Remove event listener
   */
  off(event: ConnectionEventType, handler: ConnectionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Check if connection is ready for sending messages
   */
  isReady(): boolean {
    return this.state.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  private handleDisconnection(code: number, reason: string): void {
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.clearTimers();

    this.emit("disconnected", { code, reason });

    // Auto-reconnect unless explicitly closed or destroyed
    if (
      code !== 1000 &&
      !this.isDestroyed &&
      this.state.reconnectAttempts < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.state.reconnectAttempts++;

    // Exponential backoff with jitter
    const baseDelay = this.options.reconnectInterval;
    const exponentialDelay =
      baseDelay * Math.pow(2, this.state.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds

    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isReady()) {
        this.send({ type: "ping", timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
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
  }

  private queueMessage(data: Record<string, unknown>): void {
    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.messageQueue.push(message);

    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Remove old messages
    this.messageQueue = this.messageQueue.filter(
      (msg) => now - msg.timestamp < maxAge,
    );

    // Send queued messages
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    messagesToSend.forEach((message) => {
      if (!this.send(message.data)) {
        // If send fails, re-queue with retry count
        message.retries++;
        if (message.retries < 3) {
          this.messageQueue.push(message);
        }
      }
    });
  }

  private emit(
    type: ConnectionEventType,
    data?: Record<string, unknown>,
  ): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const event: ConnectionEvent = { type, ...data };
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error);
        }
      });
    }
  }
}
