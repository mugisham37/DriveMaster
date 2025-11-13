/**
 * Notification Service Configuration with Service Discovery and Health Monitoring
 * Handles notification-service URLs, WebSocket endpoints, and connection settings
 */

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface NotificationServiceConfig {
  baseUrl: string;
  wsUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  healthCheckInterval: number;
  enableWebSocket: boolean;
  enableAnalytics: boolean;
  enableCaching: boolean;
  cacheTTL: number;
  vapidPublicKey: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export interface NotificationServiceEndpoints {
  notifications: string;
  deviceTokens: string;
  templates: string;
  scheduling: string;
  analytics: string;
  preferences: string;
  websocket: string;
  health: string;
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validates required notification-service environment variables
 */
function validateNotificationServiceEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Only enforce strict validation in production
  if (!isProduction) {
    if (!process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL) {
      console.warn(
        "⚠️  NEXT_PUBLIC_NOTIFICATION_SERVICE_URL not set, using default: http://localhost:3004"
      );
    }
    return;
  }

  // Production validation
  const required = ["NEXT_PUBLIC_NOTIFICATION_SERVICE_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required notification-service environment variables: ${missing.join(", ")}`,
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
 * Creates and validates notification service configuration
 */
function createNotificationServiceConfig(): NotificationServiceConfig {
  validateNotificationServiceEnvironment();

  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  // Base URL validation with default for development
  const defaultNotificationUrl = "http://localhost:3004";
  const baseUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL
    ? validateUrl(
        process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL,
        "NEXT_PUBLIC_NOTIFICATION_SERVICE_URL",
      )
    : isDevelopment
      ? defaultNotificationUrl
      : (() => {
          throw new Error("NEXT_PUBLIC_NOTIFICATION_SERVICE_URL is required in production");
        })();

  // WebSocket URL - auto-generate from base URL if not provided
  const wsUrl =
    process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_WS_URL ||
    baseUrl.replace(/^http/, "ws");

  return {
    baseUrl,
    wsUrl: validateUrl(wsUrl, "WebSocket URL"),
    timeout: parseInteger(
      process.env.NOTIFICATION_SERVICE_TIMEOUT,
      30000,
      1000,
      120000,
    ),
    retryAttempts: parseInteger(
      process.env.NOTIFICATION_SERVICE_RETRY_ATTEMPTS,
      3,
      0,
      10,
    ),
    retryDelay: parseInteger(
      process.env.NOTIFICATION_SERVICE_RETRY_DELAY,
      1000,
      100,
      10000,
    ),
    circuitBreakerThreshold: parseInteger(
      process.env.NOTIFICATION_SERVICE_CIRCUIT_BREAKER_THRESHOLD,
      5,
      1,
      20,
    ),
    circuitBreakerTimeout: parseInteger(
      process.env.NOTIFICATION_SERVICE_CIRCUIT_BREAKER_TIMEOUT,
      30000,
      5000,
      300000,
    ),
    healthCheckInterval: parseInteger(
      process.env.NOTIFICATION_SERVICE_HEALTH_CHECK_INTERVAL,
      60000,
      10000,
      300000,
    ),
    enableWebSocket: parseBoolean(
      process.env.NOTIFICATION_SERVICE_ENABLE_WEBSOCKET,
      true,
    ),
    enableAnalytics: parseBoolean(
      process.env.NOTIFICATION_SERVICE_ENABLE_ANALYTICS,
      true,
    ),
    enableCaching: parseBoolean(
      process.env.NOTIFICATION_SERVICE_ENABLE_CACHING,
      true,
    ),
    cacheTTL: parseInteger(
      process.env.NOTIFICATION_SERVICE_CACHE_TTL,
      300000,
      30000,
      3600000,
    ),
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    isDevelopment,
    isProduction,
  };
}

// ============================================================================
// Endpoint Configuration
// ============================================================================

/**
 * Creates notification service endpoints configuration
 */
function createNotificationServiceEndpoints(
  baseUrl: string,
): NotificationServiceEndpoints {
  return {
    notifications: `${baseUrl}/api/notifications`,
    deviceTokens: `${baseUrl}/api/device-tokens`,
    templates: `${baseUrl}/api/templates`,
    scheduling: `${baseUrl}/api/scheduling`,
    analytics: `${baseUrl}/api/analytics`,
    preferences: `${baseUrl}/api/preferences`,
    websocket: `${baseUrl}/ws`,
    health: `${baseUrl}/health`,
  };
}

// ============================================================================
// Exports
// ============================================================================

// Export singleton configuration
export const notificationServiceConfig = createNotificationServiceConfig();
export const notificationServiceEndpoints = createNotificationServiceEndpoints(
  notificationServiceConfig.baseUrl,
);

/**
 * Validates notification service configuration
 */
export function validateNotificationServiceConfiguration(): void {
  // Validate production security requirements
  if (notificationServiceConfig.isProduction) {
    if (!notificationServiceConfig.baseUrl.startsWith("https://")) {
      throw new Error("Notification service must use HTTPS in production");
    }
    if (
      notificationServiceConfig.enableWebSocket &&
      !notificationServiceConfig.wsUrl.startsWith("wss://")
    ) {
      throw new Error(
        "Notification service WebSocket must use WSS in production",
      );
    }
  }

  // Validate WebSocket configuration
  if (
    notificationServiceConfig.enableWebSocket &&
    !notificationServiceConfig.wsUrl
  ) {
    throw new Error("WebSocket URL is required when WebSocket is enabled");
  }

  // Validate VAPID key for push notifications
  if (
    notificationServiceConfig.isProduction &&
    !notificationServiceConfig.vapidPublicKey
  ) {
    console.warn(
      "VAPID public key is not configured - push notifications will not work",
    );
  }

  console.log("Notification service configuration validated:", {
    baseUrl: notificationServiceConfig.baseUrl,
    wsUrl: notificationServiceConfig.wsUrl,
    enableWebSocket: notificationServiceConfig.enableWebSocket,
    enableAnalytics: notificationServiceConfig.enableAnalytics,
    enableCaching: notificationServiceConfig.enableCaching,
    environment: notificationServiceConfig.isDevelopment
      ? "development"
      : "production",
  });
}

/**
 * Get notification service endpoint URL
 */
export function getNotificationServiceEndpoint(
  endpoint: keyof NotificationServiceEndpoints,
): string {
  return notificationServiceEndpoints[endpoint];
}

/**
 * Check if notification service is available
 */
export async function isNotificationServiceAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(notificationServiceEndpoints.health, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get notification service health status
 */
export async function getNotificationServiceHealth(): Promise<{
  status: string;
  timestamp: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(notificationServiceEndpoints.health, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`Health check failed: ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch {
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create correlation ID for request tracking
 */
export function createCorrelationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
