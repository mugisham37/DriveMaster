"use client";

/**
 * Dashboard Page (Layer 1)
 * 
 * Central hub for all learning activity, showing progress, recommendations, and quick actions.
 * Requirements: 1.1, 2.1, 13.2, 14.3
 */

import React, { Suspense } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import DashboardContent from './DashboardContent';

// Note: Metadata is set in layout.tsx for this route group

// Loading skeleton for the entire dashboard
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Skeleton */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="space-y-4">
              <div className="h-12 bg-muted animate-pulse rounded"></div>
              <div className="h-12 bg-muted animate-pulse rounded"></div>
              <div className="h-12 bg-muted animate-pulse rounded"></div>
              <div className="h-12 bg-muted animate-pulse rounded"></div>
            </div>
          </aside>

          {/* Main Content Skeleton */}
          <main className="flex-1 space-y-8">
            {/* Welcome Section */}
            <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
            
            {/* Progress Overview */}
            <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
            
            {/* Recommended Lessons */}
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
                <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
                <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Authentication check - redirects to sign-in if not authenticated
  const { isLoading: authLoading } = useRequireAuth({
    redirectTo: '/auth/signin',
  });

  // Show loading state while checking authentication
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </RouteErrorBoundary>
  );
}
