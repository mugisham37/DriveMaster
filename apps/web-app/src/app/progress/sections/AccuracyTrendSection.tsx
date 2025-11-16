/**
 * Accuracy Trend Section
 * 
 * Displays accuracy percentage over time with time range selector and trend indicators.
 * Uses lazy-loaded recharts library for performance.
 * 
 * Requirements: 9.3
 * Task: 9.5
 */

'use client';

import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HistoricalMetricsResponse } from '@/types/analytics-service';

// Lazy load chart component
const LazyAccuracyLineChart = lazy(() => import('./charts/AccuracyLineChart'));

interface AccuracyTrendSectionProps {
  historicalData?: HistoricalMetricsResponse;
  timeRange: '7days' | '30days' | '90days' | 'all';
  onTimeRangeChange: (range: '7days' | '30days' | '90days' | 'all') => void;
  isLoading: boolean;
}

export function AccuracyTrendSection({
  historicalData,
  timeRange,
  onTimeRangeChange,
  isLoading,
}: AccuracyTrendSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  // Generate mock data for demonstration
  const accuracyData = generateMockAccuracyData(timeRange);
  const trend = calculateTrend(accuracyData);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">Accuracy Trend</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track your accuracy over time
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRange