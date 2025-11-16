'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { errorMonitor } from '@/utils/error-monitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDismiss?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  isDismissed: boolean;
}

/**
 * Feature-level error boundary for component errors
 * Prevents a single component failure from crashing the entire page
 * Requirements: 14.3
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      isDismissed: false,
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
    const errorId = `feature_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Log error to monitoring service
    console.error(
      `[FeatureErrorBoundary] ${this.props.featureName || 'Unknown'} caught error:`,
      {
        errorId,
        error,
        errorInfo,
        timestamp: new Date().toISOString(),
      }
    );

    this.setState({
      error,
      errorId,
    });

    // Record error in error monitor
    if (typeof window !== 'undefined') {
      errorMonitor.recordError(
        {
          type: 'server',
          message: error.message,
          code: 'FEATURE_ERROR',
          recoverable: true,
          timestamp: new Date(),
        },
        `feature_${this.props.featureName || 'unknown'}`,
        {
          correlationId: errorId,
          url: window.location.href,
          additionalData: {
            featureName: this.props.featureName,
            componentStack: errorInfo.componentStack,
          },
        }
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      isDismissed: false,
    });
  };

  handleDismiss = (): void => {
    this.setState({
      isDismissed: true,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError && !this.state.isDismissed) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4">
          <Alert variant="destructive" className="relative">
            {this.props.showDismiss && (
              <button
                onClick={this.handleDismiss}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {this.props.featureName
                ? `${this.props.featureName} Error`
                : 'Component Error'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3 text-sm">
                This feature encountered an error and couldn&apos;t load properly. 
                The rest of the page should continue to work normally.
              </p>
              {this.state.errorId && (
                <p className="mb-3 text-xs text-gray-600">
                  Error ID: <code className="font-mono">{this.state.errorId}</code>
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Try Again
                </Button>
                {this.props.showDismiss && (
                  <Button
                    onClick={this.handleDismiss}
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // If dismissed, render nothing (feature is hidden)
    if (this.state.isDismissed) {
      return null;
    }

    return this.props.children;
  }
}
