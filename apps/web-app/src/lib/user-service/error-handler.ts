/**
 * Enhanced User Service Error Handler
 *
 * Provides comprehensive error handling, classification, and recovery
 * for all user-service integration points.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { ErrorClassifier, UserServiceErrorHandler } from "./circuit-breaker";
import { UserServiceErrorLogger } from "../../components/user/error-boundary";
import type {
  UserServiceError,
  CircuitBreakerState,
  ServiceHealthStatus,
} from "@/types/user-service";

// ============================================================================
// Enhanced Error Classification
// ============================================================================

export class EnhancedErrorClassifier {
  private static readonly HTTP_STATUS_MAPPINGS: Record<
    number,
    {
      type: UserServiceError["type"];
      code: string;
      recoverable: boolean;
      retryAfter?: number;
    }
  > = {
    400: { type: "validation", code: "BAD_REQUEST", recoverable: false },
    401: { type: "authorization", code: "UNAUTHORIZED", recoverable: true },
    403: { type: "authorization", code: "FORBIDDEN", recoverable: false },
    404: { type: "service", code: "NOT_FOUND", recoverable: false },
    408: { type: "timeout", code: "REQUEST_TIMEOUT", recoverable: true },
    409: { type: "validation", code: "CONFLICT", recoverable: false },
    422: {
      type: "validation",
      code: "UNPROCESSABLE_ENTITY",
      recoverable: false,
    },
    429: {
      type: "service",
      code: "RATE_LIMITED",
      recoverable: true,
      retryAfter: 60,
    },
    500: { type: "service", code: "INTERNAL_ERROR", recoverable: true },
    502: { type: "service", code: "BAD_GATEWAY", recoverable: true },
    503: { type: "service", code: "SERVICE_UNAVAILABLE", recoverable: true },
    504: { type: "timeout", code: "GATEWAY_TIMEOUT", recoverable: true },
  };

  private static readonly GRPC_STATUS_MAPPINGS: Record<
    number,
    {
      type: UserServiceError["type"];
      code: string;
      recoverable: boolean;
    }
  > = {
    1: { type: "service", code: "GRPC_CANCELLED", recoverable: true },
    2: { type: "service", code: "GRPC_UNKNOWN", recoverable: true },
    3: {
      type: "validation",
      code: "GRPC_INVALID_ARGUMENT",
      recoverable: false,
    },
    4: { type: "timeout", code: "GRPC_DEADLINE_EXCEEDED", recoverable: true },
    5: { type: "service", code: "GRPC_NOT_FOUND", recoverable: false },
    6: { type: "validation", code: "GRPC_ALREADY_EXISTS", recoverable: false },
    7: {
      type: "authorization",
      code: "GRPC_PERMISSION_DENIED",
      recoverable: false,
    },
    8: { type: "service", code: "GRPC_RESOURCE_EXHAUSTED", recoverable: true },
    9: {
      type: "validation",
      code: "GRPC_FAILED_PRECONDITION",
      recoverable: false,
    },
    10: { type: "validation", code: "GRPC_ABORTED", recoverable: true },
    11: { type: "validation", code: "GRPC_OUT_OF_RANGE", recoverable: false },
    12: { type: "service", code: "GRPC_UNIMPLEMENTED", recoverable: false },
    13: { type: "service", code: "GRPC_INTERNAL", recoverable: true },
    14: { type: "service", code: "GRPC_UNAVAILABLE", recoverable: true },
    15: { type: "service", code: "GRPC_DATA_LOSS", recoverable: false },
    16: {
      type: "authorization",
      code: "GRPC_UNAUTHENTICATED",
      recoverable: true,
    },
  };

  static classifyHttpError(response: Response): UserServiceError {
    const mapping = this.HTTP_STATUS_MAPPINGS[response.status];

    if (!mapping) {
      const correlationId = response.headers.get("x-correlation-id");
      return {
        type: "service",
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: `HTTP_${response.status}`,
        recoverable: response.status >= 500,
        ...(correlationId && { correlationId }),
      };
    }

    const correlationId = response.headers.get("x-correlation-id");
    return {
      type: mapping.type,
      message: `${mapping.code}: ${response.statusText}`,
      code: mapping.code,
      recoverable: mapping.recoverable,
      ...(mapping.retryAfter && { retryAfter: mapping.retryAfter }),
      ...(correlationId && { correlationId }),
      details: {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      },
    };
  }

  static classifyGrpcError(
    grpcCode: number,
    message: string,
    details?: unknown,
  ): UserServiceError {
    const mapping = this.GRPC_STATUS_MAPPINGS[grpcCode];

    if (!mapping) {
      return {
        type: "service",
        message: `gRPC ${grpcCode}: ${message}`,
        code: `GRPC_${grpcCode}`,
        recoverable: true,
        details: { grpcCode, grpcMessage: message, grpcDetails: details },
      };
    }

    return {
      type: mapping.type,
      message: `${mapping.code}: ${message}`,
      code: mapping.code,
      recoverable: mapping.recoverable,
      details: { grpcCode, grpcMessage: message, grpcDetails: details },
    };
  }

  static classifyNetworkError(error: Error): UserServiceError {
    const message = error.message.toLowerCase();

    // DNS resolution errors
    if (message.includes("dns") || message.includes("name resolution")) {
      return {
        type: "network",
        message: "DNS resolution failed",
        code: "DNS_ERROR",
        recoverable: true,
      };
    }

    // Connection refused/timeout
    if (
      message.includes("connection refused") ||
      message.includes("econnrefused")
    ) {
      return {
        type: "network",
        message: "Connection refused by server",
        code: "CONNECTION_REFUSED",
        recoverable: true,
      };
    }

    // SSL/TLS errors
    if (
      message.includes("ssl") ||
      message.includes("tls") ||
      message.includes("certificate")
    ) {
      return {
        type: "network",
        message: "SSL/TLS connection error",
        code: "SSL_ERROR",
        recoverable: false,
      };
    }

    // Generic network error
    return {
      type: "network",
      message: "Network connection failed",
      code: "NETWORK_ERROR",
      recoverable: true,
    };
  }

  static enhancedClassifyError(
    error: unknown,
    context?: string,
  ): UserServiceError {
    // If already classified, return as-is
    if (this.isUserServiceError(error)) {
      return error;
    }

    // Handle Response objects (fetch API)
    if (error instanceof Response) {
      return this.classifyHttpError(error);
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return this.classifyNetworkError(error);
    }

    // Handle AbortError (timeouts)
    if (error instanceof Error && error.name === "AbortError") {
      return {
        type: "timeout",
        message: "Request was cancelled or timed out",
        code: "TIMEOUT_ERROR",
        recoverable: true,
      };
    }

    // Handle gRPC errors (if they have a code property)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as any).code === "number"
    ) {
      const grpcError = error as {
        code: number;
        message: string;
        details?: unknown;
      };
      return this.classifyGrpcError(
        grpcError.code,
        grpcError.message,
        grpcError.details,
      );
    }

    // Fallback to base classifier
    const baseError = ErrorClassifier.classifyError(error);

    // Add context if provided
    if (context) {
      return {
        ...baseError,
        details: {
          ...baseError.details,
          context,
        },
      };
    }

    return baseError;
  }

  private static isUserServiceError(error: unknown): error is UserServiceError {
    return (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      "message" in error &&
      typeof (error as UserServiceError).type === "string" &&
      typeof (error as UserServiceError).message === "string"
    );
  }
}

// ============================================================================
// Error Context Manager
// ============================================================================

export class ErrorContextManager {
  private static contexts: Map<
    string,
    {
      errorCount: number;
      lastError?: UserServiceError;
      lastErrorTime?: Date;
      recoveryAttempts: number;
    }
  > = new Map();

  static recordError(context: string, error: UserServiceError): void {
    const existing = this.contexts.get(context) || {
      errorCount: 0,
      recoveryAttempts: 0,
    };

    this.contexts.set(context, {
      errorCount: existing.errorCount + 1,
      lastError: error,
      lastErrorTime: new Date(),
      recoveryAttempts: existing.recoveryAttempts,
    });
  }

  static recordRecovery(context: string): void {
    const existing = this.contexts.get(context);
    if (existing) {
      this.contexts.set(context, {
        ...existing,
        recoveryAttempts: existing.recoveryAttempts + 1,
      });
    }
  }

  static getContextStats(context: string) {
    return (
      this.contexts.get(context) || {
        errorCount: 0,
        recoveryAttempts: 0,
      }
    );
  }

  static isContextHealthy(context: string, threshold: number = 5): boolean {
    const stats = this.getContextStats(context);
    return stats.errorCount < threshold;
  }

  static clearContext(context: string): void {
    this.contexts.delete(context);
  }

  static getAllContexts(): Record<
    string,
    ReturnType<typeof ErrorContextManager.getContextStats>
  > {
    const result: Record<
      string,
      ReturnType<typeof ErrorContextManager.getContextStats>
    > = {};
    for (const [context, stats] of this.contexts.entries()) {
      result[context] = stats;
    }
    return result;
  }
}

// ============================================================================
// Enhanced User Service Error Handler
// ============================================================================

export class EnhancedUserServiceErrorHandler {
  private baseHandler: UserServiceErrorHandler;
  private errorCallbacks: Map<string, (error: UserServiceError) => void> =
    new Map();

  constructor(circuitBreakerConfig?: any, retryConfig?: any) {
    this.baseHandler = new UserServiceErrorHandler(
      circuitBreakerConfig,
      retryConfig,
    );
  }

  async executeWithEnhancedProtection<T>(
    operation: () => Promise<T>,
    context: string = "unknown",
  ): Promise<T> {
    try {
      const result = await this.baseHandler.executeWithProtection(
        operation,
        context,
      );

      // Record successful recovery if there were previous errors
      const stats = ErrorContextManager.getContextStats(context);
      if (stats.errorCount > 0) {
        ErrorContextManager.recordRecovery(context);
      }

      return result;
    } catch (error) {
      const enhancedError = EnhancedErrorClassifier.enhancedClassifyError(
        error,
        context,
      );

      // Record error in context
      ErrorContextManager.recordError(context, enhancedError);

      // Log error with enhanced details
      UserServiceErrorLogger.logError(enhancedError, context, {
        contextStats: ErrorContextManager.getContextStats(context),
        circuitBreakerState: this.baseHandler.getCircuitBreakerState(),
        isServiceHealthy: this.baseHandler.isServiceHealthy(),
      });

      // Trigger error callbacks
      const callback = this.errorCallbacks.get(context);
      if (callback) {
        try {
          callback(enhancedError);
        } catch (callbackError) {
          console.error(
            "[EnhancedUserServiceErrorHandler] Error in callback:",
            callbackError,
          );
        }
      }

      throw enhancedError;
    }
  }

  onError(context: string, callback: (error: UserServiceError) => void): void {
    this.errorCallbacks.set(context, callback);
  }

  offError(context: string): void {
    this.errorCallbacks.delete(context);
  }

  getContextHealth(context: string): {
    isHealthy: boolean;
    errorCount: number;
    lastError?: UserServiceError;
    lastErrorTime?: Date;
    recoveryAttempts: number;
  } {
    const stats = ErrorContextManager.getContextStats(context);
    return {
      isHealthy: ErrorContextManager.isContextHealthy(context),
      ...stats,
    };
  }

  getAllContextsHealth(): Record<
    string,
    ReturnType<
      typeof EnhancedUserServiceErrorHandler.prototype.getContextHealth
    >
  > {
    const contexts = ErrorContextManager.getAllContexts();
    const result: Record<
      string,
      ReturnType<
        typeof EnhancedUserServiceErrorHandler.prototype.getContextHealth
      >
    > = {};

    for (const context in contexts) {
      result[context] = this.getContextHealth(context);
    }

    return result;
  }

  resetContext(context: string): void {
    ErrorContextManager.clearContext(context);
    this.errorCallbacks.delete(context);
  }

  resetAllContexts(): void {
    for (const context of this.errorCallbacks.keys()) {
      this.resetContext(context);
    }
  }

  startHealthMonitoring(healthCheckFunction: () => Promise<any>): void {
    this.baseHandler.startHealthMonitoring(healthCheckFunction);
  }

  stopHealthMonitoring(): void {
    this.baseHandler.stopHealthMonitoring();
  }

  getCircuitBreakerState(): any {
    return this.baseHandler.getCircuitBreakerState();
  }

  getCircuitBreakerMetrics(): any {
    return this.baseHandler.getCircuitBreakerMetrics();
  }

  isServiceHealthy(): boolean {
    return this.baseHandler.isServiceHealthy();
  }

  cleanup(): void {
    this.baseHandler.cleanup();
  }
}

// ============================================================================
// Error Recovery Strategies
// ============================================================================

export class ErrorRecoveryStrategies {
  private static strategies: Map<
    string,
    (error: UserServiceError) => Promise<boolean>
  > = new Map();

  static registerStrategy(
    errorCode: string,
    strategy: (error: UserServiceError) => Promise<boolean>,
  ): void {
    this.strategies.set(errorCode, strategy);
  }

  static async attemptRecovery(error: UserServiceError): Promise<boolean> {
    const strategy = this.strategies.get(error.code || "");

    if (!strategy) {
      return false;
    }

    try {
      return await strategy(error);
    } catch (recoveryError) {
      console.error(
        "[ErrorRecoveryStrategies] Recovery strategy failed:",
        recoveryError,
      );
      return false;
    }
  }

  static getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Register default recovery strategies
ErrorRecoveryStrategies.registerStrategy("UNAUTHORIZED", async (error) => {
  // Attempt token refresh
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    return response.ok;
  } catch {
    return false;
  }
});

ErrorRecoveryStrategies.registerStrategy("NETWORK_ERROR", async () => {
  // Check if network is back online
  return new Promise((resolve) => {
    const checkOnline = () => {
      if (navigator.onLine) {
        resolve(true);
      } else {
        setTimeout(checkOnline, 1000);
      }
    };

    // Give up after 10 seconds
    setTimeout(() => resolve(false), 10000);
    checkOnline();
  });
});

// ============================================================================
// Singleton Instance
// ============================================================================

export const enhancedUserServiceErrorHandler =
  new EnhancedUserServiceErrorHandler();

// ============================================================================
// Utility Functions
// ============================================================================

export function createEnhancedErrorHandler(
  circuitBreakerConfig?: any,
  retryConfig?: unknown,
): EnhancedUserServiceErrorHandler {
  return new EnhancedUserServiceErrorHandler(circuitBreakerConfig, retryConfig);
}

export function isRecoverableError(error: UserServiceError): boolean {
  return (
    error.recoverable &&
    ErrorRecoveryStrategies.getAvailableStrategies().includes(error.code || "")
  );
}

export function getErrorSeverity(
  error: UserServiceError,
): "low" | "medium" | "high" {
  switch (error.type) {
    case "validation":
      return "low";
    case "network":
    case "timeout":
      return "medium";
    case "authorization":
    case "service":
    case "circuit_breaker":
      return "high";
    default:
      return "medium";
  }
}

export function shouldNotifyUser(error: UserServiceError): boolean {
  const severity = getErrorSeverity(error);
  return severity === "high" || (severity === "medium" && !error.recoverable);
}
