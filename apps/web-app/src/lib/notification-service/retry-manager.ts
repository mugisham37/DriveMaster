/**
 * Retry Manager with Exponential Backoff
 * Handles retry logic for transient failures with configurable policies
 */

import type {
  NotificationError,
  ErrorContext,
} from "@/types/notification-service";

// ============================================================================
// Retry Configuration Types
// ============================================================================

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  jitterRange: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error?: NotificationError;
  timestamp: Date;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: NotificationError;
  attempts: RetryAttempt[];
  totalDuration: number;
}

export interface RetryContext extends ErrorContext {
  policy: RetryPolicy;
  startTime: Date;
  attempts: RetryAttempt[];
}

// ============================================================================
// Retry Manager Implementation
// ============================================================================

export class RetryManager {
  private defaultPolicy: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.1,
    retryableErrors: ["network", "service", "quota", "websocket"],
    nonRetryableErrors: ["validation", "authentication", "permission"],
  };

  private activePolicies = new Map<string, RetryPolicy>();

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: ErrorContext,
    policy?: Partial<RetryPolicy>,
  ): Promise<T> {
    const finalPolicy = this.mergePolicy(policy);
    const retryContext: RetryContext = {
      ...context,
      policy: finalPolicy,
      startTime: new Date(),
      attempts: [],
    };

    return this.executeAttempts(fn, retryContext);
  }

  /**
   * Execute with named retry policy
   */
  async executeWithNamedPolicy<T>(
    fn: () => Promise<T>,
    context: ErrorContext,
    policyName: string,
  ): Promise<T> {
    const policy = this.activePolicies.get(policyName) || this.defaultPolicy;
    return this.executeWithRetry(fn, context, policy);
  }

  /**
   * Register a named retry policy
   */
  registerPolicy(name: string, policy: Partial<RetryPolicy>): void {
    this.activePolicies.set(name, this.mergePolicy(policy));
  }

  /**
   * Get registered policy
   */
  getPolicy(name: string): RetryPolicy | undefined {
    return this.activePolicies.get(name);
  }

  /**
   * Remove registered policy
   */
  removePolicy(name: string): boolean {
    return this.activePolicies.delete(name);
  }

  /**
   * Update default policy
   */
  updateDefaultPolicy(policy: Partial<RetryPolicy>): void {
    this.defaultPolicy = this.mergePolicy(policy);
  }

  /**
   * Get default policy
   */
  getDefaultPolicy(): RetryPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Check if error is retryable based on policy
   */
  isRetryable(error: NotificationError, policy: RetryPolicy): boolean {
    // Check non-retryable errors first (takes precedence)
    if (policy.nonRetryableErrors.includes(error.type)) {
      return false;
    }

    // Check if error type is in retryable list
    if (policy.retryableErrors.includes(error.type)) {
      return true;
    }

    // Check if error is marked as recoverable
    return error.recoverable;
  }

  /**
   * Calculate delay for next attempt
   */
  calculateDelay(attemptNumber: number, policy: RetryPolicy): number {
    // Calculate exponential backoff
    let delay =
      policy.baseDelay * Math.pow(policy.backoffMultiplier, attemptNumber - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, policy.maxDelay);

    // Apply jitter if enabled
    if (policy.jitterEnabled) {
      const jitter = delay * policy.jitterRange * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): {
    activePolicies: number;
    defaultPolicy: RetryPolicy;
    registeredPolicies: string[];
  } {
    return {
      activePolicies: this.activePolicies.size,
      defaultPolicy: this.getDefaultPolicy(),
      registeredPolicies: Array.from(this.activePolicies.keys()),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async executeAttempts<T>(
    fn: () => Promise<T>,
    context: RetryContext,
  ): Promise<T> {
    let lastError: NotificationError | undefined;

    for (let attempt = 1; attempt <= context.policy.maxAttempts; attempt++) {
      const attemptStart = new Date();

      try {
        // Execute the function
        const result = await fn();

        // Record successful attempt
        context.attempts.push({
          attemptNumber: attempt,
          delay: 0,
          timestamp: attemptStart,
        });

        return result;
      } catch (error) {
        const notificationError = this.normalizeError(error);
        lastError = notificationError;

        // Record failed attempt
        const attemptRecord: RetryAttempt = {
          attemptNumber: attempt,
          delay: 0,
          error: notificationError,
          timestamp: attemptStart,
        };

        // Check if error is retryable
        if (!this.isRetryable(notificationError, context.policy)) {
          context.attempts.push(attemptRecord);
          throw notificationError;
        }

        // Check if we've reached max attempts
        if (attempt >= context.policy.maxAttempts) {
          context.attempts.push(attemptRecord);
          throw this.createMaxAttemptsError(notificationError, context);
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, context.policy);
        attemptRecord.delay = delay;
        context.attempts.push(attemptRecord);

        // Wait before next attempt
        if (delay > 0) {
          await this.sleep(delay);
        }

        // Log retry attempt
        this.logRetryAttempt(attempt, delay, notificationError, context);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error("Retry execution failed unexpectedly");
  }

  private mergePolicy(policy?: Partial<RetryPolicy>): RetryPolicy {
    if (!policy) {
      return { ...this.defaultPolicy };
    }

    return {
      maxAttempts: policy.maxAttempts ?? this.defaultPolicy.maxAttempts,
      baseDelay: policy.baseDelay ?? this.defaultPolicy.baseDelay,
      maxDelay: policy.maxDelay ?? this.defaultPolicy.maxDelay,
      backoffMultiplier:
        policy.backoffMultiplier ?? this.defaultPolicy.backoffMultiplier,
      jitterEnabled: policy.jitterEnabled ?? this.defaultPolicy.jitterEnabled,
      jitterRange: policy.jitterRange ?? this.defaultPolicy.jitterRange,
      retryableErrors: policy.retryableErrors ?? [
        ...this.defaultPolicy.retryableErrors,
      ],
      nonRetryableErrors: policy.nonRetryableErrors ?? [
        ...this.defaultPolicy.nonRetryableErrors,
      ],
    };
  }

  private normalizeError(error: unknown): NotificationError {
    if (this.isNotificationError(error)) {
      return error;
    }

    // Convert generic error to NotificationError
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      type: "service",
      message,
      code: "UNKNOWN_ERROR",
      details: { originalError: String(error) },
      recoverable: true,
      timestamp: new Date(),
    };
  }

  private isNotificationError(error: unknown): error is NotificationError {
    return (
      error !== null &&
      typeof error === "object" &&
      "type" in error &&
      "message" in error &&
      "recoverable" in error &&
      "timestamp" in error
    );
  }

  private createMaxAttemptsError(
    lastError: NotificationError,
    context: RetryContext,
  ): NotificationError {
    const totalDuration = Date.now() - context.startTime.getTime();

    const error: NotificationError = {
      type: lastError.type,
      message: `Operation failed after ${context.policy.maxAttempts} attempts: ${lastError.message}`,
      code: "MAX_RETRY_ATTEMPTS_EXCEEDED",
      details: {
        originalError: lastError,
        attempts: context.attempts.length,
        totalDuration,
        policy: context.policy,
      },
      recoverable: false,
      timestamp: new Date(),
    };

    if (lastError.correlationId || context.correlationId) {
      error.correlationId = lastError.correlationId || context.correlationId;
    }

    return error;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logRetryAttempt(
    attempt: number,
    delay: number,
    error: NotificationError,
    context: RetryContext,
  ): void {
    const logData = {
      operation: context.operation,
      attempt,
      delay,
      errorType: error.type,
      errorCode: error.code,
      correlationId: error.correlationId || context.correlationId,
      policy: {
        maxAttempts: context.policy.maxAttempts,
        baseDelay: context.policy.baseDelay,
        backoffMultiplier: context.policy.backoffMultiplier,
      },
    };

    console.warn(
      `Retry attempt ${attempt}/${context.policy.maxAttempts} for ${context.operation}:`,
      logData,
    );
  }
}

// ============================================================================
// Predefined Retry Policies
// ============================================================================

export const RETRY_POLICIES = {
  // Quick retry for fast operations
  quick: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.1,
    retryableErrors: ["network", "service"],
    nonRetryableErrors: ["validation", "authentication", "permission"],
  },

  // Standard retry for most operations
  standard: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.1,
    retryableErrors: ["network", "service", "quota"],
    nonRetryableErrors: ["validation", "authentication", "permission"],
  },

  // Aggressive retry for critical operations
  aggressive: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.2,
    retryableErrors: ["network", "service", "quota", "websocket"],
    nonRetryableErrors: ["validation", "authentication", "permission"],
  },

  // Conservative retry for expensive operations
  conservative: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 3,
    jitterEnabled: true,
    jitterRange: 0.1,
    retryableErrors: ["network", "service"],
    nonRetryableErrors: ["validation", "authentication", "permission"],
  },

  // WebSocket specific retry
  websocket: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.3,
    retryableErrors: ["network", "websocket", "service"],
    nonRetryableErrors: ["authentication", "permission"],
  },

  // Analytics retry (can tolerate failures)
  analytics: {
    maxAttempts: 2,
    baseDelay: 5000,
    maxDelay: 20000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    jitterRange: 0.2,
    retryableErrors: ["network", "service", "quota"],
    nonRetryableErrors: ["validation", "authentication"],
  },
} as const;

