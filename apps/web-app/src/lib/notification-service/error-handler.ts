/**
 * Notification Service Error Handler
 * Comprehensive error classification, transformation, and handling system
 */

import type {
  NotificationError,
  NotificationErrorType,
  ErrorContext,
  ErrorHandlingResult,
} from "@/types/notification-service";
import { integratedTokenManager } from "@/lib/auth";
import { createCorrelationId } from "@/lib/config/notification-service";

// ============================================================================
// Error Classification System
// ============================================================================

export class NotificationErrorHandler {
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, Date>();
  private readonly maxErrorHistory = 100;
  private readonly errorCountWindow = 5 * 60 * 1000; // 5 minutes

  /**
   * Main error handling entry point
   */
  async handleError(
    error: unknown,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const classifiedError = this.classifyError(error, context);

    // Log error with correlation ID
    this.logError(classifiedError, context);

    // Update error statistics
    this.updateErrorStats(classifiedError, context);

    // Determine handling strategy based on error type
    return this.determineHandlingStrategy(classifiedError, context);
  }

  /**
   * Classify error into notification service error types
   */
  classifyError(error: unknown, context: ErrorContext): NotificationError {
    const correlationId = context.correlationId || createCorrelationId();
    const timestamp = new Date();

    // Handle axios/fetch errors
    if (this.isHttpError(error)) {
      return this.classifyHttpError(error, correlationId, timestamp);
    }

    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.createNetworkError(error, correlationId, timestamp);
    }

    // Handle authentication errors
    if (this.isAuthenticationError(error)) {
      return this.createAuthenticationError(error, correlationId, timestamp);
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.createValidationError(error, correlationId, timestamp);
    }

    // Handle WebSocket errors
    if (this.isWebSocketError(error)) {
      return this.createWebSocketError(error, correlationId, timestamp);
    }

    // Handle template errors
    if (this.isTemplateError(error)) {
      return this.createTemplateError(error, correlationId, timestamp);
    }

    // Handle device token errors
    if (this.isDeviceTokenError(error)) {
      return this.createDeviceTokenError(error, correlationId, timestamp);
    }

    // Handle quota/rate limiting errors
    if (this.isQuotaError(error)) {
      return this.createQuotaError(error, correlationId, timestamp);
    }

