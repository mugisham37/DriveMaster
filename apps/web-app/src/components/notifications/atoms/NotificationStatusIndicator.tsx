'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type NotificationStatus =
  | 'pending'
  | 'delivered'
  | 'read'
  | 'clicked'
  | 'failed'
  | 'scheduled';

export interface NotificationStatusIndicatorProps {
  status: NotificationStatus;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<
  NotificationStatus,
  { color: string; label: string; description: string }
> = {
  pending: {
    color: 'bg-gray-400',
    label: 'Pending',
    description: 'Notification is being processed',
  },
  delivered: {
    color: 'bg-blue-500',
    label: 'Delivered',
    description: 'Notification has been delivered',
  },
  read: {
    color: 'bg-green-500',
    label: 'Read',
    description: 'Notification has been read',
  },
  clicked: {
    color: 'bg-purple-500',
    label: 'Clicked',
    description: 'Notification action was clicked',
  },
  failed: {
    color: 'bg-red-500',
    label: 'Failed',
    description: 'Notification delivery failed',
  },
  scheduled: {
    color: 'bg-orange-500',
    label: 'Scheduled',
    description: 'Notification is scheduled for later',
  },
};

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const inProgressStatuses: NotificationStatus[] = ['pending', 'scheduled'];

export function NotificationStatusIndicator({
  status,
  animated = true,
  size = 'md',
  showTooltip = true,
  className,
}: NotificationStatusIndicatorProps) {
  const config = statusConfig[status];
  const shouldAnimate = animated && inProgressStatuses.includes(status);

  const indicator = (
    <div
      className={cn(
        'rounded-full',
        sizeMap[size],
        config.color,
        shouldAnimate && 'animate-pulse',
        'transition-all duration-200',
        className
      )}
      role="status"
      aria-label={config.label}
    />
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center cursor-help">{indicator}</div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">{config.label}</p>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
