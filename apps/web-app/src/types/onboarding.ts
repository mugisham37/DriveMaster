/**
 * Onboarding Type Definitions
 * 
 * Types for the multi-step onboarding flow
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

export type OnboardingStep = 
  | 'welcome'
  | 'timezone-language'
  | 'learning-preferences'
  | 'privacy-notifications'
  | 'review';

export interface OnboardingFormData {
  // Step 2: Timezone & Language
  timezone?: string;
  language?: string;
  countryCode?: string;

  // Step 3: Learning Preferences
  learningPreferences?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    pace?: 'slow' | 'normal' | 'fast';
    dailyGoalMinutes?: number;
    weeklyGoalMinutes?: number;
    reminders?: boolean;
  };

  // Step 4: Privacy & Notifications
  privacySettings?: {
    profileVisibility?: 'public' | 'private' | 'friends';
    activityTracking?: boolean;
    dataSharing?: boolean;
    analytics?: boolean;
  };

  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    marketing?: boolean;
    achievements?: boolean;
    reminders?: boolean;
    recommendations?: boolean;
  };

  // GDPR Consent (required)
  gdprConsent?: boolean;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  formData: OnboardingFormData;
  isValid: boolean;
  canProceed: boolean;
  isSaving: boolean;
  error: Error | null;
}

export interface OnboardingContextValue extends OnboardingState {
  setFormData: (data: Partial<OnboardingFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  validateCurrentStep: () => boolean;
  submitOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}
