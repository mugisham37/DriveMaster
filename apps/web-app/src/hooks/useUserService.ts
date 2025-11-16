/**
 * React Query hooks for User Service operations
 *
 * This module provides typed React Query hooks for all user-service operations
 * with proper caching, error handling, and optimistic updates.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
// import { useCrossTabSync } from "./useCrossTabSync"; // TODO: Implement optimistic update broadcasting
import {
  queryKeys,
  CACHE_TIMES,
  GC_TIMES,
  createUserServiceQueryOptions,
  getUserServiceCacheManager,
  getOptimisticUpdateManager,
} from "@/lib/cache/user-service-cache";
import { userServiceClient } from "@/lib/user-service";
import type {
  UserProfile,
  UserUpdateRequest,
  UserPreferences,
  PreferencesData,
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  WeeklyProgressPoint,
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  GDPRExportResponse,
  ConsentPreferences,
  PrivacyReport,
  DateRange,
  UserServiceError,
  ServiceHealthStatus,
  ServiceInfo,
} from "@/types/user-service";

// ============================================================================
// User Profile Hooks
// ============================================================================

export function useUserProfile(
  userId: string,
  options?: Partial<UseQueryOptions<UserProfile, UserServiceError>>,
): UseQueryResult<UserProfile, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () => userServiceClient.getUser(userId),
    ...createUserServiceQueryOptions<UserProfile>(
      CACHE_TIMES.USER_PROFILE,
      GC_TIMES.MEDIUM,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useUserPreferences(
  userId: string,
  options?: Partial<UseQueryOptions<UserPreferences, UserServiceError>>,
): UseQueryResult<UserPreferences, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.userPreferences(userId),
    queryFn: () => userServiceClient.getUserPreferences(userId),
    ...createUserServiceQueryOptions<UserPreferences>(
      CACHE_TIMES.USER_PREFERENCES,
      GC_TIMES.MEDIUM,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useUpdateUserProfile(
  options?: UseMutationOptions<
    UserProfile,
    UserServiceError,
    { userId: string; updates: UserUpdateRequest },
    {
      previousData: UserProfile | undefined;
      queryKey: readonly ["user-service", "users", string, "profile"];
      userId: string;
    }
  >,
): UseMutationResult<
  UserProfile,
  UserServiceError,
  { userId: string; updates: UserUpdateRequest },
  {
    previousData: UserProfile | undefined;
    queryKey: readonly ["user-service", "users", string, "profile"];
    userId: string;
  }
> {
  const queryClient = useQueryClient();
  const optimisticManager = getOptimisticUpdateManager();
  const cacheManager = getUserServiceCacheManager();
  // const crossTabSync = useCrossTabSync();
  // TODO: Implement optimistic update broadcasting
  // const {
  //   broadcastOptimisticUpdate,
  //   broadcastUpdate,
  //   broadcastOptimisticRollback,
  // } = crossTabSync;

  // Stub implementations until cross-tab sync is fully integrated
  const broadcastOptimisticUpdate = (_queryKey: unknown, _data: unknown, _userId?: string) => {
    // TODO: Implement when cross-tab sync is ready
    console.debug('[useUserService] broadcastOptimisticUpdate called (not implemented)');
  };

  const broadcastOptimisticRollback = (_queryKey: unknown, _userId?: string) => {
    // TODO: Implement when cross-tab sync is ready
    console.debug('[useUserService] broadcastOptimisticRollback called (not implemented)');
  };

  const broadcastUpdate = (_queryKey: unknown, _data: unknown, _userId?: string) => {
    // TODO: Implement when cross-tab sync is ready
    console.debug('[useUserService] broadcastUpdate called (not implemented)');
  };

  return useMutation({
    mutationFn: ({ userId, updates }) =>
      userServiceClient.updateUser(userId, updates),
    onMutate: async ({ userId, updates }) => {
      // Optimistic update
      const { previousData, queryKey } =
        await optimisticManager.optimisticUserProfileUpdate(
          userId,
          (oldProfile) => {
            if (!oldProfile) throw new Error("No existing profile data");
            const updatedProfile = {
              ...oldProfile,
              ...updates,
              updatedAt: new Date(),
              version: oldProfile.version + 1,
            };

            // Broadcast optimistic update to other tabs
            broadcastOptimisticUpdate(queryKey, updatedProfile, userId);

            return updatedProfile;
          },
        );

      return { previousData, queryKey, userId };
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousData && context?.queryKey) {
        optimisticManager.rollback(context.queryKey, context.previousData);
        // Broadcast rollback to other tabs
        broadcastOptimisticRollback(context.queryKey, context.userId);
      }
    },
    onSuccess: (data, { userId }) => {
      // Update cache with server response
      queryClient.setQueryData(queryKeys.userProfile(userId), data);

      // Broadcast successful update to other tabs
      broadcastUpdate(queryKeys.userProfile(userId), data, userId);

      // Invalidate related caches
      cacheManager.invalidateUserProfile(userId, { refetchActive: false });
    },
    ...options,
  });
}

export function useUpdateUserPreferences(
  options?: UseMutationOptions<
    UserPreferences,
    UserServiceError,
    { userId: string; preferences: Partial<PreferencesData> },
    {
      previousData: UserPreferences | undefined;
      queryKey: readonly ["user-service", "users", string, "preferences"];
    }
  >,
): UseMutationResult<
  UserPreferences,
  UserServiceError,
  { userId: string; preferences: Partial<PreferencesData> },
  {
    previousData: UserPreferences | undefined;
    queryKey: readonly ["user-service", "users", string, "preferences"];
  }
> {
  const queryClient = useQueryClient();
  const optimisticManager = getOptimisticUpdateManager();
  const cacheManager = getUserServiceCacheManager();

  return useMutation({
    mutationFn: ({ userId, preferences }) =>
      userServiceClient.updatePreferences(userId, preferences),
    onMutate: async ({ userId, preferences }) => {
      // Optimistic update
      const { previousData, queryKey } =
        await optimisticManager.optimisticUserPreferencesUpdate(
          userId,
          (oldPreferences) => {
            if (!oldPreferences)
              throw new Error("No existing preferences data");
            return {
              ...oldPreferences,
              preferences: {
                ...oldPreferences.preferences,
                ...preferences,
              },
              updatedAt: new Date(),
            };
          },
        );

      return { previousData, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData && context?.queryKey) {
        optimisticManager.rollback(context.queryKey, context.previousData);
      }
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(queryKeys.userPreferences(userId), data);
      cacheManager.invalidateUserProfile(userId, { refetchActive: false });
    },
    ...options,
  });
}

// ============================================================================
// Progress Tracking Hooks
// ============================================================================

export function useProgressSummary(
  userId: string,
  options?: Partial<UseQueryOptions<ProgressSummary, UserServiceError>>,
): UseQueryResult<ProgressSummary, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.progressSummary(userId),
    queryFn: () => userServiceClient.getProgressSummary(userId),
    ...createUserServiceQueryOptions<ProgressSummary>(
      CACHE_TIMES.PROGRESS_SUMMARY,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useSkillMastery(
  userId: string,
  topic?: string,
  options?: Partial<UseQueryOptions<SkillMastery[], UserServiceError>>,
): UseQueryResult<SkillMastery[], UserServiceError> {
  return useQuery({
    queryKey: queryKeys.skillMastery(userId, topic),
    queryFn: () => userServiceClient.getSkillMastery(userId, topic),
    ...createUserServiceQueryOptions<SkillMastery[]>(
      CACHE_TIMES.SKILL_MASTERY,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useLearningStreak(
  userId: string,
  options?: Partial<UseQueryOptions<LearningStreak, UserServiceError>>,
): UseQueryResult<LearningStreak, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.learningStreak(userId),
    queryFn: () => userServiceClient.getLearningStreak(userId),
    ...createUserServiceQueryOptions<LearningStreak>(
      CACHE_TIMES.LEARNING_STREAK,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useMilestones(
  userId: string,
  options?: Partial<UseQueryOptions<Milestone[], UserServiceError>>,
): UseQueryResult<Milestone[], UserServiceError> {
  return useQuery({
    queryKey: queryKeys.milestones(userId),
    queryFn: () => userServiceClient.getMilestones(userId),
    ...createUserServiceQueryOptions<Milestone[]>(
      CACHE_TIMES.MILESTONES,
      GC_TIMES.MEDIUM,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useWeeklyProgress(
  userId: string,
  weeks: number,
  options?: Partial<UseQueryOptions<WeeklyProgressPoint[], UserServiceError>>,
): UseQueryResult<WeeklyProgressPoint[], UserServiceError> {
  return useQuery({
    queryKey: queryKeys.weeklyProgress(userId, weeks),
    queryFn: () => userServiceClient.getWeeklyProgress(userId, weeks),
    ...createUserServiceQueryOptions<WeeklyProgressPoint[]>(
      CACHE_TIMES.PROGRESS_SUMMARY,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && weeks > 0 && options?.enabled !== false,
  });
}

export function useUpdateSkillMastery(
  options?: UseMutationOptions<
    SkillMastery,
    UserServiceError,
    { userId: string; topic: string; attempts: AttemptRecord[] },
    {
      previousData: SkillMastery | undefined;
      queryKey:
        | readonly ["user-service", "progress", string, "mastery", string]
        | readonly ["user-service", "progress", string, "mastery"];
    }
  >,
): UseMutationResult<
  SkillMastery,
  UserServiceError,
  { userId: string; topic: string; attempts: AttemptRecord[] },
  {
    previousData: SkillMastery | undefined;
    queryKey:
      | readonly ["user-service", "progress", string, "mastery", string]
      | readonly ["user-service", "progress", string, "mastery"];
  }
> {
  const queryClient = useQueryClient();
  const optimisticManager = getOptimisticUpdateManager();
  const cacheManager = getUserServiceCacheManager();

  return useMutation({
    mutationFn: ({ userId, topic, attempts }) =>
      userServiceClient.updateSkillMastery(userId, topic, attempts),
    onMutate: async ({ userId, topic, attempts }) => {
      // Optimistic update for skill mastery
      const { previousData, queryKey } =
        await optimisticManager.optimisticProgressUpdate(
          userId,
          topic,
          (oldMastery) => {
            if (!oldMastery) throw new Error("No existing mastery data");

            // Calculate optimistic mastery improvement
            const correctAttempts = attempts.filter((a) => a.correct).length;
            const masteryImprovement =
              (correctAttempts / attempts.length) * 0.1; // Simple heuristic

            return {
              ...oldMastery,
              mastery: Math.min(1.0, oldMastery.mastery + masteryImprovement),
              lastPracticed: new Date(),
              practiceCount: oldMastery.practiceCount + attempts.length,
              updatedAt: new Date(),
            };
          },
        );

      return { previousData, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData && context?.queryKey) {
        optimisticManager.rollback(context.queryKey, context.previousData);
      }
    },
    onSuccess: (data, { userId, topic }) => {
      // Update cache with server response
      queryClient.setQueryData(queryKeys.skillMastery(userId, topic), data);

      // Invalidate related progress caches
      cacheManager.invalidateProgress(userId, { topic, refetchActive: false });
    },
    ...options,
  });
}

// ============================================================================
// Activity Monitoring Hooks
// ============================================================================

export function useActivitySummary(
  userId: string,
  dateRange: DateRange,
  options?: Partial<UseQueryOptions<ActivitySummary, UserServiceError>>,
): UseQueryResult<ActivitySummary, UserServiceError> {
  const dateRangeKey = `${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`;

  return useQuery({
    queryKey: queryKeys.activitySummary(userId, dateRangeKey),
    queryFn: () => userServiceClient.getActivitySummary(userId, dateRange),
    ...createUserServiceQueryOptions<ActivitySummary>(
      CACHE_TIMES.ACTIVITY_SUMMARY,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled:
      !!userId &&
      !!dateRange.start &&
      !!dateRange.end &&
      options?.enabled !== false,
  });
}

export function useEngagementMetrics(
  userId: string,
  days: number,
  options?: Partial<UseQueryOptions<EngagementMetrics, UserServiceError>>,
): UseQueryResult<EngagementMetrics, UserServiceError> {
  const dateRange: DateRange = {
    start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    end: new Date(),
  };

  return useQuery({
    queryKey: queryKeys.engagementMetrics(userId, days),
    queryFn: () => userServiceClient.getEngagementMetrics(userId, dateRange),
    ...createUserServiceQueryOptions<EngagementMetrics>(
      CACHE_TIMES.ENGAGEMENT_METRICS,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && days > 0 && options?.enabled !== false,
  });
}

export function useActivityInsights(
  userId: string,
  options?: Partial<UseQueryOptions<ActivityInsight[], UserServiceError>>,
): UseQueryResult<ActivityInsight[], UserServiceError> {
  return useQuery({
    queryKey: queryKeys.activityInsights(userId),
    queryFn: () => userServiceClient.getActivityInsights(userId),
    ...createUserServiceQueryOptions<ActivityInsight[]>(
      CACHE_TIMES.ACTIVITY_INSIGHTS,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useActivityRecommendations(
  userId: string,
  options?: Partial<
    UseQueryOptions<ActivityRecommendation[], UserServiceError>
  >,
): UseQueryResult<ActivityRecommendation[], UserServiceError> {
  return useQuery({
    queryKey: queryKeys.activityRecommendations(userId),
    queryFn: () => userServiceClient.getActivityRecommendations(userId),
    ...createUserServiceQueryOptions<ActivityRecommendation[]>(
      CACHE_TIMES.ACTIVITY_RECOMMENDATIONS,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useRecordActivity(
  options?: UseMutationOptions<string, UserServiceError, ActivityRecord>,
): UseMutationResult<string, UserServiceError, ActivityRecord> {
  const cacheManager = getUserServiceCacheManager();

  return useMutation({
    mutationFn: (activity) => userServiceClient.recordActivity(activity),
    onSuccess: (_data, activity) => {
      // Invalidate activity-related caches after recording
      cacheManager.invalidateActivity(activity.userId, {
        refetchActive: false,
      });
    },
    ...options,
  });
}

export function useRecordActivitiesBatch(
  options?: UseMutationOptions<string[], UserServiceError, ActivityRecord[]>,
): UseMutationResult<string[], UserServiceError, ActivityRecord[]> {
  const cacheManager = getUserServiceCacheManager();

  return useMutation({
    mutationFn: (activities) =>
      userServiceClient.recordActivitiesBatch(activities),
    onSuccess: (_data, activities) => {
      // Invalidate activity caches for all affected users
      const userIds = [...new Set(activities.map((a) => a.userId))];
      userIds.forEach((userId) => {
        cacheManager.invalidateActivity(userId, { refetchActive: false });
      });
    },
    ...options,
  });
}

// ============================================================================
// GDPR Compliance Hooks
// ============================================================================

export function useGdprExportStatus(
  userId: string,
  requestId: string,
  options?: Partial<UseQueryOptions<GDPRExportResponse, UserServiceError>>,
): UseQueryResult<GDPRExportResponse, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.gdprExportStatus(userId, requestId),
    queryFn: () => userServiceClient.getGdprExportStatus(requestId),
    ...createUserServiceQueryOptions<GDPRExportResponse>(
      CACHE_TIMES.GDPR_EXPORT_STATUS,
      GC_TIMES.SHORT,
    ),
    ...options,
    enabled: !!userId && !!requestId && options?.enabled !== false,
    refetchInterval: (query) => {
      // Poll every 5 seconds if export is still processing
      const data = query?.state?.data;
      return data?.status === "processing" || data?.status === "pending"
        ? 5000
        : false;
    },
  });
}

export function useGdprConsent(
  userId: string,
  options?: Partial<UseQueryOptions<ConsentPreferences, UserServiceError>>,
): UseQueryResult<ConsentPreferences, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.gdprConsent(userId),
    queryFn: () => userServiceClient.getGdprConsent(userId),
    ...createUserServiceQueryOptions<ConsentPreferences>(
      CACHE_TIMES.GDPR_CONSENT,
      GC_TIMES.LONG,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function usePrivacyReport(
  userId: string,
  options?: Partial<UseQueryOptions<PrivacyReport, UserServiceError>>,
): UseQueryResult<PrivacyReport, UserServiceError> {
  return useQuery({
    queryKey: queryKeys.privacyReport(userId),
    queryFn: () => userServiceClient.generatePrivacyReport(userId),
    ...createUserServiceQueryOptions<PrivacyReport>(
      CACHE_TIMES.PRIVACY_REPORT,
      GC_TIMES.VERY_LONG,
    ),
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
}

export function useRequestDataExport(
  options?: UseMutationOptions<GDPRExportResponse, UserServiceError, string>,
): UseMutationResult<GDPRExportResponse, UserServiceError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => userServiceClient.exportUserData(userId),
    onSuccess: (response, userId) => {
      // Start polling for export status
      queryClient.invalidateQueries({
        queryKey: queryKeys.gdprExportStatus(userId, response.requestId),
      });
    },
    ...options,
  });
}

export function useRequestDataDeletion(
  options?: UseMutationOptions<
    { requestId: string },
    UserServiceError,
    { userId: string; reason: string }
  >,
): UseMutationResult<
  { requestId: string },
  UserServiceError,
  { userId: string; reason: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }) =>
      userServiceClient.requestDataDeletion(userId, reason),
    onSuccess: (response, { userId }) => {
      // Start polling for deletion status
      queryClient.invalidateQueries({
        queryKey: queryKeys.gdprDeleteStatus(userId, response.requestId),
      });
    },
    ...options,
  });
}

export function useUpdateConsent(
  options?: UseMutationOptions<
    void,
    UserServiceError,
    { userId: string; consent: ConsentPreferences }
  >,
): UseMutationResult<
  void,
  UserServiceError,
  { userId: string; consent: ConsentPreferences }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, consent }) =>
      userServiceClient.updateConsent(userId, consent),
    onSuccess: (_data, { userId, consent }) => {
      // Update consent cache immediately
      queryClient.setQueryData(queryKeys.gdprConsent(userId), consent);
    },
    ...options,
  });
}

// ============================================================================
// Service Health Hooks
// ============================================================================

export function useServiceHealth(
  options?: Partial<UseQueryOptions<ServiceHealthStatus, UserServiceError>>,
) {
  return useQuery({
    queryKey: queryKeys.serviceHealth(),
    queryFn: () => userServiceClient.getHealth(),
    ...createUserServiceQueryOptions<ServiceHealthStatus>(
      CACHE_TIMES.SERVICE_HEALTH,
      GC_TIMES.SHORT,
    ),
    ...options,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });
}

export function useServiceInfo(
  options?: Partial<UseQueryOptions<ServiceInfo, UserServiceError>>,
) {
  return useQuery({
    queryKey: queryKeys.serviceInfo(),
    queryFn: () => userServiceClient.getServiceInfo(),
    ...createUserServiceQueryOptions<ServiceInfo>(
      CACHE_TIMES.SERVICE_INFO,
      GC_TIMES.MEDIUM,
    ),
    ...options,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to prefetch user data for performance optimization
 */
