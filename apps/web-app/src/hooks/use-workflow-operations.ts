/**
 * Workflow Operations Hooks
 *
 * React hooks for content workflow management
 * Requirements: 5.1, 5.2, 5.3
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
  SubmitForReviewDto,
  ReviewItemDto,
  PublishItemDto,
  BulkWorkflowDto,
  BulkOperation,
  WorkflowStatus,
} from "@/types";

// ============================================================================
// Workflow State Management
// ============================================================================

/**
 * Hook for workflow history and audit trails
 * Requirements: 5.3
 */
export function useWorkflowHistory(itemId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateFn,
  } = useSWR(
    itemId ? contentCacheKeys.workflowHistory(itemId) : null,
    () => (itemId ? contentServiceClient.getWorkflowHistory(itemId) : null),
    contentSWRConfigs.workflow,
  );

  const refresh = useCallback(() => {
    if (itemId) mutateFn();
  }, [itemId, mutateFn]);

  return {
    history: data || [],
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for submitting content for review
 * Requirements: 5.1
 */
export function useSubmitForReview() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitForReview = useCallback(
    async (
      id: string,
      data?: SubmitForReviewDto,
    ): Promise<ContentItem | null> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await contentServiceClient.submitForReview(id, data);

        // Update content item cache
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate workflow history
        mutate(contentCacheKeys.workflowHistory(id));

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    submitForReview,
    isSubmitting,
    error,
  };
}

/**
 * Hook for reviewing content (approve/reject)
 * Requirements: 5.2
 */
export function useReviewContent() {
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reviewContent = useCallback(
    async (id: string, data: ReviewItemDto): Promise<ContentItem | null> => {
      setIsReviewing(true);
      setError(null);

      try {
        const result = await contentServiceClient.reviewContent(id, data);

        // Update content item cache
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate workflow history
        mutate(contentCacheKeys.workflowHistory(id));

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsReviewing(false);
      }
    },
    [],
  );

  return {
    reviewContent,
    isReviewing,
    error,
  };
}

/**
 * Hook for publishing content
 * Requirements: 5.4
 */
export function usePublishContent() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publishContent = useCallback(
    async (id: string, data?: PublishItemDto): Promise<ContentItem | null> => {
      setIsPublishing(true);
      setError(null);

      try {
        const result = await contentServiceClient.publishContent(id, data);

        // Update content item cache
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate workflow history
        mutate(contentCacheKeys.workflowHistory(id));

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsPublishing(false);
      }
    },
    [],
  );

  return {
    publishContent,
    isPublishing,
    error,
  };
}

/**
 * Hook for archiving content
 * Requirements: 5.4
 */
export function useArchiveContent() {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const archiveContent = useCallback(
    async (
      id: string,
      data?: { reason?: string; archiveDate?: Date },
    ): Promise<ContentItem | null> => {
      setIsArchiving(true);
      setError(null);

      try {
        const result = await contentServiceClient.archiveContent(id, data);

        // Update content item cache
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate workflow history
        mutate(contentCacheKeys.workflowHistory(id));

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsArchiving(false);
      }
    },
    [],
  );

  return {
    archiveContent,
    isArchiving,
    error,
  };
}

/**
 * Hook for restoring archived content
 * Requirements: 5.4
 */
export function useRestoreContent() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const restoreContent = useCallback(
    async (
      id: string,
      data?: { restoreToStatus?: WorkflowStatus; notes?: string },
    ): Promise<ContentItem | null> => {
      setIsRestoring(true);
      setError(null);

      try {
        const result = await contentServiceClient.restoreContent(id, data);

        // Update content item cache
        mutate(contentCacheKeys.contentItem(id), result);

        // Invalidate workflow history
        mutate(contentCacheKeys.workflowHistory(id));

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsRestoring(false);
      }
    },
    [],
  );

  return {
    restoreContent,
    isRestoring,
    error,
  };
}

// ============================================================================
// Bulk Workflow Operations
// ============================================================================

/**
 * Hook for bulk workflow operations
 * Requirements: 5.5
 */
export function useBulkWorkflowOperation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeBulkWorkflow = useCallback(
    async (data: BulkWorkflowDto): Promise<BulkOperation | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const result = await contentServiceClient.bulkWorkflowOperation(data);

        // Invalidate all affected content items
        data.itemIds.forEach((id: string) => {
          mutate(contentCacheKeys.contentItem(id));
          mutate(contentCacheKeys.workflowHistory(id));
        });

        // Invalidate content lists
        mutate((key) => Array.isArray(key) && key[0] === "content-items");

        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    executeBulkWorkflow,
    isProcessing,
    error,
  };
}

