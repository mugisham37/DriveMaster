"use client";

/**
 * ProfileCard - Molecular Component
 * 
 * Combines ProfileAvatar, VerificationBadge, and user info.
 * Shows quick stats and action buttons.
 * 
 * Requirements: 12.3, 3.1
 */

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Edit, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "../atoms/ProfileAvatar";
import { VerificationBadge } from "../atoms/VerificationBadge";
import { StreakFlame } from "../atoms/StreakFlame";
import { useUserProfile, useProgressSummary } from "@/hooks/useUserService";

export interface ProfileCardProps {
  userId?: string;
  variant?: "compact" | "full";
  showActions?: boolean;
  showStats?: boolean;
  className?: string;
  onEdit?: () => void;
  onSettings?: () => void;
}

export function ProfileCard({
  userId,
  variant = "full",
  showActions = true,
  showStats = true,
  className,
  onEdit,
  onSettings,
}: ProfileCardProps) {
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile(userId || "");
  const { data: progress, isLoading: progressLoading } = useProgressSummary(userId || "", {
    enabled: showStats && !!userId,
  });

  const isLoading = profileLoading || (showStats && progressLoading);
  const isCompact = variant === "compact";

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={cn("pb-3", isCompact && "pb-2")}>
          <div className="flex items-start gap-4">
            <Skeleton className={cn("rounded-full", isCompact ? "h-12 w-12" : "h-16 w-16")} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-16 w-20" />
              <Skeleton className="h-16 w-20" />
              <Skeleton className="h-16 w-20" />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Error state
  if (profileError || !profile) {
    return (
      <Card className={cn("w-full border-destructive", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Failed to load profile</p>
              <p className="text-sm text-muted-foreground">
                {profileError?.message || "An error occurred"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state (shouldn't happen with valid userId)
  if (!userId) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No user selected</p>
        </CardContent>
      </Card>
    );
  }

  const streak = progress?.learningStreak || 0;
  const mastery = Math.round((progress?.overallMastery || 0) * 100);
  const studyTime = progress?.totalStudyTimeMs || 0;
  const studyHours = Math.floor(studyTime / 3600000); // Convert ms to hours

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("pb-3", isCompact && "pb-2")}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              src={profile.avatarUrl}
              alt={profile.displayName || profile.email}
              size={isCompact ? "md" : "lg"}
              status="online"
              showStatus={!isCompact}
              {...(onEdit && { onClick: onEdit })}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-semibold truncate",
                  isCompact ? "text-base" : "text-lg"
                )}>
                  {profile.displayName || "User"}
                </h3>
                {profile.emailVerified && (
                  <VerificationBadge
                    verified={true}
                    type="email"
                    size="sm"
                  />
                )}
                {profile.mfaEnabled && (
                  <VerificationBadge
                    verified={true}
                    type="mfa"
                    size="sm"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {profile.email}
              </p>
              {!isCompact && profile.timezone && (
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.timezone}
                </p>
              )}
            </div>
          </div>

          {showActions && !isCompact && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  aria-label="Edit profile"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSettings}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {showStats && progress && (
        <CardContent className={cn("pt-0", isCompact && "pb-3")}>
          <div className="flex gap-6">
            {/* Streak */}
            <div className="flex items-center gap-2">
              <StreakFlame streak={streak} size="sm" animated={false} />
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-sm font-semibold">{streak} days</p>
              </div>
            </div>

            {/* Mastery */}
            <div>
              <p className="text-xs text-muted-foreground">Mastery</p>
              <p className="text-sm font-semibold">{mastery}%</p>
            </div>

            {/* Study Time */}
            <div>
              <p className="text-xs text-muted-foreground">Study Time</p>
              <p className="text-sm font-semibold">{studyHours}h</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default ProfileCard;
