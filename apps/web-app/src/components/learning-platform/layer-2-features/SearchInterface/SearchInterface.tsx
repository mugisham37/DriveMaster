"use client";

/**
 * SearchInterface Component
 * 
 * Comprehensive search with autocomplete, filters, and results
 * Requirements: 8.1, 8.2, 8.3, 8.4, 13.3
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useContentSearch,
  useSearchSuggestions,
  useContentFilters,
} from '@/hooks/use-content-operations';
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover';
import { LessonCard, TopicBadge } from '../../layer-3-ui';
import type { SearchRequestDto, ContentFilters } from '@/types';

export interface SearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: ContentFilters;
  onResultClick?: (itemId: string) => void;
}

export function SearchInterface({
  initialQuery = '',
  initialFilters,
  onResultClick,
}: SearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'difficulty' | 'newest' | 'popular'>('relevance');

  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Filter management
  const {
    params: filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
  } = useContentFilters(initialFilters);

  // Build search request
  const searchRequest: SearchRequestDto | null = debouncedQuery
    ? {
        query: debouncedQuery,
        filters: {
          ...filters,
          sortBy,
        },
        limit: 20,
      }
    : null;

  // Search hooks
  const { results, isLoading, error } = useContentSearch(searchRequest);
  const { suggestions, isLoading: suggestionsLoading } = useSearchSuggestions(
    query,
    { limit: 5 }
  );

  // Prefetch on hover (500ms delay)
  const { handleMouseEnter, handleMouseLeave } = usePrefetchOnHover(
    async (itemId: string) => {
      router.prefetch(`/learn/lesson/${itemId}`);
    },
    500
  );

  // Handle search input
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setShowSuggestions(value.length >= 2);
  }, []);

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  }, []);

  // Handle result click
  const handleResultClick = useCallback(
    (itemId: string) => {
      if (onResultClick) {
        onResultClick(itemId);
      } else {
        router.push(`/learn/lesson/${itemId}`);
      }
    },
    [onResultClick, router]
  );

  // Handle filter chip removal
  const handleRemoveFilter = useCallback(
    (filterKey: keyof ContentFilters) => {
      clearFilter(filterKey);
    },
    [clearFilter]
  );

  // Get active filter count
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length >= 2)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for lessons, topics, or keywords..."
            className="w-full px-4 py-3 pl-12 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search content"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1">Suggestions</p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Filters</h3>

            {/* Topic Filters */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Topics</p>
              {/* Placeholder for topic checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Road Signs</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Traffic Rules</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Safety</span>
                </label>
              </div>
            </div>

            {/* Difficulty Slider */}
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Difficulty</p>
              <input
                type="range"
                min="-3"
                max="3"
                step="0.5"
                className="w-full"
                aria-label="Difficulty level"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Easy</span>
                <span>Hard</span>
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="w-full mt-4 px-4 py-2 text-sm border rounded-md hover:bg-muted"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 space-y-4">
          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>
                    {key}: {String(value)}
                  </span>
                  <button
                    onClick={() => handleRemoveFilter(key as keyof ContentFilters)}
                    className="hover:text-primary/70"
                    aria-label={`Remove ${key} filter`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Searching...' : `${results.length} results`}
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1 border rounded-md text-sm"
              aria-label="Sort results"
            >
              <option value="relevance">Most Relevant</option>
              <option value="difficulty">Difficulty</option>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-48 bg-muted rounded-lg animate-pulse"></div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">
                {error.message || 'Failed to search. Please try again.'}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && results.length === 0 && debouncedQuery && (
            <div className="p-12 bg-muted rounded-lg text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && !error && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <LessonCard
                    lesson={item}
                    showProgress={true}
                    onClick={() => handleResultClick(item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
