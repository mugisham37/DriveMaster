'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary for component errors
 * Prevents a single component failure from crashing the entire page
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static override getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to monitoring service
    console.error(
      `Feature Error Boundary (${this.props.featureName || 'Unknown'}) caught an error:`,
      error,
      errorInfo
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
    });

    // Send to error monitoring service
    if (typeof window !== 'undefined' && (window as unknown as { errorMonitor?: { captureException: (error: Error, context: unknown) => void } }).errorMonitor) {
      (window as unknown as { errorMonitor: { captureException: (error: Error, context: unknown) => void } }).errorMonitor.captureException(error, {
        context: 'FeatureErrorBoundary',
        feature: this.props.featureName,
        errorInfo,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {this.props.featureName
                ? `${this.props.featureName} Error`
                : 'Component Error'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                This feature encountered an error and couldn&apos;t load properly.
              </p>
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
