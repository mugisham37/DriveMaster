/**
 * Circuit Breaker Pattern Implementation for Service Resilience
 * Provides automatic failure detection and recovery for auth service calls
 */

import { AuthErrorHandler } from "./error-handler";
import type { CircuitBreakerState } from "../../types/auth-service";

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for monitoring failures (ms)
  successThreshold: number; // Number of successes needed to close circuit in half-open state
  timeoutDuration: number; // Request timeout duration (ms)
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitOpenCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  averageResponseTime: number;
}

/**
 * Circuit Breaker implementation with configurable thresholds and recovery
 */
export class CircuitBreaker {
  private state: CircuitBreakerState["state"] = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private metrics: CircuitBreakerMetrics;
  private responseTimeHistory: number[] = [];
  private readonly maxHistorySize = 100;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
  ) {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    // Check circuit state before executing
    if (this.state === "open") {
      if (!this.shouldAttemptReset()) {
        const error = new Error(`Circuit breaker is open for ${this.name}`);
        this.logCircuitBreakerEvent("request_blocked", {
          reason: "circuit_open",
        });
        throw AuthErrorHandler.processError(error, "circuit_breaker");
      }

      // Transition to half-open for testing
      this.state = "half-open";
      this.successCount = 0;
      this.logCircuitBreakerEvent("state_change", {
        from: "open",
        to: "half-open",
      });
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.metrics.timeouts++;
        reject(
          new Error(
            `Operation timed out after ${this.config.timeoutDuration}ms`,
          ),
        );
      }, this.config.timeoutDuration);

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
   * Handle successful operation
   */
  private onSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = new Date();
    this.updateResponseTime(responseTime);

    if (this.state === "half-open") {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.reset();
        this.logCircuitBreakerEvent("state_change", {
          from: "half-open",
          to: "closed",
        });
      }
    } else if (this.state === "closed") {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: unknown, responseTime: number): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = new Date();
    this.updateResponseTime(responseTime);

    // Only count failures that should trigger circuit breaker
    if (this.shouldCountFailure(error)) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      if (this.shouldOpenCircuit()) {
        this.openCircuit();
      }
    }
  }

  /**
   * Determine if error should count towards circuit breaker failures
   */
  private shouldCountFailure(error: unknown): boolean {
    const authError = AuthErrorHandler.processError(error, "circuit_breaker");
    return AuthErrorHandler.shouldTriggerCircuitBreaker(authError);
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.state === "open") return false;

    return this.failureCount >= this.config.failureThreshold;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = "open";
    this.metrics.circuitOpenCount++;
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);

    const previousState = this.state;

    this.logCircuitBreakerEvent("state_change", {
      from: previousState,
      to: "open",
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime?.toISOString(),
    });
  }

  /**
   * Reset circuit to closed state
   */
  private reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    delete this.lastFailureTime;
    delete this.nextAttemptTime;
  }

  /**
   * Check if circuit should attempt reset from open state
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return true;
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(responseTime: number): void {
    this.responseTimeHistory.push(responseTime);

    if (this.responseTimeHistory.length > this.maxHistorySize) {
      this.responseTimeHistory.shift();
    }

    this.metrics.averageResponseTime =
      this.responseTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.responseTimeHistory.length;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    const state: CircuitBreakerState = {
      state: this.state,
      failureCount: this.failureCount,
    };

    if (this.lastFailureTime) {
      state.lastFailureTime = this.lastFailureTime;
    }

    if (this.nextAttemptTime) {
      state.nextAttemptTime = this.nextAttemptTime;
    }

    return state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    state: CircuitBreakerState["state"];
    failureRate: number;
    averageResponseTime: number;
  } {
    const failureRate =
      this.metrics.totalRequests > 0
        ? this.metrics.failedRequests / this.metrics.totalRequests
        : 0;

    return {
      healthy: this.state === "closed" && failureRate < 0.1,
      state: this.state,
      failureRate,
      averageResponseTime: this.metrics.averageResponseTime,
    };
  }

  /**
   * Force circuit to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.openCircuit();
    this.logCircuitBreakerEvent("manual_open", { reason: "forced" });
  }

  /**
   * Force circuit to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.reset();
    this.logCircuitBreakerEvent("manual_close", { reason: "forced" });
  }

  /**
   * Log circuit breaker events
   */
  private logCircuitBreakerEvent(
    event: string,
    data?: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      circuitBreaker: this.name,
      event,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      ...data,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("Circuit Breaker Event:", logEntry);
    }

    // In production, send to monitoring service
    // Example: sendToMonitoringService(logEntry)
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    successThreshold: 3,
    timeoutDuration: 10000, // 10 seconds
  };

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create circuit breaker for a service
   */
  getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      this.circuitBreakers.set(name, new CircuitBreaker(name, finalConfig));
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get health status of all circuit breakers
   */
  getOverallHealthStatus(): {
    healthy: boolean;
    circuitBreakers: Record<
      string,
      ReturnType<CircuitBreaker["getHealthStatus"]>
    >;
  } {
    const statuses: Record<
      string,
      ReturnType<CircuitBreaker["getHealthStatus"]>
    > = {};
    let overallHealthy = true;

    for (const [name, breaker] of this.circuitBreakers) {
      const status = breaker.getHealthStatus();
      statuses[name] = status;

      if (!status.healthy) {
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      circuitBreakers: statuses,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.forceClose();
    }
  }

  /**
   * Remove circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }
}

/**
 * Default circuit breaker configurations for different services
 */
export const CIRCUIT_BREAKER_CONFIGS: Record<
  string,
  Partial<CircuitBreakerConfig>
> = {
  "auth-service": {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    successThreshold: 3,
    timeoutDuration: 10000,
  },
  "oauth-provider": {
    failureThreshold: 3,
    recoveryTimeout: 60000,
    successThreshold: 2,
    timeoutDuration: 15000,
  },
  "token-refresh": {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    successThreshold: 2,
    timeoutDuration: 5000,
  },
};

/**
 * Utility function to create circuit breaker protected function
 */
export function withCircuitBreaker<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  fn: T,
  circuitBreakerName: string,
  config?: Partial<CircuitBreakerConfig>,
): T {
  const manager = CircuitBreakerManager.getInstance();
  const circuitBreaker = manager.getCircuitBreaker(circuitBreakerName, config);

  return (async (...args: Parameters<T>) => {
    return circuitBreaker.execute(() => fn(...args));
  }) as T;
}

/**
 * Decorator for circuit breaker protection (for class methods)
 */
export function CircuitBreakerProtected(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const manager = CircuitBreakerManager.getInstance();
      const circuitBreaker = manager.getCircuitBreaker(name, config);

      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();
