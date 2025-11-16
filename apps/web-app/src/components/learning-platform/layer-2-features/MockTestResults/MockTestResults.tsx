'use client';

/**
 * Mock Test Results Component
 * 
 * Displays test results with detailed breakdown and recommendations
 * Requirements: 15.4, 15.5
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuestionDisplay } from '@/components/learning-platform/layer-3-ui';
import { TopicBadge } from '@/components/learning-platform/layer-3-ui';
import { CheckCircle, XCircle, Clock, Target, TrendingUp, RotateCcw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types/entities';
import type { MockTestResults as Results } from '../MockTestSession';
import type { Question } from '@/types/learning-platform';

export interface MockTestResultsProps {
  results: Results;
  questions: ContentItem[];
  passingScore: number; // percentage
  onRetake: () => void;
}

interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface QuestionReview {
  question: Question;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

/**
 * Convert ContentItem to Question format
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

export function MockTestResults({
  results,
  questions,
  passingScore,
  onRetake,
}: MockTestResultsProps) {
  const router = useRouter();

  const passed = results.accuracy >= passingScore;

  // Calculate topic performance
  const topicPerformance = useMemo((): TopicPerformance[] => {
    const topicMap = new Map<string, { correct: number; total: number }>();

    questions.forEach((question) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = question.metadata as any;
      const topics = metadata?.topics || [];
      const userAnswer = results.answers.get(question.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const correctChoice = metadata?.choices?.find((c: any) => c.isCorrect);
      const isCorrect = userAnswer && correctChoice && userAnswer === correctChoice.id;

      topics.forEach((topic: string) => {
        const current = topicMap.get(topic) || { correct: 0, total: 0 };
        topicMap.set(topic, {
          correct: current.correct + (isCorrect ? 1 : 0),
          total: current.total + 1,
        });
      });
    });

    return Array.from(topicMap.entries())
      .map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        accuracy: (stats.correct / stats.total) * 100,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Sort by accuracy (weakest first)
  }, [questions, results.answers]);

  // Prepare question reviews
  const questionReviews = useMemo((): QuestionReview[] => {
    return questions.map((question) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = question.metadata as any;
      const userAnswer = results.answers.get(question.id) || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const correctChoice = metadata?.choices?.find((c: any) => c.isCorrect);
      const correctAnswer = correctChoice?.id || '';
      const isCorrect = userAnswer === correctAnswer;

      return {
        question: convertToQuestion(question),
        userAnswer,
        correctAnswer,
        isCorrect,
      };
    });
  }, [questions, results.answers]);

  // Get weak topics (accuracy < 70%)
  const weakTopics = topicPerformance.filter((tp) => tp.accuracy < 70);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Test Results</h1>
        <p className="text-muted-foreground">
          Review your performance and identify areas for improvement
        </p>
      </div>

      {/* Score Summary Card */}
      <Card className={cn(
        "border-2",
        passed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
      )}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Pass/Fail Indicator */}
            <div className="flex justify-center">
              {passed ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-12 h-12" />
                  <span className="text-2xl font-bold">Passed!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-12 h-12" />
                  <span className="text-2xl font-bold">Not Passed</span>
                </div>
              )}
            </div>

            {/* Score */}
            <div>
              <div className="text-6xl font-bold">
                {results.score}/{questions.length}
              </div>
              <div className="text-xl text-muted-foreground">
                {results.accuracy.toFixed(1)}% Accuracy
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center justify-center gap-2 p-3 bg-background rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-lg font-semibold">{results.score}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 bg-background rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                  <p className="text-lg font-semibold">{questions.length - results.score}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 bg-background rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Time Used</p>
                  <p className="text-lg font-semibold">{formatTime(results.timeUsed)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance by Topic
          </CardTitle>
          <CardDescription>
            See how you performed in each topic area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topicPerformance.map((tp) => (
              <div key={tp.topic} className="space-y-2">
                <div className="flex items-center justify-between">
                  <TopicBadge
                    topicName={tp.topic}
                    masteryLevel={tp.accuracy}
                    showMastery={true}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tp.correct}/{tp.total} correct
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      tp.accuracy >= 80 ? "bg-green-500" :
                      tp.accuracy >= 50 ? "bg-yellow-500" :
                      "bg-red-500"
                    )}
                    style={{ width: `${tp.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recommendations for Improvement
            </CardTitle>
            <CardDescription>
              Focus on these areas to improve your score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weakTopics.map((topic) => (
                <div key={topic.topic} className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{topic.topic}</h4>
                    <span className="text-sm text-red-600 font-medium">
                      {topic.accuracy.toFixed(0)}% accuracy
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You got {topic.correct} out of {topic.total} questions correct in this topic.
                    Consider reviewing this material and practicing more questions.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/practice?topic=${encodeURIComponent(topic.topic)}`)}
                  >
                    Practice {topic.topic}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Question Review */}
      <Card>
        <CardHeader>
          <CardTitle>Question Review</CardTitle>
          <CardDescription>
            Review each question with correct answers and explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {questionReviews.map((review, index) => (
              <div key={review.question.id} className="space-y-4 pb-8 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {index + 1}
                  </span>
                  {review.isCorrect ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                      <XCircle className="w-4 h-4" />
                      Incorrect
                    </span>
                  )}
                </div>

                <QuestionDisplay
                  question={review.question}
                  selectedChoiceId={review.userAnswer}
                  showFeedback={true}
                  isDisabled={true}
                  isReview={true}
                  onChoiceSelect={() => {}}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push('/learn')}
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
        <Button
          size="lg"
          onClick={onRetake}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake Test
        </Button>
      </div>
    </div>
  );
}
