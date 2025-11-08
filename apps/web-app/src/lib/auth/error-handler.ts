/**
 * Comprehensive Error Handling System for Authentication
 * Implements error classification, user-friendly messages, and recovery suggestions
 */

import type { AuthError, AuthErrorType } from "../../types/auth-service";

/**
 * Error classification utilities
 */
export class ErrorClassifier {
  /**
   * Classify error based on various indicators
   */
  static classifyError(error: unknown, context?: string): AuthErrorType {
    // If already classified, return the type
    if (error && typeof error === "object" && "type" in error) {
      return (error as AuthError).type;
    }

    // Network-related errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return "network";
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Timeout errors
      if (error.name === "AbortError" || message.includes("timeout")) {
        return "network";
      }

      // Connection errors
      if (
        message.includes("network") ||
        message.includes("connection") ||
        message.includes("offline")
      ) {
        return "network";
      }

      // Authentication errors
      if (
        message.includes("unauthorized") ||
        message.includes("invalid credentials") ||
        message.includes("token")
      ) {
        return "authentication";
      }

      // Authorization errors
      if (
        message.includes("forbidden") ||
        message.includes("permission") ||
        message.includes("access denied")
      ) {
        return "authorization";
      }

      // OAuth errors
      if (
        message.includes("oauth") ||
        message.includes("provider") ||
        (context && context.includes("oauth"))
      ) {
        return "oauth";
      }

      // Validation errors
      if (
        message.includes("validation") ||
        message.includes("invalid") ||
        message.includes("required")
      ) {
        return "validation";
      }
    }

    // HTTP status code based classification
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status: number }).status;

      if (status >= 400 && status < 500) {
        if (status === 401) return "authentication";
        if (status === 403) return "authorization";
        if (status === 422) return "validation";
        return "validation";
      }

      if (status >= 500) {
        return "server";
      }
    }

    // Default to server error for unknown errors
    return "server";
  }

  /**
   * Extract error details from various error formats
   */
  static extractErrorDetails(error: unknown): Partial<AuthError> {
    if (!error) {
      return { message: "Unknown error occurred" };
    }

    // Already formatted AuthError
    if (typeof error === "object" && "type" in error && "message" in error) {
      return error as AuthError;
    }

    // Standard Error object
    if (error instanceof Error) {
      return {
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }

    // HTTP Response error
    if (typeof error === "object" && "response" in error) {
      const response = (
        error as {
          response: { data?: unknown; status?: number; statusText?: string };
        }
      ).response;
      const result: Partial<AuthError> = {
        message: response.statusText || "HTTP Error",
      };

      if (response.status) {
        result.code = response.status.toString();
      }

      if (response.data) {
        result.details = response.data as Record<string, unknown>;
      }

      return result;
    }

    // String error
    if (typeof error === "string") {
      return { message: error };
    }

    // Generic object
    if (typeof error === "object") {
      return {
        message: "message" in error ? String(error.message) : "Unknown error",
        details:
          error && typeof error === "object"
            ? (error as Record<string, unknown>)
            : { error: String(error) },
      };
    }

    return { message: String(error) };
  }
}

/**
 * User-friendly error message generator
 */
export class ErrorMessageGenerator {
  private static readonly ERROR_MESSAGES: Record<
    AuthErrorType,
    Record<string, string>
  > = {
    network: {
      default:
        "Connection problem. Please check your internet connection and try again.",
      timeout: "Request timed out. Please try again.",
      offline: "You appear to be offline. Please check your connection.",
      dns: "Unable to reach the server. Please try again later.",
      cors: "Connection blocked by security policy. Please contact support.",
    },
    validation: {
      default: "Please check your input and try again.",
      email: "Please enter a valid email address.",
      password: "Password does not meet requirements.",
      required: "This field is required.",
      format: "Invalid format. Please check your input.",
      length: "Input length is invalid.",
    },
    authentication: {
      default: "Authentication failed. Please try again.",
      INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
      TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
      TOKEN_INVALID: "Invalid session. Please sign in again.",
      ACCOUNT_LOCKED:
        "Your account has been temporarily locked. Please try again later.",
      EMAIL_NOT_VERIFIED: "Please verify your email address before signing in.",
    },
    authorization: {
      default: "You don't have permission to access this resource.",
      INSUFFICIENT_PERMISSIONS:
        "You don't have sufficient permissions for this action.",
      MENTOR_REQUIRED: "This feature is only available to mentors.",
      INSIDER_REQUIRED: "This feature is only available to insiders.",
    },
    oauth: {
      default: "Social login failed. Please try again.",
      OAUTH_DENIED: "Authorization was cancelled. Please try again.",
      OAUTH_ERROR: "Social login encountered an error. Please try again.",
      PROVIDER_ERROR:
        "The login provider is currently unavailable. Please try again later.",
      STATE_MISMATCH: "Security validation failed. Please try again.",
      INVALID_CODE: "Invalid authorization code. Please try again.",
    },
    server: {
      default: "Something went wrong on our end. Please try again later.",
      INTERNAL_ERROR: "Internal server error. Please try again later.",
      SERVICE_UNAVAILABLE:
        "Service is temporarily unavailable. Please try again later.",
      RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
    },
  };

