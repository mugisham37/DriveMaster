// Generated gRPC client for UserService
// This file is auto-generated. Do not edit manually.

import { grpc } from '@improbable-eng/grpc-web';
import { BrowserHeaders } from 'browser-headers';

// Import generated types
import * as UserServiceTypes from './user_service_pb';

export interface GrpcClientConfig {
  host: string;
  transport?: grpc.TransportFactory;
  debug?: boolean;
}

export class UserServiceGrpcClient {
  private host: string;
  private transport?: grpc.TransportFactory;
  private debug: boolean;

  constructor(config: GrpcClientConfig) {
    this.host = config.host;
    this.transport = config.transport;
    this.debug = config.debug || false;
  }

  // User management methods
  async getUser(request: UserServiceTypes.GetUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetUserResponse> {
    return this.makeUnaryCall('GetUser', request, metadata);
  }

  async updateUser(request: UserServiceTypes.UpdateUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdateUserResponse> {
    return this.makeUnaryCall('UpdateUser', request, metadata);
  }

  async getUserPreferences(request: UserServiceTypes.GetUserPreferencesRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetUserPreferencesResponse> {
    return this.makeUnaryCall('GetUserPreferences', request, metadata);
  }

  async updatePreferences(request: UserServiceTypes.UpdatePreferencesRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdatePreferencesResponse> {
    return this.makeUnaryCall('UpdatePreferences', request, metadata);
  }

  async deactivateUser(request: UserServiceTypes.DeactivateUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.DeactivateUserResponse> {
    return this.makeUnaryCall('DeactivateUser', request, metadata);
  }

  // Progress tracking methods
  async getMastery(request: UserServiceTypes.GetMasteryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetMasteryResponse> {
    return this.makeUnaryCall('GetMastery', request, metadata);
  }

  async updateMastery(request: UserServiceTypes.UpdateMasteryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdateMasteryResponse> {
    return this.makeUnaryCall('UpdateMastery', request, metadata);
  }

  async getProgressSummary(request: UserServiceTypes.GetProgressSummaryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetProgressSummaryResponse> {
    return this.makeUnaryCall('GetProgressSummary', request, metadata);
  }

  // Activity tracking methods
  async recordActivity(request: UserServiceTypes.RecordActivityRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.RecordActivityResponse> {
    return this.makeUnaryCall('RecordActivity', request, metadata);
  }

  async getActivitySummary(request: UserServiceTypes.GetActivitySummaryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetActivitySummaryResponse> {
    return this.makeUnaryCall('GetActivitySummary', request, metadata);
  }

  // Health check
  async healthCheck(request: UserServiceTypes.HealthCheckRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.HealthCheckResponse> {
    return this.makeUnaryCall('HealthCheck', request, metadata);
  }

  private async makeUnaryCall<TRequest, TResponse>(
    methodName: string,
    request: TRequest,
    metadata?: BrowserHeaders
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      if (this.debug) {
        console.log(`[gRPC] Calling ${methodName}`, request);
      }

      // This is a placeholder implementation
      // In a real implementation, you would use the actual gRPC-web client
      // For now, we'll throw an error to indicate this needs proper implementation
      reject(new Error(`gRPC method ${methodName} not yet implemented. Use HTTP client instead.`));
    });
  }
}

export default UserServiceGrpcClient;