/**
 * Analytics Service Type Definitions
 *
 * Core types for analytics-dashboard service integration including
 * configuration, data models, and API interfaces.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface AnalyticsServiceConfig {
  baseUrl: string;
  wsUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  healthCheckInterval: number;
  enableRealtime: boolean;
  enableCaching: boolean;
  enableRequestLogging: boolean;
  enableMetrics: boolean;
}

export interface ServiceDiscoveryConfig {
  enabled: boolean;
  refreshInterval: number;
  fallbackUrls: {
    http: string;
    ws: string;
  };
}

export interface ServiceHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Core Analytics Data Models
// ============================================================================

/**
 * User engagement metrics providing insights into user activity and retention patterns.
 * Matches Python Pydantic model: UserEngagementMetrics
 */
export interface UserEngagementMetrics {
  /** ISO timestamp when metrics were calculated */
  timestamp: string;
  /** Number of unique active users in the last hour */
  activeUsers1h: number;
  /** Number of unique active users in the last 24 hours */
  activeUsers24h: number;
  /** Number of new user registrations in the last 24 hours */
  newUsers24h: number;
  /** Number of new sessions started in the last hour */
  sessionsStarted1h: number;
  /** Average session duration in minutes across all active sessions */
  avgSessionDurationMinutes: number;
  /** Percentage of single-page sessions (users who left without interaction) */
  bounceRate: number;
  /** Day 1 retention rate - percentage of users who returned after 1 day */
  retentionRateD1: number;
  /** Day 7 retention rate - percentage of users who returned after 7 days */
  retentionRateD7: number;
  /** Day 30 retention rate - percentage of users who returned after 30 days */
  retentionRateD30: number;
}

/**
 * Learning progress metrics tracking educational outcomes and user performance.
 * Matches Python Pydantic model: LearningProgressMetrics
 */
export interface LearningProgressMetrics {
  /** ISO timestamp when metrics were calculated */
  timestamp: string;
  /** Total number of content completions in the last 24 hours */
  totalCompletions24h: number;
  /** Average accuracy percentage across all completed exercises */
  avgAccuracy: number;
  /** Average response time in milliseconds for exercise completion */
  avgResponseTimeMs: number;
  /** Number of mastery achievements earned in the last 24 hours */
  masteryAchievements24h: number;
  /** Number of users currently struggling (below threshold performance) */
  strugglingUsers: number;
  /** Number of users performing above excellence threshold */
  topPerformers: number;
  /** Overall content completion rate as a percentage */
  contentCompletionRate: number;
  /** Rate of skill progression across all active learners */
  skillProgressRate: number;
}

/**
 * Content performance metrics analyzing effectiveness of educational materials.
 * Matches Python Pydantic model: ContentPerformanceMetrics
 */
export interface ContentPerformanceMetrics {
  /** ISO timestamp when metrics were calculated */
  timestamp: string;
  /** Total number of content items in the system */
  totalItems: number;
  /** Average difficulty rating across all content items (0-1 scale) */
  avgDifficulty: number;
  /** Average accuracy percentage for content completion */
  avgAccuracy: number;
  /** Average response time in milliseconds for content interaction */
  avgResponseTimeMs: number;
  /** Number of content items flagged for review due to poor performance */
  itemsNeedingReview: number;
  /** List of content items with highest performance metrics */
  topPerformingItems: ContentItem[];
  /** List of content items with concerning performance metrics */
  strugglingItems: ContentItem[];
  /** Identified gaps in content coverage or effectiveness */
  contentGaps: ContentGap[];
}

/**
 * System performance metrics monitoring infrastructure health and resource utilization.
 * Matches Python Pydantic model: SystemPerformanceMetrics
 */
export interface SystemPerformanceMetrics {
  /** ISO timestamp when metrics were calculated */
  timestamp: string;
  /** Average API response time in milliseconds across all endpoints */
  apiResponseTimeMs: number;
  /** Error rate as a percentage of total requests */
  errorRate: number;
  /** Number of currently active connections to the system */
  activeConnections: number;
  /** Memory usage as a percentage of total available memory */
  memoryUsagePercent: number;
  /** CPU usage as a percentage of total available CPU */
  cpuUsagePercent: number;
  /** Disk usage as a percentage of total available disk space */
  diskUsagePercent: number;
  /** Cache hit rate as a percentage of total cache requests */
  cacheHitRate: number;
  /** Current depth of processing queues */
  queueDepth: number;
}

