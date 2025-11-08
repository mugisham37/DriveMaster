import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { apiClient, ExercismAPIError } from "./client";
import { cacheKeys } from "./swr-config";
import type {
  Track,
  Exercise,
  User,
  DashboardData,
  TracksResponse,
  TrackExercisesResponse,
  MentoringDiscussionsResponse,
  MentoringRequestsResponse,
  MentoringTestimonialsResponse,
  MentoringRepresentationsResponse,
  MentoringTracksResponse,
} from "@/types";

/**
 * Custom hooks for data fetching with identical Rails behavior
 * Preserves exact caching strategies and error handling patterns
 */

// Tracks hooks
export function useTracks(params?: {
  criteria?: string;
  tags?: string;
  status?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.tracks(params),
    () => apiClient.getTracks(params),
    {
      revalidateOnFocus: false, // Tracks don't change frequently
      dedupingInterval: 60000, // 1 minute deduplication for tracks
    },
  );

  const response = data as TracksResponse | undefined;

  return {
    tracks: response?.tracks || [],
    numTracks: response?.numTracks || 0,
    trackIconUrls: response?.trackIconUrls || [],
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useTrack(slug: string) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? cacheKeys.track(slug) : null,
    () => apiClient.getTrack(slug),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds for track details
    },
  );

  return {
    track: data as Track | undefined,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useTrackExercises(
  trackSlug: string,
  params?: { criteria?: string; status?: string; difficulty?: string },
) {
  const { data, error, isLoading, mutate } = useSWR(
    trackSlug ? cacheKeys.trackExercises(trackSlug, params) : null,
    () => apiClient.getTrackExercises(trackSlug, params),
    {
      revalidateOnFocus: true, // Exercise progress can change
      dedupingInterval: 10000, // 10 seconds for exercises
    },
  );

  const response = data as TrackExercisesResponse | undefined;

  return {
    exercises: response?.exercises || [],
    numExercises: response?.numExercises || 0,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useExercise(trackSlug: string, exerciseSlug: string) {
  const { data, error, isLoading, mutate } = useSWR(
    trackSlug && exerciseSlug
      ? cacheKeys.exercise(trackSlug, exerciseSlug)
      : null,
    () => apiClient.getExercise(trackSlug, exerciseSlug),
    {
      revalidateOnFocus: true, // Exercise details can change
      dedupingInterval: 5000, // 5 seconds for exercise details
    },
  );

  return {
    exercise: data as Exercise | undefined,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

// User hooks
export function useUser(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? cacheKeys.user(id) : null,
    () => apiClient.getUser(id),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds for user data
    },
  );

  return {
    user: data as User | undefined,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useCurrentUser() {
  const key = cacheKeys.currentUser();

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => apiClient.get("/users/me"),
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000, // 10 seconds for current user
      errorRetryCount: 1, // Don't retry auth errors
    },
  );

  return {
    user: data as User | undefined,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

// Dashboard hook
export function useDashboard() {
  const key = cacheKeys.dashboard();

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => apiClient.getDashboard(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000, // 30 seconds for dashboard
    },
  );

  return {
    dashboard: data as DashboardData | undefined,
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

// Mentoring hooks
export function useMentoringDiscussions(params?: {
  status?: string;
  trackSlug?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringDiscussions(params),
    () => apiClient.getMentoringDiscussions(params),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000, // 5 seconds for discussions
    },
  );

  const response = data as MentoringDiscussionsResponse | undefined;

  return {
    discussions: response?.discussions || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

// Mutation hooks for data updates
export function useUpdateUser() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "/users",
    async (
      _key: string,
      { arg }: { arg: { id: string; data: Record<string, unknown> } },
    ) => {
      const result = await apiClient.updateUser(arg.id, arg.data);

      // Invalidate related caches using SWR's mutate function
      mutate(cacheKeys.user(arg.id));
      mutate(cacheKeys.currentUser());
      mutate(cacheKeys.dashboard());

      return result;
    },
  );
}

export function useCreateMentoringDiscussion() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "/mentoring/discussions",
    async (
      _key: string,
      {
        arg,
      }: {
        arg: {
          exerciseSlug: string;
          trackSlug: string;
          iterationUuid: string;
        };
      },
    ) => {
      const result = await apiClient.createMentoringDiscussion(arg);

      // Invalidate mentoring caches
      mutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          key[0].startsWith("mentoring"),
      );

      return result;
    },
  );
}

// Authentication mutation hooks
export function useLogin() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "/auth/login",
    async (
      _key: string,
      { arg }: { arg: { email: string; password: string } },
    ) => {
      const result = await apiClient.login(arg.email, arg.password);

      // Invalidate user caches after login
      mutate(cacheKeys.currentUser());
      mutate(cacheKeys.dashboard());

      return result;
    },
  );
}

