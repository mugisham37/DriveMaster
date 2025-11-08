/**
 * Real-Time Communication System Exports
 *
 * Centralized exports for all real-time functionality
 */

// Main system
export {
  RealtimeSystem as default,
  getRealtimeSystem,
  initializeRealtimeSystem,
  disconnectRealtimeSystem,
  useRealtimeSystem,
} from "./realtime-system";

export type {
  RealtimeSystemConfig,
  RealtimeSystemHandlers,
  RealtimeSystemStatus,
} from "./realtime-system";

// WebSocket manager
export {
  WebSocketManager,
  createWebSocketManager,
  createMockWebSocketManager,
} from "./websocket-manager";

export type {
  WebSocketConfig,
  WebSocketEventHandlers,
  WebSocketMessage,
  ProgressUpdateData,
  ActivityUpdateData,
  EngagementUpdateData,
  MilestoneData,
  StreakData,
  NotificationData,
  ConnectionMetrics,
} from "./websocket-manager";

// Progress updates
export {
  ProgressUpdateManager,
  createProgressUpdateManager,
  createMockProgressUpdateManager,
} from "./progress-updates";

export type {
  ProgressUpdateConfig,
  ProgressUpdateHandlers,
  ProgressUpdateEvent,
  MilestoneUpdateEvent,
  StreakUpdateEvent,
  ProgressSyncEvent,
  ProgressConflict,
} from "./progress-updates";

// Activity monitoring
export {
  ActivityMonitoringManager,
  createActivityMonitoringManager,
  createMockActivityMonitoringManager,
} from "./activity-monitoring";

export type {
  ActivityMonitoringConfig,
  ActivityMonitoringHandlers,
  ActivityStreamEvent,
  EngagementUpdateEvent,
  InsightGeneratedEvent,
  RecommendationUpdateEvent,
  BehaviorPatternEvent,
  ActivitySession,
} from "./activity-monitoring";

// Legacy progress channel (for backward compatibility)
export {
  ProgressChannel,
  createProgressChannel,
  createMockProgressChannel,
} from "./progress-channel";

export type {
  ProgressChannelConfig,
  RealtimeEvent,
  ProgressUpdateEvent as LegacyProgressUpdateEvent,
  MilestoneAchievedEvent,
  StreakUpdateEvent as LegacyStreakUpdateEvent,
  ProgressSummaryUpdateEvent,
  ActivityUpdateEvent as LegacyActivityUpdateEvent,
  EngagementUpdateEvent as LegacyEngagementUpdateEvent,
} from "./progress-channel";
