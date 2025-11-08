"use client";

/**
 * Authentication Performance Optimization Layer
 *
 * Implements:
 * - API client caching integration for authentication operations
 * - Request deduplication for concurrent authentication operations
 * - Efficient memoization utilities for authentication hooks
 * - React re-render optimization for authentication state changes
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { useCallback, useMemo, useRef, useEffect } from "react";
import type {
  UserProfile,
  TokenPair,
  LoginCredentials,
  RegisterData,
  OAuthProviderType,
} from "@/types/auth-service";

// ============================================================================
// Request Deduplication System
// ============================================================================

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  key: string;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute a request with deduplication
   * If an identical request is already in progress, return the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: { timeout?: number } = {},
  ): Promise<T> {
    const timeout = options.timeout || this.REQUEST_TIMEOUT;

    // Check if we have a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing && Date.now() - existing.timestamp < timeout) {
      console.log(`[Auth Performance] Deduplicating request: ${key}`);
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn();
    const pendingRequest: PendingRequest<T> = {
      promise,
      timestamp: Date.now(),
      key,
    };

    this.pendingRequests.set(key, pendingRequest as PendingRequest<unknown>);

    // Clean up after completion
    promise
      .finally(() => {
        this.pendingRequests.delete(key);
      })
      .catch(() => {
        // Error handling is done by the caller
      });

    return promise;
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get status for debugging
   */
  getStatus() {
    return {
      pendingCount: this.pendingRequests.size,
      pendingKeys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Singleton instance
export const authRequestDeduplicator = new RequestDeduplicator();

// ============================================================================
// Authentication Caching System
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class AuthCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly PROFILE_TTL = 5 * 60 * 1000; // 5 minutes for user profile
  private readonly AUTH_STATUS_TTL = 1 * 60 * 1000; // 1 minute for auth status

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Auth Performance] Cache hit: ${key}`);
    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTtl = ttl || this.getTtlForKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + actualTtl,
    };

    this.cache.set(key, entry);
    console.log(`[Auth Performance] Cache set: ${key} (TTL: ${actualTtl}ms)`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[Auth Performance] Cache invalidated: ${key}`);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`[Auth Performance] Cache invalidated by pattern: ${key}`);
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log("[Auth Performance] Cache cleared");
  }

  /**
   * Get TTL based on cache key type
   */
  private getTtlForKey(key: string): number {
    if (key.includes("profile")) return this.PROFILE_TTL;
    if (key.includes("auth_status")) return this.AUTH_STATUS_TTL;
    return this.DEFAULT_TTL;
  }

  /**
   * Get cache status for debugging
   */
  getStatus() {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      isExpired: Date.now() > entry.expiresAt,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(
        `[Auth Performance] Cleaned up ${keysToDelete.length} expired cache entries`,
      );
    }
  }
}

// Singleton instance
export const authCache = new AuthCache();

// Set up periodic cleanup
if (typeof window !== "undefined") {
  setInterval(() => {
    authCache.cleanup();
  }, 60000); // Clean up every minute
}

// ============================================================================
// Optimized Authentication Operations
// ============================================================================

export class OptimizedAuthOperations {
  /**
   * Get user profile with caching and deduplication
   */
  async getProfile(
    profileFetcher: () => Promise<UserProfile>,
    userId?: number,
  ): Promise<UserProfile> {
    const cacheKey = `profile_${userId || "current"}`;

    // Check cache first
    const cached = authCache.get<UserProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use request deduplication
    const profile = await authRequestDeduplicator.execute(
      cacheKey,
      profileFetcher,
    );

    // Cache the result
    authCache.set(cacheKey, profile);

    return profile;
  }

  /**
   * Login with caching and deduplication
   */
  async login(
    credentials: LoginCredentials,
    loginFn: (
      creds: LoginCredentials,
    ) => Promise<{ tokens: TokenPair; user: UserProfile }>,
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const cacheKey = `login_${credentials.email}`;

    // Use request deduplication (no caching for login results)
    const result = await authRequestDeduplicator.execute(cacheKey, () =>
      loginFn(credentials),
    );

    // Cache user profile after successful login
    authCache.set(`profile_${result.user.id}`, result.user);
    authCache.set("profile_current", result.user);

    return result;
  }

  /**
   * Register with deduplication
   */
  async register(
    userData: RegisterData,
    registerFn: (
      data: RegisterData,
    ) => Promise<{ tokens: TokenPair; user: UserProfile }>,
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const cacheKey = `register_${userData.email}`;

    // Use request deduplication (no caching for register results)
    const result = await authRequestDeduplicator.execute(cacheKey, () =>
      registerFn(userData),
    );

    // Cache user profile after successful registration
    authCache.set(`profile_${result.user.id}`, result.user);
    authCache.set("profile_current", result.user);

    return result;
  }

  /**
   * OAuth initiation with deduplication
   */
  async initiateOAuth(
    provider: OAuthProviderType,
    redirectUrl: string | undefined,
    oauthFn: (
      provider: OAuthProviderType,
      redirectUrl?: string,
    ) => Promise<unknown>,
  ): Promise<unknown> {
    const cacheKey = `oauth_initiate_${provider}_${redirectUrl || "default"}`;

    // Use request deduplication with shorter timeout for OAuth
    return authRequestDeduplicator.execute(
      cacheKey,
      () => oauthFn(provider, redirectUrl),
      { timeout: 10000 }, // 10 seconds timeout for OAuth
    );
  }

