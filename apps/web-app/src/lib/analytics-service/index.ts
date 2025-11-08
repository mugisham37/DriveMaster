/**
 * Analytics Service Integration - Main Export
 *
 * Provides a unified interface for all analytics service functionality
 * including HTTP client, service client, error handling, and circuit breaker.
 */

import { completeAnalyticsWebSocketManager } from "./websocket-manager";

import { analyticsServiceClient } from "./client";

// Core client exports
export {
  AnalyticsServiceHttpClient,
  analyticsServiceHttpClient,
  createAnalyticsServiceHttpClient,
} from "./http-client";
export {
  AnalyticsServiceClient,
  analyticsServiceClient,
  createAnalyticsServiceClient,
} from "./client";

// Data transformation utilities
export {
  transformApiResponse,
  transformApiRequest,
  transformKeysToCamel,
  transformKeysToSnake,
  transformDateTimeFields,
  serializeDateTimeFields,
  ValidationError as DataValidationError,
  transformErrorResponse,
} from "./data-transform";

// Error handling
export {
  BaseAnalyticsError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ServiceError,
  TimeoutError,
  AnalyticsErrorFactory,
  AnalyticsErrorHandler,
  isAnalyticsError,
  isRecoverableError,
  getErrorCorrelationId,
  createErrorResponse,
} from "./errors";

// Circuit breaker
export {
  AnalyticsCircuitBreaker,
  CircuitBreakerManager,
  analyticsCircuitBreakerManager,
  createAnalyticsCircuitBreaker,
} from "./circuit-breaker";

// WebSocket manager
export {
  AnalyticsWebSocketManager,
  CompleteAnalyticsWebSocketManager,
  GracefulDegradationManager,
  analyticsWebSocketManager,
  completeAnalyticsWebSocketManager,
  createAnalyticsWebSocketManager,
  createCompleteAnalyticsWebSocketManager,
} from "./websocket-manager";

// Query configuration and React Query integration
export {
  analyticsQueryKeys,
  analyticsQueryConfig,
  analyticsCacheUtils,
  analyticsQueryClientConfig,
  createAnalyticsQueryClient,
} from "./query-config";

// Permissions and access control
export {
  ROLE_PERMISSIONS,
  FEATURE_PERMISSIONS,
  DATA_TYPE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
  canAccessFeature,
  canAccessDataType,
  canManageAlerts,
  canExportData,
  canViewRealtime,
  filterAllowedEndpoints,
  filterAllowedFeatures,
  filterAllowedDataTypes,
  getUserDataScope,
  filterAllowedUserIds,
  validatePermissions,
  createPermissionError,
  mergePermissions,
  getPermissionSummary,
  createPermissionMiddleware,
} from "./permissions";

// User context propagation and filtering
export {
  addUserContext,
  filterEngagementParams,
  filterProgressParams,
  filterContentParams,
  filterSystemParams,
  filterHistoricalQuery,
  filterReportParams,
  shouldRenderComponent,
  getDataViewLevel,
  filterNavigationItems,
  handlePermissionChange,
  createPermissionChangeSummary,
  createUserContext,
  validateUserContext,
} from "./user-context";

// Performance Optimization Components
export {
  RequestBatcher,
  createRequestBatcher,
  type BatchRequest,
  type BatchConfig,
} from "./request-batcher";

export {
  IntelligentCache,
  createIntelligentCache,
  type CacheStrategy,
  type CacheWarmingConfig,
} from "./intelligent-cache";

export {
  AnalyticsWorkerManager,
  createAnalyticsWorkerManager,
  type WorkerManagerConfig,
  type ProcessingOptions,
} from "./worker-manager";

export {
  AnalyticsPerformanceManager,
  createAnalyticsPerformanceManager,
  initializeGlobalPerformanceManager,
  getGlobalPerformanceManager,
  destroyGlobalPerformanceManager,
  type PerformanceManagerConfig,
} from "./performance-manager";

// Error Handling and Resilience Components
export {
  AnalyticsDegradationManager,
  analyticsDegradationManager,
  useAnalyticsDegradation,
  type DegradationLevel,
  type DegradationState,
  type CachedAnalyticsData,
  type AnalyticsDataResult,
} from "./degradation-manager";

export {
  AnalyticsPerformanceMonitor,
  analyticsPerformanceMonitor,
  useAnalyticsPerformanceMonitor,
  type PerformanceMetrics,
  type RequestMetric,
  type WebSocketMetric,
  type PerformanceBudget,
  type PerformanceAlert,
} from "./monitoring";

export {
  AnalyticsResilienceManager,
  analyticsResilienceManager,
  useAnalyticsResilience,
  type ResilienceConfig,
  type ResilienceState,
} from "./resilience-integration";

// Configuration
export {
  analyticsServiceConfig,
  analyticsServiceDiscovery,
  validateAnalyticsServiceConfiguration,
  startAnalyticsServiceMonitoring,
  stopAnalyticsServiceMonitoring,
  getAnalyticsServiceHealth,
  refreshAnalyticsServiceHealth,
  isAnalyticsServiceAvailable,
  getRecommendedEndpoint,
  getServiceUrl,
} from "@/lib/config/analytics-service";

