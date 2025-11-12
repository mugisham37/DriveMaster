'use client';

/**
 * useAuthResilience Hook
 * Provides resilience features including retry logic, offline detection, and error recovery
 */

import { useState, useCallback, useEffect } from 'react';
import { authResilience } from '@/lib/auth/resilience-integration';
import { AuthErrorHandler } from '@/lib/auth/error-handler';
import type { AuthError } from '@/types/auth-service';

export interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  nextRetryDelay: number;
}

export interface ResilienceState {
  isHealthy: boolean;
  isOffline: boolean;
  isDegraded: boolean;
  usingCache: boolean;
  circuitBreakerOpen: boolean;
  recommendations: string[];
}

/**
 * Hook for managing retry logic with exponential backoff
 */
export function useRetry(maxRetries: number = 3, baseDelay: number = 1000) {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    maxRetries,
    canRetry: true,
    nextRetryDelay: baseDelay,
  });

  const calculateDelay = useCallback(
    (attempt: number): number => {
      return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    },
    [baseDelay]
  );

  const retry = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      setRetryState((prev) => ({
        ...prev,
        isRetrying: true,
      }));

      try {
        const result = await operation();

        // Reset on success
        setRetryState({
          isRetrying: false,
          retryCount: 0,
          maxRetries,
          canRetry: true,
          nextRetryDelay: baseDelay,
        });

        return result;
      } catch (error) {
        const authError = AuthErrorHandler.processError(error, 'retry');

        setRetryState((prev) => {
          const newRetryCount = prev.retryCount + 1;
          const canRetry = newRetryCount < maxRetries && authError.recoverable;
          const nextRetryDelay = calculateDelay(newRetryCount);

          return {
            isRetrying: false,
            retryCount: newRetryCount,
            maxRetries,
            canRetry,
            nextRetryDelay,
          };
        });

        throw error;
      }
    },
    [maxRetries, baseDelay, calculateDelay]
  );

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      maxRetries,
      canRetry: true,
      nextRetryDelay: baseDelay,
    });
  }, [maxRetries, baseDelay]);

  return {
    ...retryState,
    retry,
    reset,
  };
}

/**
 * Hook for monitoring resilience status
 */
export function useResilienceStatus() {
  const [status, setStatus] = useState<ResilienceState>({
    isHealthy: true,
    isOffline: false,
    isDegraded: false,
    usingCache: false,
    circuitBreakerOpen: false,
    recommendations: [],
  });

  useEffect(() => {
    const updateStatus = () => {
      const resilienceStatus = authResilience.getResilienceStatus();

      setStatus({
        isHealthy: resilienceStatus.healthy,
        isOffline: !navigator.onLine,
        isDegraded: resilienceStatus.degradation.degraded,
        usingCache: resilienceStatus.degradation.cacheStats.size > 0,
        circuitBreakerOpen: !resilienceStatus.circuitBreakers.healthy,
        recommendations: resilienceStatus.recommendations,
      });
    };

    // Initial check
    updateStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Check status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return status;
}

/**
 * Hook for executing operations with full resilience support
 */
export function useResilientOperation<T>(
  operation: () => Promise<T>,
  options: {
    operationType: 'login' | 'register' | 'logout' | 'refresh' | 'oauth';
    cacheKey?: string;
    fallbackData?: T;
    maxRetries?: number;
    onError?: (error: AuthError) => void;
    onSuccess?: (data: T) => void;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [data, setData] = useState<T | null>(null);
  const retryHook = useRetry(options.maxRetries);
  const { retry, reset: resetRetry } = retryHook;

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await retry(async () => {
        const resilienceOptions: {
          operationType: 'login' | 'register' | 'logout' | 'refresh' | 'oauth';
          cacheKey?: string;
          fallbackData?: T;
          retryAttempts?: number;
        } = {
          operationType: options.operationType,
        };

        if (options.cacheKey) resilienceOptions.cacheKey = options.cacheKey;
        if (options.fallbackData !== undefined) resilienceOptions.fallbackData = options.fallbackData;
        if (options.maxRetries !== undefined) resilienceOptions.retryAttempts = options.maxRetries;

        return await authResilience.executeWithResilience(operation, resilienceOptions);
      });

      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const authError = AuthErrorHandler.processError(err, options.operationType);
      setError(authError);
      options.onError?.(authError);
      throw authError;
    } finally {
      setIsLoading(false);
    }
  }, [operation, options, retry]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    resetRetry();
  }, [resetRetry]);

  return {
    execute,
    reset,
    isLoading,
    error,
    data,
    retryCount: retryHook.retryCount,
    maxRetries: retryHook.maxRetries,
    canRetry: retryHook.canRetry,
    isRetrying: retryHook.isRetrying,
    nextRetryDelay: retryHook.nextRetryDelay,
  };
}

/**
 * Hook for handling partial failures gracefully
 */
export function usePartialFailureHandler() {
  const handlePartialFailure = useCallback(
    (
      error: AuthError,
      context: 'login' | 'profile' | 'refresh' | 'oauth'
    ): {
      shouldLogout: boolean;
      shouldRetry: boolean;
      userMessage: string;
      technicalMessage: string;
    } => {
      return authResilience.handlePartialFailure(error, context);
    },
    []
  );

  return { handlePartialFailure };
}

/**
 * Hook for forcing recovery of resilience systems
 */
export function useForceRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);

  const forceRecovery = useCallback(async () => {
    setIsRecovering(true);
    try {
      await authResilience.forceRecovery();
    } finally {
      setIsRecovering(false);
    }
  }, []);

  return {
    forceRecovery,
    isRecovering,
  };
}

/**
 * Combined hook that provides all resilience features
 */
export function useAuthResilience() {
  const resilienceStatus = useResilienceStatus();
  const { handlePartialFailure } = usePartialFailureHandler();
  const { forceRecovery, isRecovering } = useForceRecovery();

  return {
    // Status
    ...resilienceStatus,

    // Handlers
    handlePartialFailure,
    forceRecovery,
    isRecovering,

    // Utilities
    useRetry,
    useResilientOperation,
  };
}
