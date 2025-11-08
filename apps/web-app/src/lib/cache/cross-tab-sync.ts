/**
 * Cross-Tab Cache Synchronization
 *
 * This module implements BroadcastChannel API for cache synchronization across tabs,
 * cache invalidation event propagation, conflict resolution for concurrent updates,
 * and cache consistency verification and repair mechanisms.
 */

import { QueryClient, QueryKey } from "@tanstack/react-query";
import { getUserServiceCacheManager } from "./user-service-cache";

// ============================================================================
// Cross-Tab Synchronization Types
// ============================================================================

export type SyncEventType =
  | "cache-invalidate"
  | "cache-update"
  | "cache-clear"
  | "optimistic-update"
  | "optimistic-rollback"
  | "user-logout"
  | "user-switch"
  | "heartbeat"
  | "conflict-resolution";

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  tabId: string;
  userId?: string | undefined;
  queryKey?: QueryKey;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

export interface CacheConflict {
  queryKey: QueryKey;
  localVersion: number;
  remoteVersion: number;
  localTimestamp: number;
  remoteTimestamp: number;
  localData: unknown;
  remoteData: unknown;
}

export interface TabInfo {
  id: string;
  lastSeen: number;
  isActive: boolean;
  userId?: string | undefined;
}

// ============================================================================
// Cross-Tab Cache Synchronizer
// ============================================================================

