/**
 * ActivityLayout Template
 * 
 * Layout component for activity monitoring dashboard with date range selector,
 * activity type filter, and sections for analytics.
 */

'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange } from '@/types/user-service';

interface ActivityLayoutProps {
  children: React.ReactNode;
  onDateRangeChange?: (range: DateRange) => void;
  onActivityTypeChange?: (type: string) => void;
  className?: string;
}

const DATE_RANGE_PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'All Time', days: 365 },
];

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'practice', label: 'Practice' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'review', label: 'Review' },
  { value: 'reading', label: 'Reading' },
];

export function ActivityLayout({
  children,
  onDateRangeChange,
  onActivityTypeChange,
  className = '',
}: ActivityLayoutProps) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedType, setSelectedType] = useState('all');

  const handleDateRangeChange = (days: number) => {
    setSelectedDays(days);
    if (onDateRangeChange) {
      const end = new Date();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      onDateRangeChange({ start, end });
    }
  };

  const handleActivityTypeChange = (type: string) => {
    setSelectedType(type);
    if (onActivityTypeChange) {
      onActivityTypeChange(type);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Activity & Insights</h1>
          <p className="text-muted-foreground mt-1">
            Track your learning patterns and get personalized insights
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Date Range Selector */}
          <Select
            value={selectedDays.toString()}
            onValueChange={(value) => handleDateRangeChange(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset.days} value={preset.days.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Activity Type Filter */}
          <Select value={selectedType} onValueChange={handleActivityTypeChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Activity type" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
