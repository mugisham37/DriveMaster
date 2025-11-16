/**
 * Progress Page Content Component
 * 
 * Main content component for the Progress and Analytics page.
 * Handles data fetching and orchestrates all sections.
 * 
 * Requirements: 9.1, 14.1
 * Task: 9.2, 9.3
 */

'use client';

import React, { useState } from 'react';
import { useAnalytics, useProgressMetrics, useHistoricalMetrics } from '@/hooks/useAnalytics';
import { useRealtimeProgress } from '@/hooks/useRealtimeProgress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ProgressOverviewSection } from './sections/ProgressOverviewSection';
import { TopicMasterySection } from './sections/TopicMasterySection';
import { AccuracyTrendSection } from './sections/AccuracyTrendSection';
import { WeakAreasPanel } from './sections/WeakAreasPanel';
import { MilestoneTimeline } from './sections/MilestoneTimeline';
import { ActivityHeatmap } from './sections/ActivityHeatmap';
import type { HistoricalQuery } from '@/types/analytics-service';

interface ProgressPageContentProps {
  userId: string;
}

export function ProgressPageContent({ userId }: ProgressPageContentProps) {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  // Data fetching (Task 9.2)
  const analyticsQuery = useAnalytics();
  const progressMetricsQuery = useProgressMetrics({ userId });
  
  // Historical metrics for charts
  const historicalQuery: HistoricalQuery = {
    metrics: ['accuracy', 'completions', 'studyTime'],
    timeRange: {
      start: getStartDate(timeRange),
      end: new Date(),
    },
    granularity: timeRange === '7days' ? 'day' : timeRange === '30days' ? 'day' : 'week',
  };
  
  const historicalMetricsQuery = useHistoricalMetrics(historicalQuery);
  
  // Real-time progress updates
  const realtimeProgress = useRealtimeProgress({ enabled: !!userId });

  // Loading state
  const isLoading = 
    analyticsQuery.analyticsClient === undefined ||
    progressMetricsQuery.isLoading ||
    historicalMetricsQuery.isLoading;

  // Error state
  const hasError = 
    progressMetricsQuery.isError ||
    historicalMetricsQuery.isError;

  const error = 
    progressMetricsQuery.error ||
    historicalMetricsQuery.error;

  // Refetch all data
  const handleRefresh = () => {
    progressMetricsQuery.refetch();
    historicalMetricsQuery.refetch();
  };

  if (hasError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Progress Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {error instanceof Error ? error.message : 'Failed to load progress data'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Progress & Analytics</h1>
        <p className="text-muted-foreground">
          Track your learning journey, identify strengths, and discover areas for improvement
        </p>
      </div>

      {/* Real-time connection indicator */}
      {realtimeProgress.isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          <span>Live updates enabled</span>
        </div>
      )}

      {/* Progress Overview Section (Task 9.3) */}
      <ProgressOverviewSection
        progressData={progressMetricsQuery.data}
        isLoading={isLoading}
      />

      {/* Topic Mastery Section (Task 9.4) */}
      <TopicMasterySection
        progressData={progressMetricsQuery.data}
        isLoading={isLoading}
      />

      {/* Accuracy Trend Section (Task 9.5) */}
      <AccuracyTrendSection
        historicalData={historicalMetricsQuery.data}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isLoading={isLoading}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Areas Panel (Task 9.6) */}
        <WeakAreasPanel
          progressData={progressMetricsQuery.data}
          isLoading={isLoading}
        />

        {/* Milestone Timeline (Task 9.7) */}
        <MilestoneTimeline
          progressData={progressMetricsQuery.data}
          isLoading={isLoading}
        />
      </div>

      {/* Activity Heatmap (Task 9.8) */}
      <ActivityHeatmap
        historicalData={historicalMetricsQuery.data}
        isLoading={isLoading}
      />
    </div>
  );
}

// Helper function to get start date based on time range
function getStartDate(timeRange: '7days' | '30days' | '90days' | 'all'): Date {
  const now = new Date();
  switch (timeRange) {
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}
