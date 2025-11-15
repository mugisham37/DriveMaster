/**
 * User Service Library - Main Export
 * 
 * Centralized exports for all user service utilities, configurations, and helpers
 */

// Loading States
export {
  LOADING_DELAYS,
  SKELETON_ANIMATION,
  TRANSITION_DURATIONS,
  getSkeletonCount,
  useDelayedLoading,
} from './loading-states';

// Success Feedback
export {
  SUCCESS_MESSAGES,
  CELEBRATION_TRIGGERS,
  showSuccessToast,
  showCelebrationToast,
  showProgressToast,
  showStreakToast,
  showMilestoneToast,
  showLevelUpToast,
  showAutoSaveToast,
} from './success-feedback';

// Error Messages
export {
  ERROR_MESSAGES,
  RECOVERY_ACTIONS,
  showErrorToast,
  showNetworkError,
  showAuthError,
  showValidationError,
  showServerError,
  showOfflineError,
  showRateLimitError,
  getUserFriendlyErrorMessage,
  getRecoveryAction,
} from './error-messages';

// Integration Testing
export {
  TEST_SCENARIOS,
  INTEGRATION_CHECKLIST,
  TEST_DATA,
  PERFORMANCE_BENCHMARKS,
  ACCESSIBILITY_REQUIREMENTS,
} from './integration-testing';

// Monitoring (if exists)
export * from './monitoring';

// Cache (if exists)
export * from './user-service-cache';
