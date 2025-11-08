/**
 * SWR configuration and cache key management
 * Provides consistent cache keys and invalidation strategies
 */

type CacheParams = Record<string, unknown> | undefined;

export const cacheKeys = {
  // Tracks
  tracks: (params?: CacheParams) => ["tracks", params],
  track: (slug: string) => ["track", slug],
  trackExercises: (slug: string, params?: CacheParams) => [
    "track-exercises",
    slug,
    params,
  ],

  // Exercises
  exercise: (trackSlug: string, exerciseSlug: string) => [
    "exercise",
    trackSlug,
    exerciseSlug,
  ],

  // Users
  user: (id: string) => ["user", id],
  currentUser: () => ["current-user"],

  // Dashboard
  dashboard: () => ["dashboard"],

  // Mentoring
  mentoringDiscussions: (params?: CacheParams) => [
    "mentoring-discussions",
    params,
  ],
  mentoringRequests: (params?: CacheParams) => ["mentoring-requests", params],
  mentoringTestimonials: (params?: CacheParams) => [
    "mentoring-testimonials",
    params,
  ],
  mentoringRepresentations: (params?: CacheParams) => [
    "mentoring-representations",
    params,
  ],
  mentoringRepresentationsWithFeedback: (params?: CacheParams) => [
    "mentoring-representations-with-feedback",
    params,
  ],
  mentoringRepresentationsAdmin: (params?: CacheParams) => [
    "mentoring-representations-admin",
    params,
  ],
  mentoringTracks: (params?: CacheParams) => ["mentoring-tracks", params],
};

type MutateFunction = (
  key?: unknown | ((key: unknown) => boolean),
  data?: unknown,
  shouldRevalidate?: boolean,
) => Promise<unknown>;

export const cacheInvalidation = {
  // Invalidate user-related caches
  invalidateUser: (mutate: MutateFunction, userId?: string) => {
    if (userId) {
      mutate(cacheKeys.user(userId));
    }
    mutate(cacheKeys.currentUser());
    mutate(cacheKeys.dashboard());
  },

  // Invalidate dashboard cache
  invalidateDashboard: (mutate: MutateFunction) => {
    mutate(cacheKeys.dashboard());
  },

  // Invalidate mentoring-related caches
  invalidateMentoring: (mutate: MutateFunction) => {
    mutate(
      (key: unknown) =>
        Array.isArray(key) &&
        typeof key[0] === "string" &&
        key[0].startsWith("mentoring"),
    );
  },

  // Invalidate track-related caches
  invalidateTrack: (mutate: MutateFunction, trackSlug?: string) => {
    if (trackSlug) {
      mutate(cacheKeys.track(trackSlug));
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          key[0] === "track-exercises" &&
          key[1] === trackSlug,
      );
    }
    mutate(cacheKeys.tracks());
  },

  // Invalidate exercise-related caches
  invalidateExercise: (
    mutate: MutateFunction,
    trackSlug?: string,
    exerciseSlug?: string,
  ) => {
    if (trackSlug && exerciseSlug) {
      mutate(cacheKeys.exercise(trackSlug, exerciseSlug));
    }
    if (trackSlug) {
      mutate(
        (key: unknown) =>
          Array.isArray(key) &&
          key[0] === "track-exercises" &&
          key[1] === trackSlug,
      );
    }
  },
};

// SWR global configuration
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  onError: (error: Error) => {
    console.error("SWR Error:", error);
    // Could integrate with error reporting service here
  },
};
