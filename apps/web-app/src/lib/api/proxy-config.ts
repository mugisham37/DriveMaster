/**
 * API proxy configuration
 * Maintains exact API response timing and caching behavior from Rails
 */

export interface ProxyConfig {
  timeout: number;
  retries: number;
  cacheControl: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

// Default proxy configuration matching Rails settings
export const defaultProxyConfig: ProxyConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  cacheControl: "no-cache", // Let Rails handle caching
  rateLimit: {
    maxRequests: 100, // 100 requests per window
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

// Endpoint-specific configurations
export const endpointConfigs: Record<string, Partial<ProxyConfig>> = {
  // Tracks endpoints - can be cached longer
  "/tracks": {
    cacheControl: "public, max-age=300", // 5 minutes
    timeout: 10000, // 10 seconds
  },

  // Exercise endpoints - moderate caching
  "/exercises": {
    cacheControl: "public, max-age=60", // 1 minute
    timeout: 15000, // 15 seconds
  },

  // Solution endpoints - no caching (user-specific)
  "/solutions": {
    cacheControl: "no-cache, no-store, must-revalidate",
    timeout: 45000, // 45 seconds for solution processing
  },

  // Iteration endpoints - no caching (processing-heavy)
  "/iterations": {
    cacheControl: "no-cache, no-store, must-revalidate",
    timeout: 60000, // 60 seconds for test running
    retries: 1, // Don't retry test runs
  },

  // Test run endpoints - no caching
  "/test_run": {
    cacheControl: "no-cache, no-store, must-revalidate",
    timeout: 30000, // 30 seconds
  },

  // Mentoring endpoints - short caching
  "/mentoring": {
    cacheControl: "private, max-age=30", // 30 seconds
    timeout: 20000, // 20 seconds
  },

  // Dashboard endpoints - short caching
  "/dashboard": {
    cacheControl: "private, max-age=60", // 1 minute
    timeout: 15000, // 15 seconds
  },

  // User endpoints - moderate caching
  "/users": {
    cacheControl: "private, max-age=300", // 5 minutes
    timeout: 10000, // 10 seconds
  },

  // Profile endpoints - longer caching
  "/profiles": {
    cacheControl: "public, max-age=600", // 10 minutes
    timeout: 10000, // 10 seconds
  },
};

// Headers that should be forwarded to Rails API
export const forwardHeaders = [
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-type",
  "user-agent",
  "x-requested-with",
  "if-none-match",
  "if-modified-since",
];

// Headers that should be forwarded from Rails API to client
export const responseHeaders = [
  "cache-control",
  "content-type",
  "etag",
  "expires",
  "last-modified",
  "vary",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-total-count",
  "x-page",
  "x-per-page",
  "x-total-pages",
];

// CORS configuration
export const corsConfig = {
  origin: process.env.NEXT_PUBLIC_APP_URL || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Rate limiting configuration per endpoint
export const rateLimitConfigs: Record<
  string,
  { maxRequests: number; windowMs: number }
> = {
  // More restrictive for resource-intensive endpoints
  "/iterations": {
    maxRequests: 10, // 10 iterations per window
    windowMs: 5 * 60 * 1000, // 5 minutes
  },

  "/solutions": {
    maxRequests: 20, // 20 solutions per window
    windowMs: 10 * 60 * 1000, // 10 minutes
  },

  // Standard rate limiting for other endpoints
  default: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

// Error retry configuration
export const retryConfig = {
  // Don't retry these HTTP status codes
  nonRetryableStatuses: [400, 401, 403, 404, 422, 429],

  // Exponential backoff settings
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds

  // Jitter to prevent thundering herd
  jitter: true,
};

// Health check configuration
export const healthCheckConfig = {
  endpoint: "/health",
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
};

// Monitoring and logging configuration
export const monitoringConfig = {
  // Log slow requests (over this threshold)
  slowRequestThreshold: 2000, // 2 seconds

  // Log error details in development
  logErrorDetails: process.env.NODE_ENV === "development",

  // Metrics to track
  trackMetrics: [
    "request_count",
    "request_duration",
    "error_count",
    "cache_hit_rate",
    "rate_limit_hits",
  ],
};

/**
 * Get configuration for a specific endpoint
 */
export function getEndpointConfig(path: string): ProxyConfig {
  // Find matching endpoint configuration
  const matchingConfig = Object.entries(endpointConfigs).find(([pattern]) =>
    path.includes(pattern),
  );

  const specificConfig = matchingConfig ? matchingConfig[1] : {};

  return {
    ...defaultProxyConfig,
    ...specificConfig,
  };
}

/**
 * Get rate limit configuration for a specific endpoint
 */
export function getRateLimitConfig(path: string) {
  const matchingConfig = Object.entries(rateLimitConfigs).find(
    ([pattern]) => pattern !== "default" && path.includes(pattern),
  );

  return matchingConfig ? matchingConfig[1] : rateLimitConfigs.default;
}

/**
 * Check if a status code should be retried
 */
export function shouldRetry(status: number): boolean {
  return !retryConfig.nonRetryableStatuses.includes(status);
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(
    retryConfig.baseDelay * Math.pow(2, attempt),
    retryConfig.maxDelay,
  );

  if (retryConfig.jitter) {
    // Add random jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  return delay;
}

const proxyConfig = {
  defaultProxyConfig,
  endpointConfigs,
  forwardHeaders,
  responseHeaders,
  corsConfig,
  rateLimitConfigs,
  retryConfig,
  healthCheckConfig,
  monitoringConfig,
  getEndpointConfig,
  getRateLimitConfig,
  shouldRetry,
  calculateRetryDelay,
};

export default proxyConfig;
