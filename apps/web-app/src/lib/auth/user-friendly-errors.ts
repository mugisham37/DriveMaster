/**
 * User-Friendly Error Messages
 * Converts technical errors into actionable, user-friendly messages
 */

import type { AuthError } from "@/types/auth-service";

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  action?: {
    label: string;
    handler: () => void;
  };
  recoverable: boolean;
}

/**
 * Convert AuthError to user-friendly error
 */
export function toUserFriendlyError(error: AuthError): UserFriendlyError {
  switch (error.type) {
    case "network":
      return {
        title: "Connection Issue",
        message: "We're having trouble connecting to our servers.",
        suggestion: "Please check your internet connection and try again.",
        recoverable: true,
      };

    case "validation":
      return {
        title: "Invalid Input",
        message: error.message || "Please check your information and try again.",
        suggestion: error.field
          ? `The ${error.field} field needs your attention.`
          : "Make sure all required fields are filled correctly.",
        recoverable: true,
      };

    case "authentication":
      return getAuthenticationError(error);

    case "authorization":
      return {
        title: "Access Denied",
        message: "You don't have permission to access this resource.",
        suggestion: "If you believe this is an error, please contact support.",
        recoverable: false,
      };

    case "server":
      return {
        title: "Service Unavailable",
        message: "Our service is temporarily unavailable.",
        suggestion: "We're working on it. Please try again in a few moments.",
        recoverable: true,
      };

    case "oauth":
      return getOAuthError(error);

    default:
      return {
        title: "Something Went Wrong",
        message: error.message || "An unexpected error occurred.",
        suggestion: "Please try again. If the problem persists, contact support.",
        recoverable: true,
      };
  }
}

/**
 * Get user-friendly authentication error
 */
function getAuthenticationError(error: AuthError): UserFriendlyError {
  const code = error.code;

  switch (code) {
    case "INVALID_CREDENTIALS":
      return {
        title: "Sign In Failed",
        message: "The email or password you entered is incorrect.",
        suggestion: "Double-check your credentials and try again. Forgot your password?",
        recoverable: true,
      };

    case "TOKEN_EXPIRED":
      return {
        title: "Session Expired",
        message: "Your session has expired for security reasons.",
        suggestion: "Please sign in again to continue.",
        recoverable: true,
      };

    case "TOKEN_INVALID":
      return {
        title: "Invalid Session",
        message: "Your session is no longer valid.",
        suggestion: "Please sign in again.",
        recoverable: true,
      };

    case "ACCOUNT_LOCKED":
      return {
        title: "Account Locked",
        message: "Your account has been temporarily locked.",
        suggestion: "Too many failed sign-in attempts. Try again in 15 minutes or reset your password.",
        recoverable: true,
      };

    case "EMAIL_NOT_VERIFIED":
      return {
        title: "Email Not Verified",
        message: "Please verify your email address to continue.",
        suggestion: "Check your inbox for the verification email. Didn't receive it?",
        recoverable: true,
      };

    case "ACCOUNT_DISABLED":
      return {
        title: "Account Disabled",
        message: "Your account has been disabled.",
        suggestion: "Please contact support for assistance.",
        recoverable: false,
      };

    case "PASSWORD_RESET_REQUIRED":
      return {
        title: "Password Reset Required",
        message: "You need to reset your password before signing in.",
        suggestion: "Click 'Forgot Password' to reset your password.",
        recoverable: true,
      };

    default:
      return {
        title: "Authentication Failed",
        message: error.message || "Unable to authenticate your request.",
        suggestion: "Please try again or contact support if the problem persists.",
        recoverable: true,
      };
  }
}

/**
 * Get user-friendly OAuth error
 */
function getOAuthError(error: AuthError): UserFriendlyError {
  const code = error.code;
  const provider = (error as any).provider || "the provider";

  switch (code) {
    case "OAUTH_DENIED":
      return {
        title: "Authorization Cancelled",
        message: `You cancelled the ${provider} authorization.`,
        suggestion: "Try again or use a different sign-in method.",
        recoverable: true,
      };

    case "STATE_MISMATCH":
      return {
        title: "Security Check Failed",
        message: "The authorization request couldn't be verified.",
        suggestion: "This might be a security issue. Please try signing in again.",
        recoverable: true,
      };

    case "OAUTH_CODE_EXPIRED":
      return {
        title: "Authorization Expired",
        message: "The authorization code has expired.",
        suggestion: "Please try signing in with ${provider} again.",
        recoverable: true,
      };

    case "OAUTH_PROVIDER_ERROR":
      return {
        title: `${provider} Error`,
        message: `We couldn't connect to ${provider}.`,
        suggestion: `${provider} might be experiencing issues. Try again or use a different sign-in method.`,
        recoverable: true,
      };

    case "ACCOUNT_ALREADY_LINKED":
      return {
        title: "Account Already Linked",
        message: `This ${provider} account is already linked to another user.`,
        suggestion: "Sign in with that account or use a different ${provider} account.",
        recoverable: false,
      };

    case "PROVIDER_NOT_ENABLED":
      return {
        title: "Provider Not Available",
        message: `${provider} sign-in is not currently available.`,
        suggestion: "Please use a different sign-in method.",
        recoverable: false,
      };

    default:
      return {
        title: `${provider} Sign In Failed`,
        message: error.message || `Unable to sign in with ${provider}.`,
        suggestion: "Try again or use a different sign-in method.",
        recoverable: true,
      };
  }
}

/**
 * Get actionable suggestion based on error type
 */
export function getErrorSuggestion(error: AuthError): string {
  const friendly = toUserFriendlyError(error);
  return friendly.suggestion || "Please try again.";
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: AuthError): boolean {
  const friendly = toUserFriendlyError(error);
  return friendly.recoverable;
}

/**
 * Get error title for display
 */
export function getErrorTitle(error: AuthError): string {
  const friendly = toUserFriendlyError(error);
  return friendly.title;
}

/**
 * Get error message for display
 */
export function getErrorMessage(error: AuthError): string {
  const friendly = toUserFriendlyError(error);
  return friendly.message;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Array<{ field: string; message: string }>
): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0].message;

  return `Please fix the following: ${errors.map((e) => e.field).join(", ")}`;
}

/**
 * Get retry delay for error
 */
export function getRetryDelay(error: AuthError): number {
  if (error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }

  switch (error.type) {
    case "network":
      return 2000; // 2 seconds
    case "server":
      return 5000; // 5 seconds
    case "authentication":
      return 1000; // 1 second
    default:
      return 3000; // 3 seconds
  }
}

/**
 * Common error messages
 */
export const CommonErrors = {
  NETWORK: {
    title: "Connection Issue",
    message: "Please check your internet connection and try again.",
  },
  TIMEOUT: {
    title: "Request Timeout",
    message: "The request took too long. Please try again.",
  },
  UNKNOWN: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
  },
  MAINTENANCE: {
    title: "Maintenance Mode",
    message: "We're performing maintenance. Please try again shortly.",
  },
  RATE_LIMIT: {
    title: "Too Many Attempts",
    message: "Please wait a moment before trying again.",
  },
};

