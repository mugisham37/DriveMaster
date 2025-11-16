'use client';

/**
 * Unit Lessons List Component
 * 
 * Displays lessons within an expanded unit
 * Requirements: 5.3, 5.4, 5.5
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { LessonCard } from '@/components/learning-platform/layer-3-ui/LessonCard';
import type { Lesson } from '@/types/learning-platform';

interface UnitLessonsListProps {
  lessons: Lesson[];
}

export function UnitLessonsList({ lessons }: UnitLessonsListProps) {
  const router = useRouter();

  // Sort lessons by order
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  const handleLessonClick = (lessonId: string) => {
    router.push(`/learn/lesson/${lessonId}`);
  };

  // Prefetch handlers (simplified for now)
  const handleMouseEnter = () => {
    // In real implementation, prefetch lesson data
  };

  const handleMouseLeave = () => {
    // Cleanup if needed
  };

  if (sortedLessons.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No lessons available in this unit yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Lessons in this unit
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedLessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            showProgress={true}
            progress={0} // Will be calculated from actual progress data
            onClick={() => handleLessonClick(lesson.id)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>
    </div>
  );
}
