/**
 * Page Wrapper Component
 * 
 * Provides consistent page structure with optional breadcrumbs
 * Requirements: 12.2, 13.1
 */

'use client';

import React from 'react';
import { Breadcrumb, BreadcrumbItem as BreadcrumbItemType } from './Breadcrumb';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
  breadcrumbItems?: BreadcrumbItemType[];
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

// ============================================================================
// Component
// ============================================================================

export function PageWrapper({
  children,
  className,
  showBreadcrumbs = false,
  breadcrumbItems,
  title,
  description,
  actions,
  maxWidth = 'full',
}: PageWrapperProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className={cn('container mx-auto px-4 py-6', maxWidthClasses[maxWidth])}>
        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <div className="mb-4">
            {breadcrumbItems ? (
              <Breadcrumb items={breadcrumbItems} />
            ) : (
              <Breadcrumb />
            )}
          </div>
        )}

        {/* Page Header */}
        {(title || description || actions) && (
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {title && (
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-muted-foreground text-lg">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}

/**
 * Page Section Component
 * For organizing content within a page
 */
export function PageSection({
  children,
  className,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || description || actions) && (
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {title && (
                <h2 className="text-2xl font-semibold tracking-tight mb-1">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
