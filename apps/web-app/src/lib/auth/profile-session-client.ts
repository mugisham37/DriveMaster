/**
 * Profile and Session Management API Client
 * Handles profile management, session operations, and health checks
 */

import { httpClient } from "../http";
import type {
  UserProfile,
  ProfileUpdateRequest,
  SessionListResponse,
  SessionInvalidationRequest,
  LinkedProvider,
  OAuthProviderType,
  HealthResponse,
  ProvidersResponse,
  ApiResponse,
  AuthError,
  ValidationError,
  NetworkError,
  ServerError,
} from "../../types/auth-service";

/**
 * Profile validation utilities
 */
class ProfileValidator {
  static validateName(name?: string): string[] {
    const errors: string[] = [];

    if (name !== undefined) {
      if (typeof name !== "string") {
        errors.push("Name must be a string");
        return errors;
      }

      if (name.length > 100) {
        errors.push("Name cannot exceed 100 characters");
      }

      if (name.trim().length === 0) {
        errors.push("Name cannot be empty");
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
        errors.push("Name contains invalid characters");
      }
    }

    return errors;
  }

  static validateBio(bio?: string): string[] {
    const errors: string[] = [];

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        errors.push("Bio must be a string");
        return errors;
      }

      if (bio.length > 500) {
        errors.push("Bio cannot exceed 500 characters");
      }
    }

    return errors;
  }

  static validateLocation(location?: string): string[] {
    const errors: string[] = [];

    if (location !== undefined) {
      if (typeof location !== "string") {
        errors.push("Location must be a string");
        return errors;
      }

      if (location.length > 100) {
        errors.push("Location cannot exceed 100 characters");
      }
    }

    return errors;
  }

  static validateWebsite(website?: string): string[] {
    const errors: string[] = [];

    if (website !== undefined) {
      if (typeof website !== "string") {
        errors.push("Website must be a string");
        return errors;
      }

      if (website.length > 200) {
        errors.push("Website URL cannot exceed 200 characters");
      }

      if (website.trim().length > 0) {
        try {
          const url = new URL(website);
          if (!["http:", "https:"].includes(url.protocol)) {
            errors.push("Website must use HTTP or HTTPS protocol");
          }
        } catch {
          errors.push("Website must be a valid URL");
        }
      }
    }

    return errors;
  }

  static validateGithubUsername(githubUsername?: string): string[] {
    const errors: string[] = [];

    if (githubUsername !== undefined) {
      if (typeof githubUsername !== "string") {
        errors.push("GitHub username must be a string");
        return errors;
      }

      if (githubUsername.length > 39) {
        errors.push("GitHub username cannot exceed 39 characters");
      }

      if (githubUsername.trim().length > 0) {
        // GitHub username validation
        if (
          !/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(
            githubUsername,
          )
        ) {
          errors.push("Invalid GitHub username format");
        }
      }
    }

    return errors;
  }

  static validateTwitterUsername(twitterUsername?: string): string[] {
    const errors: string[] = [];

    if (twitterUsername !== undefined) {
      if (typeof twitterUsername !== "string") {
        errors.push("Twitter username must be a string");
        return errors;
      }

      if (twitterUsername.length > 15) {
        errors.push("Twitter username cannot exceed 15 characters");
      }

      if (twitterUsername.trim().length > 0) {
        // Twitter username validation (without @)
        const username = twitterUsername.startsWith("@")
          ? twitterUsername.slice(1)
          : twitterUsername;
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          errors.push("Invalid Twitter username format");
        }
      }
    }

    return errors;
  }

  static validatePreferences(
    preferences?: Partial<UserProfile["preferences"]>,
  ): string[] {
    const errors: string[] = [];

    if (preferences) {
      if (preferences.theme !== undefined) {
        const validThemes = ["light", "dark", "system"];
        if (!validThemes.includes(preferences.theme)) {
          errors.push("Theme must be one of: light, dark, system");
        }
      }

      if (
        preferences.emailNotifications !== undefined &&
        typeof preferences.emailNotifications !== "boolean"
      ) {
        errors.push("Email notifications preference must be a boolean");
      }

      if (
        preferences.mentorNotifications !== undefined &&
        typeof preferences.mentorNotifications !== "boolean"
      ) {
        errors.push("Mentor notifications preference must be a boolean");
      }

      if (preferences.language !== undefined) {
        if (typeof preferences.language !== "string") {
          errors.push("Language must be a string");
        } else if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(preferences.language)) {
          errors.push(
            "Language must be a valid language code (e.g., en, en-US)",
          );
        }
      }

      if (preferences.timezone !== undefined) {
        if (typeof preferences.timezone !== "string") {
          errors.push("Timezone must be a string");
        } else {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
          } catch {
            errors.push("Invalid timezone identifier");
          }
        }
      }
    }

    return errors;
  }
}

