/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures and provides graceful degradation
 */

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before half-open (ms)
  monitoringPeriod: number; // Time window for counting failures (ms)
  halfOpenMaxCalls: number; // Max calls to test in half-open state
  successThreshold: number; // Successes needed to close from half-open
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private halfOpenCalls: number = 0;
  private failureTimestamps: Date[] = [];

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(
          `Circuit breaker is open. Next attempt at ${this.nextAttemptTime?.toISOString()}`
        );
      }
    }

    if (this.state === 'half-open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is testing recovery. Please wait.');
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
   * Record successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.successes++;

    if (this.state === 'half-open') {
      this.halfOpenCalls++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.failures++;
    this.failureTimestamps.push(new Date());

    // Clean old timestamps outside monitoring period
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.failureTimestamps = this.failureTimestamps.filter(
      (ts) => ts.getTime() > cutoff
    );

    if (this.state === 'half-open') {
      this.transitionToOpen();
    } else if (
      this.state === 'closed' &&
      this.failureTimestamps.length >= this.config.failureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.failureTimestamps = [];
    this.nextAttemptTime = undefined;
    console.log('[CircuitBreaker] Transitioned to CLOSED');
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    console.log(
      `[CircuitBreaker] Transitioned to OPEN. Next attempt at ${this.nextAttemptTime.toISOString()}`
    );
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.successes = 0;
    this.halfOpenCalls = 0;
    console.log('[CircuitBreaker] Transitioned to HALF-OPEN');
  }

  /**
   * Check if should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return (
      this.nextAttemptTime !== undefined &&
      Date.now() >= this.nextAttemptTime.getTime()
    );
  }

  /**
   * Get current stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionToClosed();
  }
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 10000, // 10 seconds
  halfOpenMaxCalls: 3,
  successThreshold: 2,
};

/**
 * Create circuit breaker instance
 */
export function createCircuitBreaker(
  config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker {
  return new CircuitBreaker({
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    ...config,
  });
}
