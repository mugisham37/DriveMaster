/**
 * Error Messages Configuration
 * Task 18.5: Error message improvements
 * 
 * User-friendly error messages with clear recovery actions
 */

import { toast } from 'sonner';

export const ERROR_MESSAGES = {
  NETWORK: {
    OFFLINE: 'You\'re offline. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    CONNECTION_FAILED: 'Connection failed. Please check your network.',
    SLOW_CONNECTION: 'Slow connection detected. This may take a moment.',
  },
  AUTH: {
    UNAUTHORIZED: 'Your session has expired. Please sign in again.',
    FORBIDDEN: 'You don\'t have permission to perform this action.',
    TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
    INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_FORMAT: 'Invalid format. Please check your input.',
    TOO_SHORT: 'This value is too short',
    TOO_LONG: 'This value is too long',
    INVALID_TIMEZONE: 'Invalid timezone selected',
    INVALID_LANGUAGE: 'Invalid language selected',
  },
  PROFILE: {
    UPDATE_FAILED: 'Failed to update profile. Please try again.',
    LOAD_FAILED: 'Failed to load profile. Please refresh the page.',
    CREATE_FAILED: 'Failed to create profile. Please try again.',
    NOT_FOUND: 'Profile not found. Please contact support.',
  },
  PREFERENCES: {
    UPDATE_FAILED: 'Failed to save preferences. Please try again.',
    LOAD_FAILED: 'Failed to load preferences. Using defaults.',
    INVALID_VALUE: 'Invalid preference value. Please check your selection.',
  },
  PROGRESS: {
    LOAD_FAILED: 'Failed to load progress data. Please refresh.',
    SYNC_FAILED: 'Failed to sync progress. Your data is saved locally.',
  },
  ACTIVITY: {
    RECORD_FAILED: 'Failed to record activity. Will retry automatically.',
    LOAD_FAILED: 'Failed to load activity data. Please refresh.',
    EXPORT_FAILED: 'Failed to export activity data. Please try again.',
  },
  GDPR: {
    CONSENT_UPDATE_FAILED: 'Failed to update consent. Please try again.',
    EXPORT_REQUEST_FAILED: 'Failed to request data export. Please try again.',
    EXPORT_DOWNLOAD_FAILED: 'Failed to download export. Please try again.',
    DELETION_REQUEST_FAILED: 'Failed to request account deletion. Please try again.',
    DELETION_CANCEL_FAILED: 'Failed to cancel deletion. Please contact support.',
  },
  GENERIC: {
    UNKNOWN: 'Something went wrong. Please try again.',
    SERVER_ERROR: 'Server error. Our team has been notified.',
    MAINTENANCE: 'System maintenance in progress. Please try again later.',
    RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  },
} as const;

export const RECOVERY_ACTIONS = {
  RETRY: 'Retry',
  REFRESH: 'Refresh Page',
  SIGN_IN: 'Sign In Again',
  CONTACT_SUPPORT: 'Contact Support',
  GO_BACK: 'Go Back',
  DISMISS: 'Dismiss',
  CHECK_CONNECTION: 'Check Connection',
} as const;

/**
 * Show error toast with recovery action
 */
export function showErrorToast(
  message: string,
  options?: {
    description?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
    correlationId?: string;
  }
) {
  const description = options?.correlationId
    ? `${options.description ?? ''}\nError ID: ${options.correlationId}`
    : options?.description;

  toast.error(message, {
    duration: options?.duration ?? 5000,
    ...(description && { description }),
    ...(options?.action && { action: options.action }),
  });
}

/**
 * Show network error with retry action
 */
export function showNetworkError(
  onRetry?: () => void,
  options?: {
    message?: string;
    description?: string;
  }
) {
  const toastOptions: {
    description?: string;
    action?: { label: string; onClick: () => void };
  } = {};
  
  if (options?.description) {
    toastOptions.description = options.description;
  }
  
  if (onRetry) {
    toastOptions.action = {
      label: RECOVERY_ACTIONS.RETRY,
      onClick: onRetry,
    };
  }
  
  showErrorToast(options?.message ?? ERROR_MESSAGES.NETWORK.CONNECTION_FAILED, toastOptions);
}

/**
 * Show auth error with sign in action
 */
