/**
 * Integration utilities for existing error handling patterns
 * Provides compatibility with existing error handling systems
 */

import { AuthErrorHandler } from "./error-handler";
import type { AuthError } from "../../types/auth-service";

/**
 * Convert AuthError to format expected by existing ErrorMessage component
 */
export function toErrorMessageFormat(
  error: AuthError | Error | unknown,
  context?: string,
): Error {
  if (error instanceof Error && "type" in error) {
    // Already an AuthError, just ensure it's an Error instance
    return error as Error;
  }

  const authError = AuthErrorHandler.processError(error, context);

  // Create Error instance with AuthError properties
  const errorInstance = new Error(authError.message);
  Object.assign(errorInstance, authError);

  return errorInstance;
}

/**
 * Convert AuthError for use with react-query error handling
 */
export function toReactQueryError(
  error: AuthError | Error | unknown,
  context?: string,
): Error {
  const authError = AuthErrorHandler.processError(error, context);

  const queryError = new Error(authError.message);
  queryError.name = `${authError.type}Error`;

  // Add additional properties that react-query might use
  Object.assign(queryError, {
    ...authError,
    status: getHttpStatusFromError(authError),
    statusText: authError.message,
  });

  return queryError;
}

/**
 * Convert AuthError for use with form validation libraries
 */
export function toFormError(
  error: AuthError | Error | unknown,
  context?: string,
): Record<string, string> {
  const authError = AuthErrorHandler.processError(error, context);

  if (authError.type === "validation" && authError.field) {
    return {
      [authError.field]: authError.message,
    };
  }

  // Return as general form error
  return {
    _form: authError.message,
  };
}

/**
 * Convert AuthError for use with toast notifications
 */
export function toToastError(
  error: AuthError | Error | unknown,
  context?: string,
): {
  message: string;
  type: "error" | "warning" | "info";
  duration?: number;
} {
  const authError = AuthErrorHandler.processError(error, context);

  let type: "error" | "warning" | "info" = "error";
  let duration: number | undefined;

  switch (authError.type) {
    case "network":
      type = "warning";
      duration = 5000;
      break;
    case "validation":
      type = "warning";
      duration = 4000;
      break;
    case "authentication":
    case "authorization":
      type = "error";
      duration = 6000;
      break;
    case "oauth":
      type = "warning";
      duration = 5000;
      break;
    case "server":
      type = "error";
      duration = 8000;
      break;
  }

  return {
    message: authError.message,
    type,
    duration,
  };
}

/**
 * Create error handler for API client interceptors
 */
export function createApiErrorHandler(context?: string) {
  return (error: unknown) => {
    const authError = AuthErrorHandler.processError(error, context);

    // Create error object compatible with axios/fetch error format
    const apiError = new Error(authError.message);
    Object.assign(apiError, {
      ...authError,
      response: {
        status: getHttpStatusFromError(authError),
        statusText: authError.message,
        data: authError.details,
      },
      config: { context },
      isAxiosError: true, // For axios compatibility
    });

    throw apiError;
  };
}

/**
 * Create error handler for SWR
 */
export function createSWRErrorHandler(context?: string) {
  return (error: unknown) => {
    const authError = AuthErrorHandler.processError(error, context);

    // SWR expects Error instances
    const swrError = new Error(authError.message);
    Object.assign(swrError, {
      ...authError,
      status: getHttpStatusFromError(authError),
    });

    return swrError;
  };
}

/**
 * Create error handler for async operations with retry logic
 */
export function createRetryableErrorHandler(
  maxRetries: number = 3,
  context?: string,
) {
  return async function handleWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const authError = AuthErrorHandler.processError(error, context);

      // Check if we should retry
      const shouldRetry =
        authError.recoverable &&
        attempt < maxRetries &&
        (authError.type === "network" || authError.type === "server");

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return handleWithRetry(operation, attempt + 1);
      }

      // Convert to standard error format and throw
      throw toErrorMessageFormat(authError, context);
    }
  };
}

/**
 * Wrapper for existing error handling functions
 */
export function wrapExistingErrorHandler<
  T extends (...args: unknown[]) => unknown,
>(handler: T, context?: string): T {
  return ((...args: Parameters<T>) => {
    try {
      return handler(...args);
    } catch (error) {
      const authError = AuthErrorHandler.processError(error, context);
      throw toErrorMessageFormat(authError, context);
    }
  }) as T;
}

/**
 * Helper to get HTTP status code from AuthError
 */
function getHttpStatusFromError(error: AuthError): number {
  switch (error.type) {
    case "validation":
      return 400;
    case "authentication":
      return 401;
    case "authorization":
      return 403;
    case "network":
      return 0; // Network error
    case "server":
      if (error.code === "SERVICE_UNAVAILABLE") return 503;
      if (error.code === "RATE_LIMITED") return 429;
      return 500;
    case "oauth":
      return 400;
    default:
      return 500;
  }
}

/**
 * Utility to check if an error is a specific auth error type
 */
export function isAuthErrorType(
  error: unknown,
  type: AuthError["type"],
): boolean {
  if (!error || typeof error !== "object") return false;

  if ("type" in error) {
    return (error as AuthError).type === type;
  }

  // Classify unknown error and check type
  const classified = AuthErrorHandler.processError(error);
  return classified.type === type;
}

/**
 * Utility to extract error code from any error format
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  if ("code" in error) {
    return String((error as { code: unknown }).code);
  }

  if ("status" in error) {
    return String((error as { status: unknown }).status);
  }

  return undefined;
}

/**
 * Utility to check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  if ("recoverable" in error) {
    return Boolean((error as AuthError).recoverable);
  }

  const authError = AuthErrorHandler.processError(error);
  return authError.recoverable;
}

/**
 * Create a standardized error response for API endpoints
 */
export function createErrorResponse(error: unknown, context?: string) {
  const authError = AuthErrorHandler.processError(error, context);

  return {
    success: false,
    error: {
      type: authError.type,
      message: authError.message,
      code: authError.code,
      recoverable: authError.recoverable,
      retryAfter: authError.retryAfter,
    },
    timestamp: new Date().toISOString(),
  };
}
