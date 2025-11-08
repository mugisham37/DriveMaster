/**
 * Environment Configuration with Validation
 * Handles auth-service URLs, OAuth credentials, security settings, and user-service integration
 */

import {
  userServiceConfig,
  validateUserServiceConfiguration,
  startUserServiceMonitoring,
} from "./user-service";
import {
  contentServiceConfig,
  validateContentServiceConfiguration,
} from "./content-service";
import {
  notificationServiceConfig,
  validateNotificationServiceConfiguration,
} from "./notification-service";
import {
  analyticsServiceConfig,
  validateAnalyticsServiceConfiguration,
} from "./analytics-service";

export interface AuthServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    enabled: boolean;
  };
  github: {
    clientId: string;
    enabled: boolean;
  };
  apple: {
    clientId: string;
    enabled: boolean;
  };
  facebook: {
    clientId: string;
    enabled: boolean;
  };
  microsoft: {
    clientId: string;
    enabled: boolean;
  };
}

export interface SecurityConfig {
  corsOrigins: string[];
  allowedHosts: string[];
  csrfProtection: boolean;
  requestSigning: boolean;
  signingSecret: string | undefined;
}

export interface EnvironmentConfig {
  authService: AuthServiceConfig;
  oauth: OAuthConfig;
  security: SecurityConfig;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Validates required environment variables
 */
function validateEnvironment(): void {
  const required = ["NEXT_PUBLIC_AUTH_SERVICE_URL", "JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
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
 * Parses comma-separated string into array
 */
function parseStringArray(
  value: string | undefined,
  defaultValue: string[] = [],
): string[] {
  if (!value) return defaultValue;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
 * Creates and validates environment configuration
 */
function createEnvironmentConfig(): EnvironmentConfig {
  validateEnvironment();

  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  // Auth Service Configuration
  const authServiceBaseUrl = validateUrl(
    process.env.NEXT_PUBLIC_AUTH_SERVICE_URL!,
    "NEXT_PUBLIC_AUTH_SERVICE_URL",
  );

  const authService: AuthServiceConfig = {
    baseUrl: authServiceBaseUrl,
    timeout: parseInteger(
      process.env.AUTH_SERVICE_TIMEOUT,
      30000,
      1000,
      120000,
    ),
    retryAttempts: parseInteger(
      process.env.AUTH_SERVICE_RETRY_ATTEMPTS,
      3,
      0,
      10,
    ),
    retryDelay: parseInteger(
      process.env.AUTH_SERVICE_RETRY_DELAY,
      1000,
      100,
      10000,
    ),
    circuitBreakerThreshold: parseInteger(
      process.env.AUTH_SERVICE_CIRCUIT_BREAKER_THRESHOLD,
      5,
      1,
      20,
    ),
    circuitBreakerTimeout: parseInteger(
      process.env.AUTH_SERVICE_CIRCUIT_BREAKER_TIMEOUT,
      30000,
      5000,
      300000,
    ),
  };

  // OAuth Configuration
  const oauth: OAuthConfig = {
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      enabled: parseBoolean(
        process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED,
        !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      ),
    },
    github: {
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
      enabled: parseBoolean(
        process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED,
        !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      ),
    },
    apple: {
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
      enabled: parseBoolean(
        process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED,
        !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
      ),
    },
    facebook: {
      clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "",
      enabled: parseBoolean(
        process.env.NEXT_PUBLIC_FACEBOOK_OAUTH_ENABLED,
        !!process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
      ),
    },
    microsoft: {
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "",
      enabled: parseBoolean(
        process.env.NEXT_PUBLIC_MICROSOFT_OAUTH_ENABLED,
        !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      ),
    },
  };

  // Security Configuration
  const security: SecurityConfig = {
    corsOrigins: parseStringArray(
      process.env.CORS_ORIGINS,
      isDevelopment ? ["http://localhost:3000"] : [],
    ),
    allowedHosts: parseStringArray(process.env.ALLOWED_HOSTS, []),
    csrfProtection: parseBoolean(process.env.CSRF_PROTECTION, isProduction),
    requestSigning: parseBoolean(process.env.REQUEST_SIGNING, isProduction),
    signingSecret: process.env.REQUEST_SIGNING_SECRET || process.env.JWT_SECRET,
  };

  return {
    authService,
    oauth,
    security,
    isDevelopment,
    isProduction,
  };
}

// Export singleton configuration
export const config = createEnvironmentConfig();

/**
 * Runtime configuration validation
 */
export function validateConfiguration(): void {
  // Validate auth service connectivity in production
  if (config.isProduction) {
    if (!config.authService.baseUrl.startsWith("https://")) {
      throw new Error("Auth service must use HTTPS in production");
    }
  }

  // Validate OAuth configuration
  const enabledProviders = Object.entries(config.oauth)
    .filter(([, provider]) => provider.enabled)
    .map(([name]) => name);

  if (enabledProviders.length === 0) {
    console.warn("No OAuth providers are enabled");
  }

  // Validate security configuration
  if (config.security.requestSigning && !config.security.signingSecret) {
    throw new Error(
      "Request signing is enabled but no signing secret is configured",
    );
  }

  // Validate user-service configuration
  validateUserServiceConfiguration();

  // Validate content-service configuration
  validateContentServiceConfiguration();

  // Validate notification-service configuration
  validateNotificationServiceConfiguration();

  // Validate analytics-service configuration
  validateAnalyticsServiceConfiguration();

  console.log(`Environment configuration loaded:`, {
    authServiceUrl: config.authService.baseUrl,
    userServiceUrl: userServiceConfig.httpUrl,
    contentServiceUrl: contentServiceConfig.baseURL,
    notificationServiceUrl: notificationServiceConfig.baseUrl,
    notificationServiceWsUrl: notificationServiceConfig.wsUrl,
    analyticsServiceUrl: analyticsServiceConfig.baseUrl,
    analyticsServiceWsUrl: analyticsServiceConfig.wsUrl,
    enabledOAuthProviders: enabledProviders,
    environment: config.isDevelopment ? "development" : "production",
  });
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthProvider(provider: keyof OAuthConfig) {
  return config.oauth[provider];
}

/**
 * Check if OAuth provider is enabled
 */
export function isOAuthProviderEnabled(provider: keyof OAuthConfig): boolean {
  return config.oauth[provider].enabled && !!config.oauth[provider].clientId;
}

/**
 * Get all enabled OAuth providers
 */
export function getEnabledOAuthProviders(): Array<keyof OAuthConfig> {
  return (Object.keys(config.oauth) as Array<keyof OAuthConfig>).filter(
    (provider) => isOAuthProviderEnabled(provider),
  );
}

/**
 * Initialize user-service monitoring
 */
export function initializeUserServiceMonitoring(): void {
  startUserServiceMonitoring();
}

/**
 * Get user-service configuration
 */
export function getUserServiceConfig() {
  return userServiceConfig;
}

/**
 * Get content-service configuration
 */
export function getContentServiceConfig() {
  return contentServiceConfig;
}

/**
 * Get notification-service configuration
 */
export function getNotificationServiceConfig() {
  return notificationServiceConfig;
}

/**
 * Check if notification service WebSocket is enabled
 */
export function isNotificationWebSocketEnabled(): boolean {
  return notificationServiceConfig.enableWebSocket;
}

/**
 * Check if notification service analytics is enabled
 */
export function isNotificationAnalyticsEnabled(): boolean {
  return notificationServiceConfig.enableAnalytics;
}

/**
 * Check if notification service caching is enabled
 */
export function isNotificationCachingEnabled(): boolean {
  return notificationServiceConfig.enableCaching;
}

/**
 * Get analytics-service configuration
 */
export function getAnalyticsServiceConfig() {
  return analyticsServiceConfig;
}

/**
 * Check if analytics service real-time features are enabled
 */
export function isAnalyticsRealtimeEnabled(): boolean {
  return analyticsServiceConfig.enableRealtime;
}

/**
 * Check if analytics service caching is enabled
 */
export function isAnalyticsCachingEnabled(): boolean {
  return analyticsServiceConfig.enableCaching;
}

/**
 * Check if analytics service metrics are enabled
 */
export function isAnalyticsMetricsEnabled(): boolean {
  return analyticsServiceConfig.enableMetrics;
}
