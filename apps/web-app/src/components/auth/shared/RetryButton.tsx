'use client';

/**
 * RetryButton Component
 * Displays a retry button with exponential backoff visualization for network errors
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  className?: string;
  showRetryCount?: boolean;
  exponentialBackoff?: boolean;
  baseDelay?: number; // Base delay in milliseconds
}

export function RetryButton({
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  className,
  showRetryCount = true,
  exponentialBackoff = true,
  baseDelay = 1000,
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Calculate delay based on retry count with exponential backoff
  const calculateDelay = (attempt: number): number => {
    if (!exponentialBackoff) return baseDelay;
    return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
  };

  // Handle retry with countdown
  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);

    try {
      await onRetry();
    } finally {
      setIsRetrying(false);

      // If there are more retries available and exponential backoff is enabled,
      // show countdown for next retry
      if (exponentialBackoff && retryCount < maxRetries) {
        const delay = calculateDelay(retryCount);
        setCountdown(Math.ceil(delay / 1000));
      }
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const isDisabled = disabled || isRetrying || (countdown !== null && countdown > 0);
  const hasRetriesLeft = retryCount < maxRetries;

  return (
    <Button
      onClick={handleRetry}
      disabled={isDisabled}
      variant="outline"
      size="sm"
      className={cn('gap-2', className)}
      aria-label={`Retry operation${showRetryCount ? ` (attempt ${retryCount + 1} of ${maxRetries})` : ''}`}
      aria-busy={isRetrying}
    >
      {isRetrying ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Retrying...</span>
        </>
      ) : countdown !== null && countdown > 0 ? (
        <>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Retry in {countdown}s</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>
            Retry
            {showRetryCount && hasRetriesLeft && ` (${retryCount + 1}/${maxRetries})`}
          </span>
        </>
      )}
    </Button>
  );
}