export interface RealtimeMetricsSnapshot {
  timestamp: string;
  engagement?: UserEngagementMetrics;
  progress?: LearningProgressMetrics;
  content?: ContentPerformanceMetrics;
  system?: SystemPerformanceMetrics;
}

// ============================================================================
// Supporting Data Models
// ============================================================================

/**
 * Individual content item with performance metrics.
 * Matches Python Pydantic model: ContentItem
 */
export interface ContentItem {
  /** Unique identifier for the content item */
  id: string;
  /** Human-readable title of the content item */
  title: string;
  /** Type of content (exercise, lesson, quiz, etc.) */
  type: string;
  /** Difficulty level of the content */
  difficulty: "easy" | "medium" | "hard";
  /** Average accuracy percentage for this content item */
  accuracy: number;
  /** Average response time in milliseconds for this content item */
  responseTimeMs: number;
  /** Total number of times this content has been completed */
  completionCount: number;
}

/**
 * Identified gap in content coverage or learning effectiveness.
 * Matches Python Pydantic model: ContentGap
 */
export interface ContentGap {
  /** Unique identifier for the content gap */
  id: string;
  /** Topic area where the gap exists */
  topic: string;
  /** Skill level affected by this gap */
  skillLevel: string;
  /** Type of gap identified in the learning path */
  gapType: "knowledge" | "practice" | "mastery";
  /** Severity level of the gap's impact on learning outcomes */
  severity: "low" | "medium" | "high";
  /** Number of users affected by this content gap */
  affectedUsers: number;
  /** Recommended actions to address this gap */
  recommendedActions: string[];
}

