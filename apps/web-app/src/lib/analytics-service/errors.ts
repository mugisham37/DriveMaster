/**
 * Analytics Service Error Handling
 *
 * Comprehensive error classification, handling, and recovery mechanisms
 * for analytics-dashboard service integration.
 *
 * Requirements: 2.5, 6.1, 6.2, 7.1, 7.2
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  AnalyticsServiceError,
  AnalyticsServiceErrorType,
  ValidationErrorDetail,
} from "@/types/analytics-service";

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base class for all analytics service errors
 */
export abstract class BaseAnalyticsError extends Error {
  abstract readonly type: AnalyticsServiceErrorType;
  abstract readonly recoverable: boolean;

  public readonly timestamp: Date;
  public readonly correlationId?: string;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    if (options.correlationId) this.correlationId = options.correlationId;
    if (options.code) this.code = options.code;
    if (options.details) this.details = options.details;
    if (options.retryAfter) this.retryAfter = options.retryAfter;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Converts error to analytics service error format
   */
  toAnalyticsServiceError(): AnalyticsServiceError {
    const result: AnalyticsServiceError = {
      type: this.type,
      message: this.message,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
    };

    if (this.code) result.code = this.code;
    if (this.details) result.details = this.details;
    if (this.correlationId) result.correlationId = this.correlationId;
    if (this.retryAfter) result.retryAfter = this.retryAfter;

    return result;
  }
}

/**
 * Network-related errors (connection issues, timeouts, etc.)
 */
export class NetworkError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "network";
  readonly recoverable = true;

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
  }

  static fromAxiosError(error: any, correlationId?: string): NetworkError {
    let message = "Network error occurred";
    let code = "NETWORK_ERROR";
    const details: Record<string, unknown> = {};

    if (error.code) {
      code = error.code;
      switch (error.code) {
        case "ECONNABORTED":
          message =
            "Request timeout. Please check your connection and try again.";
          break;
        case "ENOTFOUND":
        case "ECONNREFUSED":
          message =
            "Unable to connect to analytics service. Please try again later.";
          break;
        case "ECONNRESET":
          message = "Connection was reset. Please try again.";
          break;
        default:
          message = error.message || message;
      }
    }

    if (error.config) {
      details.url = error.config.url;
      details.method = error.config.method;
      details.timeout = error.config.timeout;
    }

    const options: any = { code, details, retryAfter: 5 };
    if (correlationId) options.correlationId = correlationId;
    return new NetworkError(message, options);
  }
}

/**
 * Authentication-related errors (invalid tokens, expired sessions, etc.)
 */
export class AuthenticationError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "authentication";
  readonly recoverable = true; // Can be recovered by refreshing token

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
  }

  static fromHttpResponse(
    status: number,
    responseData: any,
    correlationId?: string,
  ): AuthenticationError {
    let message = "Authentication required. Please sign in and try again.";
    let code = "AUTH_REQUIRED";

    if (status === 401) {
      if (responseData?.error?.code === "TOKEN_EXPIRED") {
        message = "Your session has expired. Please sign in again.";
        code = "TOKEN_EXPIRED";
      } else if (responseData?.error?.code === "INVALID_TOKEN") {
        message = "Invalid authentication token. Please sign in again.";
        code = "INVALID_TOKEN";
      }
    }

    const options: any = {
      code,
      details: { status, responseData },
      retryAfter: 0,
    };
    if (correlationId) options.correlationId = correlationId;
    return new AuthenticationError(message, options);
  }
}

/**
 * Authorization-related errors (insufficient permissions, forbidden access, etc.)
 */
export class AuthorizationError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "authorization";
  readonly recoverable = false; // Cannot be recovered without permission changes

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
  }

  static fromHttpResponse(
    status: number,
    responseData: any,
    correlationId?: string,
  ): AuthorizationError {
    let message = "You do not have permission to access this analytics data.";
    let code = "INSUFFICIENT_PERMISSIONS";

    if (responseData?.error?.message) {
      message = responseData.error.message;
    }

    if (responseData?.error?.code) {
      code = responseData.error.code;
    }

    const options: any = { code, details: { status, responseData } };
    if (correlationId) options.correlationId = correlationId;
    return new AuthorizationError(message, options);
  }
}

