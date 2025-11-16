/**
 * Progress and Analytics Page (Layer 1)
 * 
 * Comprehensive learning statistics, insights, and performance tracking.
 * 
 * Requirements: 9.1, 13.2, 14.3
 * Task: 9.1 - 9.8
 */

'use client';

import React, { Suspense } from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ProgressPageContent } from './ProgressPageContent';

export default function ProgressPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Authentication check
  if (authLoading) {
    return <ProgressPageSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to view your progress and analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ProgressPageSkeleton />}>
        <ProgressPageContent userId={user.id.toString()} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

function ProgressPageSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Topic Mastery Section */}
      <Skeleton className="h-96" />

      {/* Accuracy Trend Section */}
      <Skeleton className="h-80" />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>

      {/* Activity Heatmap */}
      <Skeleton className="h-64" />
    </div>
  );
}
