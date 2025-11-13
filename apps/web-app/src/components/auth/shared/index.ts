/**
 * Shared Authentication Components
 * Exports all reusable authentication UI components
 */

export { PasswordStrengthIndicator, usePasswordStrength } from "./PasswordStrengthIndicator";
export {
  ButtonSpinner,
  PageSpinner,
  FormSkeleton,
  ProfileSkeleton,
  SessionListSkeleton,
  OAuthButtonsSkeleton,
  InlineLoader,
  LoadingOverlay,
  InputSkeleton,
  useLoadingState,
} from "./LoadingState";
export { EmailVerificationBanner } from "./EmailVerificationBanner";

// Error Recovery and Resilience Components (Task 12)
export { RetryButton } from "./RetryButton";
export { OfflineModeIndicator, useOfflineMode } from "./OfflineModeIndicator";
export { SessionTimeoutWarning, useSessionTimeout } from "./SessionTimeoutWarning";
export { AuthErrorBoundary, withAuthErrorBoundary } from "./AuthErrorBoundary";
export { ResilientAuthWrapper, withResilientAuth } from "./ResilientAuthWrapper";

// Accessibility Components and Utilities (Task 14)
export {
  useAutoFocusFirstInput,
  useFocusFirstError,
  useRouteFocusManagement,
  useFocusTrap,
  useSkipToContent,
  useAnnounce,
} from "./useFocusManagement";
export { ColorContrastChecker } from "./ColorContrastChecker";

// Polish and UX Components (Task 18)
export {
  SuccessCheckmark,
  InlineSuccessIndicator,
  SuccessMessage,
  SuccessOverlay,
  useSuccessAnimation,
} from "./SuccessAnimations";
export {
  EmptyState,
  NoSessionsEmptyState,
  NoLinkedProvidersEmptyState,
  NoNotificationsEmptyState,
  NoSecurityEventsEmptyState,
  WelcomeEmptyState,
  ErrorEmptyState,
} from "./EmptyStates";
export {
  ConfirmationDialog,
  RevokeSessionDialog,
  RevokeAllSessionsDialog,
  UnlinkProviderDialog,
  DeleteAccountDialog,
  useConfirmationDialog,
} from "./ConfirmationDialogs";
export {
  ValidationFeedback,
  InlineValidationIndicator,
  FieldRequirements,
  CharacterCounter,
  FormErrorSummary,
  useDebouncedValidation,
} from "./FormValidationFeedback";
export {
  OnboardingHint,
  TooltipHint,
  WhatsThisLink,
  FeatureIntro,
  useDismissibleHint,
  AuthHints,
} from "./OnboardingHints";
