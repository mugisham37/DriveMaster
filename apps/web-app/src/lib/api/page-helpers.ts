/**
 * Page helper functions for server-side data fetching
 * These functions can be used directly in Next.js page components
 * to preserve exact Rails data structure and loading states
 */

import { Metadata } from "next";
import type { Track, Exercise, User } from "@/types";
import {
  getTracksServerSide,
  getTrackServerSide,
  getExerciseServerSide,
  getDashboardServerSide,
  getProfileServerSide,
  getMentoringDiscussionsServerSide,
  requireAuth,
  requireMentor,
} from "./server";

/**
 * Tracks page data fetching
 */
export async function getTracksPageData(searchParams: {
  criteria?: string;
  tags?: string;
  status?: string;
}) {
  const params: { criteria?: string; tags?: string; status?: string } = {};
  if (searchParams.criteria) params.criteria = searchParams.criteria;
  if (searchParams.tags) params.tags = searchParams.tags;
  if (searchParams.status) params.status = searchParams.status;

  const { tracks, numTracks, trackIconUrls, error } =
    await getTracksServerSide(params);

  return {
    tracks,
    numTracks,
    trackIconUrls,
    error,
    // Preserve Rails-style search params
    searchParams: {
      criteria: searchParams.criteria || "",
      tags: searchParams.tags || "",
      status: searchParams.status || "",
    },
  };
}

/**
 * Track detail page data fetching
 */
export async function getTrackPageData(slug: string) {
  const { track, error } = await getTrackServerSide(slug);

  if (error === "Track not found") {
    return {
      notFound: true,
    };
  }

  return {
    track,
    error,
  };
}

/**
 * Exercise page data fetching
 */
export async function getExercisePageData(
  trackSlug: string,
  exerciseSlug: string,
) {
  // Fetch both track and exercise data in parallel
  const [trackResult, exerciseResult] = await Promise.all([
    getTrackServerSide(trackSlug),
    getExerciseServerSide(trackSlug, exerciseSlug),
  ]);

  if (
    trackResult.error === "Track not found" ||
    exerciseResult.error === "Exercise not found"
  ) {
    return {
      notFound: true,
    };
  }

  return {
    track: trackResult.track,
    exercise: exerciseResult.exercise,
    error: trackResult.error || exerciseResult.error,
  };
}

/**
 * Dashboard page data fetching (requires authentication)
 */
export async function getDashboardPageData() {
  // This will redirect to signin if not authenticated
  const user = await requireAuth();

  const { dashboard, error } = await getDashboardServerSide();

  return {
    user,
    dashboard,
    error,
  };
}

/**
 * Profile page data fetching
 */
export async function getProfilePageData(handle: string) {
  const { profile, error } = await getProfileServerSide(handle);

  if (error === "Profile not found") {
    return {
      notFound: true,
    };
  }

  return {
    profile,
    error,
  };
}

/**
 * Mentoring discussions page data fetching (requires mentor access)
 */
export async function getMentoringPageData(searchParams: {
  status?: string;
  track_slug?: string;
  page?: string;
}) {
  // This will redirect if not authenticated or not a mentor
  const user = await requireMentor();

  const params: { status?: string; trackSlug?: string; page?: string } = {};
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.track_slug) params.trackSlug = searchParams.track_slug;
  if (searchParams.page) params.page = searchParams.page;

  const { discussions, meta, error } =
    await getMentoringDiscussionsServerSide(params);

  return {
    user,
    discussions,
    meta,
    error,
    searchParams: {
      status: searchParams.status || "all",
      trackSlug: searchParams.track_slug || "",
      page: searchParams.page || "1",
    },
  };
}

/**
 * Metadata generation helpers matching Rails SEO patterns
 */

export function generateTracksMetadata(): Metadata {
  return {
    title: "Programming Tracks | Exercism",
    description:
      "Learn programming with 67+ tracks covering popular languages like JavaScript, Python, Ruby, and more. Practice coding with real-world exercises.",
    keywords:
      "programming, coding, learn to code, programming languages, exercises",
    openGraph: {
      title: "Programming Tracks | Exercism",
      description:
        "Learn programming with 67+ tracks covering popular languages like JavaScript, Python, Ruby, and more.",
      type: "website",
      url: "/tracks",
    },
    twitter: {
      card: "summary_large_image",
      title: "Programming Tracks | Exercism",
      description:
        "Learn programming with 67+ tracks covering popular languages like JavaScript, Python, Ruby, and more.",
    },
  };
}