/**
 * Session validation utilities
 */
class SessionValidator {
  static validateSessionId(sessionId: string): string[] {
    const errors: string[] = [];

    if (!sessionId) {
      errors.push("Session ID is required");
      return errors;
    }

    if (typeof sessionId !== "string") {
      errors.push("Session ID must be a string");
      return errors;
    }

    if (sessionId.trim().length === 0) {
      errors.push("Session ID cannot be empty");
    }

    // Basic UUID format validation
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sessionId,
      )
    ) {
      errors.push("Session ID must be a valid UUID");
    }

    return errors;
  }
}

/**
 * Error handling utilities
 */
class ProfileSessionErrorHandler {
  static createValidationError(
    field: string,
    constraints: string[],
  ): ValidationError {
    return {
      type: "validation",
      field,
      constraints,
      message: `Validation failed for ${field}: ${constraints.join(", ")}`,
      recoverable: false,
    };
  }

  static handleApiError(error: unknown, context: string): AuthError {
    // If it's already an AuthError, return as is
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      "message" in error
    ) {
      return error as AuthError;
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        type: "network",
        message:
          "Unable to connect to the service. Please check your internet connection.",
        recoverable: true,
        retryAfter: 5000,
      } as NetworkError;
    }

    // Handle timeout errors
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("timeout"))
    ) {
      return {
        type: "network",
        message: "Request timed out. Please try again.",
        recoverable: true,
        retryAfter: 3000,
      } as NetworkError;
    }

    // Generic error fallback
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      type: "server",
      message: `${context}: ${message}`,
      recoverable: true,
      retryAfter: 5000,
    } as ServerError;
  }

  static enhanceError(error: AuthError, context: string): AuthError {
    // Add context-specific error messages
    switch (context) {
      case "profile_fetch":
        if (error.type === "authentication") {
          error.message = "Please sign in to view your profile";
        } else if (error.type === "network") {
          error.message =
            "Unable to load profile. Please check your connection.";
        }
        break;

      case "profile_update":
        if (error.type === "validation") {
          error.message = `Profile update failed: ${error.message}`;
        } else if (error.type === "network") {
          error.message = "Unable to save profile changes. Please try again.";
        }
        break;

      case "session_management":
        if (error.type === "authentication") {
          error.message = "Please sign in to manage your sessions";
        } else if (error.type === "network") {
          error.message =
            "Unable to load session information. Please try again.";
        }
        break;

      case "provider_management":
        if (error.type === "network") {
          error.message = "Unable to load linked accounts. Please try again.";
        }
        break;
    }

    return error;
  }
}

/**
 * Profile and Session Management API Client
 */
