/**
 * ProfileOverviewTab Component
 * 
 * Displays profile overview with:
 * - Profile completeness with ProgressRing
 * - Recent achievements section
 * - Quick preferences toggles (theme, notifications)
 * - Account statistics
 * 
 * Requirements: 3.10
 * Task: 6.2
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/user/atoms/ProgressRing';
import { PreferenceToggle } from '@/components/user/molecules/PreferenceToggle';
import { MilestoneCard } from '@/components/user/molecules/MilestoneCard';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserService';
import { useMilestones } from '@/hooks/useUserService';
import { Edit, Award, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/user-service';

// ============================================================================
// Types
// ============================================================================

export interface ProfileOverviewTabProps {
  userId: string;
  userProfile: UserProfile;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateProfileCompleteness(profile: UserProfile): number {
  const fields = [
    profile.email,
    profile.timezone,
    profile.language,
    profile.countryCode,
    profile.emailVerified,
  ];
  
  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}

// ============================================================================
// Component
// ============================================================================

export function ProfileOverviewTab({ userId, userProfile, className = '' }: ProfileOverviewTabProps) {
  const router = useRouter();
  const { data: preferences, isLoading: preferencesLoading } = useUserPreferences(userId);
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(userId);
  const updatePreferences = useUpdateUserPreferences();

  const completeness = calculateProfileCompleteness(userProfile);
  const recentAchievements = milestones?.filter(m => m.achieved).slice(0, 3) || [];

  const handleThemeToggle = async (enabled: boolean) => {
    if (!preferences) return;
    
    try {
      await updatePreferences.mutateAsync({
        userId,
        preferences: {
          theme: enabled ? 'dark' : 'light',
        },
      });
      toast.success('Theme updated');
    } catch (_error) {
      toast.error('Failed to update theme');
    }
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!preferences) return;
    
    try {
      await updatePreferences.mutateAsync({
        userId,
        preferences: {
          notifications: {
            ...preferences.preferences.notifications,
            email: enabled,
          },
        },
      });
      toast.success('Notifications updated');
    } catch (_error) {
      toast.error('Failed to update notifications');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Profile Completeness</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/profile/edit')}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </CardTitle>
          <CardDescription>
            Complete your profile to unlock all features
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ProgressRing
            value={completeness}
            size={120}
            strokeWidth={8}
            showLabel
            className="text-primary"
          />
          <p className="text-sm text-muted-foreground text-center">
            {completeness === 100
              ? 'Your profile is complete!'
              : `${100 - completeness}% remaining to complete your profile`}
          </p>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
          <CardDescription>
            Your latest milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestonesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentAchievements.length > 0 ? (
            <div className="space-y-3">
              {recentAchievements.map(milestone => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  variant="achieved"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No achievements yet. Keep learning to unlock milestones!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Settings</CardTitle>
          <CardDescription>
            Quickly toggle common preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceToggle
            label="Dark Mode"
            description="Use dark theme across the application"
            value={preferences?.preferences.theme === 'dark'}
            onChange={handleThemeToggle}
            disabled={preferencesLoading || updatePreferences.isPending}
          />
          <PreferenceToggle
            label="Email Notifications"
            description="Receive notifications via email"
            value={preferences?.preferences.notifications?.email ?? true}
            onChange={handleNotificationsToggle}
            disabled={preferencesLoading || updatePreferences.isPending}
          />
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {new Date(userProfile.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
              <p className="text-sm text-muted-foreground">Member Since</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {new Date(userProfile.updatedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-muted-foreground">Last Updated</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{recentAchievements.length}</p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
