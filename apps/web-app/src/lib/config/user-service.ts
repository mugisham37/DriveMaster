/**
 * User Service Configuration with Service Discovery and Health Monitoring
 * Handles user-service URLs, protocol selection, and connection settings
 */

import type {
  UserServiceConfig,
  ServiceDiscoveryConfig,
  ProtocolType,
  ServiceHealthStatus,
} from "@/types/user-service";

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface UserServiceEnvironmentConfig extends UserServiceConfig {
  serviceDiscovery: ServiceDiscoveryConfig;
  isDevelopment: boolean;
  isProduction: boolean;
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validates required user-service environment variables
 */
function validateUserServiceEnvironment(): void {
  const required = ["NEXT_PUBLIC_USER_SERVICE_URL"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required user-service environment variables: ${missing.join(", ")}`,
    );
  }
}

/**
 * Validates URL format
 */
function validateUrl(url: string, name: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`${name} must use HTTP or HTTPS protocol`);
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

/**
 * Parses protocol selection from string
 */
function parseProtocolSelection(
  value: string | undefined,
): "http" | "grpc" | "auto" {
  if (!value) return "auto";

  const normalized = value.toLowerCase();
  if (["http", "grpc", "auto"].includes(normalized)) {
    return normalized as "http" | "grpc" | "auto";
  }

  throw new Error(
    `Invalid protocol selection: ${value}. Must be 'http', 'grpc', or 'auto'`,
  );
}

// ============================================================================
// Configuration Creation
// ============================================================================

/**
 * Creates and validates user-service environment configuration
 */
function createUserServiceConfig(): UserServiceEnvironmentConfig {
  validateUserServiceEnvironment();

  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  // Validate and parse URLs
  const httpUrl = validateUrl(
    process.env.NEXT_PUBLIC_USER_SERVICE_URL!,
    "NEXT_PUBLIC_USER_SERVICE_URL",
  );

  // gRPC URL is optional, defaults to HTTP URL with different port
  const grpcUrl = process.env.NEXT_PUBLIC_USER_SERVICE_GRPC_URL
    ? validateUrl(
        process.env.NEXT_PUBLIC_USER_SERVICE_GRPC_URL,
        "NEXT_PUBLIC_USER_SERVICE_GRPC_URL",
      )
    : httpUrl.replace(":3002", ":3003"); // Default gRPC port

  // Parse configuration values
  const timeout = parseInteger(
    process.env.USER_SERVICE_TIMEOUT,
    30000,
    1000,
    120000,
  );
  const retryAttempts = parseInteger(
    process.env.USER_SERVICE_RETRY_ATTEMPTS,
    3,
    0,
    10,
  );
  const retryDelay = parseInteger(
    process.env.USER_SERVICE_RETRY_DELAY,
    1000,
    100,
    10000,
  );
  const circuitBreakerThreshold = parseInteger(
    process.env.USER_SERVICE_CIRCUIT_BREAKER_THRESHOLD,
    5,
    1,
    20,
  );
  const circuitBreakerTimeout = parseInteger(
    process.env.USER_SERVICE_CIRCUIT_BREAKER_TIMEOUT,
    30000,
    5000,
    300000,
  );
  const healthCheckInterval = parseInteger(
    process.env.USER_SERVICE_HEALTH_CHECK_INTERVAL,
    60000,
    10000,
    300000,
  );
  const protocolSelection = parseProtocolSelection(
    process.env.USER_SERVICE_PROTOCOL_SELECTION,
  );

  // Service discovery configuration
  const serviceDiscovery: ServiceDiscoveryConfig = {
    enabled: parseBoolean(process.env.USER_SERVICE_DISCOVERY_ENABLED, false),
    refreshInterval: parseInteger(
      process.env.USER_SERVICE_DISCOVERY_REFRESH_INTERVAL,
      300000,
      30000,
      3600000,
    ),
    fallbackUrls: {
      http: httpUrl,
      grpc: grpcUrl,
    },
  };

  return {
    httpUrl,
    grpcUrl,
    timeout,
    retryAttempts,
    retryDelay,
    circuitBreakerThreshold,
    circuitBreakerTimeout,
    healthCheckInterval,
    protocolSelection,
    serviceDiscovery,
    isDevelopment,
    isProduction,
  };
}

// Export singleton configuration
export const userServiceConfig = createUserServiceConfig();

// ============================================================================
// Protocol Selection Logic
// ============================================================================

/**
 * Determines the optimal protocol for a given operation type
 */
export function selectProtocol(operationType: string): ProtocolType {
  if (userServiceConfig.protocolSelection !== "auto") {
    return userServiceConfig.protocolSelection;
  }

  // Protocol selection rules based on operation characteristics
  const grpcOperations = [
    "progress_update",
    "activity_record",
    "real_time_sync",
    "batch_operations",
    "streaming",
  ];

  const httpOperations = [
    "profile_fetch",
    "preferences_update",
    "gdpr_export",
    "gdpr_delete",
    "health_check",
  ];

  if (grpcOperations.some((op) => operationType.includes(op))) {
    return "grpc";
  }

  if (httpOperations.some((op) => operationType.includes(op))) {
    return "http";
  }

  // Default to HTTP for unknown operations
  return "http";
}

/**
 * Gets the appropriate service URL for the selected protocol
 */
export function getServiceUrl(protocol: ProtocolType): string {
  return protocol === "grpc"
    ? userServiceConfig.grpcUrl
    : userServiceConfig.httpUrl;
}

/**
 * Gets the service URL for a specific operation
 */
export function getServiceUrlForOperation(operationType: string): {
  url: string;
  protocol: ProtocolType;
} {
  const protocol = selectProtocol(operationType);
  const url = getServiceUrl(protocol);
  return { url, protocol };
}

// ============================================================================
// Service Discovery
// ============================================================================

interface ServiceEndpoint {
  url: string;
  protocol: ProtocolType;
  health: "healthy" | "unhealthy" | "unknown";
  lastChecked: Date;
  responseTime?: number;
}

class ServiceDiscovery {
  private endpoints: Map<ProtocolType, ServiceEndpoint> = new Map();
  private healthCheckTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    // Initialize with configured endpoints
    this.endpoints.set("http", {
      url: userServiceConfig.httpUrl,
      protocol: "http",
      health: "unknown",
      lastChecked: new Date(),
    });

    this.endpoints.set("grpc", {
      url: userServiceConfig.grpcUrl,
      protocol: "grpc",
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
    }, userServiceConfig.healthCheckInterval);

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
    protocol: ProtocolType,
  ): Promise<ServiceHealthStatus> {
    const healthUrl = protocol === "http" ? `${url}/health` : `${url}/health`; // gRPC health check would use different mechanism

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
  getEndpoint(protocol: ProtocolType): ServiceEndpoint | null {
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
      url: userServiceConfig.serviceDiscovery.fallbackUrls[protocol],
      protocol,
      health: "unknown",
      lastChecked: new Date(),
    };
  }

  /**
   * Gets all endpoint statuses
   */
  getEndpointStatuses(): Map<ProtocolType, ServiceEndpoint> {
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
export const serviceDiscovery = new ServiceDiscovery();

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Runtime configuration validation
 */
export function validateUserServiceConfiguration(): void {
  // Validate URLs in production
  if (userServiceConfig.isProduction) {
    if (!userServiceConfig.httpUrl.startsWith("https://")) {
      throw new Error("User service HTTP URL must use HTTPS in production");
    }

    if (!userServiceConfig.grpcUrl.startsWith("https://")) {
      console.warn("User service gRPC URL should use HTTPS in production");
    }
  }

  // Validate timeout values
  if (userServiceConfig.timeout < 1000) {
    console.warn(
      "User service timeout is very low, may cause frequent timeouts",
    );
  }

  // Validate circuit breaker configuration
  if (userServiceConfig.circuitBreakerThreshold < 3) {
    console.warn(
      "Circuit breaker threshold is very low, may cause frequent circuit opening",
    );
  }

  console.log("User service configuration loaded:", {
    httpUrl: userServiceConfig.httpUrl,
    grpcUrl: userServiceConfig.grpcUrl,
    protocolSelection: userServiceConfig.protocolSelection,
    timeout: userServiceConfig.timeout,
    environment: userServiceConfig.isDevelopment ? "development" : "production",
  });
}

// ============================================================================
// Health Monitoring
// ============================================================================

/**
 * Starts user service health monitoring
 */
export function startUserServiceMonitoring(): void {
  if (userServiceConfig.serviceDiscovery.enabled) {
    serviceDiscovery.startHealthChecks();
    console.log("User service health monitoring started");
  }
}

/**
 * Stops user service health monitoring
 */
export function stopUserServiceMonitoring(): void {
  serviceDiscovery.stopHealthChecks();
  console.log("User service health monitoring stopped");
}

/**
 * Gets current service health status
 */
export function getUserServiceHealth(): Map<ProtocolType, ServiceEndpoint> {
  return serviceDiscovery.getEndpointStatuses();
}

/**
 * Forces a health check refresh
 */
export async function refreshUserServiceHealth(): Promise<void> {
  await serviceDiscovery.refreshEndpoints();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if user service is available
 */
export function isUserServiceAvailable(protocol?: ProtocolType): boolean {
  if (protocol) {
    const endpoint = serviceDiscovery.getEndpoint(protocol);
    return endpoint?.health === "healthy" || endpoint?.health === "unknown";
  }

  // Check if any protocol is available
  const httpEndpoint = serviceDiscovery.getEndpoint("http");
  const grpcEndpoint = serviceDiscovery.getEndpoint("grpc");

  return (
    httpEndpoint?.health === "healthy" ||
    httpEndpoint?.health === "unknown" ||
    grpcEndpoint?.health === "healthy" ||
    grpcEndpoint?.health === "unknown"
  );
}

/**
 * Gets the recommended endpoint for an operation
 */
export function getRecommendedEndpoint(
  operationType: string,
): ServiceEndpoint | null {
  const protocol = selectProtocol(operationType);
  return serviceDiscovery.getEndpoint(protocol);
}

/**
 * Creates a correlation ID for request tracing
 */
export function createCorrelationId(): string {
  return `usr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
