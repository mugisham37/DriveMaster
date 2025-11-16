/**
 * FocusTrap Component
 * 
 * Traps focus within a container for modals and dialogs.
 * Implements WCAG 2.1 focus management requirements.
 * 
 * Requirements: 12.1, 12.4
 * Task: 13.1
 */

'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useModalKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

// ============================================================================
// Types
// ============================================================================

export interface FocusTrapProps {
  /**
   * Whether the focus trap is active
   */
  active?: boolean;

  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Whether to auto-focus the first element on mount
   */
  autoFocus?: boolean;

  /**
   * Whether to restore focus on unmount
   */
  restoreFocus?: boolean;

  /**
   * Children to render
   */
  children: React.ReactNode;

  /**
   * Additional class name
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FocusTrap({
  active = true,
  onEscape,
  autoFocus = true,
  restoreFocus = true,
  children,
  className,
}: FocusTrapProps) {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Use keyboard navigation hook for focus trapping
  const { containerRef } = useModalKeyboardNavigation(onEscape || (() => {}));

  // ============================================================================
  // Store Previously Focused Element
  // ============================================================================

  useEffect(() => {
    if (active && autoFocus) {
      // Store the currently focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    }
  }, [active, autoFocus]);

  // ============================================================================
  // Restore Focus on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (restoreFocus && previouslyFocusedElement.current) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          previouslyFocusedElement.current?.focus();
        }, 0);
      }
    };
  }, [restoreFocus]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className}
    >
      {children}
    </div>
  );
}

export default FocusTrap;
