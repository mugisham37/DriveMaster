"use client";

/**
 * Privacy Report Viewer Component - Comprehensive Privacy Analysis
 *
 * Implements:
 * - Privacy report generation and visualization
 * - Data usage tracking and reporting
 * - Compliance status monitoring and alerting
 * - Third-party sharing transparency
 * - Requirements: 5.4, 5.5, 8.4, 8.5
 */

import React, { useState } from "react";
import { useGDPR } from "@/contexts/GDPRContext";
import type {
  PrivacyReport,
  DataCategoryReport,
  ProcessingActivity,
  ThirdPartySharing,
  RetentionPolicy,
  ComplianceStatus,
} from "@/types/user-service";

// ============================================================================
// Component Props
// ============================================================================

export interface PrivacyReportViewerProps {
  privacyReport: PrivacyReport | null;
  className?: string;
}

// ============================================================================
// Report Section Types
// ============================================================================

type ReportSection =
  | "overview"
  | "data-categories"
  | "processing-activities"
  | "third-party-sharing"
  | "retention-policies"
  | "compliance-status";

// ============================================================================
// Main Component
// ============================================================================

export function PrivacyReportViewer({
  privacyReport,
  className = "",
}: PrivacyReportViewerProps) {
  const { generatePrivacyReport, isLoading, error, clearError } = useGDPR();

  const [activeSection, setActiveSection] = useState<ReportSection>("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      clearError();
      await generatePrivacyReport();
    } catch (error) {
      console.error("Failed to generate privacy report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSectionChange = (section: ReportSection) => {
    setActiveSection(section);
  };

  const handleExportReport = () => {
    if (!privacyReport) return;

    const reportData = {
      ...privacyReport,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `privacy-report-${privacyReport.userId}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderOverviewSection = () => {
    if (!privacyReport) return null;

    const totalDataCategories = privacyReport.dataCategories.length;
    const totalProcessingActivities = privacyReport.processingActivities.length;
    const totalThirdParties = privacyReport.thirdPartySharing.length;
    const complianceScore =
      privacyReport.complianceStatus.overall === "compliant"
        ? 100
        : privacyReport.complianceStatus.overall === "partial"
          ? 75
          : 50;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📊</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Data Categories
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {totalDataCategories}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm">⚙️</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Processing Activities
                </p>
                <p className="text-lg font-semibold text-green-600">
                  {totalProcessingActivities}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-sm">🤝</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Third Parties
                </p>
                <p className="text-lg font-semibold text-yellow-600">
                  {totalThirdParties}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    complianceScore >= 90
                      ? "bg-green-100"
                      : complianceScore >= 75
                        ? "bg-yellow-100"
                        : "bg-red-100"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      complianceScore >= 90
                        ? "text-green-600"
                        : complianceScore >= 75
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Compliance</p>
                <p
                  className={`text-lg font-semibold ${
                    complianceScore >= 90
                      ? "text-green-600"
                      : complianceScore >= 75
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {complianceScore}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Report Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">User ID:</span>
              <span className="ml-2 text-gray-600">{privacyReport.userId}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Generated:</span>
              <span className="ml-2 text-gray-600">
                {new Date(privacyReport.generatedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Report Version:</span>
              <span className="ml-2 text-gray-600">1.0</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Compliance Framework:
              </span>
              <span className="ml-2 text-gray-600">GDPR</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { id: "data-categories", label: "Data Categories", icon: "📊" },
              { id: "processing-activities", label: "Processing", icon: "⚙️" },
              { id: "third-party-sharing", label: "Third Parties", icon: "🤝" },
              { id: "retention-policies", label: "Retention", icon: "📅" },
              { id: "compliance-status", label: "Compliance", icon: "✓" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id as ReportSection)}
                className="flex items-center p-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDataCategoriesSection = () => {
    if (!privacyReport?.dataCategories) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Data Categories</h3>
        <p className="text-gray-600">
          Overview of the types of personal data we collect and process about
          you.
        </p>

        {privacyReport.dataCategories.map((category, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                {category.category}
              </h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {category.dataTypes.length} data types
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Purpose:
                </span>
                <p className="text-sm text-gray-600 mt-1">{category.purpose}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Legal Basis:
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {category.legalBasis}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Retention:
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {category.retention}
                </p>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">
                Data Types:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {category.dataTypes.map((dataType, typeIndex) => (
                  <span
                    key={typeIndex}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {dataType}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProcessingActivitiesSection = () => {
    if (!privacyReport?.processingActivities) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Processing Activities
        </h3>
        <p className="text-gray-600">
          Details about how we process your personal data and for what purposes.
        </p>

        {privacyReport.processingActivities.map((activity, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {activity.activity}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Purpose:
                </span>
                <p className="text-sm text-gray-600 mt-1">{activity.purpose}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Legal Basis:
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {activity.legalBasis}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Data Types:
                </span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {activity.dataTypes.map((dataType, typeIndex) => (
                    <span
                      key={typeIndex}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {dataType}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Recipients:
                </span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {activity.recipients.map((recipient, recipientIndex) => (
                    <span
                      key={recipientIndex}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                    >
                      {recipient}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderThirdPartySharingSection = () => {
    if (!privacyReport?.thirdPartySharing) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Third-Party Data Sharing
        </h3>
        <p className="text-gray-600">
          Information about how your data is shared with third parties.
        </p>

        {privacyReport.thirdPartySharing.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <span className="text-green-600 text-4xl mb-4 block">✅</span>
            <h4 className="text-lg font-medium text-green-900 mb-2">
              No Third-Party Sharing
            </h4>
            <p className="text-green-700">
              Your personal data is not currently shared with any third parties.
            </p>
          </div>
        ) : (
          privacyReport.thirdPartySharing.map((sharing, index) => (
            <div key={index} className="bg-white border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  {sharing.recipient}
                </h4>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Third Party
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Purpose:
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {sharing.purpose}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Legal Basis:
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {sharing.legalBasis}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Data Types:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sharing.dataTypes.map((dataType, typeIndex) => (
                      <span
                        key={typeIndex}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800"
                      >
                        {dataType}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Safeguards:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sharing.safeguards.map((safeguard, safeguardIndex) => (
                      <span
                        key={safeguardIndex}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                      >
                        {safeguard}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRetentionPoliciesSection = () => {
    if (!privacyReport?.retentionPolicies) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Data Retention Policies
        </h3>
        <p className="text-gray-600">
          How long we keep different types of your personal data.
        </p>

        {privacyReport.retentionPolicies.map((policy, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                {policy.dataType}
              </h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {policy.retentionPeriod}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Deletion Method:</span>{" "}
              {policy.deletionMethod}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderComplianceStatusSection = () => {
    if (!privacyReport?.complianceStatus) return null;

    const status = privacyReport.complianceStatus;
    const statusColor =
      status.overall === "compliant"
        ? "green"
        : status.overall === "partial"
          ? "yellow"
          : "red";

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Compliance Status
        </h3>
        <p className="text-gray-600">
          Assessment of our compliance with data protection regulations.
        </p>

        <div
          className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-6`}
        >
          <div className="flex items-center mb-4">
            <span
              className={`text-2xl mr-3 ${
                status.overall === "compliant"
                  ? "✅"
                  : status.overall === "partial"
                    ? "⚠️"
                    : "❌"
              }`}
            ></span>
            <div>
              <h4 className={`text-lg font-semibold text-${statusColor}-900`}>
                {status.overall === "compliant"
                  ? "Fully Compliant"
                  : status.overall === "partial"
                    ? "Partially Compliant"
                    : "Non-Compliant"}
              </h4>
              <p className={`text-${statusColor}-700`}>
                Overall compliance with GDPR requirements
              </p>
            </div>
          </div>

          {status.issues.length > 0 && (
            <div className="mb-4">
              <h5 className={`font-medium text-${statusColor}-800 mb-2`}>
                Issues:
              </h5>
              <ul className={`space-y-1 text-${statusColor}-700`}>
                {status.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.recommendations.length > 0 && (
            <div>
              <h5 className={`font-medium text-${statusColor}-800 mb-2`}>
                Recommendations:
              </h5>
              <ul className={`space-y-1 text-${statusColor}-700`}>
                {status.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "data-categories":
        return renderDataCategoriesSection();
      case "processing-activities":
        return renderProcessingActivitiesSection();
      case "third-party-sharing":
        return renderThirdPartySharingSection();
      case "retention-policies":
        return renderRetentionPoliciesSection();
      case "compliance-status":
        return renderComplianceStatusSection();
      default:
        return renderOverviewSection();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!privacyReport) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Privacy Report</h2>
          <p className="text-gray-600 mt-1">
            Generate a comprehensive report about your data and privacy
          </p>
        </div>

        <div className="bg-white border rounded-lg p-8 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Privacy Report Available
          </h3>
          <p className="text-gray-600 mb-6">
            Generate a comprehensive privacy report to see how your data is
            processed and protected.
          </p>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isGenerating ? "Generating Report..." : "Generate Privacy Report"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Privacy Report</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive overview of your data and privacy
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportReport}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Export Report
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isGenerating ? "Updating..." : "Update Report"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to Generate Report
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Section Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-2">
            {[
              { id: "overview", label: "Overview", icon: "📋" },
              { id: "data-categories", label: "Data Categories", icon: "📊" },
              {
                id: "processing-activities",
                label: "Processing Activities",
                icon: "⚙️",
              },
              {
                id: "third-party-sharing",
                label: "Third-Party Sharing",
                icon: "🤝",
              },
              {
                id: "retention-policies",
                label: "Retention Policies",
                icon: "📅",
              },
              {
                id: "compliance-status",
                label: "Compliance Status",
                icon: "✓",
              },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id as ReportSection)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-900 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-lg">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {isLoading || isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {isGenerating
                  ? "Generating privacy report..."
                  : "Loading report..."}
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

export default PrivacyReportViewer;
