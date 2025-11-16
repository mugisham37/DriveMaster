'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Route-level error boundary for catastrophic errors
 * Catches errors that would otherwise crash the entire page
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to monitoring service
    console.error('Route Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Send to error monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as unknown as { errorMonitor?: { captureException: (error: Error, context: unknown) => void } }).errorMonitor) {
      (window as unknown as { errorMonitor: { captureException: (error: Error, context: unknown) => void } }).errorMonitor.captureException(error, {
        context: 'RouteErrorBoundary',
        errorInfo,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-2xl w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-xl font-semibold">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="mt-2 text-base">
                We encountered an unexpected error. Don&apos;t worry, your progress has been saved.
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-2">What happened?</h3>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical details (development only)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                If this problem persists, please{' '}
                <a
                  href="/support"
                  className="text-blue-600 hover:underline"
                >
                  contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
