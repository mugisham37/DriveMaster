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
  baseUrl: string
  wsUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  healthCheckInterval: number
  enableRealtime: boolean
  enableCaching: boolean
  enableRequestLogging: boolean
  enableMetrics: boolean
}

export interface ServiceDiscoveryConfig {
  enabled: boolean
  refreshInterval: number
  fallbackUrls: {
    http: string
    ws: string
  }
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  details?: Record<string, unknown>
}

// ============================================================================
// Core Analytics Data Models
// ============================================================================

export interface UserEngagementMetrics {
  timestamp: string
  activeUsers1h: number
  activeUsers24h: number
  newUsers24h: number
  sessionsStarted1h: number
  avgSessionDurationMinutes: number
  bounceRate: number
  retentionRateD1: number
  retentionRateD7: number
  retentionRateD30: number
}

export interface LearningProgressMetrics {
  timestamp: string
  totalCompletions24h: number
  avgAccuracy: number
  avgResponseTimeMs: number
  masteryAchievements24h: number
  strugglingUsers: number
  topPerformers: number
  contentCompletionRate: number
  skillProgressRate: number
}

export interface ContentPerformanceMetrics {
  timestamp: string
  totalItems: number
  avgDifficulty: number
  avgAccuracy: number
  avgResponseTimeMs: number
  itemsNeedingReview: number
  topPerformingItems: ContentItem[]
  strugglingItems: ContentItem[]
  contentGaps: ContentGap[]
}

export interface SystemPerformanceMetrics {
  timestamp: string
  apiResponseTimeMs: number
  errorRate: number
  activeConnections: number
  memoryUsagePercent: number
  cpuUsagePercent: number
  diskUsagePercent: number
  cacheHitRate: number
  queueDepth: number
}

export interface RealtimeMetricsSnapshot {
  timestamp: string
  engagement?: UserEngagementMetrics
  progress?: LearningProgressMetrics
  content?: ContentPerformanceMetrics
  system?: SystemPerformanceMetrics
}

// ============================================================================
// Supporting Data Models
// ============================================================================

export interface ContentItem {
  id: string
  title: string
  type: string
  difficulty: 'easy' | 'medium' | 'hard'
  accuracy: number
  responseTimeMs: number
  completionCount: number
}

export interface ContentGap {
  id: string
  topic: string
  skillLevel: string
  gapType: 'knowledge' | 'practice' | 'mastery'
  severity: 'low' | 'medium' | 'high'
  affectedUsers: number
  recommendedActions: string[]
}

export interface Alert {
  id: string
  type: 'system_performance' | 'data_quality' | 'user_behavior' | 'content_performance'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  details: Record<string, unknown>
  timestamp: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
}

export interface BehaviorInsights {
  userId?: string
  timestamp: string
  patterns: BehaviorPattern[]
  recommendations: string[]
  riskFactors: RiskFactor[]
}

export interface BehaviorPattern {
  id: string
  type: 'learning_style' | 'engagement_pattern' | 'difficulty_preference' | 'time_pattern'
  description: string
  confidence: number
  evidence: Record<string, unknown>
}

export interface RiskFactor {
  type: 'dropout_risk' | 'disengagement' | 'difficulty_mismatch'
  severity: 'low' | 'medium' | 'high'
  description: string
  mitigationSuggestions: string[]
}

export interface ContentGapAnalysis {
  timestamp: string
  gaps: ContentGap[]
  priorityAreas: string[]
  recommendations: string[]
}

export interface EffectivenessReport {
  timestamp: string
  overallEffectiveness: number
  categoryBreakdown: Record<string, number>
  trends: TrendData[]
  recommendations: string[]
}

export interface TrendData {
  period: string
  value: number
  change: number
  changePercent: number
}

// ============================================================================
// Query Parameter Types
// ============================================================================

export interface EngagementMetricsParams {
  timeRange?: TimeRange
  userId?: string
  filters?: EngagementFilters
}

export interface ProgressMetricsParams {
  userId?: string
  timeRange?: TimeRange
  skillId?: string
  contentId?: string
}

export interface ContentMetricsParams {
  contentId?: string
  filters?: ContentFilters
  timeRange?: TimeRange
}

export interface SystemMetricsParams {
  timeRange?: TimeRange
  includeDetails?: boolean
}

export interface HistoricalQuery {
  metrics: string[]
  timeRange: TimeRange
  granularity: 'hour' | 'day' | 'week' | 'month'
  filters?: Record<string, unknown>
}

