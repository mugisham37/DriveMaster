/**
 * Content Service Configuration
 * Handles content-service URLs, timeout settings, and integration configuration
 */

import type { ContentServiceConfig } from "../../types/config";

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
 * Creates content service configuration from environment variables
 */
function createContentServiceConfig(): ContentServiceConfig {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Default URL for development
  const defaultUrl = isDevelopment ? "http://localhost:3004" : "";

  const baseURL = process.env.NEXT_PUBLIC_CONTENT_SERVICE_URL || defaultUrl;

  if (!baseURL) {
    throw new Error("NEXT_PUBLIC_CONTENT_SERVICE_URL is required");
  }

  const validatedBaseURL = validateUrl(
    baseURL,
    "NEXT_PUBLIC_CONTENT_SERVICE_URL",
  );

  return {
    baseURL: validatedBaseURL,
    timeout: parseInteger(
      process.env.CONTENT_SERVICE_TIMEOUT,
      30000,
      1000,
      120000,
    ),
    retryAttempts: parseInteger(
      process.env.CONTENT_SERVICE_RETRY_ATTEMPTS,
      3,
      0,
      10,
    ),
    retryDelay: parseInteger(
      process.env.CONTENT_SERVICE_RETRY_DELAY,
      1000,
      100,
      10000,
    ),
    circuitBreakerThreshold: parseInteger(
      process.env.CONTENT_SERVICE_CIRCUIT_BREAKER_THRESHOLD,
      5,
      1,
      20,
    ),
    circuitBreakerTimeout: parseInteger(
      process.env.CONTENT_SERVICE_CIRCUIT_BREAKER_TIMEOUT,
      30000,
      5000,
      300000,
    ),
    enableRequestLogging: parseBoolean(
      process.env.CONTENT_SERVICE_ENABLE_REQUEST_LOGGING,
      isDevelopment,
    ),
    enableMetrics: parseBoolean(
      process.env.CONTENT_SERVICE_ENABLE_METRICS,
      true,
    ),
    enableCaching: parseBoolean(
      process.env.CONTENT_SERVICE_ENABLE_CACHING,
      true,
    ),
    enableWebSocket: parseBoolean(
      process.env.CONTENT_SERVICE_ENABLE_WEBSOCKET,
      true,
    ),
  };
}

// Export singleton configuration
export const contentServiceConfig = createContentServiceConfig();

/**
 * Validates content service configuration
 */
export function validateContentServiceConfiguration(): void {
  const config = contentServiceConfig;

  // Validate HTTPS in production
  if (process.env.NODE_ENV === "production") {
    if (!config.baseURL.startsWith("https://")) {
      throw new Error("Content service must use HTTPS in production");
    }
  }

  // Validate timeout values
  if (config.timeout < 1000) {
    throw new Error("Content service timeout must be at least 1000ms");
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    throw new Error("Content service retry attempts must be between 0 and 10");
  }

  if (config.retryDelay < 100) {
    throw new Error("Content service retry delay must be at least 100ms");
  }

  console.log("Content service configuration validated:", {
    baseURL: config.baseURL,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    enableCaching: config.enableCaching,
    enableWebSocket: config.enableWebSocket,
  });
}

/**
 * Gets the content service base URL
 */
export function getContentServiceUrl(): string {
  return contentServiceConfig.baseURL;
}

/**
 * Gets the content service WebSocket URL
 */
export function getContentServiceWebSocketUrl(): string {
  const baseUrl = contentServiceConfig.baseURL;
  const wsUrl = baseUrl.replace(/^http/, "ws");
  return `${wsUrl}/ws`;
}

/**
 * Checks if content service is available
 */
export async function isContentServiceAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${contentServiceConfig.baseURL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gets content service health status
 */
export async function getContentServiceHealth(): Promise<{
  status: "healthy" | "unhealthy";
  responseTime: number;
  timestamp: Date;
}> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${contentServiceConfig.baseURL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      status: response.ok ? "healthy" : "unhealthy",
      responseTime,
      timestamp: new Date(),
    };
  } catch {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Creates a correlation ID for request tracking
 */
export function createCorrelationId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
