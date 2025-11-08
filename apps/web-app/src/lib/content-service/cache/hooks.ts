/**
 * Content Service SWR Hooks
 *
 * React hooks for content service operations with SWR integration
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { contentServiceClient } from "../client";
import {
  contentCacheKeys,
  contentSWRConfigs,
  contentCacheInvalidation,
} from "./swr-config";
import type {
  ContentItem,
  MediaAsset,
  BulkOperation,
  WorkflowStatus,
  RecommendationType,
  ContentType,
} from "../../../types/entities";
import type {
  QueryItemsDto,
  CreateItemDto,
  UpdateItemDto,
  SearchRequestDto,
  FacetedSearchDto,
  SubmitForReviewDto,
  ReviewItemDto,
  PublishItemDto,
  BulkWorkflowDto,
} from "../../../types/dtos";
import type { ContentServiceError } from "../../../types/errors";

// ============================================================================
// Content CRUD Hooks
// ============================================================================

/**
 * Hook for fetching paginated content items
 */
export function useContentItems(params?: QueryItemsDto) {
  const { data, error, isLoading, mutate } = useSWR(
    contentCacheKeys.contentItems(params),
    () => contentServiceClient.getContentItems(params),
    contentSWRConfigs.contentList,
  );

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    hasNext: data?.hasNext || false,
    hasPrevious: data?.hasPrevious || false,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for fetching a single content item by ID
 */
export function useContentItem(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? contentCacheKeys.contentItem(id) : null,
    () => contentServiceClient.getContentItem(id!),
    contentSWRConfigs.contentItem,
  );

  return {
    item: data as ContentItem | undefined,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for fetching a content item by slug
 */
export function useContentItemBySlug(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? contentCacheKeys.contentItemBySlug(slug) : null,
    () => contentServiceClient.getContentItemBySlug(slug!),
    contentSWRConfigs.contentItem,
  );

  return {
    item: data as ContentItem | undefined,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

// ============================================================================
// Content Mutation Hooks
// ============================================================================

/**
 * Hook for creating content items
 */
export function useCreateContentItem() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "create-content-item",
    async (_key: string, { arg }: { arg: CreateItemDto }) => {
      const result = await contentServiceClient.createContentItem(arg);

      // Invalidate content list caches
      contentCacheInvalidation.invalidateContentList(mutate);

      return result;
    },
  );
}

/**
 * Hook for updating content items
 */
export function useUpdateContentItem() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "update-content-item",
    async (
      _key: string,
      { arg }: { arg: { id: string; data: UpdateItemDto } },
    ) => {
      const result = await contentServiceClient.updateContentItem(
        arg.id,
        arg.data,
      );

      // Invalidate related caches
      contentCacheInvalidation.invalidateContentItem(mutate, arg.id);

      return result;
    },
  );
}

/**
 * Hook for deleting content items
 */
export function useDeleteContentItem() {
  const { mutate } = useSWRConfig();

  return useSWRMutation(
    "delete-content-item",
    async (
      _key: string,
      {
        arg,
      }: {
        arg: { id: string; options?: { permanent?: boolean; reason?: string } };
      },
    ) => {
      await contentServiceClient.deleteContentItem(arg.id, arg.options);

      // Invalidate related caches
      contentCacheInvalidation.invalidateContentItem(mutate, arg.id);

      return { success: true };
    },
  );
}

// ============================================================================
// Media Hooks
// ============================================================================

/**
 * Hook for fetching media assets for a content item
 */
