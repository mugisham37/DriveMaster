'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreferenceToggle } from '../molecules/PreferenceToggle';
import { PreferencesData } from '@/types/user-service';

export interface LearningPreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function LearningPreferences({
  preferences,
  onPreferenceChange,
}: LearningPreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <Select
            value={preferences.learning.difficulty}
            onValueChange={(value: string) => onPreferenceChange({
              learning: { ...preferences.learning, difficulty: value as 'beginner' | 'intermediate' | 'advanced' }
            })}
          >
            <SelectTrigger id="difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Set your preferred difficulty level for learning content
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pace">Learning Pace</Label>
          <Select
            value={preferences.learning.pace}
            onValueChange={(value: string) => onPreferenceChange({
              learning: { ...preferences.learning, pace: value as 'slow' | 'normal' | 'fast' }
            })}
          >
            <SelectTrigger id="pace">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Relaxed</SelectItem>
              <SelectItem value="normal">Moderate</SelectItem>
              <SelectItem value="fast">Intensive</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose how quickly you want to progress through content
          </p>
        </div>

        <PreferenceToggle
          label="Study Reminders"
          description="Receive reminders to maintain your learning streak"
          value={preferences.learning.reminders}
          onChange={(value) => onPreferenceChange({
            learning: { ...preferences.learning, reminders: value }
          })}
        />
      </div>
    </div>
  );
}
