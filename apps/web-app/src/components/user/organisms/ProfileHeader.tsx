'use client';

import React from 'react';
import { ProfileAvatar } from '../atoms/ProfileAvatar';
import { VerificationBadge } from '../atoms/VerificationBadge';
import { StreakFlame } from '../atoms/StreakFlame';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Download, Edit } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserService';
import { useProgressSummary } from '@/hooks/useUserService';
import { cn } from '@/lib/utils';

export interface ProfileHeaderProps {
  userId?: string;
  editable?: boolean;
  showActions?: boolean;
  className?: string;
  onEdit?: () => void;
  onSettings?: () => void;
  onExport?: () => void;
}

export function ProfileHeader({
  userId,
  editable = true,
  showActions = true,
  className,
  onEdit,
  onSettings,
  onExport,
}: ProfileHeaderProps) {
  const { profile, isLoading: profileLoading, error: profileError } = useUserProfile(userId);
  const { summary, isLoading: progressLoading } = useProgressSummary(userId);

  if (profileLoading) {
    return <ProfileHeaderSkeleton className={className} />;
  }

  if (profileError || !profile) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <p className="text-sm text-destructive">Failed to load profile. Please try again.</p>
      </div>
    );
  }

  const streak = summary?.streak?.currentStreak || 0;
  const overallMastery = summary?.overallMastery ? Math.round(summary.overallMastery * 100) : 0;
  const totalStudyTime = summary?.totalStudyTime || 0;
  const studyTimeHours = Math.floor(totalStudyTime / 3600);

  // Determine online status
  const lastActive = profile.lastActive ? new Date(profile.lastActive) : null;
  const isOnline = lastActive && (Date.now() - lastActive.getTime()) < 5 * 60 * 1000; // 5 minutes
  const status = isOnline ? 'online' : 'offline';

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Left section: Avatar and user info */}
        <div className="flex gap-4">
          <ProfileAvatar
            src={profile.avatarUrl}
            alt={profile.displayName || profile.email}
            size="xl"
            status={status}
            showStatus
            onClick={editable ? onEdit : undefined}
            className="cursor-pointer"
          />
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{profile.displayName || 'User'}</h2>
              {profile.emailVerified && (
                <VerificationBadge verified type="email" size="md" showTooltip />
              )}
              {profile.mfaEnabled && (
                <VerificationBadge verified type="mfa" size="md" showTooltip />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            
            {lastActive && !isOnline && (
              <p className="text-xs text-muted-foreground">
                Last active {formatRelativeTime(lastActive)}
              </p>
            )}
          </div>
        </div>

        {/* Right section: Action buttons */}
        {showActions && (
          <div className="flex gap-2">
            {editable && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <StreakFlame streak={streak} size="md" animated />
          <div>
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">{overallMastery}%</span>
          </div>
          <div>
            <p className="text-2xl font-bold">{overallMastery}%</p>
            <p className="text-sm text-muted-foreground">Overall Mastery</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">⏱️</span>
          </div>
          <div>
            <p className="text-2xl font-bold">{studyTimeHours}h</p>
            <p className="text-sm text-muted-foreground">Study Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
