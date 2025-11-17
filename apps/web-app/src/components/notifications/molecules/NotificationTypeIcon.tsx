'use client';

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

export interface NotificationTypeIconProps {
  type: NotificationType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
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
  achievement: 'text-yellow-500 bg-yellow-100',
  streak_reminder: 'text-orange-500 bg-orange-100',
  mock_test_reminder: 'text-blue-500 bg-blue-100',
  system: 'text-gray-500 bg-gray-100',
  mentoring: 'text-purple-500 bg-purple-100',
  course_update: 'text-green-500 bg-green-100',
  spaced_repetition: 'text-blue-400 bg-blue-50',
  general: 'text-gray-400 bg-gray-50',
};

const sizeMap = {
  xs: 'h-4 w-4 p-1',
  sm: 'h-6 w-6 p-1.5',
  md: 'h-8 w-8 p-2',
  lg: 'h-10 w-10 p-2.5',
  xl: 'h-12 w-12 p-3',
};

const iconSizeMap = {
  xs: 'h-2 w-2',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

export function NotificationTypeIcon({
  type,
  size = 'md',
  animated = false,
  className,
}: NotificationTypeIconProps) {
  const IconComponent = typeIconMap[type] || Bell;
  const colorClasses = typeColorMap[type] || 'text-gray-400 bg-gray-50';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        sizeMap[size],
        colorClasses,
        animated && 'animate-in zoom-in-50 fade-in duration-300',
        type === 'achievement' && 'shadow-lg shadow-yellow-500/20',
        type === 'streak_reminder' && 'shadow-lg shadow-orange-500/20',
        className
      )}
    >
      <IconComponent className={iconSizeMap[size]} />
    </div>
  );
}
