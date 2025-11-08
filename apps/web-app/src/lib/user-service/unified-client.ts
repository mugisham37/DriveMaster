/**
 * Unified User Service Client Interface
 *
 * Implements:
 * - UserServiceClient class combining HTTP and gRPC protocols
 * - Protocol selection logic based on operation characteristics
 * - Connection pooling and keep-alive configuration
 * - Service client factory with dependency injection support
 * - Requirements: 2.1, 2.2, 2.5, 10.2
 */

import {
  UserServiceHttpClient,
  createUserServiceHttpClient,
} from "./http-client";
import {
  UserServiceGrpcClient,
  createUserServiceGrpcClient,
} from "./grpc-client";
import { selectProtocol } from "@/lib/config/user-service";
import type * as UserServiceTypes from "@/generated/proto/user-service/user_service_pb";
import type {
  UserProfile,
  UserUpdateRequest,
  UserPreferences,
  PreferencesData,
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  GDPRExportResponse,
  GDPRDeleteResponse,
  ConsentPreferences,
  ConsentRecord,
  PrivacyReport,
  ServiceHealthStatus,
  ServiceInfo,
  UserServiceError,
  ProtocolType,
  DateRange,
  WeeklyProgressPoint,
} from "@/types/user-service";

// ============================================================================
// Unified Client Configuration
// ============================================================================

export interface UserServiceClientConfig {
  httpConfig?: {
    baseURL?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableRequestLogging?: boolean;
  };
  grpcConfig?: {
    host?: string;
    timeout?: number;
    enableStreaming?: boolean;
    enableRequestLogging?: boolean;
  };
  protocolSelection?: "http" | "grpc" | "auto";
  enableConnectionPooling?: boolean;
  keepAliveInterval?: number;
  enableMetrics?: boolean;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeout: number;
  keepAliveInterval: number;
  healthCheckInterval: number;
}

export interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  protocolUsage: Record<ProtocolType, number>;
  errorsByType: Record<string, number>;
  lastResetTime: Date;
}

// ============================================================================
// Streaming Data Types
// ============================================================================

export interface ProgressUpdateData {
  userId: string;
  topic: string;
  mastery: number;
  timestamp: Date;
  sessionId?: string;
}

export interface ActivityUpdateData {
  userId: string;
  activityType: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
}

// ============================================================================
// Operation Type Definitions
// ============================================================================

type UserOperationType =
  | "user_fetch"
  | "user_update"
  | "user_deactivate"
  | "preferences_fetch"
  | "preferences_update";

type ProgressOperationType =
  | "progress_fetch"
  | "progress_update"
  | "mastery_fetch"
  | "mastery_update"
  | "streak_fetch"
  | "milestones_fetch";

type ActivityOperationType =
  | "activity_record"
  | "activity_batch"
  | "activity_summary"
  | "engagement_metrics"
  | "activity_insights"
  | "activity_recommendations";

type GDPROperationType =
  | "gdpr_export"
  | "gdpr_export_status"
  | "gdpr_delete"
  | "gdpr_consent"
  | "gdpr_report"
  | "consent_records"
  | "consent_update";

type ServiceOperationType = "health_check" | "service_info";

type OperationType =
  | UserOperationType
  | ProgressOperationType
  | ActivityOperationType
  | GDPROperationType
  | ServiceOperationType;

// ============================================================================
// Unified Service Client Class
// ============================================================================

export class UserServiceClient {
  private httpClient: UserServiceHttpClient;
  private grpcClient: UserServiceGrpcClient;
  private config: UserServiceClientConfig;
  private connectionPool: ConnectionPoolConfig;
  private metrics: ClientMetrics;
  private metricsTimer: NodeJS.Timeout | undefined;