  /**
   * Generate user-friendly error message
   */
  static generateMessage(error: AuthError): string {
    const typeMessages = this.ERROR_MESSAGES[error.type];

    if (error.code && typeMessages[error.code]) {
      return typeMessages[error.code]!;
    }

    return typeMessages.default!;
  }

  /**
   * Generate recovery suggestions
   */
  static generateRecoverySuggestions(error: AuthError): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case "network":
        suggestions.push("Check your internet connection");
        suggestions.push("Try refreshing the page");
        if (error.retryAfter) {
          suggestions.push(`Wait ${error.retryAfter} seconds and try again`);
        }
        break;

      case "validation":
        if (error.field) {
          suggestions.push(`Check the ${error.field} field`);
        }
        suggestions.push("Verify all required fields are filled");
        suggestions.push("Check input format requirements");
        break;

      case "authentication":
        suggestions.push("Verify your email and password");
        suggestions.push("Try signing in again");
        if (error.code === "EMAIL_NOT_VERIFIED") {
          suggestions.push("Check your email for verification link");
        }
        break;

      case "authorization":
        suggestions.push("Contact support if you believe this is an error");
        if (error.code === "MENTOR_REQUIRED") {
          suggestions.push("Apply to become a mentor");
        }
        break;

      case "oauth":
        suggestions.push("Try a different login method");
        suggestions.push("Clear browser cookies and try again");
        suggestions.push("Check if the provider service is working");
        break;

      case "server":
        suggestions.push("Try again in a few minutes");
        suggestions.push("Contact support if the problem persists");
        if (error.code === "RATE_LIMITED") {
          suggestions.push("Wait before making more requests");
        }
        break;
    }

    return suggestions;
  }
}

/**
 * Error logging with sensitive data sanitization
 */
export class ErrorLogger {
  private static readonly SENSITIVE_FIELDS = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "session",
    "secret",
    "key",
    "credential",
  ];

  /**
   * Sanitize error data by removing sensitive information
   */
  static sanitizeError(error: unknown): unknown {
    if (!error || typeof error !== "object") {
      return error;
    }

    const errorObj = error as Record<string, unknown>;
    const sanitized = { ...errorObj };

    // Remove sensitive fields
    for (const field of this.SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === "object") {
        sanitized[key] = this.sanitizeError(value);
      }
    }

    return sanitized;
  }

  /**
   * Log error with context and sanitization
   */
  static logError(
    error: AuthError,
    context?: string,
    additionalData?: Record<string, unknown>,
  ): void {
    const sanitizedError = this.sanitizeError(error);
    const sanitizedData = additionalData
      ? this.sanitizeError(additionalData)
      : undefined;

    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      type: error.type,
      message: error.message,
      error: sanitizedError,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    if (error.code) {
      logEntry.code = error.code;
    }

    if (context) {
      logEntry.context = context;
    }

    if (sanitizedData) {
      logEntry.additionalData = sanitizedData;
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Auth Error:", logEntry);
    }

    // In production, you would send this to your logging service
    // Example: sendToLoggingService(logEntry)
  }
}

/**
 * Main error handler class that orchestrates error processing
 */
export class AuthErrorHandler {
  /**
   * Process and normalize any error into a standardized AuthError
   */
  static processError(error: unknown, context?: string): AuthError {
    const type = ErrorClassifier.classifyError(error, context);
    const details = ErrorClassifier.extractErrorDetails(error);

    const retryDelay = this.getRetryDelay(type, details.code);

    const authError: AuthError = {
      type,
      message: details.message || "Unknown error occurred",
      recoverable: this.isRecoverable(type, details.code),
      ...(details.code && { code: details.code }),
      ...(details.details && { details: details.details }),
      ...(retryDelay !== undefined && { retryAfter: retryDelay }),
      ...(details.field && { field: details.field }),
    };

    // Generate user-friendly message
    const friendlyMessage = ErrorMessageGenerator.generateMessage(authError);
    authError.message = friendlyMessage;

    // Log the error
    ErrorLogger.logError(authError, context);

    return authError;
  }

  /**
   * Determine if an error is recoverable
   */
  private static isRecoverable(type: AuthErrorType, code?: string): boolean {
    switch (type) {
      case "network":
        return true;
      case "validation":
        return true;
      case "authentication":
        return code !== "ACCOUNT_LOCKED";
      case "authorization":
        return false;
      case "oauth":
        return code !== "PROVIDER_ERROR";
      case "server":
        return code !== "INTERNAL_ERROR";
      default:
        return false;
    }
  }

  /**
   * Get retry delay for recoverable errors
   */
  private static getRetryDelay(
    type: AuthErrorType,
    code?: string,
  ): number | undefined {
    switch (type) {
      case "network":
        return 5; // 5 seconds
      case "server":
        if (code === "RATE_LIMITED") return 60; // 1 minute
        return 30; // 30 seconds
      default:
        return undefined;
    }
  }

  /**
   * Get recovery suggestions for an error
   */
  static getRecoverySuggestions(error: AuthError): string[] {
    return ErrorMessageGenerator.generateRecoverySuggestions(error);
  }

  /**
   * Check if error should trigger circuit breaker
   */
  static shouldTriggerCircuitBreaker(error: AuthError): boolean {
    return (
      error.type === "network" ||
      error.type === "server" ||
      (error.type === "oauth" && error.code === "PROVIDER_ERROR")
    );
  }
}
