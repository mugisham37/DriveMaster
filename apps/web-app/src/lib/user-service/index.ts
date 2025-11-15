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

// Error Handler
export {
  EnhancedUserServiceErrorHandler,
  enhancedUserServiceErrorHandler,
  EnhancedErrorClassifier,
  ErrorContextManager,
  ErrorRecoveryStrategies,
  createEnhancedErrorHandler,
  isRecoverableError,
  getErrorSeverity,
  shouldNotifyUser,
} from './error-handler';

// Graceful Degradation
export {
  GracefulDegradationManager,
  gracefulDegradationManager,
  CachedDataManager,
  FallbackDataProvider,
  useGracefulDegradation,
  type DegradationConfig,
  type DegradationState,
} from './graceful-degradation';

// Offline Support
export {
  OfflineManager,
  offlineManager,
  OfflineStorageManager,
  ConflictResolver,
  OfflineIndicator,
  useOfflineManager,
  type OfflineConfig,
  type OfflineState,
  type QueuedOperation,
  type ConflictResolution,
  type SyncResult,
  type OfflineIndicatorProps,
} from './offline-support';

// Unified Client
export {
  UserServiceClient,
  userServiceClient,
  createUserServiceClient,
  createMockUserServiceClient,
  type UserServiceClientConfig,
  type ConnectionPoolConfig,
  type ClientMetrics,
  type ProgressUpdateData,
  type ActivityUpdateData,
} from './unified-client';

// Circuit Breaker (from error-handler dependencies)
export { UserServiceErrorHandler, ErrorClassifier } from './circuit-breaker';

// Monitoring (if exists)
export * from './monitoring';
