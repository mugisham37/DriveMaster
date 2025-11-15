/**
 * Loading States Configuration
 * Task 18.3: Loading state improvements
 * 
 * Centralized configuration for loading states, skeleton screens, and transitions
 */

export const LOADING_DELAYS = {
  /** Minimum time to show loading state to avoid flashing */
  MIN_DISPLAY: 300,
  /** Delay before showing loading indicator for fast operations */
  SHOW_DELAY: 150,
  /** Timeout for loading states before showing error */
  TIMEOUT: 30000,
} as const;

export const SKELETON_ANIMATION = {
  /** Duration of skeleton shimmer animation */
  DURATION: '1.5s',
  /** Timing function for smooth animation */
  TIMING: 'ease-in-out',
  /** Whether animation should loop */
  INFINITE: true,
} as const;

export const TRANSITION_DURATIONS = {
  /** Fast transitions for immediate feedback */
  FAST: 150,
  /** Normal transitions for most UI changes */
  NORMAL: 200,
  /** Slow transitions for complex animations */
  SLOW: 300,
  /** Page transitions */
  PAGE: 400,
} as const;

/**
 * Get appropriate skeleton count based on viewport
 */
export function getSkeletonCount(type: 'list' | 'grid' | 'cards'): number {
  if (typeof window === 'undefined') return 3;
  
  const width = window.innerWidth;
  
  switch (type) {
    case 'list':
      return width < 768 ? 3 : 5;
    case 'grid':
      return width < 768 ? 2 : width < 1024 ? 4 : 6;
    case 'cards':
      return width < 768 ? 2 : 3;
    default:
      return 3;
  }
}

/**
 * Delay showing loading state to avoid flashing for fast operations
 */
export function useDelayedLoading(isLoading: boolean, delay = LOADING_DELAYS.SHOW_DELAY): boolean {
  const [showLoading, setShowLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);
  
  return showLoading;
}

import React from 'react';
