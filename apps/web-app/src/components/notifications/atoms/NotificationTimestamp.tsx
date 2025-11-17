'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useEffect, useState } from 'react';

export interface NotificationTimestampProps {
  timestamp: Date;
  format?: 'relative' | 'absolute' | 'both';
  timezone?: string;
  className?: string;
}

export function NotificationTimestamp({
  timestamp,
  format: displayFormat = 'relative',
  timezone,
  className,
}: NotificationTimestampProps) {
  const [relativeTime, setRelativeTime] = useState('');

  // Update relative time every minute for recent timestamps
  useEffect(() => {
    const updateRelativeTime = () => {
      try {
        setRelativeTime(formatDistanceToNow(timestamp, { addSuffix: true }));
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        setRelativeTime('Invalid date');
      }
    };

    updateRelativeTime();

    // Only update if timestamp is within last 24 hours
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    if (diff < oneDayInMs) {
      const interval = setInterval(updateRelativeTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
    
    return undefined;
  }, [timestamp]);

  const getAbsoluteFormat = () => {
    if (isToday(timestamp)) {
      return `Today at ${format(timestamp, 'h:mm a')}`;
    }
    if (isYesterday(timestamp)) {
      return `Yesterday at ${format(timestamp, 'h:mm a')}`;
    }
    return format(timestamp, 'MMM d, yyyy');
  };

  const displayText =
    displayFormat === 'relative'
      ? relativeTime
      : displayFormat === 'absolute'
        ? getAbsoluteFormat()
        : `${relativeTime} (${getAbsoluteFormat()})`;

  const exactTimestamp = format(timestamp, 'PPpp'); // e.g., "Apr 29, 2021, 12:00:00 PM"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time
            dateTime={timestamp.toISOString()}
            className={cn('text-sm text-muted-foreground cursor-help', className)}
          >
            {displayText}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{exactTimestamp}</p>
          {timezone && <p className="text-xs text-muted-foreground mt-1">{timezone}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
