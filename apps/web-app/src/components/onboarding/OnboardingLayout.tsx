/**
 * Onboarding Layout Component
 * 
 * Template for the multi-step onboarding wizard
 * Requirements: 2.2, 2.3
 */

"use client";

import React from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const {
    stepIndex,
    totalSteps,
    canProceed,
    isSaving,
    error,
    previousStep,
    nextStep,
    currentStep,
  } = useOnboarding();

  const progressPercentage = ((stepIndex + 1) / totalSteps) * 100;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {stepIndex + 1} of {totalSteps}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
          {children}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={isFirstStep || isSaving}
            className="min-w-[100px]"
          >
            Back
          </Button>

          <Button
            onClick={nextStep}
            disabled={!canProceed || isSaving}
            className="min-w-[100px]"
          >
            {isSaving ? "Saving..." : isLastStep ? "Complete" : "Next"}
          </Button>
        </div>

        {/* Skip Option for Optional Steps */}
        {(currentStep === 'learning-preferences') && !isLastStep && (
          <div className="text-center mt-4">
            <button
              onClick={nextStep}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
              disabled={isSaving}
            >
              I'll set this later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
