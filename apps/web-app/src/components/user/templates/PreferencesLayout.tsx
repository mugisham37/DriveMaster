'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserService';
import { PreferencesData } from '@/types/user-service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, Check } from 'lucide-react';
import { AppearancePreferences } from './AppearancePreferences';
import { NotificationPreferences } from './NotificationPreferences';
import { LearningPreferences } from './LearningPreferences';
import { PrivacyPreferences } from './PrivacyPreferences';
import { AccessibilityPreferences } from './AccessibilityPreferences';
import { LanguageRegionPreferences } from './LanguageRegionPreferences';

export type PreferenceCategory = 
  | 'appearance' 
  | 'notifications' 
  | 'learning' 
  | 'privacy' 
  | 'accessibility' 
  | 'language';

export interface PreferencesLayoutProps {
  userId?: string;
  category?: PreferenceCategory;
  onCategoryChange?: (category: PreferenceCategory) => void;
  className?: string;
}

export function PreferencesLayout({
  userId,
  category = 'appearance',
  onCategoryChange,
  className,
}: PreferencesLayoutProps) {
  const { data: preferences, isLoading, error: _error } = useUserPreferences(userId || '');
  const updatePreferences = useUpdateUserPreferences();
  const [activeCategory, setActiveCategory] = useState<PreferenceCategory>(category);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  const handleCategoryChange = (newCategory: string) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirm) return;
    }
    setActiveCategory(newCategory as PreferenceCategory);
    setHasUnsavedChanges(false);
    onCategoryChange?.(newCategory as PreferenceCategory);
  };

  const handlePreferenceChange = async (updates: Partial<PreferencesData>) => {
    if (!preferences) return;

    setSaveStatus('saving');
    setHasUnsavedChanges(true);

    try {
      await updatePreferences.mutateAsync({
        userId,
        preferences: { ...preferences.preferences, ...updates },
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      toast.success('Preferences updated successfully');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to update preferences. Please try again.');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleResetToDefaults = async () => {
    const confirm = window.confirm(
      'Are you sure you want to reset all preferences in this category to defaults?'
    );
    if (!confirm) return;

    const defaults = getDefaultPreferences(activeCategory);
    await handlePreferenceChange(defaults);
  };

  if (isLoading) {
    return <PreferencesLayoutSkeleton className={className} />;
  }

  if (_error || !preferences) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <p className="text-sm text-destructive">
          Failed to load preferences. Please try again.
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Customize your learning experience and privacy settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-muted-foreground">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-destructive">Error saving</span>
          )}
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="appearance" className="rounded-none">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="learning" className="rounded-none">
            Learning
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-none">
            Privacy
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="rounded-none">
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="language" className="rounded-none">
            Language & Region
          </TabsTrigger>
        </TabsList>

        <div className="p-6">
          <TabsContent value="appearance" className="mt-0">
            <AppearancePreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationPreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <TabsContent value="learning" className="mt-0">
            <LearningPreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <TabsContent value="privacy" className="mt-0">
            <PrivacyPreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <TabsContent value="accessibility" className="mt-0">
            <AccessibilityPreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <TabsContent value="language" className="mt-0">
            <LanguageRegionPreferences
              preferences={preferences.preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </TabsContent>

          <div className="mt-6 flex justify-end border-t pt-4">
            <Button 
              variant="outline" 
              onClick={handleResetToDefaults}
              disabled={saveStatus === 'saving'}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function PreferencesLayoutSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="border-b p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function getDefaultPreferences(category: PreferenceCategory): Partial<PreferencesData> {
  switch (category) {
    case 'appearance':
      return { theme: 'system' };
    case 'notifications':
      return {
        notifications: {
          email: true,
          push: true,
          inApp: true,
          marketing: false,
          reminders: true,
        },
      };
    case 'learning':
      return {
        learning: {
          difficulty: 'intermediate',
          pace: 'normal',
          reminders: true,
          streakNotifications: true,
        },
      };
    case 'privacy':
      return {
        privacy: {
          profileVisibility: 'public',
          activityTracking: true,
          dataSharing: false,
          analytics: true,
        },
      };
    case 'accessibility':
      return {
        accessibility: {
          highContrast: false,
          largeText: false,
          reducedMotion: false,
          screenReader: false,
        },
      };
    case 'language':
      return { 
        language: 'en',
      };
    default:
      return {};
  }
}
