/**
 * Media Gallery Component
 *
 * Displays and manages media assets with filtering, sorting, and preview
 * Requirements: 3.1, 3.2
 */

"use client";

import React, { useState } from "react";
import {
  useMediaGallery,
  useDeleteMediaAsset,
  useMediaSignedUrl,
} from "../../hooks/use-media-operations";
import type { MediaAsset } from "../../types";

// ============================================================================
// Local Types
// ============================================================================

export interface MediaGalleryFilters {
  type?: string;
  search?: string;
  sortBy?: "name" | "size" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Types
// ============================================================================

export interface MediaGalleryProps {
  itemId: string;
  onAssetSelect?: (asset: MediaAsset) => void;
  onAssetDelete?: (asset: MediaAsset) => void;
  selectable?: boolean;
  selectedAssets?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showFilters?: boolean;
  showActions?: boolean;
  gridSize?: "small" | "medium" | "large";
  className?: string;
}

export interface MediaAssetCardProps {
  asset: MediaAsset;
  isSelected?: boolean;
  onSelect?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  onView?: (() => void) | undefined;
  showActions?: boolean;
  size?: "small" | "medium" | "large";
}

export interface MediaViewerProps {
  asset: MediaAsset | null;
  onClose: () => void;
}

// ============================================================================
// Media Asset Card Component
// ============================================================================

export function MediaAssetCard({
  asset,
  isSelected = false,
  onSelect,
  onDelete,
  onView,
  showActions = true,
  size = "medium",
}: MediaAssetCardProps) {
  const { url: signedUrl } = useMediaSignedUrl(asset.id);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  const isAudio = asset.mimeType.startsWith("audio/");
  const isPdf = asset.mimeType === "application/pdf";

  const getFileIcon = () => {
    if (isVideo) return "🎥";
    if (isAudio) return "🎵";
    if (isPdf) return "📄";
    return "📎";
  };

  const sizeClasses = {
    small: "w-24 h-24",
    medium: "w-32 h-32",
    large: "w-48 h-48",
  };

  const cardSizeClasses = {
    small: "p-2",
    medium: "p-3",
    large: "p-4",
  };

  return (
    <div
      className={`bg-white border rounded-lg hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-blue-500" : ""} ${cardSizeClasses[size]}`}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="flex justify-end mb-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      )}

      {/* Thumbnail/Preview */}
      <div
        className={`${sizeClasses[size]} mx-auto mb-3 relative group cursor-pointer`}
        onClick={onView}
      >
        {isImage && signedUrl ? (
          <img
            src={signedUrl}
            alt={asset.originalName}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-4xl">{getFileIcon()}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-8 h-8 text-white"
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
          </div>
        </div>
      </div>

      {/* File Info */}
      <div className="text-center space-y-1">
        <h4
          className="text-sm font-medium text-gray-900 truncate"
          title={asset.originalName}
        >
          {asset.originalName}
        </h4>
        <p className="text-xs text-gray-500">{formatFileSize(asset.size)}</p>
        <p className="text-xs text-gray-400">
          {new Date(asset.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex justify-center space-x-2 mt-3">
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

          {signedUrl && (
            <a
              href={signedUrl}
              download={asset.originalName}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="Download asset"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </a>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete asset"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Media Viewer Component
// ============================================================================

export function MediaViewer({ asset, onClose }: MediaViewerProps) {
  const { url: signedUrl } = useMediaSignedUrl(asset?.id || null);

  if (!asset) return null;

  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  const isAudio = asset.mimeType.startsWith("audio/");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {asset.originalName}
            </h3>
            <p className="text-sm text-gray-500">
              {asset.mimeType} • {Math.round(asset.size / 1024)} KB
            </p>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {signedUrl && (
              <a
                href={signedUrl}
                download={asset.originalName}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Download
              </a>
            )}

            <button
              onClick={onClose}
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
        </div>

        {/* Content */}
        <div className="p-4">
          {isImage && signedUrl ? (
            <img
              src={signedUrl}
              alt={asset.originalName}
              className="max-w-full max-h-[70vh] mx-auto"
            />
          ) : isVideo && signedUrl ? (
            <video
              src={signedUrl}
              controls
              className="max-w-full max-h-[70vh] mx-auto"
            />
          ) : isAudio && signedUrl ? (
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🎵</div>
              <audio src={signedUrl} controls className="mx-auto" />
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📎</div>
              <p className="text-gray-600 mb-4">
                Preview not available for this file type
              </p>
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Open File
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Gallery Filters Component
// ============================================================================

interface GalleryFiltersProps {
  filters: MediaGalleryFilters;
  onFiltersChange: (
    key: keyof MediaGalleryFilters,
    value: string | "name" | "size" | "createdAt" | "asc" | "desc" | undefined,
  ) => void;
  onReset: () => void;
}

function GalleryFilters({
  filters,
  onFiltersChange,
  onReset,
}: GalleryFiltersProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={onReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange("search", e.target.value || undefined)
            }
            placeholder="Search files..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Type
          </label>
          <select
            value={filters.type || ""}
            onChange={(e) =>
              onFiltersChange("type", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
            <option value="audio/">Audio</option>
            <option value="application/pdf">PDF</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy || "createdAt"}
            onChange={(e) => onFiltersChange("sortBy", e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt">Date Added</option>
            <option value="name">Name</option>
            <option value="size">File Size</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            value={filters.sortOrder || "desc"}
            onChange={(e) =>
              onFiltersChange("sortOrder", e.target.value as unknown)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Media Gallery Component
// ============================================================================

export function MediaGallery({
  itemId,
  onAssetSelect,
  onAssetDelete,
  selectable = false,
  selectedAssets = [],
  onSelectionChange,
  showFilters = true,
  showActions = true,
  gridSize = "medium",
  className = "",
}: MediaGalleryProps) {
  // Hooks
  const {
    assets,
    isLoading,
    error,
    refresh,
    filters,
    updateFilter,
    resetFilters,
  } = useMediaGallery(itemId);

  const { deleteAsset } = useDeleteMediaAsset();

  // State
  const [selectedAssetIds, setSelectedAssetIds] =
    useState<string[]>(selectedAssets);
  const [viewingAsset, setViewingAsset] = useState<MediaAsset | null>(null);

  // Grid size classes
  const gridClasses = {
    small: "grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
    medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  };

  // Handle asset selection
  const handleAssetSelect = (assetId: string, selected: boolean) => {
    const newSelection = selected
      ? [...selectedAssetIds, assetId]
      : selectedAssetIds.filter((id) => id !== assetId);

    setSelectedAssetIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelection = selected
      ? assets.map((asset: MediaAsset) => asset.id)
      : [];
    setSelectedAssetIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Handle asset deletion
  const handleAssetDelete = async (asset: MediaAsset) => {
    if (
      window.confirm(`Are you sure you want to delete "${asset.originalName}"?`)
    ) {
      const success = await deleteAsset(asset.id, itemId);
      if (success) {
        onAssetDelete?.(asset);
        refresh();
      }
    }
  };

  const isAllSelected =
    assets.length > 0 && selectedAssetIds.length === assets.length;
  const isPartiallySelected =
    selectedAssetIds.length > 0 && selectedAssetIds.length < assets.length;

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Error Loading Media
        </h3>
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <GalleryFilters
          filters={filters}
          onFiltersChange={updateFilter}
          onReset={resetFilters}
        />
      )}

      {/* Gallery Header */}
      <div className="bg-white border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Media Gallery ({assets.length})
            </h2>

            {selectable && assets.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">
                  {selectedAssetIds.length > 0 &&
                    `${selectedAssetIds.length} selected`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-2 text-gray-500">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading media...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && assets.length === 0 && (
          <div className="text-center p-8">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No media found
            </h3>
            <p className="text-gray-500">
              {Object.keys(filters).some(
                (key) => filters[key as keyof MediaGalleryFilters],
              )
                ? "Try adjusting your filters to see more results."
                : "Upload some media files to get started."}
            </p>
          </div>
        )}

        {/* Media Grid */}
        {!isLoading && assets.length > 0 && (
          <div className={`p-4 grid gap-4 ${gridClasses[gridSize]}`}>
            {assets.map((asset: MediaAsset) => (
              <MediaAssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectable && selectedAssetIds.includes(asset.id)}
                onSelect={
                  selectable
                    ? () =>
                        handleAssetSelect(
                          asset.id,
                          !selectedAssetIds.includes(asset.id),
                        )
                    : onAssetSelect
                      ? () => onAssetSelect(asset)
                      : undefined
                }
                onDelete={
                  showActions && onAssetDelete
                    ? () => handleAssetDelete(asset)
                    : undefined
                }
                onView={() => setViewingAsset(asset)}
                showActions={showActions}
                size={gridSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Media Viewer */}
      <MediaViewer asset={viewingAsset} onClose={() => setViewingAsset(null)} />
    </div>
  );
}
