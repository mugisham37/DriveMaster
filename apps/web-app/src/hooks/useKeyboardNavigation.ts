/**
 * useKeyboardNavigation Hook
 * 
 * Provides keyboard navigation functionality for interactive components.
 * Implements WCAG 2.1 keyboard accessibility requirements.
 * 
 * Requirements: 10.1, 10.2, 10.3
 * Task: 13.1
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  KEYBOARD_KEYS,
  trapFocus,
  handleEscapeKey,
  getFocusableElements,
  restoreFocus,
} from '@/utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface UseKeyboardNavigationOptions {
  /**
   * Enable focus trapping (for modals, dialogs)
   */
  trapFocus?: boolean;

  /**
   * Handle Escape key press
   */
  onEscape?: () => void;

  /**
   * Handle Enter key press
   */
  onEnter?: () => void;

  /**
   * Enable arrow key navigation
   */
  enableArrowKeys?: boolean;

  /**
   * Orientation for arrow key navigation
   */
  orientation?: 'horizontal' | 'vertical' | 'both';

  /**
   * Auto-focus first element on mount
   */
  autoFocus?: boolean;

  /**
   * Restore focus on unmount
   */
  restoreFocusOnUnmount?: boolean;
}

export interface UseKeyboardNavigationReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: React.RefObject<HTMLElement>;

  /**
   * Current focused index (for arrow key navigation)
   */
  focusedIndex: number;

  /**
   * Set focused index programmatically
   */
  setFocusedIndex: (index: number) => void;

  /**
   * Focus the next element
   */
  focusNext: () => void;

  /**
   * Focus the previous element
   */
  focusPrevious: () => void;

  /**
   * Focus the first element
   */
  focusFirst: () => void;

  /**
   * Focus the last element
   */
  focusLast: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const {
    trapFocus: shouldTrapFocus = false,
    onEscape,
    onEnter,
    enableArrowKeys = false,
    orientation = 'vertical',
    autoFocus = false,
    restoreFocusOnUnmount = false,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const focusedIndexRef = useRef<number>(0);

  // ============================================================================
  // Focus Management
  // ============================================================================

  const getFocusableItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return getFocusableElements(containerRef.current);
  }, []);

  const focusItemAtIndex = useCallback((index: number) => {
    const items = getFocusableItems();
    if (items.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    focusedIndexRef.current = clampedIndex;
    items[clampedIndex]?.focus();
  }, [getFocusableItems]);

  const setFocusedIndex = useCallback((index: number) => {
    focusItemAtIndex(index);
  }, [focusItemAtIndex]);

  const focusNext = useCallback(() => {
    const items = getFocusableItems();
    if (items.length === 0) return;

    const nextIndex = (focusedIndexRef.current + 1) % items.length;
    focusItemAtIndex(nextIndex);
  }, [getFocusableItems, focusItemAtIndex]);

  const focusPrevious = useCallback(() => {
    const items = getFocusableItems();
    if (items.length === 0) return;

    const prevIndex =
      focusedIndexRef.current === 0
        ? items.length - 1
        : focusedIndexRef.current - 1;
    focusItemAtIndex(prevIndex);
  }, [getFocusableItems, focusItemAtIndex]);

  const focusFirst = useCallback(() => {
    focusItemAtIndex(0);
  }, [focusItemAtIndex]);

  const focusLast = useCallback(() => {
    const items = getFocusableItems();
    if (items.length === 0) return;
    focusItemAtIndex(items.length - 1);
  }, [getFocusableItems, focusItemAtIndex]);

  // ============================================================================
  // Keyboard Event Handlers
  // ============================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === KEYBOARD_KEYS.ESCAPE && onEscape) {
        handleEscapeKey(event, onEscape);
        return;
      }

      // Handle Enter key
      if (event.key === KEYBOARD_KEYS.ENTER && onEnter) {
        event.preventDefault();
        onEnter();
        return;
      }

      // Handle focus trapping
      if (shouldTrapFocus && containerRef.current) {
        trapFocus(containerRef.current, event);
      }

      // Handle arrow key navigation
      if (enableArrowKeys) {
        const isVertical = orientation === 'vertical' || orientation === 'both';
        const isHorizontal = orientation === 'horizontal' || orientation === 'both';

        if (isVertical && event.key === KEYBOARD_KEYS.ARROW_DOWN) {
          event.preventDefault();
          focusNext();
        } else if (isVertical && event.key === KEYBOARD_KEYS.ARROW_UP) {
          event.preventDefault();
          focusPrevious();
        } else if (isHorizontal && event.key === KEYBOARD_KEYS.ARROW_RIGHT) {
          event.preventDefault();
          focusNext();
        } else if (isHorizontal && event.key === KEYBOARD_KEYS.ARROW_LEFT) {
          event.preventDefault();
          focusPrevious();
        } else if (event.key === KEYBOARD_KEYS.HOME) {
          event.preventDefault();
          focusFirst();
        } else if (event.key === KEYBOARD_KEYS.END) {
          event.preventDefault();
          focusLast();
        }
      }
    },
    [
      shouldTrapFocus,
      onEscape,
      onEnter,
      enableArrowKeys,
      orientation,
      focusNext,
      focusPrevious,
      focusFirst,
      focusLast,
    ]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Setup keyboard event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      // Store previously focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      // Focus first element
      focusFirst();
    }
  }, [autoFocus, focusFirst]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocusOnUnmount && previouslyFocusedElement.current) {
        restoreFocus(previouslyFocusedElement.current);
      }
    };
  }, [restoreFocusOnUnmount]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    containerRef,
    focusedIndex: focusedIndexRef.current,
    setFocusedIndex,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for modal/dialog keyboard navigation
 */
export function useModalKeyboardNavigation(onClose: () => void) {
  return useKeyboardNavigation({
    trapFocus: true,
    onEscape: onClose,
    autoFocus: true,
    restoreFocusOnUnmount: true,
  });
}

/**
 * Hook for menu/dropdown keyboard navigation
 */
export function useMenuKeyboardNavigation(onClose?: () => void) {
  return useKeyboardNavigation({
    enableArrowKeys: true,
    orientation: 'vertical',
    onEscape: onClose || undefined,
    autoFocus: true,
  });
}

/**
 * Hook for tab list keyboard navigation
 */
export function useTabListKeyboardNavigation() {
  return useKeyboardNavigation({
    enableArrowKeys: true,
    orientation: 'horizontal',
  });
}

/**
 * Hook for list keyboard navigation
 */
export function useListKeyboardNavigation(orientation: 'horizontal' | 'vertical' = 'vertical') {
  return useKeyboardNavigation({
    enableArrowKeys: true,
    orientation,
  });
}
