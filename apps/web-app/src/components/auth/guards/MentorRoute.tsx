/**
 * MentorRoute Component
 * 
 * Route guard that requires mentor privileges
 * Redirects to dashboard if user is not a mentor
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.2
 */

"use client";

import React from "react";
import { useRequireMentor } from "@/hooks/useAuthGuards";
import { PageSpinner } from "@/components/auth/shared/LoadingState";

interface MentorRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  mentorRedirectTo?: string;
  preserveCallback?: boolean;
}

/**
 * Wrapper component for routes requiring mentor privileges
 * 
 * Features:
 * - Checks authentication first
 * - Checks mentor role
 * - Redirects to dashboard with error message if not mentor
 * - Loading skeleton during checks
 * 
 * @example
 * ```tsx
 * <MentorRoute>
 *   <MentorDashboard />
 * </MentorRoute>
 * ```
 */
export function MentorRoute({
  children,
  redirectTo = "/auth/signin",
  mentorRedirectTo = "/dashboard?error=mentor-required",
  preserveCallback = true,
}: MentorRouteProps): React.ReactElement | null {
  const { isRedirecting, isMentorRedirecting, isInitialized, isAuthenticated, isMentor } =
    useRequireMentor({
      redirectTo,
      mentorRedirectTo,
      preserveCallback,
    });

  // Show loading state during auth and role checks
  if (!isInitialized || isRedirecting || isMentorRedirecting) {
    return <PageSpinner />;
  }

  // Prevent flash of protected content
  if (!isAuthenticated || !isMentor) {
    return null;
  }

  // Render mentor-only content
  return <>{children}</>;
}
