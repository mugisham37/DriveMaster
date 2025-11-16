"use client";

/**
 * Lesson Header Component
 * 
 * Sticky header with progress indicators for lesson view
 * Requirements: 6.1, 12.1
 */

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Clock } from 'lucide-react';

export interface LessonHeaderProps {
  lessonTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  startTime: Date;
  correctAnswers: number;
  onExit: () => void;
}

export function LessonHeader({
  lessonTitle,
  currentQuestionIndex,
  totalQuestions,
  startTime,
  correctAnswers,
  onExit,
}: LessonHeaderProps) {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Update time elapsed every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate accuracy percentage
  const accuracy = currentQuestionIndex > 0
    ? Math.round((correctAnswers / currentQuestionIndex) * 100)
    : 0;
  
  // Calculate progress percentage
  const progressPercentage = (currentQuestionIndex / totalQuestions) * 100;
  
  const handleExitClick = () => {
    // Show confirmation dialog if there's progress
    if (currentQuestionIndex > 0) {
      setShowExitDialog(true);
    } else {
      onExit();
    }
  };
  
  const handleConfirmExit = () => {
    setShowExitDialog(false);
    onExit();
  };
  
  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            {/* Left section: Exit button and title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={handleExitClick}
                className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                aria-label="Exit lesson"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold truncate">{lessonTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            
            {/* Right section: Stats */}
            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
              {/* Time elapsed */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              
              {/* Accuracy */}
              {currentQuestionIndex > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Accuracy: </span>
                  <span className={`font-semibold ${
                    accuracy >= 80 ? 'text-green-600' :
                    accuracy >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {accuracy}%
                  </span>
                </div>
              )}
              
              {/* Progress percentage */}
              <div className="text-sm text-muted-foreground hidden sm:block">
                {Math.round(progressPercentage)}% Complete
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Lesson progress: ${Math.round(progressPercentage)}%`}
            />
          </div>
        </div>
      </div>
      
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress has been saved. You can resume this lesson later from where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Learning</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Exit Lesson
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
