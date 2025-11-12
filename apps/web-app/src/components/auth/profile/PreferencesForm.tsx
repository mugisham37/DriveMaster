"use client";

/**
 * PreferencesForm Component
 * 
 * Implements user preferences editing with:
 * - Theme selection (light/dark/system)
 * - Notification toggles
 * - Language preference
 * - Timezone selection
 * - Immediate theme application
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 15.1
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { profileSessionClient } from "@/lib/auth/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import type { UserProfile, ProfileUpdateRequest } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const preferencesFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  emailNotifications: z.boolean(),
  mentorNotifications: z.boolean(),
  language: z.string(),
  timezone: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

// ============================================================================
// Constants
// ============================================================================

const SUPPORTED_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

// Get common timezones
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// ============================================================================
// Component Props
// ============================================================================

export interface PreferencesFormProps {
  user: UserProfile;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function PreferencesForm({
  user,
  onSuccess,
  onError,
}: PreferencesFormProps) {
  const { setTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with user preferences
  const {
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue,
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      theme: (user.preferences?.theme as "light" | "dark" | "system") || "system",
      emailNotifications: user.preferences?.emailNotifications ?? true,
      mentorNotifications: user.preferences?.mentorNotifications ?? true,
      language: user.preferences?.language || "en",
      timezone: user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Watch theme changes to apply immediately
  const currentTheme = watch("theme");

  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme, setTheme]);

  // Reset form when user data changes
  useEffect(() => {
    reset({
      theme: (user.preferences?.theme as "light" | "dark" | "system") || "system",
      emailNotifications: user.preferences?.emailNotifications ?? true,
      mentorNotifications: user.preferences?.mentorNotifications ?? true,
      language: user.preferences?.language || "en",
      timezone: user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [user, reset]);

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSubmitting(true);

    try {
      // Prepare update request
      const updates: ProfileUpdateRequest = {
        preferences: {
          theme: data.theme,
          emailNotifications: data.emailNotifications,
          mentorNotifications: data.mentorNotifications,
          language: data.language,
          timezone: data.timezone,
        },
      };

      // Submit to API
      await profileSessionClient.updateProfile(updates);

      // Success
      toast.success("Preferences updated successfully");
      reset(data); // Reset form with new data to clear dirty state

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Show error
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update preferences. Please try again.";
      toast.error(errorMessage);

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Theme Selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Theme</Label>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color theme
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue("theme", value as "light" | "dark" | "system", { shouldDirty: true })}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors
                ${
                  currentTheme === value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }
              `}
              aria-pressed={currentTheme === value}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label className="text-base font-semibold">Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Manage your notification preferences
          </p>
        </div>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive email updates about your account
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={watch("emailNotifications")}
              onCheckedChange={(checked) =>
                setValue("emailNotifications", checked, { shouldDirty: true })
              }
              disabled={isSubmitting}
              aria-label="Toggle email notifications"
            />
          </div>

          {/* Mentor Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mentorNotifications" className="text-sm font-medium">
                Mentor Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Get notified about mentor-related activities
              </p>
            </div>
            <Switch
              id="mentorNotifications"
              checked={watch("mentorNotifications")}
              onCheckedChange={(checked) =>
                setValue("mentorNotifications", checked, { shouldDirty: true })
              }
              disabled={isSubmitting}
              aria-label="Toggle mentor notifications"
            />
          </div>
        </div>
      </div>

      {/* Language and Timezone */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label className="text-base font-semibold">Regional Settings</Label>
          <p className="text-sm text-muted-foreground">
            Set your language and timezone preferences
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm font-medium">
            Language
          </Label>
          <Select
            value={watch("language")}
            onValueChange={(value) => setValue("language", value, { shouldDirty: true })}
            disabled={isSubmitting}
          >
            <SelectTrigger id="language" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </Label>
          <Select
            value={watch("timezone")}
            onValueChange={(value) => setValue("timezone", value, { shouldDirty: true })}
            disabled={isSubmitting}
          >
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting}
          aria-busy={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Saving...</span>
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </form>
  );
}
