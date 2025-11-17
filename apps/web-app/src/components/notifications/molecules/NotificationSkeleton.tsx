'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface NotificationSkeletonProps {
  count?: number;
  compact?: boolean;
  className?: string;
}

function SingleNotificationSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={cn('animate-pulse', compact && 'p-2')}>
      <CardContent className={cn('flex gap-3', compact ? 'p-3' : 'p-4')}>
        {/* Icon skeleton */}
        <Skeleton className={cn('rounded-full flex-shrink-0', compact ? 'h-8 w-8' : 'h-10 w-10')} />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </div>

          {/* Body lines */}
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationSkeleton({
  count = 3,
  compact = false,
  className,
}: NotificationSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            animationDelay: `${index * 50}ms`,
          }}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <SingleNotificationSkeleton compact={compact} />
        </div>
      ))}
    </div>
  );
}
