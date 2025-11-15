/**
 * Throttle Hook
 * 
 * Throttles function execution to fire at most once per specified delay.
 * Useful for scroll and resize event handlers.
 * 
 * Requirements: 9.10 (throttle scroll/resize handlers)
 * Task: 12.6
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Throttles a callback function to execute at most once per delay period
 * 
 * @param callback - Function to throttle
 * @param delay - Minimum time between executions in milliseconds
 * @returns Throttled function
 * 
 * Usage:
 * ```tsx
 * const handleScroll = useThrottle(() => {
 *   console.log('Scrolled!');
 * }, 100);
 * 
 * useEffect(() => {
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, [handleScroll]);
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        // Execute immediately if enough time has passed
        callback(...args);
        lastRun.current = now;
      } else {
        // Schedule execution for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRun.current = Date.now();
          },
          delay - timeSinceLastRun
        );
      }
    },
    [callback, delay]
  );
}

/**
 * Throttles a value to update at most once per delay period
 * 
 * @param value - Value to throttle
 * @param delay - Minimum time between updates in milliseconds
 * @returns Throttled value
 * 
 * Usage:
 * ```tsx
 * const [scrollY, setScrollY] = useState(0);
 * const throttledScrollY = useThrottleValue(scrollY, 100);
 * ```
 */
export function useThrottleValue<T>(value: T, delay: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdate = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate.current;

    if (timeSinceLastUpdate >= delay) {
      // Update immediately if enough time has passed
      setThrottledValue(value);
      lastUpdate.current = now;
    } else {
      // Schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(
        () => {
          setThrottledValue(value);
          lastUpdate.current = Date.now();
        },
        delay - timeSinceLastUpdate
      );
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

// Import useState for useThrottleValue
import { useState } from 'react';