// ============================================================================
// Workflow Status Management
// ============================================================================

export interface WorkflowStatusSummary {
  draft: number;
  review: number;
  approved: number;
  published: number;
  archived: number;
  total: number;
}

/**
 * Hook for workflow status summary and statistics
 * Requirements: 5.3
 */
export function useWorkflowStatusSummary(items: ContentItem[]) {
  const summary = useMemo(() => {
    const statusCounts: WorkflowStatusSummary = {
      draft: 0,
      review: 0,
      approved: 0,
      published: 0,
      archived: 0,
      total: items.length,
    };

    items.forEach((item) => {
      switch (item.status) {
        case "draft":
          statusCounts.draft++;
          break;
        case "review":
          statusCounts.review++;
          break;
        case "approved":
          statusCounts.approved++;
          break;
        case "published":
          statusCounts.published++;
          break;
        case "archived":
          statusCounts.archived++;
          break;
      }
    });

    return statusCounts;
  }, [items]);

  return summary;
}

/**
 * Hook for workflow permissions and capabilities
 * Requirements: 5.1, 5.2, 5.4
 */
export function useWorkflowPermissions(
  item: ContentItem | null,
  userRole?: string,
) {
  const permissions = useMemo(() => {
    if (!item) {
      return {
        canSubmitForReview: false,
        canReview: false,
        canPublish: false,
        canArchive: false,
        canRestore: false,
        canEdit: false,
      };
    }

    // Basic permission logic (this would be enhanced with actual role-based permissions)
    const isAuthor = true; // This would check if current user is the author
    const isReviewer = userRole === "reviewer" || userRole === "admin";
    const isPublisher = userRole === "publisher" || userRole === "admin";
    const isAdmin = userRole === "admin";

    return {
      canSubmitForReview: isAuthor && item.status === "draft",
      canReview: isReviewer && item.status === "review",
      canPublish: isPublisher && item.status === "approved",
      canArchive:
        (isAuthor || isAdmin) && ["draft", "published"].includes(item.status),
      canRestore: (isAuthor || isAdmin) && item.status === "archived",
      canEdit: isAuthor && ["draft", "review"].includes(item.status),
    };
  }, [item, userRole]);

  return permissions;
}

// ============================================================================
// Workflow Validation
// ============================================================================

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredFields: string[];
  missingFields: string[];
}

/**
 * Hook for workflow validation before state transitions
 * Requirements: 5.1, 5.2, 5.4
 */
export function useWorkflowValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateForReview = useCallback(
    async (item: ContentItem): Promise<WorkflowValidationResult> => {
      setIsValidating(true);

      try {
        const errors: string[] = [];
        const warnings: string[] = [];
        const requiredFields = ["title", "content", "type"];
        const missingFields: string[] = [];

        // Check required fields
        if (!item.title?.trim()) {
          errors.push("Title is required");
          missingFields.push("title");
        }

        if (!item.content?.body?.trim()) {
          errors.push("Content body is required");
          missingFields.push("content");
        }

        if (!item.type) {
          errors.push("Content type is required");
          missingFields.push("type");
        }

        // Check content length
        if (item.content?.body && item.content.body.length < 50) {
          warnings.push("Content is quite short, consider adding more detail");
        }

        // Check for media assets if content type requires them
        if (
          item.type === "lesson" &&
          (!item.mediaAssets || item.mediaAssets.length === 0)
        ) {
          warnings.push("Lessons typically benefit from media assets");
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          requiredFields,
          missingFields,
        };
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  const validateForPublish = useCallback(
    async (item: ContentItem): Promise<WorkflowValidationResult> => {
      setIsValidating(true);

      try {
        // First run review validation
        const reviewValidation = await validateForReview(item);

        const errors = [...reviewValidation.errors];
        const warnings = [...reviewValidation.warnings];

        // Additional publish-specific validations
        if (item.status !== "approved") {
          errors.push("Content must be approved before publishing");
        }

        // Check for SEO metadata
        // Note: ContentMetadata doesn't have description field
        // if (!item.metadata?.description) {
        //   warnings.push('Consider adding a description for better SEO')
        // }

        if (!item.tags || item.tags.length === 0) {
          warnings.push("Consider adding tags for better discoverability");
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          requiredFields: reviewValidation.requiredFields,
          missingFields: reviewValidation.missingFields,
        };
      } finally {
        setIsValidating(false);
      }
    },
    [validateForReview],
  );

  return {
    validateForReview,
    validateForPublish,
    isValidating,
  };
}
