/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is unavailable
 */

export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private metrics: CircuitBreakerMetrics = {
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  };
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = CircuitBreakerState.HALF_OPEN;
    }

    try {
      const result = await Promise.race([fn(), this.timeout()]);

      this.onSuccess();
      return result as T;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Request timeout"));
      }, this.config.timeout);
    });
  }

  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.resetMetrics();
      }
    }
  }

  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    };
  }

  /**
   * Gets the current state of the circuit breaker
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Gets the current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Manually resets the circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.resetMetrics();
    this.nextAttemptTime = 0;
  }
}

/**
 * Creates a circuit breaker with default configuration
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  };

  return new CircuitBreaker({ ...defaultConfig, ...config });
}

/**
 * Checks if an error should trigger the circuit breaker
 */
export function isCircuitBreakerError(error: unknown): boolean {
  if (!error) return false;

  // Check if it's an axios error with specific status codes
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;

    // Check for response status codes that should trigger circuit breaker
    if ("response" in err && err.response) {
      const response = err.response as Record<string, unknown>;
      if ("status" in response && typeof response.status === "number") {
        const status = response.status;
        // Trigger on server errors and service unavailable
        return status >= 500 || status === 408 || status === 429;
      }
    }

    // Check for network errors
    if ("code" in err && typeof err.code === "string") {
      const networkErrors = [
        "ECONNRESET",
        "ENOTFOUND",
        "ECONNABORTED",
        "ETIMEDOUT",
        "ECONNREFUSED",
      ];
      return networkErrors.includes(err.code);
    }
  }

  return false;
}
