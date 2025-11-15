/**
 * Enhanced Error Display Component
 * 
 * Provides user-friendly error messages with specific recovery actions.
 * Implements requirements for clear error communication and recovery options.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.8
 * Task: 14.2
 */

'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { UserServiceError } from '@/types/user-service';

// Simple icon components (avoiding external dependencies)
const AlertCircleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const WifiOffIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
    <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
    <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
    <path d="M5 13a10 10 0 0 1 5.24-2.76" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

export interface EnhancedErrorDisplayProps {
  error: UserServiceError | Error | string;
  context?: string;
  onRetry?: () => void;
  onCheckConnection?: () => void;
  onSignInAgain?: () => void;
  onContactSupport?: () => void;
  showCorrelationId?: boolean;
  className?: string;
}

// ============================================================================
// Error Type Detection
// ============================================================================

function isUserServiceError(error: unknown): error is UserServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  );
}

function getErrorType(error: UserServiceError | Error | string): string {
  if (typeof error === 'string') return 'unknown';
  if (isUserServiceError(error)) return error.type || 'unknown';
  return 'unknown';
}

function getErrorMessage(error: UserServiceError | Error | string): string {
  if (typeof error === 'string') return error;
  if ('message' in error) return error.message;
  return 'An unexpected error occurred';
}

function getCorrelationId(error: UserServiceError | Error | string): string | undefined {
  if (isUserServiceError(error)) return error.correlationId;
  return undefined;
}

function isRecoverable(error: UserServiceError | Error | string): boolean {
  if (isUserServiceError(error)) return error.recoverable ?? true;
  return true;
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<string, {
  title: string;
  description: string;
  actions: string[];
}> = {
  network: {
    title: 'Connection Problem',
    description: 'We couldn\'t reach our servers. Please check your internet connection.',
    actions: ['Check your internet connection', 'Try again in a moment', 'Refresh the page'],
  },
  timeout: {
    title: 'Request Timeout',
    description: 'The request took too long to complete. This might be due to a slow connection.',
    actions: ['Wait a moment and try again', 'Check your connection speed', 'Refresh the page'],
  },
  authorization: {
    title: 'Authentication Required',
    description: 'Your session has expired or you don\'t have permission for this action.',
    actions: ['Sign in again', 'Refresh your session', 'Contact support if this persists'],
  },
  validation: {
    title: 'Invalid Information',
    description: 'The information provided doesn\'t meet our requirements.',
    actions: ['Check your input for errors', 'Ensure all required fields are filled', 'Try again with valid data'],
  },
  service_unavailable: {
    title: 'Service Temporarily Unavailable',
    description: 'Our service is temporarily unavailable. We\'re working to restore it.',
    actions: ['Try again in a few minutes', 'Check our status page', 'Use offline features if available'],
  },
  circuit_breaker: {
    title: 'Service Protection Active',
    description: 'We\'ve temporarily limited requests to protect the service. Please wait a moment.',
    actions: ['Wait a few minutes', 'Try again later', 'Use offline features if available'],
  },
  rate_limit: {
    title: 'Too Many Requests',
    description: 'You\'ve made too many requests. Please slow down and try again.',
    actions: ['Wait a moment', 'Reduce the frequency of your actions', 'Try again in a few minutes'],
  },
  unknown: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Our team has been notified.',
    actions: ['Try refreshing the page', 'Wait a moment and try again', 'Contact support if this persists'],
  },
};

