/**
 * Graceful Degradation Utility
 *
 * Implements graceful degradation with cached data when service unavailable,
 * offline indicators, limited functionality, and service health monitoring
 * Requirements: 7.4
 */

import type { ContentServiceError } from "@/types";

// ============================================================================
// Degradation Types
// ============================================================================

export type ServiceStatus = "online" | "degraded" | "offline" | "maintenance";

export interface ServiceHealth {
  status: ServiceStatus;
  lastCheck: Date;
  responseTime: number | null;
  errorRate: number;
  uptime: number;
  features: FeatureAvailability;
}

export interface FeatureAvailability {
  contentRead: boolean;
  contentWrite: boolean;
  mediaUpload: boolean;
  search: boolean;
  bulkOperations: boolean;
  realTimeUpdates: boolean;
}

export interface DegradationConfig {
  enableOfflineMode: boolean;
  cacheRetentionTime: number;
  healthCheckInterval: number;
  degradationThreshold: number;
  offlineThreshold: number;
  enableServiceWorker: boolean;
  fallbackStrategies: FallbackStrategies;
}

export interface FallbackStrategies {
  contentRead: "cache" | "placeholder" | "error";
  contentWrite: "queue" | "localStorage" | "error";
  mediaUpload: "queue" | "error";
  search: "cache" | "localStorage" | "error";
  bulkOperations: "queue" | "error";
}

export interface CachedData<T = unknown> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: "api" | "cache" | "localStorage" | "fallback";
  stale: boolean;
}

export interface OfflineAction {
  id: string;
  type: "create" | "update" | "delete" | "upload";
  resource: string;
  data: unknown;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// Graceful Degradation Manager
// ============================================================================

export class GracefulDegradationManager {
  private serviceHealth: ServiceHealth;
  private cache = new Map<string, CachedData>();
  private offlineQueue: OfflineAction[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(health: ServiceHealth) => void> = [];

  constructor(private config: DegradationConfig) {
    this.serviceHealth = {
      status: "online",
      lastCheck: new Date(),
      responseTime: null,
      errorRate: 0,
      uptime: 100,
      features: {
        contentRead: true,
        contentWrite: true,
        mediaUpload: true,
        search: true,
        bulkOperations: true,
        realTimeUpdates: true,
      },
    };

    this.initializeHealthMonitoring();
    this.setupNetworkListeners();
    this.loadOfflineQueue();
  }

  /**
   * Attempts to execute an operation with graceful degradation
   */
  async executeWithDegradation<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackStrategy: keyof FallbackStrategies,
  ): Promise<CachedData<T>> {
    try {
      // Try the main operation
      const result = await operation();

      // Cache successful result
      const cachedData: CachedData<T> = {
        data: result,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.config.cacheRetentionTime),
        source: "api",
        stale: false,
      };

      this.cache.set(fallbackKey, cachedData);
      this.recordSuccess();

      return cachedData;
    } catch (error) {
      this.recordError(error);

      // Apply fallback strategy
      return this.applyFallbackStrategy(
        fallbackKey,
        fallbackStrategy,
        error as ContentServiceError,
      );
    }
  }

  /**
   * Applies appropriate fallback strategy based on configuration
   */
  private async applyFallbackStrategy<T>(
    key: string,
    strategy: keyof FallbackStrategies,
    error: ContentServiceError,
  ): Promise<CachedData<T>> {
    const fallbackType = this.config.fallbackStrategies[strategy];

    switch (fallbackType) {
      case "cache":
        return this.getCachedData<T>(key) || this.createErrorFallback<T>();

      case "localStorage":
        return (
          this.getLocalStorageData<T>(key) || this.createErrorFallback<T>()
        );

      case "placeholder":
        return this.createPlaceholderData<T>(key);

      case "queue":
        // For write operations, queue for later
        this.queueOfflineAction(key, "update", {});
        return this.createQueuedFallback<T>(error);

      case "error":
      default:
        return this.createErrorFallback<T>();
    }
  }

