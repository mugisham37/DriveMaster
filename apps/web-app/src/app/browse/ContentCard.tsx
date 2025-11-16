'use client';

/**
 * ContentCard Component
 * 
 * Displays a content item in search results with metadata and actions
 * Requirements: 8.3
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileQuestion, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types/entities';

interface ContentCardProps {
  result: SearchResult;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export function ContentCard({
  result,
  onClick,
  onMouseEnter,
  onMouseLeave,
  viewMode = 'grid',
  className,
}: ContentCardProps) {
  const { item, highlights } = result;
  const isClickable = !!onClick;

  // Get difficulty color
  const getDifficultyColor = (difficulty?: 'beginner' | 'intermediate' | 'advanced') => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    if (difficulty === 'beginner') return 'bg-green-100 text-green-800';
    if (difficulty === 'intermediate') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Get difficulty label
  const getDifficultyLabel = (difficulty?: 'beginner' | 'intermediate' | 'advanced') => {
    if (!difficulty) return 'Unknown';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  // Format time estimate
  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    return `${minutes} min`;
  };

  // Get highlighted text or fallback to description
  const getDescription = () => {
    if (highlights && highlights.length > 0) {
      const firstHighlight = highlights[0];
      if (firstHighlight && firstHighlight.fragments && firstHighlight.fragments.length > 0) {
        return firstHighlight.fragments[0];
      }
    }
    return item.metadata?.description || '';
  };

  if (viewMode === 'list') {
    return (
      <Card
        className={cn(
          'transition-all duration-200',
          isClickable && 'cursor-pointer hover:shadow-md',
          className
        )}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          {item.mediaAssets && item.mediaAssets.length > 0 && item.mediaAssets[0]?.url && (
            <div className="flex-shrink-0 w-32 h-24 overflow-hidden rounded-lg">
              <img
                src={item.mediaAssets[0].url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-semibold line-clamp-1">{item.title}</h3>
              <Badge className={getDifficultyColor(item.metadata?.difficulty)}>
                {getDifficultyLabel(item.metadata?.difficulty)}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {getDescription()}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(item.metadata?.estimatedTimeMinutes)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileQuestion className="w-4 h-4" />
                <span>{item.type === 'lesson' ? 'Lesson' : item.type}</span>
              </div>
              {item.status === 'published' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Published</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{item.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
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
      {item.mediaAssets && item.mediaAssets.length > 0 && item.mediaAssets[0]?.url && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-lg">
          <img
            src={item.mediaAssets[0].url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
          <Badge className={getDifficultyColor(item.metadata?.difficulty)}>
            {getDifficultyLabel(item.metadata?.difficulty)}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{getDescription()}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(item.metadata?.estimatedTimeMinutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileQuestion className="w-4 h-4" />
            <span>{item.type === 'lesson' ? 'Lesson' : item.type}</span>
          </div>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground self-center">
                +{item.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
