import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { ExercismAPIClient, ExercismAPIError } from "./client";
import type {
  TracksResponse,
  Track,
  Exercise,
  DashboardData,
  MentoringDiscussionsResponse,
} from "@/types";

/**
 * Server-side data fetching utilities for SSR pages
 * Preserves exact data structure and loading states from Rails
 */

// Server-side API client with authentication
export class ServerAPIClient extends ExercismAPIClient {
  constructor(authToken?: string) {
    super({
      baseURL: process.env.RAILS_API_URL || "http://localhost:3000/api/v1",
      defaultHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });
  }
}

// Create authenticated server client
export async function createServerClient(): Promise<ServerAPIClient> {
  const session = await getServerAuthSession();
  const authToken = session?.user?.id?.toString();

  return new ServerAPIClient(authToken);
}

// Server-side data fetching functions matching Rails patterns

/**
 * Fetch tracks data for server-side rendering
 */
export async function getTracksServerSide(params?: {
  criteria?: string;
  tags?: string;
  status?: string;
}) {
  try {
    const client = await createServerClient();
    const data = (await client.getTracks(params)) as TracksResponse;

    return {
      tracks: data.tracks || [],
      numTracks: data.numTracks || 0,
      trackIconUrls: data.trackIconUrls || [],
      error: null,
    };
  } catch (error) {
    console.error("Server-side tracks fetch error:", error);

    // Return fallback data structure
    return {
      tracks: [],
      numTracks: 0,
      trackIconUrls: [],
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch tracks",
    };
  }
}

/**
 * Fetch track data for server-side rendering
 */
export async function getTrackServerSide(slug: string) {
  try {
    const client = await createServerClient();
    const track = (await client.getTrack(slug)) as Track;

    return {
      track,
      error: null,
    };
  } catch (error) {
    console.error("Server-side track fetch error:", error);

    if (error instanceof ExercismAPIError && error.status === 404) {
      return {
        track: null,
        error: "Track not found",
      };
    }

    return {
      track: null,
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch track",
    };
  }
}

/**
 * Fetch exercise data for server-side rendering
 */
export async function getExerciseServerSide(
  trackSlug: string,
  exerciseSlug: string,
) {
  try {
    const client = await createServerClient();
    const exercise = (await client.getExercise(
      trackSlug,
      exerciseSlug,
    )) as Exercise;

    return {
      exercise,
      error: null,
    };
  } catch (error) {
    console.error("Server-side exercise fetch error:", error);

    if (error instanceof ExercismAPIError && error.status === 404) {
      return {
        exercise: null,
        error: "Exercise not found",
      };
    }

    return {
      exercise: null,
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch exercise",
    };
  }
}

/**
 * Fetch dashboard data for server-side rendering (requires authentication)
 */
export async function getDashboardServerSide() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      redirect("/auth/signin");
    }

    const client = await createServerClient();
    const dashboard = (await client.getDashboard()) as DashboardData;

    return {
      dashboard,
      error: null,
    };
  } catch (error) {
    console.error("Server-side dashboard fetch error:", error);

    if (error instanceof ExercismAPIError && error.status === 401) {
      redirect("/auth/signin");
    }

    return {
      dashboard: null,
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch dashboard",
    };
  }
}

/**
 * Fetch user profile data for server-side rendering
 */
export async function getProfileServerSide(handle: string) {
  try {
    const client = await createServerClient();

    // In a real implementation, this would be a profile-specific endpoint
    // For now, we'll simulate it with a user lookup by handle
    const profile = await client.get(`/profiles/${handle}`);

    return {
      profile,
      error: null,
    };
  } catch (error) {
    console.error("Server-side profile fetch error:", error);

    if (error instanceof ExercismAPIError && error.status === 404) {
      return {
        profile: null,
        error: "Profile not found",
      };
    }

    return {
      profile: null,
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch profile",
    };
  }
}

/**
 * Fetch mentoring discussions for server-side rendering (requires mentor access)
 */
