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
// Types imported from analytics service

// Lazy load chart component
const LazyAccuracyLineChart = lazy(() => import('./charts/AccuracyLineChart'));

interface AccuracyTrendSectionProps {
  historicalData: unknown;
  timeRange: '7days' | '30days' | '90days' | 'all';
  onTimeRangeChange: (range: '7days' | '30days' | '90days' | 'all') => void;
  isLoading: boolean;
}

export function AccuracyTrendSection({
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
              onClick={() => onTimeRangeChange('7days')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('30days')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('90days')}
            >
              90 Days
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange('all')}
            >
              All Time
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Trend Summary */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Accuracy</p>
              <p className="text-3xl font-bold">{trend.average}%</p>
            </div>
            <div className="flex items-center gap-2">
              {trend.change > 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : trend.change < 0 ? (
                <TrendingDown className="h-6 w-6 text-red-600" />
              ) : (
                <Minus className="h-6 w-6 text-gray-600" />
              )}
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                )}>
                  {trend.change > 0 ? '+' : ''}{trend.change}%
                </p>
                <p className="text-xs text-muted-foreground">vs previous period</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View (Accessible)</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-6">
            <Suspense fallback={<Skeleton className="h-80 w-full" />}>
              <LazyAccuracyLineChart data={accuracyData} />
            </Suspense>
          </TabsContent>

          <TabsContent value="table" className="mt-6">
            <AccuracyDataTable data={accuracyData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface AccuracyDataTableProps {
  data: AccuracyDataPoint[];
}

function AccuracyDataTable({ data }: AccuracyDataTableProps) {
  return (
    <div className="rounded-md border max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
            <TableHead className="text-right">Questions</TableHead>
            <TableHead className="text-right">Correct</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((point, index) => (
            <TableRow key={index}>
              <TableCell>{point.date}</TableCell>
              <TableCell className="text-right font-medium">
                {point.accuracy}%
              </TableCell>
              <TableCell className="text-right">{point.questions}</TableCell>
              <TableCell className="text-right">{point.correct}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Types
interface AccuracyDataPoint {
  date: string;
  accuracy: number;
  questions: number;
  correct: number;
}

interface TrendSummary {
  average: number;
  change: number;
}

// Helper functions
function generateMockAccuracyData(timeRange: string): AccuracyDataPoint[] {
  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 180;
  const data: AccuracyDataPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const questions = Math.floor(Math.random() * 20) + 10;
    const accuracy = Math.floor(Math.random() * 30) + 65; // 65-95%
    const correct = Math.floor((questions * accuracy) / 100);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accuracy,
      questions,
      correct,
    });
  }

  return data;
}

function calculateTrend(data: AccuracyDataPoint[]): TrendSummary {
  if (data.length === 0) {
    return { average: 0, change: 0 };
  }

  const average = Math.round(
    data.reduce((sum, point) => sum + point.accuracy, 0) / data.length
  );

  // Calculate change from first half to second half
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, point) => sum + point.accuracy, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, point) => sum + point.accuracy, 0) / secondHalf.length;

  const change = Math.round(secondAvg - firstAvg);

  return { average, change };
}
