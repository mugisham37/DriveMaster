"use client";

/**
 * Privacy Alerts Component - Privacy Notifications and Incident Management
 *
 * Implements:
 * - Privacy alert display and management
 * - Incident reporting and handling
 * - Alert acknowledgment and tracking
 * - Priority-based alert categorization
 * - Requirements: 5.4, 8.4, 8.5
 */

import React, { useState } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import type { PrivacyAlert, PrivacyIncident } from "@/contexts/GDPRContext";

// ============================================================================
// Component Props
// ============================================================================

export interface PrivacyAlertsProps {
  alerts: PrivacyAlert[];
  className?: string;
}

// ============================================================================
// Alert Configuration
// ============================================================================

const ALERT_CONFIG = {
  consent_expiry: {
    title: "Consent Expiry",
    icon: "⏰",
    defaultMessage: "Some of your consent preferences are expiring soon",
  },
  data_breach: {
    title: "Data Breach Notification",
    icon: "🚨",
    defaultMessage: "We have detected a potential data security incident",
  },
  policy_update: {
    title: "Privacy Policy Update",
    icon: "📋",
    defaultMessage: "Our privacy policy has been updated",
  },
  rights_request: {
    title: "Rights Request Update",
    icon: "⚖️",
    defaultMessage: "There is an update on your privacy rights request",
  },
} as const;

const SEVERITY_CONFIG = {
  low: {
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    icon: "ℹ️",
  },
  medium: {
    color: "yellow",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-800",
    icon: "⚠️",
  },
  high: {
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-800",
    icon: "🔶",
  },
  critical: {
    color: "red",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    icon: "🚨",
  },
} as const;

// ============================================================================
// Main Component
// ============================================================================

