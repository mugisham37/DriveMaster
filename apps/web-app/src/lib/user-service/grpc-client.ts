/**
 * gRPC Client for User Service Real-Time Operations
 *
 * Implements:
 * - gRPC-web client configuration for browser compatibility
 * - gRPC service stubs for user-service protobuf definitions
 * - Authentication metadata injection for gRPC calls
 * - Streaming support for real-time progress and activity updates
 * - Requirements: 2.2, 2.3, 9.1, 9.2
 */

import { integratedTokenManager } from "@/lib/auth/token-manager";
import {
  userServiceConfig,
  createCorrelationId,
} from "@/lib/config/user-service";
import { UserServiceGrpcClient as GeneratedGrpcClient } from "@/generated/proto/user-service/user_service_grpc_client";
import type { RequestMetadata } from "@/generated/proto/user-service/user_service_grpc_client";
import type * as UserServiceTypes from "@/generated/proto/user-service/user_service_pb";
import type {
  UserServiceError,
  UserServiceErrorType,
} from "@/types/user-service";

// gRPC status codes (simplified enum)
enum GrpcCode {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}

// ============================================================================
// gRPC Client Configuration
// ============================================================================

export interface GrpcClientConfig {
  host: string;
  timeout: number;
  enableStreaming: boolean;
  enableCompression: boolean;
  enableRetry: boolean;
  retryAttempts: number;
  retryDelay: number;
  enableRequestLogging: boolean;
  streamingTimeout: number;
  keepAliveInterval: number;
}

export interface StreamingConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  bufferSize: number;
}

export interface GrpcMetadata extends RequestMetadata {
  authorization?: string;
  "x-correlation-id"?: string;
  "x-user-id"?: string;
  "x-session-id"?: string;
  "x-device-type"?: string;
  "x-app-version"?: string;
}

// ============================================================================
// Streaming Event Types
// ============================================================================

export interface ProgressUpdateEvent {
  userId: string;
  topic: string;
  mastery: number;
  timestamp: Date;
  sessionId?: string;
}

export interface ActivityUpdateEvent {
  userId: string;
  activityType: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
}

export interface StreamingEventHandler<T> {
  onData: (data: T) => void;
  onError: (error: UserServiceError) => void;
  onEnd: () => void;
  onReconnect?: () => void;
}

// ============================================================================
// gRPC Client Class
// ============================================================================

