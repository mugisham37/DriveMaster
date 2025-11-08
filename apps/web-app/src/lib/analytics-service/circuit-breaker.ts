/**
 * Circuit Breaker Implementation for Analytics Service
 *
 * Implements fault tolerance pattern to prevent cascading failures
 * and provide graceful degradation when the analytics service is unavailable.
 *
 * Requirements: 6.1, 6.2, 6.4
 */

import type { CircuitBreakerConfig } from "@/types/analytics-service";
import { ServiceError, TimeoutError } from "./errors";

// ============================================================================
// Circuit Breaker State Types
// ============================================================================

export type CircuitBreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number;
  lastStateChange: number;
}

export interface CircuitBreakerMetrics {
  requestRate: number;
  errorRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

// ============================================================================
// Circuit Breaker Events
// ============================================================================

export type CircuitBreakerEvent =
  | "state_change"
  | "request_success"
  | "request_failure"
  | "circuit_opened"
  | "circuit_closed"
  | "circuit_half_opened";

export interface CircuitBreakerEventData {
  event: CircuitBreakerEvent;
  timestamp: number;
  state: CircuitBreakerState;
  previousState?: CircuitBreakerState;
  error?: Error;
  responseTime?: number;
  stats: CircuitBreakerStats;
}

export type CircuitBreakerEventListener = (
  data: CircuitBreakerEventData,
) => void;

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class AnalyticsCircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private lastStateChange = Date.now();
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private responseTimes: number[] = [];
  private eventListeners: Map<
    CircuitBreakerEvent,
    Set<CircuitBreakerEventListener>
  > = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(private config: CircuitBreakerConfig) {
    this.startHealthCheck();
  }

  // ============================================================================
  // Core Circuit Breaker Logic
  // ============================================================================

  /**
   * Executes an operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
  ): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === "open") {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        const error = new ServiceError(
          "Circuit breaker is open - service unavailable",
          {
            code: "CIRCUIT_BREAKER_OPEN",
            details: {
              operationName,
              state: this.state,
              failureCount: this.failureCount,
              lastFailureTime: this.lastFailureTime,
            },
          },
        );
        this.emitEvent("request_failure", { error });
        throw error;
      }
    }

    try {
      const result = await this.executeWithTimeout(operation);
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime);
      this.emitEvent("request_success", { responseTime });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error as Error, responseTime);
      this.emitEvent("request_failure", {
        error: error as Error,
        responseTime,
      });
      throw error;
    }
  }

  /**
   * Executes operation with timeout protection
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const options = {
          code: "CIRCUIT_BREAKER_TIMEOUT",
          details: { timeout: this.config.timeout },
        };
        reject(
          new TimeoutError(
            `Operation timed out after ${this.config.timeout}ms`,
            options,
          ),
        );
      }, this.config.timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handles successful operation
   */
  private onSuccess(responseTime: number): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.recordResponseTime(responseTime);

    // Reset failure count on success
    this.failureCount = 0;

