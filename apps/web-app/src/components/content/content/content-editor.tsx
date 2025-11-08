/**
 * Content Editor Component
 *
 * Rich text editor for content creation and editing with real-time collaboration
 * Requirements: 1.1, 1.2, 1.3
 */

"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  useCreateContentItem,
  useUpdateContentItem,
  useContentWithRealTime,
  useWorkflowValidation,
} from "../../hooks/use-content-operations";
import { useWorkflowPermissions } from "../../hooks/use-workflow-operations";
import { ContentSyncIndicator, PresenceIndicator } from "../index";
import type {
  ContentItem,
  CreateItemDto,
  UpdateItemDto,
  ContentType,
} from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface ContentEditorProps {
  itemId?: string;
  initialContent?: Partial<ContentItem>;
  mode?: "create" | "edit";
  enableRealTime?: boolean;
  enableCollaboration?: boolean;
  onSave?: (item: ContentItem) => void;
  onCancel?: () => void;
  className?: string;
}

export interface ContentFormData {
  title: string;
  content: {
    body: string;
    summary?: string;
  };
  type: ContentType;
  tags: string[];
  metadata: {
    description?: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    estimatedDuration?: number;
  };
}

// ============================================================================
// Content Editor Component
// ============================================================================

export function ContentEditor({
  itemId,
  initialContent,
  mode = itemId ? "edit" : "create",
  enableRealTime = true,
  enableCollaboration = true,
  onSave,
  onCancel,
  className = "",
}: ContentEditorProps) {
  // Hooks
  const { createItem, isCreating, error: createError } = useCreateContentItem();
  const { updateItem, isUpdating, error: updateError } = useUpdateContentItem();
  const { validateForReview, isValidating } = useWorkflowValidation();

  // Real-time content if editing existing item
  const {
    item: realTimeItem,
    isLoading: isLoadingItem,
    activeUsers,
    updatePresence,
    sendCursorPosition,
  } = useContentWithRealTime(itemId || null, {
    enableRealTime: enableRealTime && mode === "edit",
    enablePresence: enableCollaboration && mode === "edit",
    enableCollaboration: enableCollaboration && mode === "edit",
  });

  // Get workflow permissions
  const permissions = useWorkflowPermissions(realTimeItem);

  // Form state
  const [formData, setFormData] = useState<ContentFormData>(() => {
    const item = realTimeItem || initialContent;
    return {
      title: item?.title || "",
      content: {
        body: item?.content?.body || "",
        summary: item?.content?.summary || "",
      },
      type: item?.type || "lesson",
      tags: item?.tags || [],
      metadata: {
        description: item?.metadata?.description || "",
        difficulty: item?.metadata?.difficulty || "beginner",
        estimatedDuration: item?.metadata?.estimatedDuration || 30,
      },
    };
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Refs
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastCursorPosition = useRef({ line: 0, column: 0 });

  // Update form data when real-time item changes
  useEffect(() => {
    if (realTimeItem && mode === "edit") {
      setFormData({
        title: realTimeItem.title || "",
        content: {
          body: realTimeItem.content?.body || "",
          summary: realTimeItem.content?.summary || "",
        },
        type: realTimeItem.type || "lesson",
        tags: realTimeItem.tags || [],
        metadata: {
          description: realTimeItem.metadata?.description || "",
          difficulty: realTimeItem.metadata?.difficulty || "beginner",
          estimatedDuration: realTimeItem.metadata?.estimatedDuration || 30,
        },
      });
    }
  }, [realTimeItem, mode]);

  // Update presence when user is active
  useEffect(() => {
    if (enableCollaboration && itemId) {
      updatePresence("active");

      const interval = setInterval(() => {
        updatePresence("active");
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [enableCollaboration, itemId, updatePresence]);

  // Handle cursor position changes for collaboration
  const handleCursorChange = useCallback(() => {
    if (!enableCollaboration || !itemId || !contentTextareaRef.current) return;

    const textarea = contentTextareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length;

    if (
      line !== lastCursorPosition.current.line ||
      column !== lastCursorPosition.current.column
    ) {
      lastCursorPosition.current = { line, column };
      sendCursorPosition({ line, column });
    }
  }, [enableCollaboration, itemId, sendCursorPosition]);

  // Form handlers
  const updateFormField = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split(".");
      const newData = { ...prev };
      let current: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
  }, []);

  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormField("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, formData.tags, updateFormField]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      updateFormField(
        "tags",
        formData.tags.filter((tag) => tag !== tagToRemove),
      );
    },
    [formData.tags, updateFormField],
  );

  // Validation
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: string[] = [];

    if (!formData.title.trim()) {
      errors.push("Title is required");
    }

    if (!formData.content.body.trim()) {
      errors.push("Content body is required");
    }

    if (formData.content.body.length < 10) {
      errors.push("Content body must be at least 10 characters");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!(await validateForm())) return;

    setIsSaving(true);
    try {
      let result: ContentItem | null = null;

      if (mode === "create") {
        const createData: CreateItemDto = {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          tags: formData.tags,
          metadata: formData.metadata,
        };
        result = await createItem(createData);
      } else if (itemId) {
        const updateData: UpdateItemDto = {
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
          metadata: formData.metadata,
        };
        result = await updateItem(itemId, updateData);
      }

      if (result) {
        setIsDirty(false);
        onSave?.(result);
      }
    } catch (error) {
      console.error("Failed to save content:", error);
    } finally {
      setIsSaving(false);
    }
  }, [mode, formData, validateForm, createItem, updateItem, itemId, onSave]);

  // Auto-save for edit mode
  useEffect(() => {
    if (mode === "edit" && isDirty && itemId) {
      const autoSaveTimer = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [mode, isDirty, itemId, handleSave]);

  const isLoading = isLoadingItem || isCreating || isUpdating || isSaving;
  const error = createError || updateError;
  const canEdit = mode === "create" || permissions.canEdit;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "Create Content" : "Edit Content"}
          </h2>

          {mode === "edit" && enableRealTime && itemId && (
            <ContentSyncIndicator
              itemId={itemId}
              enabled={enableRealTime}
              showDetails={true}
            />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {mode === "edit" && enableCollaboration && itemId && (
            <PresenceIndicator
              itemId={itemId}
              enabled={enableCollaboration}
              maxVisibleUsers={3}
              showStatus={true}
            />
          )}

          {isDirty && (
            <span className="text-sm text-yellow-600 font-medium">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => updateFormField("title", e.target.value)}
            disabled={!canEdit || isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter content title..."
          />
        </div>

        {/* Content Type */}
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Content Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              updateFormField("type", e.target.value as ContentType)
            }
            disabled={!canEdit || isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="lesson">Lesson</option>
            <option value="exercise">Exercise</option>
            <option value="quiz">Quiz</option>
            <option value="article">Article</option>
            <option value="video">Video</option>
          </select>
        </div>

        {/* Content Body */}
        <div>
          <label
            htmlFor="content-body"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Content *
          </label>
          <textarea
            id="content-body"
            ref={contentTextareaRef}
            value={formData.content.body}
            onChange={(e) => updateFormField("content.body", e.target.value)}
            onSelect={handleCursorChange}
            onKeyUp={handleCursorChange}
            onClick={handleCursorChange}
            disabled={!canEdit || isLoading}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
            placeholder="Enter your content here..."
          />
        </div>

        {/* Summary */}
        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Summary
          </label>
          <textarea
            id="summary"
            value={formData.content.summary || ""}
            onChange={(e) => updateFormField("content.summary", e.target.value)}
            disabled={!canEdit || isLoading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Brief summary of the content..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
                {canEdit && !isLoading && (
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {canEdit && !isLoading && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag..."
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={formData.metadata.description || ""}
              onChange={(e) =>
                updateFormField("metadata.description", e.target.value)
              }
              disabled={!canEdit || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="SEO description..."
            />
          </div>

          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Difficulty
            </label>
            <select
              id="difficulty"
              value={formData.metadata.difficulty}
              onChange={(e) =>
                updateFormField("metadata.difficulty", e.target.value)
              }
              disabled={!canEdit || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="1"
              max="480"
              value={formData.metadata.estimatedDuration || ""}
              onChange={(e) =>
                updateFormField(
                  "metadata.estimatedDuration",
                  parseInt(e.target.value) || 30,
                )
              }
              disabled={!canEdit || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              Please fix the following errors:
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Failed to save content: {error.message}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
        <div className="text-sm text-gray-500">
          {mode === "edit" && realTimeItem && (
            <>
              Last updated: {new Date(realTimeItem.updatedAt).toLocaleString()}
              {activeUsers.length > 0 && (
                <span className="ml-4">
                  {activeUsers.length} user{activeUsers.length > 1 ? "s" : ""}{" "}
                  active
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!canEdit || isLoading || !isDirty}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
            <span>{mode === "create" ? "Create" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