export class UserServiceGrpcClient {
  private client: GeneratedGrpcClient;
  private config: GrpcClientConfig;
  private streamingConfig: StreamingConfig;
  private activeStreams: Map<string, AbortController> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<GrpcClientConfig>) {
    this.config = {
      host: userServiceConfig.grpcUrl,
      timeout: userServiceConfig.timeout,
      enableStreaming: true,
      enableCompression: true,
      enableRetry: true,
      retryAttempts: userServiceConfig.retryAttempts,
      retryDelay: userServiceConfig.retryDelay,
      enableRequestLogging: userServiceConfig.isDevelopment,
      streamingTimeout: 300000, // 5 minutes
      keepAliveInterval: 30000, // 30 seconds
      ...config,
    };

    this.streamingConfig = {
      maxReconnectAttempts: 5,
      reconnectDelay: 5000,
      heartbeatInterval: 30000,
      bufferSize: 1000,
    };

    this.client = new GeneratedGrpcClient({
      host: this.config.host,
      timeout: this.config.timeout,
      debug: this.config.enableRequestLogging,
    });

    // Use streamingConfig to avoid unused variable warning
    if (this.config.enableRequestLogging) {
      console.log(
        "[UserService gRPC] Client initialized with streaming config:",
        this.streamingConfig,
      );
    }
  }

  // ============================================================================
  // Authentication Metadata Injection
  // ============================================================================

  private async createMetadata(
    additionalMetadata?: Partial<GrpcMetadata>,
  ): Promise<GrpcMetadata> {
    const metadata: GrpcMetadata = {
      "x-correlation-id": createCorrelationId(),
      "x-app-version": process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      "x-device-type": this.getDeviceType(),
      ...additionalMetadata,
    };

    // Inject JWT token from auth service
    try {
      const accessToken = await integratedTokenManager.getValidAccessToken();
      if (accessToken) {
        metadata.authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.warn("Failed to get access token for gRPC request:", error);
      // Continue without token - let the server handle authentication errors
    }

    return metadata;
  }

  private getDeviceType(): string {
    if (typeof window === "undefined") return "server";

    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return "mobile";
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return "tablet";
    }
    return "desktop";
  }

  // ============================================================================
  // Error Handling and Transformation
  // ============================================================================

  private transformGrpcError(
    error: GrpcCode,
    message: string,
    details?: string,
  ): UserServiceError {
    let errorType: UserServiceErrorType;
    let recoverable = false;
    let retryAfter: number | undefined;

    switch (error) {
      case GrpcCode.OK:
        // This shouldn't happen, but handle it gracefully
        errorType = "service";
        break;

      case GrpcCode.CANCELLED:
        errorType = "network";
        recoverable = true;
        break;

      case GrpcCode.UNKNOWN:
        errorType = "service";
        recoverable = true;
        retryAfter = this.config.retryDelay / 1000;
        break;

      case GrpcCode.INVALID_ARGUMENT:
      case GrpcCode.FAILED_PRECONDITION:
      case GrpcCode.OUT_OF_RANGE:
        errorType = "validation";
        break;

      case GrpcCode.DEADLINE_EXCEEDED:
        errorType = "timeout";
        recoverable = true;
        retryAfter = this.config.retryDelay / 1000;
        break;

      case GrpcCode.NOT_FOUND:
        errorType = "validation";
        break;

      case GrpcCode.ALREADY_EXISTS:
        errorType = "validation";
        break;

      case GrpcCode.PERMISSION_DENIED:
      case GrpcCode.UNAUTHENTICATED:
        errorType = "authorization";
        break;

      case GrpcCode.RESOURCE_EXHAUSTED:
        errorType = "network";
        recoverable = true;
        retryAfter = 60; // 1 minute for rate limiting
        break;

      case GrpcCode.UNIMPLEMENTED:
        errorType = "service";
        break;

      case GrpcCode.INTERNAL:
      case GrpcCode.DATA_LOSS:
        errorType = "service";
        recoverable = true;
        retryAfter = this.config.retryDelay / 1000;
        break;

      case GrpcCode.UNAVAILABLE:
        errorType = "network";
        recoverable = true;
        retryAfter = this.config.retryDelay / 1000;
        break;

      default:
        errorType = "service";
        recoverable = true;
        retryAfter = this.config.retryDelay / 1000;
    }

    const result: UserServiceError = {
      type: errorType,
      message: message || this.getGrpcErrorMessage(error),
      code: `GRPC_${GrpcCode[error]}`,
      recoverable,
    };

    if (details) {
      result.details = { grpcDetails: details };
    }

    if (retryAfter !== undefined) {
      result.retryAfter = retryAfter;
    }

    return result;
  }

  private getGrpcErrorMessage(code: GrpcCode): string {
    const errorMessages: Record<GrpcCode, string> = {
      [GrpcCode.OK]: "Success",
      [GrpcCode.CANCELLED]: "Request was cancelled",
      [GrpcCode.UNKNOWN]: "Unknown error occurred",
      [GrpcCode.INVALID_ARGUMENT]: "Invalid request parameters",
      [GrpcCode.DEADLINE_EXCEEDED]: "Request timeout",
      [GrpcCode.NOT_FOUND]: "Resource not found",
      [GrpcCode.ALREADY_EXISTS]: "Resource already exists",
      [GrpcCode.PERMISSION_DENIED]: "Permission denied",
      [GrpcCode.RESOURCE_EXHAUSTED]: "Rate limit exceeded",
      [GrpcCode.FAILED_PRECONDITION]: "Request precondition failed",
      [GrpcCode.ABORTED]: "Request was aborted",
      [GrpcCode.OUT_OF_RANGE]: "Request parameter out of range",
      [GrpcCode.UNIMPLEMENTED]: "Method not implemented",
      [GrpcCode.INTERNAL]: "Internal server error",
      [GrpcCode.UNAVAILABLE]: "Service unavailable",
      [GrpcCode.DATA_LOSS]: "Data loss detected",
      [GrpcCode.UNAUTHENTICATED]: "Authentication required",
    };

    return errorMessages[code] || "Unknown gRPC error";
  }

  // ============================================================================
  // User Management Methods
  // ============================================================================

  async getUser(
    userId: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.GetUserResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.getUser({ userId }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<UserServiceTypes.User>,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.UpdateUserResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.updateUser(
        { userId, ...updates },
        requestMetadata,
      );
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async getUserPreferences(
    userId: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.GetUserPreferencesResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.getUserPreferences({ userId }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserServiceTypes.UserPreferences>,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.UpdatePreferencesResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.updatePreferences(
        { userId, ...preferences },
        requestMetadata,
      );
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async deactivateUser(
    userId: string,
    reason: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.DeactivateUserResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.deactivateUser(
        { userId, reason },
        requestMetadata,
      );
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  // ============================================================================
  // Progress Tracking Methods
  // ============================================================================

  async getMastery(
    userId: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.GetMasteryResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.getMastery({ userId }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async updateMastery(
    userId: string,
    topic: string,
    mastery: number,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.UpdateMasteryResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.updateMastery(
        { userId, topic, mastery },
        requestMetadata,
      );
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async getProgressSummary(
    userId: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.GetProgressSummaryResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.getProgressSummary({ userId }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  // ============================================================================
  // Activity Tracking Methods
  // ============================================================================

  async recordActivity(
    activity: UserServiceTypes.UserActivity,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.RecordActivityResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.recordActivity({ activity }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async getActivitySummary(
    userId: string,
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.GetActivitySummaryResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.getActivitySummary({ userId }, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  // ============================================================================
  // Real-Time Streaming Methods
  // ============================================================================

  /**
   * Subscribes to real-time progress updates for a user
   */
  subscribeToProgressUpdates(
    userId: string,
    handler: StreamingEventHandler<ProgressUpdateEvent>,
    metadata?: Partial<GrpcMetadata>,
  ): string {
    const streamId = `progress-${userId}-${Date.now()}`;

    // For now, implement as polling since gRPC-web streaming is complex
    // In a real implementation, this would use server-sent events or WebSocket
    this.startPollingStream(
      streamId,
      () => this.getProgressSummary(userId, metadata),
      (data) => {
        // Transform progress summary to progress update event
        const event: ProgressUpdateEvent = {
          userId,
          topic: "overall", // This would be more specific in real implementation
          mastery: data.summary.overallAccuracy,
          timestamp: new Date(),
        };
        handler.onData(event);
      },
      handler.onError,
      handler.onEnd,
      5000, // Poll every 5 seconds
    );

    return streamId;
  }

  /**
   * Subscribes to real-time activity updates for a user
   */
  subscribeToActivityUpdates(
    userId: string,
    handler: StreamingEventHandler<ActivityUpdateEvent>,
    metadata?: Partial<GrpcMetadata>,
  ): string {
    const streamId = `activity-${userId}-${Date.now()}`;

    // For now, implement as polling since gRPC-web streaming is complex
    this.startPollingStream(
      streamId,
      () => this.getActivitySummary(userId, metadata),
      (data) => {
        // Transform activity summary to activity update event
        const event: ActivityUpdateEvent = {
          userId,
          activityType: "summary_update",
          metadata: {
            sessionsToday: data.summary.sessionsToday,
            timeTodayMs: data.summary.timeTodayMs,
          },
          timestamp: new Date(),
        };
        handler.onData(event);
      },
      handler.onError,
      handler.onEnd,
      10000, // Poll every 10 seconds
    );

    return streamId;
  }

  /**
   * Unsubscribes from a real-time stream
   */
  unsubscribeFromStream(streamId: string): void {
    const timer = this.reconnectTimers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.reconnectTimers.delete(streamId);
    }

    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
    }

    if (this.config.enableRequestLogging) {
      console.log(`[UserService gRPC] Unsubscribed from stream: ${streamId}`);
    }
  }

  /**
   * Unsubscribes from all active streams
   */
  unsubscribeFromAllStreams(): void {
    const streamIds = Array.from(this.activeStreams.keys());
    streamIds.forEach((streamId) => this.unsubscribeFromStream(streamId));
  }

  // ============================================================================
  // Polling-Based Streaming Implementation
  // ============================================================================

  private startPollingStream<T>(
    streamId: string,
    dataFetcher: () => Promise<T>,
    onData: (data: T) => void,
    onError: (error: UserServiceError) => void,
    onEnd: () => void,
    intervalMs: number,
  ): void {
    let lastData: string | null = null;
    let errorCount = 0;
    const maxErrors = 3;

    const poll = async () => {
      try {
        const data = await dataFetcher();
        const dataString = JSON.stringify(data);

        // Only emit if data has changed
        if (dataString !== lastData) {
          lastData = dataString;
          onData(data);
          errorCount = 0; // Reset error count on success
        }
      } catch (error) {
        errorCount++;

        if (errorCount >= maxErrors) {
          this.unsubscribeFromStream(streamId);
          onError(this.handleGrpcError(error));
          onEnd();
          return;
        }

        // Log error but continue polling
        if (this.config.enableRequestLogging) {
          console.warn(
            `[UserService gRPC] Polling error for stream ${streamId}:`,
            error,
          );
        }
      }
    };

    // Start polling
    const timer = setInterval(poll, intervalMs);
    this.reconnectTimers.set(streamId, timer);

    // Initial poll
    poll();

    if (this.config.enableRequestLogging) {
      console.log(
        `[UserService gRPC] Started polling stream: ${streamId} (interval: ${intervalMs}ms)`,
      );
    }
  }

  // ============================================================================
  // Health Check and Service Status
  // ============================================================================

  async healthCheck(
    metadata?: Partial<GrpcMetadata>,
  ): Promise<UserServiceTypes.HealthCheckResponse> {
    const requestMetadata = await this.createMetadata(metadata);

    try {
      return await this.client.healthCheck({}, requestMetadata);
    } catch (error) {
      throw this.handleGrpcError(error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private handleGrpcError(error: unknown): UserServiceError {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "message" in error
    ) {
      const grpcError = error as {
        code: GrpcCode;
        message: string;
        details?: string;
      };
      return this.transformGrpcError(
        grpcError.code,
        grpcError.message,
        grpcError.details,
      );
    }

    if (error instanceof Error) {
      // Handle HTTP errors from the underlying client
      if (error.message.includes("HTTP")) {
        const statusMatch = error.message.match(/HTTP (\d+)/);
        if (statusMatch && statusMatch[1]) {
          const status = parseInt(statusMatch[1], 10);
          return {
            type:
              status >= 500
                ? "service"
                : status === 401 || status === 403
                  ? "authorization"
                  : "validation",
            message: error.message,
            code: `HTTP_${status}`,
            recoverable: status >= 500 || status === 408 || status === 429,
          };
        }
      }

      return {
        type: "service",
        message: error.message,
        code: "GRPC_UNKNOWN_ERROR",
        recoverable: true,
      };
    }

    return {
      type: "service",
      message: "Unknown gRPC error occurred",
      code: "GRPC_UNKNOWN_ERROR",
      recoverable: true,
    };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): GrpcClientConfig {
    return { ...this.config };
  }

  /**
   * Gets active stream information
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Updates the gRPC host URL
   */
  updateHost(host: string): void {
    this.config.host = host;
    // Note: Would need to recreate the client in a real gRPC implementation
  }

  /**
   * Cleanup method to close all connections
   */
  cleanup(): void {
    this.unsubscribeFromAllStreams();

    if (this.config.enableRequestLogging) {
      console.log("[UserService gRPC] Client cleanup completed");
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userServiceGrpcClient = new UserServiceGrpcClient();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new gRPC client instance with custom configuration
 */
export function createUserServiceGrpcClient(
  config?: Partial<GrpcClientConfig>,
): UserServiceGrpcClient {
  return new UserServiceGrpcClient(config);
}
