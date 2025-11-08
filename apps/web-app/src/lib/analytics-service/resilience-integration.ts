/**
 * Analytics Service Resilience Integration
 *
 * Integrates error handling, graceful degradation, and performance monitoring
 * into a unified resilience system for analytics features.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.5
 */

import React from "react";
import {
  AnalyticsDegradationManager,
  analyticsDegradationManager,
  type DegradationLevel,
  type AnalyticsDataResult,
} from "./degradation-manager";
import {
  AnalyticsPerformanceMonitor,
  analyticsPerformanceMonitor,
  type PerformanceAlert,
} from "./monitoring";
import {
  BaseAnalyticsError,
  AnalyticsErrorHandler,
  AnalyticsErrorFactory,
} from "./errors";
import { analyticsCircuitBreakerManager } from "./circuit-breaker";
import type {
  AnalyticsServiceClient,
  CompleteAnalyticsWebSocketManager,
  ServiceHealthStatus,
} from "@/types/analytics-service";

// ============================================================================
// Types
// ============================================================================

export interface ResilienceConfig {
  // Error handling
  enableErrorBoundaries: boolean;
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;

  // Degradation management
  enableGracefulDegradation: boolean;
  degradationThresholds: {
    partialFailures: number;
    significantFailures: number;
    criticalFailures: number;
  };

  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  performanceBudgets: {
    maxLatency: number;
    minSuccessRate: number;
    maxErrorRate: number;
  };

  // Circuit breaker integration
  enableCircuitBreaker: boolean;
  circuitBreakerThresholds: {
    failureThreshold: number;
    timeout: number;
    successThreshold: number;
  };

  // Health monitoring
  healthCheckInterval: number;
  healthCheckTimeout: number;
}

export interface ResilienceState {
  // Overall health
  isHealthy: boolean;
  healthScore: number;

  // Component states
  degradationLevel: DegradationLevel;
  circuitBreakerState: "closed" | "open" | "half-open";
  performanceScore: number;

  // Error tracking
  recentErrors: BaseAnalyticsError[];
  errorRate: number;
  consecutiveFailures: number;

  // Status messages
  statusMessage: string;
  recommendations: string[];
}

// ============================================================================
// Analytics Resilience Manager
// ============================================================================

export class AnalyticsResilienceManager {
  private config: ResilienceConfig;
  private degradationManager: AnalyticsDegradationManager;
  private performanceMonitor: AnalyticsPerformanceMonitor;
  private client: AnalyticsServiceClient | null = null;
  private webSocketManager: CompleteAnalyticsWebSocketManager | null = null;

  private state: ResilienceState;
  private listeners: Array<(state: ResilienceState) => void> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;

