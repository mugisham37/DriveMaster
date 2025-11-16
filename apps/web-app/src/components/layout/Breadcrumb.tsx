/**
 * Breadcrumb Navigation Component
 * 
 * Provides hierarchical navigation for deep pages with:
 * - Clickable breadcrumb items for navigation
 * - Dynamic breadcrumb generation based on current route
 * - ARIA labels for accessibility
 * - Responsive design
 * 
 * Requirements: 12.2
 * Task: 16.3
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// ============================================================================
// Route Label Mapping
// ============================================================================

const ROUTE_LABELS: Record<string, string> = {
  learn: 'Dashboard',
  path: 'Learning Path',
  lesson: 'Lesson',
  practice: 'Practice Mode',
  browse: 'Search & Browse',
  progress: 'Progress & Analytics',
  test: 'Tests',
  mock: 'Mock Test',
  profile: 'Profile',
  settings: 'Settings',
  activity: 'Activity',
  onboarding: 'Onboarding',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate breadcrumb items from pathname
 */
function generateBreadcrumbs(pathname: string | null): BreadcrumbItem[] {
  if (!pathname) return [];
  
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Skip dynamic route segments (IDs, UUIDs, etc.)
    if (isDynamicSegment(segment)) {
      // For lesson IDs, show "Lesson" label
      if (segments[i - 1] === 'lesson') {
        breadcrumbs.push({
          label: 'Lesson',
          href: currentPath,
        });
      }
      continue;
    }
    
    // Get label from mapping or format segment
    const label = (segment && ROUTE_LABELS[segment]) || formatSegment(segment);
    
    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }
  
  return breadcrumbs;
}

/**
 * Check if segment is a dynamic route parameter
 */
function isDynamicSegment(segment: string | undefined): boolean {
  if (!segment) return false;
  // Check for UUIDs, numeric IDs, or other dynamic patterns
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numericPattern = /^\d+$/;
  
  return uuidPattern.test(segment) || numericPattern.test(segment);
}

/**
 * Format segment into readable label
 */
function formatSegment(segment: string | undefined): string {
  if (!segment) return '';
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// Component
// ============================================================================

export function Breadcrumb({
  items,
  className,
  showHome = true,
}: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Use provided items or generate from pathname
  const breadcrumbItems = items || generateBreadcrumbs(pathname);
  
  // Don't show breadcrumbs on home or top-level pages
  if (!breadcrumbItems.length || breadcrumbItems.length === 1) {
    return null;
  }
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1" role="list">
        {/* Home link */}
        {showHome && (
          <>
            <li>
              <Link
                href="/learn"
                className={cn(
                  'flex items-center text-muted-foreground hover:text-foreground transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1'
                )}
                aria-label="Home"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          </>
        )}
        
        {/* Breadcrumb items */}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;
          
          return (
            <React.Fragment key={item.href}>
              <li>
                {isLast ? (
                  // Current page - not a link
                  <span
                    className="flex items-center font-medium text-foreground px-2 py-1"
                    aria-current="page"
                  >
                    {Icon && <Icon className="h-4 w-4 mr-1" aria-hidden="true" />}
                    {item.label}
                  </span>
                ) : (
                  // Link to parent pages
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center text-muted-foreground hover:text-foreground transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-1" aria-hidden="true" />}
                    {item.label}
                  </Link>
                )}
              </li>
              
              {/* Separator */}
              {!isLast && (
                <li aria-hidden="true">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb Separator Component
 * Can be used for custom breadcrumb layouts
 */
export function BreadcrumbSeparator({
  className,
}: {
  className?: string;
}) {
  return (
    <ChevronRight
      className={cn('h-4 w-4 text-muted-foreground', className)}
      aria-hidden="true"
    />
  );
}

/**
 * Breadcrumb Item Component
 * Can be used for custom breadcrumb layouts
 */
export function BreadcrumbItem({
  children,
  href,
  isCurrentPage = false,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  isCurrentPage?: boolean;
  className?: string;
}) {
  if (isCurrentPage || !href) {
    return (
      <span
        className={cn(
          'flex items-center font-medium text-foreground px-2 py-1',
          className
        )}
        aria-current={isCurrentPage ? 'page' : undefined}
      >
        {children}
      </span>
    );
  }
  
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center text-muted-foreground hover:text-foreground transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-2 py-1',
        className
      )}
    >
      {children}
    </Link>
  );
}
