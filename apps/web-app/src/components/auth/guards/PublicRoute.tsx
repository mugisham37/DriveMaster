/**
 * PublicRoute Component
 * 
 * Route guard for public pages (signin, signup)
 * Redirects to dashboard if user is already authenticated
 * 
 * Requirements: 10.1, 10.2
 */

"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuthGuards";
import { PageSpinner } from "@/components/auth/shared/LoadingState";

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Wrapper component for public routes (signin, signup)
 * Redirects authenticated users to dashboard
 * 
 * Features:
 * - Automatic redirect to dashboard if authenticated
 * - Loading state during auth check
 * - Useful for signin/signup pages
 * 
 * @example
 * ```tsx
 * <PublicRoute>
 *   <SignInPage />
 * </PublicRoute>
 * ```
 */
export function PublicRoute({
  children,
  redirectTo = "/dashboard",
}: PublicRouteProps): React.ReactElement | null {
  const { isInitialized, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isAuthenticated, redirectTo, router]);

  // Show loading state during auth check
  if (!isInitialized) {
    return <PageSpinner />;
  }

  // Redirect if authenticated (return null to prevent flash)
  if (isAuthenticated) {
    return null;
  }

  // Render public content
  return <>{children}</>;
}
