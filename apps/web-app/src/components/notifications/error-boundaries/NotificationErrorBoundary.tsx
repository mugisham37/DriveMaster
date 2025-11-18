/**
 * Notification Error Boundary
 * Catches and handles errors in notification components
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  NotificationError,
  NotificationErrorHandler,
} from '@/lib/error-handling/notification-errors';

interface Props {
  children: ReactNode;
  fallback?: (error: NotificationError, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: NotificationError;
}

export class NotificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const notificationError = NotificationErrorHandler.createError(
      'service',
      error.message,
      { details: { stack: error.stack } }
    );

    return {
      hasError: true,
      error: notificationError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    NotificationErrorHandler.logError(
      this.state.error || NotificationErrorHandler.createError('service', error.message)
    );

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({
  error,
  reset,
}: {
  error: NotificationError;
  reset: () => void;
}) {
  const userMessage = NotificationErrorHandler.getUserMessage(error);
  const recoveryAction = NotificationErrorHandler.getRecoveryAction(error);

  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{userMessage}</p>
          {error.recoverable && (
            <div className="flex gap-2 mt-4">
              <Button onClick={reset} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              {recoveryAction && (
                <Button onClick={recoveryAction.action} size="sm">
                  {recoveryAction.label}
                </Button>
              )}
            </div>
          )}
          {!error.recoverable && (
            <p className="text-sm text-muted-foreground mt-2">
              Please refresh the page or contact support if the problem persists.
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Hook to use error boundary imperatively
 */
export function useNotificationErrorBoundary() {
  const [error, setError] = React.useState<NotificationError | null>(null);

  const showError = React.useCallback((err: NotificationError) => {
    setError(err);
    NotificationErrorHandler.logError(err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    showError,
    clearError,
  };
}
