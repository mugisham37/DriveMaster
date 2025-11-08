import { Track } from "@/types";

export interface TracksData {
  tracks: Track[];
  numTracks: number;
  trackIconUrls: string[];
}

export async function getTracksData(): Promise<TracksData> {
  // In a real implementation, this would fetch from your API
  // For now, return mock data that matches the expected structure

  const mockTracks: Track[] = [
    {
      slug: "javascript",
      title: "JavaScript",
      iconUrl: "/assets/tracks/javascript.svg",
      course: true,
      numConcepts: 25,
      numExercises: 140,
      numSolutions: 50000,
      links: {
        self: "/tracks/javascript",
        exercises: "/tracks/javascript/exercises",
        concepts: "/tracks/javascript/concepts",
      },
    },
    {
      slug: "python",
      title: "Python",
      iconUrl: "/assets/tracks/python.svg",
      course: true,
      numConcepts: 30,
      numExercises: 120,
      numSolutions: 45000,
      links: {
        self: "/tracks/python",
        exercises: "/tracks/python/exercises",
        concepts: "/tracks/python/concepts",
      },
    },
    {
      slug: "ruby",
      title: "Ruby",
      iconUrl: "/assets/tracks/ruby.svg",
      course: true,
      numConcepts: 20,
      numExercises: 100,
      numSolutions: 30000,
      links: {
        self: "/tracks/ruby",
        exercises: "/tracks/ruby/exercises",
        concepts: "/tracks/ruby/concepts",
      },
    },
  ];

  const trackIconUrls = mockTracks.slice(0, 8).map((track) => track.iconUrl);

  return {
    tracks: mockTracks,
    numTracks: 67, // Total number of tracks
    trackIconUrls,
  };
}