/**
 * Validation-related errors (invalid parameters, malformed requests, etc.)
 */
export class ValidationError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "validation";
  readonly recoverable = false; // Cannot be recovered without fixing the request

  public readonly validationErrors?: ValidationErrorDetail[];

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      validationErrors?: ValidationErrorDetail[];
    } = {},
  ) {
    super(message, options);
    if (options.validationErrors)
      this.validationErrors = options.validationErrors;
  }

  static fromHttpResponse(
    status: number,
    responseData: any,
    correlationId?: string,
  ): ValidationError {
    let message =
      "Invalid request data. Please check your input and try again.";
    let code = "VALIDATION_ERROR";
    let validationErrors: ValidationErrorDetail[] | undefined;

    if (responseData?.error?.message) {
      message = responseData.error.message;
    }

    if (responseData?.error?.code) {
      code = responseData.error.code;
    }

    if (responseData?.error?.details?.validation_errors) {
      validationErrors = responseData.error.details.validation_errors;
    }

    const options: any = { code, details: { status, responseData } };
    if (correlationId) options.correlationId = correlationId;
    if (validationErrors) options.validationErrors = validationErrors;
    return new ValidationError(message, options);
  }
}

/**
 * Service-related errors (server errors, service unavailable, etc.)
 */
export class ServiceError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "service";
  readonly recoverable = true; // Most service errors are temporary

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
  }

  static fromHttpResponse(
    status: number,
    responseData: any,
    correlationId?: string,
  ): ServiceError {
    let message =
      "Analytics service is temporarily unavailable. Please try again later.";
    let code = "SERVICE_ERROR";
    let retryAfter: number | undefined;

    switch (status) {
      case 500:
        message = "Internal server error. Please try again later.";
        code = "INTERNAL_SERVER_ERROR";
        retryAfter = 30;
        break;
      case 502:
        message = "Service gateway error. Please try again later.";
        code = "BAD_GATEWAY";
        retryAfter = 15;
        break;
      case 503:
        message = "Service temporarily unavailable. Please try again later.";
        code = "SERVICE_UNAVAILABLE";
        retryAfter = 60;
        break;
      case 504:
        message = "Service timeout. Please try again later.";
        code = "GATEWAY_TIMEOUT";
        retryAfter = 30;
        break;
    }

    if (responseData?.error?.message) {
      message = responseData.error.message;
    }

    if (responseData?.error?.code) {
      code = responseData.error.code;
    }

    // Check for Retry-After header in response
    if (responseData?.retryAfter) {
      retryAfter = responseData.retryAfter;
    }

    const options: any = { code, details: { status, responseData } };
    if (correlationId) options.correlationId = correlationId;
    if (retryAfter) options.retryAfter = retryAfter;
    return new ServiceError(message, options);
  }
}

/**
 * Timeout-related errors (request timeouts, circuit breaker timeouts, etc.)
 */
export class TimeoutError extends BaseAnalyticsError {
  readonly type: AnalyticsServiceErrorType = "timeout";
  readonly recoverable = true;

  constructor(
    message: string,
    options: {
      correlationId?: string;
      code?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    } = {},
  ) {
    super(message, options);
  }

  static fromTimeout(timeoutMs: number, correlationId?: string): TimeoutError {
    const options: any = {
      code: "REQUEST_TIMEOUT",
      details: { timeoutMs },
      retryAfter: 10,
    };
    if (correlationId) options.correlationId = correlationId;
    return new TimeoutError(
      `Request timed out after ${timeoutMs}ms. Please try again.`,
      options,
    );
  }
}

