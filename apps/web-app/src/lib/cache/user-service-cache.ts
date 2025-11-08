/**
 * User Service Cache Configuration and Management
 *
 * This module provides React Query configuration and cache management
 * specifically for user-service data with appropriate cache times,
 * invalidation strategies, and optimistic updates.
 */

import { QueryClient, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type {
  UserProfile,
  UserPreferences,
  SkillMastery,
  UserServiceError,
} from "@/types/user-service";

// ============================================================================
// Cache Configuration Constants
// ============================================================================

export const CACHE_TIMES = {
  // User profile data - moderate frequency updates
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  USER_PREFERENCES: 15 * 60 * 1000, // 15 minutes

  // Progress data - frequent updates during learning
  PROGRESS_SUMMARY: 2 * 60 * 1000, // 2 minutes
  SKILL_MASTERY: 5 * 60 * 1000, // 5 minutes
  LEARNING_STREAK: 1 * 60 * 1000, // 1 minute
  MILESTONES: 10 * 60 * 1000, // 10 minutes

  // Activity data - real-time updates
  ACTIVITY_SUMMARY: 30 * 1000, // 30 seconds
  ENGAGEMENT_METRICS: 2 * 60 * 1000, // 2 minutes
  ACTIVITY_INSIGHTS: 5 * 60 * 1000, // 5 minutes
  ACTIVITY_RECOMMENDATIONS: 10 * 60 * 1000, // 10 minutes

  // GDPR data - infrequent updates
  GDPR_EXPORT_STATUS: 30 * 1000, // 30 seconds (for active exports)
  GDPR_CONSENT: 60 * 60 * 1000, // 1 hour
  PRIVACY_REPORT: 24 * 60 * 60 * 1000, // 24 hours

  // Service health - frequent monitoring
  SERVICE_HEALTH: 30 * 1000, // 30 seconds
  SERVICE_INFO: 5 * 60 * 1000, // 5 minutes
} as const;

export const GC_TIMES = {
  // Garbage collection times (when to remove from memory)
  SHORT: 10 * 60 * 1000, // 10 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================================================
// Query Key Factories
// ============================================================================

export const userServiceKeys = {
  // Base keys
  all: ["user-service"] as const,
  users: () => [...userServiceKeys.all, "users"] as const,
  progress: () => [...userServiceKeys.all, "progress"] as const,
  activity: () => [...userServiceKeys.all, "activity"] as const,
  gdpr: () => [...userServiceKeys.all, "gdpr"] as const,
  service: () => [...userServiceKeys.all, "service"] as const,

  // User profile keys
  user: (userId: string) => [...userServiceKeys.users(), userId] as const,
  userProfile: (userId: string) =>
    [...userServiceKeys.user(userId), "profile"] as const,
  userPreferences: (userId: string) =>
    [...userServiceKeys.user(userId), "preferences"] as const,

  // Progress keys
  userProgress: (userId: string) =>
    [...userServiceKeys.progress(), userId] as const,
  progressSummary: (userId: string) =>
    [...userServiceKeys.userProgress(userId), "summary"] as const,
  skillMastery: (userId: string, topic?: string) =>
    topic
      ? ([...userServiceKeys.userProgress(userId), "mastery", topic] as const)
      : ([...userServiceKeys.userProgress(userId), "mastery"] as const),
  learningStreak: (userId: string) =>
    [...userServiceKeys.userProgress(userId), "streak"] as const,
  milestones: (userId: string) =>
    [...userServiceKeys.userProgress(userId), "milestones"] as const,
  weeklyProgress: (userId: string, weeks: number) =>
    [...userServiceKeys.userProgress(userId), "weekly", weeks] as const,

  // Activity keys
  userActivity: (userId: string) =>
    [...userServiceKeys.activity(), userId] as const,
  activitySummary: (userId: string, dateRange: string) =>
    [...userServiceKeys.userActivity(userId), "summary", dateRange] as const,
  engagementMetrics: (userId: string, days: number) =>
    [...userServiceKeys.userActivity(userId), "engagement", days] as const,
  activityInsights: (userId: string) =>
    [...userServiceKeys.userActivity(userId), "insights"] as const,
  activityRecommendations: (userId: string) =>
    [...userServiceKeys.userActivity(userId), "recommendations"] as const,

  // GDPR keys
  userGdpr: (userId: string) => [...userServiceKeys.gdpr(), userId] as const,
  gdprExportStatus: (userId: string, requestId: string) =>
    [...userServiceKeys.userGdpr(userId), "export", requestId] as const,
  gdprDeleteStatus: (userId: string, requestId: string) =>
    [...userServiceKeys.userGdpr(userId), "delete", requestId] as const,
  gdprConsent: (userId: string) =>
    [...userServiceKeys.userGdpr(userId), "consent"] as const,
  privacyReport: (userId: string) =>
    [...userServiceKeys.userGdpr(userId), "report"] as const,

  // Service health keys
  serviceHealth: () => [...userServiceKeys.service(), "health"] as const,
  serviceInfo: () => [...userServiceKeys.service(), "info"] as const,
} as const;

// ============================================================================
// Cache Invalidation Strategies
// ============================================================================

export interface CacheInvalidationOptions {
  userId?: string;
  topic?: string;
  dateRange?: string;
  exact?: boolean;
  refetchActive?: boolean;
}

export class UserServiceCacheManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate user profile related caches
   */
  async invalidateUserProfile(
    userId: string,
    options: CacheInvalidationOptions = {},
  ) {
    const { refetchActive = true } = options;

    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.userProfile(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.userPreferences(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
    ]);
  }

  /**
   * Invalidate progress related caches
   */
  async invalidateProgress(
    userId: string,
    options: CacheInvalidationOptions = {},
  ) {
    const { topic, refetchActive = true } = options;

    const invalidationPromises = [
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.progressSummary(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.learningStreak(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.milestones(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
    ];

    // Invalidate specific topic or all skill masteries
    if (topic) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({
          queryKey: userServiceKeys.skillMastery(userId, topic),
          refetchType: refetchActive ? "active" : "none",
        }),
      );
    } else {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({
          queryKey: userServiceKeys.skillMastery(userId),
          refetchType: refetchActive ? "active" : "none",
        }),
      );
    }

    await Promise.all(invalidationPromises);
  }

  /**
   * Invalidate activity related caches
   */
  async invalidateActivity(
    userId: string,
    options: CacheInvalidationOptions = {},
  ) {
    const { dateRange, refetchActive = true } = options;

    const invalidationPromises = [
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.activityInsights(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.activityRecommendations(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
    ];

    // Invalidate specific date range or all activity summaries
    if (dateRange) {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({
          queryKey: userServiceKeys.activitySummary(userId, dateRange),
          refetchType: refetchActive ? "active" : "none",
        }),
      );
    } else {
      invalidationPromises.push(
        this.queryClient.invalidateQueries({
          predicate: (query) => {
            const [service, type, id] = query.queryKey;
            return (
              service === "user-service" && type === "activity" && id === userId
            );
          },
          refetchType: refetchActive ? "active" : "none",
        }),
      );
    }

    await Promise.all(invalidationPromises);
  }

  /**
   * Invalidate all user-related caches
   */
  async invalidateUser(userId: string, options: CacheInvalidationOptions = {}) {
    const { refetchActive = true } = options;

    await Promise.all([
      this.invalidateUserProfile(userId, { refetchActive }),
      this.invalidateProgress(userId, { refetchActive }),
      this.invalidateActivity(userId, { refetchActive }),
      this.queryClient.invalidateQueries({
        queryKey: userServiceKeys.userGdpr(userId),
        refetchType: refetchActive ? "active" : "none",
      }),
    ]);
  }

  /**
   * Invalidate all user-service caches
   */
  async invalidateAll(options: CacheInvalidationOptions = {}) {
    const { refetchActive = true } = options;

    await this.queryClient.invalidateQueries({
      queryKey: userServiceKeys.all,
      refetchType: refetchActive ? "active" : "none",
    });
  }

  /**
   * Remove specific cache entries
   */
  async removeCache(queryKey: QueryKey) {
    this.queryClient.removeQueries({ queryKey });
  }

  /**
   * Clear all user-service caches from memory
   */
  async clearAll() {
    this.queryClient.removeQueries({
      queryKey: userServiceKeys.all,
    });
  }
}

// ============================================================================
// Optimistic Update Utilities
// ============================================================================

export interface OptimisticUpdateConfig<TData, TVariables> {
  queryKey: QueryKey;
  updater: (oldData: TData | undefined, variables: TVariables) => TData;
  rollbackOnError?: boolean;
}

export class OptimisticUpdateManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Perform optimistic update for user profile
   */
  async optimisticUserProfileUpdate(
    userId: string,
    updater: (oldProfile: UserProfile | undefined) => UserProfile,
  ) {
    const queryKey = userServiceKeys.userProfile(userId);

    await this.queryClient.cancelQueries({ queryKey });

    const previousData = this.queryClient.getQueryData<UserProfile>(queryKey);

    this.queryClient.setQueryData<UserProfile>(queryKey, updater);

    return { previousData, queryKey };
  }

  /**
   * Perform optimistic update for user preferences
   */
  async optimisticUserPreferencesUpdate(
    userId: string,
    updater: (oldPreferences: UserPreferences | undefined) => UserPreferences,
  ) {
    const queryKey = userServiceKeys.userPreferences(userId);

    await this.queryClient.cancelQueries({ queryKey });

    const previousData =
      this.queryClient.getQueryData<UserPreferences>(queryKey);

    this.queryClient.setQueryData<UserPreferences>(queryKey, updater);

    return { previousData, queryKey };
  }

  /**
   * Perform optimistic update for progress data
   */
  async optimisticProgressUpdate(
    userId: string,
    topic: string,
    updater: (oldMastery: SkillMastery | undefined) => SkillMastery,
  ) {
    const queryKey = userServiceKeys.skillMastery(userId, topic);

    await this.queryClient.cancelQueries({ queryKey });

    const previousData = this.queryClient.getQueryData<SkillMastery>(queryKey);

    this.queryClient.setQueryData<SkillMastery>(queryKey, updater);

    // Also invalidate progress summary to reflect changes
    await this.queryClient.invalidateQueries({
      queryKey: userServiceKeys.progressSummary(userId),
      refetchType: "none", // Don't refetch immediately, let it happen naturally
    });

    return { previousData, queryKey };
  }

  /**
   * Rollback optimistic update
   */
  rollback<TData>(queryKey: QueryKey, previousData: TData | undefined) {
    if (previousData !== undefined) {
      this.queryClient.setQueryData(queryKey, previousData);
    } else {
      this.queryClient.removeQueries({ queryKey });
    }
  }
}

// ============================================================================
// Cache Warming Utilities
// ============================================================================

export interface CacheWarmingConfig {
  userId: string;
  priority?: "high" | "medium" | "low";
  background?: boolean;
}

export class CacheWarmingManager {
  constructor(
    private queryClient: QueryClient,
    private userServiceClient: {
      getUser: (userId: string) => Promise<UserProfile>;
      getUserPreferences: (userId: string) => Promise<UserPreferences>;
      getProgressSummary: (userId: string) => Promise<unknown>;
      getLearningStreak: (userId: string) => Promise<unknown>;
      generateInsights: (userId: string) => Promise<unknown>;
      getEngagementMetrics: (userId: string, days: number) => Promise<unknown>;
      getMilestones: (userId: string) => Promise<unknown>;
      getSkillMastery: (userId: string) => Promise<unknown>;
      generateRecommendations: (userId: string) => Promise<unknown>;
    },
  ) {}

  /**
   * Warm critical user data during app initialization
   */
  async warmCriticalUserData(config: CacheWarmingConfig) {
    const { userId, priority = "high", background = false } = config;

    const warmingPromises: Promise<unknown>[] = [];

    // Always warm user profile and preferences (critical for app functionality)
    warmingPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: userServiceKeys.userProfile(userId),
        queryFn: () => this.userServiceClient.getUser(userId),
        staleTime: CACHE_TIMES.USER_PROFILE,
        gcTime: GC_TIMES.MEDIUM,
      }),
    );

    warmingPromises.push(
      this.queryClient.prefetchQuery({
        queryKey: userServiceKeys.userPreferences(userId),
        queryFn: () => this.userServiceClient.getUserPreferences(userId),
        staleTime: CACHE_TIMES.USER_PREFERENCES,
        gcTime: GC_TIMES.MEDIUM,
      }),
    );

    // Warm progress data for high priority
    if (priority === "high") {
      warmingPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: userServiceKeys.progressSummary(userId),
          queryFn: () => this.userServiceClient.getProgressSummary(userId),
          staleTime: CACHE_TIMES.PROGRESS_SUMMARY,
          gcTime: GC_TIMES.SHORT,
        }),
      );

      warmingPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: userServiceKeys.learningStreak(userId),
          queryFn: () => this.userServiceClient.getLearningStreak(userId),
          staleTime: CACHE_TIMES.LEARNING_STREAK,
          gcTime: GC_TIMES.SHORT,
        }),
      );
    }

    if (background) {
      // Don't wait for background warming
      Promise.all(warmingPromises).catch((error) => {
        console.warn("Background cache warming failed:", error);
      });
      return;
    }

    try {
      await Promise.all(warmingPromises);
    } catch (error) {
      console.warn("Cache warming failed:", error);
      // Don't throw - warming is optional
    }
  }

  /**
   * Warm dashboard data based on user navigation patterns
   */
  async warmDashboardData(config: CacheWarmingConfig) {
    const { userId, background = true } = config;

    const warmingPromises = [
      // Recent activity insights
      this.queryClient.prefetchQuery({
        queryKey: userServiceKeys.activityInsights(userId),
        queryFn: () => this.userServiceClient.generateInsights(userId),
        staleTime: CACHE_TIMES.ACTIVITY_INSIGHTS,
        gcTime: GC_TIMES.SHORT,
      }),

      // Engagement metrics for the last 7 days
      this.queryClient.prefetchQuery({
        queryKey: userServiceKeys.engagementMetrics(userId, 7),
        queryFn: () => this.userServiceClient.getEngagementMetrics(userId, 7),
        staleTime: CACHE_TIMES.ENGAGEMENT_METRICS,
        gcTime: GC_TIMES.SHORT,
      }),

      // Milestones
      this.queryClient.prefetchQuery({
        queryKey: userServiceKeys.milestones(userId),
        queryFn: () => this.userServiceClient.getMilestones(userId),
        staleTime: CACHE_TIMES.MILESTONES,
        gcTime: GC_TIMES.MEDIUM,
      }),
    ];

    if (background) {
      Promise.all(warmingPromises).catch((error) => {
        console.warn("Dashboard cache warming failed:", error);
      });
      return;
    }

    try {
      await Promise.all(warmingPromises);
    } catch (error) {
      console.warn("Dashboard cache warming failed:", error);
    }
  }

  /**
   * Prefetch likely-needed data based on current page/context
   */
  async prefetchContextualData(userId: string, context: string) {
    switch (context) {
      case "profile":
        await this.warmCriticalUserData({ userId, priority: "high" });
        break;

      case "dashboard":
        await this.warmDashboardData({ userId });
        break;

      case "progress":
        await this.queryClient.prefetchQuery({
          queryKey: userServiceKeys.skillMastery(userId),
          queryFn: () => this.userServiceClient.getSkillMastery(userId),
          staleTime: CACHE_TIMES.SKILL_MASTERY,
          gcTime: GC_TIMES.SHORT,
        });
        break;

      case "activity":
        await this.queryClient.prefetchQuery({
          queryKey: userServiceKeys.activityRecommendations(userId),
          queryFn: () => this.userServiceClient.generateRecommendations(userId),
          staleTime: CACHE_TIMES.ACTIVITY_RECOMMENDATIONS,
          gcTime: GC_TIMES.SHORT,
        });
        break;
    }
  }
}

