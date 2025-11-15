/**
 * Prefetch on Hover Hook
 * 
 * Implements intelligent prefetching strategy that prefetches data
 * when user hovers over navigation links, improving perceived performance.
 * 
 * Requirements: 9.4 (prefetching strategy)
 * Task: 12.3
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/cache/user-service-cache';
import { userServiceClient } from '@/lib/user-service';

export interface PrefetchOptions {
  userId?: string;
  route?: string;
}

/**
 * Hook for prefetching data on link hover
 * 
 * Usage:
 * ```tsx
 * const { prefetchProfile, prefetchProgress, prefetchActivity } = usePrefetchOnHover({ userId });
 * 
 * <Link href="/profile" onMouseEnter={prefetchProfile}>Profile</Link>
 * ```
 */
export function usePrefetchOnHover({ userId }: PrefetchOptions = {}) {
  const queryClient = useQueryClient();

  // Prefetch user profile data
  const prefetchProfile = useCallback(() => {
    if (!userId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.userProfile(userId),
      queryFn: () => userServiceClient.getUser(userId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.userPreferences(userId),
      queryFn: () => userServiceClient.getUserPreferences(userId),
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  }, [queryClient, userId]);

  // Prefetch progress data
  const prefetchProgress = useCallback(() => {
    if (!userId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.progressSummary(userId),
      queryFn: () => userServiceClient.getProgressSummary(userId),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.learningStreak(userId),
      queryFn: () => userServiceClient.getLearningStreak(userId),
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  }, [queryClient, userId]);

  // Prefetch activity data
  const prefetchActivity = useCallback(() => {
    if (!userId) return;

    const dateRangeStr = JSON.stringify({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.activitySummary(userId, dateRangeStr),
      queryFn: () => userServiceClient.getActivitySummary(userId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
      staleTime: 30 * 1000, // 30 seconds
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.engagementMetrics(userId, 30),
      queryFn: () => userServiceClient.getEngagementMetrics(userId, { days: 30 }),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [queryClient, userId]);

  // Prefetch settings/preferences data
  const prefetchSettings = useCallback(() => {
    if (!userId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.userPreferences(userId),
      queryFn: () => userServiceClient.getUserPreferences(userId),
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  }, [queryClient, userId]);

  // Prefetch GDPR/privacy data
  const prefetchPrivacy = useCallback(() => {
    if (!userId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.gdprConsent(userId),
      queryFn: () => userServiceClient.getGdprConsent(userId),
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  }, [queryClient, userId]);

  // Smart prefetch based on route
  const prefetchRoute = useCallback((route: string) => {
    if (!userId) return;

    switch (route) {
      case '/profile':
        prefetchProfile();
        break;
      case '/progress':
        prefetchProgress();
        break;
      case '/activity':
        prefetchActivity();
        break;
      case '/settings/preferences':
        prefetchSettings();
        break;
      case '/settings/privacy':
        prefetchPrivacy();
        break;
      default:
        // Prefetch profile as default (most common)
        prefetchProfile();
    }
  }, [userId, prefetchProfile, prefetchProgress, prefetchActivity, prefetchSettings, prefetchPrivacy]);

  return {
    prefetchProfile,
    prefetchProgress,
    prefetchActivity,
    prefetchSettings,
    prefetchPrivacy,
    prefetchRoute,
  };
}

/**
 * Helper function to create prefetch handler for Link components
 * 
 * Note: This is a simplified version. For production use, pass the queryClient
 * from the component context instead of creating a new one.
 * 
 * Usage:
 * ```tsx
 * const { prefetchRoute } = usePrefetchOnHover({ userId });
 * <Link href="/profile" onMouseEnter={() => prefetchRoute('/profile')}>Profile</Link>
 * ```
 */
export function createPrefetchHandler(route: string, userId?: string) {
  return () => {
    if (!userId) return;
    // This is a placeholder - in actual usage, use the hook directly in components
    console.log(`Prefetch requested for route: ${route}`);
  };
}
