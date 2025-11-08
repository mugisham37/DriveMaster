// Generated index file for user-service protobuf types
// This file is auto-generated. Do not edit manually.

// Protobuf generated types (with namespace to avoid conflicts)
export * as ProtobufTypes from "./user_service_pb";

// gRPC client
export { UserServiceGrpcClient } from "./user_service_grpc_client";
export type { GrpcClientConfig } from "./user_service_grpc_client";

// HTTP REST API types (with namespace to avoid conflicts)
export * as HttpTypes from "./http_client_types";

// Runtime validation utilities
export * from "./validation";

// Circuit breaker implementation
export * from "./circuit-breaker";

// Re-export common types for convenience
export type {
  UserProfile,
  UserPreferences,
  SkillMastery,
  ProgressSummary,
  ActivityRecord,
  ActivitySummary,
  UserServiceError,
  CircuitBreakerState,
  ServiceHealthStatus,
  ServiceInfo,
  UserServiceConfig,
  ProtocolType,
} from "../../../types/user-service";
