/**
 * Circuit Breaker Implementation for Notification Service
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

import type {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Circuit Breaker Events
// ============================================================================

export type CircuitBreakerEvent =
  | "state_change"
  | "failure_threshold_reached"
  | "recovery_attempt"
  | "recovery_success"
  | "recovery_failure";

export interface CircuitBreakerEventData {
  event: CircuitBreakerEvent;
  state: CircuitBreakerState;
  previousState?: CircuitBreakerState;
  metrics: CircuitBreakerMetrics;
  timestamp: Date;
}

export type CircuitBreakerEventHandler = (
  data: CircuitBreakerEventData,
) => void;

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date | undefined;
  private nextRetryTime?: Date | undefined;
  private eventHandlers = new Map<
    CircuitBreakerEvent,
    CircuitBreakerEventHandler[]
  >();
  private stateChangeTimer?: NodeJS.Timeout | undefined;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig,
  ) {
    this.validateConfig();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit breaker should block the request
    if (this.shouldBlock()) {
      throw this.createCircuitBreakerError();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit breaker should block requests
   */
  shouldBlock(): boolean {
    const now = new Date();

    switch (this.state) {
      case "closed":
        return false;

      case "open":
        if (this.nextRetryTime && now >= this.nextRetryTime) {
          this.transitionToHalfOpen();
          return false;
        }
        return true;

      case "half-open":
        return false;

      default:
        return true;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
    };
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === "open";
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.state === "closed";
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.state === "half-open";
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed(): void {
    this.transitionToClosed();
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
    this.clearStateChangeTimer();
    this.transitionToClosed();
  }

  /**
   * Add event handler
   */
  on(event: CircuitBreakerEvent, handler: CircuitBreakerEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event handler
   */
  off(event: CircuitBreakerEvent, handler: CircuitBreakerEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get circuit breaker configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Update circuit breaker configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearStateChangeTimer();
    this.eventHandlers.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private onSuccess(): void {
    this.successCount++;

    if (this.state === "half-open") {
      // Successful request in half-open state - transition to closed
      this.transitionToClosed();
    } else if (this.state === "closed") {
      // Reset failure count on successful request in closed state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    // Emit failure threshold reached event if applicable
    if (this.failureCount === this.config.failureThreshold) {
      this.emitEvent("failure_threshold_reached");
    }

    if (
      this.state === "closed" &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionToOpen();
    } else if (this.state === "half-open") {
      // Any failure in half-open state transitions back to open
      this.transitionToOpen();
    }
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = "closed";
    this.failureCount = 0;
    this.nextRetryTime = undefined;
    this.clearStateChangeTimer();

    this.emitStateChange(previousState);
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = "open";
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);

    // Set timer to transition to half-open after recovery timeout
    this.clearStateChangeTimer();
    this.stateChangeTimer = setTimeout(() => {
      if (this.state === "open") {
        this.transitionToHalfOpen();
      }
    }, this.config.recoveryTimeout);

    this.emitStateChange(previousState);
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = "half-open";
    this.clearStateChangeTimer();

    this.emitEvent("recovery_attempt");
    this.emitStateChange(previousState);
  }

  private emitStateChange(previousState: CircuitBreakerState): void {
    this.emitEvent("state_change", { previousState });
  }

  private emitEvent(
    event: CircuitBreakerEvent,
    additionalData: Record<string, unknown> = {},
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers && handlers.length > 0) {
      const eventData: CircuitBreakerEventData = {
        event,
        state: this.state,
        metrics: this.getMetrics(),
        timestamp: new Date(),
        ...additionalData,
      };

      handlers.forEach((handler) => {
        try {
          handler(eventData);
        } catch (error) {
          console.error(
            `Circuit breaker event handler error for ${event}:`,
            error,
          );
        }
      });
    }
  }

  private createCircuitBreakerError(): NotificationError {
    return {
      type: "service",
      message: "Service temporarily unavailable due to repeated failures",
      code: "CIRCUIT_BREAKER_OPEN",
      details: {
        circuitBreakerName: this.name,
        state: this.state,
        failureCount: this.failureCount,
        nextRetryTime: this.nextRetryTime,
      },
      recoverable: true,
      retryAfter: this.nextRetryTime
        ? this.nextRetryTime.getTime() - Date.now()
        : undefined,
      timestamp: new Date(),
    };
  }

  private validateConfig(): void {
    if (this.config.failureThreshold < 1) {
      throw new Error("Circuit breaker failure threshold must be at least 1");
    }
    if (this.config.recoveryTimeout < 1000) {
      throw new Error(
        "Circuit breaker recovery timeout must be at least 1000ms",
      );
    }
    if (this.config.monitoringPeriod < 1000) {
      throw new Error(
        "Circuit breaker monitoring period must be at least 1000ms",
      );
    }
  }

  private clearStateChangeTimer(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = undefined;
    }
  }
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
  };

  /**
   * Get or create a circuit breaker
   */
  getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      const circuitBreaker = new CircuitBreaker(name, finalConfig);

      // Add default event handlers
      this.addDefaultEventHandlers(circuitBreaker);

      this.circuitBreakers.set(name, circuitBreaker);
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * Remove a circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.destroy();
      return this.circuitBreakers.delete(name);
    }
    return false;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get circuit breaker metrics for all breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      metrics[name] = circuitBreaker.getMetrics();
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): {
    healthy: string[];
    unhealthy: string[];
    recovering: string[];
    total: number;
  } {
    const healthy: string[] = [];
    const unhealthy: string[] = [];
    const recovering: string[] = [];

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      switch (circuitBreaker.getState()) {
        case "closed":
          healthy.push(name);
          break;
        case "open":
          unhealthy.push(name);
          break;
        case "half-open":
          recovering.push(name);
          break;
      }
    }

    return {
      healthy,
      unhealthy,
      recovering,
      total: this.circuitBreakers.size,
    };
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Cleanup all circuit breakers
   */
  destroy(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.destroy();
    }
    this.circuitBreakers.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private addDefaultEventHandlers(circuitBreaker: CircuitBreaker): void {
    // Log state changes
    circuitBreaker.on("state_change", (data) => {
      console.log(
        `Circuit breaker ${circuitBreaker.getName()} state changed: ${data.previousState} -> ${data.state}`,
      );
    });

    // Log failure threshold reached
    circuitBreaker.on("failure_threshold_reached", (data) => {
      console.warn(
        `Circuit breaker ${circuitBreaker.getName()} failure threshold reached: ${data.metrics.failureCount} failures`,
      );
    });

    // Log recovery attempts
    circuitBreaker.on("recovery_attempt", () => {
      console.log(
        `Circuit breaker ${circuitBreaker.getName()} attempting recovery`,
      );
    });
  }
}

// ============================================================================
// Predefined Circuit Breaker Configurations
// ============================================================================

export const CIRCUIT_BREAKER_CONFIGS = {
  // Main notification API
  notification_api: {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
  },

  // WebSocket connection
  websocket_connection: {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    monitoringPeriod: 30000,
  },

  // Push notification service
  push_notifications: {
    failureThreshold: 10,
    recoveryTimeout: 60000,
    monitoringPeriod: 120000,
  },

  // Template service
  template_service: {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    monitoringPeriod: 45000,
  },

  // Analytics service
  analytics_service: {
    failureThreshold: 8,
    recoveryTimeout: 45000,
    monitoringPeriod: 90000,
  },
} as const;

// ============================================================================
// Singleton Export
// ============================================================================

export const circuitBreakerManager = new CircuitBreakerManager();

// Initialize default circuit breakers
for (const [name, config] of Object.entries(CIRCUIT_BREAKER_CONFIGS)) {
  circuitBreakerManager.getCircuitBreaker(name, config);
}

export default circuitBreakerManager;