// ============================================================================
// Error Factory and Classification
// ============================================================================

/**
 * Factory class for creating appropriate error instances
 */
export class AnalyticsErrorFactory {
  /**
   * Creates an error from an Axios error
   */
  static fromAxiosError(
    error: any,
    correlationId?: string,
  ): BaseAnalyticsError {
    // Network errors (no response received)
    if (!error.response) {
      return NetworkError.fromAxiosError(error, correlationId);
    }

    // HTTP error responses
    const status = error.response.status;
    const responseData = error.response.data;

    switch (true) {
      case status === 401:
        return AuthenticationError.fromHttpResponse(
          status,
          responseData,
          correlationId,
        );

      case status === 403:
        return AuthorizationError.fromHttpResponse(
          status,
          responseData,
          correlationId,
        );

      case status === 408:
        return TimeoutError.fromTimeout(
          error.config?.timeout || 30000,
          correlationId,
        );

      case status >= 400 && status < 500:
        return ValidationError.fromHttpResponse(
          status,
          responseData,
          correlationId,
        );

      case status >= 500:
        return ServiceError.fromHttpResponse(
          status,
          responseData,
          correlationId,
        );

      default:
        const options: any = {
          code: `HTTP_${status}`,
          details: { status, responseData },
        };
        if (correlationId) options.correlationId = correlationId;
        return new ServiceError("Unknown error occurred", options);
    }
  }

  /**
   * Creates an error from a generic error object
   */
  static fromError(error: unknown, correlationId?: string): BaseAnalyticsError {
    if (error instanceof BaseAnalyticsError) {
      return error;
    }

    if (error && typeof error === "object" && "isAxiosError" in error) {
      return this.fromAxiosError(error, correlationId);
    }

    if (error instanceof Error) {
      const options: any = {
        code: "UNKNOWN_ERROR",
        details: { originalError: error.name },
      };
      if (correlationId) options.correlationId = correlationId;
      return new ServiceError(error.message, options);
    }

    const options: any = {
      code: "UNKNOWN_ERROR",
      details: { originalError: error },
    };
    if (correlationId) options.correlationId = correlationId;
    return new ServiceError("An unknown error occurred", options);
  }

  /**
   * Creates an error from analytics service error format
   */
  static fromAnalyticsServiceError(
    error: AnalyticsServiceError,
  ): BaseAnalyticsError {
    const options: any = {};
    if (error.correlationId) options.correlationId = error.correlationId;
    if (error.code) options.code = error.code;
    if (error.details) options.details = error.details;
    if (error.retryAfter) options.retryAfter = error.retryAfter;

    switch (error.type) {
      case "network":
        return new NetworkError(error.message, options);
      case "authentication":
        return new AuthenticationError(error.message, options);
      case "authorization":
        return new AuthorizationError(error.message, options);
      case "validation":
        return new ValidationError(error.message, options);
      case "service":
        return new ServiceError(error.message, options);
      case "timeout":
        return new TimeoutError(error.message, options);
      default:
        return new ServiceError(error.message, options);
    }
  }
}

// ============================================================================
// Error Handler Class
// ============================================================================

/**
 * Centralized error handling and recovery logic
 */
export class AnalyticsErrorHandler {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  /**
   * Handles an error and determines recovery strategy
   */
  static async handleError(
    error: BaseAnalyticsError,
    context: {
      operation: string;
      attempt: number;
      maxAttempts?: number;
    },
  ): Promise<{
    shouldRetry: boolean;
    retryDelay: number;
    recoveryAction?: "refresh_token" | "fallback_cache" | "degrade_service";
  }> {
    const maxAttempts = context.maxAttempts || this.MAX_RETRY_ATTEMPTS;

    // Log error for monitoring
    this.logError(error, context);

    // Determine if we should retry
    const shouldRetry = this.shouldRetryError(
      error,
      context.attempt,
      maxAttempts,
    );

    // Calculate retry delay
    const retryDelay = this.calculateRetryDelay(error, context.attempt);

    // Determine recovery action
    const recoveryAction = this.determineRecoveryAction(error);

    const result: any = { shouldRetry, retryDelay };
    if (recoveryAction) result.recoveryAction = recoveryAction;
    return result;
  }