    // Transition from half-open to closed if we have enough successes
    if (
      this.state === "half-open" &&
      this.successCount >= this.config.successThreshold
    ) {
      this.transitionToClosed();
    }
  }

  /**
   * Handles failed operation
   */
  private onFailure(_error: Error, responseTime: number): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.recordResponseTime(responseTime);

    // Transition to open if we've exceeded the failure threshold
    if (
      this.state !== "open" &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  // ============================================================================
  // State Transitions
  // ============================================================================

  /**
   * Transitions circuit breaker to closed state
   */
  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();

    this.emitEvent("circuit_closed", { previousState });
    this.emitEvent("state_change", { previousState });
  }

  /**
   * Transitions circuit breaker to open state
   */
  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = "open";
    this.successCount = 0;
    this.lastStateChange = Date.now();

    this.emitEvent("circuit_opened", { previousState });
    this.emitEvent("state_change", { previousState });
  }

  /**
   * Transitions circuit breaker to half-open state
   */
  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = "half-open";
    this.successCount = 0;
    this.failureCount = 0;
    this.lastStateChange = Date.now();

    this.emitEvent("circuit_half_opened", { previousState });
    this.emitEvent("state_change", { previousState });
  }

  /**
   * Determines if circuit breaker should attempt to reset from open to half-open
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime > this.config.timeout;
  }

  // ============================================================================
  // Metrics and Monitoring
  // ============================================================================

  /**
   * Records response time for metrics calculation
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only the last 1000 response times to prevent memory issues
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: Date.now() - this.lastStateChange,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Gets current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const timeWindow = 60000; // 1 minute window
    const recentRequests = this.totalRequests; // Simplified - in real implementation, track time-windowed requests

    const requestRate = recentRequests / (timeWindow / 1000);
    const errorRate =
      this.totalRequests > 0 ? this.totalFailures / this.totalRequests : 0;

    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);
    const averageResponseTime =
      sortedResponseTimes.length > 0
        ? sortedResponseTimes.reduce((sum, time) => sum + time, 0) /
          sortedResponseTimes.length
        : 0;

    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    return {
      requestRate,
      errorRate,
      averageResponseTime,
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
    };
  }

  /**
   * Gets current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Checks if circuit breaker is available for requests
   */
  isAvailable(): boolean {
    return this.state !== "open";
  }

  /**
   * Gets health status
   */
  getHealthStatus(): {
    healthy: boolean;
    state: CircuitBreakerState;
    errorRate: number;
    lastFailure?: number;
  } {
    const metrics = this.getMetrics();

    return {
      healthy: this.state === "closed" && metrics.errorRate < 0.1, // Less than 10% error rate
      state: this.state,
      errorRate: metrics.errorRate,
      ...(this.lastFailureTime && { lastFailure: this.lastFailureTime }),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Adds event listener
   */
  addEventListener(
    event: CircuitBreakerEvent,
    listener: CircuitBreakerEventListener,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Removes event listener
   */
  removeEventListener(
    event: CircuitBreakerEvent,
    listener: CircuitBreakerEventListener,
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emits event to all listeners
   */
  private emitEvent(
    event: CircuitBreakerEvent,
    additionalData: Partial<CircuitBreakerEventData> = {},
  ): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) return;

    const eventData: CircuitBreakerEventData = {
      event,
      timestamp: Date.now(),
      state: this.state,
      stats: this.getStats(),
      ...additionalData,
    };

    listeners.forEach((listener) => {
      try {
        listener(eventData);
      } catch (error) {
        console.error("Error in circuit breaker event listener:", error);
      }
    });
  }

  // ============================================================================
  // Health Check and Maintenance
  // ============================================================================

  /**
   * Starts periodic health check
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Run health check every 30 seconds
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  /**
   * Performs health check and maintenance
   */
  private performHealthCheck(): void {
    // Clean up old response times (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    this.responseTimes = this.responseTimes.filter(
      (time) => time > fiveMinutesAgo,
    );

    // Log health status in development
    if (process.env.NODE_ENV === "development") {
      const health = this.getHealthStatus();
      const metrics = this.getMetrics();

      console.log("[Analytics Circuit Breaker Health]", {
        ...health,
        metrics: {
          requestRate: metrics.requestRate.toFixed(2),
          errorRate: (metrics.errorRate * 100).toFixed(2) + "%",
          avgResponseTime: metrics.averageResponseTime.toFixed(0) + "ms",
        },
      });
    }
  }

  /**
   * Manually resets circuit breaker to closed state
   */
  reset(): void {
    this.transitionToClosed();
  }

  /**
   * Manually opens circuit breaker
   */
  open(): void {
    this.transitionToOpen();
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.eventListeners.clear();
    this.responseTimes = [];
  }
}

// ============================================================================
// Circuit Breaker Factory
// ============================================================================

/**
 * Creates a new circuit breaker instance with default configuration
 */
export function createAnalyticsCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>,
): AnalyticsCircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 30000,
    successThreshold: 3,
  };

  return new AnalyticsCircuitBreaker({
    ...defaultConfig,
    ...config,
  });
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

/**
 * Manages multiple circuit breakers for different operations
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, AnalyticsCircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = {
      failureThreshold: 5,
      timeout: 30000,
      successThreshold: 3,
      ...defaultConfig,
    };
  }

  /**
   * Gets or creates a circuit breaker for an operation
   */
  getCircuitBreaker(
    operationName: string,
    config?: Partial<CircuitBreakerConfig>,
  ): AnalyticsCircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      const circuitBreaker = new AnalyticsCircuitBreaker({
        ...this.defaultConfig,
        ...config,
      });

      this.circuitBreakers.set(operationName, circuitBreaker);
    }

    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Executes an operation with circuit breaker protection
   */
  async execute<T>(
    operationName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(operationName, config);
    return circuitBreaker.execute(operation, operationName);
  }

  /**
   * Gets statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    this.circuitBreakers.forEach((circuitBreaker, operationName) => {
      stats[operationName] = circuitBreaker.getStats();
    });

    return stats;
  }

  /**
   * Gets health status for all circuit breakers
   */
  getOverallHealth(): {
    healthy: boolean;
    circuitBreakers: Record<
      string,
      { healthy: boolean; state: CircuitBreakerState }
    >;
  } {
    const circuitBreakers: Record<
      string,
      { healthy: boolean; state: CircuitBreakerState }
    > = {};
    let overallHealthy = true;

    this.circuitBreakers.forEach((circuitBreaker, operationName) => {
      const health = circuitBreaker.getHealthStatus();
      circuitBreakers[operationName] = {
        healthy: health.healthy,
        state: health.state,
      };

      if (!health.healthy) {
        overallHealthy = false;
      }
    });

    return {
      healthy: overallHealthy,
      circuitBreakers,
    };
  }

  /**
   * Resets all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach((circuitBreaker) => {
      circuitBreaker.reset();
    });
  }

  /**
   * Cleans up all circuit breakers
   */
  destroy(): void {
    this.circuitBreakers.forEach((circuitBreaker) => {
      circuitBreaker.destroy();
    });
    this.circuitBreakers.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsCircuitBreakerManager = new CircuitBreakerManager();
