/**
 * Content Service Types
 *
 * Re-exports all types used by the content service
 */

// Re-export entity types
export type {
  ContentItem,
  ContentType,
  ContentMetadata,
  ContentData,
  WorkflowStatus,
  WorkflowTransition,
  MediaAsset,
  MediaType,
  MediaMetadata,
  SearchResult,
  BulkOperation,
  BulkOperationStatus,
  BulkOperationType,
  RecommendationType,
} from "../../types/entities";

// Re-export DTO types
export type {
  QueryItemsDto,
  CreateItemDto,
  UpdateItemDto,
  SearchRequestDto,
  SearchFilters,
  FacetedSearchDto,
  SubmitForReviewDto,
  ReviewItemDto,
  PublishItemDto,
} from "../../types/dtos";

// Additional types
export type SearchSuggestion = {
  text: string;
  type: "keyword" | "category" | "tag";
  relevance: number;
};

export type Recommendation = {
  itemId: string;
  score: number;
  reason: string;
  type: string;
};

// Error types - define locally since not exported from client/types
export interface ContentServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
  type?: string | ContentServiceErrorType;
  correlationId?: string;
  retryAfter?: number;
  field?: string;
  constraints?: string[];
  resource?: string;
  resourceId?: string;
  cause?: string;
}

export class AuthorizationError extends Error implements ContentServiceError {
  override name = "AuthorizationError";
  code = "AUTHORIZATION_ERROR";
  statusCode = 403;
  type: ContentServiceErrorType = "authorization";
  override cause?: string;

  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export class ConflictError extends Error implements ContentServiceError {
  override name = "ConflictError";
  code = "CONFLICT_ERROR";
  statusCode = 409;
  type: ContentServiceErrorType = "conflict";
  override cause?: string;

  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export class TimeoutError extends Error implements ContentServiceError {
  override name = "TimeoutError";
  code = "TIMEOUT_ERROR";
  statusCode = 408;
  type: ContentServiceErrorType = "timeout";
  override cause?: string;

  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export type ContentServiceErrorType =
  | "network"
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "timeout"
  | "rate_limit"
  | "service_unavailable"
  | "server"
  | "unknown";

export type UploadMediaDto = {
  file: File;
  itemId: string;
  type: string;
  metadata?: Record<string, unknown>;
};
