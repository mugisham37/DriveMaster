/**
 * Review Step Component
 * 
 * Final step - review all selections before submission
 * Requirements: 2.5
 */

"use client";

import React, { useEffect } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/user/atoms/ProgressRing";
import { CheckCircle2, Edit } from "lucide-react";

export function ReviewStep() {
  const { formData, goToStep, submitOnboarding, isSaving } = useOnboarding();

  // Calculate profile completeness
  const calculateCompleteness = (): number => {
    let completeness = 10; // Email (always present)

    if (formData.timezone) completeness += 15;
    if (formData.language) completeness += 15;
    if (formData.countryCode) completeness += 10;
    if (formData.gdprConsent) completeness += 30;
    if (formData.learningPreferences?.difficulty) completeness += 5;
    if (formData.learningPreferences?.pace) completeness += 5;
    if (formData.privacySettings) completeness += 5;
    if (formData.notificationSettings) completeness += 5;

    return Math.min(100, completeness);
  };

  const completeness = calculateCompleteness();

  // Trigger submission when user clicks "Complete" in layout
  useEffect(() => {
    // This component is passive - submission is handled by OnboardingLayout
  }, []);

  const handleComplete = () => {
    submitOnboarding();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Review Your Choices
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Everything looks good? Let's get started!
        </p>

        {/* Profile Completeness */}
        <div className="flex justify-center">
          <div className="text-center">
            <ProgressRing
              value={completeness}
              size={120}
              strokeWidth={8}
              showLabel
              label={`${completeness}%`}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Profile Completeness
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Location & Language */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Location & Language
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep('timezone-language')}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Timezone:</strong> {formData.timezone || 'Not set'}</p>
            <p><strong>Language:</strong> {formData.language?.toUpperCase() || 'Not set'}</p>
            <p><strong>Country:</strong> {formData.countryCode || 'Not set'}</p>
          </div>
        </div>

        {/* Learning Preferences */}
        {formData.learningPreferences && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Learning Preferences
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep('learning-preferences')}
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <strong>Difficulty:</strong>{' '}
                {formData.learningPreferences.difficulty
                  ? formData.learningPreferences.difficulty.charAt(0).toUpperCase() +
                    formData.learningPreferences.difficulty.slice(1)
                  : 'Not set'}
              </p>
              <p>
                <strong>Pace:</strong>{' '}
                {formData.learningPreferences.pace
                  ? formData.learningPreferences.pace.charAt(0).toUpperCase() +
                    formData.learningPreferences.pace.slice(1)
                  : 'Not set'}
              </p>
              {formData.learningPreferences.dailyGoalMinutes && (
                <p>
                  <strong>Daily Goal:</strong> {formData.learningPreferences.dailyGoalMinutes} minutes
                </p>
              )}
              <p>
                <strong>Reminders:</strong>{' '}
                {formData.learningPreferences.reminders ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        )}

        {/* Privacy & Notifications */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Privacy & Notifications
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep('privacy-notifications')}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Privacy:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Activity Tracking: {formData.privacySettings?.activityTracking ? 'On' : 'Off'}</li>
                <li>Analytics: {formData.privacySettings?.analytics ? 'On' : 'Off'}</li>
                <li>Data Sharing: {formData.privacySettings?.dataSharing ? 'On' : 'Off'}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Notifications:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Email: {formData.notificationSettings?.email ? 'On' : 'Off'}</li>
                <li>Push: {formData.notificationSettings?.push ? 'On' : 'Off'}</li>
                <li>In-App: {formData.notificationSettings?.inApp ? 'On' : 'Off'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* GDPR Consent */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="font-semibold text-green-700 dark:text-green-300">
              Terms & Privacy Policy Accepted
            </p>
          </div>
        </div>
      </div>

      {/* Complete Button */}
      <div className="text-center pt-4">
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={isSaving || !formData.gdprConsent}
          className="min-w-[200px]"
        >
          {isSaving ? 'Saving...' : 'Complete Setup'}
        </Button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          You can change these settings anytime in your profile
        </p>
      </div>
    </div>
  );
}
