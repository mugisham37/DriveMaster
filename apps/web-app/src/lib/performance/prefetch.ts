/**
 * Data Prefetching Utilities
 * 
 * Utilities for prefetching data to improve perceived performance.
 * Implements hover prefetch, progress-based prefetch, and predictive prefetch.
 * 
 * Requirements: 13.3, 13.4
 * Task: 14.2
 */

import { useEffect, useRef, useCallback } from 'react';
import { mutate } from 'swr';

// ============================================================================
// Types
// ============================================================================

export interface PrefetchOptions {
  delay?: number;
  enabled?: boolean;
  priority?: 'high' | 'low';
}

export interface HoverPrefetchHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

// ============================================================================
// Hover Prefetch Hook
// ============================================================================

/**
 * Hook for prefetching data on hover with configurable delay
 * 
 * @param prefetchFn - Function to call for prefetching
 * @param options - Prefetch options
 * @returns Event handlers for hover/focus events
 * 
 * @example
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePrefetchOnHover(
 *   () => prefetchLesson(lessonId),
 *   { delay: 500 }
 * );
 * 
 * <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   Lesson Card
 * </div>
 * ```
 */
export function usePrefetchOnHover(
  prefetchFn: () => Promise<void> | void,
  options: PrefetchOptions = {}
): HoverPrefetchHandlers {
  const { delay = 500, enabled = true, priority = 'low' } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const prefetchedRef = useRef(false);

  const startPrefetch = useCallback(() => {
    if (!enabled || prefetchedRef.current) return;

    timeoutRef.current = setTimeout(async () => {
      try {
        // Use requestIdleCallback for low priority prefetch
        if (priority === 'low' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            prefetchFn();
            prefetchedRef.current = true;
          });
        } else {
          await prefetchFn();
          prefetchedRef.current = true;
        }
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    }, delay);
  }, [prefetchFn, delay, enabled, priority]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPrefetch();
    };
  }, [cancelPrefetch]);

  return {
    onMouseEnter: startPrefetch,
    onMouseLeave: cancelPrefetch,
    onFocus: startPrefetch,
    onBlur: cancelPrefetch,
  };
}

// ============================================================================
// Progress-Based Prefetch Hook
// ============================================================================

/**
 * Hook for prefetching based on progress threshold
 * Useful for prefetching next lesson when user is 80% through current lesson
 * 
 * @param prefetchFn - Function to call for prefetching
 * @param progress - Current progress (0-100)
 * @param threshold - Progress threshold to trigger prefetch (default: 80)
 * 
 * @example
 * ```tsx
 * useProgressPrefetch(
 *   () => prefetchNextLesson(nextLessonId),
 *   currentProgress,
 *   80
 * );
 * ```
 */
export function useProgressPrefetch(
  prefetchFn: () => Promise<void> | void,
  progress: number,
  threshold: number = 80
): void {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (progress >= threshold && !prefetchedRef.current) {
      // Use requestIdleCallback for non-critical prefetch
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          try {
            await prefetchFn();
            prefetchedRef.current = true;
          } catch (error) {
            console.error('Progress prefetch error:', error);
          }
        });
      } else {
        // Fallback to setTimeout
        setTimeout(async () => {
          try {
            await prefetchFn();
            prefetchedRef.current = true;
          } catch (error) {
            console.error('Progress prefetch error:', error);
          }
        }, 100);
      }
    }
  }, [progress, threshold, prefetchFn]);
}

// ============================================================================
// Mount Prefetch Hook
// ============================================================================

/**
 * Hook for prefetching data on component mount
 * Useful for prefetching recommended lessons on dashboard load
 * 
 * @param prefetchFn - Function to call for prefetching
 * @param enabled - Whether prefetch is enabled
 * 
 * @example
 * ```tsx
 * useMountPrefetch(
 *   () => prefetchRecommendations(userId),
 *   isAuthenticated
 * );
 * ```
 */
export function useMountPrefetch(
  prefetchFn: () => Promise<void> | void,
  enabled: boolean = true
): void {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (enabled && !prefetchedRef.current) {
      // Delay prefetch slightly to prioritize initial render
      const timeoutId = setTimeout(async () => {
        try {
          await prefetchFn();
          prefetchedRef.current = true;
        } catch (error) {
          console.error('Mount prefetch error:', error);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [prefetchFn, enabled]);
}

// ============================================================================
// Batch Prefetch Utilities
// ============================================================================

/**
 * Prefetch multiple items with staggered timing
 * Useful for prefetching top search results
 * 
 * @param prefetchFns - Array of prefetch functions
 * @param staggerDelay - Delay between each prefetch (default: 200ms)
 * 
 * @example
 * ```tsx
 * useBatchPrefetch([
 *   () => prefetchContent(results[0].id),
 *   () => prefetchContent(results[1].id),
 *   () => prefetchContent(results[2].id),
 * ], 200);
 * ```
 */
export function useBatchPrefetch(
  prefetchFns: Array<() => Promise<void> | void>,
  staggerDelay: number = 200
): void {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (prefetchFns.length === 0 || prefetchedRef.current) return;

    const timeouts: NodeJS.Timeout[] = [];

    prefetchFns.forEach((fn, index) => {
      const timeout = setTimeout(async () => {
        try {
          await fn();
        } catch (error) {
          console.error(`Batch prefetch error (item ${index}):`, error);
        }
      }, index * staggerDelay);

      timeouts.push(timeout);
    });

    prefetchedRef.current = true;

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [prefetchFns, staggerDelay]);
}

// ============================================================================
// SWR Prefetch Utilities
// ============================================================================

/**
 * Prefetch data using SWR's mutate function
 * This populates the SWR cache without triggering a re-render
 * 
 * @param key - SWR cache key
 * @param fetcher - Function to fetch data
 * 
 * @example
 * ```tsx
 * await prefetchSWRData(
 *   `/api/lessons/${lessonId}`,
 *   () => fetchLesson(lessonId)
 * );
 * ```
 */
export async function prefetchSWRData<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetcher();
    // Populate SWR cache without triggering re-render
    await mutate(key, data, false);
  } catch (error) {
    console.error('SWR prefetch error:', error);
  }
}

