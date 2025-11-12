/**
 * Loading State Components
 * Provides skeleton loaders and spinners for authentication flows
 */

"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingStateProps {
  className?: string;
}

interface ButtonSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Inline spinner for button actions
 */
export function ButtonSpinner({
  size = "md",
  className = "",
}: ButtonSpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
      <span className="sr-only">Loading...</span>
    </svg>
  );
}

/**
 * Full page spinner
 */
export function PageSpinner({
  className = "",
}: LoadingStateProps): React.ReactElement {
  return (
    <div
      className={`flex min-h-screen items-center justify-center ${className}`}
      role="status"
      aria-label="Loading page"
    >
      <div className="text-center">
        <ButtonSpinner size="lg" className="mx-auto text-primary" />
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
        <span className="sr-only">Loading page content</span>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for authentication forms
 */
export function FormSkeleton({
  className = "",
}: LoadingStateProps): React.ReactElement {
  return (
    <Card className={className} role="status" aria-label="Loading form">
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-10 w-full" />

        {/* Divider */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-px flex-1" />
        </div>

        {/* OAuth buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </CardContent>
      <span className="sr-only">Loading authentication form</span>
    </Card>
  );
}

/**
 * Skeleton loader for profile page
 */
export function ProfileSkeleton({
  className = "",
}: LoadingStateProps): React.ReactElement {
  return (
    <div
      className={`space-y-6 ${className}`}
      role="status"
      aria-label="Loading profile"
    >
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <Skeleton className="h-20 w-20 rounded-full" />

            {/* User Info */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>

      <span className="sr-only">Loading profile information</span>
    </div>
  );
}

/**
 * Skeleton loader for session list
 */
export function SessionListSkeleton({
  className = "",
  count = 3,
}: LoadingStateProps & { count?: number }): React.ReactElement {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Loading sessions"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {/* Device Icon */}
                <Skeleton className="h-10 w-10 rounded" />

                {/* Session Info */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>

              {/* Action Button */}
              <Skeleton className="h-9 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Loading active sessions</span>
    </div>
  );
}

/**
 * Skeleton loader for OAuth buttons
 */
export function OAuthButtonsSkeleton({
  className = "",
  count = 5,
}: LoadingStateProps & { count?: number }): React.ReactElement {
  return (
    <div
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 ${className}`}
      role="status"
      aria-label="Loading social login options"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <span className="sr-only">Loading social login buttons</span>
    </div>
  );
}

/**
 * Inline loading indicator for text
 */
export function InlineLoader({
  text = "Loading",
  className = "",
}: { text?: string } & LoadingStateProps): React.ReactElement {
  return (
    <div
      className={`flex items-center space-x-2 ${className}`}
      role="status"
      aria-label={text}
    >
      <ButtonSpinner size="sm" />
      <span className="text-sm text-gray-600">{text}...</span>
      <span className="sr-only">{text}</span>
    </div>
  );
}

/**
 * Loading overlay for full-page operations
 */
export function LoadingOverlay({
  message = "Loading",
  className = "",
}: { message?: string } & LoadingStateProps): React.ReactElement {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      role="status"
      aria-label={message}
    >
      <Card className="w-64">
        <CardContent className="flex flex-col items-center space-y-4 pt-6">
          <ButtonSpinner size="lg" className="text-primary" />
          <p className="text-center text-sm font-medium">{message}...</p>
          <span className="sr-only">{message}</span>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for a single input field
 */
export function InputSkeleton({
  className = "",
}: LoadingStateProps): React.ReactElement {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Hook for managing loading states
 */
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(
    () => setIsLoading((prev) => !prev),
    []
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
}
