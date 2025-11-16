'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  WifiOff, 
  Lock, 
  Shield, 
  AlertTriangle, 
  Search,
  Server,
  RefreshCw,
  Home
} from 'lucide-react';
import type { ContentServiceError } from '@/types/errors';

export interface ApiErrorHandlerProps {
  error: ContentServiceError | Error | unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  showActions?: boolean;
}

/**
 * API Error Handler Component
 * Displays user-friendly error messages based on error type
 * Requirements: 14.1, 14.2, 14.4, 14.5
 */
export function ApiErrorHandler({
  error,
  onRetry,
  onDismiss,
  showActions = true,
}: ApiErrorHandlerProps) {
  // Normalize error to ContentServiceError
  const normalizedError = normalizeError(error);
  const errorConfig = getErrorConfig(normalizedError);

  const handleGoHome = () => {
    window.location.href = '/learn';
  };

  return (
    <Alert variant={errorConfig.variant} className="my-4">
      {errorConfig.icon}
      <AlertTitle className="font-semibold">{errorConfig.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{errorConfig.message}</p>
        
        {errorConfig.actionItems.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-2">What you can do:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {errorConfig.actionItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4">
            {onRetry && errorConfig.showRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
            )}
            {errorConfig.showGoHome && (
              <Button
                onClick={handleGoHome}
                variant="outline"
                size="sm"
              >
                <Home className="mr-2 h-3 w-3" />
                Go to Dashboard
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Helper functions

function normalizeError(error: unknown): ContentServiceError {
  if (isContentServiceError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      type: 'server',
      message: error.message,
      code: 'UNKNOWN_ERROR',
      recoverable: false,
      timestamp: new Date(),
    };
  }

  return {
    type: 'server',
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    recoverable: false,
    timestamp: new Date(),
  };
}

function isContentServiceError(error: unknown): error is ContentServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'timestamp' in error
  );
}

interface ErrorConfig {
  title: string;
  message: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive';
  actionItems: string[];
  showRetry: boolean;
  showGoHome: boolean;
}

function getErrorConfig(error: ContentServiceError): ErrorConfig {
  const iconClass = "h-4 w-4";

  switch (error.type) {
    case 'network':
      return {
        title: 'Connection Problem',
        message: 'We couldn\'t connect to the server. Please check your internet connection and try again.',
        icon: <WifiOff className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists',
        ],
        showRetry: true,
        showGoHome: false,
      };

    case 'authentication':
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again to continue.',
        icon: <Lock className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Sign in again',
          'Clear browser cache and cookies if the problem persists',
        ],
        showRetry: false,
        showGoHome: true,
      };

    case 'authorization':
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        icon: <Shield className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Contact your administrator for access',
          'Verify you have the correct permissions',
        ],
        showRetry: false,
        showGoHome: true,
      };

    case 'validation':
      return {
        title: 'Invalid Input',
        message: error.message || 'Please check your input and try again.',
        icon: <AlertTriangle className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Review all required fields',
          'Ensure all inputs meet the specified requirements',
        ],
        showRetry: false,
        showGoHome: false,
      };

    case 'not_found':
      return {
        title: 'Not Found',
        message: 'The requested item could not be found. It may have been moved or deleted.',
        icon: <Search className={iconClass} />,
        variant: 'default',
        actionItems: [
          'Verify the item exists',
          'Check the URL or search again',
          'Contact support if you believe this is an error',
        ],
        showRetry: false,
        showGoHome: true,
      };

    case 'conflict':
      return {
        title: 'Conflict Detected',
        message: 'This item was modified by someone else. Please refresh and try again.',
        icon: <AlertTriangle className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Refresh the page to get the latest data',
          'Try your action again',
        ],
        showRetry: true,
        showGoHome: false,
      };

    case 'timeout':
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
        icon: <AlertCircle className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Try again with a smaller request',
          'Check your internet connection',
          'Contact support if timeouts persist',
        ],
        showRetry: true,
        showGoHome: false,
      };

    case 'rate_limit':
      const resetTime = 'resetTime' in error ? error.resetTime : null;
      const waitTime = resetTime 
        ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        : 60;
      
      return {
        title: 'Rate Limit Exceeded',
        message: `Too many requests. Please wait ${waitTime} seconds and try again.`,
        icon: <AlertTriangle className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Wait a moment before trying again',
          'Reduce the frequency of your requests',
        ],
        showRetry: true,
        showGoHome: false,
      };

    case 'service_unavailable':
      return {
        title: 'Service Temporarily Unavailable',
        message: 'The service is temporarily unavailable. Please try again in a few minutes.',
        icon: <Server className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Wait a few minutes and try again',
          'Check the service status page',
          'Contact support if the issue persists',
        ],
        showRetry: true,
        showGoHome: true,
      };

    case 'server':
    default:
      return {
        title: 'Server Error',
        message: 'An unexpected error occurred on the server. Please try again later.',
        icon: <AlertCircle className={iconClass} />,
        variant: 'destructive',
        actionItems: [
          'Try again in a few minutes',
          'Contact support with the error details',
        ],
        showRetry: true,
        showGoHome: true,
      };
  }
}
