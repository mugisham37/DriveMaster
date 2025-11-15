/**
 * Post-Authentication Redirect Hook
 * 
 * This hook manages the seamless transition from authentication to user service.
 * It checks for profile existence, auto-creates profiles if needed, calculates
 * profile completeness, and routes users appropriately.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import { useUserProfile, usePrefetchUserData } from "./useUserService";
import { userServiceClient } from "@/lib/user-service";
import type { UserProfile } from "@/types/user-service";

interface PostAuthRedirectState {
  isChecking: boolean;
  isCreatingProfile: boolean;
  error: Error | null;
  profileCompleteness: number;
}

export interface UsePostAuthRedirectReturn extends PostAuthRedirectState {
  checkAndRedirect: () => Promise<void>;
  retryCheck: () => void;
}

/**
 * Calculate profile completeness percentage (0-100)
 * 
 * Based on the UserProfile interface from user-service.ts:
 * - Email: 10% (always present after auth)
 * - Email verified: 10%
 * - Timezone: 15%
 * - Language: 15%
 * - Country code: 10%
 * - MFA enabled: 10%
 * - GDPR consent: 30% (critical for compliance)
 */
function calculateProfileCompleteness(profile: UserProfile): number {
  let completeness = 0;

  // Email is always present after auth
  if (profile.email) completeness += 10;

  // Email verification
  if (profile.emailVerified) completeness += 10;

  // Timezone
  if (profile.timezone && profile.timezone.trim().length > 0) {
    completeness += 15;
  }

  // Language
  if (profile.language && profile.language.trim().length > 0) {
    completeness += 15;
  }

  // Country code
  if (profile.countryCode && profile.countryCode.trim().length > 0) {
    completeness += 10;
  }

  // MFA enabled (security)
  if (profile.mfaEnabled) completeness += 10;

  // GDPR consent (critical - 30%)
  if (profile.gdprConsent) completeness += 30;

  return Math.min(100, completeness);
}

/**
 * Initialize a minimal user profile with default values
 * 
 * The backend automatically creates a basic profile on first authentication.
 * This function updates it with sensible defaults and browser-detected settings.
 * 
 * Requirements: 1.2
 */
async function initializeMinimalProfile(
  userId: string,
  existingProfile: UserProfile
): Promise<UserProfile> {
  // Detect browser timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Detect browser language (fallback to 'en' if detection fails)
  const language = navigator.language.split('-')[0] || 'en'; // e.g., 'en' from 'en-US'

  // Update profile with browser-detected settings and defaults
  const updatedProfile = await userServiceClient.updateUser(userId, {
    timezone,
    language,
    version: existingProfile.version,
  });

  // Initialize preferences separately
  await userServiceClient.updatePreferences(userId, {
    theme: 'system', // Respect system preference
    language,
    notifications: {
      email: true,
      push: false,
      inApp: true,
      marketing: false,
      reminders: true,
    },
    privacy: {
      profileVisibility: 'private',
      activityTracking: true,
      dataSharing: false,
      analytics: true,
    },
    learning: {
      difficulty: 'beginner',
      pace: 'normal',
      reminders: true,
      streakNotifications: true,
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false,
    },
  });

  return updatedProfile;
}

/**
 * Hook to manage post-authentication redirect logic
 * 
 * This hook:
 * 1. Checks if user profile exists
 * 2. Auto-creates profile if missing
 * 3. Calculates profile completeness
 * 4. Routes to onboarding if < 60% complete
 * 5. Routes to dashboard if >= 60% complete
 * 6. Prefetches critical data
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export function usePostAuthRedirect(): UsePostAuthRedirectReturn {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { prefetchUserProfile, prefetchProgressSummary, prefetchActivityInsights } = usePrefetchUserData();

  const [state, setState] = useState<PostAuthRedirectState>({
    isChecking: false,
    isCreatingProfile: false,
    error: null,
    profileCompleteness: 0,
  });

  // Fetch user profile (disabled until we need it)
  // Note: UserProfile.id is the userId
  const { 
    refetch: refetchProfile 
  } = useUserProfile(user?.id?.toString() || "", {
    enabled: false, // We'll manually trigger this
    retry: false, // Don't retry on 404 (profile doesn't exist)
  });

  /**
   * Main check and redirect logic
   */
  const checkAndRedirect = useCallback(async () => {
    if (!isAuthenticated || !user?.id || authLoading) {
      return;
    }

    setState((prev: PostAuthRedirectState) => ({ ...prev, isChecking: true, error: null }));

    try {
      // Step 1: Fetch user profile
      const { data: fetchedProfile, error: fetchError } = await refetchProfile();

      if (fetchError) {
        // If profile doesn't exist, the backend should have created it on auth
        // This is an unexpected error
        throw fetchError;
      }

      if (!fetchedProfile) {
        throw new Error("Failed to retrieve user profile");
      }

      let userProfile = fetchedProfile;

      // Step 2: Check if profile needs initialization
      // If timezone or language is missing, initialize with browser defaults
      const needsInitialization = !userProfile.timezone || !userProfile.language;
      
      if (needsInitialization) {
        setState((prev: PostAuthRedirectState) => ({ ...prev, isCreatingProfile: true }));
        
        // Initialize profile with browser-detected settings
        userProfile = await initializeMinimalProfile(user.id.toString(), userProfile);
        
        setState((prev: PostAuthRedirectState) => ({ ...prev, isCreatingProfile: false }));
      }

      // Step 3: Calculate profile completeness
      const completeness = calculateProfileCompleteness(userProfile);
      setState((prev: PostAuthRedirectState) => ({ ...prev, profileCompleteness: completeness }));

      // Step 4: Prefetch critical data in background
      // Don't await - let these happen in parallel
      const userId = user.id.toString();
      Promise.all([
        prefetchUserProfile(userId),
        prefetchProgressSummary(userId),
        prefetchActivityInsights(userId),
      ]).catch((err: Error) => {
        // Log prefetch errors but don't block navigation
        console.warn("Failed to prefetch user data:", err);
      });

      // Step 5: Route based on completeness
      if (completeness < 60) {
        // Incomplete profile - go to onboarding
        router.push('/onboarding');
      } else {
        // Complete profile - go to dashboard
        router.push('/dashboard');
      }

      setState((prev: PostAuthRedirectState) => ({ ...prev, isChecking: false }));
    } catch (error) {
      console.error("Post-auth redirect error:", error);
      setState((prev: PostAuthRedirectState) => ({
        ...prev,
        isChecking: false,
        isCreatingProfile: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      }));
    }
  }, [
    isAuthenticated,
    user,
    authLoading,
    refetchProfile,
    prefetchUserProfile,
    prefetchProgressSummary,
    prefetchActivityInsights,
    router,
  ]);

  /**
   * Retry check after error
   */
  const retryCheck = useCallback(() => {
    setState((prev: PostAuthRedirectState) => ({ ...prev, error: null }));
    checkAndRedirect();
  }, [checkAndRedirect]);

  return {
    ...state,
    checkAndRedirect,
    retryCheck,
  };
}

/**
 * Hook that automatically triggers redirect on authentication
 * 
 * Use this in pages that should automatically redirect after auth
 */
export function useAutoPostAuthRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const { checkAndRedirect, isChecking, error } = usePostAuthRedirect();

  useEffect(() => {
    if (isAuthenticated && !isLoading && !isChecking) {
      checkAndRedirect();
    }
  }, [isAuthenticated, isLoading, isChecking, checkAndRedirect]);

  return {
    isRedirecting: isChecking,
    error,
  };
}
