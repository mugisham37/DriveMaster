/**
 * Authentication Service API Client
 * Core authentication API methods with credential validation and error handling
 */

import { httpClient } from "../http";
import { authCache } from "../cache";
import type {
  LoginCredentials,
  RegisterData,
  TokenPair,
  UserProfile,
  ProfileUpdateRequest,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ProfileResponse,
  ApiResponse,
  AuthError,
  ValidationError,
  NetworkError,
  ServerError,
  Session,
  LinkedProvider,
  OAuthProvider,
  SessionListResponse,
  ProvidersResponse,
} from "../../types/auth-service";

/**
 * Validation utilities
 */
class ValidationUtils {
  static validateEmail(email: string): string[] {
    const errors: string[] = [];

    if (!email) {
      errors.push("Email is required");
      return errors;
    }

    if (typeof email !== "string") {
      errors.push("Email must be a string");
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push("Please enter a valid email address");
    }

    if (email.length > 254) {
      errors.push("Email address is too long");
    }

    return errors;
  }

  static validatePassword(password: string): string[] {
    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
      return errors;
    }

    if (typeof password !== "string") {
      errors.push("Password must be a string");
      return errors;
    }

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (password.length > 128) {
      errors.push("Password is too long");
    }

    // Check for at least one uppercase, one lowercase, and one number
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
    }

    return errors;
  }

  static validateCountryCode(countryCode: string): string[] {
    const errors: string[] = [];

    if (!countryCode) {
      errors.push("Country code is required");
      return errors;
    }

    if (typeof countryCode !== "string") {
      errors.push("Country code must be a string");
      return errors;
    }

    // ISO 3166-1 alpha-2 country code validation
    if (!/^[A-Z]{2}$/.test(countryCode.toUpperCase())) {
      errors.push(
        "Country code must be a valid ISO 3166-1 alpha-2 code (e.g., US, GB, CA)",
      );
    }

    return errors;
  }

  static validateTimezone(timezone?: string): string[] {
    const errors: string[] = [];

    if (timezone && typeof timezone !== "string") {
      errors.push("Timezone must be a string");
      return errors;
    }

    if (timezone) {
      try {
        // Validate timezone by attempting to create a date formatter
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        errors.push("Invalid timezone identifier");
      }
    }

    return errors;
  }

  static validateLanguage(language?: string): string[] {
    const errors: string[] = [];

    if (language && typeof language !== "string") {
      errors.push("Language must be a string");
      return errors;
    }

    if (language) {
      // Basic language code validation (ISO 639-1 or BCP 47)
      if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
        errors.push(
          "Language must be a valid language code (e.g., en, en-US, fr, es)",
        );
      }
    }

    return errors;
  }
}

/**
 * Error handling utilities
 */
class ErrorHandler {
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

  static handleApiError(error: unknown): AuthError {
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
          "Unable to connect to the authentication service. Please check your internet connection.",
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
      message,
      recoverable: true,
      retryAfter: 5000,
    } as ServerError;
  }

  static enhanceAuthError(error: AuthError, context: string): AuthError {
    // Add context-specific error messages
    switch (error.type) {
      case "authentication":
        if (context === "login") {
          error.message =
            "Invalid email or password. Please check your credentials and try again.";
        } else if (context === "token_refresh") {
          error.message = "Your session has expired. Please sign in again.";
        }
        break;

      case "validation":
        error.message = `Please correct the following errors: ${error.message}`;
        break;

      case "network":
        error.message =
          "Connection problem. Please check your internet connection and try again.";
        break;

      case "server":
        if (error.code === "RATE_LIMITED") {
          error.message =
            "Too many requests. Please wait a moment before trying again.";
        } else {
          error.message = "Server error. Please try again later.";
        }
        break;
    }

    return error;
  }
}

/**
 * Core Authentication API Client
 */
export class AuthServiceClient {
  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    // Validate credentials
    const emailErrors = ValidationUtils.validateEmail(credentials.email);
    const passwordErrors = ValidationUtils.validatePassword(
      credentials.password,
    );

    if (emailErrors.length > 0) {
      throw ErrorHandler.createValidationError("email", emailErrors);
    }

    if (passwordErrors.length > 0) {
      throw ErrorHandler.createValidationError("password", passwordErrors);
    }

    try {
      const response = await httpClient.post<LoginResponse>("/auth/login", {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || "Login failed");
      }

      const { tokens, user } = response.data.data;

      // Validate response data
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error("Invalid response: missing tokens");
      }

