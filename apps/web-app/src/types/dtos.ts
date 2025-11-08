/**
 * Content Service DTO Types
 *
 * Request and response data transfer objects for all content operations
 */

import type {
  ContentItem,
  ContentData,
  ContentType,
  WorkflowStatus,
  ContentMetadata,
  MediaAsset,
  MediaMetadata,
  SearchResult,
  SearchSuggestion,
  Recommendation,
  WorkflowTransition,
  BulkOperation,
  BulkOperationStatus,
} from "./entities";

// ============================================================================
// Common Response Types
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

// ============================================================================
// Content CRUD DTOs
// ============================================================================

export interface CreateItemDto {
  title: string;
  slug?: string;
  content: ContentData;
  type: ContentType;
  metadata: Partial<ContentMetadata>;
  tags?: string[];
  status?: WorkflowStatus;
}

export interface UpdateItemDto {
  title?: string;
  slug?: string;
  content?: Partial<ContentData>;
  metadata?: Partial<ContentMetadata>;
  tags?: string[];
  status?: WorkflowStatus;
}

export interface QueryItemsDto {
  page?: number;
  limit?: number;
  type?: ContentType | ContentType[];
  status?: WorkflowStatus | WorkflowStatus[];
  tags?: string[];
  search?: string;
  sortBy?: "title" | "createdAt" | "updatedAt" | "publishedAt";
  sortOrder?: "asc" | "desc";
  createdBy?: string;
  updatedAfter?: Date;
  updatedBefore?: Date;
  includeArchived?: boolean;
}

// ============================================================================
// Media Upload DTOs
// ============================================================================

export interface UploadMediaDto {
  filename: string;
  mimeType: string;
  size: number;
  metadata?: Partial<MediaMetadata>;
  optimize?: boolean;
  generateThumbnail?: boolean;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  download?: boolean;
  filename?: string;
}

export interface ChunkedUploadDto {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  totalSize: number;
}

// ============================================================================
// Search DTOs
// ============================================================================

export interface SearchFilters {
  types?: ContentType[];
  statuses?: WorkflowStatus[];
  tags?: string[];
  authors?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  difficulty?: ("beginner" | "intermediate" | "advanced")[];
  topics?: string[];
  language?: string;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: "relevance" | "date" | "title" | "popularity";
  sortOrder?: "asc" | "desc";
  includeHighlights?: boolean;
  includeFacets?: boolean;
  facetFields?: string[];
}

export interface SearchRequestDto {
  query: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface FacetedSearchDto {
  query?: string;
  facets: Record<string, string[]>;
  options?: SearchOptions;
}

// ============================================================================
// Workflow DTOs
// ============================================================================

export interface SubmitForReviewDto {
  notes?: string;
  reviewers?: string[];
  priority?: "low" | "normal" | "high";
  dueDate?: Date;
}

export interface ReviewItemDto {
  decision: "approve" | "reject" | "request_changes";
  comments?: string;
  feedback?: string[];
  suggestedChanges?: string[];
  reviewerNotes?: string;
}

export interface PublishItemDto {
  publishAt?: Date;
  publishNotes?: string;
  notifySubscribers?: boolean;
  skipFinalValidation?: boolean;
}

export interface BulkWorkflowDto {
  itemIds: string[];
  action: "submit_review" | "approve" | "reject" | "publish" | "archive";
  reviewData?: Partial<ReviewItemDto>;
  publishData?: Partial<PublishItemDto>;
  notes?: string;
}

// ============================================================================
// Bulk Operation DTOs
// ============================================================================

export interface BulkImportRequestDto {
  format: "csv" | "json" | "xlsx";
  data: string | object[];
  options?: {
    skipValidation?: boolean;
    updateExisting?: boolean;
    defaultStatus?: WorkflowStatus;
    defaultType?: ContentType;
    batchSize?: number;
  };
}

export interface BulkImportResultDto {
  operationId: string;
  status: BulkOperationStatus;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
  previewItems?: ContentItem[];
}

export interface BulkExportRequestDto {
  filters?: QueryItemsDto;
  format: "csv" | "json" | "xlsx";
  fields?: string[];
  includeMedia?: boolean;
  compression?: "none" | "zip" | "gzip";
}

export interface BulkExportResultDto {
  operationId: string;
  status: BulkOperationStatus;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  itemCount?: number;
}

// ============================================================================
// Real-time DTOs
// ============================================================================

export interface WebSocketSubscriptionDto {
  type: "content_changes" | "presence" | "workflow_updates";
  itemId?: string;
  userId?: string;
  filters?: Record<string, unknown>;
}

export interface PresenceUpdateDto {
  itemId: string;
  action: "join" | "leave" | "update";
  cursor?: { line: number; column: number };
  selection?: { start: number; end: number };
}

// ============================================================================
// Response DTOs
// ============================================================================

export type ContentItemResponse = ApiResponse<ContentItem>;

export type ContentItemsResponse = ApiResponse<PaginatedResult<ContentItem>>;

export type MediaAssetResponse = ApiResponse<MediaAsset>;

export type MediaAssetsResponse = ApiResponse<MediaAsset[]>;

export type SearchResponse = ApiResponse<{
  results: SearchResult[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: SearchSuggestion[];
  queryTime: number;
}>;

export type SuggestionsResponse = ApiResponse<SearchSuggestion[]>;

export type RecommendationsResponse = ApiResponse<Recommendation[]>;

export type WorkflowHistoryResponse = ApiResponse<WorkflowTransition[]>;

export type BulkOperationResponse = ApiResponse<BulkOperation>;

export type UploadProgressResponse = ApiResponse<{
  uploadId: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "failed";
  url?: string;
}>;
