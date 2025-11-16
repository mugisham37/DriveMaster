'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import { useReducedMotion } from '@/components/accessibility/ReducedMotionProvider';

interface StreakDisplayProps {
  currentStreak: number;
  showCalendar?: boolean;
  streakHistory?: Date[];
  onExpand?: () => void;
  className?: string;
}

export function StreakDisplay({
  currentStreak,
  showCalendar = false,
  streakHistory = [],
  onExpand,
  className,
}: StreakDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getAnimationDuration, shouldReduceMotion } = useReducedMotion();
  const animationDuration = getAnimationDuration(300);

  const handleToggle = () => {
    if (showCalendar) {
      setIsExpanded(!isExpanded);
      onExpand?.();
    }
  };

  const isStreakActive = currentStreak > 0;

  return (
    <div className={cn('inline-flex flex-col', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200',
          showCalendar && 'cursor-pointer hover:shadow-md transition-shadow',
          !isStreakActive && 'opacity-50 grayscale'
        )}
        onClick={handleToggle}
        role={showCalendar ? 'button' : undefined}
        tabIndex={showCalendar ? 0 : undefined}
        onKeyDown={
          showCalendar
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }
            : undefined
        }
        aria-label={`Current streak: ${currentStreak} days`}
        aria-expanded={isExpanded}
      >
        <Flame
          className={cn(
            'w-6 h-6 text-orange-500',
            isStreakActive && !shouldReduceMotion() && 'animate-pulse'
          )}
          style={{
            animationDuration: animationDuration ? `${animationDuration}ms` : undefined,
          }}
        />
        <div className="flex flex-col">
          <span
            className={cn(
              'text-2xl font-bold text-orange-600 transition-all',
              animationDuration && 'duration-300'
            )}
          >
            {currentStreak}
          </span>
          <span className="text-xs text-gray-600">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {showCalendar && isExpanded && (
        <div
          className={cn(
            'mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg',
            animationDuration && 'animate-in fade-in slide-in-from-top-2'
          )}
          style={{
            animationDuration: animationDuration ? `${animationDuration}ms` : undefined,
          }}
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Streak History</h4>
          <div className="grid grid-cols-7 gap-1">
            {streakHistory.slice(-28).map((date, index) => {
              const isToday =
                new Date(date).toDateString() === new Date().toDateString();
              return (
                <div
                  key={index}
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center text-xs',
                    isToday
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-orange-100 text-orange-700'
                  )}
                  title={date.toLocaleDateString()}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
