"use client";

/**
 * Lesson Intro Screen Component
 * 
 * Displays lesson overview before starting
 * Requirements: 1.3, 6.1
 */

import React, { useState, useEffect } from 'react';
import { Clock, Target, BookOpen, Play } from 'lucide-react';
import type { ContentItem } from '@/types/entities';

export interface LessonIntroProps {
  lesson: ContentItem;
  questionCount: number;
  onStart: () => void;
}

export function LessonIntro({ lesson, questionCount, onStart }: LessonIntroProps) {
  const [showAnimation, setShowAnimation] = useState(true);
  
  // Auto-hide animation after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const estimatedTime = lesson.metadata?.estimatedTimeMinutes || 
                        lesson.metadata?.estimatedDuration || 
                        Math.ceil(questionCount * 1.5); // Estimate 1.5 min per question
  
  const difficulty = lesson.metadata?.difficulty || 'intermediate';
  const learningObjectives = lesson.metadata?.learningObjectives || [];
  const topics = lesson.metadata?.topics || [];
  
  // Difficulty color mapping
  const difficultyColors = {
    beginner: 'text-green-600 bg-green-50 border-green-200',
    intermediate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    advanced: 'text-red-600 bg-red-50 border-red-200',
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Animated Introduction (first 10 seconds) */}
        {showAnimation && (
          <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">How This Lesson Works</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Answer each question to the best of your ability</li>
                  <li>• Get immediate feedback with explanations</li>
                  <li>• Your progress is saved automatically</li>
                  <li>• Take your time - there&apos;s no rush!</li>
                </ul>
              </div>
              <button
                onClick={() => setShowAnimation(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
                aria-label="Dismiss introduction"
              >
                Skip
              </button>
            </div>
          </div>
        )}
        
        {/* Lesson Title and Description */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3">{lesson.title}</h1>
          <p className="text-muted-foreground text-lg">
            {lesson.metadata?.description || lesson.content?.summary || 'Master the concepts in this lesson'}
          </p>
        </div>
        
        {/* Lesson Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Question Count */}
          <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{questionCount}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
          </div>
          
          {/* Estimated Time */}
          <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{estimatedTime}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
          </div>
          
          {/* Difficulty */}
          <div className="flex items-center gap-3 p-4 bg-card border rounded-lg">
            <div className={`px-3 py-1 rounded-full border text-sm font-medium capitalize ${difficultyColors[difficulty]}`}>
              {difficulty}
            </div>
          </div>
        </div>
        
        {/* Learning Objectives */}
        {learningObjectives.length > 0 && (
          <div className="mb-8 p-6 bg-card border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">What You&apos;ll Learn</h2>
            <ul className="space-y-2">
              {learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary font-medium mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Topics Covered */}
        {topics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Topics Covered</h2>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3"
          >
            <Play className="w-5 h-5" />
            <span>Start Lesson</span>
            <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        
        {/* Helper Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Your progress will be saved automatically. You can exit and resume anytime.
        </p>
      </div>
    </div>
  );
}
