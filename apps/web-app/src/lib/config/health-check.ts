/**
 * Service Health Check Utilities
 *
 * Centralized health checking for all microservices including analytics-dashboard
 */

import { analyticsServiceConfig } from "./analytics-service";
import { userServiceConfig } from "./user-service";
import { notificationServiceConfig } from "./notification-service";

// ============================================================================
// Health Check Types
// ============================================================================

export interface ServiceHealthCheck {
  serviceName: string;
  status: "healthy" | "unhealthy" | "unknown" | "degraded";
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthStatus {
  overall: "healthy" | "unhealthy" | "degraded";
  services: ServiceHealthCheck[];
  timestamp: Date;
}

// ============================================================================
// Health Check Manager
// ============================================================================

class HealthCheckManager {
  private healthCheckInterval: NodeJS.Timeout | undefined;
  private healthStatus: Map<string, ServiceHealthCheck> = new Map();

  constructor() {
    this.initializeHealthStatus();
  }

  private initializeHealthStatus(): void {
    // Initialize health status for all services
    this.healthStatus.set("analytics-service", {
      serviceName: "analytics-service",
      status: "unknown",
      lastChecked: new Date(),
    });

    this.healthStatus.set("user-service", {
      serviceName: "user-service",
      status: "unknown",
      lastChecked: new Date(),
    });

    this.healthStatus.set("notification-service", {
      serviceName: "notification-service",
      status: "unknown",
      lastChecked: new Date(),
    });
  }

  /**
   * Starts periodic health checks for all services
   */
  startHealthChecks(interval: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performAllHealthChecks();
    }, interval);

