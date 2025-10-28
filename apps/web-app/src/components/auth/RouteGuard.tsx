"use client";

/**
 * Route Guard Component with Authentication Checks
 *
 * Implements:
 * - Authentication requirement enforcement
 * - Loading states during authentication verification
 * - Redirect logic with callback URL preservation
 * - Unauthorized access handling with appropriate messaging
 * - Requirements: 4.1, 4.2, 4.3, 4.5
 */

import React, { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/common/Loading";

// ============================================================================
// Types
// ============================================================================

export interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireMentor?: boolean;
  requireInsider?: boolean;
  fallback?: React.ComponentType<RouteGuardFallbackProps>;
  redirectTo?: string;
  preserveCallback?: boolean;
  showUnauthorizedMessage?: boolean;
}

export interface RouteGuardFallbackProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  isMentor: boolean;
  isInsider: boolean;
  error: string | null;
  requireAuth: boolean;
  requireMentor: boolean;
  requireInsider: boolean;
}

// ============================================================================
// Default Fallback Components
// ============================================================================

const DefaultLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loading />
      <p className="mt-4 text-gray-600">Verifying authentication...</p>
    </div>
  </div>
);

const DefaultUnauthorizedFallback: React.FC<{ message: string }> = ({
  message,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Access Denied
      </h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <button
        onClick={() => window.history.back()}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  </div>
);

// ============================================================================
// Route Guard Component
// ============================================================================

export function RouteGuard({
  children,
  requireAuth = false,
  requireMentor = false,
  requireInsider = false,
  fallback: CustomFallback,
  redirectTo,
  preserveCallback = true,
  showUnauthorizedMessage = true,
}: RouteGuardProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Authentication Check Logic
  // ============================================================================

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      // Wait for auth initialization
      if (!auth.isInitialized) {
        return;
      }

      try {
        // Check authentication status if required
        if (requireAuth || requireMentor || requireInsider) {
          await auth.checkAuthStatus();
        }

        if (isMounted) {
          setIsChecking(false);
          setError(null);
        }
      } catch (error) {
        if (isMounted) {
          setIsChecking(false);
          setError(
            error instanceof Error
              ? error.message
              : "Authentication verification failed"
          );
        }
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [auth, requireAuth, requireMentor, requireInsider]);

  // ============================================================================
  // Redirect Logic
  // ============================================================================

  useEffect(() => {
    if (isChecking || !auth.isInitialized) return;

    const currentUrl =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    // Check authentication requirement
    if (requireAuth && !auth.isAuthenticated) {
      const loginUrl = redirectTo || "/auth/signin";
      const callbackUrl = preserveCallback
        ? encodeURIComponent(currentUrl)
        : "";
      const finalUrl = callbackUrl
        ? `${loginUrl}?callbackUrl=${callbackUrl}`
        : loginUrl;

      router.push(finalUrl);
      return;
    }

    // Check mentor requirement
    if (requireMentor && auth.isAuthenticated && !auth.isMentor) {
      const dashboardUrl = "/dashboard?error=mentor-required";
      router.push(dashboardUrl);
      return;
    }

    // Check insider requirement
    if (requireInsider && auth.isAuthenticated && !auth.isInsider) {
      const insidersUrl = "/insiders?error=insider-required";
      router.push(insidersUrl);
      return;
    }
  }, [
    isChecking,
    auth.isInitialized,
    auth.isAuthenticated,
    auth.isMentor,
    auth.isInsider,
    requireAuth,
    requireMentor,
    requireInsider,
    redirectTo,
    preserveCallback,
    pathname,
    searchParams,
    router,
  ]);

  // ============================================================================
  // Render Logic
  // ============================================================================

  // Show loading state during initialization or checking
  if (!auth.isInitialized || isChecking) {
    if (CustomFallback) {
      return (
        <CustomFallback
          isLoading={true}
          isAuthenticated={auth.isAuthenticated}
          isMentor={auth.isMentor}
          isInsider={auth.isInsider}
          error={error}
          requireAuth={requireAuth}
          requireMentor={requireMentor}
          requireInsider={requireInsider}
        />
      );
    }
    return <DefaultLoadingFallback />;
  }

  // Check access requirements and show unauthorized message if needed
  const hasAccess = checkAccess();

  if (!hasAccess && showUnauthorizedMessage) {
    const message = getUnauthorizedMessage();

    if (CustomFallback) {
      return (
        <CustomFallback
          isLoading={false}
          isAuthenticated={auth.isAuthenticated}
          isMentor={auth.isMentor}
          isInsider={auth.isInsider}
          error={message}
          requireAuth={requireAuth}
          requireMentor={requireMentor}
          requireInsider={requireInsider}
        />
      );
    }

    return <DefaultUnauthorizedFallback message={message} />;
  }

  // If access is denied but we don't show unauthorized message, render nothing
  if (!hasAccess) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function checkAccess(): boolean {
    // Check authentication requirement
    if (requireAuth && !auth.isAuthenticated) {
      return false;
    }

    // Check mentor requirement
    if (requireMentor && (!auth.isAuthenticated || !auth.isMentor)) {
      return false;
    }

    // Check insider requirement
    if (requireInsider && (!auth.isAuthenticated || !auth.isInsider)) {
      return false;
    }

    return true;
  }

  function getUnauthorizedMessage(): string {
    if (requireAuth && !auth.isAuthenticated) {
      return "You must be signed in to access this page.";
    }

    if (requireMentor && auth.isAuthenticated && !auth.isMentor) {
      return "This page is only available to mentors. You can apply to become a mentor from your dashboard.";
    }

    if (requireInsider && auth.isAuthenticated && !auth.isInsider) {
      return "This page is only available to Exercism Insiders. Learn more about becoming an Insider.";
    }

    return "You do not have permission to access this page.";
  }
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Requires authentication - redirects to sign in if not authenticated
 */
export function AuthenticatedOnly({
  children,
  redirectTo = "/auth/signin",
  ...props
}: Omit<RouteGuardProps, "requireAuth">) {
  return (
    <RouteGuard requireAuth={true} redirectTo={redirectTo} {...props}>
      {children}
    </RouteGuard>
  );
}

/**
 * Requires mentor privileges - redirects to dashboard if not a mentor
 */
export function MentorOnly({
  children,
  ...props
}: Omit<RouteGuardProps, "requireMentor" | "requireAuth">) {
  return (
    <RouteGuard requireAuth={true} requireMentor={true} {...props}>
      {children}
    </RouteGuard>
  );
}

/**
 * Requires insider privileges - redirects to insiders page if not an insider
 */
export function InsiderOnly({
  children,
  ...props
}: Omit<RouteGuardProps, "requireInsider" | "requireAuth">) {
  return (
    <RouteGuard requireAuth={true} requireInsider={true} {...props}>
      {children}
    </RouteGuard>
  );
}

/**
 * Only shows content to unauthenticated users - redirects to dashboard if authenticated
 */
export function UnauthenticatedOnly({
  children,
  redirectTo = "/dashboard",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isInitialized) return;

    if (auth.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [auth.isInitialized, auth.isAuthenticated, redirectTo, router]);

  if (!auth.isInitialized) {
    return <DefaultLoadingFallback />;
  }

  if (auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