// Re-export types for convenience
export type {
  // Core Metrics Types
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  RealtimeMetricsSnapshot,

  // Query Parameter Types
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,

  // Supporting Types
  Alert,
  BehaviorInsights,
  ContentGapAnalysis,
  EffectivenessReport,
  TimeSeriesData,
  HourlyEngagement,
  CohortRetention,
  UserSegment,
  UserJourney,
  BehaviorPattern,

  // Configuration Types
  AnalyticsServiceConfig,
  AnalyticsClientConfig,
  CircuitBreakerConfig,
  RequestQueueConfig,

  // Error Types
  AnalyticsServiceError,
  AnalyticsServiceErrorType,
  ValidationErrorDetail,

  // WebSocket Types
  MetricsUpdate,
  AlertMessage,
  WebSocketMessage,
  SubscriptionMessage,
  WebSocketConfig,
  ConnectionStatus,

  // Response Types
  ApiResponse,
  ServiceHealthStatus,

  // Permission and Context Types
  UserRole,
  AnalyticsFeature,
  AnalyticsDataType,
  AnalyticsPermissions,
  UserContext,
  FilteredRequest,
  AlertSeverity,
} from "@/types/analytics-service";

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick health check for analytics service
 */
export async function checkAnalyticsServiceHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const { analyticsServiceClient } = await import("./client");
    const result = await analyticsServiceClient.testConnectivity();
    return {
      available: result.success,
      latency: result.latency,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gets comprehensive analytics service status
 */
export async function getAnalyticsServiceStatus() {
  const { analyticsServiceHttpClient } = await import("./http-client");
  const { analyticsCircuitBreakerManager } = await import("./circuit-breaker");
  const { getAnalyticsServiceHealth, isAnalyticsServiceAvailable } =
    await import("@/lib/config/analytics-service");

  const httpClientStats = analyticsServiceHttpClient.getClientStats();
  const circuitBreakerHealth =
    analyticsCircuitBreakerManager.getOverallHealth();
  const serviceHealth = getAnalyticsServiceHealth();

  return {
    httpClient: {
      available: analyticsServiceHttpClient.isServiceAvailable(),
      ...httpClientStats,
    },
    circuitBreaker: circuitBreakerHealth,
    serviceDiscovery: {
      endpoints: Array.from(serviceHealth.entries()).map(
        ([protocol, endpoint]) => ({
          protocol,
          url: endpoint.url,
          health: endpoint.health,
          lastChecked: endpoint.lastChecked,
          responseTime: endpoint.responseTime,
        }),
      ),
    },
    overall: {
      healthy: circuitBreakerHealth.healthy && isAnalyticsServiceAvailable(),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Initializes analytics service with health monitoring
 */
export async function initializeAnalyticsService(): Promise<void> {
  const {
    validateAnalyticsServiceConfiguration,
    startAnalyticsServiceMonitoring,
  } = await import("@/lib/config/analytics-service");
  const { analyticsCircuitBreakerManager } = await import("./circuit-breaker");

  // Validate configuration
  validateAnalyticsServiceConfiguration();

  // Start health monitoring
  startAnalyticsServiceMonitoring();

  // Set up error event listeners for monitoring
  if (process.env.NODE_ENV === "development") {
    const mainCircuitBreaker =
      analyticsCircuitBreakerManager.getCircuitBreaker("main");

    mainCircuitBreaker.addEventListener("state_change", (data) => {
      console.log("[Analytics Service] Circuit breaker state changed:", {
        from: data.previousState,
        to: data.state,
        timestamp: new Date(data.timestamp).toISOString(),
      });
    });

    mainCircuitBreaker.addEventListener("circuit_opened", () => {
      console.warn(
        "[Analytics Service] Circuit breaker opened - service degraded",
      );
    });

    mainCircuitBreaker.addEventListener("circuit_closed", () => {
      console.log(
        "[Analytics Service] Circuit breaker closed - service restored",
      );
    });
  }

  console.log("[Analytics Service] Initialization complete");
}

/**
 * Gracefully shuts down analytics service
 */
export async function shutdownAnalyticsService(): Promise<void> {
  const { stopAnalyticsServiceMonitoring } = await import(
    "@/lib/config/analytics-service"
  );
  const { analyticsCircuitBreakerManager } = await import("./circuit-breaker");

  stopAnalyticsServiceMonitoring();
  analyticsCircuitBreakerManager.destroy();
  console.log("[Analytics Service] Shutdown complete");
}

// ============================================================================
// Convenience Getters for Hooks
// ============================================================================

/**
 * Gets the analytics service client instance for use in hooks
 */
export function getAnalyticsServiceClient() {
  return analyticsServiceClient;
}

/**
 * Gets the analytics WebSocket manager instance for use in hooks
 */
export function getAnalyticsWebSocketManager() {
  return completeAnalyticsWebSocketManager;
}
