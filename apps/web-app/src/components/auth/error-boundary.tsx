/**
 * Authentication-specific Error Boundary Components
 * Provides specialized error handling for authentication failures
 */

"use client";

import React from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from "react-error-boundary";
import { AuthErrorHandler, ErrorLogger } from "../../lib/auth/error-handler";
import type { AuthError } from "../../types/auth-service";

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: AuthError, errorInfo: React.ErrorInfo) => void;
  fallback?: React.ComponentType<AuthErrorFallbackProps>;
  resetKeys?: Array<string | number | boolean | null | undefined>;
  context?: string;
}

interface AuthErrorFallbackProps extends FallbackProps {
  authError: AuthError;
  recoverySuggestions: string[];
}

/**
 * Default fallback component for authentication errors
 */
function DefaultAuthErrorFallback({
  resetErrorBoundary,
  authError,
  recoverySuggestions,
}: AuthErrorFallbackProps): React.ReactElement {
  return (
    <div className="auth-error-boundary p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Authentication Error
          </h3>

          <div className="mt-2 text-sm text-red-700">
            <p>{authError.message}</p>
          </div>

          {recoverySuggestions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-800">
                What you can try:
              </h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside space-y-1">
                {recoverySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex space-x-3">
            {authError.recoverable && (
              <button
                type="button"
                onClick={resetErrorBoundary}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Try Again
              </button>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-gray-100 text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Refresh Page
            </button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <details className="mt-4">
              <summary className="text-sm font-medium text-red-800 cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap bg-red-100 p-2 rounded">
                {JSON.stringify(authError, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Authentication Error Boundary Component
 */
export function AuthErrorBoundary({
  children,
  onError,
  fallback: FallbackComponent = DefaultAuthErrorFallback,
  resetKeys,
  context = "authentication",
}: AuthErrorBoundaryProps): React.ReactElement {
  const handleError = React.useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      // Process the error through our authentication error handler
      const authError = AuthErrorHandler.processError(error, context);

      // Log additional error info
      ErrorLogger.logError(authError, context, {
        componentStack: errorInfo.componentStack,
      });

      // Call custom error handler if provided
      onError?.(authError, errorInfo);
    },
    [onError, context],
  );

  const fallbackRender = React.useCallback(
    ({ error, resetErrorBoundary }: FallbackProps) => {
      const authError = AuthErrorHandler.processError(error, context);
      const recoverySuggestions =
        AuthErrorHandler.getRecoverySuggestions(authError);

      return (
        <FallbackComponent
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          authError={authError}
          recoverySuggestions={recoverySuggestions}
        />
      );
    },
    [FallbackComponent, context],
  );

  return (
    <ReactErrorBoundary
      onError={handleError}
      fallbackRender={fallbackRender}
      resetKeys={resetKeys || []}
    >
      {children}
    </ReactErrorBoundary>
  );
}

/**
 * Specialized error boundary for login forms
 */
export function LoginErrorBoundary({
  children,
  ...props
}: Omit<AuthErrorBoundaryProps, "context">): React.ReactElement {
  return (
    <AuthErrorBoundary context="login" {...props}>
      {children}
    </AuthErrorBoundary>
  );
}

/**
 * Specialized error boundary for OAuth flows
 */
export function OAuthErrorBoundary({
  children,
  ...props
}: Omit<AuthErrorBoundaryProps, "context">): React.ReactElement {
  return (
    <AuthErrorBoundary context="oauth" {...props}>
      {children}
    </AuthErrorBoundary>
  );
}

/**
 * Specialized error boundary for token refresh operations
 */
export function TokenRefreshErrorBoundary({
  children,
  ...props
}: Omit<AuthErrorBoundaryProps, "context">): React.ReactElement {
  return (
    <AuthErrorBoundary context="token_refresh" {...props}>
      {children}
    </AuthErrorBoundary>
  );
}

/**
 * Hook for handling authentication errors in components
 */
export function useAuthErrorHandler(context?: string) {
  return React.useCallback(
    (error: unknown) => {
      const authError = AuthErrorHandler.processError(error, context);

      // You could integrate with a toast system here
      // toast.error(authError.message)

      return authError;
    },
    [context],
  );
}

/**
 * Hook for getting error recovery actions
 */
export function useErrorRecovery() {
  return React.useCallback((error: AuthError) => {
    const suggestions = AuthErrorHandler.getRecoverySuggestions(error);

    const actions = {
      retry: error.recoverable,
      refresh: true,
      suggestions,
      retryAfter: error.retryAfter,
    };

    return actions;
  }, []);
}
