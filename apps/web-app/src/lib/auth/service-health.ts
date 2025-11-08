/**
 * Service Health Monitoring System
 * Monitors auth service health and integrates with circuit breaker
 */

import { circuitBreakerManager } from "./circuit-breaker";
import { AuthErrorHandler } from "./error-handler";

export interface ServiceHealthStatus {
  service: string;
  healthy: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  details?: Record<string, unknown>;
}

export interface HealthCheckConfig {
  interval: number; // Health check interval in ms
  timeout: number; // Health check timeout in ms
  retryAttempts: number; // Number of retry attempts
  degradedThreshold: number; // Error rate threshold for degraded status
  unhealthyThreshold: number; // Error rate threshold for unhealthy status
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<{
  healthy: boolean;
  responseTime: number;
  details?: Record<string, unknown>;
}>;

/**
 * Service Health Monitor
 */
export class ServiceHealthMonitor {
  private healthStatus = new Map<string, ServiceHealthStatus>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  private healthCheckFunctions = new Map<string, HealthCheckFunction>();

  constructor(private readonly config: HealthCheckConfig) {}

  /**
   * Register a service for health monitoring
   */
  registerService(
    serviceName: string,
    healthCheckFn: HealthCheckFunction,
    config?: Partial<HealthCheckConfig>,
  ): void {
    const finalConfig = { ...this.config, ...config };

    this.healthCheckFunctions.set(serviceName, healthCheckFn);

    // Initialize health status
    this.healthStatus.set(serviceName, {
      service: serviceName,
      healthy: true,
      status: "healthy",
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      uptime: 100,
    });

    // Start periodic health checks
    this.startHealthChecks(serviceName, finalConfig);
  }

  /**
   * Unregister a service from health monitoring
   */
  unregisterService(serviceName: string): void {
    const interval = this.healthCheckIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);
    }

