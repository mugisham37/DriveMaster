'use client';

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import type { CircuitBreakerState } from '@/utils/circuit-breaker';

export interface CircuitBreakerStatusProps {
  state: CircuitBreakerState;
  nextRetryTime?: Date | null;
  onRetry?: () => void;
  showCachedData?: boolean;
}

/**
 * Circuit Breaker Status Component
 * Displays appropriate UI based on circuit breaker state
 * Requirements: 14.1
 */
export function CircuitBreakerStatus({
  state,
  nextRetryTime,
  onRetry,
  showCachedData = false,
}: CircuitBreakerStatusProps) {
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (state !== 'open' || !nextRetryTime) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, nextRetryTime.getTime() - now);
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [state, nextRetryTime]);

  if (state === 'closed') {
    return null;
  }

  if (state === 'half-open') {
    return (
      <Alert className="my-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertTitle className="font-semibold">
          Reconnecting...
        </AlertTitle>
        <AlertDescription>
          Testing connection to the service. Please wait a moment.
        </AlertDescription>
      </Alert>
    );
  }

  // Open state
  const seconds = Math.ceil(countdown / 1000);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-semibold">
        Service Temporarily Unavailable
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          The service is experiencing issues and is temporarily unavailable.
          {countdown > 0 && ` We'll automatically retry in ${seconds} second${seconds !== 1 ? 's' : ''}.`}
        </p>

        {showCachedData && (
          <p className="mb-3 text-sm">
            You can view cached content while we work on restoring the connection.
          </p>
        )}

        <div className="flex gap-2">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              disabled={countdown > 0}
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              {countdown > 0 ? `Retry in ${seconds}s` : 'Retry Now'}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact Circuit Breaker Banner
 * Displays a banner at the top of the page when circuit is open
 */
export function CircuitBreakerBanner({
  state,
  nextRetryTime,
}: Pick<CircuitBreakerStatusProps, 'state' | 'nextRetryTime'>) {
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (state !== 'open' || !nextRetryTime) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, nextRetryTime.getTime() - now);
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [state, nextRetryTime]);

  if (state === 'closed') {
    return null;
  }

  if (state === 'half-open') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            Reconnecting to service...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const seconds = Math.ceil(countdown / 1000);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Service temporarily unavailable.
            {countdown > 0 && ` Retrying in ${seconds}s...`}
          </span>
          {countdown > 0 && (
            <span className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              {seconds}s
            </span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Hook for monitoring circuit breaker state
 */
export function useCircuitBreakerMonitor(circuitBreaker: {
  getState: () => CircuitBreakerState;
  getStats: () => { nextRetryTime: Date | null };
  addListener: (listener: (state: CircuitBreakerState) => void) => () => void;
}) {
  const [state, setState] = useState<CircuitBreakerState>(circuitBreaker.getState());
  const [nextRetryTime, setNextRetryTime] = useState<Date | null>(
    circuitBreaker.getStats().nextRetryTime
  );

  useEffect(() => {
    const unsubscribe = circuitBreaker.addListener((newState) => {
      setState(newState);
      setNextRetryTime(circuitBreaker.getStats().nextRetryTime);
    });

    return unsubscribe;
  }, [circuitBreaker]);

  return {
    state,
    nextRetryTime,
    isOpen: state === 'open',
    isHalfOpen: state === 'half-open',
    isClosed: state === 'closed',
  };
}
