'use client';

import React from 'react';
import { PreferenceToggle } from '../molecules/PreferenceToggle';
import { PreferencesData } from '@/types/user-service';

export interface NotificationPreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function NotificationPreferences({
  preferences,
  onPreferenceChange,
}: NotificationPreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Notification Channels</h3>
        <PreferenceToggle
          label="Email Notifications"
          description="Receive notifications via email"
          value={preferences.notifications.email}
          onChange={(value) => onPreferenceChange({
            notifications: { ...preferences.notifications, email: value }
          })}
        />
        <PreferenceToggle
          label="Push Notifications"
          description="Receive browser push notifications"
          value={preferences.notifications.push}
          onChange={(value) => onPreferenceChange({
            notifications: { ...preferences.notifications, push: value }
          })}
        />
        <PreferenceToggle
          label="In-App Notifications"
          description="Show notifications within the app"
          value={preferences.notifications.inApp}
          onChange={(value) => onPreferenceChange({
            notifications: { ...preferences.notifications, inApp: value }
          })}
        />

        <h3 className="mt-6 text-sm font-medium">Notification Types</h3>
        <PreferenceToggle
          label="Reminder Notifications"
          description="Receive study reminders"
          value={preferences.notifications.reminders}
          onChange={(value) => onPreferenceChange({
            notifications: { ...preferences.notifications, reminders: value }
          })}
        />
        <PreferenceToggle
          label="Marketing Communications"
          description="Receive updates about new features and offers"
          value={preferences.notifications.marketing}
          onChange={(value) => onPreferenceChange({
            notifications: { ...preferences.notifications, marketing: value }
          })}
        />
      </div>
    </div>
  );
}
