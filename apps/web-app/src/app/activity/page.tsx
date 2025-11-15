/**
 * Activity Dashboard Page
 * 
 * Displays comprehensive activity analytics and insights including:
 * - Engagement metrics
 * - Activity breakdown charts
 * - Activity distribution
 * - Top topics
 * - AI-generated insights
 * - Behavior patterns
 * - Export functionality
 * 
 * Requirements: 6.1, 9.3 (code splitting), 11.6 (error boundaries)
 * Task: 9.8, 12.1 (route-based code splitting), 14.1 (error boundary wrapping)
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ActivityMonitoringErrorBoundary } from '@/components/user/error-boundary';
import { useAuth } from '@/hooks/useAuth';
import {
  useActivitySummary,
  useEngagementMetrics,
  useActivityInsights,
} from '@/hooks/useUserService';
import { ActivityLayout } from '@/components/user/templates/ActivityLayout';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { DateRange, ActivityInsight, ActivityType } from '@/types/user-service';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Code splitting: Lazy load heavy chart and analytics components (Task 12.2)
const EngagementMetricsSection = dynamic(
  () => import('@/components/user/templates/EngagementMetricsSection').then(mod => ({ default: mod.EngagementMetricsSection })),
  { loading: () => <Skeleton className="h-[200px] w-full" /> }
);

const ActivityBreakdownChart = dynamic(
  () => import('@/components/user/templates/ActivityBreakdownChart').then(mod => ({ default: mod.ActivityBreakdownChart })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const ActivityDistributionCharts = dynamic(
  () => import('@/components/user/templates/ActivityDistributionCharts').then(mod => ({ default: mod.ActivityDistributionCharts })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const TopTopicsSection = dynamic(
  () => import('@/components/user/templates/TopTopicsSection').then(mod => ({ default: mod.TopTopicsSection })),
  { loading: () => <Skeleton className="h-[200px] w-full" /> }
);

const InsightsSection = dynamic(
  () => import('@/components/user/templates/InsightsSection').then(mod => ({ default: mod.InsightsSection })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const BehaviorPatternsSection = dynamic(
  () => import('@/components/user/templates/BehaviorPatternsSection').then(mod => ({ default: mod.BehaviorPatternsSection })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const ActivityFeed = dynamic(
  () => import('@/components/user/organisms/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
);

export default function ActivityPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [activityType, setActivityType] = useState<string>('all');

  // Fetch activity data
  const userId = user?.id?.toString() || '';
  
  const {
    data: activitySummary,
    isLoading: isSummaryLoading,
  } = useActivitySummary(userId, dateRange, { enabled: !!userId });

  const {
    data: engagementMetrics,
    isLoading: isMetricsLoading,
  } = useEngagementMetrics(userId, 30, { enabled: !!userId });

  const {
    data: insights,
    isLoading: isInsightsLoading,
  } = useActivityInsights(userId, { enabled: !!userId });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleActivityTypeChange = (type: string) => {
    setActivityType(type);
  };

  const handleExportJSON = async () => {
    try {
      const data = {
        summary: activitySummary,
        metrics: engagementMetrics,
        insights,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export successful', {
        description: 'Activity data exported as JSON',
      });
    } catch {
      toast.error('Export failed', {
        description: 'Failed to export activity data',
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      if (!activitySummary) {
        throw new Error('No data to export');
      }

      // Create CSV content
      const headers = ['Type', 'Count'];
      const rows = Object.entries(activitySummary.activityBreakdown).map(([type, count]) => [
        type,
        (count as number).toString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export successful', {
        description: 'Activity data exported as CSV',
      });
    } catch {
      toast.error('Export failed', {
        description: 'Failed to export activity data',
      });
    }
  };

  const handleInsightAction = (insight: ActivityInsight) => {
    toast.success('Action triggered', {
      description: `Taking action for: ${insight.title}`,
    });
    // Implement specific actions based on insight type
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">
          Please sign in to view your activity
        </p>
      </div>
    );
  }

  return (
    <ActivityMonitoringErrorBoundary>
      <div className="container mx-auto py-8">
        <ActivityLayout
          onDateRangeChange={handleDateRangeChange}
          onActivityTypeChange={handleActivityTypeChange}
        >
          {/* Export button */}
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportJSON}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Engagement Metrics */}
          <EngagementMetricsSection
            metrics={engagementMetrics}
            isLoading={isMetricsLoading}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityBreakdownChart
              summary={activitySummary}
              isLoading={isSummaryLoading}
            />
            <ActivityDistributionCharts
              summary={activitySummary}
              isLoading={isSummaryLoading}
            />
          </div>

          {/* Top Topics */}
          <TopTopicsSection
            summary={activitySummary}
            isLoading={isSummaryLoading}
          />

          {/* Insights and Patterns Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InsightsSection
              insights={insights}
              isLoading={isInsightsLoading}
              onActionClick={handleInsightAction}
            />
            <BehaviorPatternsSection isLoading={isInsightsLoading} />
          </div>

          {/* Activity Feed */}
          <ActivityFeed
            userId={userId}
            dateRange={dateRange}
            activityTypes={activityType === 'all' ? undefined : [activityType as ActivityType]}
          />
        </ActivityLayout>
      </div>
    </ActivityMonitoringErrorBoundary>
  );
}
