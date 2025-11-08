"use client";

/**
 * Data Deletion Manager Component - GDPR Right to Erasure
 *
 * Implements:
 * - Data deletion request workflows with confirmation
 * - Deletion status tracking and verification
 * - Account deactivation vs full deletion options
 * - Deletion impact assessment and warnings
 * - Requirements: 5.1, 5.3
 */

import React, { useState, useEffect } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import type { GDPRDeleteResponse } from "@/types/user-service";

// ============================================================================
// Component Props
// ============================================================================

export interface DataDeletionManagerProps {
  onDeletionRequest?: () => void;
  className?: string;
}

// ============================================================================
// Deletion Types Configuration
// ============================================================================

interface DeletionOption {
  id: "deactivate" | "partial" | "complete";
  title: string;
  description: string;
  consequences: string[];
  reversible: boolean;
  timeframe: string;
  icon: string;
  severity: "low" | "medium" | "high";
}

const DELETION_OPTIONS: DeletionOption[] = [
  {
    id: "deactivate",
    title: "Deactivate Account",
    description: "Temporarily disable your account while keeping your data",
    consequences: [
      "Your account will be inaccessible",
      "Data remains in our system",
      "You can reactivate anytime",
      "Learning progress is preserved",
    ],
    reversible: true,
    timeframe: "Immediate",
    icon: "⏸️",
    severity: "low",
  },
  {
    id: "partial",
    title: "Partial Data Deletion",
    description:
      "Delete personal information while keeping anonymized learning data",
    consequences: [
      "Personal identifiers removed",
      "Learning progress anonymized",
      "Account cannot be recovered",
      "Anonymized data may be retained for research",
    ],
    reversible: false,
    timeframe: "30 days",
    icon: "🔄",
    severity: "medium",
  },
  {
    id: "complete",
    title: "Complete Data Deletion",
    description: "Permanently delete all your data from our systems",
    consequences: [
      "All personal data permanently deleted",
      "All learning progress lost",
      "Account cannot be recovered",
      "Action is irreversible",
    ],
    reversible: false,
    timeframe: "30 days",
    icon: "🗑️",
    severity: "high",
  },
];

// ============================================================================
// Deletion Status Configuration
// ============================================================================

const DELETION_STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    description: "Your deletion request is being reviewed",
    color: "yellow",
    icon: "⏳",
  },
  processing: {
    label: "Processing",
    description: "Your data is being deleted",
    color: "blue",
    icon: "⚙️",
  },
  completed: {
    label: "Completed",
    description: "Your data has been deleted",
    color: "green",
    icon: "✅",
  },
  failed: {
    label: "Failed",
    description: "Deletion failed - please contact support",
    color: "red",
    icon: "❌",
  },
} as const;

// ============================================================================
// Main Component
// ============================================================================

