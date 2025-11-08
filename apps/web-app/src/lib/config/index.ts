/**
 * Configuration Module Exports
 * Central export point for all configuration modules
 */

// Environment Configuration
export * from "./environment";

// Service Discovery
export * from "./service-discovery";

// Health Check Integration
export * from "./health-check";

// Service Configurations - Export only config objects to avoid duplicate utility function exports
export {
  userServiceConfig,
  serviceDiscovery as userServiceDiscovery,
} from "./user-service";
export { contentServiceConfig } from "./content-service";
export { analyticsServiceConfig } from "./analytics-service";
export { notificationServiceConfig } from "./notification-service";

// Re-export utility functions with service-specific names to avoid conflicts
export {
  createCorrelationId as createUserServiceCorrelationId,
  getServiceUrl as getUserServiceUrl,
  getRecommendedEndpoint as getUserServiceRecommendedEndpoint,
  selectProtocol as selectUserServiceProtocol,
  getServiceUrlForOperation as getUserServiceUrlForOperation,
  validateUserServiceConfiguration,
  startUserServiceMonitoring,
  stopUserServiceMonitoring,
  getUserServiceHealth,
  refreshUserServiceHealth,
  isUserServiceAvailable,
} from "./user-service";

export {
  createCorrelationId as createContentServiceCorrelationId,
  getContentServiceHealth,
  isContentServiceAvailable,
} from "./content-service";

export {
  createCorrelationId as createAnalyticsServiceCorrelationId,
  getAnalyticsServiceHealth,
  isAnalyticsServiceAvailable,
} from "./analytics-service";

export {
  createCorrelationId as createNotificationServiceCorrelationId,
  isNotificationServiceAvailable,
  getNotificationServiceHealth,
} from "./notification-service";

// Configuration Initialization
export * from "./initialize";

// Re-export validation function
export {
  validateConfiguration,
  initializeUserServiceMonitoring,
} from "./environment";
