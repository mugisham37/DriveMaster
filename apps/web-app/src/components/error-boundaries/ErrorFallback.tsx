'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  errorId?: string;
  resetError: () => void;
  level: 'route' | 'feature';
}

/**
 * Reusable error fallback component
 * Can be used with both route-level and feature-level error boundaries
 * Requirements: 14.3
 */
export function ErrorFallback({
  error,
  errorId,
  resetError,
  level,
}: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/learn';
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Error Report');
    const body = encodeURIComponent(
      `Error ID: ${errorId || 'N/A'}\n` +
      `Error: ${error.message}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\n\n` +
      `Please describe what you were doing when this error occurred:`
    );
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
  };

  if (level === 'route') {
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
              {error.message || 'An unexpected error occurred'}
            </p>

            {errorId && (
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Error Reference ID:</p>
                <code className="text-xs font-mono text-gray-700">{errorId}</code>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Button
              onClick={resetError}
              variant="default"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button
              onClick={handleContactSupport}
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

  // Feature-level fallback
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Component Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3 text-sm">
            This feature encountered an error and couldn&apos;t load properly.
          </p>
          {errorId && (
            <p className="mb-3 text-xs text-gray-600">
              Error ID: <code className="font-mono">{errorId}</code>
            </p>
          )}
          <Button
            onClick={resetError}
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
