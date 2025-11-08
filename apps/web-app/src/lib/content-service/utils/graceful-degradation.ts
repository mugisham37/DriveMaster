/**
 * Graceful Degradation Utilities
 *
 * Provides fallback mechanisms when services are unavailable
 */

export interface DegradationConfig {
  enableCache: boolean;
  enableOfflineMode: boolean;
  fallbackData?: unknown;
  cacheRetentionTime?: number;
  healthCheckInterval?: number;
  degradationThreshold?: number;
  offlineThreshold?: number;
  fallbackStrategies?: Record<string, "cache" | "queue" | "error">;
}

export interface DegradationResult<T> {
  data: T | null;
  fromCache: boolean;
  offline: boolean;
  degraded: boolean;
}

export type ServiceStatus = "online" | "degraded" | "offline";

export interface ServiceHealth {
  status: ServiceStatus;
  errorRate: number;
  lastChecked: Date;
  consecutiveFailures: number;
}

export interface OfflineQueueStatus {
  queuedOperations: number;
  isPaused: boolean;
  lastProcessed?: Date;
}

export class GracefulDegradationManager {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private serviceStatus: ServiceStatus = "online";
  private errorCount = 0;
  private successCount = 0;
  private config: DegradationConfig;
  private offlineQueue: Array<{ operation: string; data: unknown; timestamp: number }> = [];
  private healthListeners: Array<(health: ServiceHealth) => void> = [];

  constructor(config: DegradationConfig) {
    this.config = {
      cacheRetentionTime: 3600000,
      degradationThreshold: 25,
      offlineThreshold: 50,
      fallbackStrategies: {},
      ...config,
      enableCache: config.enableCache !== undefined ? config.enableCache : true,
      enableOfflineMode:
        config.enableOfflineMode !== undefined
          ? config.enableOfflineMode
          : true,
    };
  }

  async executeWithDegradation<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    strategyType: string,
  ): Promise<DegradationResult<T>> {
    try {
      const data = await operation();

      // Cache successful result
      if (this.config.enableCache) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      this.successCount++;
      this.updateServiceStatus();

      return {
        data,
        fromCache: false,
        offline: false,
        degraded: false,
      };
    } catch (error) {
      this.errorCount++;
      this.updateServiceStatus();

      // Try to get from cache
      const cached = this.cache.get(cacheKey);
      const strategies = this.config.fallbackStrategies || {};
      const strategy = strategies[strategyType] || "error";

      if (strategy === "cache" && cached && this.config.cacheRetentionTime) {
        const age = Date.now() - cached.timestamp;
        if (age < this.config.cacheRetentionTime) {
          return {
            data: cached.data as T,
            fromCache: true,
            offline: false,
            degraded: true,
          };
        }
      }

      // Try offline mode
      if (this.config.enableOfflineMode && strategy === "queue") {
        return {
          data: null,
          fromCache: false,
          offline: true,
          degraded: true,
        };
      }

      // Re-throw if no fallback available
      throw error;
    }
  }

  private updateServiceStatus(): void {
    const total = this.errorCount + this.successCount;
    if (total === 0) return;

    const errorRate = (this.errorCount / total) * 100;
    const offlineThreshold = this.config.offlineThreshold || 50;
    const degradationThreshold = this.config.degradationThreshold || 25;

    if (errorRate >= offlineThreshold) {
      this.serviceStatus = "offline";
    } else if (errorRate >= degradationThreshold) {
      this.serviceStatus = "degraded";
    } else {
      this.serviceStatus = "online";
    }

    // Notify listeners of health changes
    this.notifyHealthListeners();
  }

  getStatus(): ServiceStatus {
    return this.serviceStatus;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getServiceHealth(): ServiceHealth {
    const total = this.errorCount + this.successCount;
    const errorRate = total === 0 ? 0 : (this.errorCount / total) * 100;

    return {
      status: this.serviceStatus,
      errorRate,
      lastChecked: new Date(),
      consecutiveFailures: this.errorCount,
    };
  }

  isFeatureAvailable(feature: string): boolean {
    const strategies = this.config.fallbackStrategies || {};
    const strategy = strategies[feature];

    if (this.serviceStatus === "offline") {
      return strategy === "cache" || strategy === "queue";
    }

    if (this.serviceStatus === "degraded") {
      return strategy !== "error";
    }

    return true;
  }

  getOfflineQueueStatus(): OfflineQueueStatus {
    const lastProcessed = this.offlineQueue.length > 0 ? new Date() : undefined;
    return {
      queuedOperations: this.offlineQueue.length,
      isPaused: this.serviceStatus === "online",
      ...(lastProcessed && { lastProcessed }),
    };
  }

  async processOfflineQueue(): Promise<void> {
    if (this.serviceStatus !== "online") {
      console.warn("[Graceful Degradation] Cannot process queue while offline or degraded");
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        console.log(`[Graceful Degradation] Processing queued operation: ${item.operation}`);
        // In a real implementation, you would execute the queued operation here
      } catch (error) {
        console.error(`[Graceful Degradation] Failed to process queued operation:`, error);
        // Re-queue on failure
        this.offlineQueue.push(item);
      }
    }
  }

  addHealthListener(listener: (health: ServiceHealth) => void): () => void {
    this.healthListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.healthListeners.indexOf(listener);
      if (index > -1) {
        this.healthListeners.splice(index, 1);
      }
    };
  }

  private notifyHealthListeners(): void {
    const health = this.getServiceHealth();
    this.healthListeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        console.error("[Graceful Degradation] Error in health listener:", error);
      }
    });
  }

  destroy(): void {
    this.cache.clear();
    this.offlineQueue = [];
    this.healthListeners = [];
  }
}

export function createGracefulDegradationManager(
  config: DegradationConfig,
): GracefulDegradationManager {
  return new GracefulDegradationManager(config);
}

/**
 * Executes an operation with graceful degradation
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  config: DegradationConfig,
): Promise<DegradationResult<T>> {
  try {
    const data = await operation();
    return {
      data,
      fromCache: false,
      offline: false,
      degraded: false,
    };
  } catch (error) {
    console.warn("[Graceful Degradation]", error);

    // Try to use fallback data
    if (config.fallbackData) {
      return {
        data: config.fallbackData as T,
        fromCache: true,
        offline: false,
        degraded: true,
      };
    }

    // If offline mode is enabled, return null but don't throw
    if (config.enableOfflineMode) {
      return {
        data: null,
        fromCache: false,
        offline: true,
        degraded: true,
      };
    }

    // Re-throw if no degradation options available
    throw error;
  }
}

/**
 * Checks if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Sets up online/offline event listeners
 */
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