export async function getMentoringDiscussionsServerSide(params?: {
  status?: string;
  trackSlug?: string;
  page?: string;
}) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      redirect("/auth/signin");
    }

    if (!session.user.isMentor) {
      redirect("/dashboard");
    }

    const client = await createServerClient();
    const data = (await client.getMentoringDiscussions(
      params,
    )) as MentoringDiscussionsResponse;

    return {
      discussions: data.discussions || [],
      meta: data.meta || { currentPage: 1, totalPages: 1, totalCount: 0 },
      error: null,
    };
  } catch (error) {
    console.error("Server-side mentoring discussions fetch error:", error);

    if (error instanceof ExercismAPIError && error.status === 401) {
      redirect("/auth/signin");
    }

    if (error instanceof ExercismAPIError && error.status === 403) {
      redirect("/dashboard");
    }

    return {
      discussions: [],
      meta: { currentPage: 1, totalPages: 1, totalCount: 0 },
      error:
        error instanceof ExercismAPIError
          ? error.message
          : "Failed to fetch discussions",
    };
  }
}

/**
 * Utility function for handling authentication redirects
 */
export async function requireAuth(redirectTo: string = "/auth/signin") {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  return session.user;
}

/**
 * Utility function for handling mentor access
 */
export async function requireMentor(redirectTo: string = "/dashboard") {
  const user = await requireAuth();

  if (!user.isMentor) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Utility function for handling insider access
 */
export async function requireInsider(redirectTo: string = "/dashboard") {
  const user = await requireAuth();

  if (!user.isInsider) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Static data generation helpers for ISR
 */

// Generate static params for tracks
export async function generateTrackParams() {
  try {
    const client = new ServerAPIClient();
    const data = await client.getTracks();

    return (data as TracksResponse).tracks.map((track: Track) => ({
      slug: track.slug,
    }));
  } catch (error) {
    console.error("Error generating track params:", error);
    return [];
  }
}

// Generate static params for exercises
export async function generateExerciseParams(trackSlug: string) {
  try {
    const client = new ServerAPIClient();
    const data = await client.getTrackExercises(trackSlug);

    return (data as { exercises: Exercise[] }).exercises.map(
      (exercise: Exercise) => ({
        slug: trackSlug,
        exerciseSlug: exercise.slug,
      }),
    );
  } catch (error) {
    console.error("Error generating exercise params:", error);
    return [];
  }
}

/**
 * Revalidation helpers for ISR
 */

// Revalidate track data (called when track is updated)
export async function revalidateTrack(trackSlug: string) {
  try {
    // In a real implementation, this would trigger ISR revalidation
    // For now, we'll just log the revalidation request
    console.log(`Revalidating track: ${trackSlug}`);

    // This would typically call revalidatePath or revalidateTag
    // revalidatePath(`/tracks/${trackSlug}`)
  } catch (error) {
    console.error("Error revalidating track:", error);
  }
}

// Revalidate exercise data (called when exercise is updated)
export async function revalidateExercise(
  trackSlug: string,
  exerciseSlug: string,
) {
  try {
    console.log(`Revalidating exercise: ${trackSlug}/${exerciseSlug}`);

    // This would typically call revalidatePath or revalidateTag
    // revalidatePath(`/tracks/${trackSlug}/exercises/${exerciseSlug}`)
  } catch (error) {
    console.error("Error revalidating exercise:", error);
  }
}

/**
 * Error handling for server-side rendering
 */
export function handleServerError(
  error: unknown,
  fallbackMessage: string = "An error occurred",
) {
  console.error("Server-side error:", error);

  if (error instanceof ExercismAPIError) {
    return {
      error: error.message,
      status: error.status,
    };
  }

  return {
    error: fallbackMessage,
    status: 500,
  };
}

/**
 * Data prefetching for performance optimization
 */
export async function prefetchCriticalData() {
  try {
    const client = new ServerAPIClient();

    // Prefetch commonly accessed data
    const [tracksData] = await Promise.allSettled([client.getTracks()]);

    return {
      tracks: tracksData.status === "fulfilled" ? tracksData.value : null,
    };
  } catch (error) {
    console.error("Error prefetching critical data:", error);
    return {
      tracks: null,
    };
  }
}
