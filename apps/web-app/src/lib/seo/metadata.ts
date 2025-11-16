/**
 * SEO Metadata Utilities
 * 
 * Utilities for generating consistent metadata across pages:
 * - Title tags
 * - Description meta tags
 * - Open Graph tags for social sharing
 * - Canonical URLs
 * 
 * Requirements: 13.1
 * Task: 17.4
 */

import { Metadata } from 'next';

// ============================================================================
// Constants
// ============================================================================

const SITE_NAME = 'DriveMaster';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://drivemaster.com';
const DEFAULT_DESCRIPTION =
  'Master your driving skills with comprehensive lessons, practice tests, and personalized learning paths. Prepare for your driving test with confidence.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = '@drivemaster';

// ============================================================================
// Types
// ============================================================================

export interface PageMetadataOptions {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noIndex?: boolean;
  keywords?: string[];
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

// ============================================================================
// Metadata Generators
// ============================================================================

/**
 * Generate metadata for a page
 */
export function generatePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path = '',
  noIndex = false,
  keywords = [],
  type = 'website',
  publishedTime,
  modifiedTime,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_US',
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      creator: TWITTER_HANDLE,
      images: [image],
    },
  };

  // Add article-specific metadata
  if (type === 'article' && (publishedTime || modifiedTime)) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime,
      modifiedTime,
    };
  }

  // Add robots directive if noIndex
  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  } else {
    metadata.robots = {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    };
  }

  return metadata;
}

// ============================================================================
// Page-Specific Metadata
// ============================================================================

export const dashboardMetadata = generatePageMetadata({
  title: 'Dashboard',
  description:
    'Your learning hub. Track your progress, continue lessons, and discover personalized recommendations.',
  path: '/learn',
  keywords: ['dashboard', 'learning progress', 'driving lessons'],
});

export const learningPathMetadata = generatePageMetadata({
  title: 'Learning Path',
  description:
    'Follow a structured curriculum designed to take you from beginner to test-ready. Track your progress through units and lessons.',
  path: '/learn/path',
  keywords: ['learning path', 'curriculum', 'driving course'],
});

export const practiceMetadata = generatePageMetadata({
  title: 'Practice Mode',
  description:
    'Practice specific topics with adaptive difficulty. Focus on your weak areas and improve your skills.',
  path: '/practice',
  keywords: ['practice', 'driving practice', 'adaptive learning'],
});

export const browseMetadata = generatePageMetadata({
  title: 'Browse & Search',
  description:
    'Search and discover driving lessons, practice questions, and learning materials. Filter by topic, difficulty, and more.',
  path: '/browse',
  keywords: ['search', 'browse', 'driving lessons', 'practice questions'],
});

export const progressMetadata = generatePageMetadata({
  title: 'Progress & Analytics',
  description:
    'View detailed analytics of your learning progress. Track your strengths, identify weak areas, and monitor improvement over time.',
  path: '/progress',
  keywords: ['progress', 'analytics', 'learning statistics'],
});

export const mockTestMetadata = generatePageMetadata({
  title: 'Mock Test',
  description:
    'Take a full-length timed practice test that simulates the actual driving exam. Assess your readiness and build confidence.',
  path: '/test/mock',
  keywords: ['mock test', 'practice test', 'driving exam'],
});

export const profileMetadata = generatePageMetadata({
  title: 'Profile',
  description: 'Manage your profile, preferences, and account settings.',
  path: '/profile',
  noIndex: true,
});

export const settingsMetadata = generatePageMetadata({
  title: 'Settings',
  description: 'Configure your learning preferences and account settings.',
  path: '/settings',
  noIndex: true,
});

// ============================================================================
// Dynamic Metadata Generators
// ============================================================================

/**
 * Generate metadata for a lesson page
 */
export function generateLessonMetadata(
  lessonTitle: string,
  lessonDescription: string,
  lessonId: string
): Metadata {
  return generatePageMetadata({
    title: lessonTitle,
    description: lessonDescription,
    path: `/learn/lesson/${lessonId}`,
    keywords: ['lesson', 'driving lesson', lessonTitle],
  });
}

/**
 * Generate metadata for search results
 */
export function generateSearchMetadata(query: string): Metadata {
  return generatePageMetadata({
    title: `Search: ${query}`,
    description: `Search results for "${query}". Find driving lessons, practice questions, and learning materials.`,
    path: `/browse?q=${encodeURIComponent(query)}`,
    noIndex: true, // Don't index search result pages
  });
}

/**
 * Generate metadata for topic pages
 */
export function generateTopicMetadata(topicName: string): Metadata {
  return generatePageMetadata({
    title: `${topicName} - Lessons & Practice`,
    description: `Learn about ${topicName} with comprehensive lessons and practice questions. Master this topic for your driving test.`,
    path: `/browse?topic=${encodeURIComponent(topicName)}`,
    keywords: ['topic', topicName, 'driving lessons'],
  });
}