export function PrivacyAlerts({ alerts, className = "" }: PrivacyAlertsProps) {
  const {
    acknowledgePrivacyAlert,
    reportPrivacyIncident,
    isUpdating,
    error,
    clearError,
  } = useGDPR();

  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentData, setIncidentData] = useState<Partial<PrivacyIncident>>({
    type: "policy_violation",
    severity: "medium",
    description: "",
    affectedData: [],
    discoveredAt: new Date(),
    reportedBy: "user",
    details: {},
  });
  const [filterSeverity, setFilterSeverity] = useState<
    PrivacyAlert["severity"] | "all"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "severity">("date");

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgePrivacyAlert(alertId);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const handleReportIncident = async () => {
    if (!incidentData.description?.trim()) return;

    try {
      await reportPrivacyIncident(incidentData as PrivacyIncident);

      // Reset form
      setIncidentData({
        type: "policy_violation",
        severity: "medium",
        description: "",
        affectedData: [],
        discoveredAt: new Date(),
        reportedBy: "user",
        details: {},
      });
      setShowIncidentForm(false);
    } catch (error) {
      console.error("Failed to report incident:", error);
    }
  };

  const handleIncidentDataChange = (
    field: keyof PrivacyIncident,
    value: string | string[] | Date,
  ) => {
    setIncidentData((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === "all") return true;
    return alert.severity === filterSeverity;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "severity") {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledged);
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical" && !alert.acknowledged,
  );
  const expiredAlerts = alerts.filter(
    (alert) => alert.expiresAt && new Date() > new Date(alert.expiresAt),
  );

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderAlert = (alert: PrivacyAlert) => {
    const severityConfig = SEVERITY_CONFIG[alert.severity];
    const alertConfig = ALERT_CONFIG[alert.type];
    const isExpired = alert.expiresAt && new Date() > new Date(alert.expiresAt);

    return (
      <div
        key={alert.id}
        className={`${severityConfig.bgColor} ${severityConfig.borderColor} border rounded-lg p-6 ${
          alert.acknowledged ? "opacity-75" : ""
        }`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl mr-3">{alertConfig.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <h3 className={`font-semibold ${severityConfig.textColor}`}>
                  {alert.title}
                </h3>
                <span
                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${severityConfig.color}-100 text-${severityConfig.color}-800`}
                >
                  {alert.severity}
                </span>
                {alert.actionRequired && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Action Required
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {alert.actionUrl && (
                  <a
                    href={alert.actionUrl}
                    className={`text-${severityConfig.color}-700 hover:text-${severityConfig.color}-800 text-sm font-medium`}
                  >
                    Take Action →
                  </a>
                )}
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    disabled={isUpdating}
                    className={`bg-${severityConfig.color}-600 text-white px-3 py-1 rounded text-sm hover:bg-${severityConfig.color}-700 disabled:opacity-50`}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>

            <p className={`${severityConfig.textColor} mb-3`}>
              {alert.message}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className={`${severityConfig.textColor} opacity-75`}>
                <span>
                  Created: {new Date(alert.createdAt).toLocaleString()}
                </span>
                {alert.expiresAt && (
                  <span className="ml-4">
                    {isExpired ? "Expired:" : "Expires:"}{" "}
                    {new Date(alert.expiresAt).toLocaleString()}
                  </span>
                )}
              </div>

              {alert.acknowledged && (
                <span className="text-green-600 text-sm font-medium">
                  ✓ Acknowledged
                </span>
              )}
            </div>

            {isExpired && (
              <div className="mt-3 p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600">
                This alert has expired and may no longer be relevant.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIncidentForm = () => (
    <div className="bg-white border-2 border-red-200 rounded-lg p-6">
      <div className="flex items-start mb-4">
        <span className="text-red-500 text-2xl mr-3">🚨</span>
        <div>
          <h3 className="text-lg font-semibold text-red-900">
            Report Privacy Incident
          </h3>
          <p className="text-red-700 mt-1">
            Report any privacy concerns or potential data security incidents
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Type
            </label>
            <select
              value={incidentData.type}
              onChange={(e) => handleIncidentDataChange("type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="data_breach">Data Breach</option>
              <option value="unauthorized_access">Unauthorized Access</option>
              <option value="data_loss">Data Loss</option>
              <option value="policy_violation">Policy Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={incidentData.severity}
              onChange={(e) =>
                handleIncidentDataChange("severity", e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={incidentData.description}
            onChange={(e) =>
              handleIncidentDataChange("description", e.target.value)
            }
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Describe the privacy incident in detail..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Affected Data Types (comma-separated)
          </label>
          <input
            type="text"
            value={incidentData.affectedData?.join(", ")}
            onChange={(e) =>
              handleIncidentDataChange(
                "affectedData",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="e.g., email addresses, profile data, activity logs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setShowIncidentForm(false)}
          className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleReportIncident}
          disabled={!incidentData.description?.trim() || isUpdating}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isUpdating ? "Reporting..." : "Report Incident"}
        </button>
      </div>
    </div>
  );

  const renderAlertStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm">📢</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Total Alerts</p>
            <p className="text-lg font-semibold text-blue-600">
              {alerts.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-sm">⚠️</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Unacknowledged</p>
            <p className="text-lg font-semibold text-yellow-600">
              {unacknowledgedAlerts.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-sm">🚨</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Critical</p>
            <p className="text-lg font-semibold text-red-600">
              {criticalAlerts.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">⏰</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Expired</p>
            <p className="text-lg font-semibold text-gray-600">
              {expiredAlerts.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Privacy Alerts</h2>
          <p className="text-gray-600 mt-1">
            Important privacy notifications and security updates
          </p>
        </div>

        <button
          onClick={() => setShowIncidentForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Report Incident
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to Process Alert
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

      {/* Incident Reporting Form */}
      {showIncidentForm && renderIncidentForm()}

      {/* Alert Statistics */}
      {!showIncidentForm && renderAlertStats()}

      {/* Filters and Controls */}
      {!showIncidentForm && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Filter by severity:
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as "all" | "critical" | "high" | "medium" | "low")}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "severity")}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="date">Date</option>
                <option value="severity">Severity</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {sortedAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      )}

      {/* Alerts List */}
      {!showIncidentForm && (
        <div className="space-y-4">
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🔔</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filterSeverity === "all"
                  ? "No Privacy Alerts"
                  : `No ${filterSeverity} alerts`}
              </h3>
              <p className="text-gray-600">
                {filterSeverity === "all"
                  ? "You have no privacy alerts at this time."
                  : `You have no ${filterSeverity} severity alerts.`}
              </p>
            </div>
          ) : (
            sortedAlerts.map(renderAlert)
          )}
        </div>
      )}

      {/* Information */}
      {!showIncidentForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-gray-500 text-lg mr-3">ℹ️</span>
            <div className="text-sm text-gray-700">
              <h4 className="font-medium mb-1">About Privacy Alerts</h4>
              <ul className="space-y-1">
                <li>• Critical alerts require immediate attention</li>
                <li>• Acknowledge alerts to mark them as read</li>
                <li>• Some alerts may expire after a certain time</li>
                <li>• Report any privacy concerns using the incident form</li>
                <li>• We are committed to transparency about data security</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrivacyAlerts;
