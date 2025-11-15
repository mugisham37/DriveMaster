'use client';

import React from 'react';
import { MilestoneCard } from '../molecules/MilestoneCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Milestone } from '@/types/user-service';

export interface MilestoneData extends Milestone {
  estimatedCompletion?: Date;
}

interface MilestoneTrackerProps {
  milestones: MilestoneData[];
  className?: string;
}

export function MilestoneTracker({ milestones, className }: MilestoneTrackerProps) {
  const achievedCount = milestones.filter((m) => m.isAchieved).length;
  const totalCount = milestones.length;

  const getEstimatedDays = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Milestones</CardTitle>
          <div className="text-sm text-muted-foreground">
            {achievedCount} of {totalCount} achieved
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone) => {
            const estimatedDays = getEstimatedDays(milestone.estimatedCompletion);
            
            return (
              <div key={milestone.id} className="space-y-2">
                <MilestoneCard
                  milestone={milestone}
                  variant={
                    milestone.achieved
                      ? 'achieved'
                      : milestone.progress === 0
                      ? 'locked'
                      : 'default'
                  }
                />
                {!milestone.achieved && milestone.progress > 0 && estimatedDays && (
                  <p className="text-xs text-muted-foreground pl-4">
                    Estimated completion: {estimatedDays} day{estimatedDays !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