// ============================================================================
// Default Query Options Factory
// ============================================================================

export function createUserServiceQueryOptions<
  TData = unknown,
  TError = UserServiceError,
>(
  cacheTime: number,
  gcTime: number = GC_TIMES.MEDIUM,
): Partial<UseQueryOptions<TData, TError>> {
  return {
    staleTime: cacheTime,
    gcTime,
    retry: (failureCount, error) => {
      // Don't retry on authorization errors
      if (
        error &&
        typeof error === "object" &&
        "type" in error &&
        "message" in error &&
        "recoverable" in error
      ) {
        const userServiceError = error as UserServiceError;
        if (userServiceError.type === "authorization") {
          return false;
        }
      }

      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnReconnect: true, // Refetch when connection is restored
  };
}

// ============================================================================
// Exports
// ============================================================================

export { userServiceKeys as queryKeys };

// Create singleton instances that can be used throughout the app
let cacheManager: UserServiceCacheManager | null = null;
let optimisticUpdateManager: OptimisticUpdateManager | null = null;
let cacheWarmingManager: CacheWarmingManager | null = null;

export function initializeUserServiceCache(
  queryClient: QueryClient,
  userServiceClient?: unknown,
) {
  cacheManager = new UserServiceCacheManager(queryClient);
  optimisticUpdateManager = new OptimisticUpdateManager(queryClient);

  if (
    userServiceClient &&
    typeof userServiceClient === "object" &&
    "getUser" in userServiceClient
  ) {
    cacheWarmingManager = new CacheWarmingManager(
      queryClient,
      userServiceClient as {
        getUser: (userId: string) => Promise<UserProfile>;
        getUserPreferences: (userId: string) => Promise<UserPreferences>;
        getProgressSummary: (userId: string) => Promise<unknown>;
        getLearningStreak: (userId: string) => Promise<unknown>;
        generateInsights: (userId: string) => Promise<unknown>;
        getEngagementMetrics: (
          userId: string,
          days: number,
        ) => Promise<unknown>;
        getMilestones: (userId: string) => Promise<unknown>;
        getSkillMastery: (userId: string) => Promise<unknown>;
        generateRecommendations: (userId: string) => Promise<unknown>;
      },
    );
  }

  return {
    cacheManager,
    optimisticUpdateManager,
    cacheWarmingManager,
  };
}

export function getUserServiceCacheManager(): UserServiceCacheManager {
  if (!cacheManager) {
    throw new Error(
      "UserServiceCacheManager not initialized. Call initializeUserServiceCache first.",
    );
  }
  return cacheManager;
}

export function getOptimisticUpdateManager(): OptimisticUpdateManager {
  if (!optimisticUpdateManager) {
    throw new Error(
      "OptimisticUpdateManager not initialized. Call initializeUserServiceCache first.",
    );
  }
  return optimisticUpdateManager;
}

export function getCacheWarmingManager(): CacheWarmingManager | null {
  return cacheWarmingManager;
}
