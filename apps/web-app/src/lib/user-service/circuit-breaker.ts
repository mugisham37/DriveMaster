/**
 * Circuit Breaker Implementation for User Service
 *
 * Implements:
 * - Circuit breaker pattern for service failure protection
 * - Error classification and transformation for user-friendly messages
 * - Automatic retry logic with configurable backoff strategies
 * - Service health monitoring and degradation detection
 * - Requirements: 7.1, 7.2, 7.3, 8.1, 8.2
 */

import type {
  UserServiceError,
  CircuitBreakerState,
  ServiceHealthStatus,
} from "@/types/user-service";

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  enableHealthCheck: boolean;
  healthCheckInterval: number;
  enableMetrics: boolean;
}

export interface CircuitBreakerMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  circuitOpenCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  averageResponseTime: number;
  currentState: CircuitBreakerState["state"];
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterFactor: number;
  retryableErrors: string[];
}

// ============================================================================
// Error Classification System
// ============================================================================

export class ErrorClassifier {
  private static readonly RETRYABLE_ERROR_CODES = [
    "NETWORK_ERROR",
    "TIMEOUT_ERROR",
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
    "RATE_LIMITED",
    "HTTP_500",
    "HTTP_502",
    "HTTP_503",
    "HTTP_504",
    "GRPC_UNAVAILABLE",
    "GRPC_DEADLINE_EXCEEDED",
    "GRPC_RESOURCE_EXHAUSTED",
  ];

  private static readonly CIRCUIT_BREAKER_ERRORS = [
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
    "HTTP_500",
    "HTTP_502",
    "HTTP_503",
    "HTTP_504",
    "GRPC_UNAVAILABLE",
    "GRPC_INTERNAL",
  ];

  private static readonly USER_FRIENDLY_MESSAGES: Record<string, string> = {
    NETWORK_ERROR:
      "Unable to connect to the service. Please check your internet connection and try again.",
    TIMEOUT_ERROR:
      "The request is taking longer than expected. Please try again.",
    SERVICE_UNAVAILABLE:
      "The service is temporarily unavailable. Please try again in a few moments.",
    INTERNAL_ERROR:
      "An internal error occurred. Our team has been notified. Please try again later.",
    RATE_LIMITED:
      "Too many requests. Please wait a moment before trying again.",
    VALIDATION_ERROR: "Please check your input and try again.",
    AUTHORIZATION_ERROR:
      "You are not authorized to perform this action. Please sign in and try again.",
    NOT_FOUND: "The requested resource was not found.",
    CONFLICT:
      "A conflict occurred. The resource may have been modified by another user.",
    CIRCUIT_BREAKER_OPEN:
      "The service is temporarily unavailable due to high error rates. Please try again later.",
  };

  static isRetryable(error: UserServiceError): boolean {
    return (
      this.RETRYABLE_ERROR_CODES.includes(error.code || "") || error.recoverable
    );
  }

  static shouldTriggerCircuitBreaker(error: UserServiceError): boolean {
    return this.CIRCUIT_BREAKER_ERRORS.includes(error.code || "");
  }

  static getUserFriendlyMessage(error: UserServiceError): string {
    const code = error.code || "UNKNOWN_ERROR";
    return (
      this.USER_FRIENDLY_MESSAGES[code] ||
      error.message ||
      "An unexpected error occurred. Please try again."
    );
  }

  static classifyError(error: unknown): UserServiceError {
    // If it's already a UserServiceError, return as-is
    if (this.isUserServiceError(error)) {
      return error;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        type: "service",
        message: error.message,
        code: "UNKNOWN_ERROR",
        recoverable: true,
      };
    }

    // Handle network errors
    if (typeof error === "object" && error !== null) {
      const errorObj = error as Record<string, unknown>;

      if (errorObj.name === "AbortError") {
        return {
          type: "timeout",
          message: "Request was cancelled or timed out",
          code: "TIMEOUT_ERROR",
          recoverable: true,
        };
      }

      if (
        errorObj.name === "TypeError" &&
        String(errorObj.message).includes("fetch")
      ) {
        return {
          type: "network",
          message: "Network connection failed",
          code: "NETWORK_ERROR",
          recoverable: true,
        };
      }
    }