export class ProfileSessionClient {
  /**
   * Get current user profile with enhanced error handling
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response =
        await httpClient.get<ApiResponse<UserProfile>>("/auth/profile");

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch profile",
        );
      }

      const user = response.data.data;

      // Validate response data
      if (!user.id || !user.email || !user.handle) {
        throw new Error("Invalid response: incomplete user data");
      }

      return user;
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "profile_fetch",
      );
      throw ProfileSessionErrorHandler.enhanceError(authError, "profile_fetch");
    }
  }

  /**
   * Update user profile with comprehensive validation
   */
  async updateProfile(updates: ProfileUpdateRequest): Promise<UserProfile> {
    // Validate all update fields
    const validationErrors: Array<{ field: string; errors: string[] }> = [];

    if (updates.name !== undefined) {
      const nameErrors = ProfileValidator.validateName(updates.name);
      if (nameErrors.length > 0) {
        validationErrors.push({ field: "name", errors: nameErrors });
      }
    }

    if (updates.bio !== undefined) {
      const bioErrors = ProfileValidator.validateBio(updates.bio);
      if (bioErrors.length > 0) {
        validationErrors.push({ field: "bio", errors: bioErrors });
      }
    }

    if (updates.location !== undefined) {
      const locationErrors = ProfileValidator.validateLocation(
        updates.location,
      );
      if (locationErrors.length > 0) {
        validationErrors.push({ field: "location", errors: locationErrors });
      }
    }

    if (updates.website !== undefined) {
      const websiteErrors = ProfileValidator.validateWebsite(updates.website);
      if (websiteErrors.length > 0) {
        validationErrors.push({ field: "website", errors: websiteErrors });
      }
    }

    if (updates.githubUsername !== undefined) {
      const githubErrors = ProfileValidator.validateGithubUsername(
        updates.githubUsername,
      );
      if (githubErrors.length > 0) {
        validationErrors.push({
          field: "githubUsername",
          errors: githubErrors,
        });
      }
    }

    if (updates.twitterUsername !== undefined) {
      const twitterErrors = ProfileValidator.validateTwitterUsername(
        updates.twitterUsername,
      );
      if (twitterErrors.length > 0) {
        validationErrors.push({
          field: "twitterUsername",
          errors: twitterErrors,
        });
      }
    }

    if (updates.preferences !== undefined) {
      const preferencesErrors = ProfileValidator.validatePreferences(
        updates.preferences,
      );
      if (preferencesErrors.length > 0) {
        validationErrors.push({
          field: "preferences",
          errors: preferencesErrors,
        });
      }
    }

    // Throw validation error if any field is invalid
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]!;
      throw ProfileSessionErrorHandler.createValidationError(
        firstError.field,
        firstError.errors,
      );
    }

    try {
      // Clean up the update data
      const cleanedUpdates: ProfileUpdateRequest = {};

      if (updates.name !== undefined) {
        cleanedUpdates.name = updates.name.trim();
      }
      if (updates.bio !== undefined) {
        cleanedUpdates.bio = updates.bio.trim();
      }
      if (updates.location !== undefined) {
        cleanedUpdates.location = updates.location.trim();
      }
      if (updates.website !== undefined) {
        cleanedUpdates.website = updates.website.trim();
      }
      if (updates.githubUsername !== undefined) {
        cleanedUpdates.githubUsername = updates.githubUsername.trim();
      }
      if (updates.twitterUsername !== undefined) {
        // Remove @ if present
        const username = updates.twitterUsername.trim();
        cleanedUpdates.twitterUsername = username.startsWith("@")
          ? username.slice(1)
          : username;
      }
      if (updates.preferences !== undefined) {
        cleanedUpdates.preferences = updates.preferences;
      }

      const response = await httpClient.patch<ApiResponse<UserProfile>>(
        "/auth/profile",
        cleanedUpdates,
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to update profile",
        );
      }

      const user = response.data.data;

      // Validate response data
      if (!user.id || !user.email || !user.handle) {
        throw new Error("Invalid response: incomplete user data");
      }

      return user;
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "profile_update",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "profile_update",
      );
    }
  }

  /**
   * Get all active sessions for the current user
   */
  async getSessions(): Promise<SessionListResponse> {
    try {
      const response =
        await httpClient.get<ApiResponse<SessionListResponse>>(
          "/auth/sessions",
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch sessions",
        );
      }

      const sessionData = response.data.data;

      // Validate response data
      if (!Array.isArray(sessionData.sessions)) {
        throw new Error("Invalid response: sessions must be an array");
      }

      if (typeof sessionData.totalCount !== "number") {
        throw new Error("Invalid response: totalCount must be a number");
      }

      return sessionData;
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "session_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "session_management",
      );
    }
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    // Validate session ID
    const sessionIdErrors = SessionValidator.validateSessionId(sessionId);
    if (sessionIdErrors.length > 0) {
      throw ProfileSessionErrorHandler.createValidationError(
        "sessionId",
        sessionIdErrors,
      );
    }

    try {
      const requestData: SessionInvalidationRequest = {
        sessionId: sessionId.trim(),
      };

      const response = await httpClient.delete<
        ApiResponse<Record<string, never>>
      >(`/auth/sessions/${sessionId}`, {
        body: requestData,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.error?.message || "Failed to invalidate session",
        );
      }
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "session_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "session_management",
      );
    }
  }

  /**
   * Get linked OAuth providers for the current user
   */
  async getLinkedProviders(): Promise<LinkedProvider[]> {
    try {
      const response =
        await httpClient.get<ApiResponse<{ providers: LinkedProvider[] }>>(
          "/auth/oauth/linked",
        );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch linked providers",
        );
      }

      const providers = response.data.data.providers;

      // Validate response data
      if (!Array.isArray(providers)) {
        throw new Error("Invalid response: providers must be an array");
      }

      return providers;
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "provider_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "provider_management",
      );
    }
  }

  /**
   * Get available OAuth providers from the server
   */
  async getAvailableProviders(): Promise<
    {
      provider: OAuthProviderType;
      name: string;
      enabled: boolean;
      iconUrl?: string;
    }[]
  > {
    try {
      const response = await httpClient.get<ProvidersResponse>(
        "/auth/oauth/providers",
        {
          skipAuth: true,
        },
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch available providers",
        );
      }

      const providers = response.data.data.providers;

      // Validate and transform response data
      if (!Array.isArray(providers)) {
        throw new Error("Invalid response: providers must be an array");
      }

      return providers.map((provider) => ({
        provider: provider.id,
        name: provider.displayName || provider.name,
        enabled: provider.enabled,
        ...(provider.iconUrl && { iconUrl: provider.iconUrl }),
      }));
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "provider_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "provider_management",
      );
    }
  }

  /**
   * Invalidate all sessions except the current one
   */
  async invalidateAllOtherSessions(): Promise<void> {
    try {
      const response = await httpClient.delete<
        ApiResponse<Record<string, never>>
      >("/auth/sessions/others");

      if (!response.data.success) {
        throw new Error(
          response.data.error?.message || "Failed to invalidate other sessions",
        );
      }
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "session_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "session_management",
      );
    }
  }

  /**
   * Get session count for the current user
   */
  async getSessionCount(): Promise<number> {
    try {
      const sessionData = await this.getSessions();
      return sessionData.totalCount;
    } catch (error) {
      const authError = ProfileSessionErrorHandler.handleApiError(
        error,
        "session_management",
      );
      throw ProfileSessionErrorHandler.enhanceError(
        authError,
        "session_management",
      );
    }
  }

  /**
   * Check if user has multiple active sessions
   */
  async hasMultipleSessions(): Promise<boolean> {
    try {
      const count = await this.getSessionCount();
      return count > 1;
    } catch {
      return false;
    }
  }

  /**
   * Check authentication service health
   */
  async checkHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    version: string;
    uptime: number;
    services: {
      database: "healthy" | "unhealthy";
      redis: "healthy" | "unhealthy";
      oauth: Record<OAuthProviderType, "healthy" | "unhealthy">;
    };
  }> {
    try {
      const response = await httpClient.get<HealthResponse>("/auth/health", {
        skipAuth: true,
        skipRetry: true,
        timeout: 10000, // 10 second timeout for health checks
      });

      if (!response.data.success || !response.data.data) {
        throw new Error("Health check failed");
      }

      const healthData = response.data.data;

      // Validate response data
      if (
        !healthData.status ||
        !healthData.version ||
        typeof healthData.uptime !== "number"
      ) {
        throw new Error("Invalid health response format");
      }

      return healthData;
    } catch (error) {
      // For health checks, we want to return a degraded status rather than throw
      console.warn("Health check failed:", error);

      return {
        status: "unhealthy",
        version: "unknown",
        uptime: 0,
        services: {
          database: "unhealthy",
          redis: "unhealthy",
          oauth: {
            google: "unhealthy",
            apple: "unhealthy",
            facebook: "unhealthy",
            github: "unhealthy",
            microsoft: "unhealthy",
          },
        },
      };
    }
  }

  /**
   * Check if a specific OAuth provider is available and healthy
   */
  async isProviderHealthy(provider: OAuthProviderType): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.services.oauth[provider] === "healthy";
    } catch {
      return false;
    }
  }

  /**
   * Get service status summary
   */
  async getServiceStatus(): Promise<{
    overall: "healthy" | "degraded" | "unhealthy";
    authService: boolean;
    database: boolean;
    redis: boolean;
    oauthProviders: Record<OAuthProviderType, boolean>;
  }> {
    try {
      const health = await this.checkHealth();

      const oauthProviders = Object.entries(health.services.oauth).reduce(
        (acc, [provider, status]) => {
          acc[provider as OAuthProviderType] = status === "healthy";
          return acc;
        },
        {} as Record<OAuthProviderType, boolean>,
      );

      return {
        overall: health.status,
        authService: health.status !== "unhealthy",
        database: health.services.database === "healthy",
        redis: health.services.redis === "healthy",
        oauthProviders,
      };
    } catch {
      return {
        overall: "unhealthy",
        authService: false,
        database: false,
        redis: false,
        oauthProviders: {
          google: false,
          apple: false,
          facebook: false,
          github: false,
          microsoft: false,
        },
      };
    }
  }
}

// Export singleton instance
export const profileSessionClient = new ProfileSessionClient();

// Export utilities for testing
export { ProfileValidator, SessionValidator, ProfileSessionErrorHandler };
