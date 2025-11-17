'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from 'lucide-react';
import type { NotificationPriority } from './NotificationIcon';

export interface NotificationPriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: NotificationPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const priorityConfig: Record<
  NotificationPriority,
  {
    label: string;
    color: string;
    icon: typeof ArrowDown;
  }
> = {
  low: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: ArrowDown,
  },
  normal: {
    label: 'Normal',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Minus,
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: ArrowUp,
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-700 border-red-300 animate-pulse',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-200 text-red-900 border-red-400 animate-pulse font-bold',
    icon: AlertTriangle,
  },
};

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function NotificationPriorityBadge({
  priority,
  showLabel = false,
  size = 'md',
  className,
  ...props
}: NotificationPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  // Don't show badge for normal priority unless explicitly requested
  if (priority === 'normal' && !showLabel) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5',
        config.color,
        className
      )}
      aria-label={`Priority: ${config.label}`}
      {...props}
    >
      <Icon className={sizeMap[size]} />
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </Badge>
  );
}
