"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useToast } from "@/hooks/use-toast";
import type { NotificationPreferences, NotificationType, DeliveryChannel, FrequencySettings } from "@/types/notification-service";

export interface NotificationPreferencesPanelProps {
  userId: string;
  onSave?: (preferences: NotificationPreferences) => void;
  showAdvanced?: boolean;
  className?: string;
}

// Validation schema
const preferencesSchema = z.object({
  enabledTypes: z.array(z.string()),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }).optional(),
  globalSettings: z.object({
    enabled: z.boolean(),
    maxPerDay: z.number().min(1).max(100).optional(),
    maxPerHour: z.number().min(1).max(20).optional(),
    respectQuietHours: z.boolean(),
    allowCriticalOverride: z.boolean(),
  }),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

const notificationTypes: { value: NotificationType; label: string }[] = [
  { value: "achievement", label: "Achievements" },
  { value: "spaced_repetition", label: "Spaced Repetition" },
  { value: "streak_reminder", label: "Streak Reminders" },
  { value: "mock_test_reminder", label: "Mock Test Reminders" },
  { value: "system", label: "System Notifications" },
  { value: "mentoring", label: "Mentoring Messages" },
  { value: "course_update", label: "Course Updates" },
  { value: "community", label: "Community Activity" },
  { value: "marketing", label: "Marketing & Promotions" },
];

const deliveryChannels: { value: DeliveryChannel; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-App" },
  { value: "sms", label: "SMS" },
];

const frequencyOptions: { value: FrequencySettings["type"]; label: string }[] = [
  { value: "immediate", label: "Immediate" },
  { value: "batched", label: "Batched" },
  { value: "daily", label: "Daily Digest" },
  { value: "weekly", label: "Weekly Digest" },
  { value: "disabled", label: "Disabled" },
];

export function NotificationPreferencesPanel({
  userId,
  onSave,
  showAdvanced = true,
  className = "",
}: NotificationPreferencesPanelProps) {
  const { toast } = useToast();
  const { data: preferences, isLoading, updatePreferences } = useNotificationPreferences(userId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      enabledTypes: [],
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      },
      globalSettings: {
        enabled: true,
        maxPerDay: 50,
        maxPerHour: 10,
        respectQuietHours: true,
        allowCriticalOverride: true,
      },
    },
  });

  // Load preferences
  useEffect(() => {
    if (preferences) {
      setValue("enabledTypes", preferences.enabledTypes);
      if (preferences.quietHours) {
        setValue("quietHours", preferences.quietHours);
      }
      setValue("globalSettings", preferences.globalSettings);
    }
  }, [preferences, setValue]);

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      const updatedPreferences: Partial<NotificationPreferences> = {
        userId,
        enabledTypes: data.enabledTypes as NotificationType[],
        quietHours: data.quietHours,
        globalSettings: data.globalSettings,
        // Frequency and channels would be managed separately
        frequency: preferences?.frequency ?? {},
        channels: preferences?.channels ?? {},
      };

      await updatePreferences.mutateAsync(updatedPreferences as NotificationPreferences);

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated successfully.",
      });

      onSave?.(updatedPreferences as NotificationPreferences);
    } catch (error) {
      toast({
        title: "Error saving preferences",
        description: error instanceof Error ? error.message : "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const enabledTypes = watch("enabledTypes");
  const quietHoursEnabled = watch("quietHours.enabled");
  const globalEnabled = watch("globalSettings.enabled");

  const toggleType = (type: NotificationType) => {
    const current = enabledTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setValue("enabledTypes", updated, { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className={`notification-preferences-loading ${className}`}>
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`notification-preferences-panel space-y-6 ${className}`}>
      {/* Global Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Control which notifications you receive and how you receive them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="global-enabled">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn all notifications on or off
              </p>
            </div>
            <Switch
              id="global-enabled"
              checked={globalEnabled}
              onCheckedChange={(checked) =>
                setValue("globalSettings.enabled", checked, { shouldDirty: true })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationTypes.map((type) => (
            <div key={type.value} className="flex items-center justify-between">
              <Label htmlFor={`type-${type.value}`} className="cursor-pointer">
                {type.label}
              </Label>
              <Switch
                id={`type-${type.value}`}
                checked={enabledTypes.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
                disabled={!globalEnabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don't want to receive non-critical notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours-enabled"
              checked={quietHoursEnabled}
              onCheckedChange={(checked) =>
                setValue("quietHours.enabled", checked, { shouldDirty: true })
              }
            />
          </div>

          {quietHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    {...register("quietHours.start")}
                  />
                  {errors.quietHours?.start && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.quietHours.start.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    {...register("quietHours.end")}
                  />
                  {errors.quietHours?.end && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.quietHours.end.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="quiet-timezone">Timezone</Label>
                <Input
                  id="quiet-timezone"
                  {...register("quietHours.timezone")}
                  placeholder="America/New_York"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>
              Configure rate limits and override behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max-per-day">Maximum Notifications Per Day</Label>
              <Input
                id="max-per-day"
                type="number"
                min={1}
                max={100}
                {...register("globalSettings.maxPerDay", { valueAsNumber: true })}
              />
              {errors.globalSettings?.maxPerDay && (
                <p className="text-sm text-destructive mt-1">
                  {errors.globalSettings.maxPerDay.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="max-per-hour">Maximum Notifications Per Hour</Label>
              <Input
                id="max-per-hour"
                type="number"
                min={1}
                max={20}
                {...register("globalSettings.maxPerHour", { valueAsNumber: true })}
              />
              {errors.globalSettings?.maxPerHour && (
                <p className="text-sm text-destructive mt-1">
                  {errors.globalSettings.maxPerHour.message}
                </p>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="respect-quiet">Respect Quiet Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Suppress non-critical notifications during quiet hours
                </p>
              </div>
              <Switch
                id="respect-quiet"
                checked={watch("globalSettings.respectQuietHours")}
                onCheckedChange={(checked) =>
                  setValue("globalSettings.respectQuietHours", checked, { shouldDirty: true })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="critical-override">Allow Critical Override</Label>
                <p className="text-sm text-muted-foreground">
                  Critical notifications bypass quiet hours and rate limits
                </p>
              </div>
              <Switch
                id="critical-override"
                checked={watch("globalSettings.allowCriticalOverride")}
                onCheckedChange={(checked) =>
                  setValue("globalSettings.allowCriticalOverride", checked, { shouldDirty: true })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={!isDirty}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || updatePreferences.isPending}
        >
          {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}

export default NotificationPreferencesPanel;
