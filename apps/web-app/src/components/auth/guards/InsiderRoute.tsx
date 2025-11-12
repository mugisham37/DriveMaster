/**
 * InsiderRoute Component
 * 
 * Route guard that requires insider privileges
 * Redirects to insiders page if user is not an insider
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.2
 */

"use client";

import React from "react";
import { useRequireInsider } from "@/hooks/useAuthGuards";
import { PageSpinner } from "@/components/auth/shared/LoadingState";

interface InsiderRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  insiderRedirectTo?: string;
  preserveCallback?: boolean;
}

/**
 * Wrapper component for routes requiring insider privileges
 * 
 * Features:
 * - Checks authentication first
 * - Checks insider role
 * - Redirects to insiders page with error message if not insider
 * - Loading skeleton during checks
 * 
 * @example
 * ```tsx
 * <InsiderRoute>
 *   <InsiderContent />
 * </InsiderRoute>
 * ```
 */
export function InsiderRoute({
  children,
  redirectTo = "/auth/signin",
  insiderRedirectTo = "/insiders?error=insider-required",
  preserveCallback = true,
}: InsiderRouteProps): React.ReactElement | null {
  const { isRedirecting, isInsiderRedirecting, isInitialized, isAuthenticated, isInsider } =
    useRequireInsider({
      redirectTo,
      insiderRedirectTo,
      preserveCallback,
    });

  // Show loading state during auth and role checks
  if (!isInitialized || isRedirecting || isInsiderRedirecting) {
    return <PageSpinner />;
  }

  // Prevent flash of protected content
  if (!isAuthenticated || !isInsider) {
    return null;
  }

  // Render insider-only content
  return <>{children}</>;
}
