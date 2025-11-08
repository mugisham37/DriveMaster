/**
 * Review Panel Component
 *
 * Interface for content review with approval/rejection functionality
 * Requirements: 5.1, 5.2
 */

"use client";

import React, { useState } from "react";
import {
  useReviewContent,
  useWorkflowPermissions,
} from "@/hooks/use-workflow-operations";
import type { ContentItem, ReviewItemDto } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface ReviewPanelProps {
  item: ContentItem;
  onReviewComplete?: (item: ContentItem) => void;
  onCancel?: () => void;
  className?: string;
}

export interface ReviewFormData {
  action: "approve" | "reject";
  comment: string;
  feedback: string;
  priority: "low" | "medium" | "high";
  tags: string[];
}

// ============================================================================
// Review Form Component
// ============================================================================

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ReviewForm({ onSubmit, onCancel, isSubmitting }: ReviewFormProps) {
  const [formData, setFormData] = useState<ReviewFormData>({
    action: "approve",
    comment: "",
    feedback: "",
    priority: "medium",
    tags: [],
  });

  const [newTag, setNewTag] = useState("");

  const updateFormField = (field: keyof ReviewFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormField("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormField(
      "tags",
      formData.tags.filter((tag) => tag !== tagToRemove),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isApproval = formData.action === "approve";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Action Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Review Decision *
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="action"
              value="approve"
              checked={formData.action === "approve"}
              onChange={(e) => updateFormField("action", e.target.value)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 flex items-center">
              <span className="mr-1">✅</span>
              Approve
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="action"
              value="reject"
              checked={formData.action === "reject"}
              onChange={(e) => updateFormField("action", e.target.value)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 flex items-center">
              <span className="mr-1">❌</span>
              Reject
            </span>
          </label>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Review Comment *
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => updateFormField("comment", e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={
            isApproval
              ? "Explain why this content is approved..."
              : "Explain what needs to be changed..."
          }
        />
      </div>

      {/* Detailed Feedback (for rejections) */}
      {!isApproval && (
        <div>
          <label
            htmlFor="feedback"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Detailed Feedback
          </label>
          <textarea
            id="feedback"
            value={formData.feedback}
            onChange={(e) => updateFormField("feedback", e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide specific feedback on what needs to be improved..."
          />
        </div>
      )}

      {/* Priority (for rejections) */}
      {!isApproval && (
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Priority Level
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => updateFormField("priority", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low - Minor improvements needed</option>
            <option value="medium">Medium - Moderate changes required</option>
            <option value="high">High - Major revisions needed</option>
          </select>
        </div>
      )}

      {/* Review Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Review Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), addTag())
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add review tag..."
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!newTag.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Common tags: grammar, content-quality, formatting, accuracy,
          completeness
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.comment.trim()}
          className={`px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
            isApproval
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-4 w-4"
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
          )}
          <span>{isApproval ? "✅ Approve Content" : "❌ Reject Content"}</span>
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Content Summary Component
// ============================================================================

interface ContentSummaryProps {
  item: ContentItem;
}

function ContentSummary({ item }: ContentSummaryProps) {
  // Basic validation without external hook
  const validation = React.useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!item.title?.trim()) {
      errors.push("Title is required");
    }

    if (!item.content?.body?.trim()) {
      errors.push("Content body is required");
    }

    if (item.content?.body && item.content.body.length < 50) {
      warnings.push("Content is quite short, consider adding more detail");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [item]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Content Summary</h4>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Title:</span>
          <span className="ml-2 font-medium">{item.title}</span>
        </div>
        <div>
          <span className="text-gray-500">Type:</span>
          <span className="ml-2 font-medium capitalize">{item.type}</span>
        </div>
        <div>
          <span className="text-gray-500">Author:</span>
          <span className="ml-2 font-medium">
            {item.createdBy || "Unknown"}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Submitted:</span>
          <span className="ml-2 font-medium">
            {new Date(item.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Content Preview */}
      {item.content?.body && (
        <div>
          <span className="text-gray-500 text-sm">Content Preview:</span>
          <p className="mt-1 text-sm text-gray-700 line-clamp-3">
            {item.content.body.substring(0, 200)}...
          </p>
        </div>
      )}

      {/* Word Count */}
      {item.content?.body && (
        <div className="text-sm">
          <span className="text-gray-500">Word Count:</span>
          <span className="ml-2 font-medium">
            {
              item.content.body.split(/\s+/).filter((word) => word.length > 0)
                .length
            }{" "}
            words
          </span>
        </div>
      )}

      {/* Tags */}
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

      {/* Validation Results */}
      {validation && (
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">
            Content Validation
          </h5>
          {validation.isValid ? (
            <div className="flex items-center text-sm text-green-600">
              <span className="mr-1">✅</span>
              Content meets all requirements
            </div>
          ) : (
            <div className="space-y-1">
              {validation.errors.map((error: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center text-sm text-red-600"
                >
                  <span className="mr-1">❌</span>
                  {error}
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {validation.warnings.map((warning: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center text-sm text-yellow-600"
                >
                  <span className="mr-1">⚠️</span>
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Review Panel Component
// ============================================================================

export function ReviewPanel({
  item,
  onReviewComplete,
  onCancel,
  className = "",
}: ReviewPanelProps) {
  const { reviewContent, isReviewing, error } = useReviewContent();
  const permissions = useWorkflowPermissions(item);

  const handleReviewSubmit = async (formData: ReviewFormData) => {
    const reviewData: ReviewItemDto = {
      decision: formData.action,
      comments: formData.comment,
      feedback: [formData.feedback],
      reviewerNotes: `Priority: ${formData.priority}, Tags: ${formData.tags.join(", ")}`,
    };

    const result = await reviewContent(item.id, reviewData);
    if (result) {
      onReviewComplete?.(result);
    }
  };

  // Check permissions
  if (!permissions.canReview) {
    return (
      <div
        className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 ${className}`}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Review Not Available
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              You don&apos;t have permission to review this content, or
              it&apos;s not in a reviewable state.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Review Content: {item.title}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <span className="mr-1">👀</span>
              Pending Review
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Content Summary */}
        <ContentSummary item={item} />

        {/* Review Form */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Review Decision
          </h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Review Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          <ReviewForm
            onSubmit={handleReviewSubmit}
            onCancel={onCancel || (() => {})}
            isSubmitting={isReviewing}
          />
        </div>
      </div>
    </div>
  );
}
