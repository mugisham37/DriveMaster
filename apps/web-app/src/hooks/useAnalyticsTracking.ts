/**
 * Analytics Tracking Hook
 * 
 * React hook for tracking analytics events in components
 * Requirements: 9.1
 * Task: 17.5
 */

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  analytics,
  initializeAnalytics,
  type LessonStartedEvent,
  type QuestionAnsweredEvent,
  type LessonCompletedEvent,
  type DailyGoalReachedEvent,
  type StreakMaintainedEvent,
  type AchievementEarnedEvent,
  type SearchPerformedEvent,
  type FilterAppliedEvent,
  type PracticeSessionEvent,
  type MockTestEvent,
} from '@/lib/analytics/tracking';

/**
 * Hook to initialize analytics with user context
 */
export function useAnalyticsInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeAnalytics(user.id.toString());
    } else {
      initializeAnalytics(null);
    }
  }, [user]);
}

/**
 * Hook to track page views automatically
 */
export function usePageViewTracking(pageTitle?: string) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      analytics.trackPageView(pathname, pageTitle || document.title);
    }
  }, [pathname, pageTitle]);
}

/**
 * Hook to get analytics tracking functions
 */
export function useAnalyticsTracking() {
  // Lesson tracking
  const trackLessonStarted = useCallback((data: LessonStartedEvent) => {
    analytics.trackLessonStarted(data);
  }, []);

  const trackQuestionAnswered = useCallback((data: QuestionAnsweredEvent) => {
    analytics.trackQuestionAnswered(data);
  }, []);

  const trackLessonCompleted = useCallback((data: LessonCompletedEvent) => {
    analytics.trackLessonCompleted(data);
  }, []);

  // Progress tracking
  const trackDailyGoalReached = useCallback((data: DailyGoalReachedEvent) => {
    analytics.trackDailyGoalReached(data);
  }, []);

  const trackStreakMaintained = useCallback((data: StreakMaintainedEvent) => {
    analytics.trackStreakMaintained(data);
  }, []);

  const trackAchievementEarned = useCallback((data: AchievementEarnedEvent) => {
    analytics.trackAchievementEarned(data);
  }, []);

  // Search and discovery tracking
  const trackSearchPerformed = useCallback((data: SearchPerformedEvent) => {
    analytics.trackSearchPerformed(data);
  }, []);

  const trackFilterApplied = useCallback((data: FilterAppliedEvent) => {
    analytics.trackFilterApplied(data);
  }, []);

  // Practice and test tracking
  const trackPracticeSessionStarted = useCallback((topics: string[], difficulty: number) => {
    analytics.trackPracticeSessionStarted(topics, difficulty);
  }, []);

  const trackPracticeSessionCompleted = useCallback((data: PracticeSessionEvent) => {
    analytics.trackPracticeSessionCompleted(data);
  }, []);

  const trackMockTestStarted = useCallback((jurisdiction: string) => {
    analytics.trackMockTestStarted(jurisdiction);
  }, []);

  const trackMockTestCompleted = useCallback((data: MockTestEvent) => {
    analytics.trackMockTestCompleted(data);
  }, []);

  // Navigation tracking
  const trackNavigationClick = useCallback((destination: string, source: string) => {
    analytics.trackNavigationClick(destination, source);
  }, []);

  // Engagement tracking
  const trackFeatureUsed = useCallback((featureName: string, context?: Record<string, unknown>) => {
    analytics.trackFeatureUsed(featureName, context);
  }, []);

  const trackButtonClick = useCallback((buttonName: string, context?: Record<string, unknown>) => {
    analytics.trackButtonClick(buttonName, context);
  }, []);

  // Error tracking
  const trackError = useCallback((errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    analytics.trackError(errorType, errorMessage, context);
  }, []);

  return {
    // Lesson events
    trackLessonStarted,
    trackQuestionAnswered,
    trackLessonCompleted,
    
    // Progress events
    trackDailyGoalReached,
    trackStreakMaintained,
    trackAchievementEarned,
    
    // Search and discovery events
    trackSearchPerformed,
    trackFilterApplied,
    
    // Practice and test events
    trackPracticeSessionStarted,
    trackPracticeSessionCompleted,
    trackMockTestStarted,
    trackMockTestCompleted,
    
    // Navigation events
    trackNavigationClick,
    
    // Engagement events
    trackFeatureUsed,
    trackButtonClick,
    
    // Error events
    trackError,
  };
}

/**
 * Hook to track component mount/unmount
 */
export function useComponentTracking(componentName: string) {
  useEffect(() => {
    analytics.trackFeatureUsed(`${componentName}_mounted`);
    
    return () => {
      analytics.trackFeatureUsed(`${componentName}_unmounted`);
    };
  }, [componentName]);
}
