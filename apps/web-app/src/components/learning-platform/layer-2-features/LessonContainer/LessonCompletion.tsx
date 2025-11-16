"use client";

/**
 * Lesson Completion Screen Component
 * 
 * Displays celebration and results after lesson completion
 * Requirements: 1.5, 6.6
 */

import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Target, TrendingUp, Award, ArrowRight, Home } from 'lucide-react';
import { CelebrationAnimation } from '@/components/ui/celebration-animation';
import type { LessonResults } from './LessonContainer';

export interface LessonCompletionProps {
  results: LessonResults;
  achievements?: Array<{ id: string; title: string; description: string; icon?: string }>;
  onContinueToNext: () => void;
  onReturnToDashboard: () => void;
}

export function LessonCompletion({
  results,
  achievements = [],
  onContinueToNext,
  onReturnToDashboard,
}: LessonCompletionProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  
  // Hide celebration after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Format time spent
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };
  
  // Determine performance level
  const getPerformanceLevel = (accuracy: number): { label: string; color: string; message: string } => {
    if (accuracy >= 90) {
      return {
        label: 'Excellent!',
        color: 'text-green-600',
        message: 'Outstanding work! You have mastered this lesson.',
      };
    } else if (accuracy >= 75) {
      return {
        label: 'Great Job!',
        color: 'text-blue-600',
        message: 'Well done! You have a strong understanding of this material.',
      };
    } else if (accuracy >= 60) {
      return {
        label: 'Good Effort!',
        color: 'text-yellow-600',
        message: 'Nice work! Consider reviewing the topics you missed.',
      };
    } else {
      return {
        label: 'Keep Practicing!',
        color: 'text-orange-600',
        message: 'Don&apos;t give up! Review the material and try again.',
      };
    }
  };
  
  const performance = getPerformanceLevel(results.accuracy);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <CelebrationAnimation />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Lesson Complete!</h1>
          <p className={`text-xl font-semibold ${performance.color}`}>
            {performance.label}
          </p>
          <p className="text-muted-foreground mt-2">
            {performance.message}
          </p>
        </div>
        
        {/* Results Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Score */}
          <div className="p-6 bg-card border rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Score</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {results.correctAnswers}/{results.totalQuestions}
            </div>
            <div className={`text-sm font-medium ${performance.color}`}>
              {Math.round(results.accuracy)}% Accuracy
            </div>
          </div>
          
          {/* Time Spent */}
          <div className="p-6 bg-card border rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Time</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatTime(results.timeSpent)}
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(results.timeSpent / results.totalQuestions / 1000)}s per question
            </div>
          </div>
          
          {/* Topics Covered */}
          <div className="p-6 bg-card border rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Topics</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {results.topicsCovered.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Topics Practiced
            </div>
          </div>
        </div>
        
        {/* Topics Covered List */}
        {results.topicsCovered.length > 0 && (
          <div className="mb-8 p-6 bg-card border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Topics You Practiced</h2>
            <div className="flex flex-wrap gap-2">
              {results.topicsCovered.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Achievements Earned */}
        {achievements.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-900">
                New Achievements Unlocked!
              </h2>
            </div>
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-900">
                      {achievement.title}
                    </div>
                    <div className="text-sm text-yellow-700">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onContinueToNext}
            className="group flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>Continue to Next Lesson</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onReturnToDashboard}
            className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-input rounded-lg hover:bg-accent font-medium text-lg transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
        
        {/* Encouragement Message */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {results.accuracy >= 75
              ? 'Keep up the great work! Your progress is being tracked.'
              : 'Remember, practice makes perfect. Review the material and try again!'}
          </p>
        </div>
      </div>
    </div>
  );
}
