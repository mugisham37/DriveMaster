'use client';

/**
 * BrowseContent Component
 * 
 * Main content component for the Browse page with authentication check
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 13.2
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SearchInterface } from '@/components/learning-platform/layer-2-features';
import { TrendingSection } from './TrendingSection';
import { BrowseByTopicSection } from './BrowseByTopicSection';
import type { QueryItemsDto } from '@/types';

export function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // Get initial query and filters from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialTopic = searchParams.get('topic') || undefined;
  const initialDifficulty = searchParams.get('difficulty') || undefined;
  const initialType = searchParams.get('type') || undefined;

  // Build initial filters from URL params
  const initialFilters: QueryItemsDto | undefined = React.useMemo(() => {
    const filters: QueryItemsDto = {};
    if (initialTopic) {
      filters.tags = [initialTopic];
    }
    if (initialDifficulty) {
      // Store difficulty in search param for filtering
      filters.search = initialDifficulty;
    }
    if (initialType) {
      filters.type = initialType as any;
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
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

  // Handle search query change - update URL
  const handleSearchQueryChange = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }
      router.push(`/browse?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle filter change - update URL
  const handleFiltersChange = useCallback(
    (filters: QueryItemsDto) => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Update topic filter
      if (filters.tags && filters.tags.length > 0) {
        params.set('topic', filters.tags[0]);
      } else {
        params.delete('topic');
      }
      
      // Update type filter
      if (filters.type) {
        params.set('type', String(filters.type));
      } else {
        params.delete('type');
      }
      
      router.push(`/browse?${params.toString()}`, { scroll: false });
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
          <SearchInterface
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
