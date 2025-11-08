import { User, CommunitySolution, Flair, SubmissionTestsStatus } from "@/types";
import { IterationStatus } from "@/types/index";

export interface Profile {
  id: number;
  handle: string;
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  twitterUsername?: string;
  mediumUsername?: string;
  linkedinUsername?: string;
  updatedAt: string;
  solutionsTab: boolean;
}

export interface ProfileData {
  user: User & {
    numPublishedSolutions: number;
  };
  profile: Profile;
  solutions: CommunitySolution[];
}

export async function getProfileData(
  handle: string,
): Promise<ProfileData | null> {
  // In a real implementation, this would fetch from your API
  // For now, return mock data that matches the expected structure

  if (handle === "nonexistent") {
    return null;
  }

  return {
    user: {
      avatarUrl: "/assets/avatars/default.jpg",
      flair: "founder" as Flair,
      name: "John Doe",
      handle: handle,
      reputation: "1,234",
      numPublishedSolutions: 42,
      links: {
        self: `/profiles/${handle}`,
        profile: `/profiles/${handle}`,
      },
    },
    profile: {
      id: 1,
      handle: handle,
      name: "John Doe",
      bio: "Passionate developer learning new technologies",
      location: "San Francisco, CA",
      website: "https://johndoe.dev",
      githubUsername: "johndoe",
      twitterUsername: "johndoe",
      updatedAt: "2024-01-01T00:00:00Z",
      solutionsTab: true,
    },
    solutions: [
      {
        uuid: "1",
        snippet: 'def hello_world\n  "Hello, World!"\nend',
        numStars: "5",
        numComments: "2",
        representationNumPublishedSolutions: "100",
        publishedAt: "2024-01-01T00:00:00Z",
        language: "ruby",
        iterationStatus: IterationStatus.NO_AUTOMATED_FEEDBACK,
        publishedIterationHeadTestsStatus: SubmissionTestsStatus.PASSED,
        isOutOfDate: false,
        author: {
          handle: handle,
          avatarUrl: "/assets/avatars/default.jpg",
          flair: "founder" as Flair,
        },
        exercise: {
          title: "Hello World",
          iconUrl: "/assets/exercises/hello-world.svg",
        },
        track: {
          title: "Ruby",
          iconUrl: "/assets/tracks/ruby.svg",
          highlightjsLanguage: "ruby",
        },
        links: {
          publicUrl: `/tracks/ruby/exercises/hello-world/solutions/${handle}`,
          privateIterationsUrl: `/tracks/ruby/exercises/hello-world/iterations`,
        },
      },
    ],
  };
}
