"use client";

/**
 * ProfileForm Component
 * 
 * Implements profile editing with:
 * - React Hook Form for form management
 * - Field validation (URL format, etc.)
 * - Optimistic updates with rollback
 * - Dirty state tracking
 * - Success toast notifications
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 14.5, 15.1
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { profileSessionClient } from "@/lib/auth/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { UserProfile, ProfileUpdateRequest } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must not exceed 500 characters")
    .optional(),
  location: z
    .string()
    .max(100, "Location must not exceed 100 characters")
    .optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  githubUsername: z
    .string()
    .regex(/^[a-zA-Z0-9-]*$/, "Invalid GitHub username format")
    .max(39, "GitHub username must not exceed 39 characters")
    .optional()
    .or(z.literal("")),
  twitterUsername: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, "Invalid Twitter username format")
    .max(15, "Twitter username must not exceed 15 characters")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

// ============================================================================
// Component Props
// ============================================================================

export interface ProfileFormProps {
  user: UserProfile;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function ProfileForm({ user, onSuccess, onError }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with user data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      website: user.website ?? "",
      githubUsername: user.githubUsername ?? "",
      twitterUsername: user.twitterUsername ?? "",
    },
  });

  // Reset form when user data changes
  useEffect(() => {
    reset({
      name: user.name ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      website: user.website ?? "",
      githubUsername: user.githubUsername ?? "",
      twitterUsername: user.twitterUsername ?? "",
    });
  }, [user, reset]);

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    // Store current data for rollback
    const previousData = {
      name: user.name,
      bio: user.bio,
      location: user.location,
      website: user.website,
      githubUsername: user.githubUsername,
      twitterUsername: user.twitterUsername,
    };

    try {
      // Prepare update request (only send changed fields)
      const updates: ProfileUpdateRequest = {};
      if (dirtyFields.name && data.name) updates.name = data.name;
      if (dirtyFields.bio && data.bio) updates.bio = data.bio;
      if (dirtyFields.location && data.location) updates.location = data.location;
      if (dirtyFields.website && data.website) updates.website = data.website;
      if (dirtyFields.githubUsername && data.githubUsername)
        updates.githubUsername = data.githubUsername;
      if (dirtyFields.twitterUsername && data.twitterUsername)
        updates.twitterUsername = data.twitterUsername;

      // Submit to API
      await profileSessionClient.updateProfile(updates);

      // Success
      toast.success("Profile updated successfully");
      reset(data); // Reset form with new data to clear dirty state

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Rollback to previous data
      reset(previousData);

      // Show error
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      toast.error(errorMessage);

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Discard Changes
  // ============================================================================

  const handleDiscard = () => {
    if (
      isDirty &&
      !confirm("Are you sure you want to discard your changes?")
    ) {
      return;
    }

    reset();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Name
        </Label>
        <Input
          id="name"
          type="text"
          {...register("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={isSubmitting}
          className="w-full"
        />
        {errors.name && (
          <p
            id="name-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Bio Field */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium">
          Bio
        </Label>
        <Textarea
          id="bio"
          {...register("bio")}
          aria-invalid={!!errors.bio}
          aria-describedby={errors.bio ? "bio-error" : undefined}
          disabled={isSubmitting}
          className="w-full min-h-[100px]"
          placeholder="Tell us about yourself..."
        />
        {errors.bio && (
          <p
            id="bio-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.bio.message}
          </p>
        )}
      </div>

      {/* Location Field */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium">
          Location
        </Label>
        <Input
          id="location"
          type="text"
          {...register("location")}
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "location-error" : undefined}
          disabled={isSubmitting}
          className="w-full"
          placeholder="City, Country"
        />
        {errors.location && (
          <p
            id="location-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.location.message}
          </p>
        )}
      </div>

      {/* Website Field */}
      <div className="space-y-2">
        <Label htmlFor="website" className="text-sm font-medium">
          Website
        </Label>
        <Input
          id="website"
          type="url"
          {...register("website")}
          aria-invalid={!!errors.website}
          aria-describedby={errors.website ? "website-error" : undefined}
          disabled={isSubmitting}
          className="w-full"
          placeholder="https://example.com"
        />
        {errors.website && (
          <p
            id="website-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.website.message}
          </p>
        )}
      </div>

      {/* Social Links Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Social Links</h3>

        {/* GitHub Username */}
        <div className="space-y-2">
          <Label htmlFor="githubUsername" className="text-sm font-medium">
            GitHub Username
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">github.com/</span>
            <Input
              id="githubUsername"
              type="text"
              {...register("githubUsername")}
              aria-invalid={!!errors.githubUsername}
              aria-describedby={
                errors.githubUsername ? "github-error" : undefined
              }
              disabled={isSubmitting}
              className="flex-1"
              placeholder="username"
            />
          </div>
          {errors.githubUsername && (
            <p
              id="github-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {errors.githubUsername.message}
            </p>
          )}
        </div>

        {/* Twitter Username */}
        <div className="space-y-2">
          <Label htmlFor="twitterUsername" className="text-sm font-medium">
            Twitter Username
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              id="twitterUsername"
              type="text"
              {...register("twitterUsername")}
              aria-invalid={!!errors.twitterUsername}
              aria-describedby={
                errors.twitterUsername ? "twitter-error" : undefined
              }
              disabled={isSubmitting}
              className="flex-1"
              placeholder="username"
            />
          </div>
          {errors.twitterUsername && (
            <p
              id="twitter-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {errors.twitterUsername.message}
            </p>
          )}
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
            "Save Changes"
          )}
        </Button>

        {isDirty && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isSubmitting}
          >
            Discard Changes
          </Button>
        )}
      </div>
    </form>
  );
}
