"use client";

/**
 * RecommendedLessons Component
 * 
 * Display personalized lesson recommendations with prefetch
 * Requirements: 2.1, 3.1, 8.4, 13.3, 13.4
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useRecommendations } from '@/hooks/use-content-operations';
import { useMountPrefetch } from '@/lib/performance/prefetch';
import { LessonCard, LessonCardSkeleton } from '../../layer-3-ui';

export interface RecommendedLessonsProps {
  userId: string;
  limit?: number;
  onLessonClick?: (lessonId: string) => void;
}

export function RecommendedLessons({
  userId,
  limit = 5,
  onLessonClick,
}: RecommendedLessonsProps) {
  const router = useRouter();
  const { recommendations, isLoading, error } = useRecommendations(
    userId,
    'personalized',
    { limit }
  );

  // Prefetch recommendations on mount (after initial render)
  useMountPrefetch(
    () => {
      if (recommendations && recommendations.length > 0) {
        // Prefetch first 3 recommended lessons
        recommendations.slice(0, 3).forEach((recommendation) => {
          router.prefetch(`/learn/lesson/${recommendation.itemId}`);
        });
      }
    },
    !isLoading && !!recommendations
  );

  const handleLessonClick = (lessonId: string) => {
    if (onLessonClick) {
      onLessonClick(lessonId);
    } else {
      router.push(`/learn/lesson/${lessonId}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <LessonCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recommended for You</h2>
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive">
            {error.message || 'Failed to load recommendations. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recommended for You</h2>
        <div className="p-12 bg-muted rounded-lg text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Complete a few lessons to get personalized recommendations based on your learning progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recommended for You</h2>
        <span className="text-sm text-muted-foreground">
          {recommendations.length} {recommendations.length === 1 ? 'lesson' : 'lessons'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((recommendation) => {
          // Convert recommendation to minimal lesson structure for display
          // TODO: Fetch full lesson data using recommendation.itemId
          const lessonData = {
            id: recommendation.itemId,
            title: `Lesson ${recommendation.itemId}`,
            description: recommendation.reason,
            slug: recommendation.itemId,
            type: 'lesson' as const,
            difficulty: 'beginner' as const,
            estimatedTimeMinutes: 30,
            learningObjectives: [],
            topics: [],
            questions: [],
            order: 0,
            prerequisites: [],
          };
          
          return (
            <div
              key={recommendation.itemId}
              onMouseEnter={() => router.prefetch(`/learn/lesson/${recommendation.itemId}`)}
            >
              <LessonCard
                lesson={lessonData}
                showProgress={true}
                onClick={() => handleLessonClick(recommendation.itemId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
