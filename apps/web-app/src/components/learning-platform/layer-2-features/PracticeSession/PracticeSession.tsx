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
  reviewQuestionIds: Set<string>; // Track which questions are review questions
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
    reviewQuestionIds: new Set(),
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
      const reviewQuestionIds = new Set<string>();
      
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
            reviewQuestionIds.add(reminder.id);
          }
        });
      }

      setState(prev => ({ ...prev, questions: mixedQuestions, reviewQuestionIds }));
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
    // Calculate time spent
    const totalTime = Date.now() - state.startTime.getTime();
    const timeSpentMinutes = Math.floor(totalTime / 60000);
    const timeSpentSeconds = Math.floor((totalTime % 60000) / 1000);
    
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
      accuracy: Math.round((stats.correct / stats.total) * 100),
    }));

    // Get incorrectly answered questions
    const incorrectQuestions = state.questions.filter(q => {
      const answer = state.answers.get(q.id);
      return answer && !answer.isCorrect;
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (currentAccuracy < 70) {
      recommendations.push('Consider reviewing the basics before continuing');
    }
    topicsPracticed.forEach(({ topic, accuracy }) => {
      if (accuracy < 60) {
        recommendations.push(`Focus more on ${topic} (${accuracy}% accuracy)`);
      }
    });
    if (recommendations.length === 0) {
      recommendations.push('Great job! Keep practicing to maintain your skills');
    }

    return (
      <div className="min-h-screen bg-background p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border rounded-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold mb-2">Practice Complete!</h1>
              <p className="text-muted-foreground">Great job on completing your practice session</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Questions</p>
                <p className="text-2xl font-bold">{questionsAnswered}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                <p className="text-2xl font-bold">{currentAccuracy}%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                <p className="text-2xl font-bold">{timeSpentMinutes}:{timeSpentSeconds.toString().padStart(2, '0')}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Topics</p>
                <p className="text-2xl font-bold">{topicsPracticed.length}</p>
              </div>
            </div>

            {/* Topics Practiced */}
            {topicsPracticed.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Topics Practiced</h2>
                <div className="space-y-3">
                  {topicsPracticed.map(({ topic, correct, total, accuracy }) => (
                    <div key={topic} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{topic}</span>
                        <span className="text-sm text-muted-foreground">
                          {correct}/{total} correct
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              accuracy >= 80 ? 'bg-green-500' :
                              accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions to Review */}
            {incorrectQuestions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Questions to Review</h2>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    You got {incorrectQuestions.length} question{incorrectQuestions.length !== 1 ? 's' : ''} wrong. Consider reviewing:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {incorrectQuestions.slice(0, 5).map((q) => (
                      <li key={q.id} className="text-sm">
                        {q.topics.join(', ')}
                      </li>
                    ))}
                    {incorrectQuestions.length > 5 && (
                      <li className="text-sm text-muted-foreground">
                        ...and {incorrectQuestions.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Recommended Next Steps</h2>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
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
              isReview={state.reviewQuestionIds.has(currentQuestion.id)}
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
