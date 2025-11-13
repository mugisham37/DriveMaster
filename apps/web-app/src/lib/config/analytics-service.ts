/**
 * Analytics Service Configuration with Service Discovery and Health Monitoring
 * Handles analytics-dashboard service URLs, protocol selection, and connection settings
 */

import type {
  AnalyticsServiceConfig,
  ServiceDiscoveryConfig,
  ServiceHealthStatus,
} from "@/types/analytics-service";

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface AnalyticsServiceEnvironmentConfig
  extends AnalyticsServiceConfig {
  serviceDiscovery: ServiceDiscoveryConfig;
  isDevelopment: boolean;
  isProduction: boolean;
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validates required analytics-service environment variables
 */
function validateAnalyticsServiceEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Only enforce strict validation in production
  if (!isProduction) {
    if (!process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL) {
      console.warn(
        "⚠️  NEXT_PUBLIC_ANALYTICS_SERVICE_URL not set, using default: http://localhost:3009"
      );
    }
    return;
  }

  // Production validation
  const required = ["NEXT_PUBLIC_ANALYTICS_SERVICE_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required analytics-service environment variables: ${missing.join(", ")}`,
    );
  }
}

/**
 * Validates URL format
 */
function validateUrl(url: string, name: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) {
      throw new Error(`${name} must use HTTP, HTTPS, WS, or WSS protocol`);
    }
    return url;
  } catch {
    throw new Error(`Invalid URL for ${name}: ${url}`);
  }
}

/**
 * Parses boolean from string
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean = false,
): boolean {
  if (!value) return defaultValue;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

/**
 * Parses integer from string with validation
 */
