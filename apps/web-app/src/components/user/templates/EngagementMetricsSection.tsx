/**
 * EngagementMetricsSection Component
 * 
 * Displays engagement metrics including daily active streak, average session length,
 * engagement score, and churn risk indicator.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Activity, AlertTriangle } from 'lucide-react';
import { EngagementMetrics } from '@/types/user-service';
import { Skeleton } from '@/components/ui/skeleton';

interface EngagementMetricsSectionProps {
  metrics?: EngagementMetrics;
  isLoading?: boolean;
  className?: string;
}

export function EngagementMetricsSection({
  metrics,
  isLoading,
  className = '',
}: EngagementMetricsSectionProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          No engagement data available
        </CardContent>
      </Card>
    );
  }

  const getChurnRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getChurnRiskBg = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'high':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-muted';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Daily Active Streak */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Active Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.dailyActiveStreak} days</div>
          <p className="text-xs text-muted-foreground mt-1">
            Keep it going! 🔥
          </p>
        </CardContent>
      </Card>

      {/* Average Session Length */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Avg Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(metrics.averageSessionLength)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per learning session
          </p>
        </CardContent>
      </Card>

      {/* Engagement Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            Engagement Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(metrics.engagementScore * 100)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.engagementScore >= 0.8
              ? 'Excellent engagement!'
              : metrics.engagementScore >= 0.6
              ? 'Good engagement'
              : 'Room for improvement'}
          </p>
        </CardContent>
      </Card>

      {/* Churn Risk */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            Churn Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getChurnRiskBg(
              metrics.churnRisk
            )} ${getChurnRiskColor(metrics.churnRisk)}`}
          >
            {metrics.churnRisk}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.churnRisk.toLowerCase() === 'low'
              ? 'Great retention!'
              : metrics.churnRisk.toLowerCase() === 'medium'
              ? 'Stay consistent'
              : 'Need more engagement'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
