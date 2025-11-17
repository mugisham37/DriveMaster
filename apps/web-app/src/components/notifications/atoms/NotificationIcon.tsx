'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Flame,
  ClipboardList,
  Settings,
  User,
  BookOpen,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export type NotificationType =
  | 'achievement'
  | 'streak_reminder'
  | 'mock_test_reminder'
  | 'system'
  | 'mentoring'
  | 'course_update'
  | 'spaced_repetition'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface NotificationIconProps {
  type: NotificationType;
  iconUrl?: string;
  priority: NotificationPriority;
  isRead: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const typeIconMap: Record<NotificationType, LucideIcon> = {
  achievement: Trophy,
  streak_reminder: Flame,
  mock_test_reminder: ClipboardList,
  system: Settings,
  mentoring: User,
  course_update: BookOpen,
  spaced_repetition: Bell,
  general: Bell,
};

const typeColorMap: Record<NotificationType, string> = {
  achievement: 'text-yellow-500',
  streak_reminder: 'text-orange-500',
  mock_test_reminder: 'text-blue-500',
  system: 'text-gray-500',
  mentoring: 'text-purple-500',
  course_update: 'text-green-500',
  spaced_repetition: 'text-blue-400',
  general: 'text-gray-400',
};

const priorityStyles: Record<NotificationPriority, string> = {
  low: '',
  normal: '',
  high: 'ring-2 ring-orange-400 ring-offset-2',
  urgent: 'ring-2 ring-red-500 ring-offset-2 animate-pulse',
  critical: 'ring-2 ring-red-600 ring-offset-2 animate-pulse shadow-lg shadow-red-500/50',
};

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function NotificationIcon({
  type,
  iconUrl,
  priority,
  isRead,
  size = 'md',
  className,
}: NotificationIconProps) {
  const IconComponent = typeIconMap[type] || Bell;
  const iconColor = typeColorMap[type] || 'text-gray-400';
  const priorityStyle = priorityStyles[priority];

  return (
    <Avatar
      className={cn(
        sizeMap[size],
        priorityStyle,
        isRead && 'opacity-60',
        'transition-opacity duration-200',
        className
      )}
    >
      {iconUrl ? (
        <>
          <AvatarImage src={iconUrl} alt={`${type} notification`} />
          <AvatarFallback className={cn('bg-gray-100', iconColor)}>
            <IconComponent className="h-1/2 w-1/2" />
          </AvatarFallback>
        </>
      ) : (
        <AvatarFallback className={cn('bg-gray-100', iconColor)}>
          <IconComponent className="h-1/2 w-1/2" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
