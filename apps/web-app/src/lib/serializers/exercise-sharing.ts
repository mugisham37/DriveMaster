// Serialization functions for exercise sharing - migrated from Ruby SerializeExercise*ForSharing
import { Exercise, Track } from "@/types";

export interface ExerciseApproach {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  blurb: string;
  exercise: Exercise;
  track: Track;
  links: {
    self: string;
  };
}

export interface ExerciseArticle {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  blurb: string;
  exercise: Exercise;
  track: Track;
  links: {
    self: string;
  };
}

export interface ShareData {
  title: string;
  shareTitle: string;
  shareLink: string;
  platforms: Array<{
    name: string;
    icon: string;
    url: string;
    color: string;
  }>;
}

export function serializeExerciseApproachForSharing(
  approach: ExerciseApproach,
): ShareData {
  const shareTitle = `${approach.title} approach for ${approach.exercise.title} in ${approach.track.title}`;
  const shareLink = `${window.location.origin}${approach.links.self}`;

  return {
    title: `Share ${approach.title} approach`,
    shareTitle,
    shareLink,
    platforms: [
      {
        name: "Twitter",
        icon: "twitter",
        url: "https://twitter.com/intent/tweet?text={title}&url={url}",
        color: "#1DA1F2",
      },
      {
        name: "Facebook",
        icon: "facebook",
        url: "https://www.facebook.com/sharer/sharer.php?u={url}",
        color: "#4267B2",
      },
      {
        name: "LinkedIn",
        icon: "linkedin",
        url: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
        color: "#0077B5",
      },
      {
        name: "Reddit",
        icon: "reddit",
        url: "https://reddit.com/submit?url={url}&title={title}",
        color: "#FF4500",
      },
    ],
  };
}

export function serializeExerciseArticleForSharing(
  article: ExerciseArticle,
): ShareData {
  const shareTitle = `${article.title} article for ${article.exercise.title} in ${article.track.title}`;
  const shareLink = `${window.location.origin}${article.links.self}`;

  return {
    title: `Share ${article.title} article`,
    shareTitle,
    shareLink,
    platforms: [
      {
        name: "Twitter",
        icon: "twitter",
        url: "https://twitter.com/intent/tweet?text={title}&url={url}",
        color: "#1DA1F2",
      },
      {
        name: "Facebook",
        icon: "facebook",
        url: "https://www.facebook.com/sharer/sharer.php?u={url}",
        color: "#4267B2",
      },
      {
        name: "LinkedIn",
        icon: "linkedin",
        url: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
        color: "#0077B5",
      },
      {
        name: "Reddit",
        icon: "reddit",
        url: "https://reddit.com/submit?url={url}&title={title}",
        color: "#FF4500",
      },
    ],
  };
}
