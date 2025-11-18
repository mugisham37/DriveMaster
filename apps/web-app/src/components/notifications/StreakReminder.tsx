"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Shield, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

export interface StreakReminderProps {
  streak: {
    currentStreak: number;
    longestStreak: number;
    streakGoal?: number;
    lastActivity: Date;
    timeRemaining: number; // hours
  };
  onContinue?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const getUrgencyColor = (hours: number) => {
  if (hours <= 2) return 'text-red-500';
  if (hours <= 6) return 'text-orange-500';
  return 'text-green-500';
};

const getMotivationalMessage = (currentStreak: number, timeRemaining: number) => {
  if (timeRemaining <= 2) {
    return "⏰ Time is running out! Don't break your streak now!";
  }
  if (currentStreak >= 30) {
    return "🔥 You're on fire! Keep this amazing momentum going!";
  }
  if (currentStreak >= 7) {
    return "💪 One week strong! You're building a powerful habit!";
  }
  return "🌟 Great start! Every day counts toward your goal!";
};

export function StreakReminder({
  streak,
  onContinue,
  onDismiss,
  className = "",
}: StreakReminderProps) {
  const urgencyColor = getUrgencyColor(streak.timeRemaining);
  const motivationalMessage = getMotivationalMessage(
    streak.currentStreak,
    streak.timeRemaining
  );

  // Calculate progress toward goal
  const goalProgress = streak.streakGoal 
    ? (streak.currentStreak / streak.streakGoal) * 100 
    : 0;

  // Generate streak history (last 7 days)
  const streakHistory = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i,
      active: i < 7, // Mock: all active for demo
    }));
  }, []);

  return (
    <Card className={`w-full max-w-md bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800 ${className}`}>
      <CardContent className="pt-6 space-y-4">
        {/* Animated Flame Icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <Flame className="w-20 h-20 text-orange-500 fill-orange-500" />
          </motion.div>

          {/* Current Streak Count */}
          <div className="space-y-1">
            <h3 className="text-4xl font-bold text-orange-600 dark:text-orange-400">
              {streak.currentStreak}
            </h3>
            <p className="text-sm text-muted-foreground">day streak</p>
          </div>
        </div>

        {/* Progress Ring (if goal exists) */}
        {streak.streakGoal && (
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - goalProgress / 100)}`}
                className="text-orange-500 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium">
                {streak.currentStreak}/{streak.streakGoal}
              </span>
            </div>
          </div>
        )}

        {/* Time Remaining */}
        <div className={`flex items-center justify-center gap-2 ${urgencyColor}`}>
          <Clock className="w-5 h-5" />
          <span className="font-semibold">
            {streak.timeRemaining}h remaining today
          </span>
        </div>

        {/* Motivational Message */}
        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg text-center">
          <p className="text-sm font-medium">{motivationalMessage}</p>
        </div>

        {/* Streak History Mini-Chart */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Last 7 days</p>
          <div className="flex justify-center gap-1">
            {streakHistory.map((day) => (
              <div
                key={day.day}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  day.active
                    ? 'bg-orange-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {day.active && <Flame className="w-3 h-3 text-white" />}
              </div>
            ))}
          </div>
        </div>

        {/* Longest Streak & Freeze Badge */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Longest: {streak.longestStreak} days</span>
          </div>
          {streak.currentStreak >= 7 && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="w-3 h-3" />
              Protected
            </Badge>
          )}
        </div>

        {/* Activity Suggestion */}
        <div className="text-center text-sm text-muted-foreground">
          Suggested: Complete today's lesson to continue your streak
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
        <Button
          className="flex-1 bg-orange-500 hover:bg-orange-600"
          onClick={onContinue}
        >
          Continue Streak
        </Button>
      </CardFooter>
    </Card>
  );
}

export default StreakReminder;
