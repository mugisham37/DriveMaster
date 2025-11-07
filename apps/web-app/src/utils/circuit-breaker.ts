/**
 * Circuit Breaker Pattern Implementation
 * 
 * Implements circuit breaker pattern for service failures with configurable thresholds,
 * automatic recovery, health checking, and state monitoring
 * Requirements: 7.1
 */

import type { CircuitBreakerConfig } from '@/types/config'
import type { CircuitBreakerError } from '@/types/errors'

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  lastFailureTime: Date | null
  lastSuccessTime: Date | null
  nextRetryTime: Date | null
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
  uptime: number
  downtime: number
}

export interface CircuitBreakerMetrics {
  failureRate: number
  successRate: number
  averageResponseTime: number
  requestsPerSecond: number
  stateChanges: number
  lastStateChange: Date | null
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: Date | null = null
  private lastSuccessTime: Date | null = null
  private nextRetryTime: Date | null = null
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private stateChangeCount = 0
  private lastStateChange: Date | null = null
  private halfOpenCallCount = 0
  private responseTimes: number[] = []
  private stateStartTime = Date.now()
  private listeners: Array<(state: CircuitBreakerState, stats: CircuitBreakerStats) => void> = []

  constructor(private config: CircuitBreakerConfig) {
    // Start monitoring if enabled
    if (config.enableMetrics) {
      this.startMonitoring()
    }
  }

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    // Check if circuit breaker allows the call
    if (!this.canExecute()) {
      const error: CircuitBreakerError = {
        type: 'service_unavailable',
        cause: 'circuit_breaker_open',
        message: 'Circuit breaker is open. Service is temporarily unavailable.',
        code: 'CIRCUIT_BREAKER_OPEN',
        recoverable: true,
        timestamp: new Date(),
        failureCount: this.failureCount,
        lastFailureTime: this.lastFailureTime!,
        nextRetryTime: this.nextRetryTime!,
        retryAfter: this.getRetryAfterSeconds()
      }
      throw error
    }

    this.totalRequests++

