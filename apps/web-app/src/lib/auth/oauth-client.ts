/**
 * OAuth API Client for Auth Service Integration
 * Handles OAuth flows for Google, Apple, Facebook, GitHub, and Microsoft
 */

import { httpClient } from "../http";
import { isOAuthProviderEnabled } from "../config/environment";
import type {
  OAuthProviderType,
  OAuthProvider,
  OAuthInitiationResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  OAuthLinkRequest,
  LinkedProvider,
  TokenPair,
  UserProfile,
  ApiResponse,
  OAuthError,
  ProvidersResponse,
} from "../../types/auth-service";

/**
 * OAuth state management for CSRF protection
 */
class OAuthStateManager {
  private static readonly STATE_KEY = "oauth_state";
  private static readonly STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate secure state parameter
   */
  static generateState(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): string {
    const state = {
      provider,
      redirectUrl,
      timestamp: Date.now(),
      nonce: crypto
        .getRandomValues(new Uint8Array(16))
        .reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), ""),
    };

    const stateString = btoa(JSON.stringify(state));

    // Store state in sessionStorage for validation
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`${this.STATE_KEY}_${provider}`, stateString);
    }

    return stateString;
  }

  /**
   * Validate state parameter
   */
  static validateState(
    provider: OAuthProviderType,
    stateString: string,
  ): boolean {
    try {
      if (typeof window === "undefined") {
        return false;
      }

      const storedState = sessionStorage.getItem(
        `${this.STATE_KEY}_${provider}`,
      );
      if (!storedState || storedState !== stateString) {
        return false;
      }

      const state = JSON.parse(atob(stateString));

      // Check if state has expired
      if (Date.now() - state.timestamp > this.STATE_EXPIRY) {
        this.clearState(provider);
        return false;
      }

      // Validate provider matches
      if (state.provider !== provider) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get redirect URL from state
   */
  static getRedirectUrl(stateString: string): string | undefined {
    try {
      const state = JSON.parse(atob(stateString));
      return state.redirectUrl;
    } catch {
      return undefined;
    }
  }

  /**
   * Clear stored state
   */
  static clearState(provider: OAuthProviderType): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`${this.STATE_KEY}_${provider}`);
    }
  }
}

/**
 * PKCE (Proof Key for Code Exchange) utilities for enhanced security
 */
class PKCEUtils {
  /**
   * Generate code verifier for PKCE
   */
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Generate code challenge from verifier
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
}

/**
 * OAuth error handling utilities
 */
class OAuthErrorHandler {
  static createOAuthError(
    code: OAuthError["code"],
    message: string,
    provider?: OAuthProviderType,
    details?: Record<string, unknown>,
  ): OAuthError {
    return {
      type: "oauth",
      code,
      message,
      ...(provider && { provider }),
      ...(details && { details }),
      recoverable: code !== "OAUTH_DENIED",
    };
  }

  static handleOAuthError(
    error: unknown,
    provider: OAuthProviderType,
    context: string,
  ): OAuthError {
    // If it's already an OAuthError, return as is
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      (error as { type: string }).type === "oauth"
    ) {
      return error as OAuthError;
    }

    // Handle specific OAuth error scenarios
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      const message = (error as { message: string }).message;

      if (
        message.includes("access_denied") ||
        message.includes("user_denied")
      ) {
        return this.createOAuthError(
          "OAUTH_DENIED",
          `${provider} authentication was cancelled by the user`,
          provider,
        );
      }

      if (
        message.includes("invalid_request") ||
        message.includes("invalid_client")
      ) {
        return this.createOAuthError(
          "PROVIDER_ERROR",
          `${provider} configuration error. Please contact support.`,
          provider,
        );
      }

