"use client";

/**
 * ProgressOverview Component
 * 
 * Display comprehensive progress summary with real-time updates
 * Requirements: 2.1, 2.5, 9.1, 10.1, 10.4
 */

import React, { useEffect, useState } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { useRealtimeProgress } from '@/hooks/useRealtimeProgress';
import { StreakDisplay, ProgressBar } from '../../layer-3-ui';

export interface ProgressOverviewProps {
  userId: string;
  showDetailedStats?: boolean;
}

interface AnimatedNumber {
  current: number;
  target: number;
}

export function ProgressOverview({
  userId,
  showDetailedStats = true,
}: ProgressOverviewProps) {
  const { state, summary, learningStreak } = useProgress();
  const { isConnected } = useRealtimeProgress({ enabled: !!userId });

  // Animated counters for number updates
  const [questionsCount, setQuestionsCount] = useState<AnimatedNumber>({
    current: 0,
    target: 0,
  });
  const [accuracyPercent, setAccuracyPercent] = useState<AnimatedNumber>({
    current: 0,
    target: 0,
  });
  const [timeSpent, setTimeSpent] = useState<AnimatedNumber>({
    current: 0,
    target: 0,
  });

  // Update target values when summary changes
  useEffect(() => {
    if (summary) {
      setQuestionsCount(prev => ({
        ...prev,
        target: summary.totalAttempts || 0,
      }));
      setAccuracyPercent(prev => ({
        ...prev,
        target: summary.accuracyRate || 0,
      }));
      setTimeSpent(prev => ({
        ...prev,
        target: Math.floor((summary.totalStudyTimeMs || 0) / 1000 / 60), // Convert to minutes
      }));
    }
  }, [summary]);

  // Animate numbers
  useEffect(() => {
    const animateNumber = (
      setter: React.Dispatch<React.SetStateAction<AnimatedNumber>>,
      duration: number = 1000
    ) => {
      const startTime = Date.now();
      const animate = () => {
        setter(prev => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
          const current = Math.floor(prev.current + (prev.target - prev.current) * eased);

          if (progress < 1) {
            requestAnimationFrame(animate);
          }

          return { ...prev, current };
        });
      };
      requestAnimationFrame(animate);
    };

    animateNumber(setQuestionsCount);
    animateNumber(setAccuracyPercent);
    animateNumber(setTimeSpent);
  }, [questionsCount.target, accuracyPercent.target, timeSpent.target]);

  // Show celebration animation for milestones
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (summary) {
      // Check for milestone achievements
      const milestones = [10, 50, 100, 500, 1000];
      const totalQuestions = summary.totalAttempts || 0;
      if (milestones.includes(totalQuestions)) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
  }, [summary]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Failed to Load Progress
        </h3>
        <p className="text-sm text-muted-foreground">
          {state.error.message || 'Unable to load your progress data.'}
        </p>
      </div>
    );
  }

  // Calculate daily progress from recent attempts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyGoalProgress = summary?.recentAttempts?.filter((attempt) => {
    const attemptDate = new Date(attempt.timestamp);
    attemptDate.setHours(0, 0, 0, 0);
    return attemptDate.getTime() === today.getTime();
  }).length || 0;
  const dailyGoal = 10; // Default daily goal
  const dailyGoalPercent = Math.min((dailyGoalProgress / dailyGoal) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

      {/* Real-time Connection Indicator */}
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      )}

      {/* Streak Display */}
      {learningStreak && (
        <div className="bg-card border rounded-lg p-6">
          <StreakDisplay
            currentStreak={learningStreak.currentStreak}
            showCalendar={true}
          />
        </div>
      )}

      {/* Daily Goal Progress */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Daily Goal</h3>
            <p className="text-sm text-muted-foreground">
              {dailyGoalProgress} / {dailyGoal} questions
            </p>
          </div>
          <div className="text-2xl font-bold text-primary">
            {Math.round(dailyGoalPercent)}%
          </div>
        </div>
        <ProgressBar
          value={dailyGoalPercent}
          variant="circular"
          color={dailyGoalPercent >= 100 ? 'success' : 'primary'}
          showLabel={true}
          animated={true}
          size="lg"
        />
      </div>

      {/* Statistics Cards */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Questions Answered */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">{questionsCount.current}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total answered</p>
          </div>

          {/* Accuracy */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">{accuracyPercent.current}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </div>

          {/* Time Spent */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Spent</p>
                <p className="text-2xl font-bold">{timeSpent.current}m</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Learning time</p>
          </div>
        </div>
      )}

      {/* Topics Mastered */}
      {summary && summary.masteredTopics > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Topics Mastered</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve mastered {summary.masteredTopics} topics
              </p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
        </div>
      )}
    </div>
  );
}
