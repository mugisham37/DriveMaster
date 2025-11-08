export interface SharePlatform {
  name: string;
  icon: string;
  url: string;
  color: string;
}

export const SHARE_PLATFORMS: SharePlatform[] = [
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
  {
    name: "Hacker News",
    icon: "hackernews",
    url: "https://news.ycombinator.com/submitlink?u={url}&t={title}",
    color: "#FF6600",
  },
];

export function getSharePlatforms(): SharePlatform[] {
  return SHARE_PLATFORMS;
}
