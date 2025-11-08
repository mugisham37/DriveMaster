/**
 * Content Service Cache Types
 *
 * Type definitions for caching functionality
 */

export interface ContentCacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableCompression: boolean;
}

export interface CacheKey {
  operation: string;
  params: Record<string, unknown>;
  userId?: string;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}
