/**
 * Analytics Tracking Utilities
 * 
 * Centralized analytics event tracking for key user actions:
 * - Lesson events (started, question answered, completed)
 * - Progress events (daily goal reached, streak maintained, achievement earned)
 * - Search and discovery events (search performed, filter applied)
 * 
 * Requirements: 9.1
 * Task: 17.5
 */

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface LessonStartedEvent {
  lessonId: string;
  lessonTitle: string;
  difficulty: number;
  topics: string[];
  estimatedTime: number;
}

export interface QuestionAnsweredEvent {
  questionId: string;
  lessonId?: string;
  isCorrect: boolean;
  timeSpentMs: number;
  difficulty: number;
  topics: string[];
  practiceMode?: boolean;
  mockTest?: boolean;
}

export interface LessonCompletedEvent {
  lessonId: string;
  lessonTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  totalTimeMs: number;
  topics: string[];
}

export interface DailyGoalReachedEvent {
  goalType: 'questions' | 'time' | 'lessons';
  goalValue: number;
  actualValue: number;
  date: string;
}

export interface StreakMaintainedEvent {
  currentStreak: number;
  longestStreak: number;
  date: string;
}

export interface AchievementEarnedEvent {
  achievementId: string;
  achievementName: string;
  achievementType: string;
  date: string;
}

export interface SearchPerformedEvent {
  query: string;
  resultsCount: number;
  filters?: Record<string, unknown>;
}

export interface FilterAppliedEvent {
  filterType: string;
  filterValue: unknown;
  context: 'search' | 'browse' | 'practice';
}

export interface PracticeSessionEvent {
  sessionId: string;
  topics: string[];
  difficulty: number;
  questionCount: number;
  duration: number;
  accuracy: number;
}

export interface MockTestEvent {
  testId: string;
  jurisdiction: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeUsedMs: number;
  passed: boolean;
}

// ============================================================================
// Analytics Tracker Class
// ============================================================================

class AnalyticsTracker {
  private userId: string | null = null;
  private sessionId: string | null = null;
  private enabled: boolean = true;

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a generic event
   */
  private track(event: AnalyticsEvent) {
    if (!this.enabled) return;

    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
      userId: event.userId || this.userId,
      sessionId: event.sessionId || this.sessionId,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', enrichedEvent.name, enrichedEvent.properties);
    }

    // Send to analytics service
    // In a real implementation, this would call the analytics API
    // For now, we'll just store it in sessionStorage for demonstration
    try {
      const events = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
      events.push(enrichedEvent);
      sessionStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('[Analytics] Failed to store event:', error);
    }
  }

  // ============================================================================
  // Lesson Events
  // ============================================================================

  trackLessonStarted(data: LessonStartedEvent) {
    this.track({
      name: 'lesson_started',
      properties: data,
    });
  }

  trackQuestionAnswered(data: QuestionAnsweredEvent) {
    this.track({
      name: 'question_answered',
      properties: data,
    });
  }

  trackLessonCompleted(data: LessonCompletedEvent) {
    this.track({
      name: 'lesson_completed',
      properties: data,
    });
  }

  // ============================================================================
  // Progress Events
  // ============================================================================

  trackDailyGoalReached(data: DailyGoalReachedEvent) {
    this.track({
      name: 'daily_goal_reached',
      properties: data,
    });
  }

  trackStreakMaintained(data: StreakMaintainedEvent) {
    this.track({
      name: 'streak_maintained',
      properties: data,
    });
  }

  trackAchievementEarned(data: AchievementEarnedEvent) {
    this.track({
      name: 'achievement_earned',
      properties: data,
    });
  }

  // ============================================================================
  // Search and Discovery Events
  // ============================================================================

  trackSearchPerformed(data: SearchPerformedEvent) {
    this.track({
      name: 'search_performed',
      properties: data,
    });
  }

  trackFilterApplied(data: FilterAppliedEvent) {
    this.track({
      name: 'filter_applied',
      properties: data,
    });
  }

  // ============================================================================
  // Practice and Test Events
  // ============================================================================

  trackPracticeSessionStarted(topics: string[], difficulty: number) {
    this.track({
      name: 'practice_session_started',
      properties: { topics, difficulty },
    });
  }

  trackPracticeSessionCompleted(data: PracticeSessionEvent) {
    this.track({
      name: 'practice_session_completed',
      properties: data,
    });
  }

  trackMockTestStarted(jurisdiction: string) {
    this.track({
      name: 'mock_test_started',
      properties: { jurisdiction },
    });
  }

  trackMockTestCompleted(data: MockTestEvent) {
    this.track({
      name: 'mock_test_completed',
      properties: data,
    });
  }

  // ============================================================================
  // Navigation Events
  // ============================================================================

  trackPageView(path: string, title: string) {
    this.track({
      name: 'page_view',
      properties: { path, title },
    });
  }

  trackNavigationClick(destination: string, source: string) {
    this.track({
      name: 'navigation_click',
      properties: { destination, source },
    });
  }

  // ============================================================================
  // Engagement Events
  // ============================================================================

  trackFeatureUsed(featureName: string, context?: Record<string, unknown>) {
    this.track({
      name: 'feature_used',
      properties: { featureName, ...context },
    });
  }

  trackButtonClick(buttonName: string, context?: Record<string, unknown>) {
    this.track({
      name: 'button_click',
      properties: { buttonName, ...context },
    });
  }

  // ============================================================================
  // Error Events
  // ============================================================================

  trackError(errorType: string, errorMessage: string, context?: Record<string, unknown>) {
    this.track({
      name: 'error_occurred',
      properties: { errorType, errorMessage, ...context },
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analytics = new AnalyticsTracker();

// ============================================================================
// Convenience Functions
// ============================================================================

export function initializeAnalytics(userId: string | null) {
  analytics.setUserId(userId);
}

export function enableAnalytics() {
  analytics.setEnabled(true);
}

export function disableAnalytics() {
  analytics.setEnabled(false);
}
