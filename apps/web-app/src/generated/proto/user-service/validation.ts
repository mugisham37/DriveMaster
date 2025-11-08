// Runtime type validation utilities for user-service types
// This file is auto-generated. Do not edit manually.

import { UserServiceError } from "../../../types/user-service";

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Type guards for runtime validation
export const isValidUserId = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    /^[a-zA-Z0-9-_]+$/.test(value)
  );
};

export const isValidEmail = (value: unknown): value is string => {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidTimezone = (value: unknown): value is string => {
  return typeof value === "string" && value.length > 0;
};

export const isValidLanguage = (value: unknown): value is string => {
  return typeof value === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(value);
};

export const isValidMastery = (value: unknown): value is number => {
  return typeof value === "number" && value >= 0 && value <= 1;
};

export const isValidConfidence = (value: unknown): value is number => {
  return typeof value === "number" && value >= 0 && value <= 1;
};

// Response validation
export const validateUserServiceResponse = <T>(
  response: unknown,
  validator: (data: unknown) => data is T,
): T => {
  if (!response || typeof response !== "object") {
    throw new ValidationError("Invalid response format");
  }

  const responseObj = response as Record<string, unknown>;

  if ("error" in responseObj && responseObj.error) {
    const error = responseObj.error as UserServiceError;
    throw new Error(error.message || "User service error");
  }

  if (!("data" in responseObj) || !validator(responseObj.data)) {
    throw new ValidationError("Invalid response data format");
  }

  return responseObj.data as T;
};

// Request validation
export const validateGetUserRequest = (request: unknown): boolean => {
  if (!request || typeof request !== "object") return false;
  const req = request as Record<string, unknown>;
  return "userId" in req && isValidUserId(req.userId);
};

export const validateUpdateUserRequest = (request: unknown): boolean => {
  if (!request || typeof request !== "object") return false;
  const req = request as Record<string, unknown>;

  if (!("userId" in req) || !isValidUserId(req.userId)) return false;
  if (!("version" in req) || typeof req.version !== "number") return false;

  // Optional fields validation
  if (
    "timezone" in req &&
    req.timezone !== undefined &&
    !isValidTimezone(req.timezone)
  )
    return false;
  if (
    "language" in req &&
    req.language !== undefined &&
    !isValidLanguage(req.language)
  )
    return false;

  return true;
};

export const validateMasteryUpdate = (request: unknown): boolean => {
  if (!request || typeof request !== "object") return false;
  const req = request as Record<string, unknown>;

  return (
    "userId" in req &&
    isValidUserId(req.userId) &&
    "topic" in req &&
    typeof req.topic === "string" &&
    "mastery" in req &&
    isValidMastery(req.mastery)
  );
};

export const validateActivityRecord = (request: unknown): boolean => {
  if (!request || typeof request !== "object") return false;
  const req = request as Record<string, unknown>;

  return (
    "userId" in req &&
    isValidUserId(req.userId) &&
    "activityType" in req &&
    typeof req.activityType === "string" &&
    "timestamp" in req &&
    (req.timestamp instanceof Date || typeof req.timestamp === "string")
  );
};

// Error classification utilities
export const classifyError = (error: unknown): UserServiceError["type"] => {
  if (error instanceof ValidationError) {
    return "validation";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("cors") ||
      message.includes("dns")
    ) {
      return "network";
    }

    // Timeout errors
    if (
      message.includes("timeout") ||
      message.includes("aborted") ||
      message.includes("deadline")
    ) {
      return "timeout";
    }

    // Authorization errors
    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("401") ||
      message.includes("403") ||
      message.includes("token") ||
      message.includes("auth")
    ) {
      return "authorization";
    }

    // Circuit breaker errors
    if (
      message.includes("circuit") ||
      message.includes("breaker") ||
      message.includes("unavailable")
    ) {
      return "circuit_breaker";
    }

    // Service errors (5xx status codes)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("internal server error")
    ) {
      return "service";
    }
  }

  return "service"; // Default fallback
};

