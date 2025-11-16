/**
 * ReducedMotionProvider Component
 * 
 * Provides reduced motion context based on user preferences.
 * Implements WCAG 2.1 motion accessibility requirements.
 * 
 * Requirements: 12.5
 * Task: 13.3
 */

'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ReducedMotionContextValue {
  /**
   * Whether reduced motion is preferred
   */
  prefersReducedMotion: boolean;

  /**
   * Get animation duration based on preference
   * Returns 0 if reduced motion is preferred, otherwise returns the provided duration
   */
  getAnimationDuration: (defaultMs: number) => number;

  /**
   * Check if animations should be disabled
   */
  shouldReduceMotion: () => boolean;
}

// ============================================================================
// Context
// ============================================================================

const ReducedMotionContext = createContext<ReducedMotionContextValue | undefined>(
  undefined
);

// ============================================================================
// Provider
// ============================================================================

export interface ReducedMotionProviderProps {
  children: React.ReactNode;
}

export function ReducedMotionProvider({ children }: ReducedMotionProviderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ============================================================================
  // Detect Reduced Motion Preference
  // ============================================================================

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // ============================================================================
  // Apply CSS Class
  // ============================================================================

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [prefersReducedMotion]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getAnimationDuration = (defaultMs: number): number => {
    return prefersReducedMotion ? 0 : defaultMs;
  };

  const shouldReduceMotion = (): boolean => {
    return prefersReducedMotion;
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: ReducedMotionContextValue = {
    prefersReducedMotion,
    getAnimationDuration,
    shouldReduceMotion,
  };

  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useReducedMotion(): ReducedMotionContextValue {
  const context = useContext(ReducedMotionContext);

  if (context === undefined) {
    throw new Error('useReducedMotion must be used within a ReducedMotionProvider');
  }

  return context;
}

// ============================================================================
// HOC for Components
// ============================================================================

export interface WithReducedMotionProps {
  prefersReducedMotion?: boolean;
}

export function withReducedMotion<P extends object>(
  Component: React.ComponentType<P & WithReducedMotionProps>
) {
  return function WithReducedMotionComponent(props: P) {
    const { prefersReducedMotion } = useReducedMotion();

    return <Component {...props} prefersReducedMotion={prefersReducedMotion} />;
  };
}

export default ReducedMotionProvider;
