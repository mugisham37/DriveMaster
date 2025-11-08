/**
 * Content Service Entity Types
 *
 * Core entity interfaces for content items, media assets, and search results
 */

// ============================================================================
// Content Item Types
// ============================================================================

export type ContentType =
  | "question"
  | "exercise"
  | "lesson"
  | "article"
  | "video"
  | "assessment"
  | "project";

export type WorkflowStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export interface ContentMetadata {
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTimeMinutes: number;
  prerequisites: string[];
  learningObjectives: string[];
  topics: string[];
  language?: string;
  version: string;
  lastReviewed?: Date;
  reviewedBy?: string;
}

export interface ContentData {
  body: string;
  format: "markdown" | "html" | "json";
  variables?: Record<string, unknown>;
  attachments?: string[];
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: ContentData;
  type: ContentType;
  status: WorkflowStatus;
  metadata: ContentMetadata;
  mediaAssets: MediaAsset[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  publishedAt?: Date;
  archivedAt?: Date;
}

// ============================================================================
// Media Asset Types
// ============================================================================

export type MediaType = "image" | "video" | "audio" | "document" | "archive";

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format: string;
  colorSpace?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
}

export interface MediaAsset {
  id: string;
  itemId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: MediaType;
  url: string;
  cdnUrl?: string;
  metadata: MediaMetadata;
  uploadProgress?: number;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Search and Discovery Types
// ============================================================================

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export interface SearchFacet {
  field: string;
  value: string;
  count: number;
}

export interface SearchResult {
  item: ContentItem;
  score: number;
  highlights: SearchHighlight[];
  facets: SearchFacet[];
  explanation?: string;
}

export interface SearchSuggestion {
  text: string;
  type: "content" | "tag" | "author" | "topic";
  count: number;
  highlighted: string;
}

export interface Recommendation {
  item: ContentItem;
  reason: string;
  confidence: number;
  type: "similar" | "trending" | "personalized" | "related";
}

export type RecommendationType =
  | "similar"
  | "trending"
  | "personalized"
  | "related"
  | "popular";

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowTransition {
  id: string;
  itemId: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  userId: string;
  reason?: string;
  notes?: string;
  timestamp: Date;
}

export interface ReviewDecision {
  approved: boolean;
  feedback?: string;
  changes?: string[];
  reviewerId: string;
  reviewedAt: Date;
}

// ============================================================================
// Bulk Operations Types
// ============================================================================

export type BulkOperationType =
  | "import"
  | "export"
  | "update"
  | "delete"
  | "publish"
  | "archive";

export type BulkOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: BulkOperationStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors: BulkOperationError[];
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface BulkOperationError {
  itemId?: string;
  error: string;
  details?: string;
  timestamp: Date;
}

// ============================================================================
// Real-time Update Types
// ============================================================================

export type ContentChangeType =
  | "created"
  | "updated"
  | "deleted"
  | "published"
  | "archived"
  | "status_changed";

export interface ContentChangeEvent {
  type: ContentChangeType;
  itemId: string;
  item?: ContentItem;
  userId: string;
  timestamp: Date;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  itemId: string;
  action: "viewing" | "editing";
  timestamp: Date;
  cursor?: { line: number; column: number };
  selection?: { start: number; end: number };
}
