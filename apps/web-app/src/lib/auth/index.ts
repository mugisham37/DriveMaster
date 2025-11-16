// Auth service integration exports
export type {
  UserProfile as ExercismUser,
  Flair,
  UserPreferences,
  StudentTrack,
} from "@/types/auth-service";

// Export token management system
export { tokenStorage, TokenStorageManager } from "./token-storage";
export {
  tokenRefreshManager,
  TokenRefreshManager,
  useTokenRefresh,
} from "./token-refresh";
export {
  crossTabSync,
  CrossTabSyncManager,
  useCrossTabSync,
} from "./cross-tab-sync";
export {
  integratedTokenManager,
  IntegratedTokenManager,
  useTokenManager,
} from "./token-manager";
export type {
  TokenPair,
  DecodedToken,
  TokenValidationResult,
} from "./token-storage";
export type { RefreshTokenResponse, QueuedRequest } from "./token-refresh";
export type {
  AuthSyncMessage,
  LoginSyncPayload,
  ConflictResolutionPayload,
} from "./cross-tab-sync";
export type { TokenManagerEvents } from "./token-manager";

// Export new auth service API client
export {
  authClient,
  UnifiedAuthClient,
  authServiceClient,
  oauthClient,
  profileSessionClient,
  coreAuth,
  oauth,
  profileSession,
} from "./api-client";

// Export auth service types
export type {
  LoginCredentials,
  RegisterData,
  OAuthProviderType,
  OAuthProvider,
  LinkedProvider,
  Session,
  SessionListResponse,
  AuthError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  OAuthError,
  ServerError,
} from "../../types/auth-service";

// Export comprehensive error handling system
export {
  ErrorClassifier,
  ErrorMessageGenerator,
  ErrorLogger,
  AuthErrorHandler,
} from "./error-handler";

export {
  AuthErrorBoundary,
  LoginErrorBoundary,
  OAuthErrorBoundary,
  TokenRefreshErrorBoundary,
  useAuthErrorHandler,
  useErrorRecovery,
} from "../../components/auth/error-boundary";

export {
  AuthErrorDisplay,
  InlineAuthError,
  OAuthErrorDisplay,
  useAuthErrorDisplay,
} from "../../components/auth/error-display";

export {
  toErrorMessageFormat,
  toReactQueryError,
  toFormError,
  toToastError,
  createApiErrorHandler,
  createSWRErrorHandler,
  createRetryableErrorHandler,
  wrapExistingErrorHandler,
  isAuthErrorType,
  getErrorCode,
  isRecoverableError,
  createErrorResponse,
} from "./error-integration";

// Export circuit breaker and service resilience
export {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  withCircuitBreaker,
  CircuitBreakerProtected,
  CIRCUIT_BREAKER_CONFIGS,
} from "./circuit-breaker";

export {
  ServiceHealthMonitor,
  serviceHealthMonitor,
  createAuthServiceHealthCheck,
  createOAuthProviderHealthCheck,
  DEFAULT_HEALTH_CONFIG,
} from "./service-health";

export {
  GracefulDegradationManager,
  DegradationCache,
  AuthDegradationHelpers,
  gracefulDegradationManager,
  authDegradationHelpers,
  DEFAULT_DEGRADATION_CONFIG,
} from "./graceful-degradation";

export type {
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
} from "./circuit-breaker";

export type {
  ServiceHealthStatus,
  HealthCheckConfig,
  HealthCheckFunction,
} from "./service-health";

export type { CacheEntry, DegradationConfig } from "./graceful-degradation";

// Export resilience integration
export {
  ResilientAuthOperations,
  authResilience,
  initializeAuthResilience,
  cleanupAuthResilience,
} from "./resilience-integration";
