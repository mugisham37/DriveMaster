/**
 * Real-time Cache Integration
 *
 * Integrates WebSocket real-time updates with SWR cache for automatic
 * cache invalidation and optimistic updates.
 *
 * Requirements: 9.2, 9.4
 */

import { mutate } from "swr";
import { contentServiceCache } from "./content-service-cache";
import { getWebSocketManager } from "../websocket";
import type {
  CacheInvalidationEvent,
  ConflictResolution,
  ContentChange,
} from "../../../types/websocket";
import type { ContentItem } from "../../../types/entities";

// ============================================================================
// Cache Integration Manager
// ============================================================================

export class RealTimeCacheIntegration {
  private isInitialized = false;
  private webSocketManager = getWebSocketManager();

  /**
   * Initializes real-time cache integration
   * Requirements: 9.2, 9.4
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Set up WebSocket event handlers for cache integration
    this.webSocketManager.on(
      "cache_invalidated",
      this.handleCacheInvalidation.bind(this),
    );
    this.webSocketManager.on(
      "conflict_resolved",
      this.handleConflictResolution.bind(this),
    );

    this.isInitialized = true;
    console.log("[RealTimeCacheIntegration] Initialized");
  }

  /**
   * Destroys the cache integration
   */
  destroy(): void {
    if (!this.isInitialized) return;

    this.webSocketManager.off("cache_invalidated");
    this.webSocketManager.off("conflict_resolved");

    this.isInitialized = false;
    console.log("[RealTimeCacheIntegration] Destroyed");
  }

  /**
   * Handles cache invalidation events from WebSocket
   * Requirements: 9.2, 9.4
   */
  private async handleCacheInvalidation(
    event: CacheInvalidationEvent,
  ): Promise<void> {
    console.log(
      `[RealTimeCacheIntegration] Handling cache invalidation: ${event.type}`,
    );

    switch (event.type) {
      case "invalidate":
        await this.invalidateCacheKeys(event.keys);
        break;

      case "update":
        await this.updateCacheKeys(event.keys, event.itemId);
        break;

      case "refresh":
        await this.refreshCacheKeys(event.keys);
        break;
    }
  }

  /**
   * Handles conflict resolution events
   * Requirements: 9.4
   */
  private async handleConflictResolution(
    resolution: ConflictResolution,
  ): Promise<void> {
    console.log(
      `[RealTimeCacheIntegration] Handling conflict resolution: ${resolution.conflictType}`,
    );

    // Invalidate cache for the conflicted item to force refresh
    const cacheKeys = this.generateCacheKeysForItem(resolution.itemId);
    await this.invalidateCacheKeys(cacheKeys);

    // Optionally apply resolved changes optimistically
    if (resolution.resolvedChanges.length > 0) {
      await this.applyOptimisticUpdates(
        resolution.itemId,
        resolution.resolvedChanges,
      );
    }
  }

  /**
   * Invalidates specific cache keys
   */
  private async invalidateCacheKeys(keys: string[]): Promise<void> {
    const promises: Promise<unknown>[] = [];

    keys.forEach((key) => {
      // Invalidate in local cache
      if (key.includes("*")) {
        contentServiceCache.invalidatePattern(key);
      } else {
        contentServiceCache.invalidate(key);
      }

      // Invalidate in SWR cache
      const swrKey = this.convertToSwrKey(key);
      if (swrKey) {
        promises.push(mutate(swrKey, undefined, { revalidate: false }));
      }
    });

    await Promise.all(promises);
    console.log(
      `[RealTimeCacheIntegration] Invalidated ${keys.length} cache keys`,
    );
  }

  /**
   * Updates specific cache keys with fresh data
   */
  private async updateCacheKeys(
    keys: string[],
    itemId?: string,
  ): Promise<void> {
    if (!itemId) return;

    const promises: Promise<unknown>[] = [];

    keys.forEach((key) => {
      const swrKey = this.convertToSwrKey(key);
      if (swrKey) {
        // Revalidate the key to get fresh data
        promises.push(mutate(swrKey));
      }
    });

    await Promise.all(promises);
    console.log(`[RealTimeCacheIntegration] Updated ${keys.length} cache keys`);
  }

  /**
   * Refreshes cache keys by revalidating
   */
  private async refreshCacheKeys(keys: string[]): Promise<void> {
    const promises: Promise<unknown>[] = [];

    keys.forEach((key) => {
      const swrKey = this.convertToSwrKey(key);
      if (swrKey) {
        promises.push(mutate(swrKey));
      }
    });

    await Promise.all(promises);
    console.log(
      `[RealTimeCacheIntegration] Refreshed ${keys.length} cache keys`,
    );
  }

  /**
   * Applies optimistic updates to cache
   */
  private async applyOptimisticUpdates(
    itemId: string,
    changes: ContentChange[],
  ): Promise<void> {
    // Get current cached item
    const cacheKey = `get_/content/items/${itemId}_{}`;
    const cachedItem = contentServiceCache.get<ContentItem>(cacheKey);

    if (!cachedItem) return;

    // Apply changes optimistically
    const updatedItem = this.applyChangesToItem(cachedItem, changes);

    // Update local cache
    contentServiceCache.set(cacheKey, updatedItem);

    // Update SWR cache
    const swrKey = this.convertToSwrKey(cacheKey);
    if (swrKey) {
      await mutate(swrKey, updatedItem, { revalidate: false });
    }

    console.log(
      `[RealTimeCacheIntegration] Applied optimistic updates to ${itemId}`,
    );
  }

