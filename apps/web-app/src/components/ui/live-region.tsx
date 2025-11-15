/**
 * LiveRegion Component
 * 
 * ARIA live region for announcing dynamic content changes to screen readers.
 * Use for status updates, notifications, and dynamic content.
 * 
 * Requirements: 10.6
 * Task: 13.2
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SR_ONLY_CLASS } from '@/utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface LiveRegionProps {
  /**
   * Content to announce
   */
  children: React.ReactNode;

  /**
   * Priority level for announcements
   * - polite: Wait for current speech to finish (default)
   * - assertive: Interrupt current speech
   */
  priority?: 'polite' | 'assertive';

  /**
   * Whether the entire region should be announced when any part changes
   */
  atomic?: boolean;

  /**
   * Whether the region should be visible or screen-reader only
   */
  visuallyHidden?: boolean;

  /**
   * Role for the live region
   * - status: For status updates (default for polite)
   * - alert: For important messages (default for assertive)
   * - log: For chat logs or activity feeds
   * - timer: For countdown timers
   */
  role?: 'status' | 'alert' | 'log' | 'timer';

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
  visuallyHidden = true,
  role,
  className,
}: LiveRegionProps) {
  // Determine default role based on priority
  const defaultRole = priority === 'assertive' ? 'alert' : 'status';
  const ariaRole = role || defaultRole;

  return (
    <div
      role={ariaRole}
      aria-live={priority}
      aria-atomic={atomic}
      className={cn(
        visuallyHidden && SR_ONLY_CLASS,
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Specialized Components
// ============================================================================

/**
 * Status announcement (polite, non-interrupting)
 */
export function StatusAnnouncement({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const props: LiveRegionProps = {
    children,
    priority: "polite",
    role: "status",
    visuallyHidden: true,
    ...(className && { className })
  };
  
  return <LiveRegion {...props} />;
}

/**
 * Alert announcement (assertive, interrupting)
 */
export function AlertAnnouncement({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const props: LiveRegionProps = {
    children,
    priority: "assertive",
    role: "alert",
    visuallyHidden: true,
    ...(className && { className })
  };
  
  return <LiveRegion {...props} />;
}

/**
 * Loading announcement
 */
export function LoadingAnnouncement({
  message = 'Loading, please wait',
  className,
}: {
  message?: string;
  className?: string;
}) {
  const props = className ? { className } : {};
  
  return (
    <StatusAnnouncement {...props}>
      {message}
    </StatusAnnouncement>
  );
}

export default LiveRegion;
