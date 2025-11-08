import { Track, Exercise, Concept } from "@/types";

export interface TrackData {
  track: Track;
  exercises: Exercise[];
  concepts: Concept[];
  isJoined: boolean;
}

export async function getTrackData(slug: string): Promise<TrackData | null> {
  // In a real implementation, this would fetch from your API
  // For now, return mock data that matches the expected structure

  if (slug === "nonexistent") {
    return null;
  }

  const mockExercises: Exercise[] = [
    {
      slug: "hello-world",
      type: "practice",
      title: "Hello World",
      iconUrl: "/assets/exercises/hello-world.svg",
      blurb: 'The classical introductory exercise. Just say "Hello, World!"',
      difficulty: "easy",
      isRecommended: true,
      isExternal: false,
      isUnlocked: true,
      links: {
        self: `/tracks/${slug}/exercises/hello-world`,
      },
    },
    {
      slug: "two-fer",
      type: "practice",
      title: "Two Fer",
      iconUrl: "/assets/exercises/two-fer.svg",
      blurb: 'Create a sentence of the form "One for X, one for me."',
      difficulty: "easy",
      isRecommended: true,
      isExternal: false,
      isUnlocked: true,
      links: {
        self: `/tracks/${slug}/exercises/two-fer`,
      },
    },
  ];

  const mockConcepts: Concept[] = [
    {
      name: "Basics",
      slug: "basics",
      links: {
        self: `/tracks/${slug}/concepts/basics`,
        tooltip: `/tracks/${slug}/concepts/basics/tooltip`,
      },
    },
    {
      name: "Functions",
      slug: "functions",
      links: {
        self: `/tracks/${slug}/concepts/functions`,
        tooltip: `/tracks/${slug}/concepts/functions/tooltip`,
      },
    },
  ];

  return {
    track: {
      slug: slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      iconUrl: `/assets/tracks/${slug}.svg`,
      course: true,
      numConcepts: mockConcepts.length,
      numExercises: mockExercises.length,
      numSolutions: 50000,
      links: {
        self: `/tracks/${slug}`,
        exercises: `/tracks/${slug}/exercises`,
        concepts: `/tracks/${slug}/concepts`,
      },
    },
    exercises: mockExercises,
    concepts: mockConcepts,
    isJoined: false,
  };
}
