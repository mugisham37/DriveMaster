"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Clock, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTouchGestures } from "@/hooks/useTouchGestures";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

export interface SpacedRepetitionReminderProps {
  reminder: {
    topic: string;
    itemsDue: number;
    difficulty: 'easy' | 'medium' | 'hard';
    lastReview?: Date;
    optimalTiming: boolean;
  };
  onReview?: () => void;
  onSnooze?: (duration: number) => void;
  className?: string;
}

const difficultyConfig = {
  easy: { bars: 1, color: 'bg-green-500', label: 'Easy' },
  medium: { bars: 2, color: 'bg-yellow-500', label: 'Medium' },
  hard: { bars: 3, color: 'bg-red-500', label: 'Hard' },
};

const motivationalMessages = {
  optimal: "Perfect timing! Your brain is ready to reinforce this knowledge.",
  overdue: "Don't let your progress slip! Review now to maintain retention.",
  early: "Great initiative! Early reviews help build stronger memories.",
};

export function SpacedRepetitionReminder({
  reminder,
  onReview,
  onSnooze,
  className = "",
}: SpacedRepetitionReminderProps) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const _prefersReducedMotion = useReducedMotion(); // Available for future animation control
  const { trigger: triggerHaptic } = useHapticFeedback();
  
  const difficulty = difficultyConfig[reminder.difficulty];
  
  // Calculate progress toward daily goal (mock: 0-100%)
  const dailyProgress = Math.min((reminder.itemsDue / 20) * 100, 100);

  // Calculate hours overdue if applicable
  const hoursOverdue = reminder.lastReview 
    ? Math.max(0, Math.floor((Date.now() - reminder.lastReview.getTime()) / (1000 * 60 * 60)) - 24)
    : 0;

  const handleSnooze = (hours: number) => {
    triggerHaptic('light');
    onSnooze?.(hours);
    setShowSnoozeOptions(false);
  };

  const handleReview = () => {
    triggerHaptic('medium');
    onReview?.();
  };

  // Touch gestures for mobile
  const touchHandlers = useTouchGestures({
    onSwipeLeft: () => {
      triggerHaptic('light');
      setShowSnoozeOptions(true);
    },
    onSwipeRight: () => {
      setShowSnoozeOptions(false);
    },
  });

  return (
    <Card 
      className={`w-full max-w-md ${className}`}
      {...touchHandlers}
      role="article"
      aria-label={`Spaced repetition reminder for ${reminder.topic}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h3 className="font-semibold" id="reminder-title">
              Time to review {reminder.topic}
            </h3>
          </div>
          {reminder.optimalTiming ? (
            <Badge 
              variant="default" 
              className="bg-green-500"
              aria-label="Optimal timing for review"
            >
              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              Perfect timing!
            </Badge>
          ) : hoursOverdue > 0 ? (
            <Badge 
              variant="destructive"
              aria-label={`Review is overdue by ${hoursOverdue} hours`}
            >
              Overdue by {hoursOverdue}h
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Items Due Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground" id="items-due-label">
            Items due
          </span>
          <span 
            className="text-2xl font-bold" 
            aria-labelledby="items-due-label"
            aria-live="polite"
          >
            {reminder.itemsDue}
          </span>
        </div>

        {/* Difficulty Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Difficulty</span>
            <span className="text-sm font-medium">{difficulty.label}</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={`h-2 flex-1 rounded ${
                  bar <= difficulty.bars ? difficulty.color : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground" id="progress-label">
              Daily goal progress
            </span>
            <span className="text-sm font-medium" aria-live="polite">
              {Math.round(dailyProgress)}%
            </span>
          </div>
          <Progress 
            value={dailyProgress} 
            className="h-2"
            aria-labelledby="progress-label"
            aria-valuenow={Math.round(dailyProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Estimated Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span aria-label={`Estimated duration: ${Math.ceil(reminder.itemsDue * 0.5)} minutes`}>
            Estimated: {Math.ceil(reminder.itemsDue * 0.5)} minutes
          </span>
        </div>

        {/* Motivational Text */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {reminder.optimalTiming 
              ? motivationalMessages.optimal 
              : hoursOverdue > 0 
                ? motivationalMessages.overdue 
                : motivationalMessages.early}
          </p>
        </div>

        {/* Last Review */}
        {reminder.lastReview && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            <span aria-label={`Last reviewed on ${new Date(reminder.lastReview).toLocaleDateString()}`}>
              Last reviewed: {new Date(reminder.lastReview).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {showSnoozeOptions ? (
          <div className="flex gap-2 w-full" role="group" aria-label="Snooze options">
            <Select onValueChange={(value) => handleSnooze(Number(value))}>
              <SelectTrigger 
                className="flex-1 min-h-[44px]"
                aria-label="Select snooze duration"
              >
                <SelectValue placeholder="Snooze for..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">Tomorrow</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              onClick={() => setShowSnoozeOptions(false)}
              className="min-h-[44px] min-w-[44px]"
              aria-label="Cancel snooze"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => setShowSnoozeOptions(true)}
              aria-label="Snooze this reminder"
            >
              Snooze
            </Button>
            <Button
              className="flex-1 min-h-[44px]"
              onClick={handleReview}
              aria-label={`Start reviewing ${reminder.topic}`}
            >
              Start Review
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export default SpacedRepetitionReminder;
