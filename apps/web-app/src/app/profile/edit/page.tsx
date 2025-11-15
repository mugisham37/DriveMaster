/**
 * Profile Edit Page Route
 * 
 * Dedicated page for editing profile with:
 * - ProfileEditForm with auto-save
 * - Form validation
 * - Success/error handling
 * - Navigation back to profile
 * 
 * Requirements: 3.3, 3.9
 * Task: 6.5
 */

'use client';

import React from 'react';

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserService';
import { ProfileEditForm } from '@/components/user/templates/ProfileEditForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProfileEditSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <Skeleton className="h-10 w-32" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?.id?.toString() || '';

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useUserProfile(userId, {
    enabled: !!userId && isAuthenticated,
  });

  const handleSuccess = () => {
    toast.success('Profile updated successfully');
    // Optionally navigate back to profile
    // router.push('/profile');
  };

  const handleBack = () => {
    router.push('/profile');
  };

  // Loading state
  if (authLoading || profileLoading) {
    return <ProfileEditSkeleton />;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to edit your profile.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (profileError || !userProfile) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{profileError?.message || 'Failed to load profile'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Success state
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Button>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your personal information and preferences. Changes are saved automatically.
        </p>
      </div>

      {/* Edit Form */}
      <ProfileEditForm
        userId={userId}
        userProfile={userProfile}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
