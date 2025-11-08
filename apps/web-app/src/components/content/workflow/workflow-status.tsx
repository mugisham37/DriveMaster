/**
 * Workflow Status Component
 *
 * Displays workflow status with visual indicators and actions
 * Requirements: 5.1, 5.2, 5.3
 */

"use client";

import React from "react";
import { useWorkflowPermissions } from "../../hooks/use-workflow-operations";
import type { ContentItem, WorkflowStatus } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStatusProps {
  item: ContentItem;
  onWorkflowAction?: (action: string) => void;
  showActions?: boolean;
  showHistory?: boolean;
  compact?: boolean;
  className?: string;
}

export interface StatusBadgeProps {
  status: WorkflowStatus;
  size?: "small" | "medium" | "large";
}

export interface WorkflowActionsProps {
  item: ContentItem;
  onAction: (action: string) => void;
  disabled?: boolean;
}

// ============================================================================
// Status Badge Component
// ============================================================================

export function StatusBadge({ status, size = "medium" }: StatusBadgeProps) {
  const getStatusConfig = (status: WorkflowStatus) => {
    switch (status) {
      case "draft":
        return {
          color: "bg-gray-100 text-gray-800",
          icon: "📝",
          label: "Draft",
        };
      case "review":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: "👀",
          label: "In Review",
        };
      case "approved":
        return {
          color: "bg-green-100 text-green-800",
          icon: "✅",
          label: "Approved",
        };
      case "published":
        return {
          color: "bg-blue-100 text-blue-800",
          icon: "🚀",
          label: "Published",
        };
      case "archived":
        return {
          color: "bg-red-100 text-red-800",
          icon: "📦",
          label: "Archived",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: "❓",
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-2.5 py-0.5 text-sm",
    large: "px-3 py-1 text-base",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClasses[size]}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ============================================================================
// Workflow Actions Component
// ============================================================================

export function WorkflowActions({
  item,
  onAction,
  disabled = false,
}: WorkflowActionsProps) {
  const permissions = useWorkflowPermissions(item);

  const actions = [
    {
      key: "submit_for_review",
      label: "Submit for Review",
      icon: "📝",
      color: "bg-yellow-600 hover:bg-yellow-700",
      show: permissions.canSubmitForReview,
    },
    {
      key: "approve",
      label: "Approve",
      icon: "✅",
      color: "bg-green-600 hover:bg-green-700",
      show: permissions.canReview,
    },
    {
      key: "reject",
      label: "Reject",
      icon: "❌",
      color: "bg-red-600 hover:bg-red-700",
      show: permissions.canReview,
    },
    {
      key: "publish",
      label: "Publish",
      icon: "🚀",
      color: "bg-blue-600 hover:bg-blue-700",
      show: permissions.canPublish,
    },
    {
      key: "archive",
      label: "Archive",
      icon: "📦",
      color: "bg-gray-600 hover:bg-gray-700",
      show: permissions.canArchive,
    },
    {
      key: "restore",
      label: "Restore",
      icon: "♻️",
      color: "bg-purple-600 hover:bg-purple-700",
      show: permissions.canRestore,
    },
  ];

  const availableActions = actions.filter((action) => action.show);

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <button
          key={action.key}
          onClick={() => onAction(action.key)}
          disabled={disabled}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
        >
          <span className="mr-1">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Workflow Progress Component
// ============================================================================

interface WorkflowProgressProps {
  currentStatus: WorkflowStatus;
  compact?: boolean;
}

function WorkflowProgress({
  currentStatus,
  compact = false,
}: WorkflowProgressProps) {
  const steps = [
    { key: "draft", label: "Draft", icon: "📝" },
    { key: "review", label: "Review", icon: "👀" },
    { key: "approved", label: "Approved", icon: "✅" },
    { key: "published", label: "Published", icon: "🚀" },
  ];

  const getCurrentStepIndex = () => {
    const index = steps.findIndex((step) => step.key === currentStatus);
    return index >= 0 ? index : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                index <= currentStepIndex
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step.icon}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-4 h-0.5 mx-1 ${
                  index < currentStepIndex ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Workflow Progress</h4>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center space-x-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index <= currentStepIndex
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              <span className="text-sm">{step.icon}</span>
            </div>
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${
                  index <= currentStepIndex ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step.label}
              </div>
              {index === currentStepIndex && (
                <div className="text-xs text-blue-600">Current step</div>
              )}
            </div>
            {index <= currentStepIndex && (
              <div className="text-green-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Workflow Status Component
// ============================================================================

export function WorkflowStatus({
  item,
  onWorkflowAction,
  showActions = true,
  compact = false,
  className = "",
}: WorkflowStatusProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="flex items-center space-x-3">
          <StatusBadge status={item.status} size="small" />
          <WorkflowProgress currentStatus={item.status} compact={true} />
        </div>

        {showActions && onWorkflowAction && (
          <WorkflowActions item={item} onAction={onWorkflowAction} />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Workflow Status</h3>
          <StatusBadge status={item.status} />
        </div>

        <div className="text-sm text-gray-500">
          Last updated: {new Date(item.updatedAt).toLocaleString()}
        </div>
      </div>

      {/* Progress */}
      <WorkflowProgress currentStatus={item.status} />

      {/* Actions */}
      {showActions && onWorkflowAction && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Available Actions
          </h4>
          <WorkflowActions item={item} onAction={onWorkflowAction} />
        </div>
      )}

      {/* Status Details */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-900">Status Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 font-medium">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Last Modified:</span>
            <span className="ml-2 font-medium">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Author:</span>
            <span className="ml-2 font-medium">
              {item.createdBy || "Unknown"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Last Editor:</span>
            <span className="ml-2 font-medium">
              {item.updatedBy || "Unknown"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
