/**
 * Empty States Component
 * 
 * Consistent empty state displays for no data scenarios:
 * - Helpful messages and call-to-action buttons
 * - Icons for visual appeal
 * - Accessible and user-friendly
 * 
 * Requirements: 8.3
 * Task: 17.3
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Search,
  BookOpen,
  Target,
  TrendingUp,
  FileCheck,
  Inbox,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ============================================================================
// Base Empty State Component
// ============================================================================

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="lg"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Specific Empty State Components
// ============================================================================

export interface NoSearchResultsProps {
  query: string;
  onClearSearch: () => void;
  onBrowseAll?: () => void;
}

export function NoSearchResults({
  query,
  onClearSearch,
  onBrowseAll,
}: NoSearchResultsProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find any content matching "${query}". Try adjusting your search or filters.`}
      action={{
        label: 'Clear search',
        onClick: onClearSearch,
        variant: 'default',
      }}
      secondaryAction={
        onBrowseAll
          ? {
              label: 'Browse all content',
              onClick: onBrowseAll,
            }
          : undefined
      }
    />
  );
}

export interface NoLessonsProps {
  onBrowseLessons: () => void;
}

export function NoLessons({ onBrowseLessons }: NoLessonsProps) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No lessons yet"
      description="Start your learning journey by exploring our comprehensive lesson library."
      action={{
        label: 'Browse lessons',
        onClick: onBrowseLessons,
      }}
    />
  );
}

export interface NoProgressProps {
  onStartLearning: () => void;
}

export function NoProgress({ onStartLearning }: NoProgressProps) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No progress data yet"
      description="Complete some lessons to see your progress and analytics here."
      action={{
        label: 'Start learning',
        onClick: onStartLearning,
      }}
    />
  );
}

export interface NoPracticeHistoryProps {
  onStartPractice: () => void;
}

export function NoPracticeHistory({ onStartPractice }: NoPracticeHistoryProps) {
  return (
    <EmptyState
      icon={Target}
      title="No practice sessions yet"
      description="Start a practice session to improve your skills and track your progress."
      action={{
        label: 'Start practice',
        onClick: onStartPractice,
      }}
    />
  );
}

export interface NoMockTestsProps {
  onStartMockTest: () => void;
}

export function NoMockTests({ onStartMockTest }: NoMockTestsProps) {
  return (
    <EmptyState
      icon={FileCheck}
      title="No mock tests taken"
      description="Take a full-length mock test to assess your readiness for the actual exam."
      action={{
        label: 'Start mock test',
        onClick: onStartMockTest,
      }}
    />
  );
}

export interface NoRecommendationsProps {
  onExploreContent: () => void;
}

export function NoRecommendations({ onExploreContent }: NoRecommendationsProps) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No recommendations available"
      description="Complete more lessons to get personalized recommendations based on your learning progress."
      action={{
        label: 'Explore content',
        onClick: onExploreContent,
      }}
    />
  );
}

export interface NoAchievementsProps {
  onViewGoals: () => void;
}

export function NoAchievements({ onViewGoals }: NoAchievementsProps) {
  return (
    <EmptyState
      icon={CheckCircle}
      title="No achievements yet"
      description="Keep learning to unlock achievements and celebrate your milestones."
      action={{
        label: 'View goals',
        onClick: onViewGoals,
      }}
    />
  );
}

export interface NoNotificationsProps {
  onGoToDashboard: () => void;
}

export function NoNotifications({ onGoToDashboard }: NoNotificationsProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="No notifications"
      description="You're all caught up! Check back later for updates on your learning progress."
      action={{
        label: 'Go to dashboard',
        onClick: onGoToDashboard,
      }}
    />
  );
}

// ============================================================================
// Error State Components
// ============================================================================

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  onGoBack,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
      secondaryAction={
        onGoBack
          ? {
              label: 'Go back',
              onClick: onGoBack,
            }
          : undefined
      }
    />
  );
}

export interface NetworkErrorStateProps {
  onRetry: () => void;
}

export function NetworkErrorState({ onRetry }: NetworkErrorStateProps) {
  return (
    <EmptyState
      icon={XCircle}
      title="Connection error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      action={{
        label: 'Retry',
        onClick: onRetry,
      }}
    />
  );
}

export interface NotFoundStateProps {
  resourceType?: string;
  onGoHome: () => void;
}

export function NotFoundState({
  resourceType = 'page',
  onGoHome,
}: NotFoundStateProps) {
  return (
    <EmptyState
      icon={Search}
      title={`${resourceType} not found`}
      description={`The ${resourceType} you're looking for doesn't exist or has been removed.`}
      action={{
        label: 'Go to dashboard',
        onClick: onGoHome,
      }}
    />
  );
}

// ============================================================================
// Success State Component
// ============================================================================

export interface SuccessStateProps {
  title: string;
  description?: string;
  onContinue: () => void;
  continueLabel?: string;
}

export function SuccessState({
  title,
  description,
  onContinue,
  continueLabel = 'Continue',
}: SuccessStateProps) {
  return (
    <EmptyState
      icon={CheckCircle}
      title={title}
      description={description}
      action={{
        label: continueLabel,
        onClick: onContinue,
      }}
    />
  );
}

// ============================================================================
// Info State Component
// ============================================================================

export interface InfoStateProps {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function InfoState({
  title,
  description,
  onAction,
  actionLabel = 'Got it',
}: InfoStateProps) {
  return (
    <EmptyState
      icon={Info}
      title={title}
      description={description}
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

// ============================================================================
// Compact Empty State (for smaller containers)
// ============================================================================

export interface CompactEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function CompactEmptyState({
  icon: Icon = Inbox,
  message,
  action,
}: CompactEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-8 px-4"
      role="status"
      aria-live="polite"
    >
      <Icon className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
