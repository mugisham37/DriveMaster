/**
 * Privacy & Notifications Step Component
 * 
 * Fourth step - privacy settings, notifications, and GDPR consent
 * Requirements: 2.5
 */

"use client";

import React from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Bell, Mail, Smartphone, MessageSquare, Award, Clock, Lightbulb } from "lucide-react";
import Link from "next/link";

export function PrivacyNotificationsStep() {
  const { formData, setFormData } = useOnboarding();

  const privacy = formData.privacySettings || {
    profileVisibility: 'private',
    activityTracking: true,
    dataSharing: false,
    analytics: true,
  };

  const notifications = formData.notificationSettings || {
    email: true,
    push: false,
    inApp: true,
    marketing: false,
    achievements: true,
    reminders: true,
    recommendations: true,
  };

  const gdprConsent = formData.gdprConsent || false;

  const setPrivacy = (key: string, value: unknown) => {
    setFormData({
      privacySettings: {
        ...privacy,
        [key]: value,
      },
    });
  };

  const setNotification = (key: string, value: unknown) => {
    setFormData({
      notificationSettings: {
        ...notifications,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Privacy & Notifications
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Control your data and how we communicate with you
        </p>
      </div>

      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Privacy Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="activityTracking" className="font-medium">
                  Activity Tracking
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your learning progress and patterns
                </p>
              </div>
              <Switch
                id="activityTracking"
                checked={privacy.activityTracking ?? false}
                onCheckedChange={(checked) => setPrivacy('activityTracking', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="analytics" className="font-medium">
                  Analytics
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Help us improve the platform with anonymous usage data
                </p>
              </div>
              <Switch
                id="analytics"
                checked={privacy.analytics ?? false}
                onCheckedChange={(checked) => setPrivacy('analytics', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="dataSharing" className="font-medium">
                  Data Sharing
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Share anonymized data with educational partners
                </p>
              </div>
              <Switch
                id="dataSharing"
                checked={privacy.dataSharing ?? false}
                onCheckedChange={(checked) => setPrivacy('dataSharing', checked)}
              />
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="emailNotif" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive updates via email
                  </p>
                </div>
              </div>
              <Switch
                id="emailNotif"
                checked={notifications.email ?? false}
                onCheckedChange={(checked) => setNotification('email', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="pushNotif" className="font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive push notifications on your device
                  </p>
                </div>
              </div>
              <Switch
                id="pushNotif"
                checked={notifications.push ?? false}
                onCheckedChange={(checked) => setNotification('push', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <Label htmlFor="inAppNotif" className="font-medium">
                    In-App Notifications
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See notifications while using the app
                  </p>
                </div>
              </div>
              <Switch
                id="inAppNotif"
                checked={notifications.inApp ?? false}
                onCheckedChange={(checked) => setNotification('inApp', checked)}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Types</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <Label htmlFor="achievements" className="font-medium">
                  Achievements & Milestones
                </Label>
              </div>
              <Switch
                id="achievements"
                checked={notifications.achievements ?? false}
                onCheckedChange={(checked) => setNotification('achievements', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <Label htmlFor="reminders" className="font-medium">
                  Study Reminders
                </Label>
              </div>
              <Switch
                id="reminders"
                checked={notifications.reminders ?? false}
                onCheckedChange={(checked) => setNotification('reminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <Label htmlFor="recommendations" className="font-medium">
                  Personalized Recommendations
                </Label>
              </div>
              <Switch
                id="recommendations"
                checked={notifications.recommendations ?? false}
                onCheckedChange={(checked) => setNotification('recommendations', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="marketing" className="font-medium">
                  Marketing & Updates
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  News, tips, and special offers (optional)
                </p>
              </div>
              <Switch
                id="marketing"
                checked={notifications.marketing ?? false}
                onCheckedChange={(checked) => setNotification('marketing', checked)}
              />
            </div>
          </div>
        </div>

        {/* GDPR Consent (Required) */}
        <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg font-semibold mb-4">Required Consent</h3>
          
          <div className="flex items-start gap-3">
            <Checkbox
              id="gdprConsent"
              checked={gdprConsent}
              onCheckedChange={(checked) => setFormData({ gdprConsent: checked as boolean })}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="gdprConsent" className="font-medium cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                By checking this box, you consent to the collection and processing of your personal data 
                as described in our{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                  Privacy Policy
                </Link>
                . You can withdraw your consent at any time.
              </p>
            </div>
          </div>

          {!gdprConsent && (
            <p className="text-sm text-red-500 mt-2">
              You must accept the Terms of Service and Privacy Policy to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
