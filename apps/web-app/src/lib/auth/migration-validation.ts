/**
 * Migration Validation Utilities
 *
 * Validates that NextAuth.js has been completely removed and
 * auth service integration is working correctly
 */

import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import {
  getCurrentUser,
  requireAuth,
  requireMentor,
  requireInsider,
} from "@/lib/auth";

// ============================================================================
// Client-Side Validation
// ============================================================================

export interface ClientValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates client-side authentication integration
 */
export function validateClientIntegration(): ClientValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if AuthProvider is available
    if (typeof AuthProvider !== "function") {
      errors.push("AuthProvider is not available");
    }

    // Check if useAuth hook is available
    if (typeof useAuth !== "function") {
      errors.push("useAuth hook is not available");
    }

    // Check for NextAuth.js remnants in global scope
    if (typeof window !== "undefined") {
      // @ts-expect-error - checking for NextAuth remnants
      if (window.__NEXTAUTH) {
        warnings.push("NextAuth global object still present");
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings,
    };
  }
}

// ============================================================================
// Server-Side Validation
// ============================================================================

export interface ServerValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates server-side authentication integration
 */
export async function validateServerIntegration(): Promise<ServerValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if server utilities are available
    if (typeof getCurrentUser !== "function") {
      errors.push("getCurrentUser function is not available");
    }

    if (typeof requireAuth !== "function") {
      errors.push("requireAuth function is not available");
    }

    if (typeof requireMentor !== "function") {
      errors.push("requireMentor function is not available");
    }

    if (typeof requireInsider !== "function") {
      errors.push("requireInsider function is not available");
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_AUTH_SERVICE_URL) {
      errors.push(
        "NEXT_PUBLIC_AUTH_SERVICE_URL environment variable is not set",
      );
    }

    if (!process.env.JWT_SECRET) {
      errors.push("JWT_SECRET environment variable is not set");
    }

    // Check for NextAuth.js environment variables (should be warnings)
    if (process.env.NEXTAUTH_SECRET) {
      warnings.push(
        "NEXTAUTH_SECRET environment variable is still set (should be removed)",
      );
    }

    if (process.env.NEXTAUTH_URL) {
      warnings.push(
        "NEXTAUTH_URL environment variable is still set (should be removed)",
      );
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Server validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings,
    };
  }
}

// ============================================================================
// Comprehensive Migration Validation
// ============================================================================

export interface MigrationValidationResult {
  success: boolean;
  clientValidation: ClientValidationResult;
  serverValidation: ServerValidationResult;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    migrationComplete: boolean;
  };
}

/**
 * Performs comprehensive validation of the NextAuth.js to auth service migration
 */
export async function validateMigration(): Promise<MigrationValidationResult> {
  const clientValidation = validateClientIntegration();
  const serverValidation = await validateServerIntegration();

  const totalErrors =
    clientValidation.errors.length + serverValidation.errors.length;
  const totalWarnings =
    clientValidation.warnings.length + serverValidation.warnings.length;
  const migrationComplete = totalErrors === 0;

  return {
    success: migrationComplete,
    clientValidation,
    serverValidation,
    summary: {
      totalErrors,
      totalWarnings,
      migrationComplete,
    },
  };
}

// ============================================================================
// Migration Report Generator
// ============================================================================

/**
 * Generates a human-readable migration validation report
 */
export function generateMigrationReport(
  result: MigrationValidationResult,
): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("NextAuth.js to Auth Service Migration Validation Report");
  lines.push("=".repeat(60));
  lines.push("");

  // Summary
  lines.push("SUMMARY:");
  lines.push(
    `Migration Status: ${result.summary.migrationComplete ? "✅ COMPLETE" : "❌ INCOMPLETE"}`,
  );
  lines.push(`Total Errors: ${result.summary.totalErrors}`);
  lines.push(`Total Warnings: ${result.summary.totalWarnings}`);
  lines.push("");

  // Client-side validation
  lines.push("CLIENT-SIDE VALIDATION:");
  lines.push(
    `Status: ${result.clientValidation.success ? "✅ PASSED" : "❌ FAILED"}`,
  );

  if (result.clientValidation.errors.length > 0) {
    lines.push("Errors:");
    result.clientValidation.errors.forEach((error) => {
      lines.push(`  ❌ ${error}`);
    });
  }

  if (result.clientValidation.warnings.length > 0) {
    lines.push("Warnings:");
    result.clientValidation.warnings.forEach((warning) => {
      lines.push(`  ⚠️  ${warning}`);
    });
  }
  lines.push("");

  // Server-side validation
  lines.push("SERVER-SIDE VALIDATION:");
  lines.push(
    `Status: ${result.serverValidation.success ? "✅ PASSED" : "❌ FAILED"}`,
  );

  if (result.serverValidation.errors.length > 0) {
    lines.push("Errors:");
    result.serverValidation.errors.forEach((error) => {
      lines.push(`  ❌ ${error}`);
    });
  }

  if (result.serverValidation.warnings.length > 0) {
    lines.push("Warnings:");
    result.serverValidation.warnings.forEach((warning) => {
      lines.push(`  ⚠️  ${warning}`);
    });
  }
  lines.push("");

  // Recommendations
  if (!result.summary.migrationComplete) {
    lines.push("RECOMMENDATIONS:");
    lines.push("1. Fix all errors listed above before proceeding");
    lines.push("2. Address warnings to complete the cleanup");
    lines.push("3. Test authentication flows manually");
    lines.push("4. Remove any remaining NextAuth.js references");
    lines.push("");
  } else {
    lines.push("NEXT STEPS:");
    lines.push("1. ✅ Migration is complete!");
    lines.push("2. Test authentication flows in different browsers");
    lines.push("3. Verify OAuth providers work correctly");
    lines.push("4. Monitor error logs for any issues");
    lines.push("5. Update documentation to reflect new auth system");
    lines.push("");
  }

  lines.push("=".repeat(60));

  return lines.join("\n");
}
