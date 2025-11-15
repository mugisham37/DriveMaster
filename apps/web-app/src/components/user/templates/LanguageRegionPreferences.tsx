'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreferencesData } from '@/types/user-service';

export interface LanguageRegionPreferencesProps {
  preferences: PreferencesData;
  onPreferenceChange: (updates: Partial<PreferencesData>) => Promise<void>;
}

export function LanguageRegionPreferences({
  preferences,
  onPreferenceChange,
}: LanguageRegionPreferencesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={preferences.language}
            onValueChange={(value: string) => onPreferenceChange({ language: value })}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose your preferred language for the interface
          </p>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Note: Timezone and date/number format settings are managed in your profile settings.
        </p>
      </div>
    </div>
  );
}
