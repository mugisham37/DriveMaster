/**
 * Circuit Breaker Status Component
 * Displays circuit breaker state and recovery information
 */

'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import type { CircuitBreakerStats } from '@/lib/error-handling/circuit-breaker';
import { cn } from '@/lib/utils';

interface CircuitBreakerStatusProps {
  stats: CircuitBreakerStats;
  onReset?: () => void;
  className?: string;
}

export const CircuitBreakerStatus: React.FC<CircuitBreakerStatusProps> = ({
  stats,
  onReset,
  className,
}) => {
  const getStateColor = () => {
    switch (stats.state) {
      case 'closed':
        return 'text-green-600';
      case 'half-open':
        return 'text-yellow-600';
      case 'open':
        return 'text-red-600';
    }
  };

  const getStateIcon = () => {
    switch (stats.state) {
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      case 'half-open':
        return <Clock className="h-4 w-4" />;
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStateMessage = () => {
    switch (stats.state) {
      case 'closed':
        return 'Service is operating normally';
      case 'half-open':
        return 'Testing service recovery...';
      case 'open':
        return 'Service temporarily unavailable';
    }
  };

  if (stats.state === 'closed') {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Alert variant={stats.state === 'open' ? 'destructive' : 'default'}>
        {getStateIcon()}
        <AlertTitle className={getStateColor()}>
          {getStateMessage()}
        </AlertTitle>
        <AlertDescription className="space-y-2">
          {stats.state === 'open' && stats.nextAttemptTime && (
            <p>
              Automatic retry at{' '}
              {stats.nextAttemptTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}

          {stats.state === 'half-open' && (
            <p>
              Testing connection stability. {stats.successes} successful attempts so far.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {onReset && (
              <Button onClick={onReset} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Now
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            <p>Failures: {stats.failures}</p>
            {stats.lastFailureTime && (
              <p>
                Last failure:{' '}
                {stats.lastFailureTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