export function generateTrackMetadata(track: Track | null): Metadata {
  if (!track) {
    return {
      title: "Track Not Found | Exercism",
    };
  }

  return {
    title: `${track.title} Track | Exercism`,
    description: `Learn ${track.title} programming with ${track.numExercises} exercises. Master ${track.title} through practice and mentorship.`,
    keywords: `${track.title.toLowerCase()}, programming, coding, exercises, learn ${track.title.toLowerCase()}`,
    openGraph: {
      title: `${track.title} Track | Exercism`,
      description: `Learn ${track.title} programming with ${track.numExercises} exercises.`,
      type: "website",
      url: `/tracks/${track.slug}`,
      images: track.iconUrl ? [{ url: track.iconUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${track.title} Track | Exercism`,
      description: `Learn ${track.title} programming with ${track.numExercises} exercises.`,
    },
  };
}

export function generateExerciseMetadata(
  track: Track | null,
  exercise: Exercise | null,
): Metadata {
  if (!track || !exercise) {
    return {
      title: "Exercise Not Found | Exercism",
    };
  }

  return {
    title: `${exercise.title} in ${track.title} | Exercism`,
    description: `${exercise.blurb || `Practice ${exercise.title} in ${track.title}.`} Difficulty: ${exercise.difficulty}/10.`,
    keywords: `${track.title.toLowerCase()}, ${exercise.title.toLowerCase()}, programming exercise, coding practice`,
    openGraph: {
      title: `${exercise.title} in ${track.title} | Exercism`,
      description:
        exercise.blurb || `Practice ${exercise.title} in ${track.title}.`,
      type: "website",
      url: `/tracks/${track.slug}/exercises/${exercise.slug}`,
      images: exercise.iconUrl ? [{ url: exercise.iconUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${exercise.title} in ${track.title} | Exercism`,
      description:
        exercise.blurb || `Practice ${exercise.title} in ${track.title}.`,
    },
  };
}

export function generateProfileMetadata(profile: User | null): Metadata {
  if (!profile) {
    return {
      title: "Profile Not Found | Exercism",
    };
  }

  return {
    title: `${profile.name || profile.handle} | Exercism`,
    description: `View ${profile.name || profile.handle}'s profile on Exercism. See their solutions, badges, and contributions to the community.`,
    keywords: `${profile.handle}, exercism profile, programming solutions, coding portfolio`,
    openGraph: {
      title: `${profile.name || profile.handle} | Exercism`,
      description: `View ${profile.name || profile.handle}'s profile on Exercism.`,
      type: "profile",
      url: `/profiles/${profile.handle}`,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name || profile.handle} | Exercism`,
      description: `View ${profile.name || profile.handle}'s profile on Exercism.`,
    },
  };
}

/**
 * Static generation helpers for ISR
 */

export async function generateStaticParams() {
  // This would be used in generateStaticParams functions
  // to pre-generate static pages for popular tracks/exercises

  try {
    const { tracks } = await getTracksServerSide();

    // Generate params for popular tracks (first 10)
    return tracks.slice(0, 10).map((track: Track) => ({
      slug: track.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

/**
 * Error page data helpers
 */

export function getErrorPageData(error: string, status: number = 500) {
  return {
    error,
    status,
    title: status === 404 ? "Page Not Found" : "Something went wrong",
    description:
      status === 404
        ? "The page you are looking for does not exist."
        : "An error occurred while loading this page.",
  };
}

/**
 * Loading state helpers
 */

export function getLoadingPageData(
  type: "tracks" | "track" | "exercise" | "dashboard" | "profile",
) {
  const loadingMessages = {
    tracks: "Loading programming tracks...",
    track: "Loading track details...",
    exercise: "Loading exercise...",
    dashboard: "Loading your dashboard...",
    profile: "Loading profile...",
  };

  return {
    isLoading: true,
    message: loadingMessages[type] || "Loading...",
  };
}