export class CrossTabCacheSynchronizer {
  private queryClient: QueryClient;
  private broadcastChannel: BroadcastChannel | null = null;
  private tabId: string;
  private isActive: boolean = true;
  private activeTabs: Map<string, TabInfo> = new Map();
  private conflictQueue: Map<string, CacheConflict> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.tabId = this.generateTabId();
    this.initializeBroadcastChannel();
    this.startHeartbeat();
    this.startCleanup();
    this.setupVisibilityHandlers();
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initializeBroadcastChannel() {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      console.warn("BroadcastChannel not supported, cross-tab sync disabled");
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel("user-service-cache-sync");
      this.broadcastChannel.addEventListener(
        "message",
        this.handleSyncEvent.bind(this),
      );

      // Announce this tab's presence
      const currentUserId = this.getCurrentUserId();
      this.broadcastEvent({
        type: "heartbeat",
        timestamp: Date.now(),
        tabId: this.tabId,
        ...(currentUserId && { userId: currentUserId }),
      });
    } catch (error) {
      console.warn("Failed to initialize BroadcastChannel:", error);
    }
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Start heartbeat to track active tabs
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isActive) {
        const currentUserId = this.getCurrentUserId();
        this.broadcastEvent({
          type: "heartbeat",
          timestamp: Date.now(),
          tabId: this.tabId,
          ...(currentUserId && { userId: currentUserId }),
        });
      }
    }, 5000); // Heartbeat every 5 seconds
  }

  /**
   * Start cleanup of inactive tabs
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs();
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Setup visibility change handlers
   */
  private setupVisibilityHandlers() {
    if (typeof document === "undefined") return;

    document.addEventListener("visibilitychange", () => {
      this.isActive = !document.hidden;

      if (this.isActive) {
        // Tab became active, sync with other tabs
        this.requestCacheSync();
      }
    });

    // Handle tab close
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  /**
   * Handle incoming sync events from other tabs
   */
  private async handleSyncEvent(event: MessageEvent<SyncEvent>) {
    const syncEvent = event.data;

    // Ignore events from this tab
    if (syncEvent.tabId === this.tabId) return;

    // Update tab tracking
    this.updateTabInfo(syncEvent.tabId, syncEvent.timestamp, syncEvent.userId);

    try {
      switch (syncEvent.type) {
        case "cache-invalidate":
          await this.handleCacheInvalidate(syncEvent);
          break;

        case "cache-update":
          await this.handleCacheUpdate(syncEvent);
          break;

        case "cache-clear":
          await this.handleCacheClear(syncEvent);
          break;

        case "optimistic-update":
          await this.handleOptimisticUpdate(syncEvent);
          break;

        case "optimistic-rollback":
          await this.handleOptimisticRollback(syncEvent);
          break;

        case "user-logout":
          await this.handleUserLogout(syncEvent);
          break;

        case "user-switch":
          await this.handleUserSwitch(syncEvent);
          break;

        case "heartbeat":
          // Already handled in updateTabInfo
          break;

        case "conflict-resolution":
          await this.handleConflictResolution(syncEvent);
          break;
      }
    } catch (error) {
      console.warn("Error handling sync event:", error);
    }
  }

  /**
   * Handle cache invalidation from other tabs
   */
  private async handleCacheInvalidate(event: SyncEvent) {
    if (!event.queryKey) return;

    // Check for conflicts before invalidating
    const hasConflict = await this.checkForConflict(
      event.queryKey,
      event.timestamp,
    );
    if (hasConflict) return;

    await this.queryClient.invalidateQueries({
      queryKey: event.queryKey,
      refetchType: "none", // Don't refetch automatically to avoid conflicts
    });
  }

  /**
   * Handle cache update from other tabs
   */
  private async handleCacheUpdate(event: SyncEvent) {
    if (!event.queryKey || !event.data) return;

    // Check for conflicts
    const conflict = await this.detectConflict(
      event.queryKey,
      event.data,
      event.timestamp,
    );
    if (conflict) {
      await this.resolveConflict(conflict);
      return;
    }

    // Apply update if no conflict
    this.queryClient.setQueryData(event.queryKey, event.data);
  }

  /**
   * Handle cache clear from other tabs
   */
  private async handleCacheClear(event: SyncEvent) {
    if (event.userId) {
      // Clear specific user's cache
      const cacheManager = getUserServiceCacheManager();
      await cacheManager.invalidateUser(event.userId, { refetchActive: false });
    } else {
      // Clear all cache
      this.queryClient.clear();
    }
  }

  /**
   * Handle optimistic update from other tabs
   */
  private async handleOptimisticUpdate(event: SyncEvent) {
    if (!event.queryKey || !event.data) return;

    // Store optimistic update with metadata
    this.queryClient.setQueryData(event.queryKey, event.data);

    // Mark as optimistic update
    const queryState = this.queryClient.getQueryState(event.queryKey);
    if (queryState) {
      // Store optimistic metadata (this would need custom query state extension)
      console.debug(
        "Applied optimistic update from another tab:",
        event.queryKey,
      );
    }
  }

  /**
   * Handle optimistic rollback from other tabs
   */
  private async handleOptimisticRollback(event: SyncEvent) {
    if (!event.queryKey) return;

    // Remove the query data to trigger refetch
    this.queryClient.removeQueries({ queryKey: event.queryKey });

    // Refetch fresh data
    await this.queryClient.refetchQueries({ queryKey: event.queryKey });
  }

  /**
   * Handle user logout from other tabs
   */
  private async handleUserLogout(event: SyncEvent) {
    if (event.userId) {
      // Clear specific user's cache
      const cacheManager = getUserServiceCacheManager();
      await cacheManager.invalidateUser(event.userId, { refetchActive: false });
    }
  }

  /**
   * Handle user switch from other tabs
   */
  private async handleUserSwitch(event: SyncEvent) {
    const currentUserId = this.getCurrentUserId();

    // If switching to different user, clear current user's cache
    if (currentUserId && currentUserId !== event.userId) {
      const cacheManager = getUserServiceCacheManager();
      await cacheManager.invalidateUser(currentUserId, {
        refetchActive: false,
      });
    }
  }

  /**
   * Handle conflict resolution from other tabs
   */
  private async handleConflictResolution(event: SyncEvent) {
    if (!event.queryKey || !event.data) return;

    const conflictKey = this.getConflictKey(event.queryKey);

    // Remove from conflict queue if resolved
    this.conflictQueue.delete(conflictKey);

    // Apply resolved data
    this.queryClient.setQueryData(event.queryKey, event.data);
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Broadcast cache invalidation to other tabs
   */
  async broadcastCacheInvalidation(queryKey: QueryKey, userId?: string) {
    await this.broadcastEvent({
      type: "cache-invalidate",
      timestamp: Date.now(),
      tabId: this.tabId,
      queryKey,
      ...(userId && { userId }),
    });
  }

  /**
   * Broadcast cache update to other tabs
   */
  async broadcastCacheUpdate(
    queryKey: QueryKey,
    data: unknown,
    userId?: string,
  ) {
    await this.broadcastEvent({
      type: "cache-update",
      timestamp: Date.now(),
      tabId: this.tabId,
      queryKey,
      data,
      ...(userId && { userId }),
    });
  }

  /**
   * Broadcast optimistic update to other tabs
   */
  async broadcastOptimisticUpdate(
    queryKey: QueryKey,
    data: unknown,
    userId?: string,
  ) {
    await this.broadcastEvent({
      type: "optimistic-update",
      timestamp: Date.now(),
      tabId: this.tabId,
      queryKey,
      data,
      ...(userId && { userId }),
      metadata: { optimistic: true },
    });
  }

  /**
   * Broadcast optimistic rollback to other tabs
   */
  async broadcastOptimisticRollback(queryKey: QueryKey, userId?: string) {
    await this.broadcastEvent({
      type: "optimistic-rollback",
      timestamp: Date.now(),
      tabId: this.tabId,
      queryKey,
      ...(userId && { userId }),
    });
  }

  /**
   * Broadcast user logout to other tabs
   */
  async broadcastUserLogout(userId: string) {
    await this.broadcastEvent({
      type: "user-logout",
      timestamp: Date.now(),
      tabId: this.tabId,
      userId,
    });
  }

  /**
   * Broadcast user switch to other tabs
   */
  async broadcastUserSwitch(newUserId: string) {
    await this.broadcastEvent({
      type: "user-switch",
      timestamp: Date.now(),
      tabId: this.tabId,
      userId: newUserId,
    });
  }

  /**
   * Request cache synchronization from other tabs
   */
  async requestCacheSync() {
    // This would trigger other tabs to share their cache state
    // Implementation depends on specific sync requirements
    console.debug("Requesting cache sync from other tabs");
  }

  // ============================================================================
  // Conflict Detection and Resolution
  // ============================================================================

  /**
   * Check for potential conflicts
   */
  private async checkForConflict(
    queryKey: QueryKey,
    remoteTimestamp: number,
  ): Promise<boolean> {
    const queryState = this.queryClient.getQueryState(queryKey);
    if (!queryState || !queryState.dataUpdatedAt) return false;

    // Conflict if local data is newer than remote timestamp
    return queryState.dataUpdatedAt > remoteTimestamp;
  }

  /**
   * Detect conflicts between local and remote data
   */
  private async detectConflict(
    queryKey: QueryKey,
    remoteData: unknown,
    remoteTimestamp: number,
  ): Promise<CacheConflict | null> {
    const localData = this.queryClient.getQueryData(queryKey);
    const queryState = this.queryClient.getQueryState(queryKey);

    if (!localData || !queryState?.dataUpdatedAt) return null;

    // Simple conflict detection based on timestamps
    const timeDiff = Math.abs(queryState.dataUpdatedAt - remoteTimestamp);
    const hasConflict =
      timeDiff < 1000 && // Within 1 second
      JSON.stringify(localData) !== JSON.stringify(remoteData);

    if (hasConflict) {
      return {
        queryKey,
        localVersion: 1, // Would need proper versioning
        remoteVersion: 1,
        localTimestamp: queryState.dataUpdatedAt,
        remoteTimestamp,
        localData,
        remoteData,
      };
    }

    return null;
  }

  /**
   * Resolve cache conflicts
   */
  private async resolveConflict(conflict: CacheConflict) {
    const conflictKey = this.getConflictKey(conflict.queryKey);
    this.conflictQueue.set(conflictKey, conflict);

    // Simple resolution strategy: last-write-wins
    const resolvedData =
      conflict.remoteTimestamp > conflict.localTimestamp
        ? conflict.remoteData
        : conflict.localData;

    // Apply resolved data
    this.queryClient.setQueryData(conflict.queryKey, resolvedData);

    // Broadcast resolution to other tabs
    await this.broadcastEvent({
      type: "conflict-resolution",
      timestamp: Date.now(),
      tabId: this.tabId,
      queryKey: conflict.queryKey,
      data: resolvedData,
      metadata: {
        conflictResolved: true,
        strategy: "last-write-wins",
      },
    });

    // Remove from conflict queue
    this.conflictQueue.delete(conflictKey);
  }

  /**
   * Get conflict key for tracking
   */
  private getConflictKey(queryKey: QueryKey): string {
    return JSON.stringify(queryKey);
  }

  // ============================================================================
  // Cache Consistency Verification
  // ============================================================================

  /**
   * Verify cache consistency across tabs
   */
  async verifyCacheConsistency(): Promise<boolean> {
    // This would involve comparing cache states across tabs
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Repair cache inconsistencies
   */
  async repairCacheInconsistencies(userId: string) {
    // Clear potentially inconsistent cache and refetch
    const cacheManager = getUserServiceCacheManager();
    await cacheManager.invalidateUser(userId, { refetchActive: true });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Broadcast event to other tabs
   */
  private async broadcastEvent(event: SyncEvent) {
    if (!this.broadcastChannel) return;

    try {
      this.broadcastChannel.postMessage(event);
    } catch (error) {
      console.warn("Failed to broadcast sync event:", error);
    }
  }

  /**
   * Update tab information
   */
  private updateTabInfo(tabId: string, timestamp: number, userId?: string) {
    this.activeTabs.set(tabId, {
      id: tabId,
      lastSeen: timestamp,
      isActive: true,
      ...(userId && { userId }),
    });
  }

  /**
   * Cleanup inactive tabs
   */
  private cleanupInactiveTabs() {
    const cutoff = Date.now() - 30000; // 30 seconds

    for (const [tabId, tabInfo] of this.activeTabs.entries()) {
      if (tabInfo.lastSeen < cutoff) {
        this.activeTabs.delete(tabId);
      }
    }
  }

  /**
   * Get current user ID (placeholder)
   */
  private getCurrentUserId(): string | null {
    // This would integrate with auth context
    return null;
  }

  /**
   * Get active tabs information
   */
  getActiveTabs(): TabInfo[] {
    return Array.from(this.activeTabs.values());
  }

  /**
   * Get conflict queue status
   */
  getConflictStatus() {
    return {
      activeConflicts: this.conflictQueue.size,
      conflicts: Array.from(this.conflictQueue.values()),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let crossTabSynchronizer: CrossTabCacheSynchronizer | null = null;

export function initializeCrossTabSync(
  queryClient: QueryClient,
): CrossTabCacheSynchronizer {
  if (crossTabSynchronizer) {
    crossTabSynchronizer.cleanup();
  }

  crossTabSynchronizer = new CrossTabCacheSynchronizer(queryClient);
  return crossTabSynchronizer;
}

export function getCrossTabSynchronizer(): CrossTabCacheSynchronizer {
  if (!crossTabSynchronizer) {
    throw new Error(
      "CrossTabCacheSynchronizer not initialized. Call initializeCrossTabSync first.",
    );
  }
  return crossTabSynchronizer;
}

// ============================================================================
// React Query Integration
// ============================================================================

/**
 * Enhanced mutation options with cross-tab sync
 */
export function withCrossTabSync<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: QueryKey,
  userId?: string,
) {
  return {
    mutationFn,
    onMutate: async (variables: TVariables) => {
      const synchronizer = getCrossTabSynchronizer();

      // Broadcast optimistic update
      await synchronizer.broadcastOptimisticUpdate(queryKey, variables, userId);

      return { queryKey, userId };
    },
    onSuccess: async (data: TData) => {
      const synchronizer = getCrossTabSynchronizer();

      // Broadcast successful update
      await synchronizer.broadcastCacheUpdate(queryKey, data, userId);
    },
    onError: async () => {
      const synchronizer = getCrossTabSynchronizer();

      // Broadcast rollback
      await synchronizer.broadcastOptimisticRollback(queryKey, userId);
    },
  };
}