      if (message.includes("state")) {
        return this.createOAuthError(
          "STATE_MISMATCH",
          "Security validation failed. Please try again.",
          provider,
        );
      }
    }

    // Generic OAuth error
    return this.createOAuthError(
      "OAUTH_ERROR",
      `${provider} authentication failed. Please try again.`,
      provider,
      { context, originalError: String(error) },
    );
  }

  static enhanceOAuthError(
    error: OAuthError,
    userFriendly: boolean = true,
  ): OAuthError {
    if (!userFriendly) {
      return error;
    }

    // Provide user-friendly error messages based on provider and error code
    const providerName = error.provider
      ? this.getProviderDisplayName(error.provider)
      : "OAuth provider";

    switch (error.code) {
      case "OAUTH_DENIED":
        error.message = `You cancelled the ${providerName} sign-in. Please try again if you want to continue.`;
        break;
      case "PROVIDER_ERROR":
        error.message = `There's a problem with ${providerName} sign-in. Please try a different method or contact support if this continues.`;
        break;
      case "STATE_MISMATCH":
        error.message =
          "Security check failed. Please start the sign-in process again for your protection.";
        break;
      case "INVALID_CODE":
        error.message =
          "The authorization code is invalid or expired. Please try signing in again.";
        break;
      case "OAUTH_ERROR":
        if (error.message.includes("already linked")) {
          // Keep specific linking messages
          break;
        }
        error.message = `${providerName} sign-in failed. Please try again or use a different method.`;
        break;
    }

    // Add recovery suggestions based on error type
    if (error.recoverable) {
      switch (error.code) {
        case "PROVIDER_ERROR":
          error.message +=
            " You can try refreshing the page or using a different browser.";
          break;
        case "OAUTH_ERROR":
          if (!error.message.includes("already linked")) {
            error.message +=
              " Make sure you have a stable internet connection.";
          }
          break;
        case "STATE_MISMATCH":
          error.message +=
            " This helps protect your account from security threats.";
          break;
      }
    }

    return error;
  }

  /**
   * Get user-friendly display name for OAuth provider
   */
  static getProviderDisplayName(provider: OAuthProviderType): string {
    const displayNames: Record<OAuthProviderType, string> = {
      google: "Google",
      apple: "Apple",
      facebook: "Facebook",
      github: "GitHub",
      microsoft: "Microsoft",
    };
    return displayNames[provider] || provider;
  }
}

/**
 * OAuth validation utilities
 */
class OAuthValidator {
  static validateProvider(provider: string): OAuthProviderType {
    const validProviders: OAuthProviderType[] = [
      "google",
      "apple",
      "facebook",
      "github",
      "microsoft",
    ];

    if (!validProviders.includes(provider as OAuthProviderType)) {
      throw new Error(`Invalid OAuth provider: ${provider}`);
    }

    return provider as OAuthProviderType;
  }

  static validateProviderEnabled(provider: OAuthProviderType): void {
    if (!isOAuthProviderEnabled(provider)) {
      throw new Error(`OAuth provider ${provider} is not enabled`);
    }
  }

  static validateAuthorizationCode(code: string): void {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      throw new Error("Authorization code is required");
    }

    if (code.length > 2048) {
      throw new Error("Authorization code is too long");
    }
  }

  static validateState(state: string): void {
    if (!state || typeof state !== "string" || state.trim().length === 0) {
      throw new Error("State parameter is required");
    }
  }
}

/**
 * OAuth API Client
 */
