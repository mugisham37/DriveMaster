/**
 * Accessibility Provider
 * 
 * Provides accessibility context and utilities
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsLegend } from './KeyboardShortcutsLegend';

interface AccessibilityContextValue {
  prefersReducedMotion: boolean;
  showShortcutsLegend: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

export interface AccessibilityProviderProps {
  children: React.ReactNode;
  enableKeyboardShortcuts?: boolean;
}

export function AccessibilityProvider({
  children,
  enableKeyboardShortcuts = true,
}: AccessibilityProviderProps) {
  const [showLegend, setShowLegend] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Global keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowLegend(true),
    },
    {
      key: 'Escape',
      description: 'Close modal/popover',
      action: () => {
        // Handled by individual components
      },
    },
  ];

  useKeyboardShortcuts(shortcuts, {
    enabled: enableKeyboardShortcuts,
    scope: 'global',
  });

  const announceToScreenReader = (
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Add skip link
  useEffect(() => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded';
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, []);

  const value: AccessibilityContextValue = {
    prefersReducedMotion,
    showShortcutsLegend: () => setShowLegend(true),
    announceToScreenReader,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <KeyboardShortcutsLegend
        open={showLegend}
        onOpenChange={setShowLegend}
      />
    </AccessibilityContext.Provider>
  );
}

export default AccessibilityProvider;
