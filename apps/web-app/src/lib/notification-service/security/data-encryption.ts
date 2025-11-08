/**
 * Data Encryption and Storage Security for Notification Service
 * Implements encryption for sensitive data in IndexedDB and secure storage mechanisms
 */

import type {
  Notification,
  NotificationPreferences,
  DeviceToken,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Encryption Configuration
// ============================================================================

const ENCRYPTION_CONFIG = {
  algorithm: "AES-GCM",
  keyLength: 256,
  ivLength: 12,
  tagLength: 16,
  keyDerivation: {
    algorithm: "PBKDF2",
    iterations: 100000,
    hash: "SHA-256",
  },
  storageKeys: {
    encryptionKey: "notification_encryption_key",
    salt: "notification_salt",
    keyVersion: "notification_key_version",
  },
};

// ============================================================================
// Encryption Manager Class
// ============================================================================

export class NotificationDataEncryption {
  private cryptoKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private keyVersion: number = 1;

  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Check if we have existing encryption setup
      const existingSalt = localStorage.getItem(
        ENCRYPTION_CONFIG.storageKeys.salt,
      );
      const existingKeyVersion = localStorage.getItem(
        ENCRYPTION_CONFIG.storageKeys.keyVersion,
      );

      if (existingSalt && existingKeyVersion) {
        // Use existing salt and key version
        this.salt = new Uint8Array(JSON.parse(existingSalt));
        this.keyVersion = parseInt(existingKeyVersion, 10);
      } else {
        // Generate new salt and key version
        this.salt = crypto.getRandomValues(new Uint8Array(32));
        this.keyVersion = 1;

        // Store salt and key version
        localStorage.setItem(
          ENCRYPTION_CONFIG.storageKeys.salt,
          JSON.stringify(Array.from(this.salt)),
        );
        localStorage.setItem(
          ENCRYPTION_CONFIG.storageKeys.keyVersion,
          this.keyVersion.toString(),
        );
      }

      // Derive encryption key
      await this.deriveEncryptionKey();
    } catch (error) {
      console.error("Failed to initialize encryption:", error);
      throw this.createEncryptionError(
        "Failed to initialize encryption system",
        "ENCRYPTION_INIT_FAILED",
      );
    }
  }

  /**
   * Derive encryption key from user session
   */
  private async deriveEncryptionKey(): Promise<void> {
    try {
      // Use a combination of session data and browser fingerprint for key derivation
      const sessionData = this.getSessionIdentifier();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(sessionData),
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
      );

      // Ensure salt is a proper Uint8Array with ArrayBuffer backing
      const saltArray = new Uint8Array(this.salt!);

      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: ENCRYPTION_CONFIG.keyDerivation.algorithm,
          salt: saltArray,
          iterations: ENCRYPTION_CONFIG.keyDerivation.iterations,
          hash: ENCRYPTION_CONFIG.keyDerivation.hash,
        },
        keyMaterial,
        {
          name: ENCRYPTION_CONFIG.algorithm,
          length: ENCRYPTION_CONFIG.keyLength,
        },
        false,
        ["encrypt", "decrypt"],
      );
    } catch (error) {
      console.error("Failed to derive encryption key:", error);
      throw this.createEncryptionError(
        "Failed to derive encryption key",
        "KEY_DERIVATION_FAILED",
      );
    }
  }

  /**
   * Get session identifier for key derivation
   */
  private getSessionIdentifier(): string {
    // Combine multiple sources for a unique session identifier
    const sources = [
      // User ID from session storage or local storage
      sessionStorage.getItem("user_id") ||
        localStorage.getItem("user_id") ||
        "anonymous",
      // Browser fingerprint components
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().toDateString(), // Changes daily for key rotation
      this.keyVersion.toString(),
    ];

    return sources.join("|");
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: unknown): Promise<string> {
    if (!this.cryptoKey) {
      await this.initializeEncryption();
    }

    try {
      const plaintext = JSON.stringify(data);
      const plaintextBytes = new TextEncoder().encode(plaintext);
      const iv = crypto.getRandomValues(
        new Uint8Array(ENCRYPTION_CONFIG.ivLength),
      );

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
        },
        this.cryptoKey!,
        plaintextBytes,
      );

      // Combine IV and ciphertext
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("Encryption failed:", error);
      throw this.createEncryptionError(
        "Failed to encrypt data",
        "ENCRYPTION_FAILED",
      );
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData<T = unknown>(encryptedData: string): Promise<T> {
    if (!this.cryptoKey) {
      await this.initializeEncryption();
    }

    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // Extract IV and ciphertext
      const iv = combined.slice(0, ENCRYPTION_CONFIG.ivLength);
      const ciphertext = combined.slice(ENCRYPTION_CONFIG.ivLength);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv,
        },
        this.cryptoKey!,
        ciphertext,
      );

      const plaintext = new TextDecoder().decode(decrypted);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw this.createEncryptionError(
        "Failed to decrypt data",
        "DECRYPTION_FAILED",
      );
    }
  }

  /**
   * Encrypt notification data for storage
   */
  async encryptNotification(notification: Notification): Promise<string> {
    // Only encrypt sensitive fields
    const sensitiveData = {
      id: notification.id,
      userId: notification.userId,
      data: notification.data,
      templateData: notification.templateData,
    };

    return this.encryptData(sensitiveData);
  }

  /**
   * Decrypt notification data from storage
   */
  async decryptNotification(
    encryptedData: string,
  ): Promise<Partial<Notification>> {
    return this.decryptData<Partial<Notification>>(encryptedData);
  }

  /**
   * Encrypt device token for storage
   */
  async encryptDeviceToken(deviceToken: DeviceToken): Promise<string> {
    // Encrypt the entire device token as it's sensitive
    return this.encryptData(deviceToken);
  }

  /**
   * Decrypt device token from storage
   */
  async decryptDeviceToken(encryptedData: string): Promise<DeviceToken> {
    return this.decryptData<DeviceToken>(encryptedData);
  }

  /**
   * Encrypt notification preferences
   */
  async encryptPreferences(
    preferences: NotificationPreferences,
  ): Promise<string> {
    return this.encryptData(preferences);
  }

  /**
   * Decrypt notification preferences
   */
  async decryptPreferences(
    encryptedData: string,
  ): Promise<NotificationPreferences> {
    return this.decryptData<NotificationPreferences>(encryptedData);
  }

  /**
   * Clear all encryption keys and data
   */
  clearEncryptionData(): void {
    try {
      // Clear stored encryption data
      localStorage.removeItem(ENCRYPTION_CONFIG.storageKeys.salt);
      localStorage.removeItem(ENCRYPTION_CONFIG.storageKeys.keyVersion);

      // Clear in-memory keys
      this.cryptoKey = null;
      this.salt = null;
      this.keyVersion = 1;
    } catch (error) {
      console.error("Failed to clear encryption data:", error);
    }
  }

  /**
   * Rotate encryption keys (for security)
   */
  async rotateEncryptionKeys(): Promise<void> {
    try {
      // Increment key version
      this.keyVersion += 1;

      // Generate new salt
      this.salt = crypto.getRandomValues(new Uint8Array(32));

      // Store new values
      localStorage.setItem(
        ENCRYPTION_CONFIG.storageKeys.salt,
        JSON.stringify(Array.from(this.salt)),
      );
      localStorage.setItem(
        ENCRYPTION_CONFIG.storageKeys.keyVersion,
        this.keyVersion.toString(),
      );

      // Derive new key
      await this.deriveEncryptionKey();
    } catch (error) {
      console.error("Failed to rotate encryption keys:", error);
      throw this.createEncryptionError(
        "Failed to rotate encryption keys",
        "KEY_ROTATION_FAILED",
      );
    }
  }

  /**
   * Create encryption error
   */
  private createEncryptionError(
    message: string,
    code: string,
  ): NotificationError {
    return {
      type: "service",
      message,
      code,
      recoverable: false,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Secure Storage Manager
// ============================================================================

export class SecureNotificationStorage {
  private encryption: NotificationDataEncryption;
  private dbName = "NotificationSecureStorage";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.encryption = new NotificationDataEncryption();
    this.initializeDatabase();
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("notifications")) {
          const notificationStore = db.createObjectStore("notifications", {
            keyPath: "id",
          });
          notificationStore.createIndex("userId", "userId", { unique: false });
          notificationStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("deviceTokens")) {
          const tokenStore = db.createObjectStore("deviceTokens", {
            keyPath: "id",
          });
          tokenStore.createIndex("userId", "userId", { unique: false });
        }

        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences", { keyPath: "userId" });
        }
      };
    });
  }

  /**
   * Store encrypted notification
   */
  async storeNotification(notification: Notification): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const encryptedData =
        await this.encryption.encryptNotification(notification);

      const storageItem = {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt,
        timestamp: Date.now(),
        encryptedData,
        // Store non-sensitive fields in plain text for querying
        title: notification.title,
        isRead: notification.status.isRead,
      };

      const transaction = this.db!.transaction(["notifications"], "readwrite");
      const store = transaction.objectStore("notifications");
      await this.promisifyRequest(store.put(storageItem));
    } catch (error) {
      console.error("Failed to store notification:", error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt notification
   */
  async getNotification(notificationId: string): Promise<Notification | null> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const transaction = this.db!.transaction(["notifications"], "readonly");
      const store = transaction.objectStore("notifications");
      const result = await this.promisifyRequest(store.get(notificationId));

      if (!result) {
        return null;
      }

      const decryptedData = await this.encryption.decryptNotification(
        result.encryptedData,
      );

      // Combine decrypted sensitive data with plain text data
      return {
        ...result,
        ...decryptedData,
        status: {
          isRead: result.isRead,
          isDelivered: true,
          deliveredAt: new Date(result.timestamp),
        },
      } as Notification;
    } catch (error) {
      console.error("Failed to retrieve notification:", error);
      return null;
    }
  }

  /**
   * Store encrypted device token
   */
  async storeDeviceToken(deviceToken: DeviceToken): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const encryptedData =
        await this.encryption.encryptDeviceToken(deviceToken);

      const storageItem = {
        id: deviceToken.id,
        userId: deviceToken.userId,
        platform: deviceToken.platform,
        isActive: deviceToken.isActive,
        timestamp: Date.now(),
        encryptedData,
      };

      const transaction = this.db!.transaction(["deviceTokens"], "readwrite");
      const store = transaction.objectStore("deviceTokens");
      await this.promisifyRequest(store.put(storageItem));
    } catch (error) {
      console.error("Failed to store device token:", error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt device token
   */
  async getDeviceToken(tokenId: string): Promise<DeviceToken | null> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const transaction = this.db!.transaction(["deviceTokens"], "readonly");
      const store = transaction.objectStore("deviceTokens");
      const result = await this.promisifyRequest(store.get(tokenId));

      if (!result) {
        return null;
      }

      return await this.encryption.decryptDeviceToken(result.encryptedData);
    } catch (error) {
      console.error("Failed to retrieve device token:", error);
      return null;
    }
  }

  /**
   * Store encrypted preferences
   */
  async storePreferences(preferences: NotificationPreferences): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const encryptedData =
        await this.encryption.encryptPreferences(preferences);

      const storageItem = {
        userId: preferences.userId,
        timestamp: Date.now(),
        encryptedData,
      };

      const transaction = this.db!.transaction(["preferences"], "readwrite");
      const store = transaction.objectStore("preferences");
      await this.promisifyRequest(store.put(storageItem));
    } catch (error) {
      console.error("Failed to store preferences:", error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt preferences
   */
  async getPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    try {
      const transaction = this.db!.transaction(["preferences"], "readonly");
      const store = transaction.objectStore("preferences");
      const result = await this.promisifyRequest(store.get(userId));

      if (!result) {
        return null;
      }

      return await this.encryption.decryptPreferences(result.encryptedData);
    } catch (error) {
      console.error("Failed to retrieve preferences:", error);
      return null;
    }
  }

  /**
   * Clear all stored data (on logout)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const transaction = this.db.transaction(
        ["notifications", "deviceTokens", "preferences"],
        "readwrite",
      );

      await Promise.all([
        this.promisifyRequest(transaction.objectStore("notifications").clear()),
        this.promisifyRequest(transaction.objectStore("deviceTokens").clear()),
        this.promisifyRequest(transaction.objectStore("preferences").clear()),
      ]);

      // Clear encryption keys
      this.encryption.clearEncryptionData();
    } catch (error) {
      console.error("Failed to clear stored data:", error);
      throw error;
    }
  }

  /**
   * Clear expired data
   */
  async clearExpiredData(
    maxAge: number = 30 * 24 * 60 * 60 * 1000,
  ): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const cutoffTime = Date.now() - maxAge;
      const transaction = this.db.transaction(["notifications"], "readwrite");
      const store = transaction.objectStore("notifications");
      const index = store.index("timestamp");

      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to clear expired data:", error);
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      // Sample a few records and try to decrypt them
      const transaction = this.db.transaction(["notifications"], "readonly");
      const store = transaction.objectStore("notifications");
      const request = store.openCursor();

      let sampleCount = 0;
      const maxSamples = 5;

      return new Promise<boolean>((resolve) => {
        request.onsuccess = async () => {
          const cursor = request.result;
          if (cursor && sampleCount < maxSamples) {
            try {
              await this.encryption.decryptNotification(
                cursor.value.encryptedData,
              );
              sampleCount++;
              cursor.continue();
            } catch (error) {
              console.error("Data integrity check failed:", error);
              resolve(false);
            }
          } else {
            resolve(true);
          }
        };
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error("Data integrity verification failed:", error);
      return false;
    }
  }

  /**
   * Promisify IndexedDB request
   */
  private promisifyRequest<T = unknown>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// Data Cleanup Manager
// ============================================================================

export class NotificationDataCleanup {
  private secureStorage: SecureNotificationStorage;

  constructor() {
    this.secureStorage = new SecureNotificationStorage();
  }

  /**
   * Setup automatic cleanup on logout
   */
  setupLogoutCleanup(): void {
    // Listen for logout events
    window.addEventListener("beforeunload", this.handleLogout.bind(this));

    // Listen for storage events (cross-tab logout)
    window.addEventListener("storage", (event) => {
      if (event.key === "auth_logout" && event.newValue === "true") {
        this.handleLogout();
      }
    });

    // Listen for session expiration
    document.addEventListener(
      "auth:session-expired",
      this.handleLogout.bind(this),
    );
  }

  /**
   * Handle logout cleanup
   */
  private async handleLogout(): Promise<void> {
    try {
      await this.secureStorage.clearAllData();
      console.log("Notification data cleared on logout");
    } catch (error) {
      console.error("Failed to clear notification data on logout:", error);
    }
  }

  /**
   * Setup periodic cleanup
   */
  setupPeriodicCleanup(): void {
    // Clean up expired data every hour
    setInterval(
      async () => {
        try {
          await this.secureStorage.clearExpiredData();
          console.log("Expired notification data cleaned up");
        } catch (error) {
          console.error("Failed to clean up expired data:", error);
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  /**
   * Manual cleanup
   */
  async performCleanup(): Promise<void> {
    await this.secureStorage.clearExpiredData();
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const notificationDataEncryption = new NotificationDataEncryption();
export const secureNotificationStorage = new SecureNotificationStorage();
export const notificationDataCleanup = new NotificationDataCleanup();

// Initialize cleanup handlers
notificationDataCleanup.setupLogoutCleanup();
notificationDataCleanup.setupPeriodicCleanup();
