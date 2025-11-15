'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreferenceToggle } from '../molecules/PreferenceToggle';
import { PreferencesData } from '@/types/user-service';

export interface PrivacyPreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function PrivacyPreferences({
  preferences,
  onPreferenceChange,
}: PrivacyPreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-visibility">Profile Visibility</Label>
          <Select
            value={preferences.privacy.profileVisibility}
            onValueChange={(value: string) => onPreferenceChange({
              privacy: { ...preferences.privacy, profileVisibility: value as 'public' | 'private' | 'friends' }
            })}
          >
            <SelectTrigger id="profile-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="friends">Friends Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Control who can view your profile and learning progress
          </p>
        </div>

        <PreferenceToggle
          label="Activity Tracking"
          description="Allow tracking of your learning activities"
          value={preferences.privacy.activityTracking}
          onChange={(value) => onPreferenceChange({
            privacy: { ...preferences.privacy, activityTracking: value }
          })}
          helpText="Required for progress tracking and recommendations"
        />
        <PreferenceToggle
          label="Data Sharing"
          description="Share anonymized data to improve the platform"
          value={preferences.privacy.dataSharing}
          onChange={(value) => onPreferenceChange({
            privacy: { ...preferences.privacy, dataSharing: value }
          })}
        />
        <PreferenceToggle
          label="Analytics"
          description="Allow analytics to help us improve your experience"
          value={preferences.privacy.analytics}
          onChange={(value) => onPreferenceChange({
            privacy: { ...preferences.privacy, analytics: value }
          })}
        />
      </div>
    </div>
  );
}
