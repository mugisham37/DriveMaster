// Generated HTTP-based client for UserService (gRPC-compatible interface)
// This file is auto-generated. Do not edit manually.

// Import generated types
import * as UserServiceTypes from "./user_service_pb";

export interface GrpcClientConfig {
  host: string;
  timeout?: number;
  debug?: boolean;
  headers?: Record<string, string>;
}

export interface RequestMetadata {
  authorization?: string;
  "x-correlation-id"?: string;
  "x-user-id"?: string;
  [key: string]: string | undefined;
}

export class UserServiceGrpcClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly debug: boolean;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: GrpcClientConfig) {
    this.baseUrl = config.host.replace(/\/$/, ""); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.debug = config.debug || false;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.headers,
    };
  }

  // User management methods
  async getUser(
    request: UserServiceTypes.GetUserRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.GetUserResponse> {
    return this.makeHttpCall(
      "GET",
      `/api/users/${request.userId}`,
      undefined,
      metadata,
    );
  }

  async updateUser(
    request: UserServiceTypes.UpdateUserRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.UpdateUserResponse> {
    return this.makeHttpCall(
      "PUT",
      `/api/users/${request.userId}`,
      request,
      metadata,
    );
  }

  async getUserPreferences(
    request: UserServiceTypes.GetUserPreferencesRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.GetUserPreferencesResponse> {
    return this.makeHttpCall(
      "GET",
      `/api/users/${request.userId}/preferences`,
      undefined,
      metadata,
    );
  }

  async updatePreferences(
    request: UserServiceTypes.UpdatePreferencesRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.UpdatePreferencesResponse> {
    return this.makeHttpCall(
      "PUT",
      `/api/users/${request.userId}/preferences`,
      request,
      metadata,
    );
  }

  async deactivateUser(
    request: UserServiceTypes.DeactivateUserRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.DeactivateUserResponse> {
    return this.makeHttpCall(
      "POST",
      `/api/users/${request.userId}/deactivate`,
      request,
      metadata,
    );
  }

  // Progress tracking methods
  async getMastery(
    request: UserServiceTypes.GetMasteryRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.GetMasteryResponse> {
    return this.makeHttpCall(
      "GET",
      `/api/users/${request.userId}/mastery`,
      undefined,
      metadata,
    );
  }

  async updateMastery(
    request: UserServiceTypes.UpdateMasteryRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.UpdateMasteryResponse> {
    return this.makeHttpCall(
      "PUT",
      `/api/users/${request.userId}/mastery/${request.topic}`,
      request,
      metadata,
    );
  }

  async getProgressSummary(
    request: UserServiceTypes.GetProgressSummaryRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.GetProgressSummaryResponse> {
    return this.makeHttpCall(
      "GET",
      `/api/users/${request.userId}/progress`,
      undefined,
      metadata,
    );
  }

  // Activity tracking methods
  async recordActivity(
    request: UserServiceTypes.RecordActivityRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.RecordActivityResponse> {
    return this.makeHttpCall("POST", `/api/activities`, request, metadata);
  }

  async getActivitySummary(
    request: UserServiceTypes.GetActivitySummaryRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.GetActivitySummaryResponse> {
    return this.makeHttpCall(
      "GET",
      `/api/users/${request.userId}/activities/summary`,
      undefined,
      metadata,
    );
  }

  // Health check
  async healthCheck(
    _request: UserServiceTypes.HealthCheckRequest,
    metadata?: RequestMetadata,
  ): Promise<UserServiceTypes.HealthCheckResponse> {
    return this.makeHttpCall("GET", "/api/health", undefined, metadata);
  }

  private async makeHttpCall<TResponse>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    body?: unknown,
    metadata?: RequestMetadata,
  ): Promise<TResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    if (this.debug) {
      console.log(`[UserService HTTP] ${method} ${url}`, body);
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    };

    // Add metadata headers, filtering out undefined values
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          headers[key] = value;
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const requestInit: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body) {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestInit);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (this.debug) {
        console.log(`[UserService HTTP] Response:`, result);
      }

      return result as TResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }

      throw new Error("Unknown error occurred during HTTP request");
    }
  }

  // Utility method to check if the service is available
  async isHealthy(): Promise<boolean> {
    try {
      await this.healthCheck({});
      return true;
    } catch {
      return false;
    }
  }

  // Get the base URL for debugging
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export default UserServiceGrpcClient;