export function usePrefetchUserData() {
  const queryClient = useQueryClient();

  return {
    prefetchUserProfile: (userId: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.userProfile(userId),
        queryFn: () => userServiceClient.getUser(userId),
        staleTime: CACHE_TIMES.USER_PROFILE,
      });
    },

    prefetchProgressSummary: (userId: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.progressSummary(userId),
        queryFn: () => userServiceClient.getProgressSummary(userId),
        staleTime: CACHE_TIMES.PROGRESS_SUMMARY,
      });
    },

    prefetchActivityInsights: (userId: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.activityInsights(userId),
        queryFn: () => userServiceClient.getActivityInsights(userId),
        staleTime: CACHE_TIMES.ACTIVITY_INSIGHTS,
      });
    },
  };
}

/**
 * Hook to manage cache invalidation
 */
export function useUserServiceCache() {
  const cacheManager = getUserServiceCacheManager();

  return {
    invalidateUser: (userId: string) => cacheManager.invalidateUser(userId),
    invalidateUserProfile: (userId: string) =>
      cacheManager.invalidateUserProfile(userId),
    invalidateProgress: (userId: string, topic?: string) =>
      cacheManager.invalidateProgress(userId, topic ? { topic } : {}),
    invalidateActivity: (userId: string, dateRange?: string) =>
      cacheManager.invalidateActivity(userId, dateRange ? { dateRange } : {}),
    invalidateAll: () => cacheManager.invalidateAll(),
    clearAll: () => cacheManager.clearAll(),
  };
}
