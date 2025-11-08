"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Client-side session utilities that preserve Rails behavior
 */

/**
 * Flash message management on client side
 */
export function useFlashMessages() {
  const getFlashMessage = (
    type: "success" | "error" | "notice",
  ): string | null => {
    if (typeof window === "undefined") return null;

    const message = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`flash_${type}=`))
      ?.split("=")[1];

    if (message) {
      // Clear the flash message after reading
      document.cookie = `flash_${type}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      return decodeURIComponent(message);
    }

    return null;
  };

  const setFlashMessage = (
    type: "success" | "error" | "notice",
    message: string,
  ) => {
    if (typeof window === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + 5 * 60 * 1000); // 5 minutes

    document.cookie = `flash_${type}=${encodeURIComponent(message)}; expires=${expires.toUTCString()}; path=/`;
  };

  // Get all flash messages in the format expected by FlashMessages component
  const getAllFlashMessages = () => {
    const success = getFlashMessage("success");
    const error = getFlashMessage("error");
    const notice = getFlashMessage("notice");

    const messages: Array<{
      type: "success" | "error" | "notice";
      message: string;
    }> = [];

    if (success) messages.push({ type: "success", message: success });
    if (error) messages.push({ type: "error", message: error });
    if (notice) messages.push({ type: "notice", message: notice });

    return messages;
  };

  return {
    getFlashMessage,
    setFlashMessage,
    getAllFlashMessages,
    flashMessages: getAllFlashMessages(),
  };
}

/**
 * Store return path for post-authentication redirect
 */
export function useReturnPath() {
  const storeReturnPath = (path: string) => {
    if (typeof window === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + 30 * 60 * 1000); // 30 minutes

    document.cookie = `return_path=${encodeURIComponent(path)}; expires=${expires.toUTCString()}; path=/`;
  };

  const getReturnPath = (): string | null => {
    if (typeof window === "undefined") return null;

    const path = document.cookie
      .split("; ")
      .find((row) => row.startsWith("return_path="))
      ?.split("=")[1];

    if (path) {
      // Clear the return path after reading
      document.cookie =
        "return_path=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return decodeURIComponent(path);
    }

    return null;
  };

  return {
    storeReturnPath,
    getReturnPath,
  };
}

/**
 * Hook to handle authentication redirects with Rails-like behavior
 */
export function useAuthRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { getReturnPath } = useReturnPath();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // User is authenticated, check for return path
      const returnPath = getReturnPath();
      if (returnPath && returnPath !== window.location.pathname) {
        router.push(returnPath);
      }
    }
  }, [isAuthenticated, isLoading, router, getReturnPath]);

  return {
    isLoading,
    isAuthenticated,
    user,
  };
}

/**
 * Hook to require authentication on client side with Rails-like redirect
 */
export function useRequireAuth(redirectTo?: string) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { storeReturnPath } = useReturnPath();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Store current path for post-auth redirect
      const currentPath = redirectTo || window.location.pathname;
      storeReturnPath(currentPath);

      // Redirect to sign in
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`,
      );
    }
  }, [isAuthenticated, isLoading, router, redirectTo, storeReturnPath]);

  return {
    isLoading,
    isAuthenticated,
    user,
  };
}

/**
 * Session timeout handling (matching Rails session timeout)
 */
export function useSessionTimeout() {
  const { user, isLoading, isAuthenticated, state } = useAuth();
  const router = useRouter();
  const { setFlashMessage } = useFlashMessages();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // Check session expiry every 5 minutes (matching Rails behavior)
    const interval = setInterval(
      () => {
        const now = Math.floor(Date.now() / 1000);
        const sessionExp = state.sessionInfo.tokenExpiration
          ? Math.floor(state.sessionInfo.tokenExpiration.getTime() / 1000)
          : 0;

        // Warn user 5 minutes before session expires
        if (sessionExp - now <= 300 && sessionExp - now > 0) {
          setFlashMessage(
            "notice",
            "Your session will expire soon. Please save your work.",
          );
        }

        // Session has expired
        if (sessionExp <= now) {
          setFlashMessage(
            "error",
            "Your session has expired. Please sign in again.",
          );
          router.push("/auth/signin");
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [
    user,
    isLoading,
    isAuthenticated,
    state.sessionInfo.tokenExpiration,
    router,
    setFlashMessage,
  ]);
}
