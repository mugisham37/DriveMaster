/**
 * Resilience Integration for Authentication System
 * Integrates error handling, circuit breaker, and graceful degradation with AuthContext
 */

import {
  gracefulDegradationManager,
  authDegradationHelpers,
} from "./graceful-degradation";
import { circuitBreakerManager } from "./circuit-breaker";
import {
  serviceHealthMonitor,
  createAuthServiceHealthCheck,
} from "./service-health";
import { AuthErrorHandler } from "./error-handler";
import type { UserProfile, AuthError } from "../../types/auth-service";

/**
 * Initialize resilience systems for authentication
 */
export function initializeAuthResilience(authServiceUrl: string): void {
  // Initialize service health monitoring
  const authHealthCheck = createAuthServiceHealthCheck(authServiceUrl);
  serviceHealthMonitor.registerService("auth-service", authHealthCheck);

  // Set up minimal fallback data for offline mode
  authDegradationHelpers.setMinimalFallbacks();

  // Initialize circuit breakers with auth-specific configurations
  circuitBreakerManager.getCircuitBreaker("auth-service", {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    successThreshold: 3,
    timeoutDuration: 10000,
  });

  circuitBreakerManager.getCircuitBreaker("token-refresh", {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    successThreshold: 2,
    timeoutDuration: 5000,
  });

  circuitBreakerManager.getCircuitBreaker("oauth-provider", {
    failureThreshold: 3,
    recoveryTimeout: 60000,
    successThreshold: 2,
    timeoutDuration: 15000,
  });
}

/**
 * Enhanced authentication operations with resilience
 */
export class ResilientAuthOperations {
  /**
   * Get user profile with graceful degradation
   */
  static async getUserProfile(
    userId: number,
    fetchFn: () => Promise<UserProfile>,
  ): Promise<{
    data: UserProfile;
    source: "live" | "cache" | "stale" | "fallback";
    degraded: boolean;
  }> {
    return authDegradationHelpers.getUserProfile(userId, fetchFn);
  }

