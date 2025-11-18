/**
 * Notification Error Handling System
 * Comprehensive error types and recovery strategies
 */

export type NotificationErrorType =
  | 'network'
  | 'authentication'
  | 'validation'
  | 'service'
  | 'permission'
  | 'quota'
  | 'template'
  | 'device'
  | 'websocket';

export interface NotificationError {
  type: NotificationErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryAfter?: number;
  correlationId?: string;
  timestamp: Date;
}

export class NotificationErrorHandler {
  /**
   * Create a notification error
   */
  static createError(
    type: NotificationErrorType,
    message: string,
    options?: Partial<NotificationError>
  ): NotificationError {
    return {
      type,
      message,
      recoverable: this.isRecoverable(type),
      timestamp: new Date(),
      ...options,
    };
  }

  /**
   * Determine if error type is recoverable
   */
  static isRecoverable(type: NotificationErrorType): boolean {
    const recoverableTypes: NotificationErrorType[] = [
      'network',
      'service',
      'websocket',
      'device',
    ];
    return recoverableTypes.includes(type);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: NotificationError): string {
    const messages: Record<NotificationErrorType, string> = {
      network: 'Connection lost. Retrying...',
      authentication: 'Session expired. Please log in again.',
      validation: 'Please check your input and try again.',
      service: 'Service temporarily unavailable. Try again in a few minutes.',
      permission: 'Notifications are blocked. Enable them in your browser settings.',
      quota: 'Daily notification limit reached. Critical notifications will still be delivered.',
      template: 'Template error. Please check required variables.',
      device: 'Device registration expired. Please re-enable notifications.',
      websocket: 'Real-time updates paused. Reconnecting...',
    };

    return messages[error.type] || error.message;
  }

  /**
   * Get recovery action for error
   */
  static getRecoveryAction(error: NotificationError): {
    label: string;
    action: () => void;
  } | null {
    if (!error.recoverable) return null;

    const actions: Record<string, { label: string; action: () => void }> = {
      network: {
        label: 'Retry',
        action: () => window.location.reload(),
      },
      service: {
        label: 'Try Again',
        action: () => window.location.reload(),
      },
      websocket: {
        label: 'Reconnect',
        action: () => {
          // Will be handled by WebSocket manager
        },
      },
      device: {
        label: 'Re-enable',
        action: () => {
          // Will trigger permission flow
        },
      },
    };

    return actions[error.type] || null;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static calculateRetryDelay(attemptNumber: number, baseDelay = 1000): number {
    const maxDelay = 32000; // 32 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Log error for monitoring
   */
  static logError(error: NotificationError): void {
    console.error('[Notification Error]', {
      type: error.type,
      message: error.message,
      code: error.code,
      correlationId: error.correlationId,
      timestamp: error.timestamp,
      details: error.details,
    });

    // Send to error monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error.message), {
        tags: {
          errorType: error.type,
          correlationId: error.correlationId,
        },
        extra: error.details,
      });
    }
  }
}

/**
 * Error boundary fallback component props
 */
export interface ErrorFallbackProps {
  error: NotificationError;
  resetError: () => void;
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): NotificationError {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401 || status === 403) {
      return NotificationErrorHandler.createError(
        'authentication',
        'Authentication failed',
        { code: status.toString() }
      );
    }

    if (status === 400) {
      return NotificationErrorHandler.createError(
        'validation',
        data.message || 'Validation error',
        { code: status.toString(), details: data.errors }
      );
    }

    if (status === 429) {
      return NotificationErrorHandler.createError(
        'quota',
        'Rate limit exceeded',
        {
          code: status.toString(),
          retryAfter: parseInt(error.response.headers['retry-after'] || '60'),
        }
      );
    }

    if (status >= 500) {
      return NotificationErrorHandler.createError(
        'service',
        'Server error',
        { code: status.toString() }
      );
    }
  }

  if (error.request) {
    return NotificationErrorHandler.createError(
      'network',
      'Network error',
      { details: { message: error.message } }
    );
  }

  return NotificationErrorHandler.createError(
    'service',
    error.message || 'Unknown error'
  );
}
