'use client';

/**
 * Mock Test Session Component
 * 
 * Full-screen test environment with timer and question navigation
 * Requirements: 15.1, 15.2, 15.3
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { QuestionDisplay } from '@/components/learning-platform/layer-3-ui';
import { Clock, Flag, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import type { ContentItem } from '@/types/entities';
import type { Question } from '@/types/learning-platform';

export interface MockTestSessionProps {
  questions: ContentItem[];
  timeLimit: number; // minutes
  onComplete: (results: MockTestResults) => void;
  onExit?: () => void;
}

export interface MockTestResults {
  answers: Map<string, string>;
  flaggedQuestions: Set<string>;
  timeUsed: number; // seconds
  score: number;
  accuracy: number;
}

/**
 * Convert ContentItem to Question format for QuestionDisplay
 */
function convertToQuestion(item: ContentItem): Question {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = item.metadata as any;
  const contentText = typeof item.content === 'string' ? item.content : item.title;
  
  return {
    id: item.id,
    text: contentText,
    type: metadata?.itemType || 'multiple-choice',
    choices: metadata?.choices || [],
    explanation: metadata?.explanation || '',
    difficulty: metadata?.difficulty || 0,
    discrimination: metadata?.discrimination || 1,
    guessing: metadata?.guessingProbability || 0.25,
    topics: metadata?.topics || [],
    mediaAssets: metadata?.mediaAssets || [],
    externalReferences: metadata?.externalReferences || [],
    estimatedTimeSeconds: metadata?.estimatedTime || 60,
  };
}

export function MockTestSession({
  questions,
  timeLimit,
  onComplete,
  onExit,
}: MockTestSessionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // Convert to seconds
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [startTime] = useState(Date.now());

  const currentQuestion = useMemo(
    () => {
      const question = questions[currentQuestionIndex];
      if (!question) {
        throw new Error('Question not found');
      }
      return convertToQuestion(question);
    },
    [questions, currentQuestionIndex]
  );

  const selectedAnswer = answers.get(currentQuestion.id);
  const isFlagged = flaggedQuestions.has(currentQuestion.id);

  // Calculate results
  const calculateResults = useCallback((): MockTestResults => {
    let correctCount = 0;
    
    questions.forEach((question) => {
      const userAnswer = answers.get(question.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = question.metadata as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const correctChoice = metadata?.choices?.find((c: any) => c.isCorrect);
      
      if (userAnswer && correctChoice && userAnswer === correctChoice.id) {
        correctCount++;
      }
    });

    const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    return {
      answers,
      flaggedQuestions,
      timeUsed,
      score: correctCount,
      accuracy,
    };
  }, [questions, answers, flaggedQuestions, startTime]);

  // Handle test submission
  const handleSubmit = useCallback(() => {
    const results = calculateResults();
    onComplete(results);
  }, [calculateResults, onComplete]);

  // Handle auto-submit when time expires
  const handleAutoSubmit = useCallback(() => {
    const results = calculateResults();
    onComplete(results);
  }, [calculateResults, onComplete]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, handleAutoSubmit]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer selection
  const handleAnswerSelect = useCallback((choiceId: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(currentQuestion.id, choiceId);
      return newAnswers;
    });
  }, [currentQuestion.id]);

  // Handle flag toggle
  const handleToggleFlag = useCallback(() => {
    setFlaggedQuestions((prev) => {
      const newFlags = new Set(prev);
      if (newFlags.has(currentQuestion.id)) {
        newFlags.delete(currentQuestion.id);
      } else {
        newFlags.add(currentQuestion.id);
      }
      return newFlags;
    });
  }, [currentQuestion.id]);

  // Navigate to question
  const handleNavigateToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(index);
  }, []);

  // Navigate to next question
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  // Navigate to previous question
  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Handle exit attempt
  const handleExitAttempt = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    if (onExit) {
      onExit();
    }
  }, [onExit]);

  // Check if all questions are answered
  const allAnswered = answers.size === questions.length;
  const answeredCount = answers.size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Mock Test</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-sm",
                timeRemaining < 300 ? "bg-red-100 text-red-800" : "bg-muted"
              )}>
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>

              {/* Submit Button */}
              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant={allAnswered ? "default" : "outline"}
              >
                Submit Test
              </Button>

              {/* Exit Button */}
              {onExit && (
                <Button
                  onClick={handleExitAttempt}
                  variant="ghost"
                  size="sm"
                >
                  Exit
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Question Navigation Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-sm">Questions</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = answers.has(question.id);
              const isFlaggedQ = flaggedQuestions.has(question.id);
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => handleNavigateToQuestion(index)}
                  className={cn(
                    "relative aspect-square rounded-md border-2 flex items-center justify-center text-sm font-medium transition-all",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    !isCurrent && isAnswered && "border-green-500 bg-green-50 text-green-700",
                    !isCurrent && !isAnswered && "border-muted-foreground/20 hover:border-muted-foreground/40"
                  )}
                  aria-label={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}${isFlaggedQ ? ' (flagged)' : ''}`}
                >
                  {index + 1}
                  {isFlaggedQ && (
                    <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500 fill-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <span>Not Answered ({questions.length - answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-orange-500" />
              <span>Flagged ({flaggedQuestions.size})</span>
            </div>
          </div>
        </div>

        {/* Question Display Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <QuestionDisplay
              question={currentQuestion}
              {...(selectedAnswer && { selectedChoiceId: selectedAnswer })}
              showFeedback={false}
              isDisabled={false}
              onChoiceSelect={handleAnswerSelect}
              className="mb-6"
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                onClick={handleToggleFlag}
                variant="outline"
                size="sm"
                className={cn(isFlagged && "border-orange-500 text-orange-600")}
              >
                <Flag className={cn("w-4 h-4 mr-2", isFlagged && "fill-orange-500")} />
                {isFlagged ? 'Unflag' : 'Flag for Review'}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to submit your test?</p>
              {!allAnswered && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">You have unanswered questions</p>
                    <p>You&apos;ve answered {answeredCount} out of {questions.length} questions.</p>
                  </div>
                </div>
              )}
              <p className="text-sm">Once submitted, you cannot change your answers.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your progress will not be saved and you&apos;ll need to start over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Exit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