  /**
   * Gets cached data if available and not expired
   */
  getCachedData<T>(key: string): CachedData<T> | null {
    const cached = this.cache.get(key) as CachedData<T> | undefined;

    if (!cached) return null;

    const now = new Date();
    const isExpired = now > cached.expiresAt;

    if (isExpired && this.serviceHealth.status === "online") {
      // Remove expired cache when service is online
      this.cache.delete(key);
      return null;
    }

    // Return stale data if service is degraded/offline
    return {
      ...cached,
      stale: isExpired,
      source: "cache",
    };
  }

  /**
   * Gets data from localStorage as fallback
   */
  private getLocalStorageData<T>(key: string): CachedData<T> | null {
    try {
      const stored = localStorage.getItem(`content_service_${key}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        data: parsed.data,
        timestamp: new Date(parsed.timestamp),
        expiresAt: new Date(parsed.expiresAt),
        source: "localStorage",
        stale: new Date() > new Date(parsed.expiresAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Saves data to localStorage for offline access
   */
  saveToLocalStorage<T>(key: string, data: CachedData<T>): void {
    try {
      const toStore = {
        data: data.data,
        timestamp: data.timestamp.toISOString(),
        expiresAt: data.expiresAt.toISOString(),
      };
      localStorage.setItem(`content_service_${key}`, JSON.stringify(toStore));
    } catch (error) {
      console.warn(
        "[GracefulDegradation] Failed to save to localStorage:",
        error,
      );
    }
  }

  /**
   * Creates placeholder data for graceful degradation
   */
  private createPlaceholderData<T>(key: string): CachedData<T> {
    const placeholderData = this.generatePlaceholder<T>(key);

    return {
      data: placeholderData,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60000), // 1 minute
      source: "fallback",
      stale: false,
    };
  }

  /**
   * Creates error fallback data
   */
  private createErrorFallback<T>(): CachedData<T> {
    return {
      data: null as T,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5000), // 5 seconds
      source: "fallback",
      stale: true,
    };
  }

  /**
   * Creates queued fallback for write operations
   */
  private createQueuedFallback<T>(error: ContentServiceError): CachedData<T> {
    return {
      data: { queued: true, error: error.message } as T,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
      source: "fallback",
      stale: false,
    };
  }

  /**
   * Generates appropriate placeholder data based on key
   */
  private generatePlaceholder<T>(key: string): T {
    if (key.includes("content")) {
      return {
        id: "placeholder",
        title: "Content temporarily unavailable",
        content: {
          body: "This content is temporarily unavailable. Please try again later.",
        },
        type: "placeholder",
        status: "draft",
      } as T;
    }

    if (key.includes("search")) {
      return {
        results: [],
        total: 0,
        message: "Search is temporarily unavailable",
      } as T;
    }

    if (key.includes("media")) {
      return {
        id: "placeholder",
        filename: "unavailable.png",
        url: "/images/placeholder.png",
        mimeType: "image/png",
      } as T;
    }

    return {} as T;
  }

  /**
   * Queues offline actions for later execution
   */
  queueOfflineAction(
    resource: string,
    type: OfflineAction["type"],
    data: unknown,
  ): void {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      resource,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.offlineQueue.push(action);
    this.saveOfflineQueue();

    console.log(
      `[GracefulDegradation] Queued offline action: ${type} ${resource}`,
    );
  }

  /**
   * Processes queued offline actions when service comes back online
   */
  async processOfflineQueue(): Promise<void> {
    if (
      this.serviceHealth.status !== "online" ||
      this.offlineQueue.length === 0
    ) {
      return;
    }

    console.log(
      `[GracefulDegradation] Processing ${this.offlineQueue.length} queued actions`,
    );

    const actionsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeOfflineAction(action);
        console.log(
          `[GracefulDegradation] Successfully processed action: ${action.id}`,
        );
      } catch (error) {
        action.retryCount++;

        if (action.retryCount < action.maxRetries) {
          // Re-queue for retry
          this.offlineQueue.push(action);
          console.warn(
            `[GracefulDegradation] Action failed, will retry: ${action.id}`,
          );
        } else {
          console.error(
            `[GracefulDegradation] Action failed permanently: ${action.id}`,
            error,
          );
        }
      }
    }

    this.saveOfflineQueue();
  }

  /**
   * Executes a queued offline action
   */
  private async executeOfflineAction(_action: OfflineAction): Promise<void> {
    // This would integrate with the actual ContentServiceClient
    // For now, we'll simulate the execution
    console.log(
      `[GracefulDegradation] Executing offline action: ${_action.type} ${_action.resource}`,
    );

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate potential failure
    if (Math.random() < 0.1) {
      throw new Error("Simulated execution failure");
    }
  }

  /**
   * Records successful operation for health monitoring
   */
  private recordSuccess(): void {
    // Update service health metrics
    this.updateServiceHealth(true);
  }

  /**
   * Records error for health monitoring
   */
  private recordError(error: unknown): void {
    console.warn("[GracefulDegradation] Operation failed:", error);
    this.updateServiceHealth(false);
  }

  /**
   * Updates service health based on operation results
   */
  private updateServiceHealth(success: boolean): void {
    const now = new Date();

    // Simple health calculation (in production, this would be more sophisticated)
    if (success) {
      if (this.serviceHealth.errorRate > 0) {
        this.serviceHealth.errorRate = Math.max(
          0,
          this.serviceHealth.errorRate - 5,
        );
      }
    } else {
      this.serviceHealth.errorRate = Math.min(
        100,
        this.serviceHealth.errorRate + 10,
      );
    }

    // Update status based on error rate
    const previousStatus = this.serviceHealth.status;

    if (this.serviceHealth.errorRate >= this.config.offlineThreshold) {
      this.serviceHealth.status = "offline";
    } else if (
      this.serviceHealth.errorRate >= this.config.degradationThreshold
    ) {
      this.serviceHealth.status = "degraded";
    } else {
      this.serviceHealth.status = "online";
    }

    // Update feature availability based on status
    this.updateFeatureAvailability();

    this.serviceHealth.lastCheck = now;

    // Notify listeners if status changed
    if (previousStatus !== this.serviceHealth.status) {
      console.log(
        `[GracefulDegradation] Service status changed: ${previousStatus} -> ${this.serviceHealth.status}`,
      );
      this.notifyListeners();
    }
  }

  /**
   * Updates feature availability based on service status
   */
  private updateFeatureAvailability(): void {
    const features = this.serviceHealth.features;

    switch (this.serviceHealth.status) {
      case "online":
        features.contentRead = true;
        features.contentWrite = true;
        features.mediaUpload = true;
        features.search = true;
        features.bulkOperations = true;
        features.realTimeUpdates = true;
        break;

      case "degraded":
        features.contentRead = true;
        features.contentWrite = false;
        features.mediaUpload = false;
        features.search = true;
        features.bulkOperations = false;
        features.realTimeUpdates = false;
        break;

      case "offline":
        features.contentRead = true; // From cache
        features.contentWrite = false;
        features.mediaUpload = false;
        features.search = false;
        features.bulkOperations = false;
        features.realTimeUpdates = false;
        break;

      case "maintenance":
        features.contentRead = false;
        features.contentWrite = false;
        features.mediaUpload = false;
        features.search = false;
        features.bulkOperations = false;
        features.realTimeUpdates = false;
        break;
    }
  }

  /**
   * Initializes health monitoring
   */
  private initializeHealthMonitoring(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck();
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * Performs periodic health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Simple health check (ping endpoint)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      this.serviceHealth.responseTime = responseTime;

      if (response.ok) {
        this.recordSuccess();
      } else {
        this.recordError(new Error(`Health check failed: ${response.status}`));
      }
    } catch (error) {
      this.serviceHealth.responseTime = null;
      this.recordError(error);
    }
  }

  /**
   * Sets up network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      console.log("[GracefulDegradation] Network came back online");
      this.serviceHealth.status = "online";
      this.updateFeatureAvailability();
      this.processOfflineQueue();
      this.notifyListeners();
    });

    window.addEventListener("offline", () => {
      console.log("[GracefulDegradation] Network went offline");
      this.serviceHealth.status = "offline";
      this.updateFeatureAvailability();
      this.notifyListeners();
    });
  }

  /**
   * Loads offline queue from localStorage
   */
  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem("content_service_offline_queue");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.offlineQueue = parsed.map((action: Record<string, unknown>) => ({
          ...action,
          timestamp: new Date(action.timestamp as string),
        })) as OfflineAction[];
        console.log(
          `[GracefulDegradation] Loaded ${this.offlineQueue.length} queued actions`,
        );
      }
    } catch (error) {
      console.warn(
        "[GracefulDegradation] Failed to load offline queue:",
        error,
      );
      this.offlineQueue = [];
    }
  }

  /**
   * Saves offline queue to localStorage
   */
  private saveOfflineQueue(): void {
    try {
      const toStore = this.offlineQueue.map((action) => ({
        ...action,
        timestamp: action.timestamp.toISOString(),
      }));
      localStorage.setItem(
        "content_service_offline_queue",
        JSON.stringify(toStore),
      );
    } catch (error) {
      console.warn(
        "[GracefulDegradation] Failed to save offline queue:",
        error,
      );
    }
  }

  /**
   * Adds a health status listener
   */
  addHealthListener(listener: (health: ServiceHealth) => void): () => void {
    this.listeners.push(listener);

    // Immediately notify with current health
    listener(this.serviceHealth);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifies all health listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.serviceHealth);
      } catch (error) {
        console.error("[GracefulDegradation] Error in health listener:", error);
      }
    });
  }

  /**
   * Gets current service health
   */
  getServiceHealth(): ServiceHealth {
    return { ...this.serviceHealth };
  }

  /**
   * Checks if a feature is available
   */
  isFeatureAvailable(feature: keyof FeatureAvailability): boolean {
    return this.serviceHealth.features[feature];
  }

  /**
   * Gets offline queue status
   */
  getOfflineQueueStatus(): {
    queueLength: number;
    oldestAction: Date | null;
    newestAction: Date | null;
  } {
    const queueLength = this.offlineQueue.length;

    if (queueLength === 0) {
      return { queueLength: 0, oldestAction: null, newestAction: null };
    }

    const timestamps = this.offlineQueue.map((action) => action.timestamp);
    const oldestAction = new Date(
      Math.min(...timestamps.map((t) => t.getTime())),
    );
    const newestAction = new Date(
      Math.max(...timestamps.map((t) => t.getTime())),
    );

    return { queueLength, oldestAction, newestAction };
  }

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log("[GracefulDegradation] Cache cleared");
  }

  /**
   * Clears offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
    console.log("[GracefulDegradation] Offline queue cleared");
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.listeners = [];
    this.cache.clear();

    console.log("[GracefulDegradation] Manager destroyed");
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a graceful degradation manager with default configuration
 */
export function createGracefulDegradationManager(
  config?: Partial<DegradationConfig>,
): GracefulDegradationManager {
  const defaultConfig: DegradationConfig = {
    enableOfflineMode: true,
    cacheRetentionTime: 3600000, // 1 hour
    healthCheckInterval: 30000, // 30 seconds
    degradationThreshold: 25, // 25% error rate
    offlineThreshold: 50, // 50% error rate
    enableServiceWorker: false,
    fallbackStrategies: {
      contentRead: "cache",
      contentWrite: "queue",
      mediaUpload: "queue",
      search: "cache",
      bulkOperations: "queue",
    },
  };

  return new GracefulDegradationManager({ ...defaultConfig, ...config });
}

/**
 * Checks if the browser supports offline functionality
 */
export function supportsOfflineMode(): boolean {
  return (
    "serviceWorker" in navigator &&
    "localStorage" in window &&
    "addEventListener" in window
  );
}

/**
 * Gets network status information
 */
export function getNetworkStatus(): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} {
  const connection = (
    navigator as unknown as {
      connection?: { effectiveType?: string; downlink?: number; rtt?: number };
    }
  ).connection;

  const result: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } = {
    online: navigator.onLine,
  };

  if (connection?.effectiveType)
    result.effectiveType = connection.effectiveType;
  if (connection?.downlink) result.downlink = connection.downlink;
  if (connection?.rtt) result.rtt = connection.rtt;

  return result;
}