  /**
   * Applies changes to a content item
   */
  private applyChangesToItem(
    item: ContentItem,
    changes: ContentChange[],
  ): ContentItem {
    const updatedItem = { ...item };

    changes.forEach((change) => {
      switch (change.operation) {
        case "update":
          this.setNestedProperty(updatedItem, change.field, change.newValue);
          break;

        case "insert":
          // Handle array insertions
          if (change.field.includes("[") && change.position !== undefined) {
            this.insertIntoArray(
              updatedItem,
              change.field,
              change.newValue,
              change.position,
            );
          }
          break;

        case "delete":
          // Handle deletions
          if (change.field.includes("[") && change.position !== undefined) {
            this.deleteFromArray(
              updatedItem,
              change.field,
              change.position,
              change.length,
            );
          } else {
            this.deleteProperty(updatedItem, change.field);
          }
          break;
      }
    });

    // Update metadata
    updatedItem.updatedAt = new Date();
    if (updatedItem.metadata) {
      updatedItem.metadata.version = this.incrementVersion(
        updatedItem.metadata.version || "1.0.0",
      );
    }

    return updatedItem;
  }

  /**
   * Sets a nested property on an object
   */
  private setNestedProperty(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && (!(key in current) || typeof current[key] !== "object")) {
        current[key] = {};
      }
      if (key) {
        current = current[key] as Record<string, unknown>;
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Inserts into an array at a specific position
   */
  private insertIntoArray(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
    position: number,
  ): void {
    const arrayPath = path.substring(0, path.indexOf("["));
    const array = this.getNestedProperty(obj, arrayPath);

    if (Array.isArray(array)) {
      array.splice(position, 0, value);
    }
  }

  /**
   * Deletes from an array at a specific position
   */
  private deleteFromArray(
    obj: Record<string, unknown>,
    path: string,
    position: number,
    length: number = 1,
  ): void {
    const arrayPath = path.substring(0, path.indexOf("["));
    const array = this.getNestedProperty(obj, arrayPath);

    if (Array.isArray(array)) {
      array.splice(position, length);
    }
  }

  /**
   * Deletes a property from an object
   */
  private deleteProperty(obj: Record<string, unknown>, path: string): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && !(key in current)) return;
      if (key) {
        current = current[key] as Record<string, unknown>;
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      delete current[lastKey];
    }
  }

  /**
   * Gets a nested property from an object
   */
  private getNestedProperty(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split(".").reduce((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * Increments a semantic version string
   */
  private incrementVersion(version: string): string {
    const parts = version.split(".");
    if (parts.length !== 3) return "1.0.1";

    const major = parseInt(parts[0] || "1", 10);
    const minor = parseInt(parts[1] || "0", 10);
    const patchNum = parseInt(parts[2] || "0", 10);

    if (isNaN(major) || isNaN(minor) || isNaN(patchNum)) return "1.0.1";

    return `${major}.${minor}.${patchNum + 1}`;
  }

  /**
   * Generates cache keys for a specific content item
   */
  private generateCacheKeysForItem(itemId: string): string[] {
    return [
      `get_/content/items/${itemId}_{}`,
      `get_/content/items/by-slug/*_{}`,
      `get_/content/items_*`,
      `get_/content/items/${itemId}/media_{}`,
      `get_/search_*`,
    ];
  }

  /**
   * Converts internal cache key to SWR key format
   */
  private convertToSwrKey(cacheKey: string): string | null {
    // Extract the URL and params from the cache key format
    const match = cacheKey.match(/^(get|post|put|patch|delete)_(.+)_(.+)$/);
    if (!match) return null;

    const [, method, url, paramsStr] = match;

    if (!method || !url || !paramsStr) return null;

    // For GET requests, use the URL as SWR key
    if (method === "get") {
      try {
        const params = JSON.parse(paramsStr);
        if (Object.keys(params).length === 0) {
          return url;
        } else {
          // Include params in the key
          return `${url}?${new URLSearchParams(params).toString()}`;
        }
      } catch {
        return url;
      }
    }

    return null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalCacheIntegration: RealTimeCacheIntegration | null = null;

/**
 * Gets or creates the global cache integration instance
 */
export function getRealTimeCacheIntegration(): RealTimeCacheIntegration {
  if (!globalCacheIntegration) {
    globalCacheIntegration = new RealTimeCacheIntegration();
  }
  return globalCacheIntegration;
}

/**
 * Initializes real-time cache integration
 */
export function initializeRealTimeCacheIntegration(): void {
  const integration = getRealTimeCacheIntegration();
  integration.initialize();
}

/**
 * Destroys the global cache integration instance
 */
export function destroyRealTimeCacheIntegration(): void {
  if (globalCacheIntegration) {
    globalCacheIntegration.destroy();
    globalCacheIntegration = null;
  }
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize in browser environment
if (typeof window !== "undefined") {
  // Initialize after a short delay to ensure WebSocket manager is ready
  setTimeout(() => {
    initializeRealTimeCacheIntegration();
  }, 1000);
}
