/**
 * WebSocket connection management for real-time channels
 */

export interface ConnectionOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface ConnectionEvent {
  type: "connected" | "disconnected" | "message" | "error";
  data?: Record<string, unknown>;
  error?: Error;
}

export type ConnectionEventHandler = (event: ConnectionEvent) => void;

export class RealtimeConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private options: ConnectionOptions;
  private eventHandlers: Map<string, ConnectionEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(url: string, options: ConnectionOptions = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isReady()) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit("connected", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit("message", { data });
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit("disconnected", {});
        this.handleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.emit("error", { error: new Error("WebSocket error") });
      };
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message through the WebSocket
   */
  send(data: Record<string, unknown>): void {
    if (!this.isReady()) {
      throw new Error("WebSocket is not connected");
    }

    this.ws!.send(JSON.stringify(data));
  }

  /**
   * Check if the connection is ready
   */
  isReady(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Add an event listener
   */
  on(event: string, handler: ConnectionEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove an event listener
   */
  off(event: string, handler: ConnectionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: Partial<ConnectionEvent>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler({ type: event as ConnectionEvent["type"], ...data });
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
      );
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, this.options.reconnectInterval! * this.reconnectAttempts);
  }

  private startHeartbeat(): void {
    if (this.options.heartbeatInterval && this.options.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.isReady()) {
          this.send({ type: "ping" });
        }
      }, this.options.heartbeatInterval);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
