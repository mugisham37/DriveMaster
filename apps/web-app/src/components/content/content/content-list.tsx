/**
 * Content List Component
 *
 * Displays a paginated list of content items with filtering and sorting
 * Requirements: 1.1, 1.2
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  useContentItems,
  useContentFilters,
  useContentPagination,
} from "../../hooks/use-content-operations";
import { useWorkflowStatusSummary } from "../../hooks/use-workflow-operations";
import type {
  ContentItem,
  QueryItemsDto,
  WorkflowStatus,
  ContentType,
} from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface ContentListProps {
  initialFilters?: QueryItemsDto;
  onItemSelect?: (item: ContentItem) => void;
  onItemEdit?: (item: ContentItem) => void;
  onItemDelete?: (item: ContentItem) => void;
  showFilters?: boolean;
  showPagination?: boolean;
  showStatusSummary?: boolean;
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

export interface ContentListItemProps {
  item: ContentItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

// ============================================================================
// Content List Item Component
// ============================================================================

export function ContentListItem({
  item,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = true,
}: ContentListItemProps) {
  const getStatusColor = (status: WorkflowStatus) => {
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

  const getTypeIcon = (type: ContentType) => {
    switch (type) {
      case "lesson":
        return "📚";
      case "exercise":
        return "✏️";
      case "quiz":
        return "❓";
      case "article":
        return "📄";
      case "video":
        return "🎥";
      default:
        return "📄";
    }
  };

  return (
    <div
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-2">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            )}

            <span className="text-lg" title={item.type}>
              {getTypeIcon(item.type)}
            </span>

            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {item.title}
            </h3>

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
            >
              {item.status}
            </span>
          </div>

          {/* Content Preview */}
          {item.content?.summary && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {item.content.summary}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{item.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </span>
            <span>
              Updated: {new Date(item.updatedAt).toLocaleDateString()}
            </span>
            {item.metadata?.difficulty && (
              <span className="capitalize">{item.metadata.difficulty}</span>
            )}
            {item.metadata?.estimatedDuration && (
              <span>{item.metadata.estimatedDuration} min</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-2 ml-4">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit content"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete content"
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
    </div>
  );
}

// ============================================================================
// Content Filters Component
// ============================================================================

interface ContentFiltersProps {
  filters: QueryItemsDto;
  onFiltersChange: (filters: Partial<QueryItemsDto>) => void;
  onReset: () => void;
}

function ContentFilters({
  filters,
  onFiltersChange,
  onReset,
}: ContentFiltersProps) {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
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
              onFiltersChange({ search: e.target.value || undefined })
            }
            placeholder="Search content..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filters.type || ""}
            onChange={(e) =>
              onFiltersChange({
                type: (e.target.value as ContentType) || undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="lesson">Lesson</option>
            <option value="exercise">Exercise</option>
            <option value="quiz">Quiz</option>
            <option value="article">Article</option>
            <option value="video">Video</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              onFiltersChange({
                status: (e.target.value as WorkflowStatus) || undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={`${filters.sortBy || "updatedAt"}-${filters.sortOrder || "desc"}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-");
              onFiltersChange({
                sortBy,
                sortOrder: sortOrder as "asc" | "desc",
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="createdAt-desc">Recently Created</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="status-asc">Status</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Pagination Component
// ============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between bg-white border rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {total} results
        </span>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Per page:</label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-2 text-sm rounded ${
                  pageNum === page
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Status Summary Component
// ============================================================================

interface StatusSummaryProps {
  items: ContentItem[];
}

function StatusSummary({ items }: StatusSummaryProps) {
  const summary = useWorkflowStatusSummary(items);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Status Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">
            {summary.draft}
          </div>
          <div className="text-sm text-gray-500">Draft</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {summary.review}
          </div>
          <div className="text-sm text-gray-500">In Review</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {summary.approved}
          </div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {summary.published}
          </div>
          <div className="text-sm text-gray-500">Published</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {summary.archived}
          </div>
          <div className="text-sm text-gray-500">Archived</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Content List Component
// ============================================================================

export function ContentList({
  initialFilters = {},
  onItemSelect,
  onItemEdit,
  onItemDelete,
  showFilters = true,
  showPagination = true,
  showStatusSummary = true,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  className = "",
}: ContentListProps) {
  // Hooks
  const { params, updateFilters, resetFilters } =
    useContentFilters(initialFilters);
  const { page, limit, goToPage, changeLimit } = useContentPagination();

  // Combine filters with pagination
  const queryParams = useMemo(
    () => ({
      ...params,
      page,
      limit,
    }),
    [params, page, limit],
  );

  const { items, total, totalPages, isLoading, error, refresh } =
    useContentItems(queryParams);

  // Selection state
  const [localSelectedItems, setLocalSelectedItems] =
    useState<string[]>(selectedItems);

  // Handle selection
  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelection = selected
      ? [...localSelectedItems, itemId]
      : localSelectedItems.filter((id) => id !== itemId);

    setLocalSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelection = selected ? items.map((item) => item.id) : [];
    setLocalSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  };

  const isAllSelected =
    items.length > 0 && localSelectedItems.length === items.length;
  const isPartiallySelected =
    localSelectedItems.length > 0 && localSelectedItems.length < items.length;

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Error Loading Content
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
      {/* Status Summary */}
      {showStatusSummary && <StatusSummary items={items} />}

      {/* Filters */}
      {showFilters && (
        <ContentFilters
          filters={params}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
        />
      )}

      {/* Content List */}
      <div className="bg-white border rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Content Items ({total})
            </h2>

            {selectable && items.length > 0 && (
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
                  {localSelectedItems.length > 0 &&
                    `${localSelectedItems.length} selected`}
                </span>
              </div>
            )}
          </div>

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
              <span>Loading content...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No content found
            </h3>
            <p className="text-gray-500">
              {Object.keys(params).length > 0
                ? "Try adjusting your filters to see more results."
                : "Get started by creating your first content item."}
            </p>
          </div>
        )}

        {/* Content Items */}
        {!isLoading && items.length > 0 && (
          <div className="p-4 space-y-4">
            {items.map((item) => (
              <ContentListItem
                key={item.id}
                item={item}
                isSelected={selectable && localSelectedItems.includes(item.id)}
                onSelect={
                  selectable
                    ? () =>
                        handleItemSelect(
                          item.id,
                          !localSelectedItems.includes(item.id),
                        )
                    : onItemSelect
                      ? () => onItemSelect(item)
                      : undefined
                }
                onEdit={onItemEdit ? () => onItemEdit(item) : undefined}
                onDelete={onItemDelete ? () => onItemDelete(item) : undefined}
                showActions={!!(onItemEdit || onItemDelete)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && !isLoading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </div>
  );
}
