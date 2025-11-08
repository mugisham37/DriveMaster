/**
 * Configuration Initialization
 * Initializes all configuration modules and starts monitoring services
 */

import {
  validateConfiguration,
  initializeUserServiceMonitoring,
} from "./environment";
import {
  initializeServiceDiscovery,
  refreshAllServiceEndpoints,
} from "./service-discovery";
import {
  startSystemHealthMonitoring,
  stopSystemHealthMonitoring,
} from "./health-check";
import {
  startAnalyticsServiceMonitoring,
  stopAnalyticsServiceMonitoring,
} from "./analytics-service";
import { userServiceConfig } from "./user-service";
import { analyticsServiceConfig } from "./analytics-service";

// ============================================================================
// Initialization State
// ============================================================================

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// ============================================================================
// Configuration Initialization
// ============================================================================

/**
 * Initializes all configuration modules
 */
export async function initializeConfiguration(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return immediately if already initialized
  if (isInitialized) {
    return;
  }

  initializationPromise = performInitialization();

  try {
    await initializationPromise;
    isInitialized = true;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Performs the actual initialization
 */
async function performInitialization(): Promise<void> {
  console.log("Initializing user-service configuration...");

  try {
    // Step 1: Validate environment configuration
    console.log("Validating configuration...");
    validateConfiguration();

    // Step 2: Initialize service discovery
    console.log("Initializing service discovery...");
    initializeServiceDiscovery();

    // Step 3: Start user-service monitoring
    console.log("Starting user-service monitoring...");
    initializeUserServiceMonitoring();

    // Step 4: Start analytics-service monitoring
    console.log("Starting analytics-service monitoring...");
    startAnalyticsServiceMonitoring();

    // Step 5: Start system health monitoring
    console.log("Starting system health monitoring...");
    startSystemHealthMonitoring(60000); // Check every minute

    // Step 6: Perform initial health check
    console.log("Performing initial health check...");
    await refreshAllServiceEndpoints();

    console.log("User-service configuration initialized successfully");
  } catch (error) {
    console.error("Failed to initialize user-service configuration:", error);
    throw error;
  }
}

/**
 * Checks if configuration is initialized
 */
export function isConfigurationInitialized(): boolean {
  return isInitialized;
}

/**
 * Forces re-initialization of configuration
 */
export async function reinitializeConfiguration(): Promise<void> {
  isInitialized = false;
  initializationPromise = null;
  await initializeConfiguration();
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Gracefully shuts down all monitoring services
 */
export function shutdownConfiguration(): void {
  console.log("Shutting down user-service configuration...");

  try {
    // Stop system health monitoring
    stopSystemHealthMonitoring();

    // Stop analytics service monitoring
    stopAnalyticsServiceMonitoring();

    // Import dynamically to avoid circular dependencies
    import("./user-service").then(({ stopUserServiceMonitoring }) => {
      stopUserServiceMonitoring();
    });

    isInitialized = false;
    console.log("Configuration shutdown complete");
  } catch (error) {
    console.error("Error during configuration shutdown:", error);
  }
}

// ============================================================================
// Browser Environment Handling
// ============================================================================

/**
 * Initializes configuration for browser environment
 */
export async function initializeForBrowser(): Promise<void> {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    return;
  }

  await initializeConfiguration();

  // Set up cleanup on page unload
  window.addEventListener("beforeunload", () => {
    shutdownConfiguration();
  });

  // Set up visibility change handling for health monitoring
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isInitialized) {
      // Refresh health status when page becomes visible
      import("./service-discovery").then(({ refreshAllServiceEndpoints }) => {
        refreshAllServiceEndpoints().catch(console.error);
      });
    }
  });
}

/**
 * Initializes configuration for server environment
 */
export async function initializeForServer(): Promise<void> {
  // Only validate configuration on server, don't start monitoring
  if (typeof window !== "undefined") {
    return;
  }

  console.log("Validating user-service configuration for server...");
  validateConfiguration();
  console.log("Server-side configuration validation complete");
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Development helper to get configuration status
 */
export function getConfigurationStatus(): {
  initialized: boolean;
  userServiceConfig: typeof userServiceConfig;
  analyticsServiceConfig: typeof analyticsServiceConfig;
  environment: string;
} {
  return {
    initialized: isInitialized,
    userServiceConfig,
    analyticsServiceConfig,
    environment: process.env.NODE_ENV || "unknown",
  };
}

/**
 * Development helper to test configuration
 */
export async function testConfiguration(): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test environment validation
    validateConfiguration();
  } catch (error) {
    errors.push(
      `Environment validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  try {
    // Test service discovery
    const { refreshAllServiceEndpoints } = await import("./service-discovery");
    await refreshAllServiceEndpoints();
  } catch (error) {
    warnings.push(
      `Service discovery test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  try {
    // Test health monitoring
    const { getSystemHealth } = await import("./health-check");
    const healthStatus = getSystemHealth();

    if (healthStatus.overall === "unhealthy") {
      warnings.push("System appears to be unhealthy");
    }
  } catch (error) {
    warnings.push(
      `Health check test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
