'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getMasteryColor, getMasteryCategory } from '@/utils/learning-platform';

interface TopicBadgeProps {
  topicName: string;
  masteryLevel?: number; // 0-100
  showMastery?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TopicBadge({
  topicName,
  masteryLevel,
  showMastery = false,
  onClick,
  size = 'md',
  className,
}: TopicBadgeProps) {
  const isClickable = !!onClick;
  
  const getMasteryBgColor = (level: number): string => {
    if (level < 50) return 'bg-red-100 text-red-800 border-red-300';
    if (level < 80) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const badgeClasses = cn(
    'inline-flex items-center gap-1.5 border',
    sizeClasses[size],
    masteryLevel !== undefined && getMasteryBgColor(masteryLevel),
    isClickable && 'cursor-pointer hover:opacity-80 transition-opacity',
    className
  );

  return (
    <Badge
      variant={masteryLevel !== undefined ? 'outline' : 'secondary'}
      className={badgeClasses}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-label={
        masteryLevel !== undefined
          ? `${topicName}, ${masteryLevel}% mastery`
          : topicName
      }
    >
      <span>{topicName}</span>
      {showMastery && masteryLevel !== undefined && (
        <span className="font-semibold">{Math.round(masteryLevel)}%</span>
      )}
    </Badge>
  );
}
