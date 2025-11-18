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
  const difficulty = difficultyConfig[reminder.difficulty];
  
  // Calculate progress toward daily goal (mock: 0-100%)
  const dailyProgress = Math.min((reminder.itemsDue / 20) * 100, 100);

  // Calculate hours overdue if applicable
  const hoursOverdue = reminder.lastReview 
    ? Math.max(0, Math.floor((Date.now() - reminder.lastReview.getTime()) / (1000 * 60 * 60)) - 24)
    : 0;

  const handleSnooze = (hours: number) => {
    onSnooze?.(hours);
    setShowSnoozeOptions(false);
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Time to review {reminder.topic}</h3>
          </div>
          {reminder.optimalTiming ? (
            <Badge variant="default" className="bg-green-500">
              <Clock className="w-3 h-3 mr-1" />
              Perfect timing!
            </Badge>
          ) : hoursOverdue > 0 ? (
            <Badge variant="destructive">
              Overdue by {hoursOverdue}h
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Items Due Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Items due</span>
          <span className="text-2xl font-bold">{reminder.itemsDue}</span>
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
            <span className="text-sm text-muted-foreground">Daily goal progress</span>
            <span className="text-sm font-medium">{Math.round(dailyProgress)}%</span>
          </div>
          <Progress value={dailyProgress} className="h-2" />
        </div>

        {/* Estimated Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Estimated: {Math.ceil(reminder.itemsDue * 0.5)} minutes</span>
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
            <TrendingUp className="w-3 h-3" />
            <span>
              Last reviewed: {new Date(reminder.lastReview).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {showSnoozeOptions ? (
          <div className="flex gap-2 w-full">
            <Select onValueChange={(value) => handleSnooze(Number(value))}>
              <SelectTrigger className="flex-1">
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
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowSnoozeOptions(true)}
            >
              Snooze
            </Button>
            <Button
              className="flex-1"
              onClick={onReview}
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
