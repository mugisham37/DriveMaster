/**
 * Graceful Degradation Hook
 * 
 * Provides cached data with warnings when the service is unavailable.
 * Implements offline mode indicators and read-only access to cached data.
 * 
 * Requirements: 11.11, 11.12
 * Task: 14.3
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface GracefulDegradationState<T> {
  data: T | null;
  isFromCache: boolean;
  isServiceAvailable: boolean;
  isOffline: boolean;
  lastSuccessfulFetch: Date | null;
  error: Error | null;
}

export interface GracefulDegradationOptions {
  queryKey: string[];
  enableOfflineMode?: boolean;
  maxCacheAge?: number; // in milliseconds
  onServiceUnavailable?: () => void;
  onServiceRestored?: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useGracefulDegradation<T = unknown>(
  options: GracefulDegradationOptions
): GracefulDegradationState<T> & {
  getCachedData: () => T | null;
  isDataStale: () => boolean;
  clearCache: () => void;
} {
  const {
    queryKey,
    enableOfflineMode = true,
    maxCacheAge = 24 * 60 * 60 * 1000, // 24 hours default
    onServiceUnavailable,
    onServiceRestored,
  } = options;

  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    if (!enableOfflineMode) return;

    const handleOnline = () => {
      setIsOffline(false);
      onServiceRestored?.();
    };

    const handleOffline = () => {
      setIsOffline(true);
      onServiceUnavailable?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableOfflineMode, onServiceRestored, onServiceUnavailable]);

  // Get cached data from React Query
  const getCachedData = useCallback((): T | null => {
    const cachedData = queryClient.getQueryData<T>(queryKey);
    return cachedData || null;
  }, [queryClient, queryKey]);

  // Check if cached data is stale
  const isDataStale = useCallback((): boolean => {
    if (!lastSuccessfulFetch) return true;
    const age = Date.now() - lastSuccessfulFetch.getTime();
    return age > maxCacheAge;
  }, [lastSuccessfulFetch, maxCacheAge]);

  // Clear cache
  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey });
    setLastSuccessfulFetch(null);
  }, [queryClient, queryKey]);

  // Get current state
  const cachedData = getCachedData();
  const isFromCache = cachedData !== null && (!isServiceAvailable || isOffline);

  return {
    data: cachedData,
    isFromCache,
    isServiceAvailable,
    isOffline,
    lastSuccessfulFetch,
    error: null,
    getCachedData,
    isDataStale,
    clearCache,
  };
}

// ============================================================================
// Cached Data Warning Component Helper
// ============================================================================

export interface CachedDataWarningProps {
  isFromCache: boolean;
  lastSuccessfulFetch: Date | null;
  isOffline: boolean;
  onRetry?: () => void;
}

export function getCachedDataWarningMessage({
  isFromCache,
  lastSuccessfulFetch,
  isOffline,
}: Omit<CachedDataWarningProps, 'onRetry'>): string | null {
  if (!isFromCache) return null;

  if (isOffline) {
    return 'You\'re offline. Showing cached data from your last session.';
  }

  if (lastSuccessfulFetch) {
    const age = Date.now() - lastSuccessfulFetch.getTime();
    const hours = Math.floor(age / (1000 * 60 * 60));
    const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Service unavailable. Showing cached data from ${hours} hour${hours !== 1 ? 's' : ''} ago.`;
    } else if (minutes > 0) {
      return `Service unavailable. Showing cached data from ${minutes} minute${minutes !== 1 ? 's' : ''} ago.`;
    } else {
      return 'Service unavailable. Showing cached data from moments ago.';
    }
  }

  return 'Service unavailable. Showing cached data.';
}

// ============================================================================
// Offline Queue for Write Operations
// ============================================================================

interface QueuedOperation {
  id: string;
  operation: () => Promise<unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

class OfflineOperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private readonly STORAGE_KEY = 'offline_operation_queue';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Note: We can't restore the operation functions, so we clear the queue
        // In a real implementation, you'd need to serialize operation metadata
        this.queue = [];
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      // We can't serialize functions, so we only store metadata
      const metadata = this.queue.map(op => ({
        id: op.id,
        timestamp: op.timestamp,
        retryCount: op.retryCount,
        maxRetries: op.maxRetries,
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  enqueue(operation: () => Promise<unknown>, maxRetries = 3): string {
    const id = crypto.randomUUID();
    this.queue.push({
      id,
      operation,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
    });
    this.saveToStorage();
    return id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue[0];

      try {
        await operation.operation();
        // Success - remove from queue
        this.queue.shift();
        this.saveToStorage();
      } catch (error) {
        // Failure - increment retry count
        operation.retryCount++;

        if (operation.retryCount >= operation.maxRetries) {
          // Max retries reached - remove from queue
          console.error('Operation failed after max retries:', error);
          this.queue.shift();
          this.saveToStorage();
        } else {
          // Will retry later
          console.warn(`Operation failed, will retry (${operation.retryCount}/${operation.maxRetries}):`, error);
          break;
        }
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

// Singleton instance
let offlineQueue: OfflineOperationQueue | null = null;

export function getOfflineQueue(): OfflineOperationQueue {
  if (!offlineQueue) {
    offlineQueue = new OfflineOperationQueue();
  }
  return offlineQueue;
}

// ============================================================================
// Hook for Offline Queue
// ============================================================================

export function useOfflineQueue() {
  const [queueLength, setQueueLength] = useState(0);
  const queue = getOfflineQueue();

  useEffect(() => {
    // Update queue length periodically
    const interval = setInterval(() => {
      setQueueLength(queue.getQueueLength());
    }, 1000);

    return () => clearInterval(interval);
  }, [queue]);

  const enqueueOperation = useCallback(
    (operation: () => Promise<unknown>, maxRetries = 3): string => {
      const id = queue.enqueue(operation, maxRetries);
      setQueueLength(queue.getQueueLength());
      return id;
    },
    [queue]
  );

  const processQueue = useCallback(async () => {
    await queue.processQueue();
    setQueueLength(queue.getQueueLength());
  }, [queue]);

  const clearQueue = useCallback(() => {
    queue.clearQueue();
    setQueueLength(0);
  }, [queue]);

  // Auto-process queue when coming online
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue]);

  return {
    queueLength,
    enqueueOperation,
    processQueue,
    clearQueue,
  };
}
