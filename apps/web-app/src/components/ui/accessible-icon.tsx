/**
 * AccessibleIcon Component
 * 
 * Wrapper for icons to ensure proper accessibility with ARIA labels.
 * Use for icon-only buttons and decorative icons.
 * 
 * Requirements: 10.5
 * Task: 13.2
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AccessibleIconProps {
  /**
   * The icon component to render
   */
  children: React.ReactNode;

  /**
   * Accessible label for the icon
   * Required for meaningful icons, omit for decorative icons
   */
  label?: string;

  /**
   * Whether the icon is decorative only
   * Decorative icons are hidden from screen readers
   */
  decorative?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AccessibleIcon({
  children,
  label,
  decorative = false,
  className,
}: AccessibleIconProps) {
  // Decorative icons should be hidden from screen readers
  if (decorative) {
    return (
      <span
        className={cn('inline-flex', className)}
        aria-hidden="true"
      >
        {children}
      </span>
    );
  }

  // Meaningful icons need labels
  if (!label) {
    console.warn(
      'AccessibleIcon: Non-decorative icons must have a label. ' +
      'Either provide a label prop or set decorative={true}.'
    );
  }

  return (
    <span
      className={cn('inline-flex', className)}
      role="img"
      aria-label={label}
    >
      {children}
    </span>
  );
}

export default AccessibleIcon;
