'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bell, BellOff, Filter, AlertCircle } from 'lucide-react';

export type EmptyStateType = 'no-notifications' | 'filtered-empty' | 'error' | 'no-permission';

export interface EmptyNotificationStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  className?: string;
}

const stateConfig: Record<
  EmptyStateType,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    actionLabel?: string;
    iconColor: string;
  }
> = {
  'no-notifications': {
    icon: Bell,
    title: 'No notifications yet',
    description: "You're all caught up! We'll notify you when something important happens.",
    iconColor: 'text-blue-500',
  },
  'filtered-empty': {
    icon: Filter,
    title: 'No matching notifications',
    description: 'Try adjusting your filters to see more notifications.',
    actionLabel: 'Clear filters',
    iconColor: 'text-gray-500',
  },
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: "We couldn't load your notifications. Please try again.",
    actionLabel: 'Try again',
    iconColor: 'text-red-500',
  },
  'no-permission': {
    icon: BellOff,
    title: 'Notifications are disabled',
    description: 'Enable notifications in your browser settings to receive updates.',
    actionLabel: 'Enable notifications',
    iconColor: 'text-orange-500',
  },
};

export function EmptyNotificationState({
  type,
  onAction,
  className,
}: EmptyNotificationStateProps) {
  const config = stateConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-300',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-muted p-6 mb-4',
          'ring-8 ring-muted/50'
        )}
      >
        <Icon className={cn('h-12 w-12', config.iconColor)} />
      </div>

      <h3 className="text-lg font-semibold mb-2">{config.title}</h3>

      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {config.description}
      </p>

      {config.actionLabel && onAction && (
        <Button onClick={onAction} variant="default">
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
}
