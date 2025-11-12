/**
 * ProtectedRoute Component
 * 
 * Route guard that requires authentication
 * Redirects to signin page if user is not authenticated
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 14.2
 */

"use client";

import React from "react";
import { useRequireAuth } from "@/hooks/useAuthGuards";
import { PageSpinner } from "@/components/auth/shared/LoadingState";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  preserveCallback?: boolean;
}

/**
 * Wrapper component for routes requiring authentication
 * 
 * Features:
 * - Automatic redirect to signin with callback URL
 * - Loading skeleton during auth check
 * - Prevents flash of protected content
 * 
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <ProfilePage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  redirectTo = "/auth/signin",
  preserveCallback = true,
}: ProtectedRouteProps): React.ReactElement | null {
  const { isRedirecting, isInitialized, isAuthenticated } = useRequireAuth({
    redirectTo,
    preserveCallback,
  });

  // Show loading state during auth check
  if (!isInitialized || isRedirecting) {
    return <PageSpinner />;
  }

  // Prevent flash of protected content
  if (!isAuthenticated) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
