/**
 * Onboarding Context
 * 
 * Manages state for the multi-step onboarding flow
 * Requirements: 2.7
 */

"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userServiceClient } from "@/lib/user-service";
import type { 
  OnboardingContextValue, 
  OnboardingFormData, 
  OnboardingStep,
  OnboardingState 
} from "@/types/onboarding";

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const STEPS: OnboardingStep[] = [
  'welcome',
  'timezone-language',
  'learning-preferences',
  'privacy-notifications',
  'review',
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 'welcome',
    stepIndex: 0,
    totalSteps: STEPS.length,
    formData: {
      // Initialize with browser defaults
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language.split('-')[0] || 'en',
    },
    isValid: true,
    canProceed: true,
    isSaving: false,
    error: null,
  });

  /**
   * Update form data
   */
  const setFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data,
      },
    }));
  }, []);

  /**
   * Validate current step
   */
  const validateCurrentStep = useCallback((): boolean => {
    const { currentStep, formData } = state;

    switch (currentStep) {
      case 'welcome':
        return true; // No validation needed

      case 'timezone-language':
        return !!(
          formData.timezone &&
          formData.language &&
          formData.countryCode
        );

      case 'learning-preferences':
        // Optional step - always valid
        return true;

      case 'privacy-notifications':
        // GDPR consent is required
        return !!formData.gdprConsent;

      case 'review':
        return true; // Review step is always valid

      default:
        return false;
    }
  }, [state]);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    if (!validateCurrentStep()) {
      setState(prev => ({
        ...prev,
        isValid: false,
        canProceed: false,
      }));
      return;
    }

    setState(prev => {
      const nextIndex = Math.min(prev.stepIndex + 1, STEPS.length - 1);
      return {
        ...prev,
        stepIndex: nextIndex,
        currentStep: STEPS[nextIndex],
        isValid: true,
        canProceed: true,
      };
    });
  }, [validateCurrentStep]);

  /**
   * Navigate to previous step
   */
  const previousStep = useCallback(() => {
    setState(prev => {
      const prevIndex = Math.max(prev.stepIndex - 1, 0);
      return {
        ...prev,
        stepIndex: prevIndex,
        currentStep: STEPS[prevIndex],
        isValid: true,
        canProceed: true,
        error: null,
      };
    });
  }, []);

  /**
   * Navigate to specific step
   */
  const goToStep = useCallback((step: OnboardingStep) => {
    const stepIndex = STEPS.indexOf(step);
    if (stepIndex === -1) return;

    setState(prev => ({
      ...prev,
      stepIndex,
      currentStep: step,
      isValid: true,
      canProceed: true,
    }));
  }, []);

  /**
   * Submit onboarding data
   */
  const submitOnboarding = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({
        ...prev,
        error: new Error("User not authenticated"),
      }));
      return;
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const userId = user.id.toString();
      const { formData } = state;

      // Update user profile
      // Note: countryCode is stored in formData but not sent to backend yet
      // as it's not part of UserUpdateRequest interface
      await userServiceClient.updateUser(userId, {
        timezone: formData.timezone,
        language: formData.language,
        gdprConsent: formData.gdprConsent || false,
        version: 1, // Required field
      });

      // Update preferences
      await userServiceClient.updatePreferences(userId, {
        theme: 'system',
        language: formData.language || 'en',
        notifications: {
          email: formData.notificationSettings?.email ?? true,
          push: formData.notificationSettings?.push ?? false,
          inApp: formData.notificationSettings?.inApp ?? true,
          marketing: formData.notificationSettings?.marketing ?? false,
          reminders: formData.notificationSettings?.reminders ?? true,
        },
        privacy: {
          profileVisibility: formData.privacySettings?.profileVisibility || 'private',
          activityTracking: formData.privacySettings?.activityTracking ?? true,
          dataSharing: formData.privacySettings?.dataSharing ?? false,
          analytics: formData.privacySettings?.analytics ?? true,
        },
        learning: {
          difficulty: formData.learningPreferences?.difficulty || 'beginner',
          pace: formData.learningPreferences?.pace || 'normal',
          reminders: formData.learningPreferences?.reminders ?? true,
          streakNotifications: true,
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          reducedMotion: false,
          screenReader: false,
        },
      });

      setState(prev => ({ ...prev, isSaving: false }));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error("Onboarding submission error:", error);
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error : new Error("Failed to save onboarding data"),
      }));
    }
  }, [user, state, router]);

  /**
   * Reset onboarding state
   */
  const resetOnboarding = useCallback(() => {
    setState({
      currentStep: 'welcome',
      stepIndex: 0,
      totalSteps: STEPS.length,
      formData: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language.split('-')[0] || 'en',
      },
      isValid: true,
      canProceed: true,
      isSaving: false,
      error: null,
    });
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...state,
      setFormData,
      nextStep,
      previousStep,
      goToStep,
      validateCurrentStep,
      submitOnboarding,
      resetOnboarding,
    }),
    [state, setFormData, nextStep, previousStep, goToStep, validateCurrentStep, submitOnboarding, resetOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

/**
 * Hook to access onboarding context
 */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
