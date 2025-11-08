"use client";

/**
 * Authentication Hooks for Component Use
 *
 * Implements:
 * - useAuth hook for general authentication state access
 * - useRequireAuth hook with automatic redirect handling
 * - useRequireMentor and useRequireInsider hooks
 * - useAuthActions hook for authentication operations
 * - Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { useAuthActions } from "@/hooks/useAuthActions";
import type { AuthContextValue } from "@/contexts/AuthContext";
import type { UseAuthActionsReturn } from "@/hooks/useAuthActions";

// ============================================================================
// Core Authentication Hook
// ============================================================================

/**
 * General authentication state access hook
 * Provides access to authentication state and basic user information
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

// ============================================================================
// Authentication Requirement Hooks
// ============================================================================

export interface UseRequireAuthOptions {
  redirectTo?: string;
  preserveCallback?: boolean;
}

export interface UseRequireAuthReturn extends AuthContextValue {
  isRedirecting: boolean;
}

/**
 * Hook that requires authentication with automatic redirect handling
 * Redirects to sign-in page if user is not authenticated
 */
export function useRequireAuth(
  options: UseRequireAuthOptions = {},
): UseRequireAuthReturn {
  const { redirectTo = "/auth/signin", preserveCallback = true } = options;

  const auth = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isRedirecting =
    !auth.isInitialized || (!auth.isAuthenticated && auth.isInitialized);

  useEffect(() => {
    if (!auth.isInitialized) return;

    if (!auth.isAuthenticated) {
      const currentUrl =
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      const callbackUrl = preserveCallback
        ? encodeURIComponent(currentUrl)
        : "";
      const finalUrl = callbackUrl
        ? `${redirectTo}?callbackUrl=${callbackUrl}`
        : redirectTo;

      router.push(finalUrl);
    }
  }, [
    auth.isInitialized,
    auth.isAuthenticated,
    redirectTo,
    preserveCallback,
    pathname,
    searchParams,
    router,
  ]);

  return {
    ...auth,
    isRedirecting,
  };
}

// ============================================================================
// Role-Based Requirement Hooks
// ============================================================================

export interface UseRequireMentorOptions extends UseRequireAuthOptions {
  mentorRedirectTo?: string;
}

export interface UseRequireMentorReturn extends UseRequireAuthReturn {
  isMentorRedirecting: boolean;
}

/**
 * Hook that requires mentor privileges
 * Redirects to dashboard if user is not a mentor
 */
export function useRequireMentor(
  options: UseRequireMentorOptions = {},
): UseRequireMentorReturn {
  const {
    redirectTo = "/auth/signin",
    mentorRedirectTo = "/dashboard?error=mentor-required",
    preserveCallback = true,
  } = options;

  const authResult = useRequireAuth({ redirectTo, preserveCallback });
  const router = useRouter();

  const isMentorRedirecting =
    authResult.isAuthenticated && !authResult.isMentor;

  useEffect(() => {
    if (!authResult.isInitialized || authResult.isRedirecting) return;

    if (authResult.isAuthenticated && !authResult.isMentor) {
      router.push(mentorRedirectTo);
    }
  }, [
    authResult.isInitialized,
    authResult.isAuthenticated,
    authResult.isMentor,
    authResult.isRedirecting,
    mentorRedirectTo,
    router,
  ]);

  return {
    ...authResult,
    isMentorRedirecting,
  };
}

export interface UseRequireInsiderOptions extends UseRequireAuthOptions {
  insiderRedirectTo?: string;
}

export interface UseRequireInsiderReturn extends UseRequireAuthReturn {
  isInsiderRedirecting: boolean;
}

/**
 * Hook that requires insider privileges
 * Redirects to insiders page if user is not an insider
 */
export function useRequireInsider(
  options: UseRequireInsiderOptions = {},
): UseRequireInsiderReturn {
  const {
    redirectTo = "/auth/signin",
    insiderRedirectTo = "/insiders?error=insider-required",
    preserveCallback = true,
  } = options;

  const authResult = useRequireAuth({ redirectTo, preserveCallback });
  const router = useRouter();

  const isInsiderRedirecting =
    authResult.isAuthenticated && !authResult.isInsider;

  useEffect(() => {
    if (!authResult.isInitialized || authResult.isRedirecting) return;

    if (authResult.isAuthenticated && !authResult.isInsider) {
      router.push(insiderRedirectTo);
    }
  }, [
    authResult.isInitialized,
    authResult.isAuthenticated,
    authResult.isInsider,
    authResult.isRedirecting,
    insiderRedirectTo,
    router,
  ]);

  return {
    ...authResult,
    isInsiderRedirecting,
  };
}

// ============================================================================
// Authentication Actions Hook
// ============================================================================

/**
 * Hook for authentication operations
 * Provides access to login, register, logout, and OAuth operations
 */
export function useAuthActionsHook(): UseAuthActionsReturn {
  return useAuthActions();
}

// ============================================================================
// Conditional Authentication Hooks
// ============================================================================

export interface UseConditionalAuthOptions {
  condition: boolean;
  redirectTo?: string;
  preserveCallback?: boolean;
}

/**
 * Hook that conditionally requires authentication based on a condition
 */
export function useConditionalAuth(
  options: UseConditionalAuthOptions,
): UseRequireAuthReturn {
  const { condition, ...authOptions } = options;
  const auth = useAuthContext();
  const authResult = useRequireAuth(authOptions);

  // If condition is false, return auth state without redirect logic
  if (!condition) {
    return {
      ...auth,
      isRedirecting: false,
    };
  }

  // If condition is true, return the require auth result
  return authResult;
}