/**
 * Prefetch multiple SWR keys in parallel
 * 
 * @param items - Array of { key, fetcher } objects
 * 
 * @example
 * ```tsx
 * await prefetchMultipleSWRData([
 *   { key: '/api/lessons/1', fetcher: () => fetchLesson('1') },
 *   { key: '/api/lessons/2', fetcher: () => fetchLesson('2') },
 *   { key: '/api/lessons/3', fetcher: () => fetchLesson('3') },
 * ]);
 * ```
 */
export async function prefetchMultipleSWRData<T>(
  items: Array<{ key: string; fetcher: () => Promise<T> }>
): Promise<void> {
  try {
    await Promise.all(
      items.map(({ key, fetcher }) => prefetchSWRData(key, fetcher))
    );
  } catch (error) {
    console.error('Multiple SWR prefetch error:', error);
  }
}

// ============================================================================
// Link Prefetch Utilities
// ============================================================================

/**
 * Prefetch Next.js route on hover
 * Uses Next.js router prefetch for route-level prefetching
 * 
 * @param href - Route to prefetch
 * @param router - Next.js router instance
 * @param delay - Delay before prefetch (default: 500ms)
 * 
 * @example
 * ```tsx
 * const router = useRouter();
 * const handlers = useLinkPrefetch('/learn/lesson/123', router);
 * 
 * <Link href="/learn/lesson/123" {...handlers}>
 *   View Lesson
 * </Link>
 * ```
 */
export function useLinkPrefetch(
  href: string,
  router: { prefetch?: (url: string) => void },
  delay: number = 500
): HoverPrefetchHandlers {
  return usePrefetchOnHover(
    () => {
      if (router && router.prefetch) {
        router.prefetch(href);
      }
    },
    { delay }
  );
}

// ============================================================================
// Predictive Prefetch
// ============================================================================

/**
 * Predictive prefetch based on user behavior patterns
 * Prefetches likely next actions based on current context
 * 
 * @param predictions - Array of predicted actions with confidence scores
 * @param threshold - Minimum confidence to trigger prefetch (0-1)
 * 
 * @example
 * ```tsx
 * usePredictivePrefetch([
 *   { action: () => prefetchLesson('next'), confidence: 0.8 },
 *   { action: () => prefetchProgress(), confidence: 0.6 },
 * ], 0.7);
 * ```
 */
export function usePredictivePrefetch(
  predictions: Array<{ action: () => Promise<void> | void; confidence: number }>,
  threshold: number = 0.7
): void {
  const prefetchedRef = useRef(new Set<number>());

  useEffect(() => {
    predictions.forEach((prediction, index) => {
      if (
        prediction.confidence >= threshold &&
        !prefetchedRef.current.has(index)
      ) {
        // Use requestIdleCallback for predictive prefetch
        if ('requestIdleCallback' in window) {
          requestIdleCallback(async () => {
            try {
              await prediction.action();
              prefetchedRef.current.add(index);
            } catch (error) {
              console.error('Predictive prefetch error:', error);
            }
          });
        }
      }
    });
  }, [predictions, threshold]);
}

// ============================================================================
// Prefetch Priority Queue
// ============================================================================

interface PrefetchTask {
  id: string;
  fn: () => Promise<void> | void;
  priority: number;
}

class PrefetchQueue {
  private queue: PrefetchTask[] = [];
  private processing = false;

  add(task: PrefetchTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task.fn();
        } catch (error) {
          console.error(`Prefetch queue error (${task.id}):`, error);
        }
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.processing = false;
  }
}

// Global prefetch queue instance
const globalPrefetchQueue = new PrefetchQueue();

/**
 * Add prefetch task to global priority queue
 * 
 * @param id - Unique task identifier
 * @param fn - Prefetch function
 * @param priority - Task priority (higher = sooner)
 * 
 * @example
 * ```tsx
 * addPrefetchTask('lesson-123', () => prefetchLesson('123'), 10);
 * ```
 */
export function addPrefetchTask(
  id: string,
  fn: () => Promise<void> | void,
  priority: number = 5
): void {
  globalPrefetchQueue.add({ id, fn, priority });
}
