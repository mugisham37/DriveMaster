"use client";

/**
 * GDPR Dashboard Component - Privacy Controls and Compliance Overview
 *
 * Implements:
 * - Comprehensive privacy controls interface
 * - Data export and deletion request management
 * - Consent preferences management
 * - Privacy report visualization
 * - Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React, { useState, useEffect } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import { ConsentManagement } from "./ConsentManagement";
import { DataExportManager } from "./DataExportManager";
import { DataDeletionManager } from "./DataDeletionManager";
import { PrivacyReportViewer } from "./PrivacyReportViewer";
import { UserRightsManager } from "./UserRightsManager";
import { PrivacyAlerts } from "./PrivacyAlerts";
import type { ConsentPreferences } from "@/types/user-service";
import type { PrivacyAlert } from "@/contexts/GDPRContext";

// ============================================================================
// Component Props
// ============================================================================

export interface GDPRDashboardProps {
  className?: string;
  showAdvancedOptions?: boolean;
  onConsentUpdate?: (consent: ConsentPreferences) => void;
  onDataExportRequest?: () => void;
  onDataDeletionRequest?: () => void;
}

// ============================================================================
// Dashboard Sections
// ============================================================================

type DashboardSection =
  | "overview"
  | "consent"
  | "data-export"
  | "data-deletion"
  | "privacy-report"
  | "user-rights"
  | "alerts";

interface SectionConfig {
  id: DashboardSection;
  title: string;
  description: string;
  icon: string;
  priority: "high" | "medium" | "low";
  requiresAction?: boolean;
}

const DASHBOARD_SECTIONS: SectionConfig[] = [
  {
    id: "overview",
    title: "Privacy Overview",
    description: "Your privacy status and compliance summary",
    icon: "🛡️",
    priority: "high",
  },
  {
    id: "consent",
    title: "Consent Management",
    description: "Manage your data processing consents",
    icon: "✅",
    priority: "high",
  },
  {
    id: "data-export",
    title: "Data Export",
    description: "Download your personal data",
    icon: "📥",
    priority: "medium",
  },
  {
    id: "data-deletion",
    title: "Data Deletion",
    description: "Request deletion of your data",
    icon: "🗑️",
    priority: "low",
  },
  {
    id: "privacy-report",
    title: "Privacy Report",
    description: "Detailed privacy and compliance report",
    icon: "📊",
    priority: "medium",
  },
  {
    id: "user-rights",
    title: "Your Rights",
    description: "Exercise your privacy rights",
    icon: "⚖️",
    priority: "medium",
  },
  {
    id: "alerts",
    title: "Privacy Alerts",
    description: "Important privacy notifications",
    icon: "🔔",
    priority: "high",
    requiresAction: true,
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function GDPRDashboard({
  className = "",
  showAdvancedOptions = false,
  onConsentUpdate,
  onDataExportRequest,
  onDataDeletionRequest,
}: GDPRDashboardProps) {
  const {
    consentPreferences,
    privacyReport,
    complianceStatus,
    isLoading,
    error,
    fetchConsentPreferences,
    generatePrivacyReport,
    getPrivacyAlerts,
    runComplianceCheck,
    clearError,
  } = useGDPR();

  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [privacyAlerts, setPrivacyAlerts] = useState<PrivacyAlert[]>([]);
  // ============================================================================
  // Effects
  // ============================================================================

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchConsentPreferences(), generatePrivacyReport()]);

        const alerts = getPrivacyAlerts();
        setPrivacyAlerts(alerts);

        await runComplianceCheck();
      } catch (error) {
        console.warn("Failed to load GDPR dashboard data:", error);
      }
    };

    loadInitialData();
  }, [
    fetchConsentPreferences,
    generatePrivacyReport,
    getPrivacyAlerts,
    runComplianceCheck,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    clearError();
  };

  const handleConsentUpdate = (consent: ConsentPreferences) => {
    onConsentUpdate?.(consent);
  };

  const handleDataExportRequest = () => {
    onDataExportRequest?.();
  };

  const handleDataDeletionRequest = () => {
    onDataDeletionRequest?.();
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const unacknowledgedAlerts = privacyAlerts.filter(
    (alert) => !alert.acknowledged,
  );
  const criticalAlerts = unacknowledgedAlerts.filter(
    (alert) => alert.severity === "high" || alert.severity === "critical",
  );

  const complianceScore =
    complianceStatus?.overall === "compliant"
      ? 100
      : complianceStatus?.overall === "partial"
        ? 75
        : 50;

  const sectionsWithAlerts = DASHBOARD_SECTIONS.map((section) => ({
    ...section,
    hasAlert: section.id === "alerts" && unacknowledgedAlerts.length > 0,
    alertCount: section.id === "alerts" ? unacknowledgedAlerts.length : 0,
  }));

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderOverviewSection = () => (
    <div className="space-y-6">
      {/* Compliance Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Privacy Compliance Status
        </h3>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Compliance Score</span>
              <span>{complianceScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  complianceScore >= 90
                    ? "bg-green-500"
                    : complianceScore >= 75
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              complianceStatus?.overall === "compliant"
                ? "bg-green-100 text-green-800"
                : complianceStatus?.overall === "partial"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {complianceStatus?.overall === "compliant"
              ? "Compliant"
              : complianceStatus?.overall === "partial"
                ? "Partially Compliant"
                : "Non-Compliant"}
          </div>
        </div>

        {complianceStatus?.issues && complianceStatus.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Issues to Address:
            </h4>
            <ul className="space-y-1">
              {complianceStatus.issues.map((issue, index) => (
                <li
                  key={index}
                  className="text-sm text-red-600 flex items-start"
                >
                  <span className="text-red-500 mr-2">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm">✅</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Active Consents
              </p>
              <p className="text-lg font-semibold text-blue-600">
                {consentPreferences
                  ? Object.values(consentPreferences).filter(Boolean).length
                  : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-sm">🔔</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Privacy Alerts
              </p>
              <p className="text-lg font-semibold text-yellow-600">
                {unacknowledgedAlerts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Data Categories
              </p>
              <p className="text-lg font-semibold text-green-600">
                {privacyReport?.dataCategories?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Critical Privacy Alerts
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You have {criticalAlerts.length} critical privacy alert
                  {criticalAlerts.length !== 1 ? "s" : ""} that require
                  immediate attention.
                </p>
                <button
                  onClick={() => setActiveSection("alerts")}
                  className="mt-2 text-red-800 hover:text-red-900 font-medium underline"
                >
                  View Alerts →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();

      case "consent":
        return (
          <ConsentManagement
            consentPreferences={consentPreferences}
            onConsentUpdate={handleConsentUpdate}
            showAdvancedOptions={showAdvancedOptions}
          />
        );

      case "data-export":
        return <DataExportManager onExportRequest={handleDataExportRequest} />;

      case "data-deletion":
        return (
          <DataDeletionManager onDeletionRequest={handleDataDeletionRequest} />
        );

      case "privacy-report":
        return <PrivacyReportViewer privacyReport={privacyReport} />;

      case "user-rights":
        return <UserRightsManager />;

      case "alerts":
        return <PrivacyAlerts alerts={privacyAlerts} />;

      default:
        return renderOverviewSection();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-red-500 text-xl">❌</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to Load Privacy Dashboard
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.message}</p>
              <button
                onClick={() => {
                  clearError();
                  window.location.reload();
                }}
                className="mt-2 text-red-800 hover:text-red-900 font-medium underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Privacy & Data Protection
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your privacy settings, data rights, and compliance status
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-2">
            {sectionsWithAlerts.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-900 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{section.icon}</span>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {section.description}
                      </div>
                    </div>
                  </div>
                  {section.hasAlert && (
                    <div className="flex items-center">
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {section.alertCount}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                Loading privacy data...
              </span>
            </div>
          ) : (
            renderActiveSection()
          )}
        </div>
      </div>
    </div>
  );
}

export default GDPRDashboard;
