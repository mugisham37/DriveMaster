import { Badge, SiteUpdate, StudentTrack, MentorDiscussion } from "@/types";

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  imageUrl?: string;
  links: {
    self: string;
  };
}

export interface LiveEvent {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  youtube?: boolean;
}

export interface ScheduledEvent {
  id: number;
  title: string;
  startsAt: string;
}

export interface DashboardData {
  featuredBadges: Badge[];
  numBadges: number;
  blogPosts: BlogPost[];
  updates: SiteUpdate[];
  liveEvent?: LiveEvent;
  featuredEvent?: LiveEvent;
  scheduledEvents: ScheduledEvent[];
  userTracks: StudentTrack[];
  numUserTracks: number;
  mentorDiscussions: MentorDiscussion[];
  mentorQueueHasRequests: boolean;
}

export async function getDashboardData(): Promise<DashboardData> {
  // In a real implementation, this would fetch from your API
  // For now, return mock data that matches the expected structure

  return {
    featuredBadges: [
      {
        uuid: "1",
        rarity: "common",
        iconName: "member",
        name: "Member",
        description: "Joined Exercism",
        isRevealed: true,
        unlockedAt: "2024-01-01T00:00:00Z",
        numAwardees: 1000,
        percentageAwardees: 50,
        links: { reveal: "" },
      },
    ],
    numBadges: 5,
    blogPosts: [
      {
        id: 1,
        title: "Welcome to Exercism",
        slug: "welcome-to-exercism",
        excerpt: "Learn to code with our structured approach",
        publishedAt: "2024-01-01T00:00:00Z",
        author: {
          name: "Exercism Team",
          avatarUrl: "/assets/avatars/exercism-team.jpg",
        },
        links: { self: "/blog/welcome-to-exercism" },
      },
    ],
    updates: [],
    userTracks: [],
    numUserTracks: 0,
    mentorDiscussions: [],
    mentorQueueHasRequests: false,
    scheduledEvents: [],
  };
}
