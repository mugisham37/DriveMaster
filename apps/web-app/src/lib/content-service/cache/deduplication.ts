/**
 * Content Service Request Deduplication
 *
 * Implements request deduplication and batching to prevent duplicate API calls
 * Requirements: 6.2
 */

import type { ContentServiceError } from "../../../types/errors";

// ============================================================================
// Request Deduplication Manager
// ============================================================================

interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  timestamp: number;
  resolvers: Array<(value: T) => void>;
  rejectors: Array<(error: ContentServiceError) => void>;
}

interface BatchRequest {
  ids: string[];
  resolver: (results: Record<string, unknown>) => void;
  rejector: (error: ContentServiceError) => void;
  timestamp: number;
}

export class RequestDeduplicationManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private batchRequests = new Map<string, BatchRequest[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private readonly cleanupInterval: NodeJS.Timeout;

  // Configuration
  private readonly deduplicationWindow = 5000; // 5 seconds
  private readonly batchWindow = 100; // 100ms batching window
  private readonly maxBatchSize = 50;
  private readonly cleanupInterval_ms = 30000; // 30 seconds

  constructor() {
    // Clean up expired requests periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval_ms);
  }

  /**
   * Deduplicates a request by key
   * If the same request is already pending, returns the existing promise
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key);

    // If request is already pending and within deduplication window
    if (existing && this.isWithinWindow(existing.timestamp)) {
      // Return a new promise that resolves/rejects with the existing request
      return new Promise<T>((resolve, reject) => {
        existing.resolvers.push(resolve as (value: unknown) => void);
        existing.rejectors.push(reject);
      });
    }

    // Create new request
    const resolvers: Array<(value: T) => void> = [];
    const rejectors: Array<(error: ContentServiceError) => void> = [];

    const promise = requestFn()
      .then((result) => {
        // Resolve all waiting promises
        resolvers.forEach((resolve) => resolve(result));
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Reject all waiting promises
        rejectors.forEach((reject) => reject(error));
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      resolvers: resolvers as Array<(value: unknown) => void>,
      rejectors,
    });

    return promise;
  }

  /**
   * Batches multiple requests of the same type
   * Collects requests for a short period and executes them together
   */
  async batch<T>(
    batchKey: string,
    itemId: string,
    batchFn: (ids: string[]) => Promise<Record<string, T>>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Get or create batch array for this batch key
      if (!this.batchRequests.has(batchKey)) {
        this.batchRequests.set(batchKey, []);
      }

      const batches = this.batchRequests.get(batchKey)!;

      // Find existing batch with space or create new one
      let targetBatch = batches.find(
        (batch) =>
          batch.ids.length < this.maxBatchSize && !batch.ids.includes(itemId),
      );

      if (!targetBatch) {
        targetBatch = {
          ids: [],
          resolver: () => {},
          rejector: () => {},
          timestamp: Date.now(),
        };
        batches.push(targetBatch);
      }

      // Add item to batch
      targetBatch.ids.push(itemId);

      // Store individual resolvers/rejectors
      const originalResolver = targetBatch.resolver;
      const originalRejector = targetBatch.rejector;

      targetBatch.resolver = (results: Record<string, unknown>) => {
        originalResolver(results);
        const result = results[itemId] as T;
        if (result !== undefined) {
          resolve(result);
        } else {
          reject({
            type: "not_found",
            code: "BATCH_ITEM_NOT_FOUND",
            message: `Item ${itemId} not found in batch results`,
            recoverable: false,
            timestamp: new Date(),
          } as ContentServiceError);
        }
      };

      targetBatch.rejector = (error: ContentServiceError) => {
        originalRejector(error);
        reject(error);
      };

      // Set or reset batch timer
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey)!);
      }

      const timer = setTimeout(() => {
        this.executeBatch(batchKey, batchFn);
      }, this.batchWindow);

      this.batchTimers.set(batchKey, timer);
    });
  }

  /**
   * Executes a batch of requests
   */
  private async executeBatch<T>(
    batchKey: string,
    batchFn: (ids: string[]) => Promise<Record<string, T>>,
  ): Promise<void> {
    const batches = this.batchRequests.get(batchKey);
    if (!batches || batches.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Process all batches for this key
    const allBatches = [...batches];
    this.batchRequests.set(batchKey, []);

    for (const batch of allBatches) {
      try {
        const results = await batchFn(batch.ids);
        batch.resolver(results as Record<string, unknown>);
      } catch (error) {
        batch.rejector(error as ContentServiceError);
      }
    }
  }

  /**
   * Checks if a timestamp is within the deduplication window
   */
  private isWithinWindow(timestamp: number): boolean {
    return Date.now() - timestamp < this.deduplicationWindow;
  }

  /**
   * Cleans up expired requests
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up expired pending requests
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.deduplicationWindow) {
        this.pendingRequests.delete(key);
      }
    }

    // Clean up expired batch requests
    for (const [batchKey, batches] of this.batchRequests.entries()) {
      const validBatches = batches.filter(
        (batch) => now - batch.timestamp < this.batchWindow * 10, // Keep for 10x batch window
      );

      if (validBatches.length === 0) {
        this.batchRequests.delete(batchKey);
      } else if (validBatches.length !== batches.length) {
        this.batchRequests.set(batchKey, validBatches);
      }
    }
  }

  /**
   * Gets deduplication statistics
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      batchKeys: this.batchRequests.size,
      totalBatches: Array.from(this.batchRequests.values()).reduce(
        (sum, batches) => sum + batches.length,
        0,
      ),
    };
  }

  /**
   * Clears all pending requests and batches
   */
  clear(): void {
    this.pendingRequests.clear();
    this.batchRequests.clear();

    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    clearInterval(this.cleanupInterval);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const requestDeduplicationManager = new RequestDeduplicationManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a deduplication key from operation and parameters
 */
export function createDeduplicationKey(
  operation: string,
  params?: Record<string, unknown>,
): string {
  const sortedParams = params ? JSON.stringify(sortObject(params)) : "";
  return `${operation}:${sortedParams}`;
}

/**
 * Sorts object keys for consistent key generation
 */
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sorted[key] = sortObject(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }

  return sorted;
}

/**
 * Decorator for deduplicating method calls
 */
export function deduplicate(keyFn?: (...args: unknown[]) => string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const key = keyFn
        ? keyFn(...args)
        : `${propertyKey}:${JSON.stringify(args)}`;

      return requestDeduplicationManager.deduplicate(key, () =>
        originalMethod.apply(this, args),
      );
    } as T;

    return descriptor;
  };
}

/**
 * Decorator for batching method calls
 */
export function batch(
  batchKey: string,
  idExtractor: (...args: unknown[]) => string,
  batchFn: (ids: string[]) => Promise<Record<string, unknown>>,
) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const itemId = idExtractor(...args);

      return requestDeduplicationManager.batch(batchKey, itemId, batchFn);
    } as T;

    return descriptor;
  };
}
