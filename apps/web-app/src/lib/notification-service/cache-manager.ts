/**
 * Notification Service Cache Manager
 *
 * Implements multi-tier caching strategy with memory and IndexedDB storage
 * Provides cache invalidation, optimistic updates, and performance monitoring
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import type {
  Notification,
  NotificationPreferences,
  DeviceToken,
  NotificationTemplate,
} from "@/types/notification-service";

// ============================================================================
// Cache Configuration and Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  version?: string | undefined;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  hitRatio: number;
}

export interface CacheConfig {
  maxMemorySize: number;
  maxEntries: number;
  defaultTTL: number;
  enableMetrics: boolean;
  enableIndexedDB: boolean;
  compressionThreshold: number;
}

export type CacheType =
  | "notifications"
  | "preferences"
  | "templates"
  | "deviceTokens"
  | "analytics";

export const CACHE_TTL_CONFIG = {
  notifications: 60000, // 1 minute
  preferences: 300000, // 5 minutes
  templates: 3600000, // 1 hour
  deviceTokens: 600000, // 10 minutes
  analytics: 1800000, // 30 minutes
} as const;

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  maxEntries: 10000,
  defaultTTL: 300000, // 5 minutes
  enableMetrics: true,
  enableIndexedDB: true,
  compressionThreshold: 1024, // 1KB
};

// ============================================================================
// Memory Cache Implementation
// ============================================================================

export class NotificationMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0,
    hitRatio: 0,
  };

  constructor(private config: CacheConfig) {}

  /**
   * Get item from memory cache with TTL validation
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateHitRatio();
      return null;
    }

    // Check TTL expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.misses++;
      this.updateHitRatio();
      return null;
    }

    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.metrics.hits++;
    this.updateHitRatio();

    return entry.data as T;
  }

  /**
   * Set item in memory cache with LRU eviction
   */
  set<T>(key: string, data: T, type: CacheType, version?: string): void {
    const ttl = CACHE_TTL_CONFIG[type] || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      version: version || undefined,
    };

    // Check if we need to evict entries
    this.evictIfNeeded();

    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    this.metrics.sets++;
    this.metrics.size = this.cache.size;
    this.updateMemoryUsage();
  }

  /**
   * Delete item from memory cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.metrics.size = this.cache.size;
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.size = 0;
    this.metrics.memoryUsage = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all keys matching pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  /**
   * Invalidate entries by pattern
   */
  invalidateByPattern(pattern: string): number {
    const keys = this.getKeysByPattern(pattern);
    let count = 0;

    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache size information
   */
  getSize(): { entries: number; memoryUsage: number } {
    return {
      entries: this.cache.size,
      memoryUsage: this.metrics.memoryUsage,
    };
  }

  // Private helper methods

  private evictIfNeeded(): void {
    // Evict by entry count
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Evict by memory usage (approximate)
    while (this.metrics.memoryUsage > this.config.maxMemorySize) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    if (!lruKey) return;

    this.cache.delete(lruKey);
    this.removeFromAccessOrder(lruKey);

    this.metrics.evictions++;
    this.metrics.size = this.cache.size;
    this.updateMemoryUsage();
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateMemoryUsage(): void {
    // Approximate memory usage calculation
    let usage = 0;
    for (const [key, entry] of this.cache) {
      usage += key.length * 2; // UTF-16 characters
      usage += JSON.stringify(entry.data).length * 2;
      usage += 64; // Overhead for entry metadata
    }
    this.metrics.memoryUsage = usage;
  }

  private updateHitRatio(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRatio = total > 0 ? this.metrics.hits / total : 0;
  }
}

// ============================================================================
// IndexedDB Persistence Layer
// ============================================================================

export interface IndexedDBSchema {
  version: number;
  stores: {
    notifications: {
      keyPath: "key";
      indexes: {
        userId: "userId";
        timestamp: "timestamp";
        type: "type";
      };
    };
    preferences: {
      keyPath: "key";
      indexes: {
        userId: "userId";
      };
    };
    templates: {
      keyPath: "key";
    };
    deviceTokens: {
      keyPath: "key";
      indexes: {
        userId: "userId";
      };
    };
    metadata: {
      keyPath: "key";
    };
  };
}

export class NotificationIndexedDBCache {
  private db: IDBDatabase | null = null;
  private readonly dbName = "NotificationServiceCache";
  private readonly dbVersion = 1;
  private initPromise: Promise<void> | null = null;

  constructor(private config: CacheConfig) {}

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDB();
    return this.initPromise;
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(
          new Error(`Failed to open IndexedDB: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    // Notifications store
    if (!db.objectStoreNames.contains("notifications")) {
      const notificationStore = db.createObjectStore("notifications", {
        keyPath: "key",
      });
      notificationStore.createIndex("userId", "userId", { unique: false });
      notificationStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
      notificationStore.createIndex("type", "type", { unique: false });
    }

    // Preferences store
    if (!db.objectStoreNames.contains("preferences")) {
      const preferencesStore = db.createObjectStore("preferences", {
        keyPath: "key",
      });
      preferencesStore.createIndex("userId", "userId", { unique: false });
    }

    // Templates store
    if (!db.objectStoreNames.contains("templates")) {
      db.createObjectStore("templates", { keyPath: "key" });
    }

    // Device tokens store
    if (!db.objectStoreNames.contains("deviceTokens")) {
      const deviceTokensStore = db.createObjectStore("deviceTokens", {
        keyPath: "key",
      });
      deviceTokensStore.createIndex("userId", "userId", { unique: false });
    }

    // Metadata store for cache management
    if (!db.objectStoreNames.contains("metadata")) {
      db.createObjectStore("metadata", { keyPath: "key" });
    }
  }

  /**
   * Store data in IndexedDB with compression
   */
  async set<T>(
    key: string,
    data: T,
    type: CacheType,
    version?: string,
  ): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName(type);
    const compressedData = await this.compressData(data);

    const entry = {
      key,
      data: compressedData,
      timestamp: Date.now(),
      ttl: CACHE_TTL_CONFIG[type] || this.config.defaultTTL,
      version,
      compressed: compressedData !== data,
      userId: this.extractUserId(key),
      type,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to store data: ${request.error?.message}`));
    });
  }

  /**
   * Retrieve data from IndexedDB with decompression
   */
  async get<T>(key: string, type: CacheType): Promise<T | null> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName(type);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = async () => {
        const entry = request.result;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL expiration
        if (Date.now() - entry.timestamp > entry.ttl) {
          // Delete expired entry
          this.delete(key, type).catch(console.warn);
          resolve(null);
          return;
        }

        try {
          const data = await this.decompressData(entry.data, entry.compressed);
          resolve(data as T);
        } catch (error) {
          reject(error);
        }
      };

      request.onerror = () =>
        reject(new Error(`Failed to retrieve data: ${request.error?.message}`));
    });
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(key: string, type: CacheType): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName(type);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () =>
        reject(new Error(`Failed to delete data: ${request.error?.message}`));
    });
  }

  /**
   * Clear all data for a specific type
   */
  async clear(type?: CacheType): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const storeNames = type
      ? [this.getStoreName(type)]
      : ["notifications", "preferences", "templates", "deviceTokens"];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, "readwrite");
      let completed = 0;

      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          completed++;
          if (completed === storeNames.length) {
            resolve();
          }
        };

        request.onerror = () =>
          reject(
            new Error(
              `Failed to clear store ${storeName}: ${request.error?.message}`,
            ),
          );
      }
    });
  }

  /**
   * Get all keys for a user
   */
  async getKeysByUserId(userId: string, type: CacheType): Promise<string[]> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName(type);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index("userId");
      const request = index.getAllKeys(userId);

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () =>
        reject(new Error(`Failed to get keys: ${request.error?.message}`));
    });
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    let totalDeleted = 0;
    const storeNames = [
      "notifications",
      "preferences",
      "templates",
      "deviceTokens",
    ];

    for (const storeName of storeNames) {
      const deleted = await this.cleanupStore(storeName);
      totalDeleted += deleted;
    }

    return totalDeleted;
  }

  private async cleanupStore(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const entry = cursor.value;
          const isExpired = Date.now() - entry.timestamp > entry.ttl;

          if (isExpired) {
            cursor.delete();
            deletedCount++;
          }

          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () =>
        reject(
          new Error(
            `Failed to cleanup store ${storeName}: ${request.error?.message}`,
          ),
        );
    });
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ usage: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }

    return { usage: 0, quota: 0 };
  }

  // Private helper methods

  private getStoreName(type: CacheType): string {
    switch (type) {
      case "notifications":
        return "notifications";
      case "preferences":
        return "preferences";
      case "templates":
        return "templates";
      case "deviceTokens":
        return "deviceTokens";
      case "analytics":
        return "notifications"; // Store analytics with notifications
      default:
        return "notifications";
    }
  }

  private extractUserId(key: string): string | undefined {
    // Extract userId from keys like "notifications_user123" or "preferences_user123"
    const match = key.match(/_([^_]+)$/);
    return match ? match[1] : undefined;
  }

  private async compressData<T>(data: T): Promise<T | string> {
    const serialized = JSON.stringify(data);

    if (serialized.length < this.config.compressionThreshold) {
      return data;
    }

    try {
      // Use CompressionStream if available (modern browsers)
      if ("CompressionStream" in window) {
        const stream = new CompressionStream("gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(new TextEncoder().encode(serialized));
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const compressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return btoa(String.fromCharCode(...compressed));
      }

      // Fallback: return original data if compression not available
      return data;
    } catch (error) {
      console.warn("Compression failed, storing uncompressed:", error);
      return data;
    }
  }

  private async decompressData<T>(
    data: T | string,
    isCompressed: boolean,
  ): Promise<T> {
    if (!isCompressed || typeof data !== "string") {
      return data as T;
    }

    try {
      // Use DecompressionStream if available
      if ("DecompressionStream" in window) {
        const compressed = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressed);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        const text = new TextDecoder().decode(decompressed);
        return JSON.parse(text);
      }

      // Fallback: assume it's not actually compressed
      return JSON.parse(data);
    } catch (error) {
      console.warn("Decompression failed, returning as-is:", error);
      return data as T;
    }
  }

  /**
   * Close IndexedDB connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }
}

// ============================================================================
// Cache Invalidation and Consistency
// ============================================================================

export interface InvalidationEvent {
  type: "create" | "update" | "delete" | "bulk_update";
  keys: string[];
  userId?: string | undefined;
  timestamp: number;
  source: "api" | "websocket" | "manual";
  version?: string | undefined;
}

export type InvalidationListener = (
  event: InvalidationEvent,
) => void | Promise<void>;

export class CacheInvalidationManager {
  private listeners = new Map<string, InvalidationListener[]>();
  private eventQueue: InvalidationEvent[] = [];
  private isProcessing = false;
  private crossTabChannel: BroadcastChannel | null = null;

  constructor() {
    this.initializeCrossTabSync();
  }

  /**
   * Register invalidation listener for pattern
   */
  addListener(pattern: string, listener: InvalidationListener): () => void {
    if (!this.listeners.has(pattern)) {
      this.listeners.set(pattern, []);
    }

    this.listeners.get(pattern)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(pattern);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Trigger cache invalidation event
   */
  async invalidate(event: Omit<InvalidationEvent, "timestamp">): Promise<void> {
    const fullEvent: InvalidationEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to queue for processing
    this.eventQueue.push(fullEvent);

    // Broadcast to other tabs
    this.broadcastEvent(fullEvent);

    // Process queue
    await this.processEventQueue();
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(
    pattern: string,
    source: InvalidationEvent["source"] = "manual",
  ): Promise<void> {
    await this.invalidate({
      type: "bulk_update",
      keys: [pattern],
      source,
    });
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUser(
    userId: string,
    source: InvalidationEvent["source"] = "manual",
  ): Promise<void> {
    await this.invalidate({
      type: "bulk_update",
      keys: [`*_${userId}`],
      userId,
      source,
    });
  }

  /**
   * Handle real-time invalidation from WebSocket
   */
  async handleRealtimeInvalidation(data: {
    type: string;
    notificationId?: string;
    userId?: string;
    version?: string;
  }): Promise<void> {
    const keys: string[] = [];

    switch (data.type) {
      case "notification.created":
      case "notification.updated":
        if (data.userId) {
          keys.push(`notifications_${data.userId}`);
        }
        break;

      case "notification.deleted":
        if (data.notificationId) {
          keys.push(`notification_${data.notificationId}`);
        }
        if (data.userId) {
          keys.push(`notifications_${data.userId}`);
        }
        break;

      case "preferences.updated":
        if (data.userId) {
          keys.push(`preferences_${data.userId}`);
        }
        break;

      case "template.updated":
        keys.push("templates");
        break;
    }

    if (keys.length > 0) {
      await this.invalidate({
        type: "update",
        keys,
        userId: data.userId || undefined,
        source: "websocket",
        version: data.version || undefined,
      });
    }
  }

  /**
   * Process queued invalidation events
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual invalidation event
   */
  private async processEvent(event: InvalidationEvent): Promise<void> {
    const matchingListeners: InvalidationListener[] = [];

    // Find listeners that match the event keys
    for (const [pattern, listeners] of this.listeners) {
      for (const key of event.keys) {
        if (this.matchesPattern(key, pattern)) {
          matchingListeners.push(...listeners);
          break;
        }
      }
    }

    // Execute listeners
    const promises = matchingListeners.map(async (listener) => {
      try {
        await listener(event);
      } catch (error) {
        console.error("Cache invalidation listener error:", error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern === "*") {
      return true;
    }

    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(key);
    }

    return key === pattern;
  }

  /**
   * Initialize cross-tab synchronization
   */
  private initializeCrossTabSync(): void {
    if (typeof BroadcastChannel !== "undefined") {
      this.crossTabChannel = new BroadcastChannel(
        "notification-cache-invalidation",
      );

      this.crossTabChannel.addEventListener("message", (event) => {
        const invalidationEvent = event.data as InvalidationEvent;

        // Don't process our own events
        if (invalidationEvent.source !== "manual") {
          this.eventQueue.push(invalidationEvent);
          this.processEventQueue().catch(console.error);
        }
      });
    }
  }

  /**
   * Broadcast invalidation event to other tabs
   */
  private broadcastEvent(event: InvalidationEvent): void {
    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage(event);
      } catch (error) {
        console.warn("Failed to broadcast cache invalidation:", error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.crossTabChannel) {
      this.crossTabChannel.close();
      this.crossTabChannel = null;
    }

    this.listeners.clear();
    this.eventQueue = [];
  }
}

// ============================================================================
// Optimistic Updates Implementation
// ============================================================================

export interface OptimisticUpdate<T = unknown> {
  id: string;
  key: string;
  originalData: T | null;
  optimisticData: T;
  timestamp: number;
  operation: "create" | "update" | "delete";
  rollbackFn?: (() => Promise<void>) | undefined;
}

export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  private rollbackTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly maxPendingTime = 30000; // 30 seconds

  /**
   * Apply optimistic update
   */
  async applyOptimisticUpdate<T>(
    key: string,
    optimisticData: T,
    operation: OptimisticUpdate["operation"],
    originalData: T | null = null,
    rollbackFn?: () => Promise<void>,
  ): Promise<string> {
    const updateId = `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const update: OptimisticUpdate<T> = {
      id: updateId,
      key,
      originalData,
      optimisticData,
      timestamp: Date.now(),
      operation,
      rollbackFn: rollbackFn || undefined,
    };

    this.pendingUpdates.set(updateId, update);

    // Set automatic rollback timeout
    const timeout = setTimeout(() => {
      this.rollbackUpdate(updateId, "timeout").catch(console.error);
    }, this.maxPendingTime);

    this.rollbackTimeouts.set(updateId, timeout);

    return updateId;
  }

  /**
   * Confirm optimistic update (remove from pending)
   */
  async confirmUpdate(updateId: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    // Clear timeout
    const timeout = this.rollbackTimeouts.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      this.rollbackTimeouts.delete(updateId);
    }

    // Remove from pending
    this.pendingUpdates.delete(updateId);
  }

  /**
   * Rollback optimistic update
   */
  async rollbackUpdate(
    updateId: string,
    reason: "error" | "timeout" | "manual",
  ): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    try {
      // Execute custom rollback function if provided
      if (update.rollbackFn) {
        await update.rollbackFn();
      }

      console.warn(
        `Rolled back optimistic update ${updateId} due to ${reason}`,
      );
    } catch (error) {
      console.error(`Failed to rollback optimistic update ${updateId}:`, error);
    } finally {
      // Clean up
      this.pendingUpdates.delete(updateId);

      const timeout = this.rollbackTimeouts.get(updateId);
      if (timeout) {
        clearTimeout(timeout);
        this.rollbackTimeouts.delete(updateId);
      }
    }
  }

  /**
   * Get pending updates for a key
   */
  getPendingUpdates(key: string): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values())
      .filter((update) => update.key === key)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Check if key has pending updates
   */
  hasPendingUpdates(key: string): boolean {
    return Array.from(this.pendingUpdates.values()).some(
      (update) => update.key === key,
    );
  }

  /**
   * Get all pending updates
   */
  getAllPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }

  /**
   * Clear all pending updates
   */
  clearAllUpdates(): void {
    // Clear all timeouts
    for (const timeout of this.rollbackTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.pendingUpdates.clear();
    this.rollbackTimeouts.clear();
  }

  /**
   * Cleanup expired updates
   */
  cleanupExpiredUpdates(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [updateId, update] of this.pendingUpdates) {
      if (now - update.timestamp > this.maxPendingTime) {
        this.rollbackUpdate(updateId, "timeout").catch(console.error);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// ============================================================================
// Main Cache Manager - Orchestrates all caching layers
// ============================================================================

export class NotificationCacheManager {
  private memoryCache: NotificationMemoryCache;
  private indexedDBCache: NotificationIndexedDBCache;
  private invalidationManager: CacheInvalidationManager;
  private optimisticUpdateManager: OptimisticUpdateManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(private config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.memoryCache = new NotificationMemoryCache(config);
    this.indexedDBCache = new NotificationIndexedDBCache(config);
    this.invalidationManager = new CacheInvalidationManager();
    this.optimisticUpdateManager = new OptimisticUpdateManager();

    this.initializeInvalidationListeners();
    this.startBackgroundTasks();
  }

  /**
   * Initialize cache system
   */
  async init(): Promise<void> {
    if (this.config.enableIndexedDB) {
      await this.indexedDBCache.init();
    }
  }

  // ============================================================================
  // Core Cache Operations
  // ============================================================================

  /**
   * Get data from cache (memory first, then IndexedDB)
   */
  async get<T>(key: string, type: CacheType): Promise<T | null> {
    // Try memory cache first
    let data = this.memoryCache.get<T>(key);
    if (data !== null) {
      return data;
    }

    // Try IndexedDB if enabled
    if (this.config.enableIndexedDB) {
      data = await this.indexedDBCache.get<T>(key, type);
      if (data !== null) {
        // Populate memory cache
        this.memoryCache.set(key, data, type);
        return data;
      }
    }

    return null;
  }

  /**
   * Set data in cache (both memory and IndexedDB)
   */
  async set<T>(
    key: string,
    data: T,
    type: CacheType,
    version?: string,
  ): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, data, type, version);

    // Set in IndexedDB if enabled
    if (this.config.enableIndexedDB) {
      await this.indexedDBCache.set(key, data, type, version);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string, type: CacheType): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key);

    let indexedDBDeleted = false;
    if (this.config.enableIndexedDB) {
      indexedDBDeleted = await this.indexedDBCache.delete(key, type);
    }

    return memoryDeleted || indexedDBDeleted;
  }

  /**
   * Clear cache
   */
  async clear(type?: CacheType): Promise<void> {
    this.memoryCache.clear();

    if (this.config.enableIndexedDB) {
      await this.indexedDBCache.clear(type);
    }
  }

  // ============================================================================
  // Optimistic Updates
  // ============================================================================

  /**
   * Apply optimistic update with automatic rollback
   */
  async optimisticUpdate<T>(
    key: string,
    updater: (current: T | null) => T,
    type: CacheType,
    rollbackFn?: () => Promise<void>,
  ): Promise<string> {
    const originalData = await this.get<T>(key, type);
    const optimisticData = updater(originalData);

    // Apply optimistic update to cache
    await this.set(key, optimisticData, type);

    // Register for rollback management
    return this.optimisticUpdateManager.applyOptimisticUpdate(
      key,
      optimisticData,
      originalData ? "update" : "create",
      originalData,
      rollbackFn,
    );
  }

  /**
   * Confirm optimistic update
   */
  async confirmOptimisticUpdate(updateId: string): Promise<void> {
    await this.optimisticUpdateManager.confirmUpdate(updateId);
  }

  /**
   * Rollback optimistic update
   */
  async rollbackOptimisticUpdate(updateId: string): Promise<void> {
    await this.optimisticUpdateManager.rollbackUpdate(updateId, "manual");
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const memoryCount = this.memoryCache.invalidateByPattern(pattern);

    // Trigger invalidation event
    await this.invalidationManager.invalidateByPattern(pattern);

    return memoryCount;
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidationManager.invalidateUser(userId);
  }

  /**
   * Add invalidation listener
   */
  addInvalidationListener(
    pattern: string,
    listener: InvalidationListener,
  ): () => void {
    return this.invalidationManager.addListener(pattern, listener);
  }

  /**
   * Handle real-time invalidation
   */
  async handleRealtimeInvalidation(data: {
    type: string;
    notificationId?: string;
    userId?: string;
    version?: string;
  }): Promise<void> {
    await this.invalidationManager.handleRealtimeInvalidation(data);
  }

  // ============================================================================
  // Specialized Notification Methods
  // ============================================================================

  /**
   * Cache notifications with user-specific key
   */
  async cacheNotifications(
    userId: string,
    notifications: Notification[],
  ): Promise<void> {
    const key = `notifications_${userId}`;
    await this.set(key, notifications, "notifications");
  }

  /**
   * Get cached notifications for user
   */
  async getCachedNotifications(userId: string): Promise<Notification[] | null> {
    const key = `notifications_${userId}`;
    return this.get<Notification[]>(key, "notifications");
  }

  /**
   * Cache notification preferences
   */
  async cachePreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    const key = `preferences_${userId}`;
    await this.set(key, preferences, "preferences");
  }

  /**
   * Get cached preferences
   */
  async getCachedPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    const key = `preferences_${userId}`;
    return this.get<NotificationPreferences>(key, "preferences");
  }

  /**
   * Cache device tokens
   */
  async cacheDeviceTokens(
    userId: string,
    tokens: DeviceToken[],
  ): Promise<void> {
    const key = `device_tokens_${userId}`;
    await this.set(key, tokens, "deviceTokens");
  }

  /**
   * Get cached device tokens
   */
  async getCachedDeviceTokens(userId: string): Promise<DeviceToken[] | null> {
    const key = `device_tokens_${userId}`;
    return this.get<DeviceToken[]>(key, "deviceTokens");
  }

  /**
   * Cache notification templates
   */
  async cacheTemplates(templates: NotificationTemplate[]): Promise<void> {
    const key = "templates";
    await this.set(key, templates, "templates");
  }

  /**
   * Get cached templates
   */
  async getCachedTemplates(): Promise<NotificationTemplate[] | null> {
    const key = "templates";
    return this.get<NotificationTemplate[]>(key, "templates");
  }

  // ============================================================================
  // Cache Warming Strategies
  // ============================================================================

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(userId: string): Promise<void> {
    try {
      // This would typically be called after successful API responses
      // to pre-populate cache with likely-to-be-accessed data

      // Example: Pre-load user preferences if not cached
      const preferences = await this.getCachedPreferences(userId);
      if (!preferences) {
        // Would trigger API call to load preferences
        console.log(`Cache warming: preferences needed for user ${userId}`);
      }

      // Example: Pre-load templates if not cached
      const templates = await this.getCachedTemplates();
      if (!templates) {
        console.log("Cache warming: templates needed");
      }
    } catch (error) {
      console.warn("Cache warming failed:", error);
    }
  }

  /**
   * Pre-fetch related data based on current cache state
   */
  async prefetchRelatedData(key: string, type: CacheType): Promise<void> {
    // Implementation would depend on data relationships
    // For example, when caching notifications, also prefetch preferences
    if (type === "notifications") {
      const userId = this.extractUserIdFromKey(key);
      if (userId) {
        await this.warmCache(userId);
      }
    }
  }

  // ============================================================================
  // Monitoring and Metrics
  // ============================================================================

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): {
    memory: CacheMetrics;
    storage: { usage: number; quota: number };
    pendingUpdates: number;
    invalidationEvents: number;
  } {
    return {
      memory: this.memoryCache.getMetrics(),
      storage: { usage: 0, quota: 0 }, // Will be populated by async call
      pendingUpdates:
        this.optimisticUpdateManager.getAllPendingUpdates().length,
      invalidationEvents: 0, // Would track invalidation event count
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ usage: number; quota: number }> {
    if (this.config.enableIndexedDB) {
      return this.indexedDBCache.getStorageStats();
    }
    return { usage: 0, quota: 0 };
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    metrics: Record<string, unknown>;
  }> {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // Check hit ratio
    if (metrics.memory.hitRatio < 0.5) {
      issues.push("Low cache hit ratio");
    }

    // Check memory usage
    if (metrics.memory.memoryUsage > this.config.maxMemorySize * 0.9) {
      issues.push("High memory usage");
    }

    // Check pending updates
    if (metrics.pendingUpdates > 100) {
      issues.push("Too many pending optimistic updates");
    }

    const status =
      issues.length === 0
        ? "healthy"
        : issues.length <= 2
          ? "degraded"
          : "unhealthy";

    return { status, issues, metrics };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeInvalidationListeners(): void {
    // Listen for all cache invalidation events
    this.invalidationManager.addListener("*", async (event) => {
      // Invalidate memory cache for affected keys
      for (const key of event.keys) {
        if (key.includes("*")) {
          this.memoryCache.invalidateByPattern(key);
        } else {
          this.memoryCache.delete(key);
        }
      }
    });
  }

  private startBackgroundTasks(): void {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      async () => {
        try {
          if (this.config.enableIndexedDB) {
            const deletedCount = await this.indexedDBCache.cleanup();
            if (deletedCount > 0) {
              console.log(`Cleaned up ${deletedCount} expired cache entries`);
            }
          }

          // Cleanup expired optimistic updates
          const expiredUpdates =
            this.optimisticUpdateManager.cleanupExpiredUpdates();
          if (expiredUpdates > 0) {
            console.log(
              `Cleaned up ${expiredUpdates} expired optimistic updates`,
            );
          }
        } catch (error) {
          console.warn("Cache cleanup failed:", error);
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    // Log metrics every minute if enabled
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        const metrics = this.getMetrics();
        console.log("Cache metrics:", metrics);
      }, 60 * 1000); // 1 minute
    }
  }

  private extractUserIdFromKey(key: string): string | undefined {
    const match = key.match(/_([^_]+)$/);
    return match ? match[1] : undefined;
  }

  /**
   * Cleanup and destroy cache manager
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Cleanup managers
    this.invalidationManager.destroy();
    this.optimisticUpdateManager.clearAllUpdates();

    // Close IndexedDB
    if (this.config.enableIndexedDB) {
      await this.indexedDBCache.close();
    }

    // Clear memory cache
    this.memoryCache.clear();
  }
}

// ============================================================================
// Singleton Instance and Factory
// ============================================================================

let cacheManagerInstance: NotificationCacheManager | null = null;

/**
 * Get or create singleton cache manager instance
 */
export function getNotificationCacheManager(
  config?: Partial<CacheConfig>,
): NotificationCacheManager {
  if (!cacheManagerInstance) {
    const fullConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
    cacheManagerInstance = new NotificationCacheManager(fullConfig);
  }
  return cacheManagerInstance;
}

/**
 * Initialize cache manager with custom config
 */
export async function initializeNotificationCache(
  config?: Partial<CacheConfig>,
): Promise<NotificationCacheManager> {
  const manager = getNotificationCacheManager(config);
  await manager.init();
  return manager;
}

/**
 * Destroy singleton cache manager
 */
export async function destroyNotificationCache(): Promise<void> {
  if (cacheManagerInstance) {
    await cacheManagerInstance.destroy();
    cacheManagerInstance = null;
  }
}
