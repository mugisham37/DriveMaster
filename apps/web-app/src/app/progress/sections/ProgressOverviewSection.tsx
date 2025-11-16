/**
 * Progress Overview Section
 * 
 * Displays key metrics cards with animated counters and comparison indicators.
 * 
 * Requirements: 9.1
 * Task: 9.3
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StreakDisplay } from '@/components/learning-platform/layer-3-ui';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  CheckCircle2,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningProgressMetrics } from '@/types/analytics-service';

interface ProgressOverviewSectionProps {
  progressData?: LearningProgressMetrics;
  isLoading: boolean;
}

export function ProgressOverviewSection({ progressData, isLoading }: ProgressOverviewSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!progressData) {
    return null;
  }

  const metrics = [
    {
      title: 'Total Questions',
      value: progressData.totalCompletions24h || 0,
      icon: CheckCircle2,
      change: calculateChange(progressData.totalCompletions24h, 0), // Would need previous period data
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Accuracy',
      value: `${Math.round((progressData.avgAccuracy || 0) * 100)}%`,
      icon: Target,
      change: 0, // Would need previous period data
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Time Spent',
      value: formatTime(progressData.avgResponseTimeMs || 0),
      icon: Clock,
      change: 0, // Would need previous period data
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Topics Mastered',
      value: progressData.topPerformers || 0,
      icon: Award,
      change: 0, // Would need previous period data
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Streak Display */}
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreakDisplay
              currentStreak={7} // Would come from streak data
              showCalendar={false}
            />
          </CardContent>
        </Card>

        {/* Metric Cards */}
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change: number;
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, icon: Icon, change, color, bgColor }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

  // Animated counter effect
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 1000; // 1 second
      const increment = end / (duration / 16); // 60fps

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [value]);

  const showChange = change !== 0;
  const isPositive = change > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <span>{title}</span>
          <div className={cn('p-2 rounded-lg', bgColor)}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? displayValue : value}
          </div>
          {showChange && (
            <div className={cn(
              'flex items-center text-xs',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>
                {Math.abs(change)}% vs last period
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
