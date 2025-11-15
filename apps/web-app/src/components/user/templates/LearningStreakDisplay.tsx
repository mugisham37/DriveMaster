'use client';

import React from 'react';
import { StreakFlame } from '../atoms/StreakFlame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LearningStreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  streakCalendar?: boolean[]; // Last 30 days, true = active
  className?: string;
}

export function LearningStreakDisplay({
  currentStreak,
  longestStreak,
  streakCalendar = [],
  className,
}: LearningStreakDisplayProps) {
  const getEncouragementMessage = () => {
    if (currentStreak === 0) {
      return "Start your learning journey today!";
    } else if (currentStreak < 3) {
      return "Great start! Keep it going!";
    } else if (currentStreak < 7) {
      return "You're building momentum!";
    } else if (currentStreak < 30) {
      return "Impressive dedication!";
    } else if (currentStreak < 100) {
      return "You're on fire! 🔥";
    } else {
      return "Legendary streak! 🏆";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Learning Streak</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Streak */}
          <div className="flex items-center justify-center gap-6">
            <StreakFlame streak={currentStreak} size="lg" />
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{currentStreak}</p>
              <p className="text-sm text-muted-foreground">Day{currentStreak !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Encouragement Message */}
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">{getEncouragementMessage()}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
            </div>
          </div>

          {/* Streak Calendar (Last 30 Days) */}
          {streakCalendar.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Last 30 Days</p>
              <div className="grid grid-cols-10 gap-1">
                {streakCalendar.slice(-30).map((isActive, index) => (
                  <div
                    key={index}
                    className={cn(
                      'aspect-square rounded-sm',
                      isActive
                        ? 'bg-primary'
                        : 'bg-muted'
                    )}
                    title={`Day ${index + 1}: ${isActive ? 'Active' : 'Inactive'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
