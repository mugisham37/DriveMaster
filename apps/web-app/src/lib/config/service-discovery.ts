/**
 * Service Discovery Utilities
 * Provides dynamic endpoint resolution and health monitoring for user-service
 */

import type {
  ProtocolType,
  ServiceHealthStatus,
  ServiceInfo,
} from "@/types/user-service";
import {
  serviceDiscovery,
  userServiceConfig,
  getServiceUrlForOperation,
  createCorrelationId,
} from "./user-service";

// ============================================================================
// Service Discovery Interface
// ============================================================================

export interface ServiceEndpoint {
  url: string;
  protocol: ProtocolType;
  health: "healthy" | "unhealthy" | "unknown";
  lastChecked: Date;
  responseTime?: number;
}

export interface ServiceDiscoveryResult {
  endpoint: ServiceEndpoint;
  correlationId: string;
  fallbackUsed: boolean;
}

// ============================================================================
// Dynamic Endpoint Resolution
// ============================================================================

/**
 * Resolves the best available endpoint for a given operation
 */
export async function resolveServiceEndpoint(
  operationType: string,
): Promise<ServiceDiscoveryResult> {
  const correlationId = createCorrelationId();

  try {
    // Get recommended endpoint based on operation type
    const { url, protocol } = getServiceUrlForOperation(operationType);

    // Check if service discovery is enabled
    if (!userServiceConfig.serviceDiscovery.enabled) {
      return {
        endpoint: {
          url,
          protocol,
          health: "unknown",
          lastChecked: new Date(),
        },
        correlationId,
        fallbackUsed: false,
      };
    }

    // Get endpoint from service discovery
    const discoveredEndpoint = serviceDiscovery.getEndpoint(protocol);

    if (discoveredEndpoint && discoveredEndpoint.health === "healthy") {
      return {
        endpoint: discoveredEndpoint,
        correlationId,
        fallbackUsed: false,
      };
    }

    // Use fallback endpoint if discovery fails or endpoint is unhealthy
    const fallbackUrl =
      userServiceConfig.serviceDiscovery.fallbackUrls[protocol];

    return {
      endpoint: {
        url: fallbackUrl,
        protocol,
        health: "unknown",
        lastChecked: new Date(),
      },
      correlationId,
      fallbackUsed: true,
    };
  } catch {
    // Return fallback on any error
    const { url, protocol } = getServiceUrlForOperation(operationType);

    return {
      endpoint: {
        url,
        protocol,
        health: "unknown",
        lastChecked: new Date(),
      },
      correlationId,
      fallbackUsed: true,
    };
  }
}

/**
 * Resolves multiple endpoints for batch operations
 */
export async function resolveMultipleEndpoints(
  operationTypes: string[],
): Promise<Map<string, ServiceDiscoveryResult>> {
  const results = new Map<string, ServiceDiscoveryResult>();

  const resolutionPromises = operationTypes.map(async (operationType) => {
    const result = await resolveServiceEndpoint(operationType);
    results.set(operationType, result);
  });

  await Promise.allSettled(resolutionPromises);

  return results;
}

// ============================================================================
// Health Check Integration
// ============================================================================

/**
 * Performs a health check on a specific endpoint
 */
