"use client";

/**
 * LessonContainer Component
 * 
 * Orchestrates lesson flow, manages state, coordinates child components
 * Requirements: 2.3, 2.4, 3.1, 3.4, 6.1, 6.2, 6.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useContentItem } from '@/hooks/use-content-operations';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { QuestionDisplay } from '../../layer-3-ui';
import { LessonHeader } from './LessonHeader';

export interface LessonResults {
  lessonId: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;
  topicsCovered: string[];
  completedAt: Date;
}

export interface LessonContainerProps {
  lessonId: string;
  onComplete?: (results: LessonResults) => void;
  onExit?: () => void;
}

interface LessonState {
  currentIndex: number;
  answers: Map<string, string>;
  showFeedback: boolean;
  startTime: Date;
  questionStartTime: Date;
}

const SESSION_STORAGE_KEY = 'lesson_state_';

export function LessonContainer({
  lessonId,
  onComplete,
  onExit,
}: LessonContainerProps) {
  const { item: lesson, isLoading, error } = useContentItem(lessonId);
  const { user } = useAuth();
  const { recordActivity } = useActivity();

  // State management
  const [state, setState] = useState<LessonState>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY + lessonId);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            startTime: new Date(parsed.startTime),
            questionStartTime: new Date(parsed.questionStartTime),
            answers: new Map(parsed.answers),
          };
        } catch (e) {
          console.warn('Failed to restore lesson state:', e);
        }
      }
    }

    return {
      currentIndex: 0,
      answers: new Map(),
      showFeedback: false,
      startTime: new Date(),
      questionStartTime: new Date(),
    };
  });

  const [selectedChoice, setSelectedChoice] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist state to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const toSave = {
        ...state,
        startTime: state.startTime.toISOString(),
        questionStartTime: state.questionStartTime.toISOString(),
        answers: Array.from(state.answers.entries()),
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY + lessonId, JSON.stringify(toSave));
    }
  }, [state, lessonId]);

  // Get current question
  const questions = lesson?.metadata?.questions || [];
  const currentQuestion = questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === questions.length - 1;
  const totalQuestions = questions.length;

  // Handle choice selection
  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (!state.showFeedback) {
      setSelectedChoice(choiceId);
    }
  }, [state.showFeedback]);

  // Handle answer submission
  const handleSubmit = useCallback(async () => {
    if (!selectedChoice || !currentQuestion || !user) return;

    setIsSubmitting(true);

    try {
      // Calculate time spent on this question
      const timeSpent = Date.now() - state.questionStartTime.getTime();

      // Record the answer
      const newAnswers = new Map(state.answers);
      newAnswers.set(currentQuestion.id, selectedChoice);

      // Check if answer is correct
      const isCorrect = currentQuestion.correctChoiceIds?.includes(selectedChoice) || false;

      // Record activity
      await recordActivity('question_answered', {
        lessonId,
        questionId: currentQuestion.id,
        selectedChoiceId: selectedChoice,
        isCorrect,
        timeSpentMs: timeSpent,
        questionIndex: state.currentIndex,
      });

      // Update state to show feedback
      setState(prev => ({
        ...prev,
        answers: newAnswers,
        showFeedback: true,
      }));
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChoice, currentQuestion, user, state, lessonId, recordActivity]);

  // Handle next question
  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      // Lesson complete
      handleLessonComplete();
    } else {
      // Move to next question
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        showFeedback: false,
        questionStartTime: new Date(),
      }));
      setSelectedChoice(undefined);
    }
  }, [isLastQuestion]);

  // Handle lesson completion
  const handleLessonComplete = useCallback(async () => {
    if (!lesson || !user) return;

    const totalTime = Date.now() - state.startTime.getTime();
    const correctAnswers = Array.from(state.answers.entries()).filter(([questionId, choiceId]) => {
      const question = questions.find(q => q.id === questionId);
      return question?.correctChoiceIds?.includes(choiceId);
    }).length;

    const results: LessonResults = {
      lessonId,
      totalQuestions: questions.length,
      correctAnswers,
      accuracy: (correctAnswers / questions.length) * 100,
      timeSpent: totalTime,
      topicsCovered: lesson.topics || [],
      completedAt: new Date(),
    };

    // Record lesson completion
    await recordActivity('lesson_completed', {
      lessonId,
      ...results,
    });

    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY + lessonId);
    }

    // Call completion callback
    onComplete?.(results);
  }, [lesson, user, state, lessonId, questions, recordActivity, onComplete]);

  // Handle exit
  const handleExit = useCallback(() => {
    // State is already persisted to sessionStorage
    onExit?.();
  }, [onExit]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Failed to Load Lesson</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || 'The lesson could not be loaded. Please try again.'}
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
          <p className="text-muted-foreground mb-6">
            This lesson doesn't have any questions yet.
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate correct answers so far
  const correctAnswers = Array.from(state.answers.entries()).filter(([questionId, choiceId]) => {
    const question = questions.find((q: any) => q.id === questionId);
    return question?.correctChoiceIds?.includes(choiceId);
  }).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Progress Header */}
      <LessonHeader
        lessonTitle={lesson.title}
        currentQuestionIndex={state.currentIndex}
        totalQuestions={totalQuestions}
        startTime={state.startTime}
        correctAnswers={correctAnswers}
        onExit={handleExit}
      />

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <QuestionDisplay
          question={currentQuestion}
          selectedChoice={selectedChoice}
          showFeedback={state.showFeedback}
          onChoiceSelect={handleChoiceSelect}
          onSubmit={handleSubmit}
          disabled={isSubmitting || state.showFeedback}
        />

        {/* Next Button (shown after feedback) */}
        {state.showFeedback && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
              data-next-question
            >
              {isLastQuestion ? 'Complete Lesson' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
