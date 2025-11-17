'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface NotificationBadgeProps {
  count: number;
  variant?: 'unread' | 'urgent' | 'normal';
  maxCount?: number;
  showZero?: boolean;
  className?: string;
}

export function NotificationBadge({
  count,
  variant = 'normal',
  maxCount = 99,
  showZero = false,
  className,
}: NotificationBadgeProps) {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  // Trigger pulse animation when count increases
  useEffect(() => {
    if (count > prevCount) {
      setShouldPulse(true);
      setPrevCount(count);
      const timer = setTimeout(() => setShouldPulse(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
    return undefined;
  }, [count, prevCount]);

  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const variantStyles = {
    unread: 'bg-blue-500 text-white hover:bg-blue-600',
    urgent: 'bg-red-500 text-white hover:bg-red-600 animate-pulse',
    normal: 'bg-gray-500 text-white hover:bg-gray-600',
  };

  return (
    <Badge
      variant="default"
      className={cn(
        'min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full',
        variantStyles[variant],
        shouldPulse && 'animate-pulse',
        className
      )}
      aria-label={`${count} unread notification${count !== 1 ? 's' : ''}`}
    >
      {displayCount}
    </Badge>
  );
}