export function showAuthError(
  onSignIn?: () => void,
  options?: {
    message?: string;
    description?: string;
  }
) {
  const toastOptions: {
    description: string;
    action?: { label: string; onClick: () => void };
  } = {
    description: options?.description ?? 'Please sign in to continue.',
  };
  
  if (onSignIn) {
    toastOptions.action = {
      label: RECOVERY_ACTIONS.SIGN_IN,
      onClick: onSignIn,
    };
  }
  
  showErrorToast(options?.message ?? ERROR_MESSAGES.AUTH.UNAUTHORIZED, toastOptions);
}

/**
 * Show validation error
 */
export function showValidationError(
  field: string,
  message: string,
  options?: {
    duration?: number;
  }
) {
  showErrorToast(`${field}: ${message}`, {
    duration: options?.duration ?? 4000,
  });
}

/**
 * Show server error with support action
 */
export function showServerError(
  correlationId?: string,
  options?: {
    message?: string;
    description?: string;
    onContactSupport?: () => void;
  }
) {
  const toastOptions: {
    description?: string;
    correlationId?: string;
    action?: { label: string; onClick: () => void };
  } = {};
  
  if (options?.description) {
    toastOptions.description = options.description;
  }
  
  if (correlationId) {
    toastOptions.correlationId = correlationId;
  }
  
  if (options?.onContactSupport) {
    toastOptions.action = {
      label: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      onClick: options.onContactSupport,
    };
  }
  
  showErrorToast(options?.message ?? ERROR_MESSAGES.GENERIC.SERVER_ERROR, toastOptions);
}

/**
 * Show offline error
 */
export function showOfflineError(
  onCheckConnection?: () => void,
  options?: {
    description?: string;
  }
) {
  const toastOptions: {
    description: string;
    duration: number;
    action?: { label: string; onClick: () => void };
  } = {
    description: options?.description ?? 'Changes will sync when you reconnect.',
    duration: 0, // Don't auto-dismiss
  };
  
  if (onCheckConnection) {
    toastOptions.action = {
      label: RECOVERY_ACTIONS.CHECK_CONNECTION,
      onClick: onCheckConnection,
    };
  }
  
  showErrorToast(ERROR_MESSAGES.NETWORK.OFFLINE, toastOptions);
}

/**
 * Show rate limit error
 */
export function showRateLimitError(
  retryAfter?: number,
  options?: {
    onRetry?: () => void;
  }
) {
  const toastOptions: {
    description?: string;
    duration: number;
    action?: { label: string; onClick: () => void };
  } = {
    duration: (retryAfter ?? 5) * 1000,
  };
  
  if (retryAfter) {
    toastOptions.description = `Please wait ${retryAfter} seconds before trying again.`;
  }
  
  if (options?.onRetry) {
    toastOptions.action = {
      label: RECOVERY_ACTIONS.RETRY,
      onClick: options.onRetry,
    };
  }
  
  showErrorToast(ERROR_MESSAGES.GENERIC.RATE_LIMIT, toastOptions);
}

/**
 * Get user-friendly error message from error object
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) {
    // Map common error messages to user-friendly versions
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK.CONNECTION_FAILED;
    }
    if (message.includes('timeout')) {
      return ERROR_MESSAGES.NETWORK.TIMEOUT;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ERROR_MESSAGES.AUTH.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ERROR_MESSAGES.AUTH.FORBIDDEN;
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ERROR_MESSAGES.GENERIC.RATE_LIMIT;
    }
    if (message.includes('server') || message.includes('500')) {
      return ERROR_MESSAGES.GENERIC.SERVER_ERROR;
    }
    
    return error.message;
  }
  
  return ERROR_MESSAGES.GENERIC.UNKNOWN;
}

/**
 * Get recovery action for error type
 */
export function getRecoveryAction(error: unknown): {
  label: string;
  action: () => void;
} | undefined {
  if (typeof error === 'string') {
    const message = error.toLowerCase();
    
    if (message.includes('network') || message.includes('offline')) {
      return {
        label: RECOVERY_ACTIONS.CHECK_CONNECTION,
        action: () => window.location.reload(),
      };
    }
    if (message.includes('unauthorized') || message.includes('session')) {
      return {
        label: RECOVERY_ACTIONS.SIGN_IN,
        action: () => (window.location.href = '/auth/login'),
      };
    }
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        label: RECOVERY_ACTIONS.RETRY,
        action: () => window.location.reload(),
      };
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        label: RECOVERY_ACTIONS.SIGN_IN,
        action: () => (window.location.href = '/auth/login'),
      };
    }
  }
  
  return undefined;
}