    try {
      const result = await fn()
      
      // Record success
      const responseTime = Date.now() - startTime
      this.onSuccess(responseTime)
      
      return result
    } catch (error) {
      // Record failure
      const responseTime = Date.now() - startTime
      this.onFailure(responseTime)
      
      throw error
    }
  }

  /**
   * Checks if the circuit breaker allows execution
   */
  private canExecute(): boolean {
    const now = Date.now()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        // Check if recovery timeout has passed
        if (this.nextRetryTime && now >= this.nextRetryTime.getTime()) {
          this.transitionToHalfOpen()
          return true
        }
        return false

      case 'half-open':
        // Allow limited calls in half-open state
        return this.halfOpenCallCount < (this.config.halfOpenMaxCalls ?? 3)

      default:
        return false
    }
  }

  /**
   * Handles successful execution
   */
  private onSuccess(responseTime: number): void {
    this.successCount++
    this.totalSuccesses++
    this.lastSuccessTime = new Date()
    this.recordResponseTime(responseTime)

    if (this.state === 'half-open') {
      this.halfOpenCallCount++
      
      // If we've had enough successful calls in half-open, close the circuit
      if (this.halfOpenCallCount >= (this.config.halfOpenMaxCalls ?? 3)) {
        this.transitionToClosed()
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failureCount = 0
    }

    this.notifyListeners()
  }

  /**
   * Handles failed execution
   */
  private onFailure(responseTime: number): void {
    this.failureCount++
    this.totalFailures++
    this.lastFailureTime = new Date()
    this.recordResponseTime(responseTime)

    if (this.state === 'closed' || this.state === 'half-open') {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen()
      }
    }

    this.notifyListeners()
  }

  /**
   * Transitions circuit breaker to closed state
   */
  private transitionToClosed(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenCallCount = 0
    this.nextRetryTime = null
    this.recordStateChange()
    
    console.log('[CircuitBreaker] Transitioned to CLOSED state')
  }

  /**
   * Transitions circuit breaker to open state
   */
  private transitionToOpen(): void {
    this.state = 'open'
    this.nextRetryTime = new Date(Date.now() + (this.config.recoveryTimeout ?? 30000))
    this.recordStateChange()
    
    console.log(`[CircuitBreaker] Transitioned to OPEN state. Next retry at: ${this.nextRetryTime.toISOString()}`)
  }

  /**
   * Transitions circuit breaker to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = 'half-open'
    this.halfOpenCallCount = 0
    this.successCount = 0
    this.recordStateChange()
    
    console.log('[CircuitBreaker] Transitioned to HALF-OPEN state')
  }

  /**
   * Records state change for metrics
   */
  private recordStateChange(): void {
    this.stateChangeCount++
    this.lastStateChange = new Date()
    this.stateStartTime = Date.now()
  }

  /**
   * Records response time for metrics
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime)
    
    // Keep only last 100 response times for memory efficiency
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100)
    }
  }

  /**
   * Gets retry after time in seconds
   */
  private getRetryAfterSeconds(): number {
    if (!this.nextRetryTime) return 0
    return Math.max(0, Math.ceil((this.nextRetryTime.getTime() - Date.now()) / 1000))
  }

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const now = Date.now()
    const stateUptime = now - this.stateStartTime
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.nextRetryTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: this.state === 'closed' ? stateUptime : 0,
      downtime: this.state === 'open' ? stateUptime : 0
    }
  }

  /**
   * Gets circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const stats = this.getStats()
    const failureRate = stats.totalRequests > 0 ? (stats.totalFailures / stats.totalRequests) * 100 : 0
    const successRate = stats.totalRequests > 0 ? (stats.totalSuccesses / stats.totalRequests) * 100 : 0
    
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0

    // Calculate requests per second over the monitoring period
    const monitoringPeriodMs = this.config.monitoringPeriod ?? 60000
    const requestsPerSecond = monitoringPeriodMs > 0 ? (stats.totalRequests / monitoringPeriodMs) * 1000 : 0

    return {
      failureRate,
      successRate,
      averageResponseTime,
      requestsPerSecond,
      stateChanges: this.stateChangeCount,
      lastStateChange: this.lastStateChange
    }
  }

  /**
   * Checks if the circuit breaker is healthy
   */
  isHealthy(): boolean {
    const metrics = this.getMetrics()
    
    // Consider healthy if:
    // - Circuit is closed, OR
    // - Failure rate is below threshold, OR
    // - Recent success rate is good
    return (
      this.state === 'closed' ||
      metrics.failureRate < 50 ||
      (this.successCount > 0 && metrics.successRate > 80)
    )
  }

  /**
   * Manually resets the circuit breaker
   */
  reset(): void {
    this.transitionToClosed()
    this.totalRequests = 0
    this.totalFailures = 0
    this.totalSuccesses = 0
    this.responseTimes = []
    this.stateChangeCount = 0
    this.lastStateChange = null
    
    console.log('[CircuitBreaker] Manually reset to initial state')
    this.notifyListeners()
  }

  /**
   * Adds a state change listener
   */
  addListener(listener: (state: CircuitBreakerState, stats: CircuitBreakerStats) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    const stats = this.getStats()
    this.listeners.forEach(listener => {
      try {
        listener(this.state, stats)
      } catch (error) {
        console.error('[CircuitBreaker] Error in state change listener:', error)
      }
    })
  }

  /**
   * Starts monitoring and periodic health checks
   */
  private startMonitoring(): void {
    // Periodic monitoring every monitoring period
    setInterval(() => {
      const metrics = this.getMetrics()
      
      if (this.config.enableMetrics) {
        console.log('[CircuitBreaker] Metrics:', {
          state: this.state,
          failureRate: `${metrics.failureRate.toFixed(2)}%`,
          successRate: `${metrics.successRate.toFixed(2)}%`,
          averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
          requestsPerSecond: metrics.requestsPerSecond.toFixed(2),
          stateChanges: metrics.stateChanges
        })
      }
    }, this.config.monitoringPeriod)
  }

  /**
   * Gets the current state
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Forces the circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.transitionToOpen()
    console.log('[CircuitBreaker] Manually forced to OPEN state')
    this.notifyListeners()
  }

  /**
   * Forces the circuit breaker to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.transitionToClosed()
    console.log('[CircuitBreaker] Manually forced to CLOSED state')
    this.notifyListeners()
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a circuit breaker with default configuration
 */
export function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 10000, // 10 seconds
    successThreshold: 2,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    halfOpenMaxCalls: 3,
    enableMetrics: true
  }

  return new CircuitBreaker({ ...defaultConfig, ...config })
}

/**
 * Checks if an error should trigger circuit breaker failure
 */
export function isCircuitBreakerError(error: unknown): boolean {
  // Network errors, timeouts, and server errors should trigger circuit breaker
  if (error && typeof error === 'object' && 'type' in error) {
    const errorType = (error as { type: string }).type
    return ['network', 'timeout', 'server', 'service_unavailable'].includes(errorType)
  }
  
  return false
}

/**
 * Creates a circuit breaker wrapper for async functions
 */
export function withCircuitBreaker<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  circuitBreaker: CircuitBreaker
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args))
  }
}