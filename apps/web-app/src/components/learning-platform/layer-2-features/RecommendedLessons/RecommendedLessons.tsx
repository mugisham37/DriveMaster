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
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover';
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

  // Prefetch hook with 500ms delay
  const { handleMouseEnter, handleMouseLeave } = usePrefetchOnHover(
    async (lessonId: string) => {
      // Prefetch the lesson page
      router.prefetch(`/learn/lesson/${lessonId}`);
    },
    500
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
        {recommendations.map((lesson) => (
          <div
            key={lesson.id}
            onMouseEnter={() => handleMouseEnter(lesson.id)}
            onMouseLeave={handleMouseLeave}
          >
            <LessonCard
              lesson={lesson}
              showProgress={true}
              onClick={() => handleLessonClick(lesson.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
