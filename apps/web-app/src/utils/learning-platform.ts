/**
 * Learning Platform Utility Functions
 * 
 * Shared utility functions for common operations across the learning platform
 */

// ============================================================================
// Date Formatting Utilities
// ============================================================================

/**
 * Format a date to a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format duration in seconds to human-readable string (e.g., "2h 30m", "45m", "30s")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format time in minutes to human-readable string (e.g., "2 hours", "45 minutes")
 */
export function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

// ============================================================================
// Number Formatting Utilities
// ============================================================================

/**
 * Format a number with thousands separators (e.g., 1000 -> "1,000")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a percentage with optional decimal places (e.g., 0.856 -> "85.6%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as a compact string (e.g., 1500 -> "1.5K", 1000000 -> "1M")
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return `${(num / 1000000).toFixed(1)}M`;
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// ============================================================================
// Text Utilities
// ============================================================================

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Convert a string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

// ============================================================================
// Mastery and Progress Utilities
// ============================================================================

/**
 * Get mastery level category based on percentage
 */
export function getMasteryCategory(masteryLevel: number): 'needs-work' | 'in-progress' | 'mastered' {
  if (masteryLevel < 50) return 'needs-work';
  if (masteryLevel < 80) return 'in-progress';
  return 'mastered';
}

/**
 * Get mastery color based on level
 */
export function getMasteryColor(masteryLevel: number): string {
  if (masteryLevel < 50) return 'text-red-600';
  if (masteryLevel < 80) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Calculate accuracy from correct and total answers
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return (correct / total) * 100;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ============================================================================
// Difficulty Utilities
// ============================================================================

/**
 * Convert IRT difficulty (-3 to 3) to human-readable label
 */
export function getDifficultyLabel(irtDifficulty: number): 'beginner' | 'intermediate' | 'advanced' {
  if (irtDifficulty < -1) return 'beginner';
  if (irtDifficulty < 1) return 'intermediate';
  return 'advanced';
}

/**
 * Get difficulty color class
 */
export function getDifficultyColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (difficulty) {
    case 'beginner':
      return 'text-green-600';
    case 'intermediate':
      return 'text-yellow-600';
    case 'advanced':
      return 'text-red-600';
  }
}

// ============================================================================
// Streak Utilities
// ============================================================================

/**
 * Check if a streak is active (last activity was yesterday or today)
 */
export function isStreakActive(lastActivityDate: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastActivity = new Date(
    lastActivityDate.getFullYear(),
    lastActivityDate.getMonth(),
    lastActivityDate.getDate()
  );

  const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 1;
}

/**
 * Calculate days until streak expires (0 if expired, 1 if active today)
 */
export function getDaysUntilStreakExpires(lastActivityDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastActivity = new Date(
    lastActivityDate.getFullYear(),
    lastActivityDate.getMonth(),
    lastActivityDate.getDate()
  );

  const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0; // Streak expired
  if (diffDays === 0) return 1; // Active today
  return 1; // Active yesterday, expires today
}

// ============================================================================
// Session Storage Utilities
// ============================================================================

/**
 * Save lesson state to session storage
 */
export function saveLessonState(lessonId: string, state: unknown): void {
  try {
    sessionStorage.setItem(`lesson-${lessonId}`, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save lesson state:', error);
  }
}

/**
 * Load lesson state from session storage
 */
export function loadLessonState<T>(lessonId: string): T | null {
  try {
    const data = sessionStorage.getItem(`lesson-${lessonId}`);
    return data ? (JSON.parse(data) as T) : null;
  } catch (error) {
    console.error('Failed to load lesson state:', error);
    return null;
  }
}

/**
 * Clear lesson state from session storage
 */
export function clearLessonState(lessonId: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`lesson-${lessonId}`);
    }
  } catch (error) {
    console.error('Failed to clear lesson state:', error);
  }
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate that a choice is selected
 */
export function isChoiceSelected(choiceId: string | undefined): boolean {
  return !!choiceId && choiceId.trim().length > 0;
}

/**
 * Validate practice settings
 */
export function validatePracticeSettings(settings: {
  topics: string[];
  questionCount: number | 'unlimited';
  difficultyRange: [number, number];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (settings.topics.length === 0) {
    errors.push('Please select at least one topic');
  }

  if (typeof settings.questionCount === 'number' && settings.questionCount < 1) {
    errors.push('Question count must be at least 1');
  }

  if (settings.difficultyRange[0] > settings.difficultyRange[1]) {
    errors.push('Invalid difficulty range');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

/**
 * Group items by a key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey]!.push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

// ============================================================================
// Score and Performance Utilities
// ============================================================================

/**
 * Calculate score from correct answers and total questions
 */
export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Determine if a test is passed based on score and passing threshold
 */
export function isTestPassed(score: number, passingScore: number): boolean {
  return score >= passingScore;
}

/**
 * Get performance level based on accuracy
 */
export function getPerformanceLevel(accuracy: number): 'excellent' | 'good' | 'fair' | 'needs-improvement' {
  if (accuracy >= 90) return 'excellent';
  if (accuracy >= 75) return 'good';
  if (accuracy >= 60) return 'fair';
  return 'needs-improvement';
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Build a URL with query parameters
 */
export function buildUrlWithParams(baseUrl: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
