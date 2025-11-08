"use client";

/**
 * Data Export Manager Component - GDPR Data Export Functionality
 *
 * Implements:
 * - Data export request handling with progress monitoring
 * - Export status tracking and notifications
 * - Download management and file handling
 * - Export history and request management
 * - Requirements: 5.1, 5.2
 */

import React, { useState, useEffect } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import type { GDPRExportResponse } from "@/types/user-service";

// ============================================================================
// Component Props
// ============================================================================

export interface DataExportManagerProps {
  onExportRequest?: () => void;
  className?: string;
}

// ============================================================================
// Export Status Configuration
// ============================================================================

const EXPORT_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    description: "Your export request is queued for processing",
    color: "yellow",
    icon: "⏳",
  },
  processing: {
    label: "Processing",
    description: "We are preparing your data export",
    color: "blue",
    icon: "⚙️",
  },
  completed: {
    label: "Ready for Download",
    description: "Your data export is ready",
    color: "green",
    icon: "✅",
  },
  failed: {
    label: "Failed",
    description: "Export failed - please try again",
    color: "red",
    icon: "❌",
  },
} as const;

// ============================================================================
// Main Component
// ============================================================================

export function DataExportManager({
  onExportRequest,
  className = "",
}: DataExportManagerProps) {
  const {
    state,
    requestDataExport,
    checkExportStatus,
    downloadExportData,
    trackDataUsage,
    isLoading,
    error,
    clearError,
  } = useGDPR();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [showExportInfo, setShowExportInfo] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-check status for active exports
  useEffect(() => {
    const activeExport = state.activeExportRequest;

    if (
      activeExport &&
      (activeExport.status === "pending" ||
        activeExport.status === "processing")
    ) {
      const interval = setInterval(async () => {
        try {
          await checkExportStatus(activeExport.requestId);
        } catch (error) {
          console.warn("Failed to check export status:", error);
        }
      }, 10000); // Check every 10 seconds

      setStatusCheckInterval(interval);

      return () => {
        clearInterval(interval);
        setStatusCheckInterval(null);
      };
    } else if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [state.activeExportRequest, checkExportStatus]);

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

  const handleExportRequest = async () => {
    try {
      setIsRequesting(true);
      clearError();

      const exportResponse = await requestDataExport();

      // Track the export request
      await trackDataUsage("data_export_requested", "user_data", {
        requestId: exportResponse.requestId,
        timestamp: new Date().toISOString(),
      });

      onExportRequest?.();
    } catch (error) {
      console.error("Failed to request data export:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDownload = async (requestId: string) => {
    try {
      setIsDownloading(true);
      clearError();

      const downloadUrl = await downloadExportData(requestId);

      // Create download link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `personal-data-export-${requestId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track the download
      await trackDataUsage("data_export_downloaded", "user_data", {
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to download export:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStatusRefresh = async (requestId: string) => {
    try {
      await checkExportStatus(requestId);
    } catch (error) {
      console.error("Failed to refresh export status:", error);
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const activeExport = state.activeExportRequest;
  const exportHistory = Array.from(state.exportRequests.values())
    .filter((req) => req.requestId !== activeExport?.requestId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const canRequestExport =
    !activeExport ||
    activeExport.status === "completed" ||
    activeExport.status === "failed";

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderExportStatus = (exportRequest: GDPRExportResponse) => {
    const config = EXPORT_STATUS_CONFIG[exportRequest.status];
    const isExpired =
      exportRequest.expiresAt && new Date() > new Date(exportRequest.expiresAt);

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
                {(exportRequest.status === "pending" ||
                  exportRequest.status === "processing") && (
                  <button
                    onClick={() => handleStatusRefresh(exportRequest.requestId)}
                    className={`text-${config.color}-700 hover:text-${config.color}-800 text-sm font-medium`}
                  >
                    Refresh Status
                  </button>
                )}
                {exportRequest.status === "completed" && !isExpired && (
                  <button
                    onClick={() => handleDownload(exportRequest.requestId)}
                    disabled={isDownloading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isDownloading ? "Downloading..." : "Download"}
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
                {exportRequest.requestId}
              </div>
              <div className={`text-${config.color}-700`}>
                <span className="font-medium">Requested:</span>{" "}
                {new Date(exportRequest.createdAt).toLocaleString()}
              </div>
              {exportRequest.expiresAt && (
                <div className={`text-${config.color}-700`}>
                  <span className="font-medium">
                    {isExpired ? "Expired:" : "Expires:"}
                  </span>{" "}
                  {new Date(exportRequest.expiresAt).toLocaleString()}
                  {isExpired && (
                    <span className="ml-2 text-red-600 font-medium">
                      (Expired)
                    </span>
                  )}
                </div>
              )}
            </div>

            {isExpired && exportRequest.status === "completed" && (
              <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  This export has expired and is no longer available for
                  download. Please request a new export if you still need your
                  data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExportInfo = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        What's Included in Your Data Export?
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-blue-800 mb-2">
            Profile Information
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Account details and preferences</li>
            <li>• Profile settings and customizations</li>
            <li>• Contact information</li>
            <li>• Account creation and update history</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Learning Data</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Progress and achievement records</li>
            <li>• Skill mastery levels</li>
            <li>• Learning streaks and milestones</li>
            <li>• Course completion history</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Activity Records</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Session logs and timestamps</li>
            <li>• Exercise attempts and results</li>
            <li>• Engagement metrics</li>
            <li>• Usage patterns and analytics</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Privacy & Consent</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Consent preferences and history</li>
            <li>• Privacy settings</li>
            <li>• Data retention preferences</li>
            <li>• Communication preferences</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-100 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">
          Export Format & Security
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Data is provided in JSON format for easy processing</li>
          <li>• Files are compressed in a password-protected ZIP archive</li>
          <li>• Download links expire after 7 days for security</li>
          <li>• All exports are logged for audit purposes</li>
        </ul>
      </div>
    </div>
  );

  const renderExportHistory = () => {
    if (exportHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No previous export requests</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {exportHistory.map((exportRequest) => (
          <div
            key={exportRequest.requestId}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      exportRequest.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : exportRequest.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {EXPORT_STATUS_CONFIG[exportRequest.status].label}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {exportRequest.requestId}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Requested:{" "}
                  {new Date(exportRequest.createdAt).toLocaleString()}
                </p>
                {exportRequest.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Expires:{" "}
                    {new Date(exportRequest.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>

              {exportRequest.status === "completed" &&
                exportRequest.expiresAt &&
                new Date() < new Date(exportRequest.expiresAt) && (
                  <button
                    onClick={() => handleDownload(exportRequest.requestId)}
                    disabled={isDownloading}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Download
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Export</h2>
        <p className="text-gray-600 mt-1">
          Download a copy of all your personal data
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Export Request Failed
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

      {/* Active Export Status */}
      {activeExport && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Export Request
          </h3>
          {renderExportStatus(activeExport)}
        </div>
      )}

      {/* Export Request Section */}
      {canRequestExport && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Request Data Export
              </h3>
              <p className="text-gray-600 mb-4">
                Get a complete copy of all your personal data stored in our
                system. This includes your profile, learning progress, activity
                history, and privacy settings.
              </p>

              <button
                onClick={() => setShowExportInfo(!showExportInfo)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
              >
                {showExportInfo ? "Hide" : "Show"} what's included →
              </button>
            </div>

            <button
              onClick={handleExportRequest}
              disabled={isRequesting || isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isRequesting ? "Requesting..." : "Request Export"}
            </button>
          </div>
        </div>
      )}

      {/* Export Information */}
      {showExportInfo && renderExportInfo()}

      {/* Export History */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Export History
        </h3>
        {renderExportHistory()}
      </div>

      {/* Legal Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-gray-500 text-lg mr-3">ℹ️</span>
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-1">Important Information</h4>
            <ul className="space-y-1">
              <li>
                • Export requests are processed within 30 days as required by
                GDPR
              </li>
              <li>• Download links are valid for 7 days after completion</li>
              <li>• You can request a new export at any time</li>
              <li>
                • All export requests are logged for security and compliance
              </li>
              <li>
                • Exported data includes all information we have about you at
                the time of export
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataExportManager;
