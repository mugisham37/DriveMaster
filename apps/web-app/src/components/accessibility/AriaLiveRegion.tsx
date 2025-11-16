/**
 * AriaLiveRegion Component
 * 
 * Provides ARIA live regions for screen reader announcements.
 * Implements WCAG 2.1 screen reader accessibility requirements.
 * 
 * Requirements: 12.2, 12.3
 * Task: 13.2
 */

'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AriaLiveRegionProps {
  /**
   * Priority level for announcements
   */
  priority?: 'polite' | 'assertive';

  /**
   * Role for the live region
   */
  role?: 'status' | 'alert' | 'log';

  /**
   * Whether to announce atomic changes
   */
  atomic?: boolean;

  /**
   * Additional class name
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AriaLiveRegion({
  priority = 'polite',
  role = 'status',
  atomic = true,
  className,
}: AriaLiveRegionProps) {
  const [message, setMessage] = useState<string>('');

  // Expose announce function globally
  useEffect(() => {
    const announceFunction = (msg: string) => {
      setMessage(msg);
      
      // Clear message after announcement
      setTimeout(() => {
        setMessage('');
      }, 1000);
    };

    // Store in window for global access
    if (typeof window !== 'undefined') {
      (window as any).__ariaAnnounce = announceFunction;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__ariaAnnounce;
      }
    };
  }, []);

  return (
    <div
      role={role}
      aria-live={priority}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

/**
 * Global ARIA Live Regions Container
 * 
 * Provides multiple live regions for different announcement types.
 */
export function GlobalAriaLiveRegions() {
  return (
    <>
      {/* Polite announcements (status updates, progress) */}
      <AriaLiveRegion priority="polite" role="status" />
      
      {/* Assertive announcements (errors, important alerts) */}
      <AriaLiveRegion priority="assertive" role="alert" />
    </>
  );
}

export default AriaLiveRegion;