    // Fallback for unknown errors
    return {
      type: "service",
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      recoverable: false,
    };
  }

  private static isUserServiceError(error: unknown): error is UserServiceError {
    return (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      "message" in error &&
      typeof (error as UserServiceError).type === "string" &&
      typeof (error as UserServiceError).message === "string"
    );
  }
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitterFactor: 0.1,
      retryableErrors: ErrorClassifier["RETRYABLE_ERROR_CODES"],
      ...config,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    let lastError: UserServiceError | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(
            `[RetryManager] Operation succeeded on attempt ${attempt}/${this.config.maxAttempts}`,
            {
              context,
              attempt,
              totalAttempts: this.config.maxAttempts,
            },
          );
        }

        return result;
      } catch (error) {
        const classifiedError = ErrorClassifier.classifyError(error);
        lastError = classifiedError;

        // Don't retry if it's the last attempt or error is not retryable
        if (
          attempt === this.config.maxAttempts ||
          !ErrorClassifier.isRetryable(classifiedError)
        ) {
          console.error(
            `[RetryManager] Operation failed after ${attempt} attempts`,
            {
              context,
              error: classifiedError,
              finalAttempt: true,
            },
          );
          throw classifiedError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);

        console.warn(
          `[RetryManager] Attempt ${attempt}/${this.config.maxAttempts} failed, retrying in ${delay}ms`,
          {
            context,
            error: classifiedError,
            nextDelay: delay,
          },
        );

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error("Retry operation failed");
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay =
      this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;

    return Math.min(totalDelay, this.config.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private metrics: CircuitBreakerMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private metricsResetTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
      halfOpenMaxCalls: 3,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      enableMetrics: true,
      ...config,
    };

    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
    };

    this.metrics = this.initializeMetrics();

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  async execute<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    // Check if circuit is open
    if (this.state.state === "open") {
      if (!this.shouldAttemptRecovery()) {
        const error: UserServiceError = {
          type: "circuit_breaker",
          message: "Service is temporarily unavailable due to high error rates",
          code: "CIRCUIT_BREAKER_OPEN",
          recoverable: true,
          retryAfter: Math.ceil(
            (this.state.nextAttemptTime!.getTime() - Date.now()) / 1000,
          ),
        };

        this.updateMetrics(false, 0);
        throw error;
      }

      // Transition to half-open
      this.transitionToHalfOpen();
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime, context);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const classifiedError = ErrorClassifier.classifyError(error);

      this.onFailure(classifiedError, responseTime, context);
      throw classifiedError;
    }
  }

  private onSuccess(responseTime: number, context?: string): void {
    this.updateMetrics(true, responseTime);

    if (this.state.state === "half-open") {
      this.state.successCount++;

      if (this.state.successCount >= this.config.halfOpenMaxCalls) {
        this.transitionToClosed();
        console.log(
          "[CircuitBreaker] Transitioned to CLOSED state after successful recovery",
          {
            context,
            successCount: this.state.successCount,
          },
        );
      }
    } else if (this.state.state === "closed") {
      // Reset failure count on success
      this.state.failureCount = 0;
    }
  }

  private onFailure(
    error: UserServiceError,
    responseTime: number,
    context?: string,
  ): void {
    this.updateMetrics(false, responseTime);

    // Only count failures that should trigger circuit breaker
    if (ErrorClassifier.shouldTriggerCircuitBreaker(error)) {
      this.state.failureCount++;
      this.state.lastFailureTime = new Date();

      if (
        this.state.state === "closed" &&
        this.state.failureCount >= this.config.failureThreshold
      ) {
        this.transitionToOpen();
        console.warn(
          "[CircuitBreaker] Transitioned to OPEN state due to failure threshold",
          {
            context,
            failureCount: this.state.failureCount,
            threshold: this.config.failureThreshold,
            error: error.code,
          },
        );
      } else if (this.state.state === "half-open") {
        this.transitionToOpen();
        console.warn(
          "[CircuitBreaker] Transitioned back to OPEN state during recovery attempt",
          {
            context,
            error: error.code,
          },
        );
      }
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.state.nextAttemptTime) {
      return true;
    }

    return Date.now() >= this.state.nextAttemptTime.getTime();
  }

  private transitionToClosed(): void {
    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
    };
  }

  private transitionToOpen(): void {
    this.state = {
      state: "open",
      failureCount: this.state.failureCount,
      successCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date(Date.now() + this.config.recoveryTimeout),
    };

    this.metrics.circuitOpenCount++;
  }

  private transitionToHalfOpen(): void {
    this.state = {
      state: "half-open",
      failureCount: this.state.failureCount,
      successCount: 0,
      ...(this.state.lastFailureTime && {
        lastFailureTime: this.state.lastFailureTime,
      }),
    };
  }

  private initializeMetrics(): CircuitBreakerMetrics {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0,
      currentState: this.state.state,
    };
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalCalls++;
    this.metrics.currentState = this.state.state;

    // Update response time (rolling average)
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalCalls - 1) +
        responseTime) /
      this.metrics.totalCalls;

    if (success) {
      this.metrics.successfulCalls++;
      this.metrics.lastSuccessTime = new Date();
    } else {
      this.metrics.failedCalls++;
      this.metrics.lastFailureTime = new Date();
    }
  }

  private startMetricsCollection(): void {
    // Reset metrics every monitoring period
    this.metricsResetTimer = setInterval(() => {
      // Keep some metrics but reset counters
      const currentState = this.metrics.currentState;
      const circuitOpenCount = this.metrics.circuitOpenCount;

      this.metrics = this.initializeMetrics();
      this.metrics.currentState = currentState;
      this.metrics.circuitOpenCount = circuitOpenCount;
    }, this.config.monitoringPeriod);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  isOpen(): boolean {
    return this.state.state === "open";
  }

  isClosed(): boolean {
    return this.state.state === "closed";
  }

  isHalfOpen(): boolean {
    return this.state.state === "half-open";
  }

  /**
   * Manually opens the circuit breaker
   */
  forceOpen(): void {
    this.transitionToOpen();
    console.warn("[CircuitBreaker] Circuit breaker manually opened");
  }

  /**
   * Manually closes the circuit breaker
   */
  forceClose(): void {
    this.transitionToClosed();
    console.log("[CircuitBreaker] Circuit breaker manually closed");
  }

  /**
   * Resets the circuit breaker to initial state
   */
  reset(): void {
    this.transitionToClosed();
    this.metrics = this.initializeMetrics();
    console.log("[CircuitBreaker] Circuit breaker reset to initial state");
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.metricsResetTimer) {
      clearInterval(this.metricsResetTimer);
      this.metricsResetTimer = null;
    }
  }
}