// ============================================================================
// Authentication Status Hooks
// ============================================================================

/**
 * Hook for checking authentication status without redirects
 * Useful for components that need to know auth state but handle redirects themselves
 */
export function useAuthStatus() {
  const auth = useAuthContext();

  return {
    isInitialized: auth.isInitialized,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isMentor: auth.isMentor,
    isInsider: auth.isInsider,
    user: auth.user,
    error: auth.state.error,

    // Computed status
    isReady: auth.isInitialized && !auth.isLoading,
    hasError: !!auth.state.error,

    // Permission checks
    canAccessMentoring: auth.isAuthenticated && auth.isMentor,
    canAccessInsiderFeatures: auth.isAuthenticated && auth.isInsider,
    canAccessDashboard: auth.isAuthenticated,

    // Role checks
    hasRole: (role: "mentor" | "insider" | "user") => {
      switch (role) {
        case "mentor":
          return auth.isAuthenticated && auth.isMentor;
        case "insider":
          return auth.isAuthenticated && auth.isInsider;
        case "user":
          return auth.isAuthenticated;
        default:
          return false;
      }
    },
  };
}

// ============================================================================
// Route Protection Hooks
// ============================================================================

export interface UseRouteProtectionOptions {
  requireAuth?: boolean;
  requireMentor?: boolean;
  requireInsider?: boolean;
  redirectTo?: string;
  preserveCallback?: boolean;
}

export interface UseRouteProtectionReturn {
  isAllowed: boolean;
  isLoading: boolean;
  isRedirecting: boolean;
  shouldRender: boolean;
  error: string | null;
}

/**
 * Hook for comprehensive route protection logic
 * Combines authentication, mentor, and insider requirements
 */
export function useRouteProtection(
  options: UseRouteProtectionOptions = {},
): UseRouteProtectionReturn {
  const {
    requireAuth = false,
    requireMentor = false,
    requireInsider = false,
    redirectTo = "/auth/signin",
    preserveCallback = true,
  } = options;

  const auth = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isLoading = !auth.isInitialized || auth.isLoading;
  const isAllowed = checkAccess();
  const isRedirecting = !isLoading && !isAllowed;
  const shouldRender = auth.isInitialized && !auth.isLoading && isAllowed;
  const error = getAccessError();

  useEffect(() => {
    if (isLoading) return;

    if (!isAllowed) {
      const currentUrl =
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      const callbackUrl = preserveCallback
        ? encodeURIComponent(currentUrl)
        : "";

      let finalRedirectUrl = redirectTo;

      // Determine appropriate redirect URL based on the access requirement
      if (requireMentor && auth.isAuthenticated && !auth.isMentor) {
        finalRedirectUrl = "/dashboard?error=mentor-required";
      } else if (requireInsider && auth.isAuthenticated && !auth.isInsider) {
        finalRedirectUrl = "/insiders?error=insider-required";
      } else if (callbackUrl) {
        finalRedirectUrl = `${redirectTo}?callbackUrl=${callbackUrl}`;
      }

      router.push(finalRedirectUrl);
    }
  }, [
    isLoading,
    isAllowed,
    requireAuth,
    requireMentor,
    requireInsider,
    auth.isAuthenticated,
    auth.isMentor,
    auth.isInsider,
    redirectTo,
    preserveCallback,
    pathname,
    searchParams,
    router,
  ]);

  return {
    isAllowed,
    isLoading,
    isRedirecting,
    shouldRender,
    error,
  };

  function checkAccess(): boolean {
    if (requireAuth && !auth.isAuthenticated) {
      return false;
    }

    if (requireMentor && (!auth.isAuthenticated || !auth.isMentor)) {
      return false;
    }

    if (requireInsider && (!auth.isAuthenticated || !auth.isInsider)) {
      return false;
    }

    return true;
  }

  function getAccessError(): string | null {
    if (requireAuth && !auth.isAuthenticated) {
      return "Authentication required";
    }

    if (requireMentor && auth.isAuthenticated && !auth.isMentor) {
      return "Mentor privileges required";
    }

    if (requireInsider && auth.isAuthenticated && !auth.isInsider) {
      return "Insider privileges required";
    }

    return null;
  }
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for handling authentication redirects manually
 */
export function useAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectToLogin = useCallback(
    (customRedirectTo?: string) => {
      const currentUrl =
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      const redirectTo = customRedirectTo || "/auth/signin";
      const callbackUrl = encodeURIComponent(currentUrl);
      const finalUrl = `${redirectTo}?callbackUrl=${callbackUrl}`;

      router.push(finalUrl);
    },
    [router, pathname, searchParams],
  );

  const redirectToDashboard = useCallback(
    (error?: string) => {
      const dashboardUrl = error
        ? `/dashboard?error=${encodeURIComponent(error)}`
        : "/dashboard";
      router.push(dashboardUrl);
    },
    [router],
  );

  const redirectToInsiders = useCallback(
    (error?: string) => {
      const insidersUrl = error
        ? `/insiders?error=${encodeURIComponent(error)}`
        : "/insiders";
      router.push(insidersUrl);
    },
    [router],
  );

  return {
    redirectToLogin,
    redirectToDashboard,
    redirectToInsiders,
  };
}

/**
 * Hook for authentication state changes
 */
export function useAuthStateChange(
  callback: (isAuthenticated: boolean, user: AuthContextValue["user"]) => void,
) {
  const auth = useAuthContext();

  useEffect(() => {
    if (auth.isInitialized) {
      callback(auth.isAuthenticated, auth.user);
    }
  }, [auth.isInitialized, auth.isAuthenticated, auth.user, callback]);
}
