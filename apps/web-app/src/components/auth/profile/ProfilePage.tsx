"use client";

/**
 * ProfilePage Component
 * 
 * Implements complete profile page with:
 * - Profile header with avatar, handle, name
 * - Reputation, flair, and badges display
 * - Role indicators (Mentor, Insider, User)
 * - Profile form integration
 * - Avatar upload integration
 * - Preferences form integration
 * - Linked providers integration
 * - Skeleton loaders
 * - Error handling
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 14.2, 15.1, 18.1
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { profileSessionClient } from "@/lib/auth/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "./ProfileForm";
import { AvatarUpload } from "./AvatarUpload";
import { PreferencesForm } from "./PreferencesForm";
import { LinkedProviders } from "../oauth/LinkedProviders";
import { 
  User, 
  Settings, 
  Link as LinkIcon, 
  Award, 
  Star, 
  Shield,
  AlertCircle 
} from "lucide-react";
import type { UserProfile } from "@/types/auth-service";

// ============================================================================
// Component Props
// ============================================================================

export interface ProfilePageProps {
  className?: string;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProfilePageSkeleton() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header Skeleton */}
      <Card>
        <CardHeader>
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
        </CardHeader>
      </Card>

      {/* Content Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
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
// Component Implementation
// ============================================================================

export function ProfilePage({ className }: ProfilePageProps) {
  const { user: contextUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(contextUser);
  const [isLoading, setIsLoading] = useState(!contextUser);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Fetch Profile Data
  // ============================================================================

  useEffect(() => {
    const fetchProfile = async () => {
      if (contextUser) {
        setUser(contextUser);
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await profileSessionClient.getProfile();
        
        if (response && typeof response === "object" && "user" in response) {
          setUser(response.user as UserProfile);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load profile. Please try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [contextUser, isAuthenticated]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleProfileUpdate = async () => {
    // Refresh profile data after update
    try {
      const response = await profileSessionClient.getProfile();
      if (response && typeof response === "object" && "user" in response) {
        setUser(response.user as UserProfile);
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to view your profile.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.handle?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className={`container max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-6 sm:space-y-8 ${className || ""}`}>
      {/* Profile Header */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Avatar - Responsive size */}
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage src={user.avatarUrl} alt={user.name || user.handle} />
              <AvatarFallback className="text-xl sm:text-2xl">{userInitials}</AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 space-y-2 sm:space-y-3 w-full">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold break-words">{user.name || user.handle}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">@{user.handle}</p>
              </div>

              {/* Badges and Roles */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {user.isMentor && (
                  <Badge variant="default" className="gap-1 text-xs sm:text-sm">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden xs:inline">Mentor</span>
                    <span className="xs:hidden">M</span>
                  </Badge>
                )}
                {user.isInsider && (
                  <Badge variant="secondary" className="gap-1 text-xs sm:text-sm">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden xs:inline">Insider</span>
                    <span className="xs:hidden">I</span>
                  </Badge>
                )}
                {user.seniority && (
                  <Badge variant="outline" className="text-xs sm:text-sm">{user.seniority}</Badge>
                )}
              </div>

              {/* Reputation and Flair */}
              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                {user.reputation !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{user.reputation}</span>
                    <span className="text-muted-foreground hidden xs:inline">reputation</span>
                  </div>
                )}
                {user.flair && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" aria-hidden="true" />
                    <span className="text-muted-foreground">{user.flair.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Profile</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="avatar" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Avatar</span>
            <span className="sm:hidden">Pic</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Prefs</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
            <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Accounts</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
              <CardDescription className="text-sm">
                Update your personal information and social links
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ProfileForm user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avatar Tab */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Profile Picture</CardTitle>
              <CardDescription className="text-sm">
                Upload a new avatar image for your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <AvatarUpload user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Preferences</CardTitle>
              <CardDescription className="text-sm">
                Manage your theme, notifications, and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <PreferencesForm user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Linked Accounts</CardTitle>
              <CardDescription className="text-sm">
                Manage your connected social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <LinkedProviders />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
