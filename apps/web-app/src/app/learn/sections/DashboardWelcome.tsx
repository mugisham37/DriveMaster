"use client";

/**
 * Dashboard Welcome Section
 * 
 * Welcome message, streak display, and continue learning card
 * Requirements: 2.1, 2.2
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProgress } from '@/contexts/ProgressContext';
import { StreakDisplay } from '@/components/learning-platform/layer-3-ui';

export default function DashboardWelcome() {
  const router = useRouter();
  const { user } = useAuth();
  const { learningStreak } = useProgress();

  // Mock data for last incomplete lesson (will be replaced with actual data)
  const lastIncompleteLesson = null; // TODO: Fetch from API

  const handleContinueLearning = () => {
    if (lastIncompleteLesson) {
      // router.push(`/learn/lesson/${lastIncompleteLesson.id}`);
    } else {
      // Navigate to learning path if no incomplete lesson
      router.push('/learn/path');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Streak Display */}
        {learningStreak && (
          <div className="hidden md:block">
            <StreakDisplay
              currentStreak={learningStreak.currentStreak}
              showCalendar={false}
            />
          </div>
        )}
      </div>

      {/* Mobile Streak Display */}
      {learningStreak && (
        <div className="md:hidden bg-card border rounded-lg p-4">
          <StreakDisplay
            currentStreak={learningStreak.currentStreak}
            showCalendar={false}
          />
        </div>
      )}

      {/* Continue Learning Card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">Continue Learning</h2>
            {lastIncompleteLesson ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Pick up where you left off
                </p>
                {/* Lesson preview will go here */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-16 h-16 bg-muted rounded-lg"></div>
                  <div>
                    <p className="font-medium">Lesson Title</p>
                    <p className="text-sm text-muted-foreground">
                      Progress: 60%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start your first lesson or explore the learning path
              </p>
            )}
          </div>

          <button
            onClick={handleContinueLearning}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {lastIncompleteLesson ? 'Resume' : 'Start Learning'}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
