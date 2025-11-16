/**
 * Rendering Optimization Utilities
 * 
 * Utilities for optimizing React rendering performance including
 * memoization, debouncing, throttling, and virtual scrolling helpers.
 * 
 * Requirements: 13.1
 * Task: 14.4
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// Debounce Hook
// ============================================================================

/**
 * Hook for debouncing values
 * Useful for search inputs, filters, etc.
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 * 
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * // Use debouncedQuery for API calls
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     searchAPI(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debouncing callbacks
 * 
 * @param callback - Callback to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced callback
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   searchAPI(query);
 * }, 300);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// ============================================================================
// Throttle Hook
// ============================================================================

/**
 * Hook for throttling callbacks
 * Useful for scroll handlers, resize handlers, etc.
 * 
 * @param callback - Callback to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled callback
 * 
 * @example
 * ```tsx
 * const handleScroll = useThrottledCallback(() => {
 *   console.log('Scrolled');
 * }, 100);
 * 
 * <div onScroll={handleScroll}>...</div>
 * ```
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

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

      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - (now - lastRan.current));
      }
    },
    [callback, delay]
  );
}

// ============================================================================
// Memoization Helpers
// ============================================================================

/**
 * Memoize expensive sorting operations
 * 
 * @param items - Array to sort
 * @param compareFn - Comparison function
 * @returns Sorted array
 * 
 * @example
 * ```tsx
 * const sortedLessons = useMemoizedSort(
 *   lessons,
 *   (a, b) => b.difficulty - a.difficulty
 * );
 * ```
 */
export function useMemoizedSort<T>(
  items: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    return [...items].sort(compareFn);
  }, [items]);
}

/**
 * Memoize expensive filtering operations
 * 
 * @param items - Array to filter
 * @param predicate - Filter predicate
 * @returns Filtered array
 * 
 * @example
 * ```tsx
 * const completedLessons = useMemoizedFilter(
 *   lessons,
 *   (lesson) => lesson.completed
 * );
 * ```
 */
export function useMemoizedFilter<T>(
  items: T[],
  predicate: (item: T) => boolean
): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    return items.filter(predicate);
  }, [items]);
}

/**
 * Memoize expensive mapping operations
 * 
 * @param items - Array to map
 * @param mapFn - Mapping function
 * @returns Mapped array
 * 
 * @example
 * ```tsx
 * const lessonIds = useMemoizedMap(
 *   lessons,
 *   (lesson) => lesson.id
 * );
 * ```
 */
export function useMemoizedMap<T, U>(
  items: T[],
  mapFn: (item: T) => U
): U[] {
  return useMemo(() => {
    return items.map(mapFn);
  }, [items, mapFn]);
}

/**
 * Memoize expensive grouping operations
 * 
 * @param items - Array to group
 * @param keyFn - Function to extract grouping key
 * @returns Grouped object
 * 
 * @example
 * ```tsx
 * const lessonsByTopic = useMemoizedGroupBy(
 *   lessons,
 *   (lesson) => lesson.topic
 * );
 * ```
 */
export function useMemoizedGroupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return useMemo(() => {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<K, T[]>);
  }, [items, keyFn]);
}

// ============================================================================
// Virtual Scrolling Helpers
// ============================================================================

/**
 * Calculate visible items for virtual scrolling
 * 
 * @param scrollTop - Current scroll position
 * @param itemHeight - Height of each item
 * @param containerHeight - Height of container
 * @param totalItems - Total number of items
 * @param overscan - Number of items to render outside viewport
 * @returns Object with start index, end index, and offset
 * 
 * @example
 * ```tsx
 * const { startIndex, endIndex, offsetY } = calculateVisibleRange(
 *   scrollTop,
 *   80,
 *   600,
 *   1000,
 *   5
 * );
 * ```
 */