export function useMediaAssets(itemId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    itemId ? contentCacheKeys.mediaAssets(itemId) : null,
    () =>
      contentServiceClient
        .getContentItem(itemId!)
        .then((item) => item.mediaAssets),
    contentSWRConfigs.mediaList,
  );

  return {
    assets: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for fetching a single media asset
 */
export function useMediaAsset(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? contentCacheKeys.mediaAsset(id) : null,
    () => contentServiceClient.getMediaAsset(id!),
    contentSWRConfigs.mediaAsset,
  );

  return {
    asset: data as MediaAsset | undefined,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for getting signed URLs for media assets
 */
export function useMediaSignedUrl(
  id: string | null,
  options?: Record<string, unknown>,
) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? contentCacheKeys.mediaSignedUrl(id, options) : null,
    () => contentServiceClient.getMediaSignedUrl(id!),
    contentSWRConfigs.mediaAsset,
  );

  return {
    url: data as string | undefined,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

// ============================================================================
// Search Hooks
// ============================================================================

/**
 * Hook for content search with debouncing
 */
export function useContentSearch(request: SearchRequestDto | null) {
  const { data, error, isLoading, mutate } = useSWR(
    request ? contentCacheKeys.searchContent(request) : null,
    () => contentServiceClient.searchContent(request!),
    contentSWRConfigs.search,
  );

  return {
    results: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for search suggestions
 */
export function useSearchSuggestions(query: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    query && query.length > 2
      ? contentCacheKeys.searchSuggestions(query)
      : null,
    () => contentServiceClient.getSearchSuggestions(query!),
    contentSWRConfigs.suggestions,
  );

  return {
    suggestions: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for personalized recommendations
 */
export function useRecommendations(
  userId: string | null,
  type?: RecommendationType,
) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? contentCacheKeys.recommendations(userId, type) : null,
    () => {
      if (!userId) throw new Error("User ID is required");
      return contentServiceClient.getRecommendations(userId, type);
    },
    contentSWRConfigs.recommendations,
  );

  return {
    recommendations: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for faceted search
 */
export function useFacetedSearch(request: FacetedSearchDto | null) {
  const { data, error, isLoading, mutate } = useSWR(
    request ? contentCacheKeys.facetedSearch(request) : null,
    () => contentServiceClient.searchFaceted(request!),
    contentSWRConfigs.search,
  );

  return {
    results: data?.results || [],
    facets: data?.facets || {},
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for similar content recommendations
 */
export function useSimilarContent(
  itemId: string | null,
  options?: { limit?: number; includeMetadata?: boolean },
) {
  const { data, error, isLoading, mutate } = useSWR(
    itemId ? contentCacheKeys.similarContent(itemId, options) : null,
    () => contentServiceClient.getSimilarContent(itemId!, options),
    contentSWRConfigs.recommendations,
  );

  return {
    recommendations: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for trending content
 */
export function useTrendingContent(options?: {
  timeframe?: "day" | "week" | "month" | "year";
  limit?: number;
  types?: ContentType[];
  topics?: string[];
}) {
  const { data, error, isLoading, mutate } = useSWR(
    contentCacheKeys.trendingContent(options),
    () => contentServiceClient.getTrendingContent(options),
    contentSWRConfigs.recommendations,
  );

  return {
    recommendations: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

// ============================================================================
// Workflow Hooks
// ============================================================================

/**
 * Hook for workflow history
 */
export function useWorkflowHistory(itemId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    itemId ? contentCacheKeys.workflowHistory(itemId) : null,
    () => contentServiceClient.getWorkflowHistory(itemId!),
    contentSWRConfigs.workflowHistory,
  );

  return {
    history: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for workflow operations with optimistic updates
 */
export function useWorkflowOperations(itemId: string | null) {
  const { mutate } = useSWRConfig();

  const submitForReview = useCallback(
    async (data?: SubmitForReviewDto) => {
      if (!itemId) throw new Error("Item ID is required");

      try {
        const result = await contentServiceClient.submitForReview(itemId, data);

        // Optimistically update caches
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        contentCacheInvalidation.invalidateWorkflow(mutate, itemId);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        throw error;
      }
    },
    [itemId, mutate],
  );

  const reviewContent = useCallback(
    async (data: ReviewItemDto) => {
      if (!itemId) throw new Error("Item ID is required");

      try {
        const result = await contentServiceClient.reviewContent(itemId, data);

        // Optimistically update caches
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        contentCacheInvalidation.invalidateWorkflow(mutate, itemId);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        throw error;
      }
    },
    [itemId, mutate],
  );

  const publishContent = useCallback(
    async (data?: PublishItemDto) => {
      if (!itemId) throw new Error("Item ID is required");

      try {
        const result = await contentServiceClient.publishContent(itemId, data);

        // Optimistically update caches
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        contentCacheInvalidation.invalidateWorkflow(mutate, itemId);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        throw error;
      }
    },
    [itemId, mutate],
  );

  const archiveContent = useCallback(
    async (data?: { reason?: string; archiveDate?: Date }) => {
      if (!itemId) throw new Error("Item ID is required");

      try {
        const result = await contentServiceClient.archiveContent(itemId, data);

        // Optimistically update caches
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        contentCacheInvalidation.invalidateWorkflow(mutate, itemId);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        throw error;
      }
    },
    [itemId, mutate],
  );

  const restoreContent = useCallback(
    async (data?: { restoreToStatus?: WorkflowStatus; notes?: string }) => {
      if (!itemId) throw new Error("Item ID is required");

      try {
        const result = await contentServiceClient.restoreContent(itemId, data);

        // Optimistically update caches
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        contentCacheInvalidation.invalidateWorkflow(mutate, itemId);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        throw error;
      }
    },
    [itemId, mutate],
  );

  return {
    submitForReview,
    reviewContent,
    publishContent,
    archiveContent,
    restoreContent,
  };
}

/**
 * Hook for bulk workflow operations
 */
export function useBulkWorkflowOperations() {
  const { mutate } = useSWRConfig();

  const bulkWorkflowOperation = useCallback(
    async (data: BulkWorkflowDto) => {
      try {
        const result = await contentServiceClient.bulkWorkflowOperation(data);

        // Invalidate caches for all affected items
        data.itemIds.forEach((itemId) => {
          contentCacheInvalidation.invalidateContentItem(mutate, itemId);
          contentCacheInvalidation.invalidateWorkflow(mutate, itemId);
        });

        // Also invalidate content lists that might be affected
        contentCacheInvalidation.invalidateContentList(mutate);

        return result;
      } catch (error) {
        // Revalidate on error to ensure consistency
        data.itemIds.forEach((itemId) => {
          contentCacheInvalidation.invalidateContentItem(mutate, itemId);
        });
        throw error;
      }
    },
    [mutate],
  );

  return {
    bulkWorkflowOperation,
  };
}

// ============================================================================
// Bulk Operations Hooks
// ============================================================================

/**
 * Hook for monitoring bulk operation status
 */
export function useBulkOperation(operationId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    operationId ? contentCacheKeys.bulkOperation(operationId) : null,
    () => contentServiceClient.getBulkOperationStatus(operationId!),
    contentSWRConfigs.bulkOperation,
  );

  return {
    operation: data as BulkOperation | undefined,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

/**
 * Hook for user's bulk operations
 */
export function useBulkOperations(userId: string | null, status?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? contentCacheKeys.bulkOperations(userId, status) : null,
    // This would be implemented when bulk operations are added
    () => Promise.resolve([]) as Promise<BulkOperation[]>,
    contentSWRConfigs.bulkOperationHistory,
  );

  return {
    operations: data || [],
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

// ============================================================================
// Health and Monitoring Hooks
// ============================================================================

/**
 * Hook for service health monitoring
 */
export function useServiceHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    contentCacheKeys.serviceHealth(),
    () => contentServiceClient.isHealthy(),
    contentSWRConfigs.health,
  );

  return {
    isHealthy: data || false,
    isLoading,
    error: error as ContentServiceError | undefined,
    mutate,
  };
}

// ============================================================================
// Cache Management Hooks
// ============================================================================

/**
 * Hook for cache invalidation utilities
 */
export function useContentCacheInvalidation() {
  const { mutate } = useSWRConfig();

  return {
    invalidateContentItem: (itemId: string) =>
      contentCacheInvalidation.invalidateContentItem(mutate, itemId),

    invalidateContentList: () =>
      contentCacheInvalidation.invalidateContentList(mutate),

    invalidateSearch: () => contentCacheInvalidation.invalidateSearch(mutate),

    invalidateMedia: (itemId?: string) =>
      contentCacheInvalidation.invalidateMedia(mutate, itemId),

    invalidateWorkflow: (itemId?: string) =>
      contentCacheInvalidation.invalidateWorkflow(mutate, itemId),

    invalidateUserContent: (userId: string) =>
      contentCacheInvalidation.invalidateUserContent(mutate, userId),

    invalidateAll: () => contentCacheInvalidation.invalidateAll(mutate),
  };
}

// ============================================================================
// Prefetch Utilities
// ============================================================================

/**
 * Hook for prefetching content
 */
export function useContentPrefetch() {
  const { mutate } = useSWRConfig();

  return {
    /**
     * Prefetch content items list
     */
    prefetchContentItems: async (params?: QueryItemsDto) => {
      const data = await contentServiceClient.getContentItems(params);
      mutate(contentCacheKeys.contentItems(params), data, false);
      return data;
    },

    /**
     * Prefetch a specific content item
     */
    prefetchContentItem: async (id: string) => {
      const data = await contentServiceClient.getContentItem(id);
      mutate(contentCacheKeys.contentItem(id), data, false);
      return data;
    },

    /**
     * Prefetch content item by slug
     */
    prefetchContentItemBySlug: async (slug: string) => {
      const data = await contentServiceClient.getContentItemBySlug(slug);
      mutate(contentCacheKeys.contentItemBySlug(slug), data, false);
      return data;
    },

    /**
     * Prefetch recommendations for a user
     */
    prefetchRecommendations: async (
      userId: string,
      type?: RecommendationType,
    ) => {
      const data = await contentServiceClient.getRecommendations(userId, type);
      mutate(contentCacheKeys.recommendations(userId, type), data, false);
      return data;
    },

    /**
     * Warm cache with frequently accessed content
     */
    warmCache: async (contentIds: string[]) => {
      const promises = contentIds.map(async (id) => {
        try {
          const data = await contentServiceClient.getContentItem(id);
          mutate(contentCacheKeys.contentItem(id), data, false);
          return data;
        } catch (error) {
          console.warn(`Failed to warm cache for content ${id}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled").length;

      console.log(
        `Cache warming completed: ${successful}/${contentIds.length} items cached`,
      );
      return successful;
    },
  };
}
