/**
 * FocusVisibleProvider Component
 * 
 * Manages focus-visible behavior across the application.
 * Shows focus indicators only for keyboard navigation, not mouse clicks.
 * 
 * Requirements: 10.1, 10.14
 * Task: 13.1, 13.3
 */

'use client';

import * as React from 'react';
import { useEffect } from 'react';

// ============================================================================
// Context
// ============================================================================

interface FocusVisibleContextValue {
  isFocusVisible: boolean;
}

const FocusVisibleContext = React.createContext<FocusVisibleContextValue>({
  isFocusVisible: false,
});

export function useFocusVisible() {
  return React.useContext(FocusVisibleContext);
}

// ============================================================================
// Provider Component
// ============================================================================

export interface FocusVisibleProviderProps {
  children: React.ReactNode;
}

export function FocusVisibleProvider({ children }: FocusVisibleProviderProps) {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;
    let hadFocusVisibleRecentlyTimeout: ReturnType<typeof setTimeout> | null = null;

    const inputTypesAllowlist = new Set([
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
      'number',
      'date',
      'month',
      'week',
      'time',
      'datetime',
      'datetime-local',
    ]);

    /**
     * Check if element should always show focus
     */
    function isTextInput(element: Element): boolean {
      if (element.tagName === 'TEXTAREA') return true;
      if (element.tagName === 'INPUT') {
        const type = (element as HTMLInputElement).type;
        return inputTypesAllowlist.has(type);
      }
      return false;
    }

    /**
     * Handle keyboard events
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.altKey || event.ctrlKey) {
        return;
      }

      hadKeyboardEvent = true;
      setIsFocusVisible(true);
    }

    /**
     * Handle pointer events
     */
    function onPointerDown() {
      hadKeyboardEvent = false;
      setIsFocusVisible(false);
    }

    /**
     * Handle focus events
     */
    function onFocus(event: FocusEvent) {
      const target = event.target as Element;

      // Always show focus for text inputs
      if (isTextInput(target)) {
        setIsFocusVisible(true);
        return;
      }

      // Show focus if keyboard was used
      if (hadKeyboardEvent) {
        setIsFocusVisible(true);
      }
    }

    /**
     * Handle blur events
     */
    function onBlur() {
      setIsFocusVisible(false);

      // Keep track of recent focus for a short time
      if (hadFocusVisibleRecentlyTimeout) {
        clearTimeout(hadFocusVisibleRecentlyTimeout);
      }

      hadFocusVisibleRecentlyTimeout = setTimeout(() => {
        // Track focus visible state for a short time
      }, 100);
    }

    // Add event listeners
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);

    // Add CSS class to body for global styling
    document.body.classList.add('focus-visible-enabled');

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);

      if (hadFocusVisibleRecentlyTimeout) {
        clearTimeout(hadFocusVisibleRecentlyTimeout);
      }

      document.body.classList.remove('focus-visible-enabled');
    };
  }, []);

  return (
    <FocusVisibleContext.Provider value={{ isFocusVisible }}>
      {children}
    </FocusVisibleContext.Provider>
  );
}

export default FocusVisibleProvider;