export async function checkEndpointHealth(
  url: string,
  _protocol: ProtocolType, // Reserved for future gRPC health check implementation
  timeout: number = 5000,
): Promise<ServiceHealthStatus> {
  const healthUrl = `${url}/health`;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": createCorrelationId(),
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const healthData = await response.json();

    // Validate response structure
    if (!healthData.data && !healthData.status) {
      throw new Error("Invalid health check response format");
    }

    return (
      healthData.data || {
        status: healthData.status || "unknown",
        services: healthData.services || {},
        responseTime: Date.now(),
        timestamp: new Date(),
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Health check failed: ${errorMessage}`);
  }
}

/**
 * Gets service information from an endpoint
 */
export async function getServiceInfo(
  url: string,
  _protocol: ProtocolType, // Reserved for future gRPC service info implementation
  timeout: number = 5000,
): Promise<ServiceInfo> {
  const infoUrl = `${url}/info`;

  try {
    const response = await fetch(infoUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": createCorrelationId(),
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Service info request failed with status ${response.status}`,
      );
    }

    const infoData = await response.json();

    return infoData.data || infoData;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Service info request failed: ${errorMessage}`);
  }
}

// ============================================================================
// Service Registry
// ============================================================================

class ServiceRegistry {
  private services: Map<string, ServiceEndpoint[]> = new Map();
  private lastUpdate: Date = new Date();

  /**
   * Registers a service endpoint
   */
  registerService(serviceName: string, endpoint: ServiceEndpoint): void {
    const existing = this.services.get(serviceName) || [];
    const updated = existing.filter(
      (e) => e.url !== endpoint.url || e.protocol !== endpoint.protocol,
    );
    updated.push(endpoint);

    this.services.set(serviceName, updated);
    this.lastUpdate = new Date();
  }

  /**
   * Gets all endpoints for a service
   */
  getServiceEndpoints(serviceName: string): ServiceEndpoint[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Gets the best endpoint for a service based on health and response time
   */
  getBestEndpoint(
    serviceName: string,
    preferredProtocol?: ProtocolType,
  ): ServiceEndpoint | null {
    const endpoints = this.getServiceEndpoints(serviceName);

    if (endpoints.length === 0) {
      return null;
    }

    // Filter by protocol if specified
    const filteredEndpoints = preferredProtocol
      ? endpoints.filter((e) => e.protocol === preferredProtocol)
      : endpoints;

    if (filteredEndpoints.length === 0) {
      return null;
    }

    // Sort by health status and response time
    const sortedEndpoints = filteredEndpoints.sort((a, b) => {
      // Prioritize healthy endpoints
      if (a.health === "healthy" && b.health !== "healthy") return -1;
      if (b.health === "healthy" && a.health !== "healthy") return 1;

      // Then by response time (lower is better)
      const aTime = a.responseTime || Infinity;
      const bTime = b.responseTime || Infinity;
      return aTime - bTime;
    });

    return sortedEndpoints[0] || null;
  }

  /**
   * Removes unhealthy endpoints
   */
  pruneUnhealthyEndpoints(maxAge: number = 300000): void {
    // 5 minutes default
    const cutoff = new Date(Date.now() - maxAge);

    for (const [serviceName, endpoints] of this.services.entries()) {
      const healthyEndpoints = endpoints.filter(
        (endpoint) =>
          endpoint.health === "healthy" || endpoint.lastChecked > cutoff,
      );

      if (healthyEndpoints.length > 0) {
        this.services.set(serviceName, healthyEndpoints);
      } else {
        // Keep at least one endpoint as fallback
        this.services.set(serviceName, endpoints.slice(0, 1));
      }
    }

    this.lastUpdate = new Date();
  }

  /**
   * Gets registry statistics
   */
  getStats(): {
    totalServices: number;
    totalEndpoints: number;
    healthyEndpoints: number;
    lastUpdate: Date;
  } {
    let totalEndpoints = 0;
    let healthyEndpoints = 0;

    for (const endpoints of this.services.values()) {
      totalEndpoints += endpoints.length;
      healthyEndpoints += endpoints.filter(
        (e) => e.health === "healthy",
      ).length;
    }

    return {
      totalServices: this.services.size,
      totalEndpoints,
      healthyEndpoints,
      lastUpdate: this.lastUpdate,
    };
  }
}

// Export singleton service registry
export const serviceRegistry = new ServiceRegistry();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Initializes service discovery with user-service endpoints
 */
export function initializeServiceDiscovery(): void {
  // Register user-service endpoints
  serviceRegistry.registerService("user-service", {
    url: userServiceConfig.httpUrl,
    protocol: "http",
    health: "unknown",
    lastChecked: new Date(),
  });

  serviceRegistry.registerService("user-service", {
    url: userServiceConfig.grpcUrl,
    protocol: "grpc",
    health: "unknown",
    lastChecked: new Date(),
  });

  console.log("Service discovery initialized with user-service endpoints");
}

/**
 * Gets all available service endpoints
 */
export function getAllServiceEndpoints(): Map<string, ServiceEndpoint[]> {
  return new Map(serviceRegistry["services"]);
}

/**
 * Forces a refresh of all service endpoints
 */
export async function refreshAllServiceEndpoints(): Promise<void> {
  const services = getAllServiceEndpoints();

  for (const [serviceName, endpoints] of services.entries()) {
    const healthCheckPromises = endpoints.map(async (endpoint) => {
      try {
        const health = await checkEndpointHealth(
          endpoint.url,
          endpoint.protocol,
        );

        serviceRegistry.registerService(serviceName, {
          ...endpoint,
          health: health.status === "healthy" ? "healthy" : "unhealthy",
          lastChecked: new Date(),
          responseTime: health.responseTime,
        });
      } catch {
        serviceRegistry.registerService(serviceName, {
          ...endpoint,
          health: "unhealthy",
          lastChecked: new Date(),
        });
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }
}
