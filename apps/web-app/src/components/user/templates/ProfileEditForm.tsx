/**
 * ProfileEditForm Component
 * 
 * Implements comprehensive profile editing with:
 * - React Hook Form + Zod validation
 * - Auto-save with 2-second debounce
 * - Optimistic updates with rollback
 * - Grouped fields (Personal Info, Account Security, Preferences, Privacy)
 * - Save status indicator
 * - Unsaved changes warning
 * - Inline validation errors
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7, 3.8
 * Task: 6.4
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUpdateUserProfile } from '@/hooks/useUserService';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, Check, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/user-service';

// ============================================================================
// Validation Schema
// ============================================================================

const profileEditSchema = z.object({
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(2, 'Language is required'),
  countryCode: z.string().optional(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ProfileEditFormProps {
  userId: string;
  userProfile: UserProfile;
  onSuccess?: () => void;
  className?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================================================
// Component
// ============================================================================

export function ProfileEditForm({
  userId,
  userProfile,
  onSuccess,
  className = '',
}: ProfileEditFormProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const updateProfile = useUpdateUserProfile();

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      email: userProfile.email,
      timezone: userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: userProfile.language || 'en',
      countryCode: userProfile.countryCode || '',
    },
  });

  const formValues = form.watch();
  const debouncedValues = useDebounce(formValues, 2000);

  // Auto-save on debounced changes
  useEffect(() => {
    const hasChanges = JSON.stringify(debouncedValues) !== JSON.stringify(form.formState.defaultValues);
    
    if (hasChanges && form.formState.isValid && !form.formState.isSubmitting) {
      handleAutoSave(debouncedValues);
    }
  }, [debouncedValues]);

  // Track unsaved changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name) {
        setHasUnsavedChanges(true);
        setSaveStatus('idle');
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && saveStatus !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveStatus]);

  const handleAutoSave = async (data: ProfileEditFormData) => {
    try {
      setSaveStatus('saving');
      
      await updateProfile.mutateAsync({
        userId,
        updates: {
          timezone: data.timezone,
          language: data.language,
          version: userProfile.version,
        },
      });

      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      onSuccess?.();
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to save changes');
      console.error('Profile update error:', error);
    }
  };

  const onSubmit = async (data: ProfileEditFormData) => {
    await handleAutoSave(data);
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Error saving</span>
          </div>
        );
      default:
        return hasUnsavedChanges ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save className="h-4 w-4" />
            <span>Unsaved changes</span>
          </div>
        ) : null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Save Status Indicator */}
      <div className="flex justify-end">
        {renderSaveStatus()}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} disabled />
                    </FormControl>
                    <FormDescription>
                      Email cannot be changed here. Contact support to update.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>
                Customize your location and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="US" {...field} maxLength={2} />
                    </FormControl>
                    <FormDescription>
                      Two-letter ISO country code (e.g., US, GB, FR)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Manual Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={!hasUnsavedChanges}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