  /**
   * Determines if an error should be retried
   */
  private static shouldRetryError(
    error: BaseAnalyticsError,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= maxAttempts) {
      return false;
    }

    // Don't retry non-recoverable errors
    if (!error.recoverable) {
      return false;
    }

    // Special handling for authentication errors
    if (error instanceof AuthenticationError) {
      return attempt === 1; // Only retry once after token refresh
    }

    // Retry network, service, and timeout errors
    return (
      error instanceof NetworkError ||
      error instanceof ServiceError ||
      error instanceof TimeoutError
    );
  }

  /**
   * Calculates retry delay based on error type and attempt
   */
  private static calculateRetryDelay(
    error: BaseAnalyticsError,
    attempt: number,
  ): number {
    // Use error-specific retry delay if provided
    if (error.retryAfter !== undefined) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Use exponential backoff with jitter
    const baseDelay =
      this.RETRY_DELAYS[Math.min(attempt - 1, this.RETRY_DELAYS.length - 1)] ||
      1000;
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter

    return baseDelay + jitter;
  }

  /**
   * Determines recovery action based on error type
   */
  private static determineRecoveryAction(
    error: BaseAnalyticsError,
  ): "refresh_token" | "fallback_cache" | "degrade_service" | undefined {
    if (error instanceof AuthenticationError) {
      return "refresh_token";
    }

    if (error instanceof ServiceError || error instanceof NetworkError) {
      return "fallback_cache";
    }

    if (error instanceof TimeoutError) {
      return "degrade_service";
    }

    return undefined;
  }

  /**
   * Logs error for monitoring and debugging
   */
  private static logError(
    error: BaseAnalyticsError,
    context: { operation: string; attempt: number },
  ): void {
    const logData = {
      error: {
        type: error.type,
        message: error.message,
        code: error.code,
        correlationId: error.correlationId,
        recoverable: error.recoverable,
      },
      context,
      timestamp: error.timestamp,
    };

    // In development, log to console
    if (process.env.NODE_ENV === "development") {
      console.error("[AnalyticsService Error]", logData);
    }

    // In production, send to monitoring service
    // This would integrate with your monitoring/logging service
    if (process.env.NODE_ENV === "production") {
      // Example: sendToMonitoringService(logData)
    }
  }

  /**
   * Creates user-friendly error message
   */
  static getUserFriendlyMessage(error: BaseAnalyticsError): string {
    const baseMessages: Record<AnalyticsServiceErrorType, string> = {
      network:
        "Connection issue. Please check your internet connection and try again.",
      authentication: "Please sign in to access analytics data.",
      authorization: "You don't have permission to view this analytics data.",
      validation: "Invalid request. Please check your input and try again.",
      service:
        "Analytics service is temporarily unavailable. Please try again later.",
      timeout: "Request timed out. Please try again.",
    };

    return (
      error.message ||
      baseMessages[error.type] ||
      "An unexpected error occurred."
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if error is an analytics error
 */
export function isAnalyticsError(error: unknown): error is BaseAnalyticsError {
  return error instanceof BaseAnalyticsError;
}

/**
 * Type guard to check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  return isAnalyticsError(error) && error.recoverable;
}

/**
 * Extracts correlation ID from error
 */
export function getErrorCorrelationId(error: unknown): string | undefined {
  if (isAnalyticsError(error)) {
    return error.correlationId;
  }
  return undefined;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: BaseAnalyticsError): {
  error: AnalyticsServiceError;
  userMessage: string;
} {
  return {
    error: error.toAnalyticsServiceError(),
    userMessage: AnalyticsErrorHandler.getUserFriendlyMessage(error),
  };
}