// ============================================================================
// Service Health Monitor
// ============================================================================

export class ServiceHealthMonitor {
  private circuitBreaker: CircuitBreaker;
  private healthCheckInterval: number;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthStatus?: ServiceHealthStatus;
  private healthCheckFunction?: () => Promise<ServiceHealthStatus>;

  constructor(
    circuitBreaker: CircuitBreaker,
    healthCheckInterval: number = 30000,
  ) {
    this.circuitBreaker = circuitBreaker;
    this.healthCheckInterval = healthCheckInterval;
  }

  startMonitoring(
    healthCheckFunction: () => Promise<ServiceHealthStatus>,
  ): void {
    this.healthCheckFunction = healthCheckFunction;

    // Perform initial health check
    this.performHealthCheck();

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    console.log("[ServiceHealthMonitor] Started health monitoring", {
      interval: this.healthCheckInterval,
    });
  }

  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    console.log("[ServiceHealthMonitor] Stopped health monitoring");
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.healthCheckFunction) return;

    try {
      const healthStatus = await this.healthCheckFunction();
      this.lastHealthStatus = healthStatus;

      // If service is healthy and circuit is open, consider recovery
      if (healthStatus.status === "healthy" && this.circuitBreaker.isOpen()) {
        console.log(
          "[ServiceHealthMonitor] Service appears healthy, circuit breaker may recover soon",
        );
      }

      // If service is unhealthy and circuit is closed, consider opening
      if (
        healthStatus.status === "unhealthy" &&
        this.circuitBreaker.isClosed()
      ) {
        console.warn("[ServiceHealthMonitor] Service appears unhealthy", {
          status: healthStatus.status,
          services: healthStatus.services,
        });
      }
    } catch (_error) {
      console.error("[ServiceHealthMonitor] Health check failed:", _error);

      // Health check failure might indicate service issues
      if (this.circuitBreaker.isClosed()) {
        console.warn("[ServiceHealthMonitor] Health check failure detected");
      }
    }
  }

  getLastHealthStatus(): ServiceHealthStatus | undefined {
    return this.lastHealthStatus;
  }

  isServiceHealthy(): boolean {
    return this.lastHealthStatus?.status === "healthy";
  }
}

// ============================================================================
// Integrated Error Handler
// ============================================================================

export class UserServiceErrorHandler {
  private circuitBreaker: CircuitBreaker;
  private retryManager: RetryManager;
  private healthMonitor: ServiceHealthMonitor;

  constructor(
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    retryConfig?: Partial<RetryConfig>,
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.retryManager = new RetryManager(retryConfig);
    this.healthMonitor = new ServiceHealthMonitor(this.circuitBreaker);
  }

  async executeWithProtection<T>(
    operation: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.retryManager.executeWithRetry(operation, context);
    }, context);
  }

  startHealthMonitoring(
    healthCheckFunction: () => Promise<ServiceHealthStatus>,
  ): void {
    this.healthMonitor.startMonitoring(healthCheckFunction);
  }

  stopHealthMonitoring(): void {
    this.healthMonitor.stopMonitoring();
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return this.circuitBreaker.getMetrics();
  }

  isServiceHealthy(): boolean {
    return this.healthMonitor.isServiceHealthy();
  }

  cleanup(): void {
    this.circuitBreaker.cleanup();
    this.healthMonitor.stopMonitoring();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userServiceErrorHandler = new UserServiceErrorHandler();

// ============================================================================
// Factory Functions
// ============================================================================

export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  return new CircuitBreaker(config);
}

export function createRetryManager(
  config?: Partial<RetryConfig>,
): RetryManager {
  return new RetryManager(config);
}

export function createErrorHandler(
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
  retryConfig?: Partial<RetryConfig>,
): UserServiceErrorHandler {
  return new UserServiceErrorHandler(circuitBreakerConfig, retryConfig);
}
