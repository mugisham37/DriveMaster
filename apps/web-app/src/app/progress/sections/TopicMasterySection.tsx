/**
 * Topic Mastery Section
 * 
 * Displays topic mastery with radar/bar chart visualization and accessible data table.
 * Uses lazy-loaded recharts library for performance.
 * 
 * Requirements: 9.2
 * Task: 9.4
 */

'use client';

import React, { lazy, Suspense, useState } from 'react';
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
import { TopicBadge } from '@/components/learning-platform/layer-3-ui';
import { BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningProgressMetrics } from '@/types/analytics-service';

// Lazy load chart components for performance
const LazyBarChart = lazy(() => import('./charts/TopicMasteryBarChart'));
const LazyRadarChart = lazy(() => import('./charts/TopicMasteryRadarChart'));

interface TopicMasterySectionProps {
  progressData?: LearningProgressMetrics;
  isLoading: boolean;
}

export function TopicMasterySection({ progressData, isLoading }: TopicMasterySectionProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return null;
  }

  // Mock topic mastery data - in real implementation, this would come from the API
  const topicMasteryData = generateMockTopicData();

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold">Topic Mastery</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Bar Chart
            </Button>
            <Button
              variant={chartType === 'radar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('radar')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Radar Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View (Accessible)</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              {chartType === 'bar' ? (
                <LazyBarChart
                  data={topicMasteryData}
                  onTopicClick={handleTopicClick}
                  selectedTopic={selectedTopic}
                />
              ) : (
                <LazyRadarChart
                  data={topicMasteryData}
                  onTopicClick={handleTopicClick}
                  selectedTopic={selectedTopic}
                />
              )}
            </Suspense>

            {/* Topic badges for quick filtering */}
            <div className="mt-6 flex flex-wrap gap-2">
              {topicMasteryData.map((topic) => (
                <button
                  key={topic.name}
                  onClick={() => handleTopicClick(topic.name)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                >
                  <TopicBadge
                    topic={topic.name}
                    masteryLevel={topic.mastery}
                    showMastery
                    size="md"
                  />
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-6">
            <TopicMasteryTable
              data={topicMasteryData}
              onTopicClick={handleTopicClick}
              selectedTopic={selectedTopic}
            />
          </TabsContent>
        </Tabs>

        {selectedTopic && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Topic Details: {selectedTopic}</h4>
            <p className="text-sm text-muted-foreground">
              Click on a topic to see detailed statistics and recommendations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TopicMasteryTableProps {
  data: TopicMasteryData[];
  onTopicClick: (topic: string) => void;
  selectedTopic: string | null;
}

function TopicMasteryTable({ data, onTopicClick, selectedTopic }: TopicMasteryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Mastery Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Practice Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((topic) => {
            const status = getMasteryStatus(topic.mastery);
            return (
              <TableRow
                key={topic.name}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  selectedTopic === topic.name && 'bg-muted'
                )}
                onClick={() => onTopicClick(topic.name)}
              >
                <TableCell className="font-medium">{topic.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          status.color
                        )}
                        style={{ width: `${topic.mastery}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{topic.mastery}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn('text-sm font-medium', status.textColor)}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">{topic.practiceCount}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Types
interface TopicMasteryData {
  name: string;
  mastery: number;
  practiceCount: number;
}

// Helper functions
function getMasteryStatus(mastery: number) {
  if (mastery >= 80) {
    return {
      label: 'Mastered',
      color: 'bg-green-500',
      textColor: 'text-green-600',
    };
  } else if (mastery >= 50) {
    return {
      label: 'In Progress',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    };
  } else {
    return {
      label: 'Needs Work',
      color: 'bg-red-500',
      textColor: 'text-red-600',
    };
  }
}

function generateMockTopicData(): TopicMasteryData[] {
  return [
    { name: 'Traffic Signs', mastery: 85, practiceCount: 45 },
    { name: 'Road Rules', mastery: 72, practiceCount: 38 },
    { name: 'Parking', mastery: 45, practiceCount: 22 },
    { name: 'Highway Driving', mastery: 90, practiceCount: 52 },
    { name: 'Emergency Procedures', mastery: 65, practiceCount: 30 },
    { name: 'Vehicle Maintenance', mastery: 55, practiceCount: 25 },
    { name: 'Weather Conditions', mastery: 78, practiceCount: 40 },
    { name: 'Defensive Driving', mastery: 82, practiceCount: 48 },
  ];
}
