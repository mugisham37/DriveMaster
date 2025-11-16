/**
 * HighContrastProvider Component
 * 
 * Provides high contrast mode context based on user preferences.
 * Implements WCAG 2.1 contrast accessibility requirements.
 * 
 * Requirements: 12.3
 * Task: 13.4
 */

'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface HighContrastContextValue {
  /**
   * Whether high contrast mode is preferred
   */
  prefersHighContrast: boolean;

  /**
   * Check if high contrast mode is active
   */
  isHighContrast: () => boolean;

  /**
   * Get contrast-appropriate color
   */
  getContrastColor: (normalColor: string, highContrastColor: string) => string;
}

// ============================================================================
// Context
// ============================================================================

const HighContrastContext = createContext<HighContrastContextValue | undefined>(
  undefined
);

// ============================================================================
// Provider
// ============================================================================

export interface HighContrastProviderProps {
  children: React.ReactNode;
}

export function HighContrastProvider({ children }: HighContrastProviderProps) {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  // ============================================================================
  // Detect High Contrast Preference
  // ============================================================================

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;

    // Create media query for high contrast
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    // Set initial value
    setPrefersHighContrast(highContrastQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    // Add listener
    highContrastQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      highContrastQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // ============================================================================
  // Apply CSS Class
  // ============================================================================

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [prefersHighContrast]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const isHighContrast = (): boolean => {
    return prefersHighContrast;
  };

  const getContrastColor = (normalColor: string, highContrastColor: string): string => {
    return prefersHighContrast ? highContrastColor : normalColor;
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: HighContrastContextValue = {
    prefersHighContrast,
    isHighContrast,
    getContrastColor,
  };

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useHighContrast(): HighContrastContextValue {
  const context = useContext(HighContrastContext);

  if (context === undefined) {
    throw new Error('useHighContrast must be used within a HighContrastProvider');
  }

  return context;
}

// ============================================================================
// HOC for Components
// ============================================================================

export interface WithHighContrastProps {
  prefersHighContrast?: boolean;
}

export function withHighContrast<P extends object>(
  Component: React.ComponentType<P & WithHighContrastProps>
) {
  return function WithHighContrastComponent(props: P) {
    const { prefersHighContrast } = useHighContrast();

    return <Component {...props} prefersHighContrast={prefersHighContrast} />;
  };
}

export default HighContrastProvider;