export interface Alert {
  id: string;
  type:
    | "system_performance"
    | "data_quality"
    | "user_behavior"
    | "content_performance";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface BehaviorInsights {
  userId?: string;
  timestamp: string;
  patterns: BehaviorPattern[];
  recommendations: string[];
  riskFactors: RiskFactor[];
}

export interface BehaviorPattern {
  id: string;
  type:
    | "learning_style"
    | "engagement_pattern"
    | "difficulty_preference"
    | "time_pattern";
  description: string;
  confidence: number;
  evidence: Record<string, unknown>;
}

export interface RiskFactor {
  type: "dropout_risk" | "disengagement" | "difficulty_mismatch";
  severity: "low" | "medium" | "high";
  description: string;
  mitigationSuggestions: string[];
}

export interface ContentGapAnalysis {
  timestamp: string;
  gaps: ContentGap[];
  priorityAreas: string[];
  recommendations: string[];
}

export interface EffectivenessReport {
  timestamp: string;
  overallEffectiveness: number;
  categoryBreakdown: Record<string, number>;
  trends: TrendData[];
  recommendations: string[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for engagement metrics requests.
 * Matches Python Pydantic model: EngagementMetricsParams
 */
export interface EngagementMetricsParams {
  /** Time range for metrics calculation */
  timeRange?: TimeRange;
  /** Specific user ID to filter metrics (optional) */
  userId?: string;
  /** Class IDs to filter metrics (optional) */
  classIds?: string[];
  /** Additional filters for engagement data */
  filters?: EngagementFilters;
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Sorting parameters */
  sorting?: SortingParams;
}

/**
 * Query parameters for learning progress metrics requests.
 * Matches Python Pydantic model: ProgressMetricsParams
 */
export interface ProgressMetricsParams {
  /** Specific user ID to filter progress metrics (optional) */
  userId?: string;
  /** Class IDs to filter metrics (optional) */
  classIds?: string[];
  /** Time range for progress calculation */
  timeRange?: TimeRange;
  /** Specific skill ID to filter progress (optional) */
  skillId?: string;
  /** Specific content ID to filter progress (optional) */
  contentId?: string;
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Sorting parameters */
  sorting?: SortingParams;
}

/**
 * Query parameters for content performance metrics requests.
 * Matches Python Pydantic model: ContentMetricsParams
 */
export interface ContentMetricsParams {
  /** Specific content ID to filter metrics (optional) */
  contentId?: string;
  /** Class IDs to filter metrics (optional) */
  classIds?: string[];
  /** Content-specific filters */
  filters?: ContentFilters;
  /** Time range for content metrics calculation */
  timeRange?: TimeRange;
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Sorting parameters */
  sorting?: SortingParams;
}

/**
 * Query parameters for system performance metrics requests.
 * Matches Python Pydantic model: SystemMetricsParams
 */
export interface SystemMetricsParams {
  /** Time range for system metrics calculation */
  timeRange?: TimeRange;
  /** Whether to include detailed system metrics */
  includeDetails?: boolean;
  /** Specific system components to include */
  components?: string[];
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Sorting parameters */
  sorting?: SortingParams;
}

export interface HistoricalQuery {
  metrics: string[];
  timeRange: TimeRange;
  granularity: "hour" | "day" | "week" | "month";
  filters?: Record<string, unknown>;
}

export interface ReportFilters {
  timeRange?: TimeRange;
  categories?: string[];
  includeDetails?: boolean;
  userId?: string;
  classIds?: string[];
}

// ============================================================================
// Common Types
// ============================================================================

export interface TimeRange {
  start: Date;
  end: Date;
  granularity?: "hour" | "day" | "week" | "month";
}

export interface EngagementFilters {
  userSegment?: string;
  platform?: "web" | "mobile";
  region?: string;
}

export interface ContentFilters {
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  contentType?: string;
}

export interface TimeSeriesData {
  timestamp: string;
  metrics: Record<string, number>;
  metadata?: Record<string, unknown>;
}

/**
 * Pagination parameters for analytics queries.
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Offset for cursor-based pagination */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * Sorting parameters for analytics queries.
 */
export interface SortingParams {
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Secondary sort field */
  secondarySortBy?: string;
  /** Secondary sort direction */
  secondarySortOrder?: "asc" | "desc";
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * Real-time metrics update message from WebSocket.
 * Matches Python Pydantic model: MetricsUpdate
 */
export interface MetricsUpdate {
  /** ISO timestamp when the update was generated */
  timestamp: string;
  /** Message type identifier */
  type: "metrics_update";
  /** Updated engagement metrics (optional) */
  engagement?: UserEngagementMetrics;
  /** Updated learning progress metrics (optional) */
  progress?: LearningProgressMetrics;
  /** Updated content performance metrics (optional) */
  content?: ContentPerformanceMetrics;
  /** Updated system performance metrics (optional) */
  system?: SystemPerformanceMetrics;
  /** Correlation ID for tracking message flow */
  correlationId?: string;
  /** Source of the metrics update */
  source?: string;
}

/**
 * Alert notification message from WebSocket.
 * Matches Python Pydantic model: AlertMessage
 */
export interface AlertMessage {
  /** ISO timestamp when the alert was generated */
  timestamp: string;
  /** Message type identifier */
  type: "alert";
  /** List of alerts in this message */
  alerts: Alert[];
  /** Correlation ID for tracking message flow */
  correlationId?: string;
  /** Priority level of the alert batch */
  priority?: "low" | "medium" | "high" | "critical";
}

/**
 * Base WebSocket message structure for all analytics communications.
 * Matches Python Pydantic model: WebSocketMessage
 */
export interface WebSocketMessage {
  /** ISO timestamp when the message was created */
  timestamp: string;
  /** Type of WebSocket message */
  type:
    | "metrics_update"
    | "alert"
    | "subscription_ack"
    | "error"
    | "heartbeat"
    | "connection_status"
    | "ping"
    | "pong"
    | "metrics"
    | "system"
    | "message";
  /** Message payload data */
  data?:
    | MetricsUpdate
    | AlertMessage
    | SubscriptionAckMessage
    | ErrorMessage
    | HeartbeatMessage
    | ConnectionStatusMessage
    | unknown;
  /** Correlation ID for request/response tracking */
  correlationId?: string;
  /** Message sequence number for ordering */
  sequenceNumber?: number;
}

/**
 * Subscription management message for WebSocket.
 * Matches Python Pydantic model: SubscriptionMessage
 */
export interface SubscriptionMessage {
  /** Subscription action type */
  type: "subscribe" | "unsubscribe";
  /** Type of metrics to subscribe to */
  messageType: string;
  /** Specific user ID for user-scoped subscriptions (optional) */
  userId?: string;
  /** Additional subscription filters */
  filters?: Record<string, unknown>;
  /** Correlation ID for tracking subscription requests */
  correlationId?: string;
  /** ISO timestamp when the message was created */
  timestamp: string;
}

/**
 * Subscription acknowledgment message from server.
 */
export interface SubscriptionAckMessage {
  /** Subscription action that was acknowledged */
  action: "subscribe" | "unsubscribe";
  /** Metrics type that was subscribed/unsubscribed */
  metricsType: string;
  /** Whether the subscription was successful */
  success: boolean;
  /** Error message if subscription failed */
  error?: string;
  /** Subscription ID for future reference */
  subscriptionId?: string;
}

/**
 * Error message from WebSocket server.
 */
export interface ErrorMessage {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Heartbeat message for connection health monitoring.
 */
export interface HeartbeatMessage {
  /** Server timestamp */
  serverTime: string;
  /** Connection uptime in seconds */
  uptime: number;
  /** Active subscription count */
  activeSubscriptions: number;
}

/**
 * Connection status update message.
 */
export interface ConnectionStatusMessage {
  /** Current connection status */
  status: "connected" | "disconnected" | "reconnecting" | "error";
  /** Status message */
  message?: string;
  /** Connection quality indicator */
  quality?: "excellent" | "good" | "fair" | "poor";
  /** Latency in milliseconds */
  latency?: number;
}

// ============================================================================
// User Analytics Types
// ============================================================================

export interface HourlyEngagement {
  userId: string;
  date: string;
  hourlyData: Array<{
    hour: number;
    sessionsStarted: number;
    timeSpentMinutes: number;
    actionsPerformed: number;
  }>;
}

export interface CohortRetention {
  cohortId: string;
  cohortDate: string;
  retentionData: Array<{
    period: number;
    retainedUsers: number;
    totalUsers: number;
    retentionRate: number;
  }>;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, unknown>;
  userCount: number;
  characteristics: Record<string, unknown>;
}

export interface UserJourney {
  userId: string;
  journeySteps: Array<{
    timestamp: string;
    action: string;
    context: Record<string, unknown>;
    outcome?: string;
  }>;
  milestones: Array<{
    name: string;
    achievedAt: string;
    significance: "low" | "medium" | "high";
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

export type AnalyticsServiceErrorType =
  | "network"
  | "authentication"
  | "authorization"
  | "validation"
  | "service"
  | "timeout";

/**
 * Standardized error response from analytics service.
 * Matches Python Pydantic model: AnalyticsServiceError
 */
export interface AnalyticsServiceError {
  /** Type of error that occurred */
  type: AnalyticsServiceErrorType;
  /** Human-readable error message */
  message: string;
  /** Specific error code for programmatic handling */
  code?: string;
  /** Additional error details and context */
  details?: Record<string, unknown>;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Whether this error can be recovered from with retry */
  recoverable: boolean;
  /** Seconds to wait before retrying (if recoverable) */
  retryAfter?: number;
  /** When the error occurred */
  timestamp?: Date;
}

/**
 * Validation error details for request parameters.
 */
export interface ValidationErrorDetail {
  /** Field that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Invalid value that was provided */
  value?: unknown;
  /** Expected value type or format */
  expected?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    correlationId?: string;
    requestId?: string;
  };
}

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface AnalyticsClientConfig {
  baseUrl: string;
  wsUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableRealtime: boolean;
  enableCaching: boolean;
  enableRequestLogging: boolean;
  circuitBreaker: CircuitBreakerConfig;
  requestQueue: RequestQueueConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  successThreshold: number;
}

export interface RequestQueueConfig {
  maxConcurrent: number;
  maxQueue: number;
  timeout: number;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseAnalyticsResult {
  invalidateAnalytics: (queryKey?: unknown[]) => void;
  updateAnalyticsCache: (data: unknown, queryKey: unknown[]) => void;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}

export interface UseEngagementMetricsResult {
  engagementMetrics?: UserEngagementMetrics;
  isLoading: boolean;
  error?: AnalyticsServiceError;
  refetch: () => void;
}

export interface UseRealtimeMetricsResult {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastUpdate?: string;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting"
  | "error";

/**
 * WebSocket connection configuration.
 */
export interface WebSocketConfig {
  /** WebSocket server URL */
  url: string;
  /** WebSocket protocols */
  protocols?: string[];
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Enable request logging */
  enableLogging?: boolean;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Maximum message queue size */
  maxMessageQueue?: number;
  /** Message timeout in milliseconds */
  messageTimeout?: number;
  /** Whether to use exponential backoff for reconnection */
  useExponentialBackoff?: boolean;
  /** Authentication token for WebSocket connection */
  authToken?: string;
}

/**
 * WebSocket connection state.
 */
export interface WebSocketConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Connection attempt count */
  attemptCount: number;
  /** Last connection error */
  lastError?: Error;
  /** Connection established timestamp */
  connectedAt?: Date;
  /** Last heartbeat timestamp */
  lastHeartbeat?: Date;
  /** Active subscriptions */
  subscriptions: Map<string, SubscriptionHandler>;
  /** Message queue for offline messages */
  messageQueue: WebSocketMessage[];
}

/**
 * Subscription handler function type.
 */
export type SubscriptionHandler = (message: WebSocketMessage) => void;

/**
 * WebSocket message routing configuration.
 */
export interface MessageRouterConfig {
  /** Default handler for unrouted messages */
  defaultHandler?: SubscriptionHandler;
  /** Error handler for message processing errors */
  errorHandler?: (error: Error, message: WebSocketMessage) => void;
  /** Whether to validate message schemas */
  validateMessages: boolean;
  /** Maximum message queue size */
  maxQueueSize: number;
}

// ============================================================================
// Permission Types
// ============================================================================

export type UserRole = "admin" | "mentor" | "learner";

export type AnalyticsFeature =
  | "engagement-dashboard"
  | "progress-tracking"
  | "content-analytics"
  | "system-monitoring"
  | "alert-management"
  | "behavior-insights"
  | "effectiveness-reports"
  | "user-analytics"
  | "system-metrics"
  | "data-export"
  | "realtime-updates";

export type AnalyticsDataType =
  | "engagement"
  | "progress"
  | "content"
  | "system"
  | "alerts"
  | "insights"
  | "reports"
  | "user-analytics"
  | "system-metrics";

export interface AnalyticsPermissions {
  viewEngagement: boolean;
  viewProgress: boolean;
  viewContent: boolean;
  viewSystem: boolean;
  viewAlerts: boolean;
  viewInsights: boolean;
  viewReports: boolean;
  viewUserAnalytics: boolean;
  viewSystemMetrics: boolean;
  manageAlerts: boolean;
  exportData: boolean;
  viewRealtime: boolean;
}

// ============================================================================
// Client Types (Forward Declarations)
// ============================================================================

export interface AnalyticsServiceClient {
  getEngagementMetrics: (
    params?: EngagementMetricsParams,
  ) => Promise<UserEngagementMetrics>;
  getProgressMetrics: (
    params?: ProgressMetricsParams,
  ) => Promise<LearningProgressMetrics>;
  getContentMetrics: (
    params?: ContentMetricsParams,
  ) => Promise<ContentPerformanceMetrics>;
  getSystemMetrics: (
    params?: SystemMetricsParams,
  ) => Promise<SystemPerformanceMetrics>;
  getRealtimeSnapshot: () => Promise<RealtimeMetricsSnapshot>;
  queryHistoricalMetrics: (query: HistoricalQuery) => Promise<TimeSeriesData[]>;
  getBehaviorInsights: (userId?: string) => Promise<BehaviorInsights>;
  getContentGaps: () => Promise<ContentGapAnalysis>;
  getEffectivenessReport: (
    filters?: ReportFilters,
  ) => Promise<EffectivenessReport>;
  getAlerts: (severity?: AlertSeverity) => Promise<Alert[]>;
  getSystemStatus: () => Promise<ServiceHealthStatus>;
  getHourlyEngagement: (
    userId: string,
    date?: Date,
  ) => Promise<HourlyEngagement>;
  getCohortRetention: (cohortId: string) => Promise<CohortRetention>;
  getUserSegments: () => Promise<UserSegment[]>;
  getUserJourney: (userId: string) => Promise<UserJourney>;
  getHealthStatus: () => Promise<ServiceHealthStatus>;
  testConnectivity: () => Promise<{ success: boolean; latency: number }>;
}

export interface CompleteAnalyticsWebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  addEventListener: (
    event: string,
    handler: (data: WebSocketMessage) => void,
  ) => void;
  removeEventListener: (
    event: string,
    handler: (data: WebSocketMessage) => void,
  ) => void;
}

// ============================================================================
// Context Types
// ============================================================================

export interface AnalyticsContextValue {
  // Core clients
  client: AnalyticsServiceClient;
  webSocketManager: CompleteAnalyticsWebSocketManager;

  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastConnectionAttempt: Date | null;

  // Configuration
  config: AnalyticsServiceConfig;
  permissions: AnalyticsPermissions;

  // Service health
  serviceHealth: ServiceHealthStatus | null;
  isServiceAvailable: boolean;

  // Operations
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  checkServiceHealth: () => Promise<void>;

  // State management
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: Error | null;
}

// User Context Types
export interface UserContext {
  userId: string;
  role: UserRole;
  classIds?: string[];
  permissions: AnalyticsPermissions;
  organizationId?: string;
  teamIds?: string[];
}

export interface FilteredRequest<T = unknown> {
  originalParams: T;
  filteredParams: T;
  appliedFilters: string[];
  restrictions: string[];
}
