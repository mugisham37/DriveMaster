'use client';

/**
 * EnhancedSearchInterface Component
 * 
 * Enhanced search interface with view toggle, sorting, and pagination
 * Requirements: 8.2, 8.3, 8.4, 13.3
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useContentSearch,
  useSearchSuggestions,
  useContentFilters,
  useContentPagination,
} from '@/hooks/use-content-operations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, List, Search, X } from 'lucide-react';
import { ContentCard } from './ContentCard';
import type { SearchRequestDto, QueryItemsDto, SearchFilters } from '@/types';

interface EnhancedSearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: QueryItemsDto;
  onResultClick?: (itemId: string) => void;
}

export function EnhancedSearchInterface({
  initialQuery = '',
  initialFilters,
  onResultClick,
}: EnhancedSearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title' | 'popularity'>('relevance');

  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Filter management
  const {
    params: filters,
    updateFilters,
    resetFilters,
    clearFilter,
  } = useContentFilters(initialFilters);

  // Pagination
  const { page, limit, nextPage, prevPage } = useContentPagination(1, 20);

  // Build search request
  const searchRequest: SearchRequestDto | null = useMemo(() => {
    if (!debouncedQuery) return null;

    const searchFilters: SearchFilters = {};
    if (filters.type) {
      const typeValue = filters.type;
      searchFilters.types = Array.isArray(typeValue) ? typeValue : [typeValue];
    }
    if (filters.tags) {
      searchFilters.tags = filters.tags;
    }

    return {
      query: debouncedQuery,
      filters: searchFilters,
      options: {
        page,
        limit,
        sortBy,
        includeHighlights: true,
      },
    };
  }, [debouncedQuery, filters, page, limit, sortBy]);

  // Search hooks
  const { results, isLoading, error } = useContentSearch(searchRequest);
  const { suggestions } = useSearchSuggestions(query, { limit: 5 });

  // Prefetch state
  const [prefetchTimeouts, setPrefetchTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

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

  // Handle result hover for prefetch (500ms delay)
  const handleResultHover = useCallback(
    (itemId: string) => {
      // Clear any existing timeout for this item
      const existingTimeout = prefetchTimeouts.get(itemId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout for prefetch
      const timeout = setTimeout(() => {
        // Prefetch the lesson page
        router.prefetch(`/learn/lesson/${itemId}`);
      }, 500);

      setPrefetchTimeouts((prev) => new Map(prev).set(itemId, timeout));
    },
    [router, prefetchTimeouts]
  );

  // Handle result mouse leave - cancel prefetch
  const handleResultLeave = useCallback(
    (itemId: string) => {
      const timeout = prefetchTimeouts.get(itemId);
      if (timeout) {
        clearTimeout(timeout);
        setPrefetchTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      }
    },
    [prefetchTimeouts]
  );

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      prefetchTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [prefetchTimeouts]);

  // Handle filter chip removal
  const handleRemoveFilter = useCallback(
    (filterKey: keyof QueryItemsDto) => {
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length >= 2)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for lessons, topics, or keywords..."
            className="pl-12 pr-10 h-12"
            aria-label="Search content"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </Button>
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
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                >
                  {suggestion.text}
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

            {/* Content Type Filter */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium">Content Type</p>
              <Select
                value={filters.type as string || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    clearFilter('type');
                  } else {
                    updateFilters({ type: value as 'lesson' | 'quiz' | 'assessment' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lesson">Lessons</SelectItem>
                  <SelectItem value="quiz">Quizzes</SelectItem>
                  <SelectItem value="assessment">Assessments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 space-y-4">
          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-2">
                  <span>
                    {key}: {String(value)}
                  </span>
                  <button
                    onClick={() => handleRemoveFilter(key as keyof QueryItemsDto)}
                    className="hover:text-destructive"
                    aria-label={`Remove ${key} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Searching...' : `${results.length} results`}
            </p>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Sort Selector */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                  <SelectItem value="date">Newest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="popularity">Most Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
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
                Try adjusting your search terms or filters to find what you&apos;re looking for.
              </p>
            </div>
          )}

          {/* Results Grid/List */}
          {!isLoading && !error && results.length > 0 && (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
                {results.map((result) => (
                  <ContentCard
                    key={result.item.id}
                    result={result}
                    viewMode={viewMode}
                    onClick={() => handleResultClick(result.item.id)}
                    onMouseEnter={() => handleResultHover(result.item.id)}
                    onMouseLeave={() => handleResultLeave(result.item.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {results.length >= limit && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    variant="outline"
                    onClick={prevPage}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    onClick={nextPage}
                    disabled={results.length < limit}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
