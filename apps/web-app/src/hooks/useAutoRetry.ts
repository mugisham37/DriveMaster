/**
 * Automatic Retry Hook
 * 
 * Implements automatic retry logic with exponential backoff for failed requests.
 * Shows retry attempts to user and provides manual retry option.
 * 
 * Requirements: 11.10
 * Task: 14.4
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attemptNumber: number) => boolean;
  onRetryAttempt?: (attemptNumber: number, delay: number) => void;
  onMaxRetriesReached?: (error: unknown) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attemptNumber: number;
  nextRetryIn: number; // milliseconds
  error: unknown | null;
  hasReachedMaxRetries: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'shouldRetry' | 'onRetryAttempt' | 'onMaxRetriesReached'>> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  backoffMultiplier: 2,
};

// ============================================================================
// Exponential Backoff Calculation
// ============================================================================

function calculateBackoffDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

// ============================================================================
// Default Retry Logic
// ============================================================================

function defaultShouldRetry(error: unknown, _attemptNumber: number): boolean {
  // Don't retry validation errors or authorization errors
  if (typeof error === 'object' && error !== null) {
    const errorType = (error as { type?: string }).type;
    if (errorType === 'validation' || errorType === 'authorization') {
      return false;
    }
  }

  // Retry network errors, timeouts, and server errors
  return true;
}

// ============================================================================
// Hook
// ============================================================================

export function useAutoRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): {
  execute: () => Promise<T>;
  retry: () => Promise<T>;
  cancel: () => void;
  state: RetryState;
} {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    initialDelay = DEFAULT_CONFIG.initialDelay,
    maxDelay = DEFAULT_CONFIG.maxDelay,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    shouldRetry = defaultShouldRetry,
    onRetryAttempt,
    onMaxRetriesReached,
  } = config;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptNumber: 0,
    nextRetryIn: 0,
    error: null,
    hasReachedMaxRetries: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Execute with retry logic
  const executeWithRetry = useCallback(
    async (attemptNumber = 1): Promise<T> => {
      if (isCancelledRef.current) {
        throw new Error('Operation cancelled');
      }

      try {
        const result = await operation();
        
        // Success - reset state
        setState({
          isRetrying: false,
          attemptNumber: 0,
          nextRetryIn: 0,
          error: null,
          hasReachedMaxRetries: false,
        });

        return result;
      } catch (error) {
        // Check if we should retry
        if (attemptNumber >= maxRetries || !shouldRetry(error, attemptNumber)) {
          // Max retries reached or shouldn't retry
          setState({
            isRetrying: false,
            attemptNumber,
            nextRetryIn: 0,
            error,
            hasReachedMaxRetries: true,
          });

          onMaxRetriesReached?.(error);
          throw error;
        }

        // Calculate backoff delay
        const delay = calculateBackoffDelay(
          attemptNumber,
          initialDelay,
          maxDelay,
          backoffMultiplier
        );

        // Update state to show retry countdown
        setState({
          isRetrying: true,
          attemptNumber,
          nextRetryIn: delay,
          error,
          hasReachedMaxRetries: false,
        });

        onRetryAttempt?.(attemptNumber, delay);

        // Start countdown
        let remainingTime = delay;
        countdownRef.current = setInterval(() => {
          remainingTime -= 100;
          if (remainingTime <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
          } else {
            setState(prev => ({
              ...prev,
              nextRetryIn: remainingTime,
            }));
          }
        }, 100);

        // Wait for backoff delay
        await new Promise<void>((resolve) => {
          timeoutRef.current = setTimeout(() => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            resolve();
          }, delay);
        });

        // Retry
        return executeWithRetry(attemptNumber + 1);
      }
    },
    [
      operation,
      maxRetries,
      initialDelay,
      maxDelay,
      backoffMultiplier,
      shouldRetry,
      onRetryAttempt,
      onMaxRetriesReached,
    ]
  );

  // Execute operation
  const execute = useCallback(async (): Promise<T> => {
    isCancelledRef.current = false;
    return executeWithRetry(1);
  }, [executeWithRetry]);

  // Manual retry
  const retry = useCallback(async (): Promise<T> => {
    isCancelledRef.current = false;
    setState(prev => ({
      ...prev,
      hasReachedMaxRetries: false,
      error: null,
    }));
    return executeWithRetry(1);
  }, [executeWithRetry]);

  // Cancel retry
  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState({
      isRetrying: false,
      attemptNumber: 0,
      nextRetryIn: 0,
      error: null,
      hasReachedMaxRetries: false,
    });
  }, []);

  return {
    execute,
    retry,
    cancel,
    state,
  };
}

// ============================================================================
// Retry Status Display Helper
// ============================================================================

export function getRetryStatusMessage(state: RetryState): string | null {
  if (!state.isRetrying) return null;

  const seconds = Math.ceil(state.nextRetryIn / 1000);
  return `Retrying in ${seconds} second${seconds !== 1 ? 's' : ''}... (Attempt ${state.attemptNumber + 1})`;
}

// ============================================================================
// Hook for React Query Integration
// ============================================================================

export interface UseQueryWithRetryOptions<T> extends RetryConfig {
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

export function useQueryWithRetry<T>({
  queryFn,
  enabled = true,
  ...retryConfig
}: UseQueryWithRetryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const { execute, retry, cancel, state } = useAutoRetry(queryFn, {
    ...retryConfig,
    onRetryAttempt: (attemptNumber, delay) => {
      console.log(`Retry attempt ${attemptNumber} in ${delay}ms`);
      retryConfig.onRetryAttempt?.(attemptNumber, delay);
    },
    onMaxRetriesReached: (err) => {
      setError(err);
      setIsLoading(false);
      retryConfig.onMaxRetriesReached?.(err);
    },
  });

  // Execute query when enabled
  useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    execute()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      cancel();
    };
  }, [enabled, execute, cancel]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await retry();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [retry]);

  return {
    data,
    isLoading,
    error,
    refetch,
    retryState: state,
    cancel,
  };
}