export class OAuthClient {
  /**
   * Get available OAuth providers
   */
  async getAvailableProviders(): Promise<OAuthProvider[]> {
    try {
      const response = await httpClient.get<ProvidersResponse>(
        "/auth/oauth/providers",
        {
          skipAuth: true,
        },
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch providers",
        );
      }

      return response.data.data.providers;
    } catch (error) {
      throw OAuthErrorHandler.handleOAuthError(
        error,
        "google",
        "fetch_providers",
      );
    }
  }

  /**
   * Check if a provider is available and enabled
   */
  isProviderEnabled(provider: OAuthProviderType): boolean {
    try {
      OAuthValidator.validateProvider(provider);
      OAuthValidator.validateProviderEnabled(provider);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initiate OAuth flow for a provider with state parameter generation
   */
  async initiateOAuth(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): Promise<{ authorizationUrl: string; state: string }> {
    try {
      // Validate provider
      OAuthValidator.validateProvider(provider);
      OAuthValidator.validateProviderEnabled(provider);

      // Generate state for CSRF protection
      const state = OAuthStateManager.generateState(provider, redirectUrl);

      // Generate PKCE parameters for enhanced security
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      const codeChallenge = await PKCEUtils.generateCodeChallenge(codeVerifier);

      // Store code verifier for later use
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`oauth_code_verifier_${provider}`, codeVerifier);
      }

      // Build query parameters for OAuth initiation
      const queryParams = new URLSearchParams({
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        ...(redirectUrl && { redirect_url: redirectUrl }),
      });

      const response = await httpClient.get<
        ApiResponse<OAuthInitiationResponse>
      >(`/auth/oauth/${provider}/initiate?${queryParams.toString()}`, {
        skipAuth: true,
        headers: {
          "X-OAuth-Provider": provider,
          "X-OAuth-Flow": "authorization_code",
        },
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to initiate OAuth flow",
        );
      }

      const { authorizationUrl } = response.data.data;

      if (!authorizationUrl) {
        throw new Error("Invalid response: missing authorization URL");
      }

      // Validate authorization URL format
      try {
        new URL(authorizationUrl);
      } catch {
        throw new Error("Invalid authorization URL received from server");
      }

      return { authorizationUrl, state };
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "initiate",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Handle OAuth callback and exchange authorization code for tokens
   */
  async handleCallback(
    provider: OAuthProviderType,
    code: string,
    state: string,
  ): Promise<{ tokens: TokenPair; user: UserProfile; isNewUser: boolean }> {
    try {
      // Validate inputs
      OAuthValidator.validateProvider(provider);
      OAuthValidator.validateAuthorizationCode(code);
      OAuthValidator.validateState(state);

      // Validate state parameter for CSRF protection
      if (!OAuthStateManager.validateState(provider, state)) {
        throw OAuthErrorHandler.createOAuthError(
          "STATE_MISMATCH",
          "Security validation failed - invalid state parameter",
          provider,
        );
      }

      // Get stored code verifier for PKCE
      let codeVerifier: string | undefined;
      if (typeof window !== "undefined") {
        codeVerifier =
          sessionStorage.getItem(`oauth_code_verifier_${provider}`) ||
          undefined;
      }

      const requestData: OAuthCallbackRequest = {
        provider,
        code: code.trim(),
        state: state.trim(),
        ...(codeVerifier && { codeVerifier }),
      };

      const response = await httpClient.post<
        ApiResponse<OAuthCallbackResponse>
      >(`/auth/oauth/${provider}/callback`, requestData, {
        skipAuth: true,
        headers: {
          "X-OAuth-Provider": provider,
          "X-OAuth-Flow": "callback",
        },
      });

      if (!response.data.success || !response.data.data) {
        const errorMessage =
          response.data.error?.message || "OAuth callback failed";
        throw OAuthErrorHandler.createOAuthError(
          "OAUTH_ERROR",
          errorMessage,
          provider,
          { responseData: response.data },
        );
      }

      const { tokens, user, isNewUser } = response.data.data;

      // Validate response data integrity
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw OAuthErrorHandler.createOAuthError(
          "OAUTH_ERROR",
          "Invalid response: missing authentication tokens",
          provider,
        );
      }

      if (!user.id || !user.email || !user.handle) {
        throw OAuthErrorHandler.createOAuthError(
          "OAUTH_ERROR",
          "Invalid response: incomplete user profile data",
          provider,
        );
      }

      // Validate token format (basic JWT structure check)
      if (
        !tokens.accessToken.includes(".") ||
        !tokens.refreshToken.includes(".")
      ) {
        throw OAuthErrorHandler.createOAuthError(
          "OAUTH_ERROR",
          "Invalid token format received",
          provider,
        );
      }

      // Clean up stored state and code verifier
      OAuthStateManager.clearState(provider);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`oauth_code_verifier_${provider}`);
      }

      return { tokens, user, isNewUser };
    } catch (error) {
      // Clean up on error
      OAuthStateManager.clearState(provider);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`oauth_code_verifier_${provider}`);
      }

      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "callback",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Link OAuth provider to existing authenticated account
   */
  async linkProvider(
    provider: OAuthProviderType,
    code: string,
    state: string,
  ): Promise<void> {
    try {
      // Validate inputs
      OAuthValidator.validateProvider(provider);
      OAuthValidator.validateAuthorizationCode(code);
      OAuthValidator.validateState(state);

      // Validate state parameter for CSRF protection
      if (!OAuthStateManager.validateState(provider, state)) {
        throw OAuthErrorHandler.createOAuthError(
          "STATE_MISMATCH",
          "Security validation failed - invalid state parameter",
          provider,
        );
      }

      const requestData: OAuthLinkRequest = {
        provider,
        code: code.trim(),
        state: state.trim(),
      };

      const response = await httpClient.post<
        ApiResponse<Record<string, never>>
      >(`/auth/oauth/${provider}/link`, requestData, {
        headers: {
          "X-OAuth-Provider": provider,
          "X-OAuth-Operation": "link",
        },
      });

      if (!response.data.success) {
        const errorMessage =
          response.data.error?.message || "Failed to link provider";
        const errorCode = response.data.error?.code;

        // Handle specific linking errors
        if (errorCode === "PROVIDER_ALREADY_LINKED") {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            `Your ${provider} account is already linked to this account`,
            provider,
          );
        } else if (errorCode === "PROVIDER_LINKED_TO_OTHER_ACCOUNT") {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            `This ${provider} account is already linked to another user account`,
            provider,
          );
        } else {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            errorMessage,
            provider,
            { responseData: response.data },
          );
        }
      }

      // Clean up stored state
      OAuthStateManager.clearState(provider);
    } catch (error) {
      // Clean up on error
      OAuthStateManager.clearState(provider);

      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "link",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Unlink OAuth provider from authenticated account
   */
  async unlinkProvider(provider: OAuthProviderType): Promise<void> {
    try {
      // Validate provider
      OAuthValidator.validateProvider(provider);

      const response = await httpClient.delete<
        ApiResponse<Record<string, never>>
      >(`/auth/oauth/${provider}/unlink`, {
        headers: {
          "X-OAuth-Provider": provider,
          "X-OAuth-Operation": "unlink",
        },
      });

      if (!response.data.success) {
        const errorMessage =
          response.data.error?.message || "Failed to unlink provider";
        const errorCode = response.data.error?.code;

        // Handle specific unlinking errors
        if (errorCode === "PROVIDER_NOT_LINKED") {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            `Your ${provider} account is not currently linked`,
            provider,
          );
        } else if (errorCode === "CANNOT_UNLINK_LAST_PROVIDER") {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            `Cannot unlink ${provider} as it's your only authentication method. Please add another login method first.`,
            provider,
          );
        } else if (errorCode === "UNLINK_NOT_ALLOWED") {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            `Cannot unlink ${provider} account due to security restrictions`,
            provider,
          );
        } else {
          throw OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            errorMessage,
            provider,
            { responseData: response.data },
          );
        }
      }
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "unlink",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Get linked OAuth providers for authenticated user
   */
  async getLinkedProviders(): Promise<LinkedProvider[]> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ providers: LinkedProvider[] }>
      >("/auth/oauth/linked", {
        headers: {
          "X-OAuth-Operation": "list_linked",
        },
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message || "Failed to fetch linked providers",
        );
      }

      return response.data.data.providers;
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        "google",
        "fetch_linked",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Initiate OAuth flow for linking a provider to existing account
   */
  async initiateOAuthForLinking(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): Promise<{ authorizationUrl: string; state: string }> {
    try {
      // Validate provider
      OAuthValidator.validateProvider(provider);
      OAuthValidator.validateProviderEnabled(provider);

      // Generate state for CSRF protection with linking context
      const state = OAuthStateManager.generateState(provider, redirectUrl);

      // Build query parameters for OAuth linking initiation
      const queryParams = new URLSearchParams({
        state,
        operation: "link",
        ...(redirectUrl && { redirect_url: redirectUrl }),
      });

      const response = await httpClient.get<
        ApiResponse<OAuthInitiationResponse>
      >(`/auth/oauth/${provider}/initiate?${queryParams.toString()}`, {
        headers: {
          "X-OAuth-Provider": provider,
          "X-OAuth-Flow": "link",
          "X-OAuth-Operation": "initiate_link",
        },
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ||
            "Failed to initiate OAuth linking flow",
        );
      }

      const { authorizationUrl } = response.data.data;

      if (!authorizationUrl) {
        throw new Error("Invalid response: missing authorization URL");
      }

      // Validate authorization URL format
      try {
        new URL(authorizationUrl);
      } catch {
        throw new Error("Invalid authorization URL received from server");
      }

      return { authorizationUrl, state };
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "initiate_link",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Check if a provider is already linked to the current user
   */
  async isProviderLinked(provider: OAuthProviderType): Promise<boolean> {
    try {
      const linkedProviders = await this.getLinkedProviders();
      return linkedProviders.some((p) => p.provider === provider && p.isActive);
    } catch (error) {
      // If we can't fetch linked providers, assume not linked
      console.warn(`Failed to check if ${provider} is linked:`, error);
      return false;
    }
  }

  /**
   * Open OAuth popup window for authentication
   */
  openOAuthPopup(
    authorizationUrl: string,
    provider: OAuthProviderType,
  ): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(
          new Error("OAuth popup is only available in browser environment"),
        );
        return;
      }

      const popup = window.open(
        authorizationUrl,
        `oauth_${provider}`,
        "width=500,height=600,scrollbars=yes,resizable=yes",
      );

      if (!popup) {
        reject(
          OAuthErrorHandler.createOAuthError(
            "OAUTH_ERROR",
            "Failed to open OAuth popup. Please allow popups for this site.",
            provider,
          ),
        );
        return;
      }

      // Poll for popup completion
      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            reject(
              OAuthErrorHandler.createOAuthError(
                "OAUTH_DENIED",
                "OAuth popup was closed",
                provider,
              ),
            );
            return;
          }

          // Check if popup has navigated to callback URL
          const url = popup.location.href;
          if (url.includes("/auth/callback") || url.includes("code=")) {
            clearInterval(pollTimer);

            // Extract code and state from URL
            const urlParams = new URLSearchParams(popup.location.search);
            const code = urlParams.get("code");
            const state = urlParams.get("state");

            popup.close();

            if (code && state) {
              resolve({ code, state });
            } else {
              reject(
                OAuthErrorHandler.createOAuthError(
                  "INVALID_CODE",
                  "Invalid authorization response",
                  provider,
                ),
              );
            }
          }
        } catch {
          // Cross-origin error - popup is still on OAuth provider domain
          // Continue polling
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(
        () => {
          clearInterval(pollTimer);
          if (!popup.closed) {
            popup.close();
          }
          reject(
            OAuthErrorHandler.createOAuthError(
              "OAUTH_ERROR",
              "OAuth authentication timed out",
              provider,
            ),
          );
        },
        5 * 60 * 1000,
      );
    });
  }

  /**
   * Complete OAuth flow with popup
   */
  async authenticateWithPopup(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): Promise<{ tokens: TokenPair; user: UserProfile; isNewUser: boolean }> {
    try {
      // Initiate OAuth flow
      const { authorizationUrl, state } = await this.initiateOAuth(
        provider,
        redirectUrl,
      );

      // Open popup and wait for completion
      const { code, state: returnedState } = await this.openOAuthPopup(
        authorizationUrl,
        provider,
      );

      // Verify state matches
      if (state !== returnedState) {
        throw OAuthErrorHandler.createOAuthError(
          "STATE_MISMATCH",
          "Security validation failed",
          provider,
        );
      }

      // Handle callback
      return await this.handleCallback(provider, code, state);
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "popup_auth",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Complete OAuth linking flow with popup
   */
  async linkProviderWithPopup(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): Promise<void> {
    try {
      // Check if provider is already linked
      const isLinked = await this.isProviderLinked(provider);
      if (isLinked) {
        throw OAuthErrorHandler.createOAuthError(
          "OAUTH_ERROR",
          `Your ${this.getProviderDisplayName(provider)} account is already linked`,
          provider,
        );
      }

      // Initiate OAuth flow for linking
      const { authorizationUrl, state } = await this.initiateOAuthForLinking(
        provider,
        redirectUrl,
      );

      // Open popup and wait for completion
      const { code, state: returnedState } = await this.openOAuthPopup(
        authorizationUrl,
        provider,
      );

      // Verify state matches
      if (state !== returnedState) {
        throw OAuthErrorHandler.createOAuthError(
          "STATE_MISMATCH",
          "Security validation failed",
          provider,
        );
      }

      // Handle linking
      await this.linkProvider(provider, code, state);
    } catch (error) {
      const oauthError = OAuthErrorHandler.handleOAuthError(
        error,
        provider,
        "popup_link",
      );
      throw OAuthErrorHandler.enhanceOAuthError(oauthError);
    }
  }

  /**
   * Get OAuth provider status and availability
   */
  async getProviderStatus(provider: OAuthProviderType): Promise<{
    enabled: boolean;
    available: boolean;
    linked: boolean;
    displayName: string;
  }> {
    try {
      OAuthValidator.validateProvider(provider);

      const enabled = this.isProviderEnabled(provider);
      const available = enabled; // For now, enabled means available
      const linked = enabled ? await this.isProviderLinked(provider) : false;
      const displayName = this.getProviderDisplayName(provider);

      return {
        enabled,
        available,
        linked,
        displayName,
      };
    } catch {
      return {
        enabled: false,
        available: false,
        linked: false,
        displayName: this.getProviderDisplayName(provider),
      };
    }
  }

  /**
   * Get status for all OAuth providers
   */
  async getAllProvidersStatus(): Promise<
    Record<
      OAuthProviderType,
      {
        enabled: boolean;
        available: boolean;
        linked: boolean;
        displayName: string;
      }
    >
  > {
    const providers: OAuthProviderType[] = [
      "google",
      "apple",
      "facebook",
      "github",
      "microsoft",
    ];
    const statuses: Record<
      string,
      {
        enabled: boolean;
        available: boolean;
        linked: boolean;
        displayName: string;
      }
    > = {};

    // Get status for each provider in parallel
    const statusPromises = providers.map(async (provider) => {
      const status = await this.getProviderStatus(provider);
      return { provider, status };
    });

    const results = await Promise.allSettled(statusPromises);

    // Process results

    results.forEach((result, index) => {
      const provider = providers[index]!;
      if (result.status === "fulfilled") {
        statuses[provider] = result.value.status;
      } else {
        // Fallback for failed status checks
        statuses[provider] = {
          enabled: false,
          available: false,
          linked: false,
          displayName: this.getProviderDisplayName(provider),
        };
      }
    });

    return statuses as Record<
      OAuthProviderType,
      {
        enabled: boolean;
        available: boolean;
        linked: boolean;
        displayName: string;
      }
    >;
  }

  /**
   * Get user-friendly display name for OAuth provider (instance method)
   */
  private getProviderDisplayName(provider: OAuthProviderType): string {
    return OAuthErrorHandler.getProviderDisplayName(provider);
  }
}

// Export singleton instance
export const oauthClient = new OAuthClient();

// Export utilities for testing
export { OAuthStateManager, PKCEUtils, OAuthErrorHandler, OAuthValidator };
