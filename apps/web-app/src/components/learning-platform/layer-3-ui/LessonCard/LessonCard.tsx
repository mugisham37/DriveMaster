'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FileQuestion } from 'lucide-react';
import { TopicBadge } from '../TopicBadge';
import { ProgressBar } from '../ProgressBar';
import { formatTimeEstimate, getDifficultyColor } from '@/utils/learning-platform';
import type { Lesson } from '@/types/learning-platform';

interface LessonCardProps {
  lesson: Lesson;
  progress?: number; // 0-100
  showProgress?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export function LessonCard({
  lesson,
  progress,
  showProgress = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
}: LessonCardProps) {
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isClickable && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        className
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {lesson.thumbnailUrl && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-lg">
          <Image
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{lesson.title}</CardTitle>
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded',
              getDifficultyColor(lesson.difficulty),
              'bg-opacity-10'
            )}
          >
            {lesson.difficulty}
          </span>
        </div>
        <CardDescription className="line-clamp-2">{lesson.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTimeEstimate(lesson.estimatedTimeMinutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileQuestion className="w-4 h-4" />
            <span>{lesson.questions.length} questions</span>
          </div>
        </div>

        {lesson.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lesson.topics.slice(0, 3).map((topic) => (
              <TopicBadge key={topic} topicName={topic} size="sm" />
            ))}
            {lesson.topics.length > 3 && (
              <span className="text-xs text-gray-500 self-center">
                +{lesson.topics.length - 3} more
              </span>
            )}
          </div>
        )}

        {showProgress && progress !== undefined && (
          <div className="pt-2">
            <ProgressBar value={progress} size="sm" showLabel />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LessonCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <div className="w-full h-40 bg-gray-200 rounded-t-lg" />
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
