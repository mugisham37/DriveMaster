/**
 * Circuit Breaker UI Indicator
 * 
 * Displays circuit breaker status and provides user-friendly messages
 * when the circuit breaker opens due to high error rates.
 * 
 * Requirements: 11.9
 * Task: 14.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// Simple icon components
const ShieldAlertIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  estimatedRecoveryTime?: number; // in seconds
}

export interface CircuitBreakerIndicatorProps {
  status: CircuitBreakerStatus;
  serviceName?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStateColor(state: CircuitBreakerState): string {
  switch (state) {
    case 'closed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'open':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'half-open':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
}

function getStateIcon(state: CircuitBreakerState) {
  switch (state) {
    case 'closed':
      return <CheckCircleIcon />;
    case 'open':
      return <ShieldAlertIcon />;
    case 'half-open':
      return <AlertTriangleIcon />;
  }
}

function getStateTitle(state: CircuitBreakerState, serviceName?: string): string {
  const service = serviceName || 'Service';
  
  switch (state) {
    case 'closed':
      return `${service} Operating Normally`;
    case 'open':
      return `${service} Protection Active`;
    case 'half-open':
      return `${service} Testing Recovery`;
  }
}

function getStateDescription(state: CircuitBreakerState): string {
  switch (state) {
    case 'closed':
      return 'All systems are functioning normally. Your requests are being processed.';
    case 'open':
      return 'We\'ve temporarily limited requests to protect the service from high error rates. This helps ensure system stability and faster recovery.';
    case 'half-open':
      return 'We\'re testing if the service has recovered. Some requests are being allowed through.';
  }
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================================================
// Main Component
// ============================================================================

export function CircuitBreakerIndicator({
  status,
  serviceName = 'Service',
  onDismiss,
  onRetry,
  showDetails = false,
  className = '',
}: CircuitBreakerIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate time remaining until next attempt
  useEffect(() => {
    if (status.state !== 'open' || !status.nextAttemptTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((status.nextAttemptTime!.getTime() - now.getTime()) / 1000)
      );
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [status.state, status.nextAttemptTime]);

  // Don't show indicator if circuit is closed
  if (status.state === 'closed') {
    return null;
  }

  const stateColor = getStateColor(status.state);
  const stateIcon = getStateIcon(status.state);
  const stateTitle = getStateTitle(status.state, serviceName);
  const stateDescription = getStateDescription(status.state);

  return (
    <Alert className={`${stateColor} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {stateIcon}
        </div>

        <div className="flex-1 space-y-2">
          <AlertTitle className="text-base font-semibold">
            {stateTitle}
          </AlertTitle>

          <AlertDescription className="text-sm space-y-3">
            <p>{stateDescription}</p>

            {/* Time Remaining */}
            {status.state === 'open' && timeRemaining !== null && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClockIcon />
                  <span>
                    Estimated recovery: {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
                
                {status.estimatedRecoveryTime && (
                  <Progress 
                    value={((status.estimatedRecoveryTime - timeRemaining) / status.estimatedRecoveryTime) * 100}
                    className="h-2"
                  />
                )}
              </div>
            )}

            {/* What You Can Do */}
            <div className="space-y-2">
              <p className="font-medium text-sm">What you can do:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                {status.state === 'open' && (
                  <>
                    <li>Wait for the service to recover automatically</li>
                    <li>Use offline features if available</li>
                    <li>Try again in a few minutes</li>
                  </>
                )}
                {status.state === 'half-open' && (
                  <>
                    <li>Wait for recovery testing to complete</li>
                    <li>Avoid making multiple requests</li>
                    <li>Check back in a moment</li>
                  </>
                )}
              </ul>
            </div>

            {/* Details */}
            {showDetails && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <p>State: {status.state}</p>
                  <p>Failure Count: {status.failureCount}</p>
                  <p>Success Count: {status.successCount}</p>
                  {status.lastFailureTime && (
                    <p>Last Failure: {status.lastFailureTime.toLocaleString()}</p>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {onRetry && status.state === 'half-open' && (
                <Button onClick={onRetry} size="sm" variant="outline">
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button onClick={onDismiss} size="sm" variant="ghost">
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

// ============================================================================
// Compact Version
// ============================================================================

export interface CompactCircuitBreakerIndicatorProps {
  status: CircuitBreakerStatus;
  className?: string;
}

export function CompactCircuitBreakerIndicator({
  status,
  className = '',
}: CompactCircuitBreakerIndicatorProps) {
  if (status.state === 'closed') return null;

  const stateColor = getStateColor(status.state);
  const stateIcon = getStateIcon(status.state);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${stateColor} ${className}`}>
      {stateIcon}
      <span className="font-medium">
        {status.state === 'open' && 'Service Protection Active'}
        {status.state === 'half-open' && 'Testing Recovery'}
      </span>
    </div>
  );
}

// ============================================================================
// Banner Version (for top of page)
// ============================================================================

export interface CircuitBreakerBannerProps {
  status: CircuitBreakerStatus;
  serviceName?: string;
  onDismiss?: () => void;
  className?: string;
}

export function CircuitBreakerBanner({
  status,
  serviceName = 'Service',
  onDismiss,
  className = '',
}: CircuitBreakerBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (status.state !== 'open' || !status.nextAttemptTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((status.nextAttemptTime!.getTime() - now.getTime()) / 1000)
      );
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [status.state, status.nextAttemptTime]);

  if (status.state === 'closed') return null;

  const stateColor = getStateColor(status.state);

  return (
    <div className={`${stateColor} border-b px-4 py-3 ${className}`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStateIcon(status.state)}
          <div>
            <p className="font-semibold text-sm">
              {getStateTitle(status.state, serviceName)}
            </p>
            {status.state === 'open' && timeRemaining !== null && (
              <p className="text-xs">
                Recovery in ~{formatTimeRemaining(timeRemaining)}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <Button onClick={onDismiss} size="sm" variant="ghost">
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
