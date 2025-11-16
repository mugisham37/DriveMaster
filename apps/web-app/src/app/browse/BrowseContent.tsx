'use client';

/**
 * BrowseContent Component
 * 
 * Main content component for the Browse page with authentication check
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 13.2
 */

import React, { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedSearchInterface } from './EnhancedSearchInterface';
import { TrendingSection } from './TrendingSection';
import { BrowseByTopicSection } from './BrowseByTopicSection';
import type { QueryItemsDto } from '@/types';

export function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // Get initial query and filters from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialTopic = searchParams.get('topic');
  const initialDifficulty = searchParams.get('difficulty');
  const initialType = searchParams.get('type');

  // Build initial filters from URL params
  const initialFilters: QueryItemsDto = React.useMemo(() => {
    const filters: QueryItemsDto = {};
    if (initialTopic) {
      filters.tags = [initialTopic];
    }
    if (initialDifficulty) {
      // Store difficulty in search param for filtering
      filters.search = initialDifficulty;
    }
    if (initialType) {
      filters.type = initialType as 'lesson' | 'quiz' | 'assessment';
    }
    return filters;
  }, [initialTopic, initialDifficulty, initialType]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?returnUrl=${encodeURIComponent('/browse')}`);
    }
  }, [user, authLoading, router]);

  // Handle result click
  const handleResultClick = useCallback(
    (itemId: string) => {
      router.push(`/learn/lesson/${itemId}`);
    },
    [router]
  );

  // Handle topic filter from Browse by Topic section
  const handleTopicFilter = useCallback(
    (topic: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('topic', topic);
      router.push(`/browse?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search & Browse</h1>
        <p className="text-muted-foreground">
          Discover lessons, practice questions, and learning materials
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-12">
        {/* Search Interface */}
        <section>
          <EnhancedSearchInterface
            initialQuery={initialQuery}
            initialFilters={initialFilters}
            onResultClick={handleResultClick}
          />
        </section>

        {/* Trending Section - Only show when no active search */}
        {!initialQuery && (
          <section>
            <TrendingSection onLessonClick={handleResultClick} />
          </section>
        )}

        {/* Browse by Topic Section - Only show when no active search */}
        {!initialQuery && (
          <section>
            <BrowseByTopicSection onTopicClick={handleTopicFilter} />
          </section>
        )}
      </div>
    </div>
  );
}
