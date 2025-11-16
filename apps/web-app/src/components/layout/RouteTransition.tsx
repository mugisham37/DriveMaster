/**
 * Route Transition Component
 * 
 * Provides smooth transitions between routes with:
 * - Loading indicators during route changes
 * - Smooth page transitions
 * - Scroll position preservation on back navigation
 * - Graceful error handling
 * 
 * Requirements: 13.1
 * Task: 16.4
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';


// ============================================================================
// Types
// ============================================================================

interface RouteTransitionProps {
  children: React.ReactNode;
  className?: string;
  showLoadingBar?: boolean;
  preserveScroll?: boolean;
}

interface ScrollPosition {
  x: number;
  y: number;
}

// ============================================================================
// Scroll Position Manager
// ============================================================================

class ScrollPositionManager {
  private positions = new Map<string, ScrollPosition>();
  private sessionKey = 'route-scroll-positions';

  constructor() {
    // Restore positions from sessionStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(this.sessionKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.positions = new Map(Object.entries(parsed));
        }
      } catch (error) {
        console.error('Failed to restore scroll positions:', error);
      }
    }
  }

  save(key: string, position: ScrollPosition) {
    this.positions.set(key, position);
    this.persist();
  }

  get(key: string): ScrollPosition | undefined {
    return this.positions.get(key);
  }

  clear(key: string) {
    this.positions.delete(key);
    this.persist();
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        const obj = Object.fromEntries(this.positions);
        sessionStorage.setItem(this.sessionKey, JSON.stringify(obj));
      } catch (error) {
        console.error('Failed to persist scroll positions:', error);
      }
    }
  }
}

// Singleton instance
const scrollManager = typeof window !== 'undefined' ? new ScrollPositionManager() : null;

// ============================================================================
// Loading Bar Component
// ============================================================================

function LoadingBar({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timer);
    }

    setProgress(10);
    const timer1 = setTimeout(() => setProgress(30), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(80), 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Page loading progress"
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}



// ============================================================================
// Main Component
// ============================================================================

export function RouteTransition({
  children,
  className,
  showLoadingBar = true,
  preserveScroll = true,
}: RouteTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousPathRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Generate route key for scroll position tracking
  const getRouteKey = useCallback(() => {
    const params = searchParams?.toString();
    return params ? `${pathname}?${params}` : pathname || '';
  }, [pathname, searchParams]);

  // Save current scroll position
  const saveScrollPosition = useCallback(() => {
    if (!preserveScroll || !scrollManager) return;

    const key = getRouteKey();
    const position = {
      x: window.scrollX,
      y: window.scrollY,
    };
    scrollManager.save(key, position);
  }, [preserveScroll, getRouteKey]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!preserveScroll || !scrollManager) return;

    const key = getRouteKey();
    const position = scrollManager.get(key);

    if (position) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(position.x, position.y);
      });
    } else {
      // Scroll to top for new pages
      window.scrollTo(0, 0);
    }
  }, [preserveScroll, getRouteKey]);

  // Handle route changes
  useEffect(() => {
    const currentPath = getRouteKey();

    // Skip on initial mount
    if (previousPathRef.current === null) {
      previousPathRef.current = currentPath;
      return;
    }

    // Check if route actually changed
    if (previousPathRef.current === currentPath) {
      return;
    }

    // Save scroll position of previous route
    saveScrollPosition();

    // Start loading state
    setIsLoading(true);
    setIsTransitioning(true);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set a timeout to hide loading state
    // This ensures we don't show loading indefinitely
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      
      // Restore scroll position after a brief delay
      setTimeout(() => {
        restoreScrollPosition();
        setIsTransitioning(false);
      }, 100);
    }, 300);

    // Update previous path
    previousPathRef.current = currentPath;

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [pathname, searchParams, saveScrollPosition, restoreScrollPosition, getRouteKey]);

  // Save scroll position before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, searchParams, saveScrollPosition]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // Restore scroll position on back/forward navigation
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [restoreScrollPosition]);

  return (
    <>
      {/* Loading bar at top of page */}
      {showLoadingBar && <LoadingBar isLoading={isLoading} />}

      {/* Main content with transition */}
      <div
        className={cn(
          'transition-opacity duration-200',
          isTransitioning && 'opacity-90',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

/**
 * Hook to programmatically trigger route loading state
 */
export function useRouteLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
}

/**
 * Hook to save and restore scroll position manually
 */
export function useScrollPosition(key?: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getKey = useCallback(() => {
    if (key) return key;
    const params = searchParams?.toString();
    return params ? `${pathname}?${params}` : pathname || '';
  }, [key, pathname, searchParams]);

  const save = () => {
    if (!scrollManager) return;
    const position = {
      x: window.scrollX,
      y: window.scrollY,
    };
    scrollManager.save(getKey(), position);
  };

  const restore = () => {
    if (!scrollManager) return;
    const position = scrollManager.get(getKey());
    if (position) {
      window.scrollTo(position.x, position.y);
    }
  };

  const clear = () => {
    if (!scrollManager) return;
    scrollManager.clear(getKey());
  };

  return {
    save,
    restore,
    clear,
  };
}
