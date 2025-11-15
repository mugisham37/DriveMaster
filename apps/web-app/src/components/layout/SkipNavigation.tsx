/**
 * SkipNavigation Component
 * 
 * Provides skip navigation links for keyboard users to bypass repetitive content.
 * Implements WCAG 2.1 requirement for skip links.
 * 
 * Requirements: 10.1, 10.3
 * Task: 13.1
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { skipToContent } from '@/utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

export interface SkipNavigationProps {
  links?: SkipLink[];
  className?: string;
}

// ============================================================================
// Default Skip Links
// ============================================================================

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  {
    id: 'skip-to-main',
    label: 'Skip to main content',
    targetId: 'main-content',
  },
  {
    id: 'skip-to-nav',
    label: 'Skip to navigation',
    targetId: 'main-navigation',
  },
  {
    id: 'skip-to-footer',
    label: 'Skip to footer',
    targetId: 'footer',
  },
];

// ============================================================================
// Component
// ============================================================================

export function SkipNavigation({
  links = DEFAULT_SKIP_LINKS,
  className,
}: SkipNavigationProps) {
  const handleSkipClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    skipToContent(targetId);
  };

  return (
    <nav
      className={cn('skip-navigation', className)}
      aria-label="Skip navigation"
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.targetId}`}
          className={cn(
            // Screen reader only by default
            'absolute left-0 top-0 z-[9999]',
            'px-4 py-2 bg-blue-600 text-white font-medium',
            'transform -translate-y-full',
            // Show on focus
            'focus:translate-y-0',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'transition-transform duration-200'
          )}
          onClick={(e) => handleSkipClick(e, link.targetId)}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export default SkipNavigation;