  /**
   * Execute authentication operation with full resilience
   */
  static async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: {
      operationType: "login" | "register" | "logout" | "refresh" | "oauth";
      cacheKey?: string;
      fallbackData?: T;
      retryAttempts?: number;
    },
  ): Promise<T> {
    const {
      operationType,
      cacheKey,
      fallbackData,
      retryAttempts = 3,
    } = options;

    // Get appropriate circuit breaker
    const circuitBreakerName = this.getCircuitBreakerName(operationType);
    const circuitBreaker =
      circuitBreakerManager.getCircuitBreaker(circuitBreakerName);

    let attempt = 0;
    let lastError: unknown;

    while (attempt < retryAttempts) {
      try {
        // Execute with circuit breaker protection
        const result = await circuitBreaker.execute(operation);
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        const authError = AuthErrorHandler.processError(error, operationType);

        // Check if we should retry
        if (attempt < retryAttempts && authError.recoverable) {
          // Calculate delay with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If we have a cache key and fallback is allowed, try graceful degradation
        if (
          cacheKey &&
          (operationType === "login" || operationType === "refresh")
        ) {
          try {
            const degradationResult =
              await gracefulDegradationManager.executeWithDegradation(
                operation,
                {
                  cacheKey,
                  serviceName: "auth-service",
                  fallbackData,
                  allowStale: true,
                },
              );

            if (degradationResult.degraded) {
              // Log degradation event
              console.warn(
                `Authentication operation ${operationType} using degraded mode:`,
                {
                  source: degradationResult.source,
                  cacheKey,
                },
              );
            }

            return degradationResult.data as T;
          } catch {
            // Degradation also failed, throw original error
            throw authError;
          }
        }

        // No more retries or degradation options
        throw authError;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw AuthErrorHandler.processError(lastError, operationType);
  }

  /**
   * Get appropriate circuit breaker name for operation type
   */
  private static getCircuitBreakerName(operationType: string): string {
    switch (operationType) {
      case "refresh":
        return "token-refresh";
      case "oauth":
        return "oauth-provider";
      default:
        return "auth-service";
    }
  }

  /**
   * Check if authentication service is healthy
   */
  static isAuthServiceHealthy(): boolean {
    const healthStatus = serviceHealthMonitor.getServiceHealth("auth-service");
    return healthStatus?.healthy ?? false;
  }

  /**
   * Get authentication service health details
   */
  static getAuthServiceHealth() {
    return serviceHealthMonitor.getServiceHealth("auth-service");
  }

  /**
   * Get overall resilience status
   */
  static getResilienceStatus() {
    const overallHealth = serviceHealthMonitor.getOverallHealth();
    const circuitBreakerHealth = circuitBreakerManager.getOverallHealthStatus();
    const degradationStatus = gracefulDegradationManager.getDegradationStatus();

    return {
      healthy:
        overallHealth.healthy &&
        circuitBreakerHealth.healthy &&
        !degradationStatus.degraded,
      serviceHealth: overallHealth,
      circuitBreakers: circuitBreakerHealth,
      degradation: degradationStatus,
      recommendations: this.getHealthRecommendations(
        overallHealth,
        circuitBreakerHealth,
        degradationStatus,
      ),
    };
  }

  /**
   * Get health recommendations based on current status
   */
  private static getHealthRecommendations(
    serviceHealth: ReturnType<typeof serviceHealthMonitor.getOverallHealth>,
    circuitBreakerHealth: ReturnType<
      typeof circuitBreakerManager.getOverallHealthStatus
    >,
    degradationStatus: ReturnType<
      typeof gracefulDegradationManager.getDegradationStatus
    >,
  ): string[] {
    const recommendations: string[] = [];

    if (!serviceHealth.healthy) {
      recommendations.push(
        "Authentication service is experiencing issues. Some features may be limited.",
      );
    }

    if (!circuitBreakerHealth.healthy) {
      recommendations.push(
        "Circuit breakers are active. Automatic recovery is in progress.",
      );
    }

    if (degradationStatus.degraded) {
      recommendations.push(
        "System is running in degraded mode using cached data.",
      );
    }

    if (degradationStatus.activeRetries > 0) {
      recommendations.push("Background recovery operations are in progress.");
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "All authentication systems are operating normally.",
      );
    }

    return recommendations;
  }

  /**
   * Force recovery attempt for all systems
   */
  static async forceRecovery(): Promise<void> {
    // Reset circuit breakers
    circuitBreakerManager.resetAll();

    // Trigger health checks
    await serviceHealthMonitor.checkServiceHealth("auth-service");

    // Clear degradation cache to force fresh attempts
    gracefulDegradationManager.clearCache();
  }

  /**
   * Handle partial authentication failures gracefully
   */
  static handlePartialFailure(
    error: AuthError,
    context: "login" | "profile" | "refresh" | "oauth",
  ): {
    shouldLogout: boolean;
    shouldRetry: boolean;
    userMessage: string;
    technicalMessage: string;
  } {
    const shouldLogout = this.shouldLogoutOnError(error, context);
    const shouldRetry = error.recoverable && !shouldLogout;

    let userMessage = error.message;
    const technicalMessage = `${context} operation failed: ${error.type} - ${error.message}`;

    // Provide context-specific guidance
    switch (context) {
      case "login":
        if (!shouldLogout && shouldRetry) {
          userMessage =
            "Login temporarily unavailable. Please try again in a moment.";
        }
        break;

      case "profile":
        if (!shouldLogout) {
          userMessage =
            "Unable to load profile data. Using cached information.";
        }
        break;

      case "refresh":
        if (shouldLogout) {
          userMessage = "Your session has expired. Please sign in again.";
        } else {
          userMessage =
            "Session refresh failed. You may need to sign in again soon.";
        }
        break;

      case "oauth":
        userMessage =
          "Social login is temporarily unavailable. Please try email login instead.";
        break;
    }

    return {
      shouldLogout,
      shouldRetry,
      userMessage,
      technicalMessage,
    };
  }

  /**
   * Determine if error should trigger logout
   */
  private static shouldLogoutOnError(
    error: AuthError,
    context: string,
  ): boolean {
    // Never logout for network or server errors
    if (error.type === "network" || error.type === "server") {
      return false;
    }

    // Always logout for authentication errors in refresh context
    if (error.type === "authentication" && context === "refresh") {
      return true;
    }

    // Logout for specific authentication error codes
    if (error.type === "authentication") {
      const logoutCodes = ["TOKEN_EXPIRED", "TOKEN_INVALID", "SESSION_EXPIRED"];
      return logoutCodes.includes(error.code || "");
    }

    // Don't logout for other error types
    return false;
  }
}

/**
 * Cleanup function for resilience systems
 */
export function cleanupAuthResilience(): void {
  serviceHealthMonitor.stopAll();
  gracefulDegradationManager.cleanup();
  // Circuit breakers are managed by singleton and don't need explicit cleanup
}

/**
 * Export singleton for easy access
 */
export const authResilience = ResilientAuthOperations;
