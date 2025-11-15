'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DailyActivity {
  date: string;
  intensity: number; // 0-4 scale
  activityCount: number;
  studyTime: number; // in minutes
}

interface ProgressHeatmapProps {
  data: DailyActivity[];
  className?: string;
}

export function ProgressHeatmap({ data, className }: ProgressHeatmapProps) {
  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 0:
        return 'bg-muted';
      case 1:
        return 'bg-primary/20';
      case 2:
        return 'bg-primary/40';
      case 3:
        return 'bg-primary/60';
      case 4:
        return 'bg-primary/80';
      default:
        return 'bg-muted';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Ensure we have exactly 30 days
  const last30Days = data.slice(-30);
  
  // Group by weeks for better visualization
  const weeks: DailyActivity[][] = [];
  for (let i = 0; i < last30Days.length; i += 7) {
    weeks.push(last30Days.slice(i, i + 7));
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Practice Pattern (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => (
                  <Tooltip key={dayIndex}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary',
                          getIntensityColor(day.intensity)
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{formatDate(day.date)}</p>
                        <p className="text-sm">Activities: {day.activityCount}</p>
                        <p className="text-sm">Study Time: {formatTime(day.studyTime)}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn('w-4 h-4 rounded-sm', getIntensityColor(level))}
              />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
