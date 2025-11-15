'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreferencesData } from '@/types/user-service';

export interface AppearancePreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function AppearancePreferences({
  preferences,
  onPreferenceChange,
}: AppearancePreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={preferences.theme}
            onValueChange={(value: string) => onPreferenceChange({ theme: value as 'light' | 'dark' | 'system' })}
          >
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color theme
          </p>
        </div>
      </div>
    </div>
  );
}
