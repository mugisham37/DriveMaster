/**
 * Circuit Breaker Hook
 * 
 * React hook for using circuit breaker pattern with API calls
 * Provides automatic failure detection and recovery
 * 
 * Requirements: 14.1
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CircuitBreaker, createCircuitBreaker } from '@/utils/circuit-breaker';
import type { CircuitBreakerState, CircuitBreakerStats } from '@/utils/circuit-breaker';
import type { CircuitBreakerConfig } from '@/types/config';

export interface UseCircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  onStateChange?: (state: CircuitBreakerState, stats: CircuitBreakerStats) => void;
  showNotifications?: boolean;
}

export interface CircuitBreakerHookResult {
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  state: CircuitBreakerState;
  stats: CircuitBreakerStats;
  isOpen: boolean;
  isHalfOpen: boolean;
  isClosed: boolean;
  isHealthy: boolean;
  reset: () => void;
  forceOpen: () => void;
  forceClose: () => void;
}

/**
 * Hook for using circuit breaker with React components
 */
export function useCircuitBreaker(
  options: UseCircuitBreakerOptions = {}
): CircuitBreakerHookResult {
  const { onStateChange, showNotifications = true, ...config } = options;

  // Create circuit breaker instance (only once)
  const circuitBreakerRef = useRef<CircuitBreaker | null>(null);
  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = createCircuitBreaker(config);
  }

  const circuitBreaker = circuitBreakerRef.current;

  // State
  const [state, setState] = useState<CircuitBreakerState>(circuitBreaker.getState());
  const [stats, setStats] = useState<CircuitBreakerStats>(circuitBreaker.getStats());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = circuitBreaker.addListener((newState, newStats) => {
      setState(newState);
      setStats(newStats);

      // Call custom state change handler
      if (onStateChange) {
        onStateChange(newState, newStats);
      }

      // Show notifications if enabled
      if (showNotifications && typeof window !== 'undefined') {
        showStateChangeNotification(newState);
      }
    });

    return unsubscribe;
  }, [circuitBreaker, onStateChange, showNotifications]);

  // Execute function with circuit breaker protection
  const execute = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      return circuitBreaker.execute(fn);
    },
    [circuitBreaker]
  );

  // Reset circuit breaker
  const reset = useCallback(() => {
    circuitBreaker.reset();
  }, [circuitBreaker]);

  // Force open (for testing or manual intervention)
  const forceOpen = useCallback(() => {
    circuitBreaker.forceOpen();
  }, [circuitBreaker]);

  // Force close (for testing or manual intervention)
  const forceClose = useCallback(() => {
    circuitBreaker.forceClose();
  }, [circuitBreaker]);

  return {
    execute,
    state,
    stats,
    isOpen: state === 'open',
    isHalfOpen: state === 'half-open',
    isClosed: state === 'closed',
    isHealthy: circuitBreaker.isHealthy(),
    reset,
    forceOpen,
    forceClose,
  };
}

/**
 * Hook for wrapping an async function with circuit breaker
 */
export function useCircuitBreakerWrapper<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: UseCircuitBreakerOptions = {}
): {
  execute: (...args: T) => Promise<R>;
  state: CircuitBreakerState;
  stats: CircuitBreakerStats;
  isOpen: boolean;
  reset: () => void;
} {
  const circuitBreaker = useCircuitBreaker(options);

  const execute = useCallback(
    async (...args: T): Promise<R> => {
      return circuitBreaker.execute(() => fn(...args));
    },
    [circuitBreaker, fn]
  );

  return {
    execute,
    state: circuitBreaker.state,
    stats: circuitBreaker.stats,
    isOpen: circuitBreaker.isOpen,
    reset: circuitBreaker.reset,
  };
}

/**
 * Hook for monitoring circuit breaker health
 */
export function useCircuitBreakerHealth(circuitBreaker: CircuitBreaker) {
  const [isHealthy, setIsHealthy] = useState(circuitBreaker.isHealthy());
  const [metrics, setMetrics] = useState(circuitBreaker.getMetrics());

  useEffect(() => {
    const unsubscribe = circuitBreaker.addListener(() => {
      setIsHealthy(circuitBreaker.isHealthy());
      setMetrics(circuitBreaker.getMetrics());
    });

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(circuitBreaker.getMetrics());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [circuitBreaker]);

  return {
    isHealthy,
    metrics,
  };
}

// Helper functions

function showStateChangeNotification(state: CircuitBreakerState) {
  // Check if we have a toast notification system
  if (typeof window !== 'undefined' && 'toast' in window) {
    const toast = (window as unknown as { toast: (options: { title: string; description: string; variant?: string }) => void }).toast;

    switch (state) {
      case 'open':
        toast({
          title: 'Service Unavailable',
          description: 'The service is temporarily unavailable. We\'ll retry automatically.',
          variant: 'destructive',
        });
        break;

      case 'half-open':
        toast({
          title: 'Reconnecting',
          description: 'Testing connection to the service...',
        });
        break;

      case 'closed':
        toast({
          title: 'Connection Restored',
          description: 'The service is back online.',
        });
        break;
    }
  }
}
