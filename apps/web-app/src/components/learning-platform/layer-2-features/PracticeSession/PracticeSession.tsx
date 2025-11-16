"use client";

/**
 * PracticeSession Component
 * 
 * Active practice session with adaptive difficulty and spaced repetition
 * Requirements: 3.1, 3.2, 4.3, 7.3, 7.4, 7.5
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRecommendations } from '@/hooks/use-content-operations';
import { useSpacedRepetitionReminders } from '@/hooks/useSpacedRepetitionReminders';
import { useActivity } from '@/contexts/ActivityContext';
import { QuestionDisplay } from '../../layer-3-ui';
import type { PracticeSettings } from '../PracticeSetup';
import type { Question } from '@/types/learning-platform';

export interface PracticeSessionProps {
  userId: string;
  settings: PracticeSettings;
  onStop: () => void;
  onComplete: (summary: SessionSummary) => void;
}

export interface SessionSummary {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;
  topicsPracticed: { topic: string; correct: number; total: number }[];
  recommendations: string[];
}

interface SessionState {
  questions: Question[];
  currentIndex: number;
  answers: Map<string, { choiceId: string; isCorrect: boolean; timeSpent: number }>;
  startTime: Date;
  questionStartTime: Date;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  currentDifficulty: number;
}

export function PracticeSession({
  userId,
  settings,
  onStop,
  onComplete,
}: PracticeSessionProps) {
  const { recordActivity } = useActivity();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(
    settings.timed && settings.timeLimit ? settings.timeLimit * 60 : 0
  );

  // Fetch questions based on settings - using 'personalized' type
  const { recommendations, isLoading } = useRecommendations(
    userId,
    'personalized',
    {
      limit: typeof settings.questionCount === 'number' ? settings.questionCount : 100,
    }
  );
  
  // Memoize the recommendations to avoid re-renders
  const adaptiveQuestions = React.useMemo(() => recommendations || [], [recommendations]);

  // Fetch spaced repetition items
  const { activeReminders: reviewItems } = useSpacedRepetitionReminders();

  const [state, setState] = useState<SessionState>({
    questions: [],
    currentIndex: 0,
    answers: new Map(),
    startTime: new Date(),
    questionStartTime: new Date(),
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    currentDifficulty: settings.difficulty,
  });

  const [selectedChoice, setSelectedChoice] = useState<string | undefined>();
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Helper function to convert ContentItem to Question
  const convertToQuestion = useCallback((item: Record<string, unknown>): Question => {
    // Extract question data from content item
    const contentData = (item.content as { body?: string })?.body || item.content || '';
    
    interface ParsedContent {
      body?: string;
      choices?: unknown[];
      explanation?: string;
      externalReferences?: unknown[];
    }
    
    const content: ParsedContent = typeof contentData === 'string' && contentData.startsWith('{')
      ? JSON.parse(contentData) as ParsedContent
      : { body: typeof contentData === 'string' ? contentData : '' };

    return {
      id: item.id as string,
      text: content.body || (item.title as string) || '',
      type: 'multiple-choice',
      choices: (content.choices || []) as Question['choices'],
      explanation: content.explanation || '',
      difficulty: (item.metadata as { difficulty?: string })?.difficulty === 'beginner' ? -1 :
                  (item.metadata as { difficulty?: string })?.difficulty === 'intermediate' ? 0 : 1,
      discrimination: 1.0,
      guessing: 0.25,
      topics: ((item.metadata as { topics?: string[] })?.topics || []),
      mediaAssets: ((item.mediaAssets as { id: string }[]) || []).map((asset) => asset.id),
      externalReferences: ((content.externalReferences || []) as Question['externalReferences']) || [],
      estimatedTimeSeconds: (((item.metadata as { estimatedTimeMinutes?: number })?.estimatedTimeMinutes || 2) * 60),
    };
  }, []);

  // Initialize questions (mix adaptive + review items)
  useEffect(() => {
    if (adaptiveQuestions.length > 0 && state.questions.length === 0) {
      // Convert recommendations to questions
      // Recommendations might be ContentItems directly or have an item property
      const convertedQuestions = adaptiveQuestions.map(rec => {
        const item = (rec as { item?: Record<string, unknown> }).item || (rec as Record<string, unknown>);
        return convertToQuestion(item);
      });
      
      // Mix in review items (every 5th question) if available
      const mixedQuestions = [...convertedQuestions];
      if (reviewItems.length > 0) {
        reviewItems.forEach((reminder, index) => {
          const insertIndex = (index + 1) * 5;
          if (insertIndex < mixedQuestions.length) {
            // Create a simple question from the review reminder
            const reviewQuestion: Question = {
              id: reminder.id,
              text: `Review: ${reminder.topicName}`,
              type: 'multiple-choice',
              choices: [],
              explanation: 'This is a review question from spaced repetition.',
              difficulty: reminder.difficulty === 'easy' ? -1 : 
                         reminder.difficulty === 'medium' ? 0 : 1,
              discrimination: 1.0,
              guessing: 0.25,
              topics: [reminder.topicName],
              estimatedTimeSeconds: 120,
            };
            mixedQuestions.splice(insertIndex, 0, reviewQuestion);
          }
        });
      }

      setState(prev => ({ ...prev, questions: mixedQuestions }));
    }
  }, [adaptiveQuestions, reviewItems, state.questions.length, convertToQuestion]);

  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const totalQuestions = typeof settings.questionCount === 'number' 
    ? settings.questionCount 
    : state.questions.length;

  // Calculate real-time stats
  const questionsAnswered = state.answers.size;
  const correctAnswers = Array.from(state.answers.values()).filter(a => a.isCorrect).length;
  const currentAccuracy = questionsAnswered > 0 
    ? Math.round((correctAnswers / questionsAnswered) * 100) 
    : 0;

  // Handle stop
  const handleStop = useCallback(() => {
    if (confirm('Are you sure you want to stop? Your progress will be saved.')) {
      const totalTime = Date.now() - state.startTime.getTime();
      
      // Calculate topic-wise performance
      const topicStats = new Map<string, { correct: number; total: number }>();
      state.questions.forEach((question) => {
        const answer = state.answers.get(question.id);
        if (answer) {
          question.topics.forEach(topic => {
            const stats = topicStats.get(topic) || { correct: 0, total: 0 };
            stats.total++;
            if (answer.isCorrect) stats.correct++;
            topicStats.set(topic, stats);
          });
        }
      });

      const topicsPracticed = Array.from(topicStats.entries()).map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
      }));

      // Generate recommendations
      const recommendations: string[] = [];
      if (currentAccuracy < 70) {
        recommendations.push('Consider reviewing the basics before continuing');
      }
      topicsPracticed.forEach(({ topic, correct, total }) => {
        if (correct / total < 0.6) {
          recommendations.push(`Focus more on ${topic}`);
        }
      });

      const summary: SessionSummary = {
        totalQuestions: questionsAnswered,
        correctAnswers,
        accuracy: currentAccuracy,
        timeSpent: totalTime,
        topicsPracticed,
        recommendations,
      };

      setShowSummary(true);
      onComplete(summary);
    }
  }, [state, questionsAnswered, correctAnswers, currentAccuracy, onComplete]);

  // Timer countdown
  useEffect(() => {
    if (settings.timed && timeRemaining > 0 && !showSummary) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    return undefined;
  }, [settings.timed, timeRemaining, showSummary, handleStop]);

  // Handle choice selection
  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (!showFeedback) {
      setSelectedChoice(choiceId);
    }
  }, [showFeedback]);

  // Handle answer submission
  const handleSubmit = useCallback(async () => {
    if (!selectedChoice || !currentQuestion) return;

    setIsSubmitting(true);

    try {
      const timeSpent = Date.now() - state.questionStartTime.getTime();
      const isCorrect = currentQuestion.choices.some(
        choice => choice.id === selectedChoice && choice.isCorrect
      );

      // Record activity
      await recordActivity('practice', {
        questionId: currentQuestion.id,
        selectedChoiceId: selectedChoice,
        isCorrect,
        timeSpentMs: timeSpent,
        practiceMode: true,
        difficulty: state.currentDifficulty,
      });

      // Update answers
      const newAnswers = new Map(state.answers);
      newAnswers.set(currentQuestion.id, { choiceId: selectedChoice, isCorrect, timeSpent });

      // Update consecutive counters
      const newConsecutiveCorrect = isCorrect ? state.consecutiveCorrect + 1 : 0;
      const newConsecutiveIncorrect = !isCorrect ? state.consecutiveIncorrect + 1 : 0;

      // Adaptive difficulty adjustment
      let newDifficulty = state.currentDifficulty;
      if (newConsecutiveCorrect >= 3) {
        // Increase difficulty
        newDifficulty = Math.min(3, state.currentDifficulty + 0.5);
      } else if (newConsecutiveIncorrect >= 2) {
        // Decrease difficulty
        newDifficulty = Math.max(-3, state.currentDifficulty - 0.5);
      }

      setState(prev => ({
        ...prev,
        answers: newAnswers,
        consecutiveCorrect: newConsecutiveCorrect,
        consecutiveIncorrect: newConsecutiveIncorrect,
        currentDifficulty: newDifficulty,
      }));

      setShowFeedback(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChoice, currentQuestion, state, recordActivity]);

  // Handle next question
  const handleNext = useCallback(() => {
    if (isLastQuestion || questionsAnswered >= totalQuestions) {
      handleStop();
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        questionStartTime: new Date(),
      }));
      setSelectedChoice(undefined);
      setShowFeedback(false);
    }
  }, [isLastQuestion, questionsAnswered, totalQuestions, handleStop]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || state.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing your practice session...</p>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-card border rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Practice Complete!</h1>
            <p className="text-muted-foreground">Great job on completing your practice session</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Questions</p>
              <p className="text-2xl font-bold">{questionsAnswered}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
              <p className="text-2xl font-bold">{currentAccuracy}%</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                // Reset state and return to setup for new practice
                onStop();
              }}
              className="flex-1 px-6 py-3 border rounded-md hover:bg-muted font-medium"
            >
              Start New Practice
            </button>
            <button
              onClick={onStop}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Session Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {settings.timed && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-mono font-semibold ${timeRemaining < 60 ? 'text-destructive' : ''}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <div className="text-sm">
                <span className="font-semibold">{questionsAnswered}</span>
                <span className="text-muted-foreground"> / {totalQuestions} questions</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{currentAccuracy}%</span>
                <span className="text-muted-foreground"> accuracy</span>
              </div>
            </div>
            <button
              onClick={handleStop}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {currentQuestion && (
          <>
            <QuestionDisplay
              question={currentQuestion}
              selectedChoiceId={selectedChoice || ''}
              showFeedback={showFeedback}
              isDisabled={isSubmitting || showFeedback}
              onChoiceSelect={handleChoiceSelect}
              onSubmit={handleSubmit}
            />

            {showFeedback && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
                >
                  {isLastQuestion || questionsAnswered >= totalQuestions ? 'Finish' : 'Next Question'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
