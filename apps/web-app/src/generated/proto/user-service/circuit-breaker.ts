// Circuit Breaker implementation for user-service resilience
// This file is auto-generated. Do not edit manually.

import { CircuitBreakerState, UserServiceError } from '../../../types/user-service';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of consecutive failures before opening
  recoveryTimeout: number;  // Time in ms to wait before attempting recovery
  monitoringPeriod: number; // Time window in ms for monitoring failures
  halfOpenMaxCalls: number; // Max calls allowed in half-open state
  successThreshold: number; // Successes needed to close from half-open
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitBreakerTrips: number;
  averageResponseTime: number;
  lastFailureTime?: Date | undefined;
  lastSuccessTime?: Date | undefined;
}

export class UserServiceCircuitBreaker {
  private state: CircuitBreakerState['state'] = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date | undefined;
  private nextAttemptTime?: Date | undefined;
  private halfOpenCallCount = 0;
  private metrics: CircuitBreakerMetrics;

  constructor(private config: CircuitBreakerConfig) {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitBreakerTrips: 0,
      averageResponseTime: 0,
      lastFailureTime: undefined,
      lastSuccessTime: undefined
    };
  }

  // Execute a function with circuit breaker protection
  async execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Check if circuit breaker should block the request
    if (this.shouldBlockRequest()) {
      const error: UserServiceError = {
        type: 'circuit_breaker',
        message: `Circuit breaker is ${this.state}. Service temporarily unavailable.`,
        code: 'CIRCUIT_BREAKER_OPEN',
        recoverable: true,
        retryAfter: this.getRetryAfter(),
        details: {
          state: this.state,
          failureCount: this.failureCount,
          nextAttemptTime: this.nextAttemptTime,
          operationName
        }
      };
      throw error;
    }

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);
      throw error;
    }
  }

  // Check if the request should be blocked
  private shouldBlockRequest(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'closed':
        return false;

      case 'open':
        if (this.nextAttemptTime && now >= this.nextAttemptTime.getTime()) {
          this.transitionToHalfOpen();
          return false;
        }
        return true;

      case 'half-open':
        if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
          return true;
        }
        this.halfOpenCallCount++;
        return false;

      default:
        return false;
    }
  }

  // Handle successful operation
  private onSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = new Date();
    this.updateAverageResponseTime(responseTime);

    switch (this.state) {
      case 'closed':
        this.resetFailureCount();
        break;

      case 'half-open':
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.transitionToClosed();
        }
        break;
    }
  }

  // Handle failed operation
  private onFailure(error: unknown, responseTime: number): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = new Date();
    this.updateAverageResponseTime(responseTime);

    // Check if it's a timeout error
    if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
      this.metrics.timeouts++;
    }

    this.failureCount++;
    this.lastFailureTime = new Date();

    switch (this.state) {
      case 'closed':
        if (this.failureCount >= this.config.failureThreshold) {
          this.transitionToOpen();
        }
        break;

      case 'half-open':
        this.transitionToOpen();
        break;
    }
  }

  // Transition to open state
  private transitionToOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.halfOpenCallCount = 0;
    this.successCount = 0;
    this.metrics.circuitBreakerTrips++;
    
    console.warn(`[Circuit Breaker] Opened due to ${this.failureCount} failures. Next attempt at ${this.nextAttemptTime}`);
  }

  // Transition to half-open state
  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.halfOpenCallCount = 0;
    this.successCount = 0;
    
    console.info('[Circuit Breaker] Transitioned to half-open state for testing');
  }

  // Transition to closed state
  private transitionToClosed(): void {
    this.state = 'closed';
    this.resetFailureCount();
    this.halfOpenCallCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = undefined;
    
    console.info('[Circuit Breaker] Closed - service recovered');
  }

  // Reset failure count
  private resetFailureCount(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
  }

  // Update average response time
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Get retry after time in seconds
  private getRetryAfter(): number {
    if (!this.nextAttemptTime) return 0;
    return Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000);
  }

  // Get current circuit breaker state
  getState(): CircuitBreakerState {
    const state: CircuitBreakerState = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
    
    if (this.lastFailureTime) {
      state.lastFailureTime = this.lastFailureTime;
    }
    
    if (this.nextAttemptTime) {
      state.nextAttemptTime = this.nextAttemptTime;
    }
    
    return state;
  }

  // Get circuit breaker metrics
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  // Get health status
  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const failureRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;

    if (this.state === 'open') {
      return 'unhealthy';
    }

    if (this.state === 'half-open' || failureRate > 0.1) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Reset circuit breaker (for testing or manual recovery)
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    
    // Reset metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitBreakerTrips: 0,
      averageResponseTime: 0,
      lastFailureTime: undefined,
      lastSuccessTime: undefined
    };
    
    console.info('[Circuit Breaker] Reset to initial state');
  }

  // Force state change (for testing)
  forceState(state: CircuitBreakerState['state']): void {
    this.state = state;
    if (state === 'open') {
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    }
  }
}

// Default circuit breaker configuration
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open after 5 consecutive failures
  recoveryTimeout: 30000,   // Wait 30 seconds before trying half-open
  monitoringPeriod: 60000,  // Monitor failures over 1 minute window
  halfOpenMaxCalls: 3,      // Allow 3 test calls in half-open state
  successThreshold: 2       // Need 2 successes to close from half-open
};

// Circuit breaker factory
export const createUserServiceCircuitBreaker = (
  config: Partial<CircuitBreakerConfig> = {}
): UserServiceCircuitBreaker => {
  const finalConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  return new UserServiceCircuitBreaker(finalConfig);
};

// Global circuit breaker instance (singleton)
let globalCircuitBreaker: UserServiceCircuitBreaker | null = null;

export const getGlobalCircuitBreaker = (): UserServiceCircuitBreaker => {
  if (!globalCircuitBreaker) {
    globalCircuitBreaker = createUserServiceCircuitBreaker();
  }
  return globalCircuitBreaker;
};

// Reset global circuit breaker
export const resetGlobalCircuitBreaker = (): void => {
  if (globalCircuitBreaker) {
    globalCircuitBreaker.reset();
  }
};