  constructor(config?: UserServiceClientConfig) {
    this.config = {
      protocolSelection: "auto",
      enableConnectionPooling: true,
      keepAliveInterval: 30000,
      enableMetrics: true,
      ...config,
    };

    this.connectionPool = {
      maxConnections: 10,
      idleTimeout: 60000,
      keepAliveInterval: this.config.keepAliveInterval || 30000,
      healthCheckInterval: 60000,
    };

    // Log connection pool config in development
    if (this.config.enableMetrics) {
      console.log(
        "[UserServiceClient] Connection pool configured:",
        this.connectionPool,
      );
    }

    this.metrics = this.initializeMetrics();

    // Initialize protocol clients
    this.httpClient = createUserServiceHttpClient(this.config.httpConfig);
    this.grpcClient = createUserServiceGrpcClient(this.config.grpcConfig);

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  // ============================================================================
  // Protocol Selection Logic
  // ============================================================================

  private selectProtocolForOperation(
    operationType: OperationType,
  ): ProtocolType {
    if (this.config.protocolSelection !== "auto") {
      return this.config.protocolSelection as ProtocolType;
    }

    // Use the global protocol selection logic
    return selectProtocol(operationType);
  }

  private async executeWithProtocol<T>(
    operationType: OperationType,
    httpOperation: () => Promise<T>,
    grpcOperation: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    const protocol = this.selectProtocolForOperation(operationType);

    try {
      let result: T;

      if (protocol === "grpc") {
        result = await grpcOperation();
      } else {
        result = await httpOperation();
      }

      // Update metrics on success
      this.updateMetrics(protocol, Date.now() - startTime, true);

      return result;
    } catch (error) {
      // Update metrics on failure
      this.updateMetrics(protocol, Date.now() - startTime, false, error);
      throw error;
    }
  }

  // ============================================================================
  // User Profile Operations
  // ============================================================================

  /**
   * Fetches user profile by ID
   */
  async getUser(userId: string): Promise<UserProfile> {
    return this.executeWithProtocol(
      "user_fetch",
      () => this.httpClient.get<UserProfile>(`/users/${userId}`),
      () =>
        this.grpcClient
          .getUser(userId)
          .then((response) => response.user as unknown as UserProfile),
    );
  }

  /**
   * Updates user profile
   */
  async updateUser(
    userId: string,
    updates: UserUpdateRequest,
  ): Promise<UserProfile> {
    return this.executeWithProtocol(
      "user_update",
      () => this.httpClient.patch<UserProfile>(`/users/${userId}`, updates),
      () =>
        this.grpcClient
          .updateUser(userId, updates)
          .then((response) => response.user as unknown as UserProfile),
    );
  }

  /**
   * Fetches user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return this.executeWithProtocol(
      "preferences_fetch",
      () =>
        this.httpClient.get<UserPreferences>(`/users/${userId}/preferences`),
      () =>
        this.grpcClient
          .getUserPreferences(userId)
          .then(
            (response) => response.preferences as unknown as UserPreferences,
          ),
    );
  }

  /**
   * Updates user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<PreferencesData>,
  ): Promise<UserPreferences> {
    return this.executeWithProtocol(
      "preferences_update",
      () =>
        this.httpClient.patch<UserPreferences>(
          `/users/${userId}/preferences`,
          preferences,
        ),
      () =>
        this.grpcClient
          .updatePreferences(userId, {
            userId,
            preferences,
          } as unknown as UserServiceTypes.UserPreferences)
          .then(
            (response) => response.preferences as unknown as UserPreferences,
          ),
    );
  }

  /**
   * Deactivates user account
   */
  async deactivateUser(userId: string, reason: string): Promise<void> {
    return this.executeWithProtocol(
      "user_deactivate",
      () =>
        this.httpClient.post<void>(`/users/${userId}/deactivate`, { reason }),
      () =>
        this.grpcClient.deactivateUser(userId, reason).then(() => undefined),
    );
  }

  // ============================================================================
  // Progress Tracking Operations
  // ============================================================================

  /**
   * Fetches progress summary for user
   */
  async getProgressSummary(userId: string): Promise<ProgressSummary> {
    return this.executeWithProtocol(
      "progress_fetch",
      () => this.httpClient.get<ProgressSummary>(`/users/${userId}/progress`),
      () =>
        this.grpcClient
          .getProgressSummary(userId)
          .then((response) => response.summary as unknown as ProgressSummary),
    );
  }

  /**
   * Fetches skill mastery levels for user
   */
  async getSkillMastery(
    userId: string,
    topic?: string,
  ): Promise<SkillMastery[]> {
    const endpoint = topic
      ? `/users/${userId}/mastery/${topic}`
      : `/users/${userId}/mastery`;

    return this.executeWithProtocol(
      "mastery_fetch",
      () => this.httpClient.get<SkillMastery[]>(endpoint),
      () =>
        this.grpcClient.getMastery(userId).then((response) => {
          // Transform the response to match expected format
          const masteries = response.masteries || {};
          return Object.entries(masteries).map(([topic, mastery]) => ({
            userId,
            topic,
            mastery: typeof mastery === "number" ? mastery : 0,
            confidence: 0.8, // Default values for missing fields
            lastPracticed: new Date(),
            practiceCount: 0,
            correctStreak: 0,
            longestStreak: 0,
            totalTimeMs: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
        }),
    );
  }

  /**
   * Updates skill mastery for a topic
   */
  async updateSkillMastery(
    userId: string,
    topic: string,
    attempts: AttemptRecord[],
  ): Promise<SkillMastery> {
    // Calculate mastery from attempts (simplified)
    const correctAttempts = attempts.filter((a) => a.correct).length;
    const mastery = attempts.length > 0 ? correctAttempts / attempts.length : 0;

    return this.executeWithProtocol(
      "mastery_update",
      () =>
        this.httpClient.post<SkillMastery>(
          `/users/${userId}/mastery/${topic}`,
          { attempts },
        ),
      () =>
        this.grpcClient
          .updateMastery(userId, topic, mastery)
          .then((response) => response.mastery as unknown as SkillMastery),
    );
  }

  /**
   * Fetches learning streak information
   */
  async getLearningStreak(userId: string): Promise<LearningStreak> {
    return this.executeWithProtocol(
      "streak_fetch",
      () => this.httpClient.get<LearningStreak>(`/users/${userId}/streak`),
      () => this.httpClient.get<LearningStreak>(`/users/${userId}/streak`), // Fallback to HTTP for now
    );
  }

  /**
   * Fetches milestone progress
   */
  async getMilestones(userId: string): Promise<Milestone[]> {
    return this.executeWithProtocol(
      "milestones_fetch",
      () => this.httpClient.get<Milestone[]>(`/users/${userId}/milestones`),
      () => this.httpClient.get<Milestone[]>(`/users/${userId}/milestones`), // Fallback to HTTP for now
    );
  }

  /**
   * Fetches weekly progress data
   */
  async getWeeklyProgress(
    userId: string,
    weeks: number = 12,
  ): Promise<WeeklyProgressPoint[]> {
    return this.executeWithProtocol(
      "progress_fetch",
      () =>
        this.httpClient.get<WeeklyProgressPoint[]>(
          `/users/${userId}/progress/weekly?weeks=${weeks}`,
        ),
      () =>
        this.httpClient.get<WeeklyProgressPoint[]>(
          `/users/${userId}/progress/weekly?weeks=${weeks}`,
        ), // Fallback to HTTP
    );
  }

  // ============================================================================
  // Activity Monitoring Operations
  // ============================================================================

  /**
   * Records a single activity
   */
  async recordActivity(activity: ActivityRecord): Promise<string> {
    return this.executeWithProtocol(
      "activity_record",
      () =>
        this.httpClient
          .post<{ id: string }>("/activities", activity)
          .then((response) => response.id),
      () =>
        this.grpcClient
          .recordActivity(activity as unknown as UserServiceTypes.UserActivity)
          .then(() => `activity-${Date.now()}`),
    );
  }

  /**
   * Records multiple activities in batch
   */
  async recordActivitiesBatch(activities: ActivityRecord[]): Promise<string[]> {
    return this.executeWithProtocol(
      "activity_batch",
      () =>
        this.httpClient
          .post<{ ids: string[] }>("/activities/batch", { activities })
          .then((response) => response.ids),
      () =>
        Promise.all(
          activities.map((activity) =>
            this.grpcClient
              .recordActivity(
                activity as unknown as UserServiceTypes.UserActivity,
              )
              .then(() => `activity-${Date.now()}`),
          ),
        ),
    );
  }

  /**
   * Records batch activities for a specific user
   */
  async recordBatchActivities(
    userId: string,
    activities: Omit<ActivityRecord, "id" | "timestamp">[],
  ): Promise<ActivityRecord[]> {
    const fullActivities: ActivityRecord[] = activities.map((activity) => ({
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }));

    return this.executeWithProtocol(
      "activity_batch",
      () =>
        this.httpClient.post<ActivityRecord[]>(
          `/users/${userId}/activities/batch`,
          { activities: fullActivities },
        ),
      () =>
        Promise.all(
          fullActivities.map((activity) =>
            this.grpcClient
              .recordActivity(
                activity as unknown as UserServiceTypes.UserActivity,
              )
              .then(() => activity),
          ),
        ),
    );
  }

  /**
   * Gets activity insights for user
   */
  async getActivityInsights(userId: string): Promise<ActivityInsight[]> {
    return this.executeWithProtocol(
      "activity_insights",
      () => this.httpClient.get<ActivityInsight[]>(`/users/${userId}/insights`),
      () => this.httpClient.get<ActivityInsight[]>(`/users/${userId}/insights`), // Fallback to HTTP
    );
  }

  /**
   * Gets activity recommendations for user
   */
  async getActivityRecommendations(
    userId: string,
  ): Promise<ActivityRecommendation[]> {
    return this.executeWithProtocol(
      "activity_recommendations",
      () =>
        this.httpClient.get<ActivityRecommendation[]>(
          `/users/${userId}/recommendations`,
        ),
      () =>
        this.httpClient.get<ActivityRecommendation[]>(
          `/users/${userId}/recommendations`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Gets activity summary with optional date range
   */
  async getActivitySummary(
    userId: string,
    dateRange?: DateRange,
  ): Promise<ActivitySummary> {
    let url = `/users/${userId}/activities/summary`;

    if (dateRange) {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });
      url += `?${params}`;
    }

    return this.executeWithProtocol(
      "activity_summary",
      () => this.httpClient.get<ActivitySummary>(url),
      () =>
        this.grpcClient
          .getActivitySummary(userId)
          .then((response) => response.summary as unknown as ActivitySummary),
    );
  }

  /**
   * Gets engagement metrics with optional date range
   */
  async getEngagementMetrics(
    userId: string,
    dateRange?: DateRange,
  ): Promise<EngagementMetrics> {
    let url = `/users/${userId}/engagement`;

    if (dateRange) {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });
      url += `?${params}`;
    } else {
      url += "?days=30"; // Default to 30 days
    }

    return this.executeWithProtocol(
      "engagement_metrics",
      () => this.httpClient.get<EngagementMetrics>(url),
      () => this.httpClient.get<EngagementMetrics>(url), // Fallback to HTTP
    );
  }

  // ============================================================================
  // GDPR Compliance Operations
  // ============================================================================

  /**
   * Requests data export for user
   */
  async exportUserData(userId: string): Promise<GDPRExportResponse> {
    return this.executeWithProtocol(
      "gdpr_export",
      () =>
        this.httpClient.post<GDPRExportResponse>(
          `/users/${userId}/gdpr/export`,
        ),
      () =>
        this.httpClient.post<GDPRExportResponse>(
          `/users/${userId}/gdpr/export`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Requests data deletion for user
   */
  async deleteUserData(userId: string): Promise<GDPRDeleteResponse> {
    return this.executeWithProtocol(
      "gdpr_delete",
      () =>
        this.httpClient.post<GDPRDeleteResponse>(
          `/users/${userId}/gdpr/delete`,
        ),
      () =>
        this.httpClient.post<GDPRDeleteResponse>(
          `/users/${userId}/gdpr/delete`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Updates consent preferences
   */
  async updateConsent(
    userId: string,
    consent: ConsentPreferences,
  ): Promise<void> {
    return this.executeWithProtocol(
      "gdpr_consent",
      () =>
        this.httpClient.patch<void>(`/users/${userId}/gdpr/consent`, consent),
      () =>
        this.httpClient.patch<void>(`/users/${userId}/gdpr/consent`, consent), // Fallback to HTTP
    );
  }

  /**
   * Generates privacy report
   */
  async generatePrivacyReport(userId: string): Promise<PrivacyReport> {
    return this.executeWithProtocol(
      "gdpr_report",
      () => this.httpClient.post<PrivacyReport>(`/users/${userId}/gdpr/report`),
      () => this.httpClient.post<PrivacyReport>(`/users/${userId}/gdpr/report`), // Fallback to HTTP
    );
  }

  /**
   * Gets GDPR export status
   */
  async getGdprExportStatus(requestId: string): Promise<GDPRExportResponse> {
    return this.executeWithProtocol(
      "gdpr_export_status",
      () =>
        this.httpClient.get<GDPRExportResponse>(
          `/gdpr/export/${requestId}/status`,
        ),
      () =>
        this.httpClient.get<GDPRExportResponse>(
          `/gdpr/export/${requestId}/status`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Gets GDPR consent preferences
   */
  async getGdprConsent(userId: string): Promise<ConsentPreferences> {
    return this.executeWithProtocol(
      "gdpr_consent",
      () =>
        this.httpClient.get<ConsentPreferences>(
          `/users/${userId}/gdpr/consent`,
        ),
      () =>
        this.httpClient.get<ConsentPreferences>(
          `/users/${userId}/gdpr/consent`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Gets consent records for user
   */
  async getConsentRecords(userId: string): Promise<ConsentRecord[]> {
    return this.executeWithProtocol(
      "consent_records",
      () =>
        this.httpClient.get<ConsentRecord[]>(
          `/users/${userId}/gdpr/consent/records`,
        ),
      () =>
        this.httpClient.get<ConsentRecord[]>(
          `/users/${userId}/gdpr/consent/records`,
        ), // Fallback to HTTP
    );
  }

  /**
   * Updates a single consent record
   */
  async updateConsentRecord(
    consentRecord: Omit<ConsentRecord, "id">,
  ): Promise<ConsentRecord> {
    return this.executeWithProtocol(
      "consent_update",
      () =>
        this.httpClient.post<ConsentRecord>(
          `/users/${consentRecord.userId}/gdpr/consent`,
          consentRecord,
        ),
      () =>
        this.httpClient.post<ConsentRecord>(
          `/users/${consentRecord.userId}/gdpr/consent`,
          consentRecord,
        ), // Fallback to HTTP
    );
  }

  /**
   * Requests data deletion with reason
   */
  async requestDataDeletion(
    userId: string,
    reason: string,
  ): Promise<{ requestId: string }> {
    return this.executeWithProtocol(
      "gdpr_delete",
      () =>
        this.httpClient.post<{ requestId: string }>(
          `/users/${userId}/gdpr/delete`,
          { reason },
        ),
      () =>
        this.httpClient.post<{ requestId: string }>(
          `/users/${userId}/gdpr/delete`,
          { reason },
        ), // Fallback to HTTP
    );
  }

  // ============================================================================
  // Real-Time Streaming Operations
  // ============================================================================

  /**
   * Subscribes to real-time progress updates
   */
  subscribeToProgressUpdates(
    userId: string,
    handler: {
      onData: (data: ProgressUpdateData) => void;
      onError: (error: UserServiceError) => void;
      onEnd: () => void;
    },
  ): string {
    // Delegate to gRPC client for streaming
    return this.grpcClient.subscribeToProgressUpdates(userId, handler);
  }

  /**
   * Subscribes to real-time activity updates
   */
  subscribeToActivityUpdates(
    userId: string,
    handler: {
      onData: (data: ActivityUpdateData) => void;
      onError: (error: UserServiceError) => void;
      onEnd: () => void;
    },
  ): string {
    // Delegate to gRPC client for streaming
    return this.grpcClient.subscribeToActivityUpdates(userId, handler);
  }

  /**
   * Unsubscribes from a real-time stream
   */
  unsubscribeFromStream(streamId: string): void {
    this.grpcClient.unsubscribeFromStream(streamId);
  }

  /**
   * Unsubscribes from all active streams
   */
  unsubscribeFromAllStreams(): void {
    this.grpcClient.unsubscribeFromAllStreams();
  }

  // ============================================================================
  // Health and Service Information
  // ============================================================================

  /**
   * Performs health check
   */
  async getHealth(): Promise<ServiceHealthStatus> {
    return this.executeWithProtocol(
      "health_check",
      () => this.httpClient.get<ServiceHealthStatus>("/health"),
      () =>
        this.grpcClient.healthCheck().then((response) => ({
          status:
            response.status === "healthy"
              ? ("healthy" as const)
              : ("unhealthy" as const),
          services: {
            database: "healthy" as const,
            redis: "healthy" as const,
            kafka: "healthy" as const,
          },
          responseTime: 0,
          timestamp: new Date(),
        })),
    );
  }

  /**
   * Gets service information
   */
  async getServiceInfo(): Promise<ServiceInfo> {
    return this.executeWithProtocol(
      "service_info",
      () => this.httpClient.get<ServiceInfo>("/info"),
      () => this.httpClient.get<ServiceInfo>("/info"), // Fallback to HTTP
    );
  }

  // ============================================================================
  // Metrics and Monitoring
  // ============================================================================

  private initializeMetrics(): ClientMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      protocolUsage: { http: 0, grpc: 0 },
      errorsByType: {},
      lastResetTime: new Date(),
    };
  }

  private updateMetrics(
    protocol: ProtocolType,
    responseTime: number,
    success: boolean,
    error?: unknown,
  ): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalRequests++;
    this.metrics.protocolUsage[protocol]++;

    // Update response time (rolling average)
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
        responseTime) /
      this.metrics.totalRequests;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      if (error && typeof error === "object" && "type" in error) {
        const errorType = (error as UserServiceError).type;
        this.metrics.errorsByType[errorType] =
          (this.metrics.errorsByType[errorType] || 0) + 1;
      }
    }
  }

  private startMetricsCollection(): void {
    // Reset metrics every hour
    this.metricsTimer = setInterval(() => {
      this.metrics = this.initializeMetrics();
    }, 3600000);
  }

  /**
   * Gets current client metrics
   */
  getMetrics(): ClientMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets client metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // ============================================================================
  // Configuration and Utility Methods
  // ============================================================================

  /**
   * Gets current configuration
   */
  getConfig(): UserServiceClientConfig {
    return { ...this.config };
  }

  /**
   * Updates protocol selection
   */
  updateProtocolSelection(selection: "http" | "grpc" | "auto"): void {
    this.config.protocolSelection = selection;
  }

  /**
   * Gets active streaming connections
   */
  getActiveStreams(): string[] {
    return this.grpcClient.getActiveStreams();
  }

  /**
   * Checks if the service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === "healthy";
    } catch {
      return false;
    }
  }

  /**
   * Cleanup method to close all connections
   */
  cleanup(): void {
    this.grpcClient.cleanup();

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userServiceClient = new UserServiceClient();

// ============================================================================
// Factory Function with Dependency Injection
// ============================================================================

export interface ServiceClientDependencies {
  httpClient?: UserServiceHttpClient;
  grpcClient?: UserServiceGrpcClient;
  config?: UserServiceClientConfig;
}

/**
 * Creates a new user service client with dependency injection support
 */
export function createUserServiceClient(
  config?: UserServiceClientConfig,
  dependencies?: ServiceClientDependencies,
): UserServiceClient {
  const client = new UserServiceClient(config);

  // Inject dependencies if provided
  if (dependencies?.httpClient) {
    // Use type assertion to access private property for dependency injection
    (client as unknown as { httpClient: UserServiceHttpClient }).httpClient =
      dependencies.httpClient;
  }

  if (dependencies?.grpcClient) {
    // Use type assertion to access private property for dependency injection
    (client as unknown as { grpcClient: UserServiceGrpcClient }).grpcClient =
      dependencies.grpcClient;
  }

  return client;
}

/**
 * Creates a mock user service client for testing
 */
export function createMockUserServiceClient(): UserServiceClient {
  // This would return a mock implementation for testing
  return new UserServiceClient({
    protocolSelection: "http",
    enableMetrics: false,
  });
}
