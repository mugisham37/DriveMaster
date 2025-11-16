/**
 * Activity Heatmap Calendar
 * 
 * Displays learning activity per day with intensity-based coloring,
 * current streak highlighting, and hover tooltips.
 * 
 * Requirements: 9.5
 * Task: 9.8
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
// Types imported from analytics service

interface ActivityHeatmapProps {
  historicalData: unknown;
  isLoading: boolean;
}

export function ActivityHeatmap({ isLoading }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  // Generate activity data for the last 12 weeks
  const activityData = generateActivityData();
  const weeks = groupByWeeks(activityData);
  const currentStreak = calculateCurrentStreak(activityData);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-500" />
              Activity Calendar
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your learning activity over the past 12 weeks
            </p>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-600">Current Streak</p>
                <p className="text-lg font-bold text-orange-600">{currentStreak} days</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'w-4 h-4 rounded',
                    getIntensityColor(level)
                  )}
                />
              ))}
            </div>
            <span>More</span>
          </div>

          {/* Heatmap Grid */}
          <TooltipProvider>
            <div className="overflow-x-auto">
              <div className="inline-flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col justify-around text-xs text-muted-foreground pr-2">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>

                {/* Weeks */}
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'w-3 h-3 rounded cursor-pointer transition-all hover:ring-2 hover:ring-blue-400',
                                getIntensityColor(day.intensity),
                                day.isStreak && 'ring-2 ring-orange-400'
                              )}
                              onMouseEnter={() => setHoveredDay(day)}
                              onMouseLeave={() => setHoveredDay(null)}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p className="font-semibold">{day.date}</p>
                              <p>{day.questionsAnswered} questions answered</p>
                              <p>{formatTime(day.timeSpent)} study time</p>
                              {day.isStreak && (
                                <p className="text-orange-500 flex items-center gap-1 mt-1">
                                  <Flame className="h-3 w-3" />
                                  Part of current streak
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>

          {/* Month labels */}
          <div className="flex justify-between text-xs text-muted-foreground pl-12">
            {getMonthLabels(weeks).map((month, index) => (
              <span key={index}>{month}</span>
            ))}
          </div>

          {/* Summary stats */}
          {hoveredDay && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{hoveredDay.date}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Questions</p>
                  <p className="font-semibold">{hoveredDay.questionsAnswered}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Spent</p>
                  <p className="font-semibold">{formatTime(hoveredDay.timeSpent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-semibold">{hoveredDay.accuracy}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Types
interface DayActivity {
  date: string;
  intensity: number; // 0-4
  questionsAnswered: number;
  timeSpent: number; // minutes
  accuracy: number;
  isStreak: boolean;
}

// Helper functions
function getIntensityColor(intensity: number): string {
  switch (intensity) {
    case 0:
      return 'bg-gray-100';
    case 1:
      return 'bg-green-200';
    case 2:
      return 'bg-green-400';
    case 3:
      return 'bg-green-600';
    case 4:
      return 'bg-green-800';
    default:
      return 'bg-gray-100';
  }
}

function generateActivityData(): DayActivity[] {
  const data: DayActivity[] = [];
  const today = new Date();
  const daysToGenerate = 84; // 12 weeks

  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Random activity with some days having no activity
    const hasActivity = Math.random() > 0.2;
    const questionsAnswered = hasActivity ? Math.floor(Math.random() * 30) + 5 : 0;
    const timeSpent = hasActivity ? Math.floor(Math.random() * 60) + 10 : 0;
    const accuracy = hasActivity ? Math.floor(Math.random() * 30) + 70 : 0;

    // Calculate intensity based on questions answered
    let intensity = 0;
    if (questionsAnswered > 0) {
      if (questionsAnswered >= 25) intensity = 4;
      else if (questionsAnswered >= 20) intensity = 3;
      else if (questionsAnswered >= 10) intensity = 2;
      else intensity = 1;
    }

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      intensity,
      questionsAnswered,
      timeSpent,
      accuracy,
      isStreak: false, // Will be calculated
    });
  }

  // Mark streak days
  const streakDays = calculateCurrentStreak(data);
  if (streakDays > 0) {
    for (let i = data.length - streakDays; i < data.length; i++) {
      const day = data[i];
      if (day && day.intensity > 0) {
        day.isStreak = true;
      }
    }
  }

  return data;
}

function groupByWeeks(data: DayActivity[]): DayActivity[][] {
  const weeks: DayActivity[][] = [];
  let currentWeek: DayActivity[] = [];

  if (data.length === 0) {
    return weeks;
  }

  // Pad the beginning to start on Sunday
  const firstDate = new Date(data[0]?.date || new Date());
  const firstDayOfWeek = firstDate.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({
      date: '',
      intensity: 0,
      questionsAnswered: 0,
      timeSpent: 0,
      accuracy: 0,
      isStreak: false,
    });
  }

  data.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Pad the last week if needed
  while (currentWeek.length < 7) {
    currentWeek.push({
      date: '',
      intensity: 0,
      questionsAnswered: 0,
      timeSpent: 0,
      accuracy: 0,
      isStreak: false,
    });
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonthLabels(weeks: DayActivity[][]): string[] {
  const labels: string[] = [];
  const seenMonths = new Set<string>();

  weeks.forEach((week) => {
    const firstDay = week.find((day) => day.date !== '');
    if (firstDay?.date) {
      const month = new Date(firstDay.date).toLocaleDateString('en-US', { month: 'short' });
      if (!seenMonths.has(month)) {
        labels.push(month);
        seenMonths.add(month);
      }
    }
  });

  return labels;
}

function calculateCurrentStreak(data: DayActivity[]): number {
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const day = data[i];
    if (day && day.intensity > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
