'use client';

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface RetryStatusProps {
  isRetrying: boolean;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryIn: number; // milliseconds
  onManualRetry?: () => void;
  onCancel?: () => void;
  error?: Error | null;
}

/**
 * Retry Status Component
 * Displays retry progress with countdown and manual retry option
 * Requirements: 14.1
 */
export function RetryStatus({
  isRetrying,
  attemptNumber,
  maxAttempts,
  nextRetryIn,
  onManualRetry,
  onCancel,
  error,
}: RetryStatusProps) {
  const [countdown, setCountdown] = useState(nextRetryIn);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setCountdown(nextRetryIn);
  }, [nextRetryIn]);

  useEffect(() => {
    if (!isRetrying || countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const newValue = Math.max(0, prev - 100);
        setProgress(((nextRetryIn - newValue) / nextRetryIn) * 100);
        return newValue;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRetrying, countdown, nextRetryIn]);

  if (!isRetrying && attemptNumber === 0) {
    return null;
  }

  const seconds = Math.ceil(countdown / 1000);
  const hasReachedMaxRetries = attemptNumber >= maxAttempts;

  if (hasReachedMaxRetries) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle className="font-semibold">
          Maximum Retry Attempts Reached
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            We tried {maxAttempts} times but couldn&apos;t complete the request.
          </p>
          {error && (
            <p className="mb-3 text-sm text-gray-600">
              Error: {error.message}
            </p>
          )}
          <div className="flex gap-2">
            {onManualRetry && (
              <Button
                onClick={onManualRetry}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
              >
                <X className="mr-2 h-3 w-3" />
                Cancel
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="my-4">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <AlertTitle className="font-semibold">
        Retrying Connection...
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          Attempt {attemptNumber} of {maxAttempts}
          {countdown > 0 && ` • Next retry in ${seconds} second${seconds !== 1 ? 's' : ''}`}
        </p>
        
        {countdown > 0 && (
          <div className="mb-3">
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex gap-2">
          {onManualRetry && countdown > 0 && (
            <Button
              onClick={onManualRetry}
              variant="outline"
              size="sm"
            >
              Retry Now
            </Button>
          )}
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
            >
              <X className="mr-2 h-3 w-3" />
              Cancel
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact Retry Status for inline display
 */
export function CompactRetryStatus({
  isRetrying,
  attemptNumber,
  maxAttempts,
  nextRetryIn,
}: Pick<RetryStatusProps, 'isRetrying' | 'attemptNumber' | 'maxAttempts' | 'nextRetryIn'>) {
  const [countdown, setCountdown] = useState(nextRetryIn);

  useEffect(() => {
    setCountdown(nextRetryIn);
  }, [nextRetryIn]);

  useEffect(() => {
    if (!isRetrying || countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isRetrying, countdown]);

  if (!isRetrying) {
    return null;
  }

  const seconds = Math.ceil(countdown / 1000);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>
        Retrying ({attemptNumber}/{maxAttempts})
        {countdown > 0 && ` in ${seconds}s`}
      </span>
    </div>
  );
}