  /**
   * Token refresh with deduplication
   */
  async refreshTokens(refreshFn: () => Promise<string>): Promise<string> {
    const cacheKey = "token_refresh";

    // Use request deduplication for token refresh
    return authRequestDeduplicator.execute(
      cacheKey,
      refreshFn,
      { timeout: 15000 }, // 15 seconds timeout for token refresh
    );
  }

  /**
   * Invalidate user-related cache entries
   */
  invalidateUserCache(userId?: number): void {
    if (userId) {
      authCache.invalidate(`profile_${userId}`);
    }
    authCache.invalidate("profile_current");
    authCache.invalidatePattern("auth_status");
  }

  /**
   * Clear all authentication caches
   */
  clearAllCaches(): void {
    authCache.clear();
    authRequestDeduplicator.clear();
  }

  /**
   * Get performance status for debugging
   */
  getPerformanceStatus() {
    return {
      cache: authCache.getStatus(),
      deduplicator: authRequestDeduplicator.getStatus(),
    };
  }
}

// Singleton instance
export const optimizedAuthOps = new OptimizedAuthOperations();

// ============================================================================
// React Memoization Utilities
// ============================================================================

/**
 * Stable reference generator for authentication context values
 * Prevents unnecessary re-renders by maintaining stable references
 */
export function useStableAuthValue<T>(
  value: T,
  dependencies: React.DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional spread for custom dependency management
  return useMemo(() => value, [value, ...dependencies]);
}

/**
 * Memoized authentication callback
 * Prevents recreation of callback functions on every render
 */
export function useStableAuthCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  dependencies: React.DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Generic utility hook that wraps useCallback for type safety
  return useCallback(callback, dependencies) as T;
}

/**
 * Optimized authentication state selector
 * Only re-renders when specific auth state properties change
 */
export function useAuthStateSelector<T>(
  selector: (state: unknown) => T,
  authState: unknown,
): T {
  return useMemo(() => selector(authState), [selector, authState]);
}

/**
 * Debounced authentication operation
 * Prevents rapid successive calls to authentication operations
 */
export function useDebouncedAuthOperation<
  T extends (...args: unknown[]) => unknown,
>(operation: T, delay: number = 300): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        operation(...args);
      }, delay);
    },
    [operation, delay],
  );

  return debouncedFn as T;
}

/**
 * Performance monitoring hook for authentication operations
 */
export function useAuthPerformanceMonitor(operationName: string) {
  const startTimeRef = useRef<number | undefined>(undefined);

  const startOperation = useCallback(() => {
    startTimeRef.current = performance.now();
    console.log(`[Auth Performance] Started: ${operationName}`);
  }, [operationName]);

  const endOperation = useCallback(() => {
    if (startTimeRef.current !== undefined) {
      const duration = performance.now() - startTimeRef.current;
      console.log(
        `[Auth Performance] Completed: ${operationName} (${duration.toFixed(2)}ms)`,
      );
      startTimeRef.current = undefined;
    }
  }, [operationName]);

  return { startOperation, endOperation };
}

// ============================================================================
// React Re-render Optimization
// ============================================================================

/**
 * Shallow comparison for authentication state
 * Prevents unnecessary re-renders when auth state objects have the same values
 */
export function shallowCompareAuthState(prev: unknown, next: unknown): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (typeof prev !== "object" || typeof next !== "object") return false;

  const prevObj = prev as Record<string, unknown>;
  const nextObj = next as Record<string, unknown>;

  const prevKeys = Object.keys(prevObj);
  const nextKeys = Object.keys(nextObj);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prevObj[key] !== nextObj[key]) return false;
  }

  return true;
}

/**
 * Optimized authentication context value creator
 * Creates stable context values to prevent unnecessary re-renders
 */
export function useOptimizedAuthContextValue(
  state: Record<string, unknown>,
  actions: Record<string, unknown>,
) {
  // Memoize the context value to prevent unnecessary re-renders
  return useMemo(() => {
    // Create stable action references
    const stableActions = Object.keys(actions).reduce(
      (acc, key) => {
        acc[key] = actions[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    return {
      // State properties
      ...state,

      // Stable action references
      ...stableActions,
    };
  }, [actions, state]);
}

/**
 * Performance-optimized authentication hook wrapper
 * Wraps authentication hooks with performance optimizations
 */
export function withAuthPerformanceOptimization<
  T extends (...args: unknown[]) => unknown,
>(hook: T, hookName: string): T {
  return ((...args: unknown[]) => {
    const { startOperation, endOperation } =
      useAuthPerformanceMonitor(hookName);

    useEffect(() => {
      startOperation();
      return endOperation;
    }, [startOperation, endOperation]);

    return hook(...args);
  }) as T;
}

// ============================================================================
// Export Performance Status
// ============================================================================

/**
 * Get comprehensive authentication performance status
 */
export function getAuthPerformanceStatus() {
  return {
    cache: authCache.getStatus(),
    deduplicator: authRequestDeduplicator.getStatus(),
    timestamp: Date.now(),
  };
}

/**
 * Reset all performance optimizations (useful for testing)
 */
export function resetAuthPerformanceOptimizations() {
  authCache.clear();
  authRequestDeduplicator.clear();
  console.log("[Auth Performance] All optimizations reset");
}
