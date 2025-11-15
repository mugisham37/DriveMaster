'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PreferenceToggle } from '../molecules/PreferenceToggle';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserService';
import type { PreferencesData } from '@/types/user-service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, Check } from 'lucide-react';

export type PreferenceCategory = 
  | 'appearance' 
  | 'notifications' 
  | 'learning' 
  | 'privacy' 
  | 'accessibility' 
  | 'language';

export interface PreferencesPanelProps {
  userId?: string;
  category?: PreferenceCategory;
  onCategoryChange?: (category: PreferenceCategory) => void;
  className?: string;
}

export function PreferencesPanel({
  userId,
  category = 'appearance',
  onCategoryChange,
  className,
}: PreferencesPanelProps) {
  const { data: preferences, isLoading } = useUserPreferences(userId || '');
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
    if (!preferences || !userId) return;

    setSaveStatus('saving');
    setHasUnsavedChanges(true);

    try {
      await updatePreferences.mutateAsync({
        userId,
        preferences: { ...preferences.preferences, ...updates },
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      toast.success('Preferences updated');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setSaveStatus('error');
      toast.error('Failed to update preferences');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleResetToDefaults = async () => {
    const confirmReset = window.confirm('Are you sure you want to reset all preferences in this category to defaults?');
    if (!confirmReset) return;

    const defaults = getDefaultPreferences(activeCategory);
    await handlePreferenceChange(defaults);
  };

  if (isLoading) {
    return <PreferencesPanelSkeleton className={className} />;
  }

  if (!preferences) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <p className="text-sm text-destructive">Failed to load preferences. Please try again.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Preferences</h2>
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
          <TabsTrigger value="appearance" className="rounded-none">Appearance</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none">Notifications</TabsTrigger>
          <TabsTrigger value="learning" className="rounded-none">Learning</TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-none">Privacy</TabsTrigger>
          <TabsTrigger value="accessibility" className="rounded-none">Accessibility</TabsTrigger>
          <TabsTrigger value="language" className="rounded-none">Language</TabsTrigger>
        </TabsList>

        <div className="p-6">
          <TabsContent value="appearance" className="mt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={preferences.preferences.theme}
                  onValueChange={(value) => handlePreferenceChange({ theme: value as "light" | "dark" | "system" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notification Channels</h3>
              <PreferenceToggle
                label="Email Notifications"
                description="Receive notifications via email"
                value={preferences.preferences.notifications?.email ?? true}
                onChange={(value) => handlePreferenceChange({
                  notifications: { ...preferences.preferences.notifications, email: value }
                })}
              />
              <PreferenceToggle
                label="Push Notifications"
                description="Receive browser push notifications"
                value={preferences.preferences.notifications?.push ?? true}
                onChange={(value) => handlePreferenceChange({
                  notifications: { ...preferences.preferences.notifications, push: value }
                })}
              />
              <PreferenceToggle
                label="In-App Notifications"
                description="Show notifications within the app"
                value={preferences.preferences.notifications?.inApp ?? true}
                onChange={(value) => handlePreferenceChange({
                  notifications: { ...preferences.preferences.notifications, inApp: value }
                })}
              />

              <h3 className="mt-6 text-sm font-medium">Notification Types</h3>
              <PreferenceToggle
                label="Reminder Notifications"
                description="Receive study reminders"
                value={preferences.preferences.notifications?.reminders ?? true}
                onChange={(value) => handlePreferenceChange({
                  notifications: { ...preferences.preferences.notifications, reminders: value }
                })}
              />
              <PreferenceToggle
                label="Marketing Communications"
                description="Receive updates about new features and offers"
                value={preferences.preferences.notifications?.marketing ?? false}
                onChange={(value) => handlePreferenceChange({
                  notifications: { ...preferences.preferences.notifications, marketing: value }
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="learning" className="mt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select
                  value={preferences.preferences.learning?.difficulty || 'intermediate'}
                  onValueChange={(value) => handlePreferenceChange({
                    learning: { ...preferences.preferences.learning, difficulty: value as "beginner" | "intermediate" | "advanced" }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Learning Pace</Label>
                <Select
                  value={preferences.preferences.learning?.pace || 'normal'}
                  onValueChange={(value) => handlePreferenceChange({
                    learning: { ...preferences.preferences.learning, pace: value as "slow" | "normal" | "fast" }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Relaxed</SelectItem>
                    <SelectItem value="normal">Moderate</SelectItem>
                    <SelectItem value="fast">Intensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PreferenceToggle
                label="Study Reminders"
                description="Receive reminders to maintain your learning streak"
                value={preferences.preferences.learning?.reminders ?? true}
                onChange={(value) => handlePreferenceChange({
                  learning: { ...preferences.preferences.learning, reminders: value }
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <Select
                  value={preferences.preferences.privacy?.profileVisibility || 'public'}
                  onValueChange={(value) => handlePreferenceChange({
                    privacy: { ...preferences.preferences.privacy, profileVisibility: value as "public" | "private" | "friends" }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PreferenceToggle
                label="Activity Tracking"
                description="Allow tracking of your learning activities"
                value={preferences.preferences.privacy?.activityTracking ?? true}
                onChange={(value) => handlePreferenceChange({
                  privacy: { ...preferences.preferences.privacy, activityTracking: value }
                })}
                helpText="Required for progress tracking and recommendations"
              />
              <PreferenceToggle
                label="Data Sharing"
                description="Share anonymized data to improve the platform"
                value={preferences.preferences.privacy?.dataSharing ?? false}
                onChange={(value) => handlePreferenceChange({
                  privacy: { ...preferences.preferences.privacy, dataSharing: value }
                })}
              />
              <PreferenceToggle
                label="Analytics"
                description="Allow analytics to help us improve your experience"
                value={preferences.preferences.privacy?.analytics ?? true}
                onChange={(value) => handlePreferenceChange({
                  privacy: { ...preferences.preferences.privacy, analytics: value }
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="accessibility" className="mt-0 space-y-6">
            <div className="space-y-4">
              <PreferenceToggle
                label="High Contrast Mode"
                description="Increase contrast for better visibility"
                value={preferences.preferences.accessibility?.highContrast ?? false}
                onChange={(value) => handlePreferenceChange({
                  accessibility: { ...preferences.preferences.accessibility, highContrast: value }
                })}
              />
              <PreferenceToggle
                label="Large Text"
                description="Increase text size throughout the app"
                value={preferences.preferences.accessibility?.largeText ?? false}
                onChange={(value) => handlePreferenceChange({
                  accessibility: { ...preferences.preferences.accessibility, largeText: value }
                })}
              />
              <PreferenceToggle
                label="Reduced Motion"
                description="Minimize animations and transitions"
                value={preferences.preferences.accessibility?.reducedMotion ?? false}
                onChange={(value) => handlePreferenceChange({
                  accessibility: { ...preferences.preferences.accessibility, reducedMotion: value }
                })}
              />
              <PreferenceToggle
                label="Screen Reader Optimization"
                description="Optimize interface for screen readers"
                value={preferences.preferences.accessibility?.screenReader ?? false}
                onChange={(value) => handlePreferenceChange({
                  accessibility: { ...preferences.preferences.accessibility, screenReader: value }
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="language" className="mt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={preferences.preferences.language}
                  onValueChange={(value) => handlePreferenceChange({ language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <div className="mt-6 flex justify-end border-t pt-4">
            <Button variant="outline" onClick={handleResetToDefaults}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function PreferencesPanelSkeleton({ className }: { className: string | undefined }) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="border-b p-4">
        <Skeleton className="h-6 w-32" />
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
      return { language: 'en' };
    default:
      return {};
  }
}
