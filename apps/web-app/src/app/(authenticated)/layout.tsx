/**
 * Authenticated Routes Layout
 * 
 * Provides consistent layout for all authenticated pages with:
 * - Main navigation menu
 * - User profile section
 * - Notification center
 * - Error boundaries
 * 
 * Requirements: 1.1, 2.1, 12.1
 * Task: 16.1
 */

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { MainNavigation } from '@/components/layout/MainNavigation';
import { redirect } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  // Redirect to sign-in if not authenticated
  // Note: Middleware should handle this, but this is a backup
  if (!isLoading && !user) {
    redirect('/auth/signin');
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RouteErrorBoundary>
      <div className="flex min-h-screen flex-col">
        {/* Main Navigation */}
        <MainNavigation />
        
        {/* Main Content Area with Route Transitions */}
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    </RouteErrorBoundary>
  );
}
