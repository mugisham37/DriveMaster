'use client';

import React from 'react';
import { PreferenceToggle } from '../molecules/PreferenceToggle';
import { PreferencesData } from '@/types/user-service';

export interface AccessibilityPreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function AccessibilityPreferences({
  preferences,
  onPreferenceChange,
}: AccessibilityPreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PreferenceToggle
          label="High Contrast Mode"
          description="Increase contrast for better visibility"
          value={preferences.accessibility.highContrast}
          onChange={(value) => onPreferenceChange({
            accessibility: { ...preferences.accessibility, highContrast: value }
          })}
          helpText="Enhances text and UI element contrast"
        />
        <PreferenceToggle
          label="Large Text"
          description="Increase text size throughout the app"
          value={preferences.accessibility.largeText}
          onChange={(value) => onPreferenceChange({
            accessibility: { ...preferences.accessibility, largeText: value }
          })}
          helpText="Makes all text larger for easier reading"
        />
        <PreferenceToggle
          label="Reduced Motion"
          description="Minimize animations and transitions"
          value={preferences.accessibility.reducedMotion}
          onChange={(value) => onPreferenceChange({
            accessibility: { ...preferences.accessibility, reducedMotion: value }
          })}
          helpText="Reduces motion effects for users sensitive to animation"
        />
        <PreferenceToggle
          label="Screen Reader Optimization"
          description="Optimize interface for screen readers"
          value={preferences.accessibility.screenReader}
          onChange={(value) => onPreferenceChange({
            accessibility: { ...preferences.accessibility, screenReader: value }
          })}
          helpText="Enhances compatibility with assistive technologies"
        />
      </div>
    </div>
  );
}
