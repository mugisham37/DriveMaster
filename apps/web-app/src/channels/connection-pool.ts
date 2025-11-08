/**
 * Connection pool for managing WebSocket connections
 */

import { RealtimeConnection, ConnectionOptions } from "./connection";

interface PooledConnection {
  connection: RealtimeConnection;
  subscribers: Set<string>;
  lastUsed: number;
}

export class ConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly MAX_IDLE_TIME = 300000; // 5 minutes

  constructor() {
    this.startCleanup();
  }

  /**
   * Get or create a connection for the given URL
   */
  async getConnection(
    url: string,
    subscriberId: string,
    options?: ConnectionOptions,
  ): Promise<RealtimeConnection> {
    let pooledConnection = this.connections.get(url);

    if (!pooledConnection) {
      // Create new connection
      const connection = new RealtimeConnection(url, options);
      await connection.connect();

      pooledConnection = {
        connection,
        subscribers: new Set(),
        lastUsed: Date.now(),
      };

      this.connections.set(url, pooledConnection);
    }

    // Add subscriber
    pooledConnection.subscribers.add(subscriberId);
    pooledConnection.lastUsed = Date.now();

    return pooledConnection.connection;
  }

  /**
   * Release a connection for the given subscriber
   */
  releaseConnection(url: string, subscriberId: string): void {
    const pooledConnection = this.connections.get(url);

    if (pooledConnection) {
      pooledConnection.subscribers.delete(subscriberId);

      // If no more subscribers, mark for cleanup
      if (pooledConnection.subscribers.size === 0) {
        pooledConnection.lastUsed = Date.now();
      }
    }
  }

  /**
   * Get the number of active connections
   */
  getActiveConnectionCount(): number {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.subscribers.size > 0,
    ).length;
  }

  /**
   * Get the total number of connections (including idle)
   */
  getTotalConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Manually cleanup idle connections
   */
  cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [url, pooledConnection] of this.connections.entries()) {
      // Remove connections with no subscribers that have been idle too long
      if (
        pooledConnection.subscribers.size === 0 &&
        now - pooledConnection.lastUsed > this.MAX_IDLE_TIME
      ) {
        pooledConnection.connection.disconnect();
        toRemove.push(url);
      }
    }

    toRemove.forEach((url) => this.connections.delete(url));

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} idle connections`);
    }
  }

  /**
   * Disconnect all connections and clear the pool
   */
  disconnectAll(): void {
    for (const pooledConnection of this.connections.values()) {
      pooledConnection.connection.disconnect();
    }

    this.connections.clear();
    this.stopCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global connection pool instance
export const globalConnectionPool = new ConnectionPool();

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    globalConnectionPool.disconnectAll();
  });
}
