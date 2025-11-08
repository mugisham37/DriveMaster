/**
 * Unified Auth Service API Client
 * Exports all authentication, OAuth, profile, and session management functionality
 */

// Core authentication client
import {
  authServiceClient,
  ValidationUtils,
  ErrorHandler,
} from "./auth-service-client";

// OAuth client
import {
  oauthClient,
  OAuthStateManager,
  PKCEUtils,
  OAuthErrorHandler,
  OAuthValidator,
} from "./oauth-client";

// Profile and session management client
import {
  profileSessionClient,
  ProfileValidator,
  SessionValidator,
  ProfileSessionErrorHandler,
} from "./profile-session-client";

// Re-export everything
export {
  authServiceClient,
  ValidationUtils,
  ErrorHandler,
  oauthClient,
  OAuthStateManager,
  PKCEUtils,
  OAuthErrorHandler,
  OAuthValidator,
  profileSessionClient,
  ProfileValidator,
  SessionValidator,
  ProfileSessionErrorHandler,
};

// Import and re-export types for convenience
import type {
  // Core auth types
  LoginCredentials,
  RegisterData,
  TokenPair,
  UserProfile,
  ProfileUpdateRequest,

  // OAuth types
  OAuthProviderType,
  OAuthProvider,
  OAuthInitiationRequest,
  OAuthInitiationResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  OAuthLinkRequest,
  OAuthUnlinkRequest,
  LinkedProvider,

  // Session types
  SessionListResponse,
  SessionInvalidationRequest,

  // Response types
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ProfileResponse,
  ProvidersResponse,
  HealthResponse,
  ApiResponse,

  // Error types
  AuthError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  OAuthError,
  ServerError,
  AuthErrorType,
} from "../../types/auth-service";

export type {
  // Core auth types
  LoginCredentials,
  RegisterData,
  TokenPair,
  UserProfile,
  ProfileUpdateRequest,

  // OAuth types
  OAuthProviderType,
  OAuthProvider,
  OAuthInitiationRequest,
  OAuthInitiationResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  OAuthLinkRequest,
  OAuthUnlinkRequest,
  LinkedProvider,

  // Session types
  SessionListResponse,
  SessionInvalidationRequest,

  // Response types
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ProfileResponse,
  ProvidersResponse,
  HealthResponse,
  ApiResponse,

  // Error types
  AuthError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  OAuthError,
  ServerError,
  AuthErrorType,
};

/**
 * Unified Auth Service API Client
 * Provides a single interface for all authentication operations
 */
export class UnifiedAuthClient {
  constructor(
    public readonly auth = authServiceClient,
    public readonly oauth = oauthClient,
    public readonly profile = profileSessionClient,
  ) {}

  // Core authentication methods
  async login(credentials: LoginCredentials) {
    return this.auth.login(credentials);
  }

  async register(userData: RegisterData) {
    return this.auth.register(userData);
  }

  async logout() {
    return this.auth.logout();
  }

  async refreshTokens(refreshToken: string) {
    return this.auth.refreshTokens(refreshToken);
  }

  // Profile management methods
  async getProfile() {
    return this.profile.getProfile();
  }

  async updateProfile(updates: ProfileUpdateRequest) {
    return this.profile.updateProfile(updates);
  }

  // Session management methods
  async getSessions() {
    return this.profile.getSessions();
  }

  async invalidateSession(sessionId: string) {
    return this.profile.invalidateSession(sessionId);
  }

  async invalidateAllOtherSessions() {
    return this.profile.invalidateAllOtherSessions();
  }

  async getSessionCount() {
    return this.profile.getSessionCount();
  }

  async hasMultipleSessions() {
    return this.profile.hasMultipleSessions();
  }

  // OAuth methods
  async getAvailableProviders() {
    return this.oauth.getAvailableProviders();
  }

  async initiateOAuth(provider: OAuthProviderType, redirectUrl?: string) {
    return this.oauth.initiateOAuth(provider, redirectUrl);
  }

  async handleOAuthCallback(
    provider: OAuthProviderType,
    code: string,
    state: string,
  ) {
    return this.oauth.handleCallback(provider, code, state);
  }

  async authenticateWithPopup(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ) {
    return this.oauth.authenticateWithPopup(provider, redirectUrl);
  }

  async linkProvider(provider: OAuthProviderType, code: string, state: string) {
    return this.oauth.linkProvider(provider, code, state);
  }

  async unlinkProvider(provider: OAuthProviderType) {
    return this.oauth.unlinkProvider(provider);
  }

  async getLinkedProviders() {
    return this.oauth.getLinkedProviders();
  }

  // New OAuth methods from task 3.3
  async initiateOAuthForLinking(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ) {
    return this.oauth.initiateOAuthForLinking(provider, redirectUrl);
  }

  async linkProviderWithPopup(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ) {
    return this.oauth.linkProviderWithPopup(provider, redirectUrl);
  }

  async isProviderLinked(provider: OAuthProviderType) {
    return this.oauth.isProviderLinked(provider);
  }

  async getProviderStatus(provider: OAuthProviderType) {
    return this.oauth.getProviderStatus(provider);
  }

  async getAllProvidersStatus() {
    return this.oauth.getAllProvidersStatus();
  }

  // Health and status methods
  async checkHealth() {
    return this.profile.checkHealth();
  }

  async getServiceStatus() {
    return this.profile.getServiceStatus();
  }

  async isProviderHealthy(provider: OAuthProviderType) {
    return this.profile.isProviderHealthy(provider);
  }

  // Utility methods
  isProviderEnabled(provider: OAuthProviderType) {
    return this.oauth.isProviderEnabled(provider);
  }
}

// Import performance enhancements
import { createPerformanceEnhancedAuthClient } from "./api-client-performance";

// Export singleton instance with performance enhancements
const baseAuthClient = new UnifiedAuthClient();
export const authClient = createPerformanceEnhancedAuthClient(baseAuthClient);

// Export individual clients for specific use cases
export { authServiceClient as coreAuth };
export { oauthClient as oauth };
export { profileSessionClient as profileSession };

// Export base client for cases where performance enhancements are not needed
export { baseAuthClient as baseAuthClient };
