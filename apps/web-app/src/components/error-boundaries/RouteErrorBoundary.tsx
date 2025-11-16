'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Home, RefreshCw, Mail } from 'lucide-react';
import { errorMonitor } from '@/utils/error-monitor';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

/**
 * Route-level error boundary for catastrophic errors
 * Catches errors that would otherwise crash the entire page
 * Requirements: 14.3
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Generate unique error ID for tracking
    const errorId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Log error to monitoring service
    console.error('[RouteErrorBoundary] Caught error:', {
      errorId,
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
    });
    
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Record error in error monitor
    if (typeof window !== 'undefined') {
      errorMonitor.recordError(
        {
          type: 'server',
          message: error.message,
          code: 'ROUTE_ERROR',
          recoverable: true,
          timestamp: new Date(),
        },
        'route_render',
        {
          correlationId: errorId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          additionalData: {
            componentStack: errorInfo.componentStack,
          },
        }
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Preserve user state in sessionStorage
    this.preserveUserState();
  }

  preserveUserState = (): void => {
    try {
      if (typeof window !== 'undefined') {
        const stateToPreserve = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          errorId: this.state.errorId,
        };
        sessionStorage.setItem('error_state_backup', JSON.stringify(stateToPreserve));
      }
    } catch (err) {
      console.error('[RouteErrorBoundary] Failed to preserve state:', err);
    }
  };

  handleReset = (): void => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    // Try to restore preserved state
    try {
      if (typeof window !== 'undefined') {
        const preserved = sessionStorage.getItem('error_state_backup');
        if (preserved) {
          sessionStorage.removeItem('error_state_backup');
        }
      }
    } catch (err) {
      console.error('[RouteErrorBoundary] Failed to restore state:', err);
    }
  };

  handleGoHome = (): void => {
    // Clear error state before navigation
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('error_state_backup');
      }
    } catch (err) {
      console.error('[RouteErrorBoundary] Failed to clear state:', err);
    }
    window.location.href = '/learn';
  };

  handleContactSupport = (): void => {
    const subject = encodeURIComponent('Error Report');
    const body = encodeURIComponent(
      `Error ID: ${this.state.errorId}\n` +
      `Error: ${this.state.error?.message || 'Unknown error'}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\n\n` +
      `Please describe what you were doing when this error occurred:`
    );
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
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

              {this.state.errorId && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Error Reference ID:</p>
                  <code className="text-xs font-mono text-gray-700">{this.state.errorId}</code>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical details (development only)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button
                onClick={this.handleContactSupport}
                variant="outline"
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                If this problem persists, please include the error reference ID when contacting support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
