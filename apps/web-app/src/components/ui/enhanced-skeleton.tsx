/**
 * Enhanced Skeleton Component
 * Task 18.3: Add loading state improvements
 * 
 * Improved skeleton screens that match final layout
 * Smooth transitions between loading and loaded states
 * Optimized animation performance
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of the skeleton
   */
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  
  /**
   * Width of the skeleton
   */
  width?: string | number;
  
  /**
   * Height of the skeleton
   */
  height?: string | number;
  
  /**
   * Animation speed
   */
  animation?: 'pulse' | 'wave' | 'none';
  
  /**
   * Number of lines for text variant
   */
  lines?: number;
}

export function EnhancedSkeleton({
  className,
  variant = 'default',
  width,
  height,
  animation = 'wave',
  lines = 1,
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-muted';
  
  const variantStyles = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    text: 'rounded-sm h-4',
  };
  
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };
  
  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };
  
  // Text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseStyles,
              variantStyles.text,
              animationStyles[animation],
              className
            )}
            style={{
              ...style,
              width: index === lines - 1 ? '80%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      {...props}
    />
  );
}

/**
 * Profile Card Skeleton
 */
export function ProfileCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-6 border rounded-lg">
      <EnhancedSkeleton variant="circular" width={64} height={64} />
      <div className="flex-1 space-y-3">
        <EnhancedSkeleton variant="text" width="60%" height={24} />
        <EnhancedSkeleton variant="text" width="40%" height={16} />
        <div className="flex gap-2">
          <EnhancedSkeleton variant="rectangular" width={80} height={24} />
          <EnhancedSkeleton variant="rectangular" width={80} height={24} />
        </div>
      </div>
    </div>
  );
}

/**
 * Progress Dashboard Skeleton
 */
export function ProgressDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overall Mastery */}
      <div className="flex items-center justify-center p-8 border rounded-lg">
        <EnhancedSkeleton variant="circular" width={200} height={200} />
      </div>
      
      {/* Skill Mastery List */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-2">
            <EnhancedSkeleton variant="text" width="40%" height={20} />
            <EnhancedSkeleton variant="rectangular" width="100%" height={8} />
            <div className="flex gap-4">
              <EnhancedSkeleton variant="text" width="30%" height={16} />
              <EnhancedSkeleton variant="text" width="30%" height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Activity Feed Skeleton
 */
export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
          <EnhancedSkeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <EnhancedSkeleton variant="text" width="70%" height={18} />
            <EnhancedSkeleton variant="text" width="50%" height={14} />
            <EnhancedSkeleton variant="text" width="30%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted">
        {Array.from({ length: columns }).map((_, index) => (
          <EnhancedSkeleton key={index} variant="text" width="100%" height={20} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-t">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <EnhancedSkeleton key={colIndex} variant="text" width="100%" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <EnhancedSkeleton variant="text" width="40%" height={24} />
      <EnhancedSkeleton variant="rectangular" width="100%" height={300} />
      <div className="flex justify-center gap-4">
        <EnhancedSkeleton variant="text" width={80} height={16} />
        <EnhancedSkeleton variant="text" width={80} height={16} />
        <EnhancedSkeleton variant="text" width={80} height={16} />
      </div>
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <EnhancedSkeleton variant="text" width="30%" height={16} />
          <EnhancedSkeleton variant="rectangular" width="100%" height={40} />
        </div>
      ))}
      <div className="flex gap-4">
        <EnhancedSkeleton variant="rectangular" width={120} height={40} />
        <EnhancedSkeleton variant="rectangular" width={120} height={40} />
      </div>
    </div>
  );
}

/**
 * Page Skeleton
 */
export function PageSkeleton() {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <EnhancedSkeleton variant="text" width="40%" height={32} />
        <EnhancedSkeleton variant="text" width="60%" height={20} />
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <EnhancedSkeleton variant="rectangular" width="100%" height={400} />
          <EnhancedSkeleton variant="rectangular" width="100%" height={300} />
        </div>
        <div className="space-y-6">
          <EnhancedSkeleton variant="rectangular" width="100%" height={200} />
          <EnhancedSkeleton variant="rectangular" width="100%" height={300} />
        </div>
      </div>
    </div>
  );
}

// Add wave animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes skeleton-wave {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    
    .skeleton-wave {
      background: linear-gradient(
        90deg,
        hsl(var(--muted)) 0%,
        hsl(var(--muted) / 0.8) 50%,
        hsl(var(--muted)) 100%
      );
      background-size: 200% 100%;
      animation: skeleton-wave 1.5s ease-in-out infinite;
    }
    
    @media (prefers-reduced-motion: reduce) {
      .skeleton-wave {
        animation: none;
        background: hsl(var(--muted));
      }
    }
  `;
  document.head.appendChild(style);
}