    // Default to service error
    return this.createServiceError(error, correlationId, timestamp);
  }

  /**
   * Determine error handling strategy
   */
  private async determineHandlingStrategy(
    error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    switch (error.type) {
      case "network":
        return this.handleNetworkError(error, context);

      case "authentication":
        return this.handleAuthenticationError(error, context);

      case "validation":
        return this.handleValidationError(error, context);

      case "service":
        return this.handleServiceError(error, context);

      case "quota":
        return this.handleQuotaError(error, context);

      case "websocket":
        return this.handleWebSocketError(error, context);

      case "template":
        return this.handleTemplateError(error, context);

      case "device":
        return this.handleDeviceTokenError(error, context);

      case "permission":
        return this.handlePermissionError(error, context);

      default:
        return this.handleUnknownError(error, context);
    }
  }

  // ============================================================================
  // Error Type Detection
  // ============================================================================

  private isHttpError(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        ("response" in error || "status" in error || "statusCode" in error),
    );
  }

  private isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const errorMessage = (error as Error).message?.toLowerCase() || "";
    const errorCode = (error as Record<string, unknown>).code || "";

    return (
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("fetch") ||
      errorCode === "ECONNABORTED" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ECONNREFUSED" ||
      errorCode === "ETIMEDOUT"
    );
  }

  private isAuthenticationError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const err = error as Record<string, unknown>;
    const status =
      (err.response as Record<string, unknown> | undefined)?.status ||
      err.status;
    const errorMessage = (error as Error).message?.toLowerCase() || "";

    return (
      status === 401 ||
      status === 403 ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("token") ||
      errorMessage.includes("authentication")
    );
  }

  private isValidationError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const err = error as Record<string, unknown>;
    const status =
      (err.response as Record<string, unknown> | undefined)?.status ||
      err.status;
    const errorMessage = (error as Error).message?.toLowerCase() || "";

    return (
      status === 400 ||
      status === 422 ||
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required") ||
      errorMessage.includes("malformed")
    );
  }

  private isWebSocketError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const err = error as Record<string, unknown>;
    const errorMessage = (error as Error).message?.toLowerCase() || "";
    const errorType = err.type || "";
    const target = err.target as Record<string, unknown> | undefined;

    return (
      errorMessage.includes("websocket") ||
      errorMessage.includes("ws") ||
      errorType === "websocket" ||
      (target?.constructor as Record<string, unknown> | undefined)?.name ===
        "WebSocket"
    );
  }

  private isTemplateError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const errorMessage = (error as Error).message?.toLowerCase() || "";

    return (
      errorMessage.includes("template") ||
      errorMessage.includes("render") ||
      errorMessage.includes("variable") ||
      errorMessage.includes("substitution")
    );
  }

  private isDeviceTokenError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const errorMessage = (error as Error).message?.toLowerCase() || "";

    return (
      errorMessage.includes("device token") ||
      errorMessage.includes("push notification") ||
      errorMessage.includes("fcm") ||
      errorMessage.includes("apns") ||
      errorMessage.includes("vapid")
    );
  }

  private isQuotaError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const err = error as Record<string, unknown>;
    const status =
      (err.response as Record<string, unknown> | undefined)?.status ||
      err.status;
    const errorMessage = (error as Error).message?.toLowerCase() || "";

    return (
      status === 429 ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("too many requests")
    );
  }

  // ============================================================================
  // Error Creation Methods
  // ============================================================================

  private classifyHttpError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;
    const status = (response?.status as number) || (err.status as number) || 0;
    const data = (response?.data as Record<string, unknown>) || {};
    const message =
      (data.message as string) ||
      (err.message as string) ||
      "HTTP request failed";

    const notificationError: NotificationError = {
      type: this.getErrorTypeFromHttpStatus(status),
      message: this.generateUserFriendlyMessage(message, status),
      code: (data.code as string) || `HTTP_${status}`,
      details: {
        status,
        url:
          (err.config as Record<string, unknown>)?.url ||
          (err.request as Record<string, unknown>)?.url,
        method:
          (err.config as Record<string, unknown>)?.method ||
          (err.request as Record<string, unknown>)?.method,
        ...((data.details as Record<string, unknown>) || {}),
      },
      recoverable: this.isRecoverableHttpStatus(status),
      correlationId,
      timestamp,
    };

    // Add retry-after header if present
    const retryAfter = this.extractRetryAfter(
      response?.headers as Record<string, unknown> | undefined,
    );
    if (retryAfter !== undefined) {
      notificationError.retryAfter = retryAfter;
    }

    return notificationError;
  }

  private createNetworkError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    return {
      type: "network",
      message:
        "Unable to connect to notification service. Please check your internet connection.",
      code: (err.code as string) || "NETWORK_ERROR",
      details: {
        originalMessage: err.message as string,
        timeout: err.code === "ECONNABORTED",
      },
      recoverable: true,
      correlationId,
      timestamp,
    };
  }

  private createAuthenticationError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;
    return {
      type: "authentication",
      message: "Authentication failed. Please sign in again.",
      code: "AUTH_ERROR",
      details: {
        originalMessage: err.message as string,
        status: (response?.status as number) || (err.status as number),
      },
      recoverable: true,
      correlationId,
      timestamp,
    };
  }

  private createValidationError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    const details = (data?.details as Record<string, unknown>) || {};

    return {
      type: "validation",
      message: this.generateValidationErrorMessage(
        err.message as string,
        details,
      ),
      code: "VALIDATION_ERROR",
      details: {
        originalMessage: err.message as string,
        validationErrors: details,
        status: (response?.status as number) || (err.status as number),
      },
      recoverable: false,
      correlationId,
      timestamp,
    };
  }

  private createWebSocketError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    const target = err.target as Record<string, unknown> | undefined;
    return {
      type: "websocket",
      message: "Real-time connection lost. Notifications may be delayed.",
      code: "WEBSOCKET_ERROR",
      details: {
        originalMessage: err.message,
        readyState: target?.readyState,
        url: target?.url,
      },
      recoverable: true,
      correlationId,
      timestamp,
    };
  }

  private createTemplateError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    return {
      type: "template",
      message:
        "Notification template error. Please try again or contact support.",
      code: "TEMPLATE_ERROR",
      details: {
        originalMessage: err.message,
      },
      recoverable: false,
      correlationId,
      timestamp,
    };
  }

  private createDeviceTokenError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    return {
      type: "device",
      message: "Device registration failed. Push notifications may not work.",
      code: "DEVICE_TOKEN_ERROR",
      details: {
        originalMessage: err.message,
      },
      recoverable: true,
      correlationId,
      timestamp,
    };
  }

  private createQuotaError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;
    const retryAfter = this.extractRetryAfter(
      response?.headers as Record<string, unknown> | undefined,
    );

    return {
      type: "quota",
      message: "Rate limit exceeded. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      details: {
        originalMessage: err.message,
        status: (response?.status as number) || (err.status as number),
      },
      recoverable: true,
      retryAfter,
      correlationId,
      timestamp,
    };
  }

  private createServiceError(
    error: unknown,
    correlationId: string,
    timestamp: Date,
  ): NotificationError {
    const err = error as Record<string, unknown>;
    return {
      type: "service",
      message:
        "Notification service is temporarily unavailable. Please try again later.",
      code: "SERVICE_ERROR",
      details: {
        originalMessage: (err.message as string) || "Unknown service error",
      },
      recoverable: true,
      correlationId,
      timestamp,
    };
  }

  // ============================================================================
  // Error Handling Strategies
  // ============================================================================

  private async handleNetworkError(
    _error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

      return {
        shouldRetry: true,
        retryDelay: delay,
        userMessage: "Connection issue detected. Retrying...",
        fallbackAction: "show_cached_data",
      };
    }

    return {
      shouldRetry: false,
      userMessage:
        "Unable to connect to notification service. Using cached data.",
      fallbackAction: "show_cached_data",
    };
  }

  private async handleAuthenticationError(
    _error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;

    if (retryCount === 0) {
      try {
        // Attempt token refresh
        await integratedTokenManager.forceRefresh();

        return {
          shouldRetry: true,
          retryDelay: 0,
          userMessage: "Refreshing authentication...",
        };
      } catch {
        return {
          shouldRetry: false,
          userMessage: "Please sign in again to continue.",
          fallbackAction: "redirect_to_login",
        };
      }
    }

    return {
      shouldRetry: false,
      userMessage: "Authentication failed. Please sign in again.",
      fallbackAction: "redirect_to_login",
    };
  }

  private async handleValidationError(
    error: NotificationError,
    // Context is not used but kept for interface consistency
    _context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    return {
      shouldRetry: false,
      userMessage: error.message,
      fallbackAction: "show_validation_errors",
    };
  }

  private async handleServiceError(
    error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;
    const maxRetries = 2;

    if (retryCount < maxRetries && error.recoverable) {
      const delay = Math.min(2000 * Math.pow(2, retryCount), 15000); // Exponential backoff, max 15s

      return {
        shouldRetry: true,
        retryDelay: delay,
        userMessage: "Service temporarily unavailable. Retrying...",
        fallbackAction: "show_cached_data",
      };
    }

    return {
      shouldRetry: false,
      userMessage:
        "Notification service is currently unavailable. Please try again later.",
      fallbackAction: "show_cached_data",
    };
  }

  private async handleQuotaError(
    error: NotificationError,
    // Context is not used but kept for interface consistency
    _context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryAfter = error.retryAfter || 60000; // Default 1 minute

    return {
      shouldRetry: true,
      retryDelay: retryAfter,
      userMessage: `Rate limit exceeded. Retrying in ${Math.ceil(retryAfter / 1000)} seconds.`,
      fallbackAction: "show_cached_data",
    };
  }

  private async handleWebSocketError(
    _error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;
    const maxRetries = 5;

    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s

      return {
        shouldRetry: true,
        retryDelay: delay,
        userMessage: "Reconnecting to real-time notifications...",
        fallbackAction: "use_polling_fallback",
      };
    }

    return {
      shouldRetry: false,
      userMessage:
        "Real-time notifications unavailable. Using periodic updates.",
      fallbackAction: "use_polling_fallback",
    };
  }

  private async handleTemplateError(
    _error: NotificationError,
    _context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    return {
      shouldRetry: false,
      userMessage:
        "Notification template error. Please contact support if this persists.",
      fallbackAction: "use_fallback_template",
    };
  }

  private async handleDeviceTokenError(
    _error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;

    if (retryCount < 2) {
      return {
        shouldRetry: true,
        retryDelay: 5000,
        userMessage: "Retrying device registration...",
        fallbackAction: "disable_push_notifications",
      };
    }

    return {
      shouldRetry: false,
      userMessage:
        "Push notifications could not be enabled. You can still receive in-app notifications.",
      fallbackAction: "disable_push_notifications",
    };
  }

  private async handlePermissionError(
    _error: NotificationError,
    _context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    return {
      shouldRetry: false,
      userMessage:
        "Permission denied. Please check your notification settings.",
      fallbackAction: "show_permission_guide",
    };
  }

  private async handleUnknownError(
    _error: NotificationError,
    context: ErrorContext,
  ): Promise<ErrorHandlingResult> {
    const retryCount = context.retryCount || 0;

    if (retryCount < 1) {
      return {
        shouldRetry: true,
        retryDelay: 2000,
        userMessage: "An unexpected error occurred. Retrying...",
        fallbackAction: "show_cached_data",
      };
    }

    return {
      shouldRetry: false,
      userMessage: "An unexpected error occurred. Please try again later.",
      fallbackAction: "show_cached_data",
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getErrorTypeFromHttpStatus(status: number): NotificationErrorType {
    if (status === 401 || status === 403) return "authentication";
    if (status === 400 || status === 422) return "validation";
    if (status === 429) return "quota";
    if (status >= 500) return "service";
    return "service";
  }

  private isRecoverableHttpStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408 || status === 503;
  }

  private extractRetryAfter(
    headers?: Record<string, unknown>,
  ): number | undefined {
    if (!headers) return undefined;
    const retryAfter = headers["retry-after"] || headers["Retry-After"];
    if (retryAfter && typeof retryAfter === "string") {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000;
    }
    return undefined;
  }

  private generateUserFriendlyMessage(
    originalMessage: string,
    status?: number,
  ): string {
    const lowerMessage = originalMessage.toLowerCase();

    // Network-related messages
    if (
      lowerMessage.includes("network") ||
      lowerMessage.includes("connection")
    ) {
      return "Connection problem. Please check your internet connection and try again.";
    }

    // Authentication messages
    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden")
    ) {
      return "Authentication required. Please sign in to continue.";
    }

    // Validation messages
    if (
      lowerMessage.includes("validation") ||
      lowerMessage.includes("invalid")
    ) {
      return "Invalid data provided. Please check your input and try again.";
    }

    // Rate limiting messages
    if (
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many")
    ) {
      return "Too many requests. Please wait a moment before trying again.";
    }

    // Server error messages
    if (status && status >= 500) {
      return "Service temporarily unavailable. Please try again in a few moments.";
    }

    // Default fallback
    return "An error occurred. Please try again or contact support if the problem persists.";
  }

  private generateValidationErrorMessage(
    originalMessage: string,
    details: Record<string, unknown>,
  ): string {
    if (details && typeof details === "object") {
      const fieldErrors = Object.entries(details)
        .map(([field, error]) => `${field}: ${String(error)}`)
        .join(", ");

      if (fieldErrors) {
        return `Validation failed: ${fieldErrors}`;
      }
    }

    return this.generateUserFriendlyMessage(originalMessage);
  }

  private logError(error: NotificationError, context: ErrorContext): void {
    const logData = {
      type: error.type,
      message: error.message,
      code: error.code,
      correlationId: error.correlationId,
      context: {
        operation: context.operation,
        userId: context.userId,
        notificationId: context.notificationId,
        retryCount: context.retryCount,
      },
      details: error.details,
      timestamp: error.timestamp,
    };

    if (error.type === "validation" || error.type === "permission") {
      console.warn("Notification Service Warning:", logData);
    } else {
      console.error("Notification Service Error:", logData);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with error tracking service (e.g., Sentry, Bugsnag)
      // errorTrackingService.captureError(error, context)
    }
  }

  private updateErrorStats(
    error: NotificationError,
    context: ErrorContext,
  ): void {
    const key = `${error.type}:${context.operation}`;
    const now = Date.now();

    // Clean old entries
    this.cleanupOldErrorStats(now);

    // Update counts
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
    this.lastErrors.set(key, new Date(now));

    // Limit memory usage
    if (this.errorCounts.size > this.maxErrorHistory) {
      const oldestKey = Array.from(this.errorCounts.keys())[0];
      if (oldestKey) {
        this.errorCounts.delete(oldestKey);
        this.lastErrors.delete(oldestKey);
      }
    }
  }

  private cleanupOldErrorStats(now: number): void {
    for (const [key, timestamp] of this.lastErrors) {
      if (now - timestamp.getTime() > this.errorCountWindow) {
        this.errorCounts.delete(key);
        this.lastErrors.delete(key);
      }
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: Array<{ key: string; count: number; lastSeen: Date }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    const errorsByType: Record<string, number> = {};
    const recentErrors: Array<{ key: string; count: number; lastSeen: Date }> =
      [];

    for (const [key, count] of this.errorCounts) {
      const [type] = key.split(":");
      if (type) {
        errorsByType[type] = (errorsByType[type] || 0) + count;
      }

      const lastSeen = this.lastErrors.get(key)!;
      recentErrors.push({ key, count, lastSeen });
    }

    return {
      totalErrors,
      errorsByType,
      recentErrors: recentErrors.sort(
        (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
      ),
    };
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const notificationErrorHandler = new NotificationErrorHandler();
export default notificationErrorHandler;
