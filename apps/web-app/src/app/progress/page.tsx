/**
 * Progress Dashboard Page
 * 
 * Displays comprehensive progress tracking and visualization.
 * Implements code splitting for performance optimization.
 * 
 * Requirements: 5.1, 9.3 (code splitting), 11.6 (error boundaries)
 * Task: 8.9, 12.1 (route-based code splitting), 14.1 (error boundary wrapping)
 */

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ProgressTrackingErrorBoundary } from '@/components/user/error-boundary';
import { useProgressSummary } from '@/hooks/useUserService';
import {
  ProgressLayout,
  type TimeRange,
  type SkillMasteryData,
  type DailyProgressData,
  type MilestoneData,
  type DailyActivity,
  type Recommendation,
} from '@/components/user/templates';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

// Code splitting: Lazy load heavy chart and visualization components (Task 12.2)
const OverallMasterySection = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.OverallMasterySection })),
  { loading: () => <Skeleton className="h-[200px] w-full" /> }
);

const SkillMasteryList = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.SkillMasteryList })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const WeeklyProgressChart = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.WeeklyProgressChart })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const LearningStreakDisplay = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.LearningStreakDisplay })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const MilestoneTracker = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.MilestoneTracker })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const ProgressHeatmap = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.ProgressHeatmap })),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const RecommendationsSection = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.RecommendationsSection })),
  { loading: () => <Skeleton className="h-[200px] w-full" /> }
);

export default function ProgressPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data: progressData, isLoading, error, refetch } = useProgressSummary();

  // Handle new milestone celebrations
  React.useEffect(() => {
    if (progressData?.newMilestones && progressData.newMilestones.length > 0) {
      progressData.newMilestones.forEach((milestone: any) => {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              <span>Milestone Achieved!</span>
            </div>
          ),
          description: milestone.title,
          duration: 5000,
        });
      });
    }
  }, [progressData?.newMilestones, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Progress</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load progress data'}
            <button
              onClick={() => refetch()}
              className="ml-4 underline hover:no-underline"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Progress Data</AlertTitle>
          <AlertDescription>
            Start learning to see your progress here!
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Transform API data to component props
  const skillMasteryData: SkillMasteryData[] = progressData.skillMastery?.map((skill: any) => ({
    id: skill.topicId,
    topicName: skill.topicName,
    mastery: skill.mastery || 0,
    practiceCount: skill.practiceCount || 0,
    timeSpent: skill.timeSpent || 0,
    lastPracticed: new Date(skill.lastPracticed || Date.now()),
  })) || [];

  const weeklyProgressData: DailyProgressData[] = progressData.weeklyProgress?.map((day: any) => ({
    date: day.date,
    mastery: day.mastery,
    studyTime: day.studyTime,
    accuracy: day.accuracy,
  })) || [];

  const milestoneData: MilestoneData[] = progressData.milestones?.map((milestone: any) => ({
    ...milestone,
    estimatedCompletion: milestone.estimatedCompletion ? new Date(milestone.estimatedCompletion) : undefined,
  })) || [];

  const heatmapData: DailyActivity[] = progressData.activityHeatmap?.map((day: any) => ({
    date: day.date,
    intensity: day.intensity,
    activityCount: day.activityCount,
    studyTime: day.studyTime,
  })) || [];

  const recommendations: Recommendation[] = progressData.recommendations?.map((rec: any) => ({
    id: rec.id,
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    estimatedImpact: rec.estimatedImpact,
    actionLabel: rec.actionLabel,
    actionUrl: rec.actionUrl,
    onAction: () => {
      if (rec.actionUrl) {
        window.location.href = rec.actionUrl;
      }
    },
  })) || [];

  const topics = skillMasteryData.map((skill) => ({
    id: skill.id,
    name: skill.topicName,
  }));

  return (
    <ProgressTrackingErrorBoundary>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Progress Dashboard</h1>
          <p className="text-muted-foreground">
            Track your learning journey and skill development
          </p>
        </div>

        <ProgressLayout
          onTimeRangeChange={setTimeRange}
          onTopicFilterChange={setSelectedTopic}
          topics={topics}
          defaultTimeRange={timeRange}
        >
          {/* Overall Mastery */}
          <OverallMasterySection
            overallMastery={progressData.overallMastery || 0}
            totalTopics={progressData.totalTopics || 0}
            masteredTopics={progressData.masteredTopics || 0}
            trend={progressData.trend || 'stable'}
          />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Learning Streak */}
            <LearningStreakDisplay
              currentStreak={progressData.currentStreak || 0}
              longestStreak={progressData.longestStreak || 0}
              streakCalendar={progressData.streakCalendar || []}
            />

            {/* Weekly Progress Chart */}
            <WeeklyProgressChart data={weeklyProgressData} />
          </div>

          {/* Skill Mastery List */}
          <SkillMasteryList
            skills={skillMasteryData}
            onSkillClick={(skillId) => {
              console.log('Skill clicked:', skillId);
              // Navigate to skill details or open modal
            }}
          />

          {/* Milestones */}
          <MilestoneTracker milestones={milestoneData} />

          {/* Activity Heatmap */}
          <ProgressHeatmap data={heatmapData} />

          {/* Recommendations */}
          <RecommendationsSection recommendations={recommendations} />
        </ProgressLayout>
      </div>
    </ProgressTrackingErrorBoundary>
  );
}
