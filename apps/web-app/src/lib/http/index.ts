/**
 * HTTP Client Module
 * Exports configured HTTP client with all interceptors initialized
 */

import { httpClient } from "./client";
import { initializeInterceptors, tokenUtils } from "./interceptors";

// Initialize interceptors on module load
initializeInterceptors();

// Export the configured HTTP client
export { httpClient };

// Export request optimizer
export { requestOptimizer } from "./request-optimizer";

// Export cache
export { authCache } from "../cache";

// Export types
export type {
  RequestConfig,
  ApiResponse,
  ApiError,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./client";

export type {
  RequestOptimizerConfig,
  BatchConfig,
  DeduplicationConfig,
  ConnectionPoolConfig,
  CompressionConfig,
} from "./request-optimizer";

// Export token utilities
export { tokenUtils };

// Export configuration
export { config } from "../config/environment";

/**
 * Convenience function to check if auth service is available
 */
export async function checkAuthServiceHealth(): Promise<boolean> {
  try {
    const response = await httpClient.get("/health", {
      skipAuth: true,
      skipRetry: true,
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus() {
  return httpClient.getCircuitBreakerState();
}
