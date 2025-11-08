/**
 * Notification Service Integration - Main Exports
 *
 * Provides centralized access to all notification service functionality
 */

// Core API Client
export { NotificationApiClient, notificationApiClient } from "./api-client";

// WebSocket Client
export {
  NotificationWebSocketClient,
  createNotificationWebSocketClient,
  getNotificationWebSocketClient,
  destroyNotificationWebSocketClient,
} from "./websocket-client";
export type {
  NotificationWebSocketEventType,
  NotificationWebSocketEventHandlers,
  NotificationSubscription,
  NotificationWebSocketConfig,
} from "./websocket-client";

// Error Handling
export { NotificationErrorHandler } from "./error-handler";

// Cache Management
export { NotificationCacheManager } from "./cache-manager";

// Circuit Breaker
export { CircuitBreaker } from "./circuit-breaker";

// Security and Privacy
export {
  NotificationSecurityManager,
  notificationSecurityManager,
  NotificationContentSanitizer,
  NotificationInputValidator,
  NotificationCSPHelper,
  NotificationDataEncryption,
  SecureNotificationStorage,
  NotificationDataCleanup,
  NotificationAuthHandler,
  NotificationRequestSigner,
  NotificationAuthorizationChecker,
  NotificationTokenCleanup,
  NotificationDataExporter,
  NotificationDataDeletion,
  NotificationConsentManager,
  NotificationPrivacyRights,
  notificationContentSanitizer,
  notificationInputValidator,
  notificationDataEncryption,
  secureNotificationStorage,
  notificationDataCleanup,
  notificationAuthHandler,
  notificationRequestSigner,
  notificationAuthorizationChecker,
  notificationTokenCleanup,
  notificationDataExporter,
  notificationDataDeletion,
  notificationConsentManager,
  notificationPrivacyRights,
  type ConsentType,
  type ExportFormat,
} from "./security";

// Performance Optimization and Monitoring (Task 12)
export {
  NotificationPerformanceMonitor,
  createNotificationPerformanceMonitor,
  getNotificationPerformanceMonitor,
} from "./performance-monitor";
export type {
  NotificationPerformanceMetrics,
  PerformanceBudget,
  PerformanceAlert,
} from "./performance-monitor";

export {
  NotificationRequestOptimizer,
  createNotificationRequestOptimizer,
  getNotificationRequestOptimizer,
} from "./request-optimizer";
export type {
  NotificationRequestOptimizerConfig,
  NotificationRequestStats,
  PrefetchContext,
} from "./request-optimizer";

export {
  NotificationLazyLoader,
  getNotificationLazyLoader,
} from "./lazy-loader";
export type { LazyLoadConfig, LazyLoadStats } from "./lazy-loader";

export {
  NotificationPerformanceManager,
  createNotificationPerformanceManager,
  getNotificationPerformanceManager,
} from "./performance-manager";
export type {
  NotificationPerformanceManagerConfig,
  NotificationPerformanceStats,
} from "./performance-manager";

// Configuration
export {
  notificationServiceConfig,
  notificationServiceEndpoints,
} from "../config/notification-service";

// Types
export type * from "@/types/notification-service";