export interface ReportFilters {
  timeRange?: TimeRange
  categories?: string[]
  includeDetails?: boolean
}

// ============================================================================
// Common Types
// ============================================================================

export interface TimeRange {
  start: Date
  end: Date
  granularity?: 'hour' | 'day' | 'week' | 'month'
}

export interface EngagementFilters {
  userSegment?: string
  platform?: 'web' | 'mobile'
  region?: string
}

export interface ContentFilters {
  difficulty?: 'easy' | 'medium' | 'hard'
  topic?: string
  contentType?: string
}

export interface TimeSeriesData {
  timestamp: string
  metrics: Record<string, number>
  metadata?: Record<string, unknown>
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface MetricsUpdate {
  timestamp: string
  type: 'metrics_update'
  engagement?: UserEngagementMetrics
  progress?: LearningProgressMetrics
  content?: ContentPerformanceMetrics
  system?: SystemPerformanceMetrics
}

export interface AlertMessage {
  timestamp: string
  type: 'alert'
  alerts: Alert[]
}

export interface WebSocketMessage {
  timestamp: string
  type: 'metrics_update' | 'alert' | 'subscription_ack' | 'error'
  data?: MetricsUpdate | AlertMessage | Record<string, unknown>
}

export interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe'
  metricsType: string
  userId?: string
}

// ============================================================================
// User Analytics Types
// ============================================================================

export interface HourlyEngagement {
  userId: string
  date: string
  hourlyData: Array<{
    hour: number
    sessionsStarted: number
    timeSpentMinutes: number
    actionsPerformed: number
  }>
}

export interface CohortRetention {
  cohortId: string
  cohortDate: string
  retentionData: Array<{
    period: number
    retainedUsers: number
    totalUsers: number
    retentionRate: number
  }>
}

export interface UserSegment {
  id: string
  name: string
  description: string
  criteria: Record<string, unknown>
  userCount: number
  characteristics: Record<string, unknown>
}

export interface UserJourney {
  userId: string
  journeySteps: Array<{
    timestamp: string
    action: string
    context: Record<string, unknown>
    outcome?: string
  }>
  milestones: Array<{
    name: string
    achievedAt: string
    significance: 'low' | 'medium' | 'high'
  }>
}

// ============================================================================
// Error Types
// ============================================================================

export type AnalyticsServiceErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'service'
  | 'timeout'

export interface AnalyticsServiceError {
  type: AnalyticsServiceErrorType
  message: string
  code?: string
  details?: Record<string, unknown>
  correlationId?: string
  recoverable: boolean
  retryAfter?: number
  timestamp?: Date
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: Record<string, unknown>
  }
  metadata?: {
    timestamp: string
    correlationId?: string
    requestId?: string
  }
}

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface AnalyticsClientConfig {
  baseUrl: string
  wsUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableRealtime: boolean
  enableCaching: boolean
  enableRequestLogging: boolean
  circuitBreaker: CircuitBreakerConfig
  requestQueue: RequestQueueConfig
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  timeout: number
  successThreshold: number
}

export interface RequestQueueConfig {
  maxConcurrent: number
  maxQueue: number
  timeout: number
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseAnalyticsResult {
  invalidateAnalytics: (queryKey?: unknown[]) => void
  updateAnalyticsCache: (data: unknown, queryKey: unknown[]) => void
  isConnected: boolean
  connectionStatus: ConnectionStatus
}

export interface UseEngagementMetricsResult {
  engagementMetrics?: UserEngagementMetrics
  isLoading: boolean
  error?: AnalyticsServiceError
  refetch: () => void
}

export interface UseRealtimeMetricsResult {
  isConnected: boolean
  connectionStatus: ConnectionStatus
  lastUpdate?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// ============================================================================
// Permission Types
// ============================================================================

export interface AnalyticsPermissions {
  canViewEngagement: boolean
  canViewProgress: boolean
  canViewContent: boolean
  canViewSystem: boolean
  canViewUserData: boolean
  canExportData: boolean
  canManageAlerts: boolean
}

// ============================================================================
// Context Types
// ============================================================================

export interface AnalyticsContextValue {
  client: unknown // Will be properly typed when client is implemented
  webSocketManager: unknown // Will be properly typed when WebSocket manager is implemented
  isConnected: boolean
  connectionStatus: ConnectionStatus
  config: AnalyticsServiceConfig
  permissions: AnalyticsPermissions
}