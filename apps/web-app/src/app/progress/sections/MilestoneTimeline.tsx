/**
 * Milestone Timeline
 * 
 * Displays past achievements, current progress, and upcoming milestones
 * with estimated completion dates.
 * 
 * Requirements: 9.4
 * Task: 9.7
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  CheckCircle2,
  Clock,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningProgressMetrics } from '@/types/analytics-service';

interface MilestoneTimelineProps {
  progressData?: LearningProgressMetrics;
  isLoading: boolean;
}

export function MilestoneTimeline({ progressData, isLoading }: MilestoneTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate mock milestone data
  const milestones = generateMockMilestones();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Milestones
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your achievements and upcoming goals
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Milestone items */}
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={index}
                milestone={milestone}
                isLast={index === milestones.length - 1}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MilestoneItemProps {
  milestone: Milestone;
  isLast: boolean;
}

function MilestoneItem({ milestone, isLast }: MilestoneItemProps) {
  const statusConfig = getStatusConfig(milestone.status);

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-4 top-2 w-5 h-5 rounded-full border-4 border-white z-10',
        statusConfig.dotColor
      )}>
        {milestone.status === 'achieved' && (
          <CheckCircle2 className="h-4 w-4 text-white absolute -top-0.5 -left-0.5" />
        )}
      </div>

      {/* Milestone content */}
      <div className={cn(
        'p-4 rounded-lg border-2 transition-all',
        statusConfig.borderColor,
        statusConfig.bgColor
      )}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{milestone.title}</h4>
              <Badge variant={statusConfig.badgeVariant}>
                {milestone.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {milestone.description}
            </p>
          </div>
          <div className={cn('p-2 rounded-lg', statusConfig.iconBg)}>
            {statusConfig.icon}
          </div>
        </div>

        {/* Progress bar for in-progress milestones */}
        {milestone.status === 'in-progress' && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{milestone.progress}% complete</span>
              <span>{milestone.current} / {milestone.target}</span>
            </div>
            <Progress value={milestone.progress} className="h-2" />
          </div>
        )}

        {/* Date information */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {milestone.status === 'achieved' && milestone.achievedDate && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Achieved {milestone.achievedDate}</span>
            </div>
          )}
          {milestone.status === 'in-progress' && milestone.estimatedDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Est. {milestone.estimatedDate}</span>
            </div>
          )}
          {milestone.status === 'upcoming' && milestone.targetDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Target: {milestone.targetDate}</span>
            </div>
          )}
        </div>

        {/* Requirements for upcoming milestones */}
        {milestone.status === 'upcoming' && milestone.requirements && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Requirements:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {milestone.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Types
interface Milestone {
  title: string;
  description: string;
  status: 'achieved' | 'in-progress' | 'upcoming';
  progress?: number;
  current?: number;
  target?: number;
  achievedDate?: string;
  estimatedDate?: string;
  targetDate?: string;
  requirements?: string[];
}

// Helper functions
function getStatusConfig(status: 'achieved' | 'in-progress' | 'upcoming') {
  switch (status) {
    case 'achieved':
      return {
        dotColor: 'bg-green-500',
        borderColor: 'border-green-300',
        bgColor: 'bg-green-50',
        iconBg: 'bg-green-100',
        icon: <Trophy className="h-5 w-5 text-green-600" />,
        badgeVariant: 'default' as const,
      };
    case 'in-progress':
      return {
        dotColor: 'bg-blue-500',
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        icon: <Target className="h-5 w-5 text-blue-600" />,
        badgeVariant: 'secondary' as const,
      };
    case 'upcoming':
      return {
        dotColor: 'bg-gray-300',
        borderColor: 'border-gray-300',
        bgColor: 'bg-gray-50',
        iconBg: 'bg-gray-100',
        icon: <Calendar className="h-5 w-5 text-gray-600" />,
        badgeVariant: 'outline' as const,
      };
  }
}

function generateMockMilestones(): Milestone[] {
  return [
    {
      title: 'First 100 Questions',
      description: 'Complete your first 100 practice questions',
      status: 'achieved',
      achievedDate: 'Nov 10, 2024',
    },
    {
      title: '7-Day Streak',
      description: 'Maintain a learning streak for 7 consecutive days',
      status: 'achieved',
      achievedDate: 'Nov 12, 2024',
    },
    {
      title: 'Master 5 Topics',
      description: 'Achieve 80% or higher mastery in 5 different topics',
      status: 'in-progress',
      progress: 60,
      current: 3,
      target: 5,
      estimatedDate: 'Nov 25, 2024',
    },
    {
      title: '500 Questions Milestone',
      description: 'Answer a total of 500 practice questions',
      status: 'in-progress',
      progress: 72,
      current: 360,
      target: 500,
      estimatedDate: 'Nov 30, 2024',
    },
    {
      title: 'Mock Test Ready',
      description: 'Achieve 80% average accuracy across all topics',
      status: 'upcoming',
      targetDate: 'Dec 15, 2024',
      requirements: [
        'Complete at least 300 questions',
        'Master 8 out of 10 topics',
        'Maintain 7-day streak',
      ],
    },
    {
      title: 'Test Champion',
      description: 'Pass 3 full-length mock tests with 90% or higher',
      status: 'upcoming',
      targetDate: 'Dec 30, 2024',
      requirements: [
        'Complete Mock Test Ready milestone',
        'Take at least 5 mock tests',
        'Achieve 90% in 3 consecutive tests',
      ],
    },
  ];
}
