/**
 * IndexedDB Manager for Offline Support
 * 
 * Provides a robust IndexedDB wrapper for storing offline activities
 * with better persistence than localStorage.
 * 
 * Requirements: 11.2, 11.3
 * Task: 12.2
 */

// ============================================================================
// Types
// ============================================================================

export interface OfflineActivity {
  id: string;
  userId: string;
  activityType: string;
  data: unknown;
  timestamp: Date;
  queuedAt: Date;
  retryCount: number;
  maxRetries: number;
  status: "pending" | "syncing" | "failed" | "synced";
  error?: string;
}

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  storeName: string;
}

// ============================================================================
// IndexedDB Manager
// ============================================================================

export class IndexedDBManager {
  private dbName: string;
  private version: number;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(config: IndexedDBConfig) {
    this.dbName = config.dbName;
    this.version = config.version;
    this.storeName = config.storeName;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      throw new Error("IndexedDB is not supported in this environment");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });

          // Create indexes
          objectStore.createIndex("userId", "userId", { unique: false });
          objectStore.createIndex("status", "status", { unique: false });
          objectStore.createIndex("queuedAt", "queuedAt", { unique: false });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
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
   * Add an activity to the queue
   */
  async addActivity(activity: OfflineActivity): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Convert dates to ISO strings for storage
      const activityToStore = {
        ...activity,
        timestamp: activity.timestamp.toISOString(),
        queuedAt: activity.queuedAt.toISOString(),
      };

      const request = store.add(activityToStore);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to add activity: ${request.error?.message}`));
    });
  }

  /**
   * Get all activities
   */
  async getAllActivities(): Promise<OfflineActivity[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const activities = request.result.map((activity: Record<string, unknown>) => ({
          ...activity,
          timestamp: new Date(activity.timestamp as string),
          queuedAt: new Date(activity.queuedAt as string),
        })) as OfflineActivity[];

        resolve(activities);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get activities: ${request.error?.message}`));
    });
  }

  /**
   * Get activities by status
   */
  async getActivitiesByStatus(status: OfflineActivity["status"]): Promise<OfflineActivity[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("status");
      const request = index.getAll(status);

      request.onsuccess = () => {
        const activities = request.result.map((activity: Record<string, unknown>) => ({
          ...activity,
          timestamp: new Date(activity.timestamp as string),
          queuedAt: new Date(activity.queuedAt as string),
        })) as OfflineActivity[];

        resolve(activities);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get activities by status: ${request.error?.message}`));
    });
  }

  /**
   * Get activities by user ID
   */
  async getActivitiesByUserId(userId: string): Promise<OfflineActivity[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const activities = request.result.map((activity: Record<string, unknown>) => ({
          ...activity,
          timestamp: new Date(activity.timestamp as string),
          queuedAt: new Date(activity.queuedAt as string),
        })) as OfflineActivity[];

        resolve(activities);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get activities by user: ${request.error?.message}`));
    });
  }

  /**
   * Update an activity
   */
  async updateActivity(activity: OfflineActivity): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Convert dates to ISO strings for storage
      const activityToStore = {
        ...activity,
        timestamp: activity.timestamp.toISOString(),
        queuedAt: activity.queuedAt.toISOString(),
      };

      const request = store.put(activityToStore);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to update activity: ${request.error?.message}`));
    });
  }

  /**
   * Delete an activity
   */
  async deleteActivity(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to delete activity: ${request.error?.message}`));
    });
  }

  /**
   * Delete multiple activities
   */
  async deleteActivities(ids: string[]): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      let completed = 0;
      let hasError = false;

      for (const id of ids) {
        const request = store.delete(id);

        request.onsuccess = () => {
          completed++;
          if (completed === ids.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          reject(new Error(`Failed to delete activity ${id}: ${request.error?.message}`));
        };
      }

      if (ids.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Clear all activities
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear activities: ${request.error?.message}`));
    });
  }

  /**
   * Get count of activities
   */
  async getCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Failed to get count: ${request.error?.message}`));
    });
  }

  /**
   * Get count by status
   */
  async getCountByStatus(status: OfflineActivity["status"]): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("status");
      const request = index.count(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Failed to get count by status: ${request.error?.message}`));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dbManager: IndexedDBManager | null = null;

export function getIndexedDBManager(): IndexedDBManager {
  if (!dbManager) {
    dbManager = new IndexedDBManager({
      dbName: "learning-platform-offline",
      version: 1,
      storeName: "activities",
    });
  }

  return dbManager;
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
