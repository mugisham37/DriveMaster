/**
 * VisuallyHidden Component
 * 
 * Hides content visually but keeps it accessible to screen readers.
 * Use for providing additional context to assistive technologies.
 * 
 * Requirements: 10.4, 10.5
 * Task: 13.2
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SR_ONLY_CLASS } from '@/utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface VisuallyHiddenProps {
  /**
   * Content to hide visually
   */
  children: React.ReactNode;

  /**
   * HTML element to render
   */
  as?: keyof JSX.IntrinsicElements;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show the content on focus (for skip links)
   */
  showOnFocus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function VisuallyHidden({
  children,
  as = 'span',
  className,
  showOnFocus = false,
}: VisuallyHiddenProps) {
  const Component = as as any;
  
  return (
    <Component
      className={cn(
        SR_ONLY_CLASS,
        showOnFocus && 'focus:not-sr-only focus:absolute focus:z-50 focus:p-4',
        className
      )}
    >
      {children}
    </Component>
  );
}

export default VisuallyHidden;
