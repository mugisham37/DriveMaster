'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/components/accessibility/ReducedMotionProvider';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  variant = 'linear',
  size = 'md',
  color = 'primary',
  showLabel = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const { shouldReduceMotion } = useReducedMotion();
  const clampedValue = Math.min(100, Math.max(0, value));
  const ariaLabel = `Progress: ${Math.round(clampedValue)} percent complete`;
  const shouldAnimate = animated && !shouldReduceMotion();

  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  if (variant === 'circular') {
    const circleSize = size === 'sm' ? 40 : size === 'md' ? 60 : 80;
    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedValue / 100) * circumference;

    return (
      <div 
        className={cn('relative inline-flex items-center justify-center', className)}
        role="progressbar"
        aria-valuenow={Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <svg width={circleSize} height={circleSize} className="transform -rotate-90" aria-hidden="true">
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              colorClasses[color],
              shouldAnimate && 'transition-all duration-300 ease-in-out'
            )}
            strokeLinecap="round"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-sm font-semibold text-gray-700" aria-hidden="true">
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-gray-200',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={cn(
            'h-full',
            colorClasses[color],
            shouldAnimate && 'transition-all duration-300 ease-in-out'
          )}
          style={{ width: `${clampedValue}%` }}
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 mt-1 block" aria-hidden="true">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
