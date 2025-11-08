/**
 * User Service Integration - Main Export File
 *
 * Exports all user service client components and utilities
 */

// Main unified client
export {
  UserServiceClient,
  userServiceClient,
  createUserServiceClient,
  createMockUserServiceClient,
} from "./unified-client";
export type {
  UserServiceClientConfig,
  ServiceClientDependencies,
} from "./unified-client";

// HTTP client
export {
  UserServiceHttpClient,
  userServiceHttpClient,
  createUserServiceHttpClient,
} from "./http-client";
export type {
  HttpClientConfig,
  RetryConfig as HttpRetryConfig,
} from "./http-client";

// gRPC client
export {
  UserServiceGrpcClient,
  userServiceGrpcClient,
  createUserServiceGrpcClient,
} from "./grpc-client";
export type {
  GrpcClientConfig,
  StreamingConfig,
  GrpcMetadata,
  ProgressUpdateEvent,
  ActivityUpdateEvent,
  StreamingEventHandler,
} from "./grpc-client";

// Circuit breaker and error handling
export {
  CircuitBreaker,
  RetryManager,
  ServiceHealthMonitor,
  UserServiceErrorHandler,
  ErrorClassifier,
  userServiceErrorHandler,
  createCircuitBreaker,
  createRetryManager,
  createErrorHandler,
} from "./circuit-breaker";
export type {
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  RetryConfig,
} from "./circuit-breaker";

// Enhanced error handling and resilience
export {
  EnhancedErrorClassifier,
  ErrorContextManager,
  EnhancedUserServiceErrorHandler,
  ErrorRecoveryStrategies,
  enhancedUserServiceErrorHandler,
  createEnhancedErrorHandler,
  isRecoverableError,
  getErrorSeverity,
  shouldNotifyUser,
} from "./error-handler";

// Error boundaries and UI components
export {
  UserServiceErrorBoundary,
  UserProfileErrorBoundary,
  ProgressTrackingErrorBoundary,
  ActivityMonitoringErrorBoundary,
  GDPRComplianceErrorBoundary,
  UserServiceErrorMessageGenerator,
  UserServiceErrorLogger,
  useUserServiceErrorHandler,
} from "../../components/user/error-boundary";

// Graceful degradation
export {
  GracefulDegradationManager,
  CachedDataManager,
  FallbackDataProvider,
  gracefulDegradationManager,
  useGracefulDegradation,
} from "./graceful-degradation";
export type {
  DegradationConfig,
  DegradationState,
} from "./graceful-degradation";

// Offline support and synchronization
export {
  OfflineManager,
  OfflineStorageManager,
  ConflictResolver,
  OfflineIndicator,
  offlineManager,
  useOfflineManager,
} from "./offline-support";
export type {
  OfflineConfig,
  OfflineState,
  QueuedOperation,
  ConflictResolution,
  SyncResult,
} from "./offline-support";

// Re-export types from the main types file
export type {
  UserProfile,
  UserUpdateRequest,
  UserPreferences,
  PreferencesData,
  NotificationPreferences,
  PrivacyPreferences,
  LearningPreferences,
  AccessibilityPreferences,
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  WeeklyProgressPoint,
  TopicProgressPoint,
  ActivityType,
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  RecommendationAction,
  TopicActivitySummary,
  BehaviorPattern,
  GDPRExportResponse,
  GDPRDeleteResponse,
  ConsentPreferences,
  DataRetentionPreference,
  CommunicationPreferences,
  PrivacyReport,
  DataCategoryReport,
  ProcessingActivity,
  ThirdPartySharing,
  RetentionPolicy,
  UserRightsStatus,
  ComplianceStatus,
  DateRange,
  TimeRange,
  UserServiceError,
  UserServiceErrorType,
  CircuitBreakerState,
  ServiceHealthStatus,
  ServiceInfo,
  UserServiceConfig,
  ProtocolType,
  ServiceDiscoveryConfig,
  ApiResponse,
} from "@/types/user-service";

// Progress analytics and visualization (Task 6.3)
export {
  ProgressAnalyticsManager,
  ProgressTrendAnalyzer,
  TopicComparisonAnalyzer,
  PeerComparisonAnalyzer,
  ChartDataGenerator,
  HeatmapDataGenerator,
} from "./progress-analytics";
export type {
  ProgressTrend,
  TopicComparison,
  PeerComparison,
  PeerPerformance,
  ChartData,
  ChartDataset,
  ChartOptions,
  HeatmapData,
  HeatmapTooltip,
  ChartType,
} from "./progress-analytics";

// Progress calculation and optimization (Task 6.4)
export {
  ProgressCalculationManager,
  ProgressCalculator,
  ProgressPredictor,
  LearningPatternAnalyzer,
  PrefetchStrategyManager,
  ProgressSummaryGenerator,
} from "./progress-calculation";
export type {
  ProgressCalculationConfig,
  MasteryCalculationResult,
  MasteryFactors,
  ProgressPrediction,
  PracticeRecommendation,
  LearningPattern,
  PrefetchStrategy,
} from "./progress-calculation";

// Re-export configuration utilities
export {
  userServiceConfig,
  selectProtocol,
  getServiceUrl,
  getServiceUrlForOperation,
  serviceDiscovery,
  validateUserServiceConfiguration,
  startUserServiceMonitoring,
  stopUserServiceMonitoring,
  getUserServiceHealth,
  refreshUserServiceHealth,
  isUserServiceAvailable,
  getRecommendedEndpoint,
  createCorrelationId,
} from "@/lib/config/user-service";
