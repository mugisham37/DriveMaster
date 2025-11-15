'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type TimeRange = '7days' | '30days' | 'alltime';

interface ProgressLayoutProps {
  children: React.ReactNode;
  onTimeRangeChange?: (range: TimeRange) => void;
  onTopicFilterChange?: (topicId: string | null) => void;
  topics?: Array<{ id: string; name: string }>;
  defaultTimeRange?: TimeRange;
}

export function ProgressLayout({
  children,
  onTimeRangeChange,
  onTopicFilterChange,
  topics = [],
  defaultTimeRange = '7days',
}: ProgressLayoutProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    onTimeRangeChange?.(value);
  };

  const handleTopicChange = (value: string) => {
    setSelectedTopic(value);
    onTopicFilterChange?.(value === 'all' ? null : value);
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Time Range Selector */}
          <div className="space-y-2">
            <Label htmlFor="time-range" className="text-sm font-medium">
              Time Range
            </Label>
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger id="time-range" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Topic Filter */}
          {topics.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="topic-filter" className="text-sm font-medium">
                Topic
              </Label>
              <Select value={selectedTopic} onValueChange={handleTopicChange}>
                <SelectTrigger id="topic-filter" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
