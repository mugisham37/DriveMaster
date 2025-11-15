'use client';

import React, { useState } from 'react';
import { ProgressRing } from '../atoms/ProgressRing';
import { StreakFlame } from '../atoms/StreakFlame';
import { SkillMasteryItem } from '../molecules/SkillMasteryItem';
import { MilestoneCard } from '../molecules/MilestoneCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProgressSummary } from '@/hooks/useUserService';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SkillMastery, WeeklyProgressPoint, Milestone } from '@/types/user-service';

export type TimeRange = '7days' | '30days' | 'alltime';

export interface ProgressDashboardProps {
  userId?: string;
  timeRange?: TimeRange;
  showCharts?: boolean;
  className?: string;
}

export function ProgressDashboard({
  userId,
  timeRange: initialTimeRange = '7days',
  showCharts = true,
  className,
}: ProgressDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const { data: summary, isLoading, error } = useProgressSummary(userId || '');

  if (isLoading) {
    return <ProgressDashboardSkeleton className={className} />;
  }

  if (error || !summary) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <p className="text-sm text-destructive">Failed to load progress data. Please try again.</p>
      </div>
    );
  }

  const overallMastery = Math.round((summary.overallMastery || 0) * 100);
  const totalTopics = summary.topicMasteries ? Object.keys(summary.topicMasteries).length : 0;
  const masteredTopics = summary.topicMasteries 
    ? Object.values(summary.topicMasteries).filter((t: SkillMastery) => t.mastery >= 0.8).length 
    : 0;
  const streak = summary.learningStreak || 0;
  const longestStreak = summary.consecutiveDays || 0;

  // Calculate trend (simplified - in real app would compare with previous period)
  const trend = overallMastery >= 70 ? 'improving' : overallMastery >= 50 ? 'stable' : 'declining';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Progress</h2>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="alltime">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall Mastery Section */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Overall Mastery</h3>
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="flex flex-col items-center">
            <ProgressRing
              value={overallMastery}
              size={160}
              strokeWidth={12}
              showLabel
              label={`${overallMastery}%`}
            />
            <p className="mt-2 text-sm text-muted-foreground">Overall Progress</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Topics</p>
                <p className="text-2xl font-bold">{totalTopics}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mastered</p>
                <p className="text-2xl font-bold text-green-600">{masteredTopics}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Trend</p>
                <div className="flex items-center gap-2">
                  {trend === 'improving' && (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-600">Improving</span>
                    </>
                  )}
                  {trend === 'stable' && (
                    <>
                      <Minus className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-600">Stable</span>
                    </>
                  )}
                  {trend === 'declining' && (
                    <>
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-600">Needs Attention</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Streak Section */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Learning Streak</h3>
        <div className="flex items-center gap-6">
          <StreakFlame streak={streak} size="lg" animated showLabel />
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{streak}</span>
              <span className="text-muted-foreground">day{streak !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Longest streak: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
            </p>
            {streak > 0 && (
              <p className="text-sm text-green-600">
                Keep it up! You&apos;re on fire! 🔥
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Skill Mastery List */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Skill Mastery</h3>
        <div className="space-y-3">
          {summary.topicMasteries && Object.values(summary.topicMasteries).length > 0 ? (
            Object.values(summary.topicMasteries)
              .sort((a: SkillMastery, b: SkillMastery) => a.mastery - b.mastery) // Show lowest mastery first for focus
              .map((topic: SkillMastery) => (
                <SkillMasteryItem
                  key={topic.topic}
                  topic={topic.topic}
                  mastery={topic.mastery}
                  practiceCount={topic.practiceCount || 0}
                  lastPracticed={topic.lastPracticed ? new Date(topic.lastPracticed) : new Date()}
                  timeSpent={topic.totalTimeMs || 0}
                />
              ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No skill data available yet.</p>
              <p className="text-sm">Start practicing to see your progress!</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Progress Chart */}
      {showCharts && summary.weeklyProgress && summary.weeklyProgress.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Weekly Progress</h3>
          <div className="space-y-2">
            {summary.weeklyProgress.map((day: WeeklyProgressPoint, index: number) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-12 text-sm text-muted-foreground">
                  {day.week}
                </span>
                <div className="flex-1">
                  <div className="h-8 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(day.mastery * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right text-sm font-medium">
                  {Math.round(day.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones Section */}
      {summary.milestones && summary.milestones.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Milestones</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.milestones.map((milestone: Milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                showProgress
                variant={
                  milestone.achieved
                    ? 'achieved'
                    : milestone.progress >= 0.5
                    ? 'default'
                    : 'locked'
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Recommendations</h3>
          <div className="space-y-3">
            {summary.recommendations.map((rec: string, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary">
                    •
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressDashboardSkeleton({ className }: { className: string | undefined }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="flex gap-6">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
