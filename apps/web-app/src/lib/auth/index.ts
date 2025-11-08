import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { UserProfile } from "@/types/auth-service";

// Auth service integration exports
export type {
  UserProfile as ExercismUser,
  Flair,
  UserPreferences,
  StudentTrack,
} from "@/types/auth-service";

type ExercismUser = UserProfile;

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

/**
 * Legacy function - use isAuthenticated() instead
 * @deprecated
 */
export async function getServerAuthSession() {
  const user = await getCurrentUser();
  return user ? { user } : null;
}

/**
 * Server-side token validation and user extraction
 */
async function validateServerToken(): Promise<{
  isValid: boolean;
  user?: ExercismUser;
}> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return { isValid: false };
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "fallback-secret",
    );
    const { payload } = await jwtVerify(accessToken, secret);

    // Extract user data from JWT payload
    const user: ExercismUser = {
      id: Number(payload.sub as string),
      handle: payload.handle as string,
      name: payload.name as string,
      email: payload.email as string,
      avatarUrl: (payload.avatarUrl as string) || "",
      reputation: (payload.reputation as string) || "0",
      flair: (payload.flair as ExercismUser["flair"]) || null,
      isMentor: (payload.isMentor as boolean) || false,
      isInsider: (payload.isInsider as boolean) || false,
      createdAt: (payload.createdAt as string) || new Date().toISOString(),
      updatedAt: (payload.updatedAt as string) || new Date().toISOString(),
      preferences: {
        theme: "system",
        emailNotifications: true,
        mentorNotifications: true,
      },
      tracks: [],
    };

    return { isValid: true, user };
  } catch {
    return { isValid: false };
  }
}

/**
 * Get current user from auth service token
 * Returns null if user is not authenticated
 */
export async function getCurrentUser(): Promise<ExercismUser | null> {
  const { isValid, user } = await validateServerToken();

  if (!isValid || !user) {
    return null;
  }

  // Optionally fetch fresh user data from auth service
  try {
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL || "http://localhost:3001";
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      const response = await fetch(`${authServiceUrl}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data as ExercismUser;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching fresh user data:", error);
  }

  // Fallback to JWT payload data
  return user;
}

/**
 * Check if user has mentor privileges (server-side)
 */
export async function isMentor(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.isMentor ?? false;
}

/**
 * Check if user is an insider (server-side)
 */
export async function isInsider(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.isInsider ?? false;
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 */
export async function requireAuth(): Promise<ExercismUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Require mentor privileges - throws error if not a mentor
 */
export async function requireMentor(): Promise<ExercismUser> {
  const user = await requireAuth();

  if (!user.isMentor) {
    throw new Error("Mentor privileges required");
  }

  return user;
}

/**
 * Require insider privileges - throws error if not an insider
 */
export async function requireInsider(): Promise<ExercismUser> {
  const user = await requireAuth();

  if (!user.isInsider) {
    throw new Error("Insider privileges required");
  }

  return user;
}
