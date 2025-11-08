/**
 * Content Service Components - Main Export File
 *
 * Exports React components for content service integration,
 * real-time collaboration, and WebSocket functionality.
 *
 * Requirements: 1.1, 3.1, 4.1, 5.1, 9.1, 9.2, 9.3, 9.4, 9.5
 */

// Content Management Components
export { ContentEditor } from "./content/content-editor";

export { ContentList, ContentListItem } from "./content/content-list";

export {
  ContentPreview,
  MediaAssetPreview,
  WorkflowHistory as ContentWorkflowHistory,
} from "./content/content-preview";

// Media Management Components
export { MediaUpload, FilePreview, UploadProgress } from "./media/media-upload";

export {
  MediaGallery,
  MediaAssetCard,
  MediaViewer,
} from "./media/media-gallery";

// Workflow Management Components
export {
  WorkflowStatus,
  StatusBadge,
  WorkflowActions,
} from "./workflow/workflow-status";

export { ReviewPanel } from "./workflow/review-panel";

export {
  WorkflowHistory,
  WorkflowTransitionCard,
} from "./workflow/workflow-history";

// Collaboration Components
export {
  PresenceIndicator,
  UserAvatar,
  PresenceStatusBadge,
  PresenceList,
  CompactPresenceIndicator,
} from "./collaboration/presence-indicator";

export {
  CollaborationCursor,
  RemoteCursor,
  RemoteSelection,
  CollaborationStatus,
  CollaborationToolbar,
} from "./collaboration/collaboration-cursor";

// Real-time Components
export {
  ContentSyncIndicator,
  SyncStatusBadge,
  ConflictResolutionModal,
  ConnectionStatusIndicator,
  RealTimeStatusBar,
} from "./real-time/content-sync-indicator";

// Component Types
export type {
  ContentEditorProps,
  ContentFormData,
} from "./content/content-editor";

export type {
  ContentListProps,
  ContentListItemProps,
} from "./content/content-list";

export type {
  ContentPreviewProps,
  MediaAssetPreviewProps,
  WorkflowHistoryProps as ContentWorkflowHistoryProps,
} from "./content/content-preview";

export type {
  MediaUploadProps,
  FilePreviewProps,
  UploadProgressProps,
} from "./media/media-upload";

export type {
  MediaGalleryProps,
  MediaAssetCardProps,
  MediaViewerProps,
} from "./media/media-gallery";

export type {
  WorkflowStatusProps,
  StatusBadgeProps,
  WorkflowActionsProps,
} from "./workflow/workflow-status";

export type { ReviewPanelProps } from "./workflow/review-panel";

export type {
  WorkflowHistoryProps,
  WorkflowTransitionCardProps,
} from "./workflow/workflow-history";

export type {
  PresenceIndicatorProps,
  UserAvatarProps,
  PresenceStatusBadgeProps,
  PresenceListProps,
  CompactPresenceIndicatorProps,
} from "./collaboration/presence-indicator";

export type {
  CollaborationCursorProps,
  RemoteCursorProps,
  RemoteSelectionProps,
  CollaborationStatusProps,
  CollaborationToolbarProps,
} from "./collaboration/collaboration-cursor";

export type {
  ContentSyncIndicatorProps,
  SyncStatusBadgeProps,
  ConflictResolutionModalProps,
  ConnectionStatusIndicatorProps,
  RealTimeStatusBarProps,
} from "./real-time/content-sync-indicator";

// Monitoring Components
export { PerformanceDashboard, AlertSystem } from "./monitoring";

// Monitoring Utilities and Types
export {
  performanceMonitor,
  errorMonitor,
  type PerformanceMetrics,
  type OperationMetrics,
  type PerformanceEvent,
  type PerformanceConfig,
  type ErrorMetrics,
  type ErrorEvent,
  type ErrorAlert,
  type ErrorSeverity,
  type AlertSeverity,
  type ErrorMonitorConfig,
} from "./monitoring";
