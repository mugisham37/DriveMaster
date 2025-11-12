'use client';

/**
 * AuthErrorBoundary Component
 * Error boundary specifically for authentication pages with recovery options
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { AuthErrorHandler } from '@/lib/auth/error-handler';
import type { AuthError } from '@/types/auth-service';

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: AuthError | null;
  errorInfo: React.ErrorInfo | null;
  resetKey: number;
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Process error through auth error handler
    const authError = AuthErrorHandler.processError(error, 'error_boundary');

    return {
      hasError: true,
      error: authError,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    const authError = AuthErrorHandler.processError(error, 'error_boundary');

    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught error:', {
        error: authError,
        errorInfo,
      });
    }

    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: this.state.resetKey + 1,
    });

    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    // In a real implementation, this would open a support form or send error report
    const errorDetails = {
      message: this.state.error?.message,
      type: this.state.error?.type,
      code: this.state.error?.code,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('Error report:', errorDetails);
    alert('Error report functionality would be implemented here');
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const recoverySuggestions = error ? AuthErrorHandler.getRecoverySuggestions(error) : [];

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
                  <CardDescription className="mt-2">
                    {error?.message || 'An unexpected error occurred while loading this page.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Type Badge */}
              {error?.type && (
                <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  Error Type: {error.type}
                  {error.code && ` (${error.code})`}
                </div>
              )}

              {/* Recovery Suggestions */}
              {recoverySuggestions.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <p className="mb-2 font-medium">Try the following:</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {recoverySuggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details (Development Only) */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="rounded-lg border bg-muted/50 p-4">
                  <summary className="cursor-pointer font-medium">Technical Details</summary>
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Error Message:</p>
                      <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                        {error?.message}
                      </pre>
                    </div>
                    {error?.details && (
                      <div>
                        <p className="text-sm font-medium">Error Details:</p>
                        <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Component Stack:</p>
                      <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                Go Home
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button onClick={this.handleReportError} variant="ghost" className="gap-2">
                  <Bug className="h-4 w-4" aria-hidden="true" />
                  Report Error
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Render children with reset key to force remount on reset
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

/**
 * Functional wrapper for AuthErrorBoundary with hooks support
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  return function WithAuthErrorBoundary(props: P) {
    return (
      <AuthErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
}
