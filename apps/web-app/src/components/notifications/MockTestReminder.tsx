"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, 
  Clock, 
  TrendingUp, 
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface MockTestReminderProps {
  testReminder: {
    testName: string;
    testType: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    estimatedDuration: number; // minutes
    userPassRate: number; // percentage
    averagePassRate: number; // percentage
    scheduledTime: Date;
    preparationTips?: string[];
  };
  onStart?: () => void;
  onReschedule?: (newTime: Date) => void;
  className?: string;
}

const difficultyColors = {
  beginner: 'bg-green-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-orange-500',
  expert: 'bg-red-500',
};

const getReadinessScore = (userPassRate: number, avgPassRate: number) => {
  // Calculate readiness based on user's historical performance
  const relativePerformance = (userPassRate / avgPassRate) * 100;
  return Math.min(Math.max(relativePerformance, 0), 100);
};

const getReadinessColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

const getReadinessMessage = (score: number) => {
  if (score >= 80) return "You're well prepared! Go ace this test!";
  if (score >= 60) return "You're on track. A quick review will help!";
  return "Consider more preparation before taking this test.";
};

export function MockTestReminder({
  testReminder,
  onStart,
  onReschedule,
  className = "",
}: MockTestReminderProps) {
  const [showTips, setShowTips] = useState(false);
  const readinessScore = getReadinessScore(
    testReminder.userPassRate,
    testReminder.averagePassRate
  );
  const readinessColor = getReadinessColor(readinessScore);
  const readinessMessage = getReadinessMessage(readinessScore);

  // Mock topic coverage data
  const topicCoverage = [
    { topic: 'Grammar', covered: true },
    { topic: 'Vocabulary', covered: true },
    { topic: 'Listening', covered: false },
    { topic: 'Reading', covered: true },
  ];

  const timeUntilTest = Math.max(
    0,
    Math.floor((testReminder.scheduledTime.getTime() - Date.now()) / (1000 * 60))
  );

  return (
    <Card className={`w-full max-w-md border-blue-200 dark:border-blue-800 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">{testReminder.testName}</h3>
              <p className="text-sm text-muted-foreground">{testReminder.testType}</p>
            </div>
          </div>
          <Badge className={difficultyColors[testReminder.difficulty]}>
            {testReminder.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Readiness Score</span>
            <span className={`text-2xl font-bold ${readinessColor}`}>
              {Math.round(readinessScore)}%
            </span>
          </div>
          <Progress value={readinessScore} className="h-2" />
          <p className="text-sm text-muted-foreground">{readinessMessage}</p>
        </div>

        {/* Test Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{testReminder.estimatedDuration} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Your Pass Rate</p>
              <p className="font-medium">{testReminder.userPassRate}%</p>
            </div>
          </div>
        </div>

        {/* Scheduled Time */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">
                {testReminder.scheduledTime.toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {timeUntilTest < 60 
                  ? `In ${timeUntilTest} minutes` 
                  : `In ${Math.floor(timeUntilTest / 60)} hours`}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onReschedule?.(new Date())}
          >
            Reschedule
          </Button>
        </div>

        {/* Topic Coverage Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Topic Coverage</p>
          <div className="space-y-1">
            {topicCoverage.map((item) => (
              <div key={item.topic} className="flex items-center gap-2 text-sm">
                {item.covered ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
                <span className={item.covered ? '' : 'text-muted-foreground'}>
                  {item.topic}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preparation Tips (Collapsible) */}
        {testReminder.preparationTips && testReminder.preparationTips.length > 0 && (
          <Collapsible open={showTips} onOpenChange={setShowTips}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="text-sm font-medium">Preparation Tips</span>
                {showTips ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {testReminder.preparationTips.map((tip, index) => (
                <div key={index} className="flex gap-2 text-sm">
                  <span className="text-blue-500">•</span>
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Prerequisites Warning */}
        {readinessScore < 60 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                Additional preparation recommended
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Review uncovered topics before starting the test.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onReschedule?.(new Date())}
        >
          Reschedule
        </Button>
        <Button
          className="flex-1"
          onClick={onStart}
          disabled={readinessScore < 40}
        >
          Start Test
        </Button>
      </CardFooter>
    </Card>
  );
}

export default MockTestReminder;
