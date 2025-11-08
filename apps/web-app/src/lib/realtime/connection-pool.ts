/**
 * Connection pool for managing multiple WebSocket connections
 * Provides efficient resource management and connection reuse
 */

import {
  RealtimeConnection,
  ConnectionOptions,
  ConnectionEvent,
} from "./connection";

export interface PoolOptions {
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

interface PooledConnection {
  connection: RealtimeConnection;
  id: string;
  lastUsed: number;
  subscribers: Set<string>;
  isIdle: boolean;
}

export class ConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private options: Required<PoolOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: PoolOptions = {}) {
    this.options = {
      maxConnections: 10,
      connectionTimeout: 30000,
      idleTimeout: 60000,
      ...options,
    };

    this.startCleanupTimer();
  }

  /**
   * Get or create a connection for the given URL
   */
  async getConnection(
    url: string,
    subscriberId: string,
    connectionOptions?: Partial<ConnectionOptions>,
  ): Promise<RealtimeConnection> {
    const connectionId = this.getConnectionId(url);
    let pooledConnection = this.connections.get(connectionId);

    if (!pooledConnection) {
      // Create new connection if we haven't reached the limit
      if (this.connections.size >= this.options.maxConnections) {
        await this.evictLeastRecentlyUsed();
      }

      const connection = new RealtimeConnection({
        url,
        ...connectionOptions,
      });

      pooledConnection = {
        connection,
        id: connectionId,
        lastUsed: Date.now(),
        subscribers: new Set([subscriberId]),
        isIdle: false,
      };

      this.connections.set(connectionId, pooledConnection);

      // Set up connection event handlers
      this.setupConnectionHandlers(pooledConnection);

      // Connect to the WebSocket
      await connection.connect();
    } else {
      // Add subscriber to existing connection
      pooledConnection.subscribers.add(subscriberId);
      pooledConnection.lastUsed = Date.now();
      pooledConnection.isIdle = false;
    }

    return pooledConnection.connection;
  }

  /**
   * Release a connection for a specific subscriber
   */
  releaseConnection(url: string, subscriberId: string): void {
    const connectionId = this.getConnectionId(url);
    const pooledConnection = this.connections.get(connectionId);

    if (pooledConnection) {
      pooledConnection.subscribers.delete(subscriberId);

      // Mark as idle if no more subscribers
      if (pooledConnection.subscribers.size === 0) {
        pooledConnection.isIdle = true;
        pooledConnection.lastUsed = Date.now();
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    totalSubscribers: number;
  } {
    let activeConnections = 0;
    let idleConnections = 0;
    let totalSubscribers = 0;

    this.connections.forEach((pooledConnection) => {
      if (pooledConnection.isIdle) {
        idleConnections++;
      } else {
        activeConnections++;
      }
      totalSubscribers += pooledConnection.subscribers.size;
    });

    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections,
      totalSubscribers,
    };
  }

  /**
   * Close all connections and clean up
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.connections.forEach((pooledConnection) => {
      pooledConnection.connection.destroy();
    });

    this.connections.clear();
  }

  private getConnectionId(url: string): string {
    // Create a consistent ID for the same URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, "");
  }

  private setupConnectionHandlers(pooledConnection: PooledConnection): void {
    const { connection } = pooledConnection;

    connection.on("disconnected", (event: ConnectionEvent) => {
      // Handle unexpected disconnections
      console.log(
        `Connection ${pooledConnection.id} disconnected:`,
        event.data,
      );
    });

    connection.on("error", (event: ConnectionEvent) => {
      console.error(`Connection ${pooledConnection.id} error:`, event.error);
    });

    connection.on("connected", () => {
      console.log(`Connection ${pooledConnection.id} established`);
    });
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestConnection: PooledConnection | null = null;
    let oldestTime = Date.now();

    // Find the oldest idle connection
    this.connections.forEach((pooledConnection) => {
      if (pooledConnection.isIdle && pooledConnection.lastUsed < oldestTime) {
        oldestTime = pooledConnection.lastUsed;
        oldestConnection = pooledConnection;
      }
    });

    // If no idle connections, find the oldest active connection
    if (!oldestConnection) {
      this.connections.forEach((pooledConnection) => {
        if (pooledConnection.lastUsed < oldestTime) {
          oldestTime = pooledConnection.lastUsed;
          oldestConnection = pooledConnection;
        }
      });
    }

    if (oldestConnection) {
      const connection = oldestConnection as PooledConnection;
      console.log(`Evicting connection ${connection.id}`);
      connection.connection.destroy();
      this.connections.delete(connection.id);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // Run cleanup every 30 seconds
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    this.connections.forEach((pooledConnection, id) => {
      if (
        pooledConnection.isIdle &&
        now - pooledConnection.lastUsed > this.options.idleTimeout
      ) {
        connectionsToRemove.push(id);
      }
    });

    connectionsToRemove.forEach((id) => {
      const pooledConnection = this.connections.get(id);
      if (pooledConnection) {
        console.log(`Cleaning up idle connection ${id}`);
        pooledConnection.connection.destroy();
        this.connections.delete(id);
      }
    });
  }
}

// Global connection pool instance
export const globalConnectionPool = new ConnectionPool();