    this.healthCheckFunctions.delete(serviceName);
    this.healthStatus.delete(serviceName);
  }

  /**
   * Start periodic health checks for a service
   */
  private startHealthChecks(
    serviceName: string,
    config: HealthCheckConfig,
  ): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(serviceName, config);
    }, config.interval);

    this.healthCheckIntervals.set(serviceName, interval);

    // Perform initial health check
    this.performHealthCheck(serviceName, config);
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(
    serviceName: string,
    config: HealthCheckConfig,
  ): Promise<void> {
    const healthCheckFn = this.healthCheckFunctions.get(serviceName);
    if (!healthCheckFn) return;

    const startTime = Date.now();
    let attempt = 0;
    let lastError: unknown;

    while (attempt < config.retryAttempts) {
      try {
        const result = await this.executeHealthCheckWithTimeout(
          healthCheckFn,
          config.timeout,
        );

        const responseTime = Date.now() - startTime;
        const updateData: {
          healthy: boolean;
          responseTime: number;
          details?: Record<string, unknown>;
        } = {
          healthy: result.healthy,
          responseTime,
        };

        if (result.details) {
          updateData.details = result.details;
        }

        this.updateHealthStatus(serviceName, updateData);

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < config.retryAttempts) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    this.updateHealthStatus(serviceName, {
      healthy: false,
      responseTime,
      error: lastError,
    });
  }

  /**
   * Execute health check with timeout
   */
  private async executeHealthCheckWithTimeout(
    healthCheckFn: HealthCheckFunction,
    timeout: number,
  ): Promise<{
    healthy: boolean;
    responseTime: number;
    details?: Record<string, unknown>;
  }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      healthCheckFn()
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
   * Update health status for a service
   */
  private updateHealthStatus(
    serviceName: string,
    update: {
      healthy: boolean;
      responseTime: number;
      details?: Record<string, unknown>;
      error?: unknown;
    },
  ): void {
    const currentStatus = this.healthStatus.get(serviceName);
    if (!currentStatus) return;

    // Calculate error rate (simple moving average over last 10 checks)
    const errorRate = update.healthy
      ? Math.max(0, currentStatus.errorRate - 0.1)
      : Math.min(1, currentStatus.errorRate + 0.1);

    // Determine status based on error rate
    let status: ServiceHealthStatus["status"] = "healthy";
    if (errorRate >= this.config.unhealthyThreshold) {
      status = "unhealthy";
    } else if (errorRate >= this.config.degradedThreshold) {
      status = "degraded";
    }

    // Calculate uptime
    const uptime = this.calculateUptime(serviceName, update.healthy);

    const newStatus: ServiceHealthStatus = {
      ...currentStatus,
      healthy: update.healthy,
      status,
      lastCheck: new Date(),
      responseTime: update.responseTime,
      errorRate,
      uptime,
    };

    if (update.details) {
      newStatus.details = update.details;
    }

    this.healthStatus.set(serviceName, newStatus);

    // Log status changes
    if (currentStatus.status !== status) {
      this.logHealthStatusChange(
        serviceName,
        currentStatus.status,
        status,
        update.error,
      );
    }

    // Integrate with circuit breaker
    this.updateCircuitBreakerState(serviceName, newStatus);
  }

  /**
   * Calculate service uptime percentage
   */
  private calculateUptime(serviceName: string, isHealthy: boolean): number {
    const currentStatus = this.healthStatus.get(serviceName);
    if (!currentStatus) return isHealthy ? 100 : 0;

    // Simple uptime calculation based on error rate
    return Math.max(0, 100 - currentStatus.errorRate * 100);
  }

  /**
   * Update circuit breaker state based on health status
   */
  private updateCircuitBreakerState(
    serviceName: string,
    healthStatus: ServiceHealthStatus,
  ): void {
    const circuitBreaker = circuitBreakerManager
      .getAllCircuitBreakers()
      .get(serviceName);
    if (!circuitBreaker) return;

    // Force open circuit breaker if service is unhealthy
    if (healthStatus.status === "unhealthy") {
      const currentState = circuitBreaker.getState();
      if (currentState.state !== "open") {
        circuitBreaker.forceOpen();
      }
    }
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus | undefined {
    return this.healthStatus.get(serviceName);
  }

  /**
   * Get health status for all services
   */
  getAllServiceHealth(): Map<string, ServiceHealthStatus> {
    return new Map(this.healthStatus);
  }

  /**
   * Get overall system health
   */
  getOverallHealth(): {
    healthy: boolean;
    status: "healthy" | "degraded" | "unhealthy";
    services: ServiceHealthStatus[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const services = Array.from(this.healthStatus.values());
    const summary = {
      total: services.length,
      healthy: services.filter((s) => s.status === "healthy").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      unhealthy: services.filter((s) => s.status === "unhealthy").length,
    };

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (summary.unhealthy > 0) {
      overallStatus = "unhealthy";
    } else if (summary.degraded > 0) {
      overallStatus = "degraded";
    }

    return {
      healthy: overallStatus === "healthy",
      status: overallStatus,
      services,
      summary,
    };
  }

  /**
   * Manually trigger health check for a service
   */
  async checkServiceHealth(
    serviceName: string,
  ): Promise<ServiceHealthStatus | undefined> {
    await this.performHealthCheck(serviceName, this.config);
    return this.getServiceHealth(serviceName);
  }

  /**
   * Log health status changes
   */
  private logHealthStatusChange(
    serviceName: string,
    oldStatus: ServiceHealthStatus["status"],
    newStatus: ServiceHealthStatus["status"],
    error?: unknown,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      statusChange: { from: oldStatus, to: newStatus },
      error: error
        ? AuthErrorHandler.processError(error, "health_check")
        : undefined,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("Service Health Status Change:", logEntry);
    }

    // In production, send to monitoring service
    // Example: sendToMonitoringService(logEntry)
  }

  /**
   * Stop all health monitoring
   */
  stopAll(): void {
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }

    this.healthCheckIntervals.clear();
    this.healthCheckFunctions.clear();
    this.healthStatus.clear();
  }
}

/**
 * Default health check configurations
 */
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retryAttempts: 3,
  degradedThreshold: 0.1, // 10% error rate
  unhealthyThreshold: 0.3, // 30% error rate
};

/**
 * Create health check function for auth service
 */
export function createAuthServiceHealthCheck(
  baseUrl: string,
): HealthCheckFunction {
  return async () => {
    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          healthy: false,
          responseTime,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        };
      }

      const data = await response.json();

      return {
        healthy: data.status === "healthy",
        responseTime,
        details: data,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };
}

/**
 * Create health check function for OAuth providers
 */
export function createOAuthProviderHealthCheck(
  provider: string,
  checkUrl: string,
): HealthCheckFunction {
  return async () => {
    const startTime = Date.now();

    try {
      const response = await fetch(checkUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      const responseTime = Date.now() - startTime;

      return {
        healthy: response.ok,
        responseTime,
        details: {
          provider,
          status: response.status,
          statusText: response.statusText,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        details: {
          provider,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };
}

// Export singleton instance
export const serviceHealthMonitor = new ServiceHealthMonitor(
  DEFAULT_HEALTH_CONFIG,
);
