/**
 * Content Preview Component
 *
 * Displays content in a read-only preview format with media assets
 * Requirements: 1.1, 1.2, 1.3
 */

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useContentItem } from "@/hooks/use-content-operations";
import { useMediaAssets } from "@/hooks/use-media-operations";
import {
  useWorkflowHistory,
  useWorkflowPermissions,
} from "@/hooks/use-workflow-operations";
import type { ContentItem, MediaAsset } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface ContentPreviewProps {
  itemId?: string;
  item?: ContentItem;
  showMetadata?: boolean;
  showWorkflowHistory?: boolean;
  showMediaAssets?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onWorkflowAction?: (action: string) => void;
  className?: string;
}

export interface MediaAssetPreviewProps {
  asset: MediaAsset;
  onView?: () => void;
}

export interface WorkflowHistoryProps {
  itemId: string;
  compact?: boolean;
}

// ============================================================================
// Media Asset Preview Component
// ============================================================================

export function MediaAssetPreview({ asset, onView }: MediaAssetPreviewProps) {
  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  const isAudio = asset.mimeType.startsWith("audio/");
  const isPdf = asset.mimeType === "application/pdf";

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-3">
      <div className="flex items-start space-x-3">
        {/* Thumbnail/Icon */}
        <div className="flex-shrink-0">
          {isImage ? (
            <Image
              src={asset.url}
              alt={asset.originalName}
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80"
              onClick={onView}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
              {isVideo && <span className="text-2xl">🎥</span>}
              {isAudio && <span className="text-2xl">🎵</span>}
              {isPdf && <span className="text-2xl">📄</span>}
              {!isVideo && !isAudio && !isPdf && (
                <span className="text-2xl">📎</span>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {asset.originalName}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {asset.mimeType} • {formatFileSize(asset.size)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Uploaded: {new Date(asset.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          {onView && (
            <button
              onClick={onView}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="View asset"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Workflow History Component
// ============================================================================

export function WorkflowHistory({
  itemId,
  compact = false,
}: WorkflowHistoryProps) {
  const { history, isLoading, error } = useWorkflowHistory(itemId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  if (error || !history.length) {
    return (
      <div className="text-sm text-gray-500">
        {error
          ? "Failed to load workflow history"
          : "No workflow history available"}
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return "✨";
      case "submitted_for_review":
        return "📝";
      case "approved":
        return "✅";
      case "rejected":
        return "❌";
      case "published":
        return "🚀";
      case "archived":
        return "📦";
      case "restored":
        return "♻️";
      default:
        return "📄";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "text-blue-600";
      case "submitted_for_review":
        return "text-yellow-600";
      case "approved":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      case "published":
        return "text-purple-600";
      case "archived":
        return "text-gray-600";
      case "restored":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        {history.slice(0, 3).map((transition) => (
          <div
            key={transition.id}
            className="flex items-center space-x-2 text-sm"
          >
            <span>{getActionIcon(transition.action)}</span>
            <span
              className={`font-medium ${getActionColor(transition.action)}`}
            >
              {transition.action.replace("_", " ")}
            </span>
            <span className="text-gray-500">
              {new Date(transition.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
        {history.length > 3 && (
          <div className="text-xs text-gray-400">
            +{history.length - 3} more actions
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Workflow History</h4>
      <div className="space-y-3">
        {history.map((transition) => (
          <div key={transition.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <span className="text-lg">
                {getActionIcon(transition.action)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm font-medium ${getActionColor(transition.action)}`}
                >
                  {transition.action
                    .replace("_", " ")
                    .replace(/\b\w/g, (letter: string) => letter.toUpperCase())}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(transition.createdAt).toLocaleString()}
                </span>
              </div>
              {transition.comment && (
                <p className="text-sm text-gray-600 mt-1">
                  {transition.comment}
                </p>
              )}
              {transition.metadata && (
                <div className="text-xs text-gray-500 mt-1">
                  By: {transition.metadata.performedBy as string || "System"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Content Metadata Component
// ============================================================================

interface ContentMetadataProps {
  item: ContentItem;
}

function ContentMetadata({ item }: ContentMetadataProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "published":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Content Details</h4>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Type:</span>
          <span className="ml-2 font-medium capitalize">{item.type}</span>
        </div>

        <div>
          <span className="text-gray-500">Status:</span>
          <span
            className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
          >
            {item.status}
          </span>
        </div>

        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 font-medium">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div>
          <span className="text-gray-500">Updated:</span>
          <span className="ml-2 font-medium">
            {new Date(item.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {item.metadata?.difficulty && (
          <div>
            <span className="text-gray-500">Difficulty:</span>
            <span className="ml-2 font-medium capitalize">
              {item.metadata.difficulty}
            </span>
          </div>
        )}

        {item.metadata?.estimatedDuration && (
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-2 font-medium">
              {item.metadata.estimatedDuration} minutes
            </span>
          </div>
        )}
      </div>

      {item.metadata?.description && (
        <div>
          <span className="text-gray-500 text-sm">Description:</span>
          <p className="mt-1 text-sm text-gray-700">
            {item.metadata.description}
          </p>
        </div>
      )}

      {item.tags && item.tags.length > 0 && (
        <div>
          <span className="text-gray-500 text-sm">Tags:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Content Preview Component
// ============================================================================

export function ContentPreview({
  itemId,
  item: providedItem,
  showMetadata = true,
  showWorkflowHistory = true,
  showMediaAssets = true,
  showActions = true,
  onEdit,
  onWorkflowAction,
  className = "",
}: ContentPreviewProps) {
  // Hooks
  const {
    item: fetchedItem,
    isLoading: isLoadingItem,
    error: itemError,
  } = useContentItem(itemId || null);
  const { assets } = useMediaAssets(itemId || null);

  // Use provided item or fetched item
  const item = providedItem || fetchedItem;
  const permissions = useWorkflowPermissions(item || null);

  // State
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  if (isLoadingItem) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Error Loading Content
        </h3>
        <p className="text-red-700">
          {itemError?.message || "Content not found"}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {item.title}
          </h1>
          {item.content?.summary && (
            <p className="text-gray-600 text-lg">{item.content.summary}</p>
          )}
        </div>

        {showActions && (
          <div className="flex items-center space-x-2 ml-4">
            {onEdit && permissions.canEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
            )}

            {onWorkflowAction && permissions.canSubmitForReview && (
              <button
                onClick={() => onWorkflowAction("submit_for_review")}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Submit for Review
              </button>
            )}

            {onWorkflowAction && permissions.canPublish && (
              <button
                onClick={() => onWorkflowAction("publish")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Publish
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Content Body */}
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {item.content?.body}
          </div>
        </div>

        {/* Media Assets */}
        {showMediaAssets && assets && assets.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Media Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assets.map((asset) => (
                <MediaAssetPreview
                  key={asset.id}
                  asset={asset}
                  onView={() => setSelectedAsset(asset)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metadata and Workflow History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metadata */}
          {showMetadata && <ContentMetadata item={item} />}

          {/* Workflow History */}
          {showWorkflowHistory && itemId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <WorkflowHistory itemId={itemId} />
            </div>
          )}
        </div>
      </div>

      {/* Asset Viewer Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedAsset.originalName}
              </h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {selectedAsset.mimeType.startsWith("image/") ? (
                <Image
                  src={selectedAsset.url}
                  alt={selectedAsset.originalName}
                  width={800}
                  height={600}
                  className="max-w-full h-auto"
                />
              ) : selectedAsset.mimeType.startsWith("video/") ? (
                <video
                  src={selectedAsset.url}
                  controls
                  className="max-w-full h-auto"
                />
              ) : (
                <div className="text-center p-8">
                  <p className="text-gray-600 mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