export function calculateVisibleRange(
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  overscan: number = 3
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

/**
 * Hook for virtual scrolling
 * 
 * @param totalItems - Total number of items
 * @param itemHeight - Height of each item
 * @param containerHeight - Height of container
 * @param overscan - Number of items to render outside viewport
 * @returns Virtual scroll state and handlers
 * 
 * @example
 * ```tsx
 * const { visibleItems, totalHeight, offsetY, handleScroll } = useVirtualScroll(
 *   items.length,
 *   80,
 *   600
 * );
 * 
 * <div
 *   style={{ height: 600, overflow: 'auto' }}
 *   onScroll={handleScroll}
 * >
 *   <div style={{ height: totalHeight, position: 'relative' }}>
 *     <div style={{ transform: `translateY(${offsetY}px)` }}>
 *       {items.slice(visibleItems.start, visibleItems.end + 1).map(item => (
 *         <div key={item.id} style={{ height: 80 }}>
 *           {item.content}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * </div>
 * ```
 */
export function useVirtualScroll(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { startIndex, endIndex, offsetY } = useMemo(
    () =>
      calculateVisibleRange(
        scrollTop,
        itemHeight,
        containerHeight,
        totalItems,
        overscan
      ),
    [scrollTop, itemHeight, containerHeight, totalItems, overscan]
  );

  const totalHeight = totalItems * itemHeight;

  return {
    visibleItems: { start: startIndex, end: endIndex },
    totalHeight,
    offsetY,
    handleScroll,
  };
}

// ============================================================================
// Intersection Observer Hook
// ============================================================================

/**
 * Hook for observing element intersection (lazy loading, infinite scroll)
 * 
 * @param options - IntersectionObserver options
 * @returns Ref and isIntersecting state
 * 
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.5,
 * });
 * 
 * <div ref={ref}>
 *   {isIntersecting && <ExpensiveComponent />}
 * </div>
 * ```
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
} {
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setIsIntersecting(entry.isIntersecting);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref: ref as React.RefObject<HTMLElement>, isIntersecting };
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Hook for measuring component render time
 * Useful for identifying performance bottlenecks
 * 
 * @param componentName - Name of component for logging
 * @param enabled - Whether monitoring is enabled
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTime('MyComponent', process.env.NODE_ENV === 'development');
 *   // ... component code
 * }
 * ```
 */
export function useRenderTime(componentName: string, enabled: boolean = false) {
  const renderCount = useRef(0);
  const startTime = useRef(0);

  if (enabled) {
    renderCount.current += 1;
    startTime.current = performance.now();
  }

  useEffect(() => {
    if (enabled) {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      console.log(
        `[Render Time] ${componentName} #${renderCount.current}: ${renderTime.toFixed(2)}ms`
      );
    }
  });
}

/**
 * Hook for detecting slow renders
 * Logs warning if render time exceeds threshold
 * 
 * @param componentName - Name of component for logging
 * @param threshold - Threshold in milliseconds (default: 16ms for 60fps)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useSlowRenderDetection('MyComponent', 16);
 *   // ... component code
 * }
 * ```
 */
export function useSlowRenderDetection(
  componentName: string,
  threshold: number = 16
) {
  const startTime = useRef(0);

  startTime.current = performance.now();

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > threshold) {
      console.warn(
        `[Slow Render] ${componentName} took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a stable callback that doesn't change between renders
 * Useful for preventing unnecessary re-renders of child components
 * 
 * @param callback - Callback function
 * @returns Stable callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Check if component is mounted
 * Useful for preventing state updates on unmounted components
 * 
 * @returns isMounted ref
 */
export function useIsMounted(): React.MutableRefObject<boolean> {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Batch state updates to reduce re-renders
 * 
 * @param initialState - Initial state
 * @returns [state, batchUpdate function]
 * 
 * @example
 * ```tsx
 * const [state, batchUpdate] = useBatchedState({
 *   name: '',
 *   email: '',
 *   age: 0,
 * });
 * 
 * // Single re-render for multiple updates
 * batchUpdate({
 *   name: 'John',
 *   email: 'john@example.com',
 *   age: 30,
 * });
 * ```
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialState);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return [state, batchUpdate];
}
