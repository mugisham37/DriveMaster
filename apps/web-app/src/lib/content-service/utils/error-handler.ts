/**
 * Error Handler Utilities
 *
 * Centralized error handling and transformation
 */

import type { ContentServiceError } from "../types";

export interface ErrorContext {
  operation: string;
  itemId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handles and transforms errors into ContentServiceError format
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
): ContentServiceError {
  const baseError: ContentServiceError = {
    name: "ContentServiceError",
    message: "An error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };

  if (error instanceof Error) {
    baseError.message = error.message;
    baseError.name = error.name;

    // Check if it's already a ContentServiceError
    const serviceError = error as ContentServiceError;
    if ("code" in error && serviceError.code) {
      baseError.code = serviceError.code;
    }
    if ("statusCode" in error && serviceError.statusCode) {
      baseError.statusCode = serviceError.statusCode;
    }
    if ("details" in error) {
      baseError.details = serviceError.details;
    }
  } else if (typeof error === "string") {
    baseError.message = error;
  }

  // Add context
  baseError.details = {
    ...(baseError.details as Record<string, unknown> | undefined),
    context,
  };

  return baseError;
}

/**
 * Checks if an error is recoverable
 */
export function isRecoverableError(error: ContentServiceError): boolean {
  const recoverableCodes = [
    "NETWORK_ERROR",
    "TIMEOUT_ERROR",
    "RATE_LIMIT_ERROR",
    "SERVICE_UNAVAILABLE",
  ];

  return recoverableCodes.includes(error.code || "");
}

/**
 * Gets a user-friendly error message
 */
export function getUserFriendlyMessage(error: ContentServiceError): string {
  const messages: Record<string, string> = {
    NETWORK_ERROR:
      "Unable to connect to the server. Please check your internet connection.",
    TIMEOUT_ERROR: "The request took too long to complete. Please try again.",
    AUTHORIZATION_ERROR: "You do not have permission to perform this action.",
    NOT_FOUND: "The requested content was not found.",
    CONFLICT_ERROR: "This operation conflicts with an existing resource.",
    VALIDATION_ERROR: "The provided data is invalid.",
    RATE_LIMIT_ERROR: "Too many requests. Please wait a moment and try again.",
    SERVER_ERROR: "An internal server error occurred. Please try again later.",
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  };

  return messages[error.code || "UNKNOWN_ERROR"] || error.message;
}

/**
 * Logs an error with appropriate severity
 */
export function logError(
  error: ContentServiceError,
  context: ErrorContext,
): void {
  const severity =
    error.statusCode && error.statusCode >= 500 ? "error" : "warn";

  console[severity]("[ContentService Error]", {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context,
    details: error.details,
  });
}

/**
 * ErrorHandler class for comprehensive API error handling
 */
export class ErrorHandler {
  private static errorStats: Record<string, { count: number; lastOccurred: Date }> = {};

  static handleApiError(
    error: unknown,
    context?: { url?: string; method?: string; correlationId?: string },
  ) {
    const contentError = handleError(error, {
      operation: "api_call",
      ...(context && { metadata: context }),
    });

    // Track error statistics
    if (contentError.code) {
      const stats = this.errorStats[contentError.code];
      if (!stats) {
        this.errorStats[contentError.code] = { count: 1, lastOccurred: new Date() };
      } else {
        stats.count++;
        stats.lastOccurred = new Date();
      }
    }

    return {
      error: contentError,
      technicalMessage: `${contentError.code}: ${contentError.message}`,
      userMessage: getUserFriendlyMessage(contentError),
      recoveryStrategy: {
        type: isRecoverableError(contentError) ? "retry" : "abort",
        retryAfter: contentError.retryAfter,
      },
    };
  }

  static getErrorStats() {
    return { ...this.errorStats };
  }

  static resetErrorTracking(errorType?: string) {
    if (errorType) {
      delete this.errorStats[errorType];
    } else {
      this.errorStats = {};
    }
  }
}