function getErrorInfo(errorType: string) {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.unknown;
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedErrorDisplay({
  error,
  context,
  onRetry,
  onCheckConnection,
  onSignInAgain,
  onContactSupport,
  showCorrelationId = true,
  className = '',
}: EnhancedErrorDisplayProps) {
  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(error);
  const correlationId = getCorrelationId(error);
  const recoverable = isRecoverable(error);
  const errorInfo = getErrorInfo(errorType);

  // Determine which action buttons to show
  const showCheckConnection = errorType === 'network' && onCheckConnection;
  const showSignInAgain = errorType === 'authorization' && onSignInAgain;
  const showRetry = recoverable && onRetry;

  return (
    <Card className={`border-destructive ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-destructive mt-1">
            <AlertCircleIcon />
          </div>

          <div className="flex-1 space-y-4">
            {/* Title and Description */}
            <div>
              <h3 className="text-lg font-semibold text-destructive mb-2">
                {errorInfo.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {errorInfo.description}
              </p>
              {context && (
                <p className="text-xs text-muted-foreground">
                  <strong>Context:</strong> {context}
                </p>
              )}
            </div>

            {/* Actual Error Message */}
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertDescription className="text-sm">
                {errorMessage}
              </AlertDescription>
            </Alert>

            {/* What You Can Do */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <InfoIcon />
                What you can do:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                {errorInfo.actions.map((action, index) => (
                  <li key={index} className="list-disc">
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {showRetry && (
                <Button onClick={onRetry} size="sm" variant="default">
                  <RefreshIcon />
                  <span className="ml-2">Try Again</span>
                </Button>
              )}

              {showCheckConnection && (
                <Button onClick={onCheckConnection} size="sm" variant="outline">
                  <WifiOffIcon />
                  <span className="ml-2">Check Connection</span>
                </Button>
              )}

              {showSignInAgain && (
                <Button onClick={onSignInAgain} size="sm" variant="outline">
                  <ShieldIcon />
                  <span className="ml-2">Sign In Again</span>
                </Button>
              )}

              {onContactSupport && (
                <Button onClick={onContactSupport} size="sm" variant="ghost">
                  Contact Support
                </Button>
              )}
            </div>

            {/* Correlation ID for Support */}
            {showCorrelationId && correlationId && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground font-mono">
                  <strong>Error ID:</strong> {correlationId}
                  <span className="ml-2 text-xs">(Share this with support)</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compact Inline Error Display
// ============================================================================

export interface InlineErrorDisplayProps {
  error: UserServiceError | Error | string;
  onRetry?: () => void;
  className?: string;
}

export function InlineErrorDisplay({
  error,
  onRetry,
  className = '',
}: InlineErrorDisplayProps) {
  const errorMessage = getErrorMessage(error);
  const recoverable = isRecoverable(error);

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircleIcon />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">{errorMessage}</span>
        {recoverable && onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline" className="ml-4">
            <RefreshIcon />
            <span className="ml-1">Retry</span>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Circuit Breaker Status Display
// ============================================================================

export interface CircuitBreakerStatusProps {
  isOpen: boolean;
  estimatedRecoveryTime?: number; // in seconds
  onDismiss?: () => void;
  className?: string;
}

export function CircuitBreakerStatus({
  isOpen,
  estimatedRecoveryTime,
  onDismiss,
  className = '',
}: CircuitBreakerStatusProps) {
  if (!isOpen) return null;

  const recoveryMinutes = estimatedRecoveryTime
    ? Math.ceil(estimatedRecoveryTime / 60)
    : 5;

  return (
    <Alert variant="destructive" className={className}>
      <ClockIcon />
      <AlertTitle>Service Protection Active</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          We've temporarily limited requests to protect the service from high error rates.
          This is a temporary measure to ensure system stability.
        </p>
        <p className="text-sm font-medium">
          Estimated recovery time: ~{recoveryMinutes} minute{recoveryMinutes !== 1 ? 's' : ''}
        </p>
        {onDismiss && (
          <Button onClick={onDismiss} size="sm" variant="outline" className="mt-2">
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Offline Mode Indicator
// ============================================================================

export interface OfflineModeIndicatorProps {
  isOffline: boolean;
  onRetryConnection?: () => void;
  className?: string;
}

export function OfflineModeIndicator({
  isOffline,
  onRetryConnection,
  className = '',
}: OfflineModeIndicatorProps) {
  if (!isOffline) return null;

  return (
    <Alert className={`border-orange-500 bg-orange-50 ${className}`}>
      <WifiOffIcon />
      <AlertTitle className="text-orange-900">You're Offline</AlertTitle>
      <AlertDescription className="text-orange-800 space-y-2">
        <p className="text-sm">
          Your device has lost internet connection. Some features may be limited.
        </p>
        {onRetryConnection && (
          <Button onClick={onRetryConnection} size="sm" variant="outline" className="mt-2">
            <RefreshIcon />
            <span className="ml-2">Retry Connection</span>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