// Error transformation utilities
export const transformUserServiceError = (
  error: unknown,
  correlationId?: string,
): UserServiceError => {
  const type = classifyError(error);

  if (error instanceof ValidationError) {
    const result: UserServiceError = {
      type: "validation",
      message: error.message,
      recoverable: true,
    };

    if (error.field) {
      result.details = { field: error.field };
    }

    if (correlationId) {
      result.correlationId = correlationId;
    }

    return result;
  }

  if (error instanceof Error) {
    const code = extractErrorCode(error);
    const details = extractErrorDetails(error);

    const baseError: Partial<UserServiceError> = {
      type,
      ...(correlationId && { correlationId }),
      ...(code && { code }),
      ...(details && { details }),
    };

    switch (type) {
      case "network":
        return {
          ...baseError,
          type: "network",
          message:
            "Network connection failed. Please check your internet connection.",
          recoverable: true,
          retryAfter: 3,
        } as UserServiceError;

      case "timeout":
        return {
          ...baseError,
          type: "timeout",
          message: "Request timed out. Please try again.",
          recoverable: true,
          retryAfter: 5,
        } as UserServiceError;

      case "authorization":
        return {
          ...baseError,
          type: "authorization",
          message: "Authentication failed. Please sign in again.",
          recoverable: true,
        } as UserServiceError;

      case "circuit_breaker":
        return {
          ...baseError,
          type: "circuit_breaker",
          message:
            "Service is temporarily unavailable. Please try again later.",
          recoverable: true,
          retryAfter: 30,
        } as UserServiceError;

      case "service":
        return {
          ...baseError,
          type: "service",
          message: error.message || "Service error occurred. Please try again.",
          recoverable: false,
        } as UserServiceError;

      default:
        return {
          ...baseError,
          type: "service",
          message: error.message || "An unexpected error occurred.",
          recoverable: false,
        } as UserServiceError;
    }
  }

  const result: UserServiceError = {
    type: "service",
    message: "Unknown error occurred",
    recoverable: false,
  };

  if (correlationId) {
    result.correlationId = correlationId;
  }

  return result;
};

// Extract error code from various error formats
const extractErrorCode = (error: Error): string | undefined => {
  // Check for HTTP status codes
  const statusMatch = error.message.match(/(\d{3})/);
  if (statusMatch) {
    return statusMatch[1];
  }

  // Check for gRPC error codes
  const grpcMatch = error.message.match(/code:\s*(\w+)/i);
  if (grpcMatch) {
    return grpcMatch[1];
  }

  // Check for custom error codes
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
};

// Extract additional error details
const extractErrorDetails = (
  error: Error,
): Record<string, unknown> | undefined => {
  const details: Record<string, unknown> = {};

  // Extract stack trace in development
  if (process.env.NODE_ENV === "development" && error.stack) {
    details.stack = error.stack;
  }

  // Extract additional properties from error object
  Object.keys(error).forEach((key) => {
    if (key !== "message" && key !== "name" && key !== "stack") {
      details[key] = (error as unknown as Record<string, unknown>)[key];
    }
  });

  return Object.keys(details).length > 0 ? details : undefined;
};

// User-friendly error message generator
export const getUserFriendlyErrorMessage = (
  error: UserServiceError,
): string => {
  const baseMessages = {
    network:
      "Connection problem. Please check your internet connection and try again.",
    timeout:
      "The request is taking longer than expected. Please wait or try again.",
    authorization: "Your session has expired. Please sign in again.",
    validation: error.message, // Use the specific validation message
    service: "Something went wrong on our end. Please try again later.",
    circuit_breaker:
      "The service is temporarily unavailable. Please try again in a few moments.",
  };

  return (
    baseMessages[error.type] ||
    "An unexpected error occurred. Please try again."
  );
};

// Recovery action suggestions
export const getRecoveryActions = (error: UserServiceError): string[] => {
  const actions: Record<UserServiceError["type"], string[]> = {
    network: [
      "Check your internet connection",
      "Try refreshing the page",
      "Switch to a different network if available",
    ],
    timeout: [
      "Wait a moment and try again",
      "Check your internet connection speed",
      "Try refreshing the page",
    ],
    authorization: [
      "Sign out and sign back in",
      "Clear your browser cache and cookies",
      "Contact support if the problem persists",
    ],
    validation: [
      "Check the highlighted fields for errors",
      "Ensure all required information is provided",
      "Verify the format of your input",
    ],
    service: [
      "Try again in a few minutes",
      "Refresh the page",
      "Contact support if the problem continues",
    ],
    circuit_breaker: [
      "Wait a few minutes before trying again",
      "Check our status page for service updates",
      "Try again later",
    ],
  };

  return (
    actions[error.type] || [
      "Try refreshing the page",
      "Contact support if the problem persists",
    ]
  );
};

// Error logging utility (sanitizes sensitive data)
export const logUserServiceError = (
  error: UserServiceError,
  context?: Record<string, unknown>,
): void => {
  const sanitizedError = {
    type: error.type,
    message: error.message,
    code: error.code,
    recoverable: error.recoverable,
    correlationId: error.correlationId,
    // Don't log sensitive details in production
    ...(process.env.NODE_ENV === "development" && { details: error.details }),
  };

  const sanitizedContext = context ? sanitizeLogContext(context) : undefined;

  console.error("[UserService Error]", sanitizedError, sanitizedContext);
};

// Sanitize context data for logging (remove sensitive information)
const sanitizeLogContext = (
  context: Record<string, unknown>,
): Record<string, unknown> => {
  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "cookie",
    "session",
    "key",
    "secret",
  ];
  const sanitized: Record<string, unknown> = {};

  Object.entries(context).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey),
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
};