    // Perform initial health check
    this.performAllHealthChecks();
  }

  /**
   * Stops periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Performs health checks on all services
   */
  private async performAllHealthChecks(): Promise<void> {
    const healthCheckPromises = [
      this.checkAnalyticsServiceHealth(),
      this.checkUserServiceHealth(),
      this.checkNotificationServiceHealth(),
    ];

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Checks analytics service health
   */
  private async checkAnalyticsServiceHealth(): Promise<void> {
    try {
      const startTime = Date.now();

      // Check HTTP endpoint
      const response = await fetch(`${analyticsServiceConfig.baseUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();

        this.healthStatus.set("analytics-service", {
          serviceName: "analytics-service",
          status: healthData.status === "healthy" ? "healthy" : "degraded",
          responseTime,
          lastChecked: new Date(),
          details: healthData.details,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.healthStatus.set("analytics-service", {
        serviceName: "analytics-service",
        status: "unhealthy",
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Checks user service health
   */
  private async checkUserServiceHealth(): Promise<void> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${userServiceConfig.httpUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();

        this.healthStatus.set("user-service", {
          serviceName: "user-service",
          status: healthData.status === "healthy" ? "healthy" : "degraded",
          responseTime,
          lastChecked: new Date(),
          details: healthData.details,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.healthStatus.set("user-service", {
        serviceName: "user-service",
        status: "unhealthy",
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Checks notification service health
   */
  private async checkNotificationServiceHealth(): Promise<void> {
    try {
      const startTime = Date.now();

      const response = await fetch(
        `${notificationServiceConfig.baseUrl}/health`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
        },
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();

        this.healthStatus.set("notification-service", {
          serviceName: "notification-service",
          status: healthData.status === "healthy" ? "healthy" : "degraded",
          responseTime,
          lastChecked: new Date(),
          details: healthData.details,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.healthStatus.set("notification-service", {
        serviceName: "notification-service",
        status: "unhealthy",
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Gets the current system health status
   */
  getSystemHealth(): SystemHealthStatus {
    const services = Array.from(this.healthStatus.values());

    // Determine overall health
    const unhealthyServices = services.filter(
      (s) => s.status === "unhealthy",
    ).length;
    const degradedServices = services.filter(
      (s) => s.status === "degraded",
    ).length;

    let overall: "healthy" | "unhealthy" | "degraded";

    if (unhealthyServices > 0) {
      overall =
        unhealthyServices >= services.length / 2 ? "unhealthy" : "degraded";
    } else if (degradedServices > 0) {
      overall = "degraded";
    } else {
      overall = "healthy";
    }

    return {
      overall,
      services,
      timestamp: new Date(),
    };
  }

  /**
   * Gets health status for a specific service
   */
  getServiceHealth(serviceName: string): ServiceHealthCheck | null {
    return this.healthStatus.get(serviceName) || null;
  }

  /**
   * Forces a health check for all services
   */
  async refreshHealthStatus(): Promise<void> {
    await this.performAllHealthChecks();
  }

  /**
   * Forces a health check for a specific service
   */
  async refreshServiceHealth(serviceName: string): Promise<void> {
    switch (serviceName) {
      case "analytics-service":
        await this.checkAnalyticsServiceHealth();
        break;
      case "user-service":
        await this.checkUserServiceHealth();
        break;
      case "notification-service":
        await this.checkNotificationServiceHealth();
        break;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Checks if a service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    const health = this.healthStatus.get(serviceName);
    return health?.status === "healthy" || health?.status === "degraded";
  }

  /**
   * Checks if the system is available
   */
  isSystemAvailable(): boolean {
    const systemHealth = this.getSystemHealth();
    return systemHealth.overall !== "unhealthy";
  }
}

// Export singleton health check manager
export const healthCheckManager = new HealthCheckManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Starts health monitoring for all services
 */
export function startSystemHealthMonitoring(interval?: number): void {
  healthCheckManager.startHealthChecks(interval);
  console.log("System health monitoring started");
}

/**
 * Stops health monitoring
 */
export function stopSystemHealthMonitoring(): void {
  healthCheckManager.stopHealthChecks();
  console.log("System health monitoring stopped");
}

/**
 * Gets current system health
 */
export function getSystemHealth(): SystemHealthStatus {
  return healthCheckManager.getSystemHealth();
}

/**
 * Gets health for a specific service
 */
export function getServiceHealth(
  serviceName: string,
): ServiceHealthCheck | null {
  return healthCheckManager.getServiceHealth(serviceName);
}

/**
 * Refreshes health status for all services
 */
export async function refreshSystemHealth(): Promise<void> {
  await healthCheckManager.refreshHealthStatus();
}

/**
 * Refreshes health status for a specific service
 */
export async function refreshServiceHealth(serviceName: string): Promise<void> {
  await healthCheckManager.refreshServiceHealth(serviceName);
}

/**
 * Checks if analytics service is available
 */
export function isAnalyticsServiceHealthy(): boolean {
  return healthCheckManager.isServiceAvailable("analytics-service");
}

/**
 * Checks if user service is available
 */
export function isUserServiceHealthy(): boolean {
  return healthCheckManager.isServiceAvailable("user-service");
}

/**
 * Checks if notification service is available
 */
export function isNotificationServiceHealthy(): boolean {
  return healthCheckManager.isServiceAvailable("notification-service");
}

/**
 * Checks if the overall system is healthy
 */
export function isSystemHealthy(): boolean {
  return healthCheckManager.isSystemAvailable();
}

// ============================================================================
// Health Check Hooks for React Components
// ============================================================================

/**
 * React hook for system health monitoring
 */
export function useSystemHealth() {
  // This will be implemented when we create the React hooks
  // For now, return the basic functionality
  return {
    systemHealth: getSystemHealth(),
    refreshHealth: refreshSystemHealth,
    isHealthy: isSystemHealthy(),
  };
}

/**
 * React hook for specific service health monitoring
 */
export function useServiceHealth(serviceName: string) {
  // This will be implemented when we create the React hooks
  // For now, return the basic functionality
  return {
    serviceHealth: getServiceHealth(serviceName),
    refreshHealth: () => refreshServiceHealth(serviceName),
    isHealthy: healthCheckManager.isServiceAvailable(serviceName),
  };
}
