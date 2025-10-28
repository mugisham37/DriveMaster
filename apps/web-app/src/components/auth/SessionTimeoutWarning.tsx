"use client";

/**
 * Enhanced Session Timeout Warning Component
 *
 * Displays a modal warning when session is about to expire
 * with countdown timer and extension options
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SessionExpiredDialog } from "./SessionExpiredDialog";

// ============================================================================
// Component Props
// ============================================================================

export interface SessionTimeoutWarningProps {
  className?: string;
  showCountdown?: boolean;
  warningThreshold?: number; // Show warning when this many seconds remain
  autoExtendThreshold?: number; // Auto-extend if user is active within this many seconds
  onSessionExtended?: () => void;
  onSessionExpired?: () => void;
}

// ============================================================================
// Session Timeout Warning Component
// ============================================================================

// Simple throttle function
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

export function SessionTimeoutWarning({
  className = "",
  showCountdown = true,
  warningThreshold = 300, // 5 minutes
  autoExtendThreshold = 30, // 30 seconds
  onSessionExtended,
  onSessionExpired,
}: SessionTimeoutWarningProps) {
  const { state, refreshSession, logout, updateActivity } = useAuth();

  const [isVisible, setIsVisible] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // ============================================================================
  // Session Actions
  // ============================================================================

  const handleExtendSession = useCallback(async () => {
    if (isExtending) return;

    setIsExtending(true);

    try {
      await refreshSession();
      setIsVisible(false);
      onSessionExtended?.();
    } catch (error) {
      console.error("Failed to extend session:", error);
      // If extension fails, show expired dialog
      setIsVisible(false);
      setIsExpired(true);
    } finally {
      setIsExtending(false);
    }
  }, [isExtending, refreshSession, onSessionExtended]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setIsLoggingOut(false);
      setIsVisible(false);
    }
  }, [isLoggingOut, logout]);

  // ============================================================================
  // Activity Tracking
  // ============================================================================

  const handleUserActivity = useCallback(() => {
    setLastActivity(Date.now());
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const throttledHandler = throttle(handleUserActivity, 1000); // Throttle to once per second

    events.forEach((event) => {
      document.addEventListener(event, throttledHandler, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledHandler, true);
      });
    };
  }, [handleUserActivity]);

  // ============================================================================
  // Session Timeout Logic
  // ============================================================================

  useEffect(() => {
    if (!state.isAuthenticated || !state.sessionInfo.tokenExpiration) {
      setIsVisible(false);
      setIsExpired(false);
      return;
    }

    const checkSessionTimeout = () => {
      const now = Date.now();
      const expirationTime = state.sessionInfo.tokenExpiration!.getTime();
      const remaining = expirationTime - now;

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Session has expired
        setIsVisible(false);
        setIsExpired(true);
        onSessionExpired?.();
      } else if (remaining <= warningThreshold * 1000) {
        // Show warning
        setIsVisible(true);

        // Auto-extend if user was recently active
        if (
          remaining <= autoExtendThreshold * 1000 &&
          now - lastActivity < 10000
        ) {
          handleExtendSession();
        }
      } else {
        // Session is fine
        setIsVisible(false);
      }
    };

    // Check immediately
    checkSessionTimeout();

    // Check every second
    const interval = setInterval(checkSessionTimeout, 1000);

    return () => clearInterval(interval);
  }, [
    state.isAuthenticated,
    state.sessionInfo.tokenExpiration,
    warningThreshold,
    autoExtendThreshold,
    lastActivity,
    onSessionExpired,
    handleExtendSession,
  ]);

  const handleExpiredDialogReauth = useCallback(() => {
    setIsExpired(false);
    // The dialog will handle the re-authentication flow
  }, []);

  const handleExpiredDialogDismiss = useCallback(() => {
    setIsExpired(false);
    // The dialog will handle the dismissal
  }, []);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const formatTimeRemaining = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds} seconds`;
  };

  // ============================================================================
  // Render Session Expired Dialog
  // ============================================================================

  if (isExpired) {
    return (
      <SessionExpiredDialog
        isVisible={true}
        onReauthenticate={handleExpiredDialogReauth}
        onDismiss={handleExpiredDialogDismiss}
        className={className}
      />
    );
  }

  // ============================================================================
  // Render Warning Modal
  // ============================================================================

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-description"
      >
        {/* Modal */}
        <div
          className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${className}`}
        >
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3
                id="session-warning-title"
                className="text-lg font-medium text-gray-900"
              >
                Session Expiring Soon
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p
              id="session-warning-description"
              className="text-sm text-gray-600 mb-4"
            >
              Your session will expire soon due to inactivity. Would you like to
              extend your session?
            </p>

            {showCountdown && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-center">
                  <svg
                    className="h-4 w-4 text-yellow-600 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    Time remaining: {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleExtendSession}
              disabled={isExtending || isLoggingOut}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  </svg>
                  Extending...
                </>
              ) : (
                "Extend Session"
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isExtending || isLoggingOut}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  </svg>
                  Logging out...
                </>
              ) : (
                "Logout Now"
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Your session will be automatically extended if you continue to use
            the application.
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Session Timeout Provider Component
// ============================================================================

export interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  showWarningModal?: boolean;
  warningModalProps?: Partial<SessionTimeoutWarningProps>;
}

/**
 * Provider component that automatically shows session timeout warnings
 * Include this in your app layout to enable session timeout management
 */
export function SessionTimeoutProvider({
  children,
  showWarningModal = true,
  warningModalProps = {},
}: SessionTimeoutProviderProps) {
  return (
    <>
      {children}
      {showWarningModal && <SessionTimeoutWarning {...warningModalProps} />}
    </>
  );
}
