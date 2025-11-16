/**
 * API Error Handler Hook
 * 
 * Provides comprehensive error handling for API calls with automatic retry,
 * user-friendly messages, and recovery strategies.
 * 
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorHandler } from '@/utils/error-handler';
import type { ContentServiceError } from '@/types/errors';
import type { ErrorReport } from '@/utils/error-handler';

export interface UseApiErrorHandlerOptions {
  onError?: (error: ContentServiceError) => void;
  onRetry?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
  showNotification?: boolean;
}

export interface ApiErrorState {
  error: ContentServiceError | null;
  errorReport: ErrorReport | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
}

/**
 * Hook for handling API errors with automatic recovery strategies
 */
export function useApiErrorHandler(options: UseApiErrorHandlerOptions = {}) {
  const {
    onError,
    onRetry,
    autoRetry = false,
    maxRetries = 3,
    showNotification = true,
  } = options;

  const router = useRouter();
  const [state, setState] = useState<ApiErrorState>({
    error: null,
    errorReport: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
  });

  /**
   * Handles an API error
   */
  const handleError = useCallback(
    (error: unknown, context?: Record<string, unknown>) => {
      // Generate error report
      const errorReport = ErrorHandler.handleApiError(error, context);
      const contentError = errorReport.error;

      // Update state
      setState({
        error: contentError,
        errorReport,
        isRetrying: false,
        retryCount: 0,
        canRetry: ErrorHandler.isRetryableError(contentError),
      });

      // Call custom error handler
      if (onError) {
        onError(contentError);
      }

      // Show notification if enabled
      if (showNotification && typeof window !== 'undefined') {
        showErrorNotification(errorReport);
      }

      // Handle specific error types
      handleSpecificError(contentError, errorReport);

      return errorReport;
    },
    [onError, showNotification]
  );

  /**
   * Handles specific error types with appropriate actions
   */
  const handleSpecificError = useCallback(
    (error: ContentServiceError, report: ErrorReport) => {
      switch (error.type) {
        case 'authentication':
          // Redirect to sign-in with return URL
          const returnUrl = encodeURIComponent(window.location.pathname);
          setTimeout(() => {
            router.push(`/auth/signin?returnUrl=${returnUrl}`);
          }, 2000);
          break;

        case 'authorization':
          // Show access denied message
          console.warn('[ApiErrorHandler] Authorization error:', report.userMessage);
          break;

        case 'not_found':
          // Log not found for content audit
          console.warn('[ApiErrorHandler] Resource not found:', {
            error,
            url: window.location.href,
          });
          break;

        case 'service_unavailable':
          // Check if circuit breaker is open
          if ('cause' in error && error.cause === 'circuit_breaker_open') {
            console.warn('[ApiErrorHandler] Circuit breaker is open');
          }
          break;

        default:
          break;
      }
    },
    [router]
  );

  /**
   * Retries the failed operation
   */
  const retry = useCallback(
    async (operation: () => Promise<unknown>) => {
      if (!state.canRetry || state.retryCount >= maxRetries) {
        return;
      }

      setState((prev) => ({
        ...prev,
        isRetrying: true,
        retryCount: prev.retryCount + 1,
      }));

      if (onRetry) {
        onRetry();
      }

      try {
        const result = await operation();
        
        // Success - clear error
        setState({
          error: null,
          errorReport: null,
          isRetrying: false,
          retryCount: 0,
          canRetry: false,
        });

        return result;
      } catch (error) {
        // Retry failed - handle error again
        handleError(error);
        throw error;
      }
    },
    [state.canRetry, state.retryCount, maxRetries, onRetry, handleError]
  );

  /**
   * Clears the current error
   */
  const clearError = useCallback(() => {
    setState({
      error: null,
      errorReport: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false,
    });
  }, []);

  /**
   * Auto-retry if enabled
   */
  useEffect(() => {
    if (
      autoRetry &&
      state.error &&
      state.canRetry &&
      state.retryCount < maxRetries &&
      !state.isRetrying
    ) {
      const delay = ErrorHandler.getRetryDelay(state.error, state.retryCount);
      
      const timeoutId = setTimeout(() => {
        if (onRetry) {
          onRetry();
        }
      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [autoRetry, state, maxRetries, onRetry]);

  return {
    error: state.error,
    errorReport: state.errorReport,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    canRetry: state.canRetry,
    handleError,
    retry,
    clearError,
  };
}

/**
 * Shows an error notification to the user
 */
function showErrorNotification(errorReport: ErrorReport) {
  // Check if we have a toast notification system
  if (typeof window !== 'undefined' && 'toast' in window) {
    const toast = (window as unknown as { toast: (options: { title: string; description: string; variant: string }) => void }).toast;
    toast({
      title: getErrorTitle(errorReport.error.type),
      description: errorReport.userMessage,
      variant: 'destructive',
    });
  }
}

/**
 * Gets a user-friendly title for error type
 */
function getErrorTitle(errorType: ContentServiceError['type']): string {
  const titles: Record<ContentServiceError['type'], string> = {
    network: 'Connection Problem',
    authentication: 'Session Expired',
    authorization: 'Access Denied',
    validation: 'Invalid Input',
    not_found: 'Not Found',
    conflict: 'Conflict Detected',
    timeout: 'Request Timeout',
    rate_limit: 'Rate Limit Exceeded',
    service_unavailable: 'Service Unavailable',
    server: 'Server Error',
  };

  return titles[errorType] || 'Error';
}

/**
 * Hook for handling form validation errors
 */
export function useFormValidationErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors,
  };
}
