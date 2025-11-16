"use client";

/**
 * Dashboard Achievements Section
 * 
 * Display earned and locked achievement badges
 * Requirements: 2.5, 10.4
 */

import React, { useState } from 'react';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  progress?: number;
  requirement?: string;
}

// Mock achievements data (will be replaced with actual API data)
const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    earned: true,
    earnedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    earned: true,
    earnedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'Perfect Score',
    description: 'Get 100% on any lesson',
    icon: '⭐',
    earned: false,
    progress: 85,
    requirement: 'Score 100% on a lesson',
  },
  {
    id: '4',
    name: 'Topic Master',
    description: 'Master 5 topics',
    icon: '🏆',
    earned: false,
    progress: 60,
    requirement: 'Master 3 more topics',
  },
  {
    id: '5',
    name: 'Speed Demon',
    description: 'Complete 50 questions in one day',
    icon: '⚡',
    earned: false,
    progress: 40,
    requirement: 'Answer 30 more questions today',
  },
  {
    id: '6',
    name: 'Consistency King',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    earned: false,
    progress: 23,
    requirement: 'Continue for 7 more days',
  },
];

export default function DashboardAchievements() {
  const { activeNotifications, dismissNotification } = useAchievementNotifications();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const earnedAchievements = mockAchievements.filter(a => a.earned);

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
  };

  const closeModal = () => {
    setSelectedAchievement(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 id="achievements-heading" className="text-2xl font-bold">
          Achievements
        </h2>
        <span className="text-sm text-muted-foreground">
          {earnedAchievements.length} / {mockAchievements.length} earned
        </span>
      </div>

      {/* Celebration Notifications */}
      {activeNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {activeNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-card border-2 border-primary rounded-lg p-4 shadow-lg animate-in slide-in-from-right"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <h3 className="font-semibold">{notification.milestone.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {notification.milestone.description}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mockAchievements.map((achievement) => (
          <button
            key={achievement.id}
            onClick={() => handleAchievementClick(achievement)}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${achievement.earned
                ? 'bg-card border-primary hover:border-primary/80 hover:scale-105'
                : 'bg-muted/50 border-muted hover:border-muted-foreground/50'
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={`text-4xl ${!achievement.earned && 'grayscale opacity-50'}`}
              >
                {achievement.icon}
              </div>
              <p
                className={`text-xs font-medium text-center ${
                  !achievement.earned && 'text-muted-foreground'
                }`}
              >
                {achievement.name}
              </p>
              {!achievement.earned && achievement.progress !== undefined && (
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              )}
            </div>
            {achievement.earned && achievement.earnedAt && (
              <div className="absolute top-1 right-1">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">{selectedAchievement.icon}</div>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <h3 className="text-2xl font-bold mb-2">{selectedAchievement.name}</h3>
            <p className="text-muted-foreground mb-4">
              {selectedAchievement.description}
            </p>

            {selectedAchievement.earned ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium text-primary">
                  ✓ Earned on{' '}
                  {selectedAchievement.earnedAt?.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Progress</p>
                  <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${selectedAchievement.progress || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedAchievement.progress || 0}% complete
                  </p>
                </div>
                {selectedAchievement.requirement && (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">Next Step</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAchievement.requirement}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