export function useSignup() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "/auth/signup",
    async (
      _key: string,
      {
        arg,
      }: {
        arg: {
          email: string;
          password: string;
          handle: string;
          name?: string;
        };
      },
    ) => {
      const result = await apiClient.signup(arg);

      // Invalidate user caches after signup
      mutate(cacheKeys.currentUser());

      return result;
    },
  );
}

export function useForgotPassword() {
  return useSWRMutation(
    "/auth/forgot-password",
    async (_key: string, { arg }: { arg: { email: string } }) => {
      return apiClient.forgotPassword(arg.email);
    },
  );
}

export function useResetPassword() {
  return useSWRMutation(
    "/auth/reset-password",
    async (
      _key: string,
      { arg }: { arg: { token: string; password: string } },
    ) => {
      return apiClient.resetPassword(arg.token, arg.password);
    },
  );
}

// Utility hooks for cache management
export function useCacheInvalidation() {
  const { mutate } = useSWRConfig();

  return {
    invalidateUser: (userId?: string) => {
      if (userId) {
        mutate(cacheKeys.user(userId));
      }
      mutate(cacheKeys.currentUser());
      mutate(cacheKeys.dashboard());
    },
    invalidateTrack: (trackSlug: string) => {
      mutate(cacheKeys.track(trackSlug));
      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "track-exercises" &&
          key[1] === trackSlug,
      );
      mutate(cacheKeys.tracks());
    },
    invalidateExercise: (trackSlug: string, exerciseSlug: string) => {
      mutate(cacheKeys.exercise(trackSlug, exerciseSlug));
      mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === "track-exercises" &&
          key[1] === trackSlug,
      );
    },
    invalidateDashboard: () => mutate(cacheKeys.dashboard()),
    invalidateMentoring: () =>
      mutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          key[0].startsWith("mentoring"),
      ),
    invalidateAll: () => mutate(() => true),
  };
}

// Prefetch hook for performance optimization
export function usePrefetch() {
  const { mutate } = useSWRConfig();

  return {
    prefetchTracks: async () => {
      const data = await apiClient.getTracks();
      mutate(cacheKeys.tracks(), data, false);
      return data;
    },

    prefetchDashboard: async () => {
      const data = await apiClient.getDashboard();
      mutate(cacheKeys.dashboard(), data, false);
      return data;
    },

    prefetchTrack: async (slug: string) => {
      const data = await apiClient.getTrack(slug);
      mutate(cacheKeys.track(slug), data, false);
      return data;
    },

    prefetchExercise: async (trackSlug: string, exerciseSlug: string) => {
      const data = await apiClient.getExercise(trackSlug, exerciseSlug);
      mutate(cacheKeys.exercise(trackSlug, exerciseSlug), data, false);
      return data;
    },
  };
}

// Additional mentoring hooks for the new API endpoints
export function useMentoringRequests(params?: {
  trackSlug?: string;
  exerciseSlug?: string;
  order?: string;
  criteria?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringRequests(params),
    () => apiClient.getMentoringRequests(params),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000, // 5 seconds for requests
    },
  );

  const response = data as MentoringRequestsResponse | undefined;

  return {
    requests: response?.requests || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useMentoringTestimonials(params?: {
  criteria?: string;
  order?: string;
  trackSlug?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringTestimonials(params),
    () => apiClient.getMentoringTestimonials(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds for testimonials
    },
  );

  const response = data as MentoringTestimonialsResponse | undefined;

  return {
    results: response?.results || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useMentoringRepresentations(params?: {
  onlyMentoredSolutions?: boolean;
  criteria?: string;
  trackSlug?: string;
  order?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringRepresentations(params),
    () => apiClient.getMentoringRepresentations(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute for representations
    },
  );

  const response = data as MentoringRepresentationsResponse | undefined;

  return {
    results: response?.results || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useMentoringRepresentationsWithFeedback(params?: {
  criteria?: string;
  trackSlug?: string;
  order?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringRepresentationsWithFeedback(params),
    () => apiClient.getMentoringRepresentationsWithFeedback(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute for representations
    },
  );

  const response = data as MentoringRepresentationsResponse | undefined;

  return {
    results: response?.results || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useMentoringRepresentationsAdmin(params?: {
  onlyMentoredSolutions?: boolean;
  criteria?: string;
  trackSlug?: string;
  order?: string;
  page?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringRepresentationsAdmin(params),
    () => apiClient.getMentoringRepresentationsAdmin(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute for representations
    },
  );

  const response = data as MentoringRepresentationsResponse | undefined;

  return {
    results: response?.results || [],
    meta: response?.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}

export function useMentoringTracks(params?: { status?: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.mentoringTracks(params),
    () => apiClient.getMentoringTracks(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes for tracks
    },
  );

  const response = data as MentoringTracksResponse | undefined;

  return {
    tracks: response?.tracks || [],
    isLoading,
    error: error as ExercismAPIError | undefined,
    mutate,
  };
}
