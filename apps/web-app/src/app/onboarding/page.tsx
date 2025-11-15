/**
 * Onboarding Page
 * 
 * Multi-step onboarding wizard for new users
 * Requirements: 2.1, 2.7, 2.8, 2.9
 */

"use client";

import React from "react";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import {
  WelcomeStep,
  TimezoneLanguageStep,
  LearningPreferencesStep,
  PrivacyNotificationsStep,
  ReviewStep,
} from "@/components/onboarding";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Onboarding Content Component
 * Renders the appropriate step based on current state
 */
function OnboardingContent() {
  const { currentStep } = useOnboarding();

  switch (currentStep) {
    case 'welcome':
      return <WelcomeStep />;
    case 'timezone-language':
      return <TimezoneLanguageStep />;
    case 'learning-preferences':
      return <LearningPreferencesStep />;
    case 'privacy-notifications':
      return <PrivacyNotificationsStep />;
    case 'review':
      return <ReviewStep />;
    default:
      return <WelcomeStep />;
  }
}

/**
 * Onboarding Page Component
 * Protected route - requires authentication
 */
function OnboardingPageContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin?redirect=/onboarding');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <OnboardingLayout>
      <OnboardingContent />
    </OnboardingLayout>
  );
}

/**
 * Main Onboarding Page
 * Wraps content with OnboardingProvider
 */
export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingPageContent />
    </OnboardingProvider>
  );
}
