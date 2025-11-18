/**
 * Retry Manager with Exponential Backoff
 * Handles automatic retries for failed operations
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[]; // Error codes/types that should be retried
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

export class RetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 32000,
    backoffMultiplier: 2,
    retryableErrors: ['network', 'service', 'timeout'],
  };

  /**
   * Execute function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error, finalConfig.retryableErrors)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
          };
        }

        // Don't wait after last attempt
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(
            attempt,
            finalConfig.baseDelay,
            finalConfig.maxDelay,
            finalConfig.backoffMultiplier
          );

          if (finalConfig.onRetry) {
            finalConfig.onRetry(attempt, lastError);
          }

          console.log(
            `[RetryManager] Attempt ${attempt} failed. Retrying in ${delay}ms...`
          );

          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    multiplier: number
  ): number {
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(cappedDelay + jitter);
  }

  /**
   * Check if error should be retried
   */
  private static isRetryable(error: any, retryableErrors: string[]): boolean {
    if (!error) return false;

    const errorType = error.type || error.code || error.name;
    return retryableErrors.some((retryable) =>
      errorType?.toLowerCase().includes(retryable.toLowerCase())
    );
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Hook for retry functionality
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const executeWithRetry = useCallback(async () => {
    setIsRetrying(true);
    setAttempts(0);

    const result = await RetryManager.executeWithRetry(fn, {
      ...config,
      onRetry: (attempt, error) => {
        setAttempts(attempt);
        config?.onRetry?.(attempt, error);
      },
    });

    setIsRetrying(false);
    return result;
  }, [fn, config]);

  return {
    executeWithRetry,
    isRetrying,
    attempts,
  };
}

// Import useState and useCallback
import { useState, useCallback } from 'react';