// ============================================================================
// Retry Decorators and Utilities
// ============================================================================

/**
 * Decorator for automatic retry functionality
 */
export function withRetry<T extends unknown[], R>(
  policy?: Partial<RetryPolicy>,
) {
  return function (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>,
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      const context: ErrorContext = {
        operation: `${(target.constructor as { name: string }).name}.${propertyKey}`,
        retryCount: 0,
      };

      return retryManager.executeWithRetry(
        () => originalMethod.apply(this, args),
        context,
        policy,
      );
    };

    return descriptor;
  };
}

/**
 * Utility function for simple retry operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    operation: string;
    policy?: Partial<RetryPolicy>;
    context?: Partial<ErrorContext>;
  },
): Promise<T> {
  const context: ErrorContext = {
    operation: options.operation,
    retryCount: 0,
    ...options.context,
  };

  return retryManager.executeWithRetry(fn, context, options.policy);
}

/**
 * Create a retryable version of a function
 */
export function createRetryableFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  policy?: Partial<RetryPolicy>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const context: ErrorContext = {
      operation,
      retryCount: 0,
    };

    return retryManager.executeWithRetry(() => fn(...args), context, policy);
  };
}

// ============================================================================
// Singleton Export
// ============================================================================

export const retryManager = new RetryManager();

// Register predefined policies
for (const [name, policy] of Object.entries(RETRY_POLICIES)) {
  retryManager.registerPolicy(name, {
    ...policy,
    retryableErrors: [...(policy.retryableErrors || [])],
    nonRetryableErrors: [...(policy.nonRetryableErrors || [])],
  });
}

export default retryManager;
