/**
 * Content Operations Hooks
 *
 * React hooks for content operations with SWR integration
 * Requirements: 1.1, 1.2, 4.1
 */

import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import {
  contentServiceClient,
  contentCacheKeys,
  contentSWRConfigs,
} from "@/lib/content-service";
import type { ContentItem } from "@/types/entities";
import type {
  QueryItemsDto,
  CreateItemDto,
  UpdateItemDto,
  SearchRequestDto,
  RecommendationType,
} from "@/types";
import type { Recommendation } from "@/lib/content-service/types";

// ============================================================================
// Content CRUD Hooks
// ============================================================================

/**
 * Hook for fetching paginated content items with enhanced filtering
 * Requirements: 1.1, 1.2
 */
export function useContentItems(params?: QueryItemsDto) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    contentCacheKeys.contentItems(params),
    () => contentServiceClient.getContentItems(params),
    contentSWRConfigs.contentList,
  );

  const refresh = useCallback(() => {
    mutateFn();
  }, [mutateFn]);

  const invalidate = useCallback(() => {
    mutate((key) => Array.isArray(key) && key[0] === "content-items");
  }, []);

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refresh,
    invalidate,
  };
}

/**
 * Hook for fetching a single content item by ID
 * Requirements: 1.1, 1.2
 */