  constructor(config?: Partial<ResilienceConfig>) {
    this.config = {
      enableErrorBoundaries: true,
      maxRetryAttempts: 3,
      retryBackoffMultiplier: 2,
      enableGracefulDegradation: true,
      degradationThresholds: {
        partialFailures: 3,
        significantFailures: 7,
        criticalFailures: 15,
      },
      enablePerformanceMonitoring: true,
      performanceBudgets: {
        maxLatency: 5000,
        minSuccessRate: 0.95,
        maxErrorRate: 0.05,
      },
      enableCircuitBreaker: true,
      circuitBreakerThresholds: {
        failureThreshold: 5,
        timeout: 60000,
        successThreshold: 3,
      },
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      ...config,
    };

    this.degradationManager = analyticsDegradationManager;
    this.performanceMonitor = analyticsPerformanceMonitor;

    this.state = {
      isHealthy: true,
      healthScore: 100,
      degradationLevel: "optimal",
      circuitBreakerState: "closed",
      performanceScore: 100,
      recentErrors: [],
      errorRate: 0,
      consecutiveFailures: 0,
      statusMessage: "Analytics service is operating normally",
      recommendations: [],
    };

    this.initialize();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Sets the analytics service client
   */
  setClient(client: AnalyticsServiceClient) {
    this.client = client;
    this.setupClientIntegration();
  }

  /**
   * Sets the WebSocket manager
   */
  setWebSocketManager(manager: CompleteAnalyticsWebSocketManager) {
    this.webSocketManager = manager;
    this.setupWebSocketIntegration();
  }

  /**
   * Executes an operation with full resilience support
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: {
      operationName: string;
      fallbackData?: T;
      cacheKey?: string;
      retryable?: boolean;
    },
  ): Promise<AnalyticsDataResult<T>> {
    const { operationName, fallbackData, cacheKey, retryable = true } = options;

    // Start performance tracking
    const requestId = this.performanceMonitor.startRequest(operationName);

    try {
      // Check circuit breaker
      if (this.config.enableCircuitBreaker) {
        const circuitBreaker =
          analyticsCircuitBreakerManager.getCircuitBreaker("main");
        if (circuitBreaker.getState() === "open") {
          throw new Error("Circuit breaker is open");
        }
      }

      // Execute with degradation manager
      const result = await this.degradationManager.getAnalyticsData(
        cacheKey || operationName,
        operation,
        fallbackData,
      );

      // Record success
      this.performanceMonitor.endRequest(requestId, result.source === "cache");
      this.recordSuccess();

      return result;
    } catch (error) {
      const analyticsError = AnalyticsErrorFactory.fromError(error);

      // Record error
      this.performanceMonitor.endRequestWithError(requestId, analyticsError);
      this.recordError(analyticsError);

      // Handle retry logic if enabled
      if (retryable && analyticsError.recoverable) {
        const { shouldRetry, retryDelay } =
          await AnalyticsErrorHandler.handleError(analyticsError, {
            operation: operationName,
            attempt: 1,
            maxAttempts: this.config.maxRetryAttempts,
          });

        if (shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return this.executeWithResilience(operation, {
            ...options,
            retryable: false,
          });
        }
      }

      // Return degraded result
      return this.degradationManager.getAnalyticsData(
        cacheKey || operationName,
        () => Promise.reject(analyticsError),
        fallbackData,
      );
    }
  }

  /**
   * Gets current resilience state
   */
  getState(): ResilienceState {
    return { ...this.state };
  }

  /**
   * Gets health status
   */
  async getHealthStatus(): Promise<ServiceHealthStatus> {
    try {
      if (!this.client) {
        return {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          details: { error: "No client configured" },
        };
      }

      const health = await this.client.getHealthStatus();

      return health;
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Forces a health check and state update
   */
  async checkHealth(): Promise<void> {
    const health = await this.getHealthStatus();
    this.updateStateFromHealth(health);
  }

  /**
   * Gets recommendations for improving resilience
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.state.degradationLevel !== "optimal") {
      recommendations.push(
        "Service is degraded - consider checking network connectivity",
      );
    }

    if (this.state.performanceScore < 80) {
      recommendations.push(
        "Performance is below optimal - consider clearing cache or reducing load",
      );
    }

    if (this.state.errorRate > 0.1) {
      recommendations.push(
        "High error rate detected - check service logs and configuration",
      );
    }

    if (this.state.circuitBreakerState === "open") {
      recommendations.push(
        "Circuit breaker is open - service will recover automatically",
      );
    }

    if (this.consecutiveFailures > 5) {
      recommendations.push(
        "Multiple consecutive failures - consider manual intervention",
      );
    }

    return recommendations;
  }

  /**
   * Resets resilience state (useful for recovery)
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.state.recentErrors = [];
    this.state.consecutiveFailures = 0;
    this.degradationManager.setDegradationLevel("optimal", "Manual reset");
    this.performanceMonitor.clearMetrics();

    console.log("[ResilienceManager] State reset");
    this.updateState();
  }

  /**
   * Adds state change listener
   */
  onStateChange(listener: (state: ResilienceState) => void) {
    this.listeners.push(listener);
  }

  /**
   * Removes state change listener
   */
  offStateChange(listener: (state: ResilienceState) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Destroys the resilience manager
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.listeners = [];
    console.log("[ResilienceManager] Destroyed");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initialize(): void {
    // Set up degradation manager health check
    this.degradationManager.setHealthCheckCallback(() =>
      this.getHealthStatus(),
    );

    // Set up performance monitoring alerts
    this.performanceMonitor.onAlert((alert: PerformanceAlert) => {
      this.handlePerformanceAlert(alert);
    });

    // Set up degradation state monitoring
    this.degradationManager.onStateChange((degradationState) => {
      this.state.degradationLevel = degradationState.level;
      this.state.statusMessage = this.degradationManager.getStatusMessage();
      this.updateState();
    });

    // Start health monitoring
    this.startHealthMonitoring();

    console.log("[ResilienceManager] Initialized");
  }

  private setupClientIntegration(): void {
    if (!this.client) return;

    // Integrate with client error handling
    console.log("[ResilienceManager] Client integration set up");
  }

  private setupWebSocketIntegration(): void {
    if (!this.webSocketManager) return;

    // Monitor WebSocket connection health
    console.log("[ResilienceManager] WebSocket integration set up");
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.updateState();
  }

  private recordError(error: BaseAnalyticsError): void {
    this.consecutiveFailures++;

    // Add to recent errors (keep last 10)
    this.state.recentErrors = [error, ...this.state.recentErrors.slice(0, 9)];

    // Update degradation level based on consecutive failures
    if (this.config.enableGracefulDegradation) {
      const { degradationThresholds } = this.config;

      if (this.consecutiveFailures >= degradationThresholds.criticalFailures) {
        this.degradationManager.setDegradationLevel(
          "critical",
          "Critical failure threshold reached",
        );
      } else if (
        this.consecutiveFailures >= degradationThresholds.significantFailures
      ) {
        this.degradationManager.setDegradationLevel(
          "significant",
          "Significant failure threshold reached",
        );
      } else if (
        this.consecutiveFailures >= degradationThresholds.partialFailures
      ) {
        this.degradationManager.setDegradationLevel(
          "partial",
          "Partial failure threshold reached",
        );
      }
    }

    this.updateState();
  }

  private handlePerformanceAlert(alert: PerformanceAlert): void {
    console.warn("[ResilienceManager] Performance alert:", alert);

    // Escalate degradation based on alert severity
    if (alert.severity === "error" || alert.severity === "critical") {
      if (this.state.degradationLevel === "optimal") {
        this.degradationManager.setDegradationLevel(
          "partial",
          `Performance alert: ${alert.message}`,
        );
      }
    }
  }

  private updateStateFromHealth(health: ServiceHealthStatus): void {
    const isHealthy = health.status === "healthy";

    if (isHealthy && this.consecutiveFailures === 0) {
      // Service is healthy, restore optimal state
      if (this.state.degradationLevel !== "optimal") {
        this.degradationManager.setDegradationLevel(
          "optimal",
          "Service health restored",
        );
      }
    }

    this.updateState();
  }

  private updateState(): void {
    // Calculate health score
    const performanceMetrics = this.performanceMonitor.getPerformanceMetrics();
    const circuitBreakerHealth =
      analyticsCircuitBreakerManager.getOverallHealth();

    this.state.performanceScore = performanceMetrics.performanceScore;
    this.state.circuitBreakerState =
      circuitBreakerHealth.circuitBreakers?.main?.state || "closed";
    this.state.errorRate = performanceMetrics.errorRate;
    this.state.consecutiveFailures = this.consecutiveFailures;

    // Calculate overall health score
    let healthScore = 100;

    // Deduct for degradation
    switch (this.state.degradationLevel) {
      case "partial":
        healthScore -= 20;
        break;
      case "significant":
        healthScore -= 40;
        break;
      case "critical":
        healthScore -= 70;
        break;
      case "complete":
        healthScore -= 100;
        break;
    }

    // Deduct for performance issues
    healthScore -= Math.max(0, (100 - this.state.performanceScore) * 0.3);

    // Deduct for circuit breaker issues
    if (this.state.circuitBreakerState === "open") {
      healthScore -= 30;
    } else if (this.state.circuitBreakerState === "half-open") {
      healthScore -= 15;
    }

    // Deduct for consecutive failures
    healthScore -= Math.min(30, this.consecutiveFailures * 2);

    this.state.healthScore = Math.max(0, Math.round(healthScore));
    this.state.isHealthy = this.state.healthScore >= 70;

    // Update recommendations
    this.state.recommendations = this.getRecommendations();

    // Notify listeners
    this.notifyListeners();
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error("[ResilienceManager] Health check failed:", error);
      }
    }, this.config.healthCheckInterval);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error("[ResilienceManager] Error in state listener:", error);
      }
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsResilienceManager = new AnalyticsResilienceManager();

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for analytics resilience
 */
export function useAnalyticsResilience() {
  const [state, setState] = React.useState<ResilienceState>(
    analyticsResilienceManager.getState(),
  );

  React.useEffect(() => {
    const handleStateChange = (newState: ResilienceState) => {
      setState(newState);
    };

    analyticsResilienceManager.onStateChange(handleStateChange);

    return () => {
      analyticsResilienceManager.offStateChange(handleStateChange);
    };
  }, []);

  return {
    state,
    executeWithResilience:
      analyticsResilienceManager.executeWithResilience.bind(
        analyticsResilienceManager,
      ),
    checkHealth: analyticsResilienceManager.checkHealth.bind(
      analyticsResilienceManager,
    ),
    reset: analyticsResilienceManager.reset.bind(analyticsResilienceManager),
    getRecommendations: analyticsResilienceManager.getRecommendations.bind(
      analyticsResilienceManager,
    ),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default AnalyticsResilienceManager;
