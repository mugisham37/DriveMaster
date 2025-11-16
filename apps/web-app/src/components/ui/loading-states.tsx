/**
 * Loading States Component
 * 
 * Consistent loading indicators for different contexts:
 * - Skeleton loaders for initial page loads
 * - Spinners for button actions
 * - Progress indicators for long operations
 * - All loading states are accessible
 * 
 * Requirements: 13.2
 * Task: 17.2
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============================================================================
// Spinner Component
// ============================================================================

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center" role="status" aria-live="polite">
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size], className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ============================================================================
// Button Spinner Component
// ============================================================================

export interface ButtonSpinnerProps {
  label?: string;
}

export function ButtonSpinner({ label = 'Loading...' }: ButtonSpinnerProps) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

// ============================================================================
// Progress Indicator Component
// ============================================================================

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressIndicator({
  progress,
  label,
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('space-y-2', className)} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-muted-foreground">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Full Page Loading Component
// ============================================================================

export interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Spinner size="xl" label={message} />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Loading Component
// ============================================================================

export interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoading({ message = 'Loading...', size = 'md' }: InlineLoadingProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Spinner size={size} label={message} />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// ============================================================================
// Card Loading Skeleton
// ============================================================================

export function CardLoadingSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      <div className="h-20 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}

// ============================================================================
// List Loading Skeleton
// ============================================================================

export interface ListLoadingSkeletonProps {
  count?: number;
}

export function ListLoadingSkeleton({ count = 5 }: ListLoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Grid Loading Skeleton
// ============================================================================

export interface GridLoadingSkeletonProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
}

export function GridLoadingSkeleton({ count = 6, columns = 3 }: GridLoadingSkeletonProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-6', gridClasses[columns])}>
      {Array.from({ length: count }).map((_, index) => (
        <CardLoadingSkeleton key={index} />
      ))}
    </div>
  );
}

// ============================================================================
// Table Loading Skeleton
// ============================================================================

export interface TableLoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableLoadingSkeleton({ rows = 5, columns = 4 }: TableLoadingSkeletonProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 border-b">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1">
            <div className="h-4 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-b-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Overlay Loading Component
// ============================================================================

export interface OverlayLoadingProps {
  message?: string;
  progress?: number;
}

export function OverlayLoading({ message = 'Processing...', progress }: OverlayLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-lg">
        <div className="text-center space-y-2">
          <Spinner size="lg" label={message} />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {progress !== undefined && (
          <ProgressIndicator progress={progress} showPercentage />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Suspense Fallback Component
// ============================================================================

export interface SuspenseFallbackProps {
  type?: 'page' | 'card' | 'list' | 'grid';
  message?: string;
}

export function SuspenseFallback({ type = 'page', message }: SuspenseFallbackProps) {
  switch (type) {
    case 'card':
      return <CardLoadingSkeleton />;
    case 'list':
      return <ListLoadingSkeleton />;
    case 'grid':
      return <GridLoadingSkeleton />;
    case 'page':
    default:
      return (
        <div className="container mx-auto py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <GridLoadingSkeleton count={6} columns={3} />
          </div>
        </div>
      );
  }
}