function parseInteger(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number,
): number {
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  if (min !== undefined && parsed < min) {
    throw new Error(`Value ${parsed} is below minimum ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw new Error(`Value ${parsed} is above maximum ${max}`);
  }

  return parsed;
}

// ============================================================================
// Configuration Creation
// ============================================================================

/**
 * Creates and validates analytics-service environment configuration
 */
function createAnalyticsServiceConfig(): AnalyticsServiceEnvironmentConfig {
  validateAnalyticsServiceEnvironment();

  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  // Validate and parse URLs with default for development
  const defaultAnalyticsUrl = "http://localhost:3009";
  const baseUrl = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL
    ? validateUrl(
        process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL,
        "NEXT_PUBLIC_ANALYTICS_SERVICE_URL",
      )
    : isDevelopment
      ? defaultAnalyticsUrl
      : (() => {
          throw new Error("NEXT_PUBLIC_ANALYTICS_SERVICE_URL is required in production");
        })();

  // WebSocket URL is optional, defaults to HTTP URL with ws:// protocol
  const wsUrl = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_WS_URL
    ? validateUrl(
        process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_WS_URL,
        "NEXT_PUBLIC_ANALYTICS_SERVICE_WS_URL",
      )
    : baseUrl.replace(/^https?:/, "ws:").replace(":8000", ":8001"); // Default WebSocket port

  // Parse configuration values
  const timeout = parseInteger(
    process.env.ANALYTICS_SERVICE_TIMEOUT,
    30000,
    1000,
    120000,
  );
  const retryAttempts = parseInteger(
    process.env.ANALYTICS_SERVICE_RETRY_ATTEMPTS,
    3,
    0,
    10,
  );
  const retryDelay = parseInteger(
    process.env.ANALYTICS_SERVICE_RETRY_DELAY,
    1000,
    100,
    10000,
  );
  const circuitBreakerThreshold = parseInteger(
    process.env.ANALYTICS_SERVICE_CIRCUIT_BREAKER_THRESHOLD,
    5,
    1,
    20,
  );
  const circuitBreakerTimeout = parseInteger(
    process.env.ANALYTICS_SERVICE_CIRCUIT_BREAKER_TIMEOUT,
    30000,
    5000,
    300000,
  );
  const healthCheckInterval = parseInteger(
    process.env.ANALYTICS_SERVICE_HEALTH_CHECK_INTERVAL,
    60000,
    10000,
    300000,
  );

  // Feature flags
  const enableRealtime = parseBoolean(
    process.env.ANALYTICS_SERVICE_ENABLE_REALTIME,
    true,
  );
  const enableCaching = parseBoolean(
    process.env.ANALYTICS_SERVICE_ENABLE_CACHING,
    true,
  );
  const enableRequestLogging = parseBoolean(
    process.env.ANALYTICS_SERVICE_ENABLE_REQUEST_LOGGING,
    isDevelopment,
  );
  const enableMetrics = parseBoolean(
    process.env.ANALYTICS_SERVICE_ENABLE_METRICS,
    true,
  );

  // Service discovery configuration
  const serviceDiscovery: ServiceDiscoveryConfig = {
    enabled: parseBoolean(
      process.env.ANALYTICS_SERVICE_DISCOVERY_ENABLED,
      false,
    ),
    refreshInterval: parseInteger(
      process.env.ANALYTICS_SERVICE_DISCOVERY_REFRESH_INTERVAL,
      300000,
      30000,
      3600000,
    ),
    fallbackUrls: {
      http: baseUrl,
      ws: wsUrl,
    },
  };

  return {
    baseUrl,
    wsUrl,
    timeout,
    retryAttempts,
    retryDelay,
    circuitBreakerThreshold,
    circuitBreakerTimeout,
    healthCheckInterval,
    enableRealtime,
    enableCaching,
    enableRequestLogging,
    enableMetrics,
    serviceDiscovery,
    isDevelopment,
    isProduction,
  };
}

// Export singleton configuration
export const analyticsServiceConfig = createAnalyticsServiceConfig();

// ============================================================================
// Service Discovery
// ============================================================================

interface ServiceEndpoint {
  url: string;
  protocol: "http" | "ws";
  health: "healthy" | "unhealthy" | "unknown";
  lastChecked: Date;
  responseTime?: number;
}

class AnalyticsServiceDiscovery {
  private endpoints: Map<"http" | "ws", ServiceEndpoint> = new Map();
  private healthCheckTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    // Initialize with configured endpoints
    this.endpoints.set("http", {
      url: analyticsServiceConfig.baseUrl,
      protocol: "http",
      health: "unknown",
      lastChecked: new Date(),
    });

    this.endpoints.set("ws", {
      url: analyticsServiceConfig.wsUrl,
      protocol: "ws",
      health: "unknown",
      lastChecked: new Date(),
    });
  }

  /**
   * Starts periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, analyticsServiceConfig.healthCheckInterval);

    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Stops periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Performs health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.endpoints.entries()).map(
      async ([protocol, endpoint]) => {
        try {
          const startTime = Date.now();
          const response = await this.checkEndpointHealth(
            endpoint.url,
            protocol,
          );
          const responseTime = Date.now() - startTime;

          this.endpoints.set(protocol, {
            ...endpoint,
            health: response.status === "healthy" ? "healthy" : "unhealthy",
            lastChecked: new Date(),
            responseTime,
          });
        } catch {
          this.endpoints.set(protocol, {
            ...endpoint,
            health: "unhealthy",
            lastChecked: new Date(),
          });
        }
      },
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Checks the health of a specific endpoint
   */
  private async checkEndpointHealth(
    url: string,
    protocol: "http" | "ws",
  ): Promise<ServiceHealthStatus> {
    if (protocol === "ws") {
      // For WebSocket, we'll do a simple connection test
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url.replace("/ws/metrics", "/health"));
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("WebSocket health check timeout"));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ status: "healthy", timestamp: new Date().toISOString() });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };
      });
    }

    // HTTP health check
    const healthUrl = `${url}/health`;
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout for health checks
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const healthData = await response.json();
    return healthData.data || healthData;
  }

  /**
   * Gets the best available endpoint for a protocol
   */
  getEndpoint(protocol: "http" | "ws"): ServiceEndpoint | null {
    const endpoint = this.endpoints.get(protocol);

    if (!endpoint) {
      return null;
    }

    // Return healthy endpoints, or fallback to configured URL if unhealthy
    if (endpoint.health === "healthy" || endpoint.health === "unknown") {
      return endpoint;
    }

    // Return fallback endpoint if configured endpoint is unhealthy
    return {
      url: analyticsServiceConfig.serviceDiscovery.fallbackUrls[protocol],
      protocol,
      health: "unknown",
      lastChecked: new Date(),
    };
  }

  /**
   * Gets all endpoint statuses
   */
  getEndpointStatuses(): Map<"http" | "ws", ServiceEndpoint> {
    return new Map(this.endpoints);
  }

  /**
   * Forces a refresh of endpoint discovery
   */
  async refreshEndpoints(): Promise<void> {
    await this.performHealthChecks();
  }
}

// Export singleton service discovery instance
export const analyticsServiceDiscovery = new AnalyticsServiceDiscovery();

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Runtime configuration validation
 */
export function validateAnalyticsServiceConfiguration(): void {
  // Validate URLs in production
  if (analyticsServiceConfig.isProduction) {
    if (!analyticsServiceConfig.baseUrl.startsWith("https://")) {
      throw new Error(
        "Analytics service HTTP URL must use HTTPS in production",
      );
    }

    if (!analyticsServiceConfig.wsUrl.startsWith("wss://")) {
      console.warn(
        "Analytics service WebSocket URL should use WSS in production",
      );
    }
  }

  // Validate timeout values
  if (analyticsServiceConfig.timeout < 1000) {
    console.warn(
      "Analytics service timeout is very low, may cause frequent timeouts",
    );
  }

  // Validate circuit breaker configuration
  if (analyticsServiceConfig.circuitBreakerThreshold < 3) {
    console.warn(
      "Circuit breaker threshold is very low, may cause frequent circuit opening",
    );
  }

  console.log("Analytics service configuration loaded:", {
    baseUrl: analyticsServiceConfig.baseUrl,
    wsUrl: analyticsServiceConfig.wsUrl,
    enableRealtime: analyticsServiceConfig.enableRealtime,
    enableCaching: analyticsServiceConfig.enableCaching,
    timeout: analyticsServiceConfig.timeout,
    environment: analyticsServiceConfig.isDevelopment
      ? "development"
      : "production",
  });
}

// ============================================================================
// Health Monitoring
// ============================================================================

/**
 * Starts analytics service health monitoring
 */
export function startAnalyticsServiceMonitoring(): void {
  if (analyticsServiceConfig.serviceDiscovery.enabled) {
    analyticsServiceDiscovery.startHealthChecks();
    console.log("Analytics service health monitoring started");
  }
}

/**
 * Stops analytics service health monitoring
 */
export function stopAnalyticsServiceMonitoring(): void {
  analyticsServiceDiscovery.stopHealthChecks();
  console.log("Analytics service health monitoring stopped");
}

/**
 * Gets current service health status
 */
export function getAnalyticsServiceHealth(): Map<
  "http" | "ws",
  ServiceEndpoint
> {
  return analyticsServiceDiscovery.getEndpointStatuses();
}

/**
 * Forces a health check refresh
 */
export async function refreshAnalyticsServiceHealth(): Promise<void> {
  await analyticsServiceDiscovery.refreshEndpoints();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if analytics service is available
 */
export function isAnalyticsServiceAvailable(protocol?: "http" | "ws"): boolean {
  if (protocol) {
    const endpoint = analyticsServiceDiscovery.getEndpoint(protocol);
    return endpoint?.health === "healthy" || endpoint?.health === "unknown";
  }

  // Check if any protocol is available
  const httpEndpoint = analyticsServiceDiscovery.getEndpoint("http");
  const wsEndpoint = analyticsServiceDiscovery.getEndpoint("ws");

  return (
    httpEndpoint?.health === "healthy" ||
    httpEndpoint?.health === "unknown" ||
    wsEndpoint?.health === "healthy" ||
    wsEndpoint?.health === "unknown"
  );
}

/**
 * Gets the recommended endpoint for an operation
 */
export function getRecommendedEndpoint(
  operationType: "http" | "ws",
): ServiceEndpoint | null {
  return analyticsServiceDiscovery.getEndpoint(operationType);
}

/**
 * Creates a correlation ID for request tracing
 */
export function createCorrelationId(): string {
  return `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets the service URL for a specific protocol
 */
export function getServiceUrl(protocol: "http" | "ws"): string {
  return protocol === "ws"
    ? analyticsServiceConfig.wsUrl
    : analyticsServiceConfig.baseUrl;
}