export function useContentItem(id: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    id ? contentCacheKeys.contentItem(id) : null,
    () => (id ? contentServiceClient.getContentItem(id) : null),
    contentSWRConfigs.contentItem,
  );

  const refresh = useCallback(() => {
    if (id) mutateFn();
  }, [id, mutateFn]);

  return {
    item: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching a content item by slug
 * Requirements: 1.1, 1.2
 */
export function useContentItemBySlug(slug: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    slug ? contentCacheKeys.contentItemBySlug(slug) : null,
    () => (slug ? contentServiceClient.getContentItemBySlug(slug) : null),
    contentSWRConfigs.contentItem,
  );

  const refresh = useCallback(() => {
    if (slug) mutateFn();
  }, [slug, mutateFn]);

  return {
    item: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for creating content items with optimistic updates
 * Requirements: 1.1
 */
export function useCreateContentItem() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createItem = useCallback(
    async (data: CreateItemDto): Promise<ContentItem | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await contentServiceClient.createContentItem(data);

        // Invalidate content lists to show new item
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return {
    createItem,
    isCreating,
    error,
  };
}

/**
 * Hook for updating content items with optimistic updates
 * Requirements: 1.1
 */
export function useUpdateContentItem() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateItem = useCallback(
    async (id: string, data: UpdateItemDto): Promise<ContentItem | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const result = await contentServiceClient.updateContentItem(id, data);

        // Update cache with server response
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        // Revert optimistic update on error
        mutate(contentCacheKeys.contentItem(id));
        setError(err as Error);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return {
    updateItem,
    isUpdating,
    error,
  };
}

/**
 * Hook for deleting content items
 * Requirements: 1.1
 */
export function useDeleteContentItem() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteItem = useCallback(
    async (
      id: string,
      options?: { permanent?: boolean; reason?: string },
    ): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);

      try {
        await contentServiceClient.deleteContentItem(id, options);

        // Remove from cache
        mutate(contentCacheKeys.contentItem(id), undefined);

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

  return {
    deleteItem,
    isDeleting,
    error,
  };
}

// ============================================================================
// Search Hooks
// ============================================================================

/**
 * Hook for content search with debouncing and caching
 * Requirements: 4.1
 */
export function useContentSearch(request: SearchRequestDto | null) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    request ? contentCacheKeys.searchContent(request) : null,
    () => (request ? contentServiceClient.searchContent(request) : null),
    contentSWRConfigs.search,
  );

  const refresh = useCallback(() => {
    if (request) mutateFn();
  }, [request, mutateFn]);

  return {
    results: data || [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for search suggestions with debouncing
 * Requirements: 4.1
 */
export function useSearchSuggestions(
  query: string,
  options?: { limit?: number; types?: string[] },
) {
  const { data, error, isLoading } = useSWR(
    query && query.length >= 2
      ? contentCacheKeys.searchSuggestions(query, options)
      : null,
    () =>
      query && query.length >= 2
        ? contentServiceClient.getSearchSuggestions(query, options)
        : null,
    {
      ...contentSWRConfigs.search,
      dedupingInterval: 500, // Shorter deduping for suggestions
    },
  );

  return {
    suggestions: data || [],
    isLoading,
    error,
  };
}

/**
 * Hook for content recommendations
 * Requirements: 4.1
 */
export function useRecommendations(
  userId: string,
  type: RecommendationType,
  options?: { limit?: number },
) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    contentCacheKeys.recommendations(userId, type, options),
    () => contentServiceClient.getRecommendations(userId, type, options),
    contentSWRConfigs.recommendations,
  );

  const refresh = useCallback(() => {
    mutateFn();
  }, [mutateFn]);

  return {
    recommendations: (data || []) as Recommendation[],
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Advanced Content Hooks
// ============================================================================

/**
 * Hook for content with real-time updates and collaboration
 * Requirements: 1.1, 9.2
 */
export function useContentWithRealTime(
  id: string | null,
  options?: {
    enableRealTime?: boolean;
    enablePresence?: boolean;
    enableCollaboration?: boolean;
  },
) {
  const { item, isLoading, error, refresh } = useContentItem(id);

  // Subscribe to real-time updates if enabled
  const subscriptions = useMemo(() => {
    if (!id || !options?.enableRealTime) return [];

    const subscriptionOptions: {
      includePresence?: boolean;
      includeCollaboration?: boolean;
    } = {};
    if (options.enablePresence !== undefined) {
      subscriptionOptions.includePresence = options.enablePresence;
    }
    if (options.enableCollaboration !== undefined) {
      subscriptionOptions.includeCollaboration = options.enableCollaboration;
    }

    return contentServiceClient.subscribeToContentUpdates(
      id,
      subscriptionOptions,
    );
  }, [
    id,
    options?.enableRealTime,
    options?.enablePresence,
    options?.enableCollaboration,
  ]);

  // Get active users if presence is enabled
  const activeUsers = useMemo(() => {
    if (!id || !options?.enablePresence) return [];
    return contentServiceClient.getActiveUsers(id);
  }, [id, options?.enablePresence]);

  // Get collaboration session if collaboration is enabled
  const collaborationSession = useMemo(() => {
    if (!id || !options?.enableCollaboration) return undefined;
    return contentServiceClient.getCollaborationSession(id);
  }, [id, options?.enableCollaboration]);

  // Update presence
  const updatePresence = useCallback(
    (status: "active" | "idle" | "away") => {
      if (id && options?.enablePresence) {
        contentServiceClient.updateUserPresence(id, status);
      }
    },
    [id, options?.enablePresence],
  );

  // Send cursor position
  const sendCursorPosition = useCallback(
    (position: { line: number; column: number }) => {
      if (id && options?.enableCollaboration) {
        contentServiceClient.sendCursorPosition(id, position);
      }
    },
    [id, options?.enableCollaboration],
  );

  // Send text selection
  const sendTextSelection = useCallback(
    (selection: { start: number; end: number; text: string }) => {
      if (id && options?.enableCollaboration) {
        contentServiceClient.sendTextSelection(id, selection);
      }
    },
    [id, options?.enableCollaboration],
  );

  return {
    item,
    isLoading,
    error,
    refresh,
    activeUsers,
    collaborationSession,
    updatePresence,
    sendCursorPosition,
    sendTextSelection,
    subscriptions,
  };
}

/**
 * Hook for content filtering and sorting
 * Requirements: 1.2
 */
export function useContentFilters(initialParams?: QueryItemsDto) {
  const [params, setParams] = useState<QueryItemsDto>(initialParams || {});

  const updateFilter = useCallback(
    (key: keyof QueryItemsDto, value: unknown) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateFilters = useCallback((newParams: Partial<QueryItemsDto>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const resetFilters = useCallback(() => {
    setParams(initialParams || {});
  }, [initialParams]);

  const clearFilter = useCallback((key: keyof QueryItemsDto) => {
    setParams((prev) => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  }, []);

  return {
    params,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
  };
}

/**
 * Hook for content pagination
 * Requirements: 1.2
 */
export function useContentPagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
  }, [initialPage, initialLimit]);

  return {
    page,
    limit,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    reset,
  };
}

/**
 * Hook for content prefetching
 * Requirements: 6.5
 */
export function useContentPrefetch() {
  const prefetchItem = useCallback(async (id: string) => {
    mutate(
      contentCacheKeys.contentItem(id),
      contentServiceClient.getContentItem(id),
      false,
    );
  }, []);

  const prefetchItems = useCallback(async (params?: QueryItemsDto) => {
    mutate(
      contentCacheKeys.contentItems(params),
      contentServiceClient.getContentItems(params),
      false,
    );
  }, []);

  const prefetchSearch = useCallback(async (request: SearchRequestDto) => {
    mutate(
      contentCacheKeys.searchContent(request),
      contentServiceClient.searchContent(request),
      false,
    );
  }, []);

  return {
    prefetchItem,
    prefetchItems,
    prefetchSearch,
  };
}
