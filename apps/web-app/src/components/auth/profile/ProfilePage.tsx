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
    <div className={`container max-w-5xl mx-auto py-8 px-4 space-y-8 ${className || ""}`}>
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatarUrl} alt={user.name || user.handle} />
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold">{user.name || user.handle}</h1>
                <p className="text-muted-foreground">@{user.handle}</p>
              </div>

              {/* Badges and Roles */}
              <div className="flex flex-wrap gap-2">
                {user.isMentor && (
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    Mentor
                  </Badge>
                )}
                {user.isInsider && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Insider
                  </Badge>
                )}
                {user.seniority && (
                  <Badge variant="outline">{user.seniority}</Badge>
                )}
              </div>

              {/* Reputation and Flair */}
              <div className="flex flex-wrap gap-4 text-sm">
                {user.reputation !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{user.reputation}</span>
                    <span className="text-muted-foreground">reputation</span>
                  </div>
                )}
                {user.flair && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                    <span className="text-muted-foreground">{user.flair.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="avatar" className="gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Avatar</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and social links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avatar Tab */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload a new avatar image for your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Manage your theme, notifications, and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesForm user={user} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>
                Manage your connected social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LinkedProviders />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
