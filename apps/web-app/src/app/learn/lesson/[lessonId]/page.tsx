"use client";

/**
 * Lesson View Page
 * 
 * Core learning experience where users actively engage with questions
 * Requirements: 1.4, 6.1, 13.2, 14.3
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks';
import { useContentItem } from '@/hooks/use-content-operations';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { LessonContainer } from '@/components/learning-platform/layer-2-features';
import { LessonIntro } from '@/components/learning-platform/layer-2-features/LessonContainer/LessonIntro';
import { LessonCompletion } from '@/components/learning-platform/layer-2-features/LessonContainer/LessonCompletion';
import { EnhancedSkeleton } from '@/components/ui/enhanced-skeleton';
import type { LessonResults } from '@/components/learning-platform/layer-2-features/LessonContainer/LessonContainer';

/**
 * Lesson View Skeleton Loader
 */
function LessonViewSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <EnhancedSkeleton variant="circular" width={24} height={24} />
              <div className="space-y-2">
                <EnhancedSkeleton variant="text" width={200} height={20} />
                <EnhancedSkeleton variant="text" width={120} height={16} />
              </div>
            </div>
            <EnhancedSkeleton variant="text" width={80} height={16} />
          </div>
          <EnhancedSkeleton variant="rectangular" width="100%" height={8} />
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          <EnhancedSkeleton variant="text" lines={3} />
          <EnhancedSkeleton variant="rectangular" width="100%" height={200} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <EnhancedSkeleton key={index} variant="rectangular" width="100%" height={60} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lesson View Page Component
 * Provides focused, distraction-free learning environment
 */
function LessonViewPage() {
  // Authentication check
  useRequireAuth();
  
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  
  const { item: lesson, isLoading, error } = useContentItem(lessonId);
  
  // State for lesson phases
  const [showIntro, setShowIntro] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [lessonResults, setLessonResults] = useState<LessonResults | null>(null);
  const [nextLessonId, _setNextLessonId] = useState<string | null>(null);
  const [prefetchTriggered, setPrefetchTriggered] = useState(false);
  
  // Prefetch next lesson
  const triggerNextLessonPrefetch = useCallback(() => {
    if (prefetchTriggered) return;
    
    setPrefetchTriggered(true);
    
    // TODO: Implement actual recommendation API call
    // For now, we'll just log that prefetch would happen
    // In production, this would call useRecommendations hook
    console.log('Prefetching next recommended lesson...');
    
    // Simulated next lesson ID (in production, get from recommendations API)
    // In production: setNextLessonId('next-lesson-id');
  }, [prefetchTriggered]);
  
  // Check if this is a resume (has saved progress)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = sessionStorage.getItem(`lesson_state_${lessonId}`);
      if (savedState) {
        // User is resuming, skip intro
        setShowIntro(false);
      }
    }
  }, [lessonId]);
  
  // Monitor progress and trigger prefetch at 80% completion
  useEffect(() => {
    if (typeof window === 'undefined' || prefetchTriggered || showIntro || showCompletion) {
      return;
    }
    
    // Check progress from sessionStorage
    const savedState = sessionStorage.getItem(`lesson_state_${lessonId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questionCount = (lesson?.metadata as any)?.questions?.length || 0;
        const currentIndex = parsed.currentIndex || 0;
        
        if (questionCount > 0) {
          const progress = (currentIndex / questionCount) * 100;
          
          // Trigger prefetch at 80% completion
          if (progress >= 80 && !prefetchTriggered) {
            triggerNextLessonPrefetch();
          }
        }
      } catch (e) {
        console.warn('Failed to parse lesson state for prefetch:', e);
      }
    }
  }, [lessonId, lesson, prefetchTriggered, showIntro, showCompletion, triggerNextLessonPrefetch]);
  
  // Handle lesson start
  const handleStartLesson = useCallback(() => {
    setShowIntro(false);
  }, []);
  
  // Handle lesson completion
  const handleLessonComplete = useCallback((results: LessonResults) => {
    setLessonResults(results);
    setShowCompletion(true);
    
    // Trigger prefetch for next lesson if not already done
    if (!prefetchTriggered) {
      triggerNextLessonPrefetch();
    }
  }, [prefetchTriggered, triggerNextLessonPrefetch]);
  
  // Handle exit
  const handleExit = useCallback(() => {
    router.push('/learn');
  }, [router]);
  
  // Handle continue to next lesson
  const handleContinueToNext = useCallback(() => {
    if (nextLessonId) {
      // Navigate to prefetched next lesson
      router.push(`/learn/lesson/${nextLessonId}`);
    } else {
      // Fallback to dashboard if no next lesson
      router.push('/learn');
    }
  }, [router, nextLessonId]);
  
  // Handle return to dashboard
  const handleReturnToDashboard = useCallback(() => {
    router.push('/learn');
  }, [router]);
  
  // Loading state with skeleton loader
  if (isLoading) {
    return <LessonViewSkeleton />;
  }
  
  // Error state
  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold mb-4">Failed to Load Lesson</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || 'The lesson could not be loaded. Please try again.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
            <button
              onClick={handleExit}
              className="px-6 py-2 border border-input rounded-md hover:bg-accent"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Get question count for intro screen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionCount = (lesson?.metadata as any)?.questions?.length || 0;
  
  // Show intro screen
  if (showIntro) {
    return (
      <LessonIntro
        lesson={lesson}
        questionCount={questionCount}
        onStart={handleStartLesson}
      />
    );
  }
  
  // Show completion screen
  if (showCompletion && lessonResults) {
    return (
      <LessonCompletion
        results={lessonResults}
        achievements={[]}
        onContinueToNext={handleContinueToNext}
        onReturnToDashboard={handleReturnToDashboard}
      />
    );
  }
  
  // Show lesson container (main learning experience)
  return (
    <LessonContainer
      lessonId={lessonId}
      onComplete={handleLessonComplete}
      onExit={handleExit}
    />
  );
}

/**
 * Export with error boundary wrapper
 */
export default function LessonViewPageWithErrorBoundary() {
  return (
    <RouteErrorBoundary>
      <LessonViewPage />
    </RouteErrorBoundary>
  );
}
