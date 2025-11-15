"use client";

/**
 * Audit Log Viewer Component - Privacy Action Tracking
 *
 * Implements:
 * - Display privacy-related actions chronologically
 * - Filter by action type and date range
 * - Pagination for large audit logs
 * - Export audit log functionality
 * - Requirements: 7.10
 */

import React, { useState, useEffect } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  actionType: AuditActionType;
  userId: string;
  details: Record<string, unknown>;
  outcome: "success" | "failure" | "pending";
  ipAddress?: string;
  userAgent?: string;
}

type AuditActionType =
  | "consent_granted"
  | "consent_withdrawn"
  | "data_export_requested"
  | "data_export_downloaded"
  | "data_deletion_requested"
  | "data_deletion_cancelled"
  | "privacy_report_generated"
  | "alert_acknowledged"
  | "incident_reported"
  | "preferences_updated"
  | "profile_updated";

// ============================================================================
// Component Props
// ============================================================================

export interface AuditLogViewerProps {
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ACTION_TYPE_CONFIG: Record<
  AuditActionType,
  { label: string; icon: string; color: string }
> = {
  consent_granted: {
    label: "Consent Granted",
    icon: "✅",
    color: "text-green-600",
  },
  consent_withdrawn: {
    label: "Consent Withdrawn",
    icon: "❌",
    color: "text-red-600",
  },
  data_export_requested: {
    label: "Data Export Requested",
    icon: "📥",
    color: "text-blue-600",
  },
  data_export_downloaded: {
    label: "Data Export Downloaded",
    icon: "⬇️",
    color: "text-blue-600",
  },
  data_deletion_requested: {
    label: "Data Deletion Requested",
    icon: "🗑️",
    color: "text-red-600",
  },
  data_deletion_cancelled: {
    label: "Data Deletion Cancelled",
    icon: "↩️",
    color: "text-yellow-600",
  },
  privacy_report_generated: {
    label: "Privacy Report Generated",
    icon: "📊",
    color: "text-purple-600",
  },
  alert_acknowledged: {
    label: "Alert Acknowledged",
    icon: "🔔",
    color: "text-gray-600",
  },
  incident_reported: {
    label: "Incident Reported",
    icon: "🚨",
    color: "text-red-600",
  },
  preferences_updated: {
    label: "Preferences Updated",
    icon: "⚙️",
    color: "text-gray-600",
  },
  profile_updated: {
    label: "Profile Updated",
    icon: "👤",
    color: "text-gray-600",
  },
};

const OUTCOME_CONFIG = {
  success: { label: "Success", color: "bg-green-100 text-green-800" },
  failure: { label: "Failed", color: "bg-red-100 text-red-800" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
};

// ============================================================================
// Main Component
// ============================================================================

export function AuditLogViewer({ className = "" }: AuditLogViewerProps) {
  const { getAuditLog, isLoading, error } = useGDPR();

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [filteredLog, setFilteredLog] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActionType, setFilterActionType] = useState<
    AuditActionType | "all"
  >("all");
  const [filterOutcome, setFilterOutcome] = useState<
    "all" | "success" | "failure" | "pending"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    loadAuditLog();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLog, searchQuery, filterActionType, filterOutcome]);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadAuditLog = async () => {
    try {
      const log = await getAuditLog();
      setAuditLog(log);
    } catch (error) {
      console.error("Failed to load audit log:", error);
    }
  };

  // ============================================================================
  // Filtering
  // ============================================================================

  const applyFilters = () => {
    let filtered = [...auditLog];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.action.toLowerCase().includes(query) ||
          entry.actionType.toLowerCase().includes(query) ||
          JSON.stringify(entry.details).toLowerCase().includes(query)
      );
    }

    // Action type filter
    if (filterActionType !== "all") {
      filtered = filtered.filter(
        (entry) => entry.actionType === filterActionType
      );
    }

    // Outcome filter
    if (filterOutcome !== "all") {
      filtered = filtered.filter((entry) => entry.outcome === filterOutcome);
    }

    setFilteredLog(filtered);
    setCurrentPage(1);
  };

  // ============================================================================
  // Pagination
  // ============================================================================

  const totalPages = Math.ceil(filteredLog.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredLog.slice(startIndex, endIndex);

  // ============================================================================
  // Export
  // ============================================================================

  const handleExportLog = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: filteredLog.length,
      entries: filteredLog,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split("T")[0]}.json`;
    if (document.body) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderAuditEntry = (entry: AuditLogEntry) => {
    const actionConfig = ACTION_TYPE_CONFIG[entry.actionType];
    const outcomeConfig = OUTCOME_CONFIG[entry.outcome];

    return (
      <div
        key={entry.id}
        className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <span className="text-2xl mr-3">{actionConfig.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium ${actionConfig.color}`}>
                  {actionConfig.label}
                </h4>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeConfig.color}`}
                >
                  {outcomeConfig.label}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2">{entry.action}</p>

              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  <span className="font-medium">Timestamp:</span>{" "}
                  {entry.timestamp.toLocaleString()}
                </div>
                {entry.ipAddress && (
                  <div>
                    <span className="font-medium">IP Address:</span>{" "}
                    {entry.ipAddress}
                  </div>
                )}
                {Object.keys(entry.details).length > 0 && (
                  <div>
                    <span className="font-medium">Details:</span>{" "}
                    {JSON.stringify(entry.details, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start">
          <span className="text-red-500 text-xl mr-3">❌</span>
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Failed to Load Audit Log
            </h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
            <button
              onClick={loadAuditLog}
              className="mt-2 text-red-800 hover:text-red-900 font-medium underline text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-gray-600 mt-1">
            Privacy-related actions and events
          </p>
        </div>

        <Button onClick={handleExportLog} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search audit log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Action Type Filter */}
          <div>
            <Label htmlFor="action-type">Action Type</Label>
            <Select
              value={filterActionType}
              onValueChange={(value) =>
                setFilterActionType(value as AuditActionType | "all")
              }
            >
              <SelectTrigger id="action-type">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Filter */}
          <div>
            <Label htmlFor="outcome">Outcome</Label>
            <Select
              value={filterOutcome}
              onValueChange={(value) =>
                setFilterOutcome(value as "all" | "success" | "failure" | "pending")
              }
            >
              <SelectTrigger id="outcome">
                <SelectValue placeholder="All outcomes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredLog.length)} of{" "}
            {filteredLog.length} entries
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterActionType("all");
              setFilterOutcome("all");
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Audit Log Entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit log...</span>
        </div>
      ) : currentEntries.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📋</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Audit Entries Found
          </h3>
          <p className="text-gray-600">
            {searchQuery || filterActionType !== "all" || filterOutcome !== "all"
              ? "Try adjusting your filters"
              : "No privacy-related actions have been logged yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">{currentEntries.map(renderAuditEntry)}</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-gray-500 text-lg mr-3">ℹ️</span>
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-1">About Audit Logs</h4>
            <ul className="space-y-1">
              <li>• All privacy-related actions are logged for transparency</li>
              <li>• Logs are retained for compliance and security purposes</li>
              <li>• You can export your audit log at any time</li>
              <li>• Logs include timestamps, IP addresses, and action details</li>
              <li>• This helps you track all changes to your privacy settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditLogViewer;