      if (!user.id || !user.email || !user.handle) {
        throw new Error("Invalid response: incomplete user data");
      }

      // Cache user profile after successful login
      authCache.setProfile(user.id, user);
      authCache.invalidate("login");

      // Warm cache with additional data
      authCache
        .warmCache(user.id, {
          getProfile: () => this.getProfile(),
          getLinkedProviders: () => this.getLinkedProviders(),
          getAvailableProviders: () => this.getAvailableProviders(),
        })
        .catch((error) => {
          console.warn("Cache warming failed:", error);
        });

      return { tokens, user };
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "login");
    }
  }

  /**
   * Register new user account
   */
  async register(userData: RegisterData): Promise<{
    tokens: TokenPair;
    user: UserProfile;
    requiresEmailVerification?: boolean;
  }> {
    // Validate registration data
    const emailErrors = ValidationUtils.validateEmail(userData.email);
    const passwordErrors = ValidationUtils.validatePassword(userData.password);
    const countryErrors = ValidationUtils.validateCountryCode(
      userData.countryCode,
    );
    const timezoneErrors = ValidationUtils.validateTimezone(userData.timezone);
    const languageErrors = ValidationUtils.validateLanguage(userData.language);

    const allErrors = [
      ...emailErrors.map((err) => ({ field: "email", error: err })),
      ...passwordErrors.map((err) => ({ field: "password", error: err })),
      ...countryErrors.map((err) => ({ field: "countryCode", error: err })),
      ...timezoneErrors.map((err) => ({ field: "timezone", error: err })),
      ...languageErrors.map((err) => ({ field: "language", error: err })),
    ];

    if (allErrors.length > 0) {
      const firstError = allErrors[0]!;
      throw ErrorHandler.createValidationError(firstError.field, [
        firstError.error,
      ]);
    }

    try {
      const requestData = {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        countryCode: userData.countryCode.toUpperCase(),
        ...(userData.timezone && { timezone: userData.timezone }),
        ...(userData.language && { language: userData.language }),
      };

      const response = await httpClient.post<RegisterResponse>(
        "/auth/register",
        requestData,
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || "Registration failed");
      }

      const { tokens, user, requiresEmailVerification } = response.data.data;

      // Validate response data
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error("Invalid response: missing tokens");
      }

      if (!user.id || !user.email || !user.handle) {
        throw new Error("Invalid response: incomplete user data");
      }

      // Cache user profile after successful registration
      authCache.setProfile(user.id, user);
      authCache.invalidate("login");

      return {
        tokens,
        user,
        ...(requiresEmailVerification !== undefined && {
          requiresEmailVerification,
        }),
      };
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "register");
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken || typeof refreshToken !== "string") {
      throw ErrorHandler.createValidationError("refreshToken", [
        "Refresh token is required",
      ]);
    }

    try {
      const response = await httpClient.post<RefreshTokenResponse>(
        "/auth/refresh",
        {
          refreshToken,
        },
        {
          skipAuth: true, // Don't inject access token for refresh requests
        },
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || "Token refresh failed");
      }

      const { tokens } = response.data.data;

      // Validate response data
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error("Invalid response: missing tokens");
      }

      // Invalidate cache on token refresh to ensure fresh data
      authCache.invalidate("token_refresh");

      return tokens;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "token_refresh");
    }
  }

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post<ApiResponse>("/auth/logout", {});

      // Clear cache on logout
      authCache.invalidate("logout");

      // Clear tokens from storage regardless of server response
      // This ensures local cleanup even if server request fails
    } catch (error) {
      // Clear cache even if logout request fails
      authCache.invalidate("logout");

      // Log error but don't throw - logout should always succeed locally
      console.warn("Logout request failed:", error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(useCache: boolean = true): Promise<UserProfile> {
    // Try to get from cache first if enabled
    if (useCache) {
      // We need the user ID to check cache, but we don't have it here
      // This is a limitation - in a real implementation, we'd store the current user ID
      // For now, we'll skip cache for this method and rely on the calling code to cache
    }

    try {
      const response = await httpClient.get<ProfileResponse>("/auth/profile");

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

      // Cache the profile data
      authCache.setProfile(user.id, user);

      return user;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "profile_fetch");
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: ProfileUpdateRequest): Promise<UserProfile> {
    // Validate update data
    const errors: Array<{ field: string; error: string }> = [];

    if (updates.name !== undefined) {
      if (typeof updates.name !== "string") {
        errors.push({ field: "name", error: "Name must be a string" });
      } else if (updates.name.length > 100) {
        errors.push({ field: "name", error: "Name is too long" });
      }
    }

    if (updates.bio !== undefined) {
      if (typeof updates.bio !== "string") {
        errors.push({ field: "bio", error: "Bio must be a string" });
      } else if (updates.bio.length > 500) {
        errors.push({ field: "bio", error: "Bio is too long" });
      }
    }

    if (updates.website !== undefined) {
      if (typeof updates.website !== "string") {
        errors.push({ field: "website", error: "Website must be a string" });
      } else if (updates.website && !updates.website.match(/^https?:\/\/.+/)) {
        errors.push({ field: "website", error: "Website must be a valid URL" });
      }
    }

    if (updates.preferences?.timezone) {
      const timezoneErrors = ValidationUtils.validateTimezone(
        updates.preferences.timezone,
      );
      errors.push(
        ...timezoneErrors.map((err) => ({
          field: "preferences.timezone",
          error: err,
        })),
      );
    }

    if (updates.preferences?.language) {
      const languageErrors = ValidationUtils.validateLanguage(
        updates.preferences.language,
      );
      errors.push(
        ...languageErrors.map((err) => ({
          field: "preferences.language",
          error: err,
        })),
      );
    }

    if (errors.length > 0) {
      const firstError = errors[0]!;
      throw ErrorHandler.createValidationError(firstError.field, [
        firstError.error,
      ]);
    }

    try {
      const response = await httpClient.patch<ProfileResponse>(
        "/auth/profile",
        updates,
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

      // Update cache with new profile data
      authCache.setProfile(user.id, user);
      authCache.invalidate("profile_update");

      return user;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "profile_update");
    }
  }

  /**
   * Get user sessions with caching
   */
  async getSessions(
    userId: number,
    useCache: boolean = true,
  ): Promise<Session[]> {
    // Try cache first if enabled
    if (useCache) {
      const cached = authCache.getSessions(userId);
      if (cached) {
        return cached;
      }
    }

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

      const sessions = response.data.data.sessions;

      // Cache the sessions
      authCache.setSessions(userId, sessions);

      return sessions;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "sessions_fetch");
    }
  }

  /**
   * Get linked OAuth providers with caching
   */
  async getLinkedProviders(
    userId?: number,
    useCache: boolean = true,
  ): Promise<LinkedProvider[]> {
    // Try cache first if enabled and userId is available
    if (useCache && userId) {
      const cached = authCache.getLinkedProviders(userId);
      if (cached) {
        return cached;
      }
    }

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

      // Cache the providers if userId is available
      if (userId) {
        authCache.setLinkedProviders(userId, providers);
      }

      return providers;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "linked_providers_fetch");
    }
  }

  /**
   * Get available OAuth providers with caching
   */
  async getAvailableProviders(
    useCache: boolean = true,
  ): Promise<OAuthProvider[]> {
    // Try cache first if enabled
    if (useCache) {
      const cached = authCache.getAvailableProviders();
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await httpClient.get<ProvidersResponse>(
        "/auth/oauth/providers",
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch available providers",
        );
      }

      const providers = response.data.data.providers;

      // Cache the providers with longer TTL
      authCache.setAvailableProviders(providers);

      return providers;
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(
        authError,
        "available_providers_fetch",
      );
    }
  }

  /**
   * Link OAuth provider
   */
  async linkProvider(
    provider: string,
    code: string,
    state: string,
  ): Promise<void> {
    try {
      await httpClient.post<ApiResponse>(`/auth/oauth/${provider}/link`, {
        code,
        state,
      });

      // Invalidate provider cache
      authCache.invalidate("provider_link");
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "provider_link");
    }
  }

  /**
   * Unlink OAuth provider
   */
  async unlinkProvider(provider: string): Promise<void> {
    try {
      await httpClient.delete<ApiResponse>(`/auth/oauth/${provider}/unlink`);

      // Invalidate provider cache
      authCache.invalidate("provider_unlink");
    } catch (error) {
      const authError = ErrorHandler.handleApiError(error);
      throw ErrorHandler.enhanceAuthError(authError, "provider_unlink");
    }
  }
}

// Export singleton instance
export const authServiceClient = new AuthServiceClient();

// Export utilities for testing
export { ValidationUtils, ErrorHandler };
