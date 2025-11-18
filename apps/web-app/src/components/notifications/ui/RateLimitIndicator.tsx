/**
 * Rate Limit Indicator Component
 * Displays current usage and limits to users
 */

'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Info } from 'lucide-react';
import type { RateLimitStatus } from '@/lib/error-handling/rate-limiter';
import { cn } from '@/lib/utils';

interface RateLimitIndicatorProps {
  status: RateLimitStatus;
  showDetails?: boolean;
  className?: string;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  status,
  showDetails = true,
  className,
}) => {
  const hourlyPercentage = (status.hourlyUsed / (status.hourlyUsed + status.hourlyRemaining)) * 100;
  const dailyPercentage = (status.dailyUsed / (status.dailyUsed + status.dailyRemaining)) * 100;

  const isApproachingLimit = hourlyPercentage >= 80 || dailyPercentage >= 80;
  const isLimited = status.isLimited;

  if (!isApproachingLimit && !isLimited && !showDetails) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {isLimited && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Notification Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached your notification limit. Critical notifications will still be
            delivered. Limit resets at{' '}
            {status.resetTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </AlertDescription>
        </Alert>
      )}

      {isApproachingLimit && !isLimited && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Approaching Notification Limit</AlertTitle>
          <AlertDescription>
            You're approaching your notification limit. Consider adjusting your preferences
            to reduce notification frequency.
          </AlertDescription>
        </Alert>
      )}

      {showDetails && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Hourly Usage</span>
              <span className="font-medium">
                {status.hourlyUsed} / {status.hourlyUsed + status.hourlyRemaining}
              </span>
            </div>
            <Progress value={hourlyPercentage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Daily Usage</span>
              <span className="font-medium">
                {status.dailyUsed} / {status.dailyUsed + status.dailyRemaining}
              </span>
            </div>
            <Progress value={dailyPercentage} className="h-2" />
          </div>

          <p className="text-xs text-muted-foreground">
            Resets at{' '}
            {status.resetTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
};
