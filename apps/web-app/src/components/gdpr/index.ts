/**
 * GDPR Components Export Index
 *
 * Centralized exports for all GDPR compliance and privacy components
 */

export { default as GDPRDashboard } from "./GDPRDashboard";
export { default as ConsentManagement } from "./ConsentManagement";
export { default as DataExportManager } from "./DataExportManager";
export { default as DataDeletionManager } from "./DataDeletionManager";
export { default as PrivacyReportViewer } from "./PrivacyReportViewer";
export { default as UserRightsManager } from "./UserRightsManager";
export { default as PrivacyAlerts } from "./PrivacyAlerts";
export { AuditLogViewer } from "./AuditLogViewer";

// Re-export types for convenience
export type { GDPRDashboardProps } from "./GDPRDashboard";
export type { ConsentManagementProps } from "./ConsentManagement";
export type { DataExportManagerProps } from "./DataExportManager";
export type { DataDeletionManagerProps } from "./DataDeletionManager";
export type { PrivacyReportViewerProps } from "./PrivacyReportViewer";
export type { UserRightsManagerProps } from "./UserRightsManager";
export type { PrivacyAlertsProps } from "./PrivacyAlerts";
export type { AuditLogViewerProps } from "./AuditLogViewer";
