'use client';

import React from 'react';
import { ProgressRing } from '../atoms/ProgressRing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TrendIndicator = 'improving' | 'stable' | 'declining';

interface OverallMasterySectionProps {
  overallMastery: number;
  totalTopics: number;
  masteredTopics: number;
  trend: TrendIndicator;
  className?: string;
}

export function OverallMasterySection({
  overallMastery,
  totalTopics,
  masteredTopics,
  trend,
  className,
}: OverallMasterySectionProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'stable':
        return <Minus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      case 'stable':
        return 'Stable';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 dark:text-green-400';
      case 'declining':
        return 'text-red-600 dark:text-red-400';
      case 'stable':
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Overall Mastery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Progress Ring */}
          <div className="flex-shrink-0">
            <ProgressRing
              value={overallMastery}
              size={180}
              strokeWidth={12}
              showLabel
              className="text-primary"
            />
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Topics</p>
                <p className="text-3xl font-bold">{totalTopics}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mastered Topics</p>
                <p className="text-3xl font-bold text-primary">{masteredTopics}</p>
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center gap-2 pt-2 border-t">
              {getTrendIcon()}
              <span className={cn('text-sm font-medium', getTrendColor())}>
                {getTrendText()}
              </span>
              <span className="text-sm text-muted-foreground">
                compared to last period
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
