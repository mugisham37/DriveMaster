"use client";

/**
 * API Client Performance Integration
 *
 * Integrates performance optimizations with the authentication API client
 * Implements caching, request deduplication, and performance monitoring
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { authCache, authRequestDeduplicator } from "./performance-optimization";
import type {
  UserProfile,
  LoginCredentials,
  RegisterData,
  TokenPair,
  OAuthProviderType,
} from "@/types/auth-service";

// ============================================================================
// Base Client Interface
// ============================================================================

interface AuthClientMethods {
  login: (
    credentials: LoginCredentials,
  ) => Promise<{ tokens: TokenPair; user: UserProfile }>;
  register: (
    userData: RegisterData,
  ) => Promise<{ tokens: TokenPair; user: UserProfile }>;
  logout: () => Promise<void>;
  refreshTokens: (refreshToken: string) => Promise<TokenPair>;
  getProfile: () => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  getSessions: () => Promise<unknown>;
  invalidateSession: (sessionId: string) => Promise<void>;
  invalidateAllOtherSessions: () => Promise<void>;
  initiateOAuth: (
    provider: OAuthProviderType,
    redirectUrl?: string,
  ) => Promise<unknown>;
  handleOAuthCallback: (
    provider: OAuthProviderType,
    code: string,
    state: string,
  ) => Promise<unknown>;
  getAvailableProviders: () => Promise<unknown>;
  getLinkedProviders: () => Promise<unknown>;
  linkProvider: (
    provider: OAuthProviderType,
    code: string,
    state: string,
  ) => Promise<unknown>;
  unlinkProvider: (provider: OAuthProviderType) => Promise<unknown>;
  checkHealth: () => Promise<unknown>;
}

// ============================================================================
// Performance-Enhanced API Client Wrapper
// ============================================================================

export class PerformanceEnhancedAuthClient {
  constructor(private baseClient: AuthClientMethods) {}

  /**
   * Login with performance optimizations
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const cacheKey = `login_attempt_${credentials.email}`;

    return authRequestDeduplicator.execute(
      cacheKey,
      () => this.baseClient.login(credentials),
      { timeout: 15000 }, // 15 second timeout for login
    ) as Promise<{ tokens: TokenPair; user: UserProfile }>;
  }

  /**
   * Register with performance optimizations
   */
  async register(
    userData: RegisterData,
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const cacheKey = `register_attempt_${userData.email}`;

    return authRequestDeduplicator.execute(
      cacheKey,
      () => this.baseClient.register(userData),
      { timeout: 20000 }, // 20 second timeout for registration
    ) as Promise<{ tokens: TokenPair; user: UserProfile }>;
  }

  /**
   * Get profile with caching and deduplication
   */
  async getProfile(): Promise<UserProfile> {
    const cacheKey = "user_profile";

    // Check cache first
    const cached = authCache.get<UserProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use request deduplication
    const profile = (await authRequestDeduplicator.execute(cacheKey, () =>
      this.baseClient.getProfile(),
    )) as UserProfile;

    // Cache the result
    authCache.set(cacheKey, profile, 5 * 60 * 1000); // 5 minutes TTL

    return profile;
  }

  /**
   * Update profile with cache invalidation
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const result = (await this.baseClient.updateProfile(
      updates,
    )) as UserProfile;

    // Invalidate profile cache
    authCache.invalidate("user_profile");
    authCache.invalidatePattern("profile_");

    return result;
  }

  /**
   * Logout with cache cleanup
   */
  async logout(): Promise<void> {
    try {
      await this.baseClient.logout();
    } finally {
      // Always clear caches on logout
      authCache.clear();
      authRequestDeduplicator.clear();
    }
  }

  /**
   * Refresh tokens with deduplication
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const cacheKey = "token_refresh";

    return authRequestDeduplicator.execute(
      cacheKey,
      () => this.baseClient.refreshTokens(refreshToken),
      { timeout: 10000 }, // 10 second timeout for token refresh
    ) as Promise<TokenPair>;
  }

  /**
   * OAuth initiation with deduplication
   */
  async initiateOAuth(
    provider: OAuthProviderType,
    redirectUrl?: string,
  ): Promise<unknown> {
    const cacheKey = `oauth_initiate_${provider}_${redirectUrl || "default"}`;

    return authRequestDeduplicator.execute(
      cacheKey,
      () => this.baseClient.initiateOAuth(provider, redirectUrl),
      { timeout: 8000 }, // 8 second timeout for OAuth initiation
    ) as Promise<unknown>;
  }

  /**
   * OAuth callback handling
   */
  async handleOAuthCallback(
    provider: OAuthProviderType,
    code: string,
    state: string,
  ): Promise<unknown> {
    // OAuth callbacks should not be cached or deduplicated as they are one-time use
    return this.baseClient.handleOAuthCallback(provider, code, state);
  }

  /**
   * Get sessions with caching
   */
  async getSessions(): Promise<unknown> {
    const cacheKey = "user_sessions";

    // Check cache first
    const cached = authCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const sessions = await this.baseClient.getSessions();

    // Cache for shorter time since sessions can change
    authCache.set(cacheKey, sessions, 2 * 60 * 1000); // 2 minutes TTL

    return sessions;
  }

  /**
   * Invalidate session with cache cleanup
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.baseClient.invalidateSession(sessionId);

    // Invalidate sessions cache
    authCache.invalidate("user_sessions");
  }

  /**
   * Invalidate all other sessions with cache cleanup
   */
  async invalidateAllOtherSessions(): Promise<void> {
    await this.baseClient.invalidateAllOtherSessions();

    // Invalidate sessions cache
    authCache.invalidate("user_sessions");
  }

  /**
   * Get available OAuth providers with caching
   */
  async getAvailableProviders(): Promise<unknown> {
    const cacheKey = "oauth_providers";

    // Check cache first
    const cached = authCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const providers = await this.baseClient.getAvailableProviders();

    // Cache for longer time since providers rarely change
    authCache.set(cacheKey, providers, 30 * 60 * 1000); // 30 minutes TTL

    return providers;
  }

  /**
   * Get linked providers with caching
   */
  async getLinkedProviders(): Promise<unknown> {
    const cacheKey = "linked_providers";

    // Check cache first
    const cached = authCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const linkedProviders = await this.baseClient.getLinkedProviders();

    // Cache for moderate time
    authCache.set(cacheKey, linkedProviders, 10 * 60 * 1000); // 10 minutes TTL

    return linkedProviders;
  }

  /**
   * Link provider with cache invalidation
   */
  async linkProvider(
    provider: OAuthProviderType,
    code: string,
    state: string,
  ): Promise<unknown> {
    const result = await this.baseClient.linkProvider(provider, code, state);

    // Invalidate linked providers cache
    authCache.invalidate("linked_providers");
    authCache.invalidate("user_profile"); // Profile might have updated linked providers

    return result;
  }

  /**
   * Unlink provider with cache invalidation
   */
  async unlinkProvider(provider: OAuthProviderType): Promise<unknown> {
    const result = await this.baseClient.unlinkProvider(provider);

    // Invalidate linked providers cache
    authCache.invalidate("linked_providers");
    authCache.invalidate("user_profile"); // Profile might have updated linked providers

    return result;
  }

  /**
   * Check health with minimal caching
   */
  async checkHealth(): Promise<unknown> {
    const cacheKey = "service_health";

    // Very short cache for health checks
    const cached = authCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const health = await this.baseClient.checkHealth();

    // Cache for very short time
    authCache.set(cacheKey, health, 30 * 1000); // 30 seconds TTL

    return health;
  }

  /**
   * Get performance status for debugging
   */
  getPerformanceStatus() {
    return {
      cache: authCache.getStatus(),
      deduplicator: authRequestDeduplicator.getStatus(),
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all performance optimizations
   */
  clearPerformanceOptimizations() {
    authCache.clear();
    authRequestDeduplicator.clear();
  }
}

// ============================================================================
// Performance Monitoring Interceptor
// ============================================================================

export function createPerformanceInterceptor() {
  const performanceMetrics = new Map<
    string,
    {
      count: number;
      totalTime: number;
      averageTime: number;
      lastCall: number;
    }
  >();

  return {
    beforeRequest: (operation: string) => {
      const startTime = performance.now();
      console.log(`[Auth Performance] Starting: ${operation}`);

      return {
        operation,
        startTime,
        endRequest: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Update metrics
          const existing = performanceMetrics.get(operation) || {
            count: 0,
            totalTime: 0,
            averageTime: 0,
            lastCall: 0,
          };

          existing.count++;
          existing.totalTime += duration;
          existing.averageTime = existing.totalTime / existing.count;
          existing.lastCall = endTime;

          performanceMetrics.set(operation, existing);

          console.log(
            `[Auth Performance] Completed: ${operation} (${duration.toFixed(2)}ms)`,
          );

          // Log warning for slow operations
          if (duration > 5000) {
            // 5 seconds
            console.warn(
              `[Auth Performance] Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`,
            );
          }
        },
      };
    },

    getMetrics: () => {
      const metrics = Array.from(performanceMetrics.entries()).map(
        ([operation, data]) => ({
          operation,
          ...data,
        }),
      );

      return {
        operations: metrics,
        totalOperations: metrics.reduce((sum, m) => sum + m.count, 0),
        averageResponseTime:
          metrics.reduce((sum, m) => sum + m.averageTime, 0) / metrics.length ||
          0,
      };
    },

    clearMetrics: () => {
      performanceMetrics.clear();
    },
  };
}

// ============================================================================
// Export Enhanced Client Factory
// ============================================================================

export function createPerformanceEnhancedAuthClient(
  baseClient: AuthClientMethods,
): PerformanceEnhancedAuthClient {
  return new PerformanceEnhancedAuthClient(baseClient);
}

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

export function useAuthClientPerformance() {
  const interceptor = createPerformanceInterceptor();

  return {
    interceptor,
    getMetrics: interceptor.getMetrics,
    clearMetrics: interceptor.clearMetrics,

    // Helper to wrap API calls with performance monitoring
    withPerformanceMonitoring: <
      T extends (...args: unknown[]) => Promise<unknown>,
    >(
      operation: string,
      fn: T,
    ): T => {
      return (async (...args: unknown[]) => {
        const { endRequest } = interceptor.beforeRequest(operation);

        try {
          const result = await fn(...args);
          endRequest();
          return result;
        } catch (error) {
          endRequest();
          throw error;
        }
      }) as T;
    },
  };
}