export function DataDeletionManager({
  onDeletionRequest,
  className = "",
}: DataDeletionManagerProps) {
  const {
    state,
    requestDataDeletion,
    checkDeletionStatus,
    cancelDeletionRequest,
    trackDataUsage,
    isLoading,
    error,
    clearError,
  } = useGDPR();

  const [selectedOption, setSelectedOption] = useState<
    DeletionOption["id"] | null
  >(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-check status for active deletion requests
  useEffect(() => {
    const activeDeletion = state.activeDeleteRequest;

    if (
      activeDeletion &&
      (activeDeletion.status === "pending" ||
        activeDeletion.status === "processing")
    ) {
      const interval = setInterval(async () => {
        try {
          await checkDeletionStatus(activeDeletion.requestId);
        } catch (error) {
          console.warn("Failed to check deletion status:", error);
        }
      }, 30000); // Check every 30 seconds

      setStatusCheckInterval(interval);

      return () => {
        clearInterval(interval);
        setStatusCheckInterval(null);
      };
    } else if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [state.activeDeleteRequest, checkDeletionStatus]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleOptionSelect = (optionId: DeletionOption["id"]) => {
    setSelectedOption(optionId);
    setShowConfirmation(false);
    setConfirmationText("");
    clearError();
  };

  const handleProceedToConfirmation = () => {
    if (!selectedOption || !deletionReason.trim()) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmDeletion = async () => {
    if (!selectedOption || !deletionReason.trim()) {
      return;
    }

    const selectedConfig = DELETION_OPTIONS.find(
      (opt) => opt.id === selectedOption,
    );
    if (!selectedConfig) return;

    // Require confirmation text for irreversible actions
    if (!selectedConfig.reversible && confirmationText !== "DELETE MY DATA") {
      return;
    }

    try {
      setIsRequesting(true);
      clearError();

      const fullReason = `${selectedConfig.title}: ${deletionReason}`;
      const deleteResponse = await requestDataDeletion(fullReason);

      // Track the deletion request
      await trackDataUsage("data_deletion_requested", "user_data", {
        requestId: deleteResponse.requestId,
        deletionType: selectedOption,
        reason: deletionReason,
        timestamp: new Date().toISOString(),
      });

      onDeletionRequest?.();

      // Reset form
      setSelectedOption(null);
      setDeletionReason("");
      setConfirmationText("");
      setShowConfirmation(false);
    } catch (error) {
      console.error("Failed to request data deletion:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelDeletionRequest(requestId);

      // Track the cancellation
      await trackDataUsage("data_deletion_cancelled", "user_data", {
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to cancel deletion request:", error);
    }
  };

  const handleStatusRefresh = async (requestId: string) => {
    try {
      await checkDeletionStatus(requestId);
    } catch (error) {
      console.error("Failed to refresh deletion status:", error);
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const activeDeletion = state.activeDeleteRequest;
  const selectedConfig = selectedOption
    ? DELETION_OPTIONS.find((opt) => opt.id === selectedOption)
    : null;
  const canProceed = selectedOption && deletionReason.trim().length >= 10;
  const canConfirm =
    canProceed &&
    (selectedConfig?.reversible || confirmationText === "DELETE MY DATA");

  const deletionHistory = Array.from(state.deleteRequests.values())
    .filter((req) => req.requestId !== activeDeletion?.requestId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderDeletionOption = (option: DeletionOption) => {
    const isSelected = selectedOption === option.id;
    const severityColors = {
      low: "green",
      medium: "yellow",
      high: "red",
    };
    const color = severityColors[option.severity];

    return (
      <div
        key={option.id}
        className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
          isSelected
            ? `border-${color}-500 bg-${color}-50`
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => handleOptionSelect(option.id)}
      >
        <div className="flex items-start">
          <span className="text-3xl mr-4">{option.icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {option.title}
              </h3>
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}
                >
                  {option.severity} risk
                </span>
                {!option.reversible && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    irreversible
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-4">{option.description}</p>

            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Timeframe:</span>{" "}
                {option.timeframe}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Consequences:</span>
                <ul className="mt-1 ml-4 space-y-1">
                  {option.consequences.map((consequence, index) => (
                    <li key={index} className="text-gray-600">
                      • {consequence}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeletionStatus = (deleteRequest: GDPRDeleteResponse) => {
    const config = DELETION_STATUS_CONFIG[deleteRequest.status];
    const canCancel = deleteRequest.status === "pending";

    return (
      <div
        className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4`}
      >
        <div className="flex items-start">
          <span className="text-2xl mr-3">{config.icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-${config.color}-900`}>
                {config.label}
              </h3>
              <div className="flex items-center space-x-2">
                {deleteRequest.status === "pending" && (
                  <button
                    onClick={() => handleStatusRefresh(deleteRequest.requestId)}
                    className={`text-${config.color}-700 hover:text-${config.color}-800 text-sm font-medium`}
                  >
                    Refresh Status
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => handleCancelRequest(deleteRequest.requestId)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>

            <p className={`text-${config.color}-800 mb-3`}>
              {config.description}
            </p>

            <div className="space-y-2 text-sm">
              <div className={`text-${config.color}-700`}>
                <span className="font-medium">Request ID:</span>{" "}
                {deleteRequest.requestId}
              </div>
              <div className={`text-${config.color}-700`}>
                <span className="font-medium">Requested:</span>{" "}
                {new Date(deleteRequest.createdAt).toLocaleString()}
              </div>
              {deleteRequest.scheduledFor && (
                <div className={`text-${config.color}-700`}>
                  <span className="font-medium">Scheduled for:</span>{" "}
                  {new Date(deleteRequest.scheduledFor).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmationDialog = () => {
    if (!selectedConfig) return null;

    return (
      <div className="bg-white border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <span className="text-red-500 text-2xl mr-3">⚠️</span>
          <div>
            <h3 className="text-lg font-semibold text-red-900">
              Confirm {selectedConfig.title}
            </h3>
            <p className="text-red-700 mt-1">
              Please review the consequences carefully before proceeding.
            </p>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-red-800 mb-2">This action will:</h4>
          <ul className="space-y-1 text-red-700">
            {selectedConfig.consequences.map((consequence, index) => (
              <li key={index}>• {consequence}</li>
            ))}
          </ul>
        </div>

        {!selectedConfig.reversible && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "DELETE MY DATA" to confirm this irreversible action:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="DELETE MY DATA"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowConfirmation(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDeletion}
            disabled={!canConfirm || isRequesting}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isRequesting ? "Processing..." : `Confirm ${selectedConfig.title}`}
          </button>
        </div>
      </div>
    );
  };

  const renderDeletionHistory = () => {
    if (deletionHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No previous deletion requests</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {deletionHistory.map((deleteRequest) => (
          <div
            key={deleteRequest.requestId}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      deleteRequest.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : deleteRequest.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {DELETION_STATUS_CONFIG[deleteRequest.status].label}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {deleteRequest.requestId}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Requested:{" "}
                  {new Date(deleteRequest.createdAt).toLocaleString()}
                </p>
                {deleteRequest.scheduledFor && (
                  <p className="text-xs text-gray-500">
                    Scheduled:{" "}
                    {new Date(deleteRequest.scheduledFor).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Don't show deletion options if there's an active request
  const hasActiveDeletion =
    activeDeletion &&
    (activeDeletion.status === "pending" ||
      activeDeletion.status === "processing");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Deletion</h2>
        <p className="text-gray-600 mt-1">
          Request deletion of your personal data (Right to Erasure)
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Deletion Request Failed
              </h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
              <button
                onClick={() => clearError()}
                className="text-red-800 hover:text-red-900 font-medium underline text-sm mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Deletion Status */}
      {activeDeletion && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Deletion Request
          </h3>
          {renderDeletionStatus(activeDeletion)}
        </div>
      )}

      {/* Deletion Options */}
      {!hasActiveDeletion && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Choose Deletion Type
          </h3>
          <div className="space-y-4">
            {DELETION_OPTIONS.map(renderDeletionOption)}
          </div>
        </div>
      )}

      {/* Reason Input */}
      {selectedOption && !hasActiveDeletion && !showConfirmation && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Reason for Deletion
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please explain why you want to delete your data (minimum 10
              characters):
            </label>
            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., I no longer use the service, privacy concerns, switching to another platform..."
            />
            <div className="text-sm text-gray-500 mt-1">
              {deletionReason.length}/10 characters minimum
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleProceedToConfirmation}
              disabled={!canProceed}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Proceed to Confirmation
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && renderConfirmationDialog()}

      {/* Deletion History */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Deletion History
        </h3>
        {renderDeletionHistory()}
      </div>

      {/* Legal Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-gray-500 text-lg mr-3">ℹ️</span>
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-1">Your Right to Erasure</h4>
            <ul className="space-y-1">
              <li>
                • You have the right to request deletion of your personal data
              </li>
              <li>
                • Deletion requests are processed within 30 days as required by
                GDPR
              </li>
              <li>
                • Some data may be retained for legal compliance or legitimate
                interests
              </li>
              <li>
                • Anonymized data may be retained for research and service
                improvement
              </li>
              <li>
                • You can cancel pending requests before processing begins
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataDeletionManager;
