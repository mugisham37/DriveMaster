/**
 * Offline Content Cache Manager
 * 
 * Caches lesson data and user progress for offline access.
 * Displays "cached content" indicator when offline.
 * 
 * Requirements: 11.2
 * Task: 12.3
 */

// ============================================================================
// Types
// ============================================================================

export interface CachedContent {
  id: string;
  type: "lesson" | "progress" | "user-data" | "content-item";
  data: unknown;
  cachedAt: Date;
  expiresAt: Date;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  userId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Content Cache Manager
// ============================================================================

export class ContentCacheManager {
  private dbName = "learning-platform-cache";
  private storeName = "content";
  private version = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the cache database
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === "undefined" || !("indexedDB" in window)) {
      throw new Error("IndexedDB is not supported");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open cache database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });

          objectStore.createIndex("type", "type", { unique: false });
          objectStore.createIndex("userId", "userId", { unique: false });
          objectStore.createIndex("cachedAt", "cachedAt", { unique: false });
          objectStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return this.db;
  }

  /**
   * Cache content
   */
  async cacheContent(
    id: string,
    type: CachedContent["type"],
    data: unknown,
    options: CacheOptions = {}
  ): Promise<void> {
    const db = await this.ensureDB();

    const {
      ttl = 24 * 60 * 60 * 1000, // 24 hours default
      userId,
      metadata,
    } = options;

    const cachedContent: CachedContent = {
      id,
      type,
      data,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      ...(userId && { userId }),
      ...(metadata && { metadata }),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const contentToStore = {
        ...cachedContent,
        cachedAt: cachedContent.cachedAt.toISOString(),
        expiresAt: cachedContent.expiresAt.toISOString(),
      };

      const request = store.put(contentToStore);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to cache content: ${request.error?.message}`));
    });
  }

  /**
   * Get cached content
   */
  async getCachedContent(id: string): Promise<CachedContent | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
          return;
        }

        const content = request.result as Record<string, unknown>;
        const cachedContent: CachedContent = {
          ...content,
          cachedAt: new Date(content.cachedAt as string),
          expiresAt: new Date(content.expiresAt as string),
        } as CachedContent;

        // Check if expired
        if (cachedContent.expiresAt < new Date()) {
          // Delete expired content
          this.deleteCachedContent(id).catch(console.error);
          resolve(null);
          return;
        }

        resolve(cachedContent);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cached content: ${request.error?.message}`));
    });
  }

  /**
   * Get all cached content by type
   */
  async getCachedContentByType(type: CachedContent["type"]): Promise<CachedContent[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("type");
      const request = index.getAll(type);

      request.onsuccess = () => {
        const now = new Date();
        const contents = request.result
          .map((content: Record<string, unknown>) => ({
            ...content,
            cachedAt: new Date(content.cachedAt as string),
            expiresAt: new Date(content.expiresAt as string),
          }) as CachedContent)
          .filter((content) => content.expiresAt >= now);

        resolve(contents);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cached content by type: ${request.error?.message}`));
    });
  }

  /**
   * Get all cached content for a user
   */
  async getCachedContentByUserId(userId: string): Promise<CachedContent[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const now = new Date();
        const contents = request.result
          .map((content: Record<string, unknown>) => ({
            ...content,
            cachedAt: new Date(content.cachedAt as string),
            expiresAt: new Date(content.expiresAt as string),
          }) as CachedContent)
          .filter((content) => content.expiresAt >= now);

        resolve(contents);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cached content by user: ${request.error?.message}`));
    });
  }

  /**
   * Delete cached content
   */
  async deleteCachedContent(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to delete cached content: ${request.error?.message}`));
    });
  }

  /**
   * Clear all cached content
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear cache: ${request.error?.message}`));
    });
  }

  /**
   * Clear expired content
   */
  async clearExpired(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("expiresAt");

      const now = new Date().toISOString();
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () =>
        reject(new Error(`Failed to clear expired content: ${request.error?.message}`));
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    totalSize: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as Record<string, unknown>[];

        const byType: Record<string, number> = {};
        let oldestItem: Date | null = null;
        let newestItem: Date | null = null;

        for (const item of items) {
          const type = item.type as string;
          byType[type] = (byType[type] || 0) + 1;

          const cachedAt = new Date(item.cachedAt as string);

          if (!oldestItem || cachedAt < oldestItem) {
            oldestItem = cachedAt;
          }

          if (!newestItem || cachedAt > newestItem) {
            newestItem = cachedAt;
          }
        }

        resolve({
          totalItems: items.length,
          byType,
          totalSize: JSON.stringify(items).length,
          oldestItem,
          newestItem,
        });
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cache stats: ${request.error?.message}`));
    });
  }

  /**
   * Check if content is cached
   */
  async isCached(id: string): Promise<boolean> {
    const content = await this.getCachedContent(id);
    return content !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheManager: ContentCacheManager | null = null;

export function getContentCacheManager(): ContentCacheManager {
  if (!cacheManager) {
    cacheManager = new ContentCacheManager();
  }

  return cacheManager;
}

/**
 * Check if content caching is supported
 */
export function isContentCachingSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
