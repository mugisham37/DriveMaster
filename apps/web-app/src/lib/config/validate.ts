/**
 * Configuration Validation Script
 * Validates environment configuration and reports any issues
 */

import {
  config,
  validateConfiguration,
  getEnabledOAuthProviders,
} from "./environment";

export function validateEnvironmentConfig(): boolean {
  console.log("🔍 Validating Environment Configuration...");

  try {
    // Run the main validation
    validateConfiguration();

    // Report configuration details
    console.log("✅ Environment Configuration Valid");
    console.log("📊 Configuration Summary:");
    console.log(`  - Auth Service URL: ${config.authService.baseUrl}`);
    console.log(
      `  - Environment: ${config.isDevelopment ? "Development" : "Production"}`,
    );
    console.log(`  - Request Timeout: ${config.authService.timeout}ms`);
    console.log(`  - Retry Attempts: ${config.authService.retryAttempts}`);
    console.log(
      `  - Circuit Breaker Threshold: ${config.authService.circuitBreakerThreshold}`,
    );
    console.log(
      `  - CSRF Protection: ${config.security.csrfProtection ? "Enabled" : "Disabled"}`,
    );
    console.log(
      `  - Request Signing: ${config.security.requestSigning ? "Enabled" : "Disabled"}`,
    );

    // Report OAuth providers
    const enabledProviders = getEnabledOAuthProviders();
    console.log(
      `  - OAuth Providers: ${enabledProviders.length > 0 ? enabledProviders.join(", ") : "None"}`,
    );

    if (enabledProviders.length === 0) {
      console.warn("⚠️  Warning: No OAuth providers are enabled");
    }

    // Security warnings
    if (config.isProduction) {
      if (!config.authService.baseUrl.startsWith("https://")) {
        console.error("❌ Error: Auth service must use HTTPS in production");
        return false;
      }

      if (!config.security.csrfProtection) {
        console.warn("⚠️  Warning: CSRF protection is disabled in production");
      }

      if (!config.security.requestSigning) {
        console.warn("⚠️  Warning: Request signing is disabled in production");
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Environment Configuration Error:", error);
    return false;
  }
}

// Export for use in browser console or Node.js
if (typeof window !== "undefined") {
  (
    window as unknown as Window & {
      validateEnvironmentConfig: typeof validateEnvironmentConfig;
    }
  ).validateEnvironmentConfig = validateEnvironmentConfig;
}
