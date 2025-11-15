/**
 * Profile Page Route
 * 
 * Main profile page with tab navigation for:
 * - Overview: Profile completeness, achievements, quick settings
 * - Progress: Progress dashboard (from Task 8)
 * - Activity: Activity feed (from Task 9)
 * - GDPR: Privacy controls (from Task 10)
 * 
 * Requirements: 3.1, 3.2, 9.3 (code splitting), 11.6 (error boundaries)
 * Task: 6.3, 12.1 (route-based code splitting), 14.1 (error boundary wrapping)
 */

'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { UserProfileErrorBoundary } from '@/components/user/error-boundary';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserService';
import { ProfileLayout } from '@/components/user/templates/ProfileLayout';
import { ProfileOverviewTab } from '@/components/user/templates/ProfileOverviewTab';
import type { UserProfile } from '@/types/user-service';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Code splitting: Lazy load heavy components (Task 12.2)
const ProgressDashboard = dynamic(
  () => import('@/components/user/organisms/ProgressDashboard').then(mod => ({ default: mod.ProgressDashboard })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const ActivityFeed = dynamic(
  () => import('@/components/user/organisms/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const GDPRDashboard = dynamic(
  () => import('@/components/gdpr/GDPRDashboard').then(mod => ({ default: mod.GDPRDashboard })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
);

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProfilePageSkeleton() {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <Skeleton className="h-12 w-full" />

      {/* Content Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Error Display
// ============================================================================

function ProfilePageError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?.id || '';
  
  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useUserProfile(userId, {
    enabled: !!userId && isAuthenticated,
  });

  // Loading state
  if (authLoading || profileLoading) {
    return <ProfilePageSkeleton />;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to view your profile.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (profileError || !userProfile) {
    return (
      <ProfilePageError
        error={profileError?.message || 'Failed to load profile. Please try again.'}
        onRetry={() => refetch()}
      />
    );
  }

  // Success state - Wrapped with error boundary (Task 14.1)
  return (
    <UserProfileErrorBoundary>
      <Suspense fallback={<ProfilePageSkeleton />}>
        <ProfileLayout userId={userId} userProfile={userProfile}>
          {/* Overview Tab */}
          <TabsContent value="overview">
            <ProfileOverviewTab userId={userId} userProfile={userProfile} />
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <ProgressDashboard userId={userId} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <ActivityFeed userId={userId} />
          </TabsContent>

          {/* GDPR Tab */}
          <TabsContent value="gdpr">
            <GDPRDashboard />
          </TabsContent>
        </ProfileLayout>
      </Suspense>
    </UserProfileErrorBoundary>
  );
}
