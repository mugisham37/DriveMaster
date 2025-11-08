/**
 * Authentication Data Caching System
 * Implements memory cache for user profile and session data with cache invalidation and versioning
 */

import type {
  UserProfile,
  Session,
  LinkedProvider,
  OAuthProvider,
} from "../../types/auth-service";

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface AuthCacheConfig {
  defaultTtl: number; // Default time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enableVersioning: boolean; // Enable API version compatibility
  enableAccessTracking: boolean; // Track access patterns for optimization
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * Cache invalidation event types
 */
export type CacheInvalidationEvent =
  | "login"
  | "logout"
  | "token_refresh"
  | "profile_update"
  | "session_change"
  | "provider_link"
  | "provider_unlink";

/**
 * Cache warming configuration
 */
interface CacheWarmingConfig {
  enabled: boolean;
  profileOnLogin: boolean;
  sessionsOnLogin: boolean;
  providersOnLogin: boolean;
  preloadDelay: number; // Delay before preloading in milliseconds
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AuthCacheConfig = {
  defaultTtl: 300000, // 5 minutes
  maxSize: 100,
  enableVersioning: true,
  enableAccessTracking: true,
  cleanupInterval: 60000, // 1 minute
};

const DEFAULT_WARMING_CONFIG: CacheWarmingConfig = {
  enabled: true,
  profileOnLogin: true,
  sessionsOnLogin: false, // Sessions are less frequently accessed
  providersOnLogin: true,
  preloadDelay: 100, // 100ms delay
};

/**
 * Authentication Cache Class
 */
export class AuthCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: AuthCacheConfig;
  private warmingConfig: CacheWarmingConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
  };
  private currentApiVersion = "1.0.0";

  constructor(
    config: Partial<AuthCacheConfig> = {},
    warmingConfig: Partial<CacheWarmingConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.warmingConfig = { ...DEFAULT_WARMING_CONFIG, ...warmingConfig };
    this.startCleanupTimer();
  }

  /**
   * Get cached data
   */
  get<T>(key: string, version?: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Check version compatibility if versioning is enabled
    if (this.config.enableVersioning && version && entry.version !== version) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    if (this.config.enableAccessTracking) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTtl,
    version: string = this.currentApiVersion,
  ): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version,
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string, version?: string): boolean {
    return this.get(key, version) !== null;
  }

  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, invalidations: 0 };
  }

  /**
   * Invalidate cache based on authentication events
   */
  invalidate(event: CacheInvalidationEvent): void {
    this.stats.invalidations++;

    switch (event) {
      case "login":
        // Clear all cache on login to ensure fresh data
        this.clear();
        break;

      case "logout":
        // Clear all cache on logout
        this.clear();
        break;

      case "token_refresh":
        // Token refresh doesn't invalidate cached data
        break;

      case "profile_update":
        // Invalidate profile-related cache
        this.invalidateByPattern(/^profile:/);
        this.invalidateByPattern(/^user:/);
        break;

      case "session_change":
        // Invalidate session-related cache
        this.invalidateByPattern(/^sessions:/);
        break;

      case "provider_link":
      case "provider_unlink":
        // Invalidate provider-related cache
        this.invalidateByPattern(/^providers:/);
        this.invalidateByPattern(/^linked-providers:/);
        break;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  private invalidateByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(
    userId: number,
    dataFetchers: {
      getProfile?: () => Promise<UserProfile>;
      getSessions?: () => Promise<Session[]>;
      getLinkedProviders?: () => Promise<LinkedProvider[]>;
      getAvailableProviders?: () => Promise<OAuthProvider[]>;
    },
  ): Promise<void> {
    if (!this.warmingConfig.enabled) {
      return;
    }

    // Add delay to avoid overwhelming the server
    await new Promise((resolve) =>
      setTimeout(resolve, this.warmingConfig.preloadDelay),
    );

    const warmingPromises: Promise<void>[] = [];

    // Warm profile cache
    if (this.warmingConfig.profileOnLogin && dataFetchers.getProfile) {
      warmingPromises.push(
        dataFetchers
          .getProfile()
          .then((profile) => {
            this.setProfile(userId, profile);
          })
          .catch((error) => {
            console.warn("Failed to warm profile cache:", error);
          }),
      );
    }

    // Warm sessions cache
    if (this.warmingConfig.sessionsOnLogin && dataFetchers.getSessions) {
      warmingPromises.push(
        dataFetchers
          .getSessions()
          .then((sessions) => {
            this.setSessions(userId, sessions);
          })
          .catch((error) => {
            console.warn("Failed to warm sessions cache:", error);
          }),
      );
    }

    // Warm providers cache
    if (this.warmingConfig.providersOnLogin) {
      if (dataFetchers.getLinkedProviders) {
        warmingPromises.push(
          dataFetchers
            .getLinkedProviders()
            .then((providers) => {
              this.setLinkedProviders(userId, providers);
            })
            .catch((error) => {
              console.warn("Failed to warm linked providers cache:", error);
            }),
        );
      }

      if (dataFetchers.getAvailableProviders) {
        warmingPromises.push(
          dataFetchers
            .getAvailableProviders()
            .then((providers) => {
              this.setAvailableProviders(providers);
            })
            .catch((error) => {
              console.warn("Failed to warm available providers cache:", error);
            }),
        );
      }
    }

    await Promise.allSettled(warmingPromises);
  }

  /**
   * Cache user profile
   */
  setProfile(userId: number, profile: UserProfile, ttl?: number): void {
    this.set(`profile:${userId}`, profile, ttl);
    this.set(`user:${userId}`, profile, ttl); // Alias for compatibility
  }

  /**
   * Get cached user profile
   */
  getProfile(userId: number, version?: string): UserProfile | null {
    return this.get<UserProfile>(`profile:${userId}`, version);
  }

  /**
   * Cache user sessions
   */
  setSessions(userId: number, sessions: Session[], ttl?: number): void {
    this.set(`sessions:${userId}`, sessions, ttl);
  }

  /**
   * Get cached user sessions
   */
  getSessions(userId: number, version?: string): Session[] | null {
    return this.get<Session[]>(`sessions:${userId}`, version);
  }

  /**
   * Cache linked providers
   */
  setLinkedProviders(
    userId: number,
    providers: LinkedProvider[],
    ttl?: number,
  ): void {
    this.set(`linked-providers:${userId}`, providers, ttl);
  }

  /**
   * Get cached linked providers
   */
  getLinkedProviders(
    userId: number,
    version?: string,
  ): LinkedProvider[] | null {
    return this.get<LinkedProvider[]>(`linked-providers:${userId}`, version);
  }

  /**
   * Cache available providers
   */
  setAvailableProviders(providers: OAuthProvider[], ttl?: number): void {
    this.set("available-providers", providers, ttl || 3600000); // 1 hour TTL for providers
  }

  /**
   * Get cached available providers
   */
  getAvailableProviders(version?: string): OAuthProvider[] | null {
    return this.get<OAuthProvider[]>("available-providers", version);
  }

  /**
   * Update API version for cache versioning
   */
  setApiVersion(version: string): void {
    this.currentApiVersion = version;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

    const memoryUsage = this.estimateMemoryUsage();

    return {
      totalEntries: this.cache.size,
      hitRate: hitRate * 100,
      missRate: (1 - hitRate) * 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage,
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : now,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : now,
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON string size of data + metadata overhead
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2;
      size += 200; // Estimated overhead for metadata
    }

    return size;
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<AuthCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update cache warming configuration
   */
  updateWarmingConfig(newConfig: Partial<CacheWarmingConfig>): void {
    this.warmingConfig = { ...this.warmingConfig, ...newConfig };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const authCache = new AuthCache();

// Export types
export type { CacheEntry, CacheWarmingConfig };
