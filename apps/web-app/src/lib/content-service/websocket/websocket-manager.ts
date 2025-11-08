/**
 * WebSocket Manager for Content Service
 *
 * Manages WebSocket connections, integrates with cache invalidation,
 * handles conflict resolution, and provides real-time collaboration features.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { ContentWebSocketClient } from "./content-websocket-client";
import { contentServiceCache } from "../cache/content-service-cache";
import type {
  WebSocketManagerConfig,
  ContentChangeNotification,
  PresenceUpdate,
  CollaborationEvent,
  ConflictResolution,
  CacheInvalidationEvent,
  UserPresence,
  CollaborationSession,
  PresenceTracker,
  ContentChange,
} from "../../../types/websocket";
import type { ContentItem } from "../../../types/entities";

// ============================================================================
// Event Emitter for Manager Events
// ============================================================================

type ManagerEventMap = {
  cache_invalidated: (event: CacheInvalidationEvent) => void;
  conflict_resolved: (resolution: ConflictResolution) => void;
  presence_changed: (itemId: string, users: UserPresence[]) => void;
  collaboration_started: (session: CollaborationSession) => void;
  collaboration_ended: (sessionId: string) => void;
  connection_status_changed: (connected: boolean) => void;
};

// ============================================================================
// WebSocket Manager Class
// ============================================================================

export class WebSocketManager {
  private client: ContentWebSocketClient;
  private config: WebSocketManagerConfig;
  private eventHandlers: Partial<ManagerEventMap> = {};
  private presenceTrackers = new Map<string, PresenceTracker>();
  private collaborationSessions = new Map<string, CollaborationSession>();
  private activeSubscriptions = new Map<string, string[]>(); // itemId -> subscriptionIds
  private conflictQueue = new Map<string, ConflictResolution[]>();
  private isDestroyed = false;

  constructor(config?: Partial<WebSocketManagerConfig>) {
    this.config = {
      url: "",
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 10000,
      enableLogging: process.env.NODE_ENV === "development",
      enablePresence: true,
      enableCollaboration: true,
      enableCacheIntegration: true,
      enableConflictResolution: true,
      enablePresenceTracking: true,
      enableCollaborationFeatures: true,
      cacheConfig: {
        enableAutoInvalidation: true,
        enableOptimisticUpdates: true,
        conflictResolutionStrategy: "merge",
        maxConflictRetries: 3,
        invalidationDelay: 100,
      },
      ...config,
    };

    this.client = new ContentWebSocketClient(this.config);
    this.setupClientEventHandlers();
  }

  // ============================================================================
  // Client Event Handlers Setup
  // ============================================================================

  private setupClientEventHandlers(): void {
    this.client.on("connected", () => {
      this.log("WebSocket connected - manager ready");
      this.emit("connection_status_changed", true);
    });

    this.client.on("disconnected", (reason) => {
      this.log(`WebSocket disconnected: ${reason}`);
      this.emit("connection_status_changed", false);
    });

    this.client.on("error", (error) => {
      this.log(`WebSocket error: ${error.message}`);
    });

    this.client.on("content_changed", (notification) => {
      this.handleContentChanged(notification);
    });

    this.client.on("presence_updated", (update) => {
      this.handlePresenceUpdated(update);
    });

    this.client.on("collaboration_event", (event) => {
      this.handleCollaborationEvent(event);
    });
  }

  // ============================================================================
  // Content Change Handling with Cache Integration
  // ============================================================================

  /**
   * Handles content change notifications and cache invalidation
   * Requirements: 9.2, 9.4
   */
  private async handleContentChanged(
    notification: ContentChangeNotification,
  ): Promise<void> {
    this.log(
      `Content changed: ${notification.itemId} - ${notification.changeType}`,
    );

    if (this.config.enableCacheIntegration) {
      await this.invalidateContentCache(notification);
    }

    // Check for conflicts if optimistic updates are enabled
    if (this.config.cacheConfig?.enableOptimisticUpdates) {
      await this.checkForConflicts(notification);
    }
  }

  /**
   * Invalidates cache entries based on content changes
   * Requirements: 9.2, 9.4
   */
  private async invalidateContentCache(
    notification: ContentChangeNotification,
  ): Promise<void> {
    const cacheKeys: string[] = [];

    // Generate cache keys to invalidate based on change type
    switch (notification.changeType) {
      case "updated":
      case "status_changed":
        cacheKeys.push(
          `get_/content/items/${notification.itemId}_{}`,
          `get_/content/items/by-slug/*_{}`,
          `get_/content/items_*`, // Invalidate list queries
        );
        break;

      case "deleted":
      case "archived":
        cacheKeys.push(
          `get_/content/items/${notification.itemId}_{}`,
          `get_/content/items_*`,
          `get_/search_*`, // Invalidate search results
        );
        break;

      case "created":
      case "published":
      case "restored":
        cacheKeys.push(`get_/content/items_*`, `get_/search_*`);
        break;

      case "media_added":
      case "media_removed":
        cacheKeys.push(
          `get_/content/items/${notification.itemId}/media_{}`,
          `get_/content/items/${notification.itemId}_{}`,
        );
        break;
    }

    // Invalidate cache with delay to allow for consistency
    if (this.config.cacheConfig?.invalidationDelay) {
      setTimeout(() => {
        this.performCacheInvalidation(cacheKeys, notification);
      }, this.config.cacheConfig.invalidationDelay);
    } else {
      this.performCacheInvalidation(cacheKeys, notification);
    }
  }

  /**
   * Performs actual cache invalidation
   */
  private performCacheInvalidation(
    cacheKeys: string[],
    notification: ContentChangeNotification,
  ): void {
    let invalidatedCount = 0;

    cacheKeys.forEach((pattern) => {
      const count = contentServiceCache.invalidatePattern(pattern);
      invalidatedCount += count;
    });

    this.log(
      `Invalidated ${invalidatedCount} cache entries for ${notification.changeType}`,
    );

    // Emit cache invalidation event
    const event: CacheInvalidationEvent = {
      type: "invalidate",
      keys: cacheKeys,
      itemId: notification.itemId,
      timestamp: new Date(),
      source: "websocket",
    };

    this.emit("cache_invalidated", event);
  }

  // ============================================================================
  // Conflict Detection and Resolution
  // ============================================================================

  /**
   * Checks for conflicts between local and remote changes
   * Requirements: 9.4
   */
  private async checkForConflicts(
    notification: ContentChangeNotification,
  ): Promise<void> {
    if (!this.config.enableConflictResolution) return;

    // Get local version from cache if available
    const cacheKey = `get_/content/items/${notification.itemId}_{}`;
    const cachedItem = contentServiceCache.get<ContentItem>(cacheKey);

    if (!cachedItem) return;

    // Check if versions match
    if (cachedItem.metadata?.version && notification.version) {
      if (cachedItem.metadata.version !== notification.version) {
        await this.resolveVersionConflict(notification, cachedItem);
      }
    }

    // Check for concurrent edits
    const recentChanges = this.getRecentLocalChanges(notification.itemId);
    if (recentChanges.length > 0) {
      await this.resolveConcurrentEditConflict(notification, recentChanges);
    }
  }

  /**
   * Resolves version conflicts
   */
  private async resolveVersionConflict(
    notification: ContentChangeNotification,
    localItem: ContentItem,
  ): Promise<void> {
    const conflict: ConflictResolution = {
      conflictId: `version_${notification.itemId}_${Date.now()}`,
      itemId: notification.itemId,
      conflictType: "version_mismatch",
      localChanges: [],
      remoteChanges: notification.changes,
      resolution:
        this.config.cacheConfig?.conflictResolutionStrategy || "merge",
      resolvedChanges: [],
      timestamp: new Date(),
    };

    console.log("Resolving version conflict for local item:", localItem.id);
    await this.processConflictResolution(conflict);
  }

  /**
   * Resolves concurrent edit conflicts
   */
  private async resolveConcurrentEditConflict(
    notification: ContentChangeNotification,
    localChanges: ContentChange[],
  ): Promise<void> {
    const conflict: ConflictResolution = {
      conflictId: `concurrent_${notification.itemId}_${Date.now()}`,
      itemId: notification.itemId,
      conflictType: "concurrent_edit",
      localChanges,
      remoteChanges: notification.changes,
      resolution:
        this.config.cacheConfig?.conflictResolutionStrategy || "merge",
      resolvedChanges: [],
      timestamp: new Date(),
    };

    await this.processConflictResolution(conflict);
  }

  /**
   * Processes conflict resolution
   */
  private async processConflictResolution(
    conflict: ConflictResolution,
  ): Promise<void> {
    // Add to conflict queue
    const conflicts = this.conflictQueue.get(conflict.itemId) || [];
    conflicts.push(conflict);
    this.conflictQueue.set(conflict.itemId, conflicts);

    // Apply resolution strategy
    switch (conflict.resolution) {
      case "local_wins":
        // Keep local changes, ignore remote
        conflict.resolvedChanges = conflict.localChanges;
        break;

      case "remote_wins":
        // Accept remote changes, discard local
        conflict.resolvedChanges = conflict.remoteChanges;
        break;

      case "merge":
        // Attempt to merge changes
        conflict.resolvedChanges = this.mergeChanges(
          conflict.localChanges,
          conflict.remoteChanges,
        );
        break;

      case "manual":
        // Require manual resolution
        this.log(`Manual conflict resolution required for ${conflict.itemId}`);
        break;
    }

    this.emit("conflict_resolved", conflict);
  }

  /**
   * Merges local and remote changes
   */
  private mergeChanges(
    localChanges: ContentChange[],
    remoteChanges: ContentChange[],
  ): ContentChange[] {
    // Simple merge strategy - this would be more sophisticated in practice
    const merged = [...localChanges];

    remoteChanges.forEach((remoteChange) => {
      const conflictingLocal = localChanges.find(
        (local) => local.field === remoteChange.field,
      );

      if (!conflictingLocal) {
        merged.push(remoteChange);
      } else {
        // For conflicting fields, prefer remote changes (last write wins)
        const index = merged.indexOf(conflictingLocal);
        merged[index] = remoteChange;
      }
    });

    return merged;
  }

  /**
   * Gets recent local changes for an item (placeholder)
   */
  private getRecentLocalChanges(itemId: string): ContentChange[] {
    // This would track local changes made in the last few minutes
    // For now, return empty array
    console.log("Getting recent local changes for item:", itemId);
    return [];
  }

  // ============================================================================
  // Presence Management
  // ============================================================================

  /**
   * Handles presence updates
   * Requirements: 9.3
   */
  private handlePresenceUpdated(update: PresenceUpdate): void {
    if (!this.config.enablePresenceTracking) return;

    const tracker = this.getOrCreatePresenceTracker(update.itemId);

    // Update user presence
    tracker.activeUsers.set(update.userId, update);
    tracker.lastUpdate = new Date();

    // Clean up offline users
    this.cleanupOfflineUsers(tracker);

    // Convert to UserPresence format
    const activeUsers: UserPresence[] = Array.from(
      tracker.activeUsers.values(),
    ).map((presence) => ({
      userId: presence.userId,
      displayName: presence.userId, // Would come from user service
      status: presence.status,
      lastSeen: presence.timestamp,
      ...(presence.metadata?.cursorPosition && {
        currentPosition: presence.metadata.cursorPosition,
      }),
      ...(presence.metadata?.selection && {
        currentSelection: presence.metadata.selection,
      }),
    }));

    this.log(
      `Presence updated for ${update.itemId}: ${activeUsers.length} active users`,
    );
    this.emit("presence_changed", update.itemId, activeUsers);
  }

  /**
   * Gets or creates a presence tracker for an item
   */
  private getOrCreatePresenceTracker(itemId: string): PresenceTracker {
    let tracker = this.presenceTrackers.get(itemId);

    if (!tracker) {
      tracker = {
        itemId,
        activeUsers: new Map(),
        lastUpdate: new Date(),
        maxUsers: 50, // Configurable limit
      };
      this.presenceTrackers.set(itemId, tracker);
    }

    return tracker;
  }

  /**
   * Cleans up offline users from presence tracker
   */
  private cleanupOfflineUsers(tracker: PresenceTracker): void {
    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, presence] of tracker.activeUsers.entries()) {
      if (
        presence.status === "offline" ||
        now - presence.timestamp.getTime() > offlineThreshold
      ) {
        tracker.activeUsers.delete(userId);
      }
    }
  }

  // ============================================================================
  // Collaboration Features
  // ============================================================================

  /**
   * Handles collaboration events
   * Requirements: 9.3
   */
  private handleCollaborationEvent(event: CollaborationEvent): void {
    if (!this.config.enableCollaborationFeatures) return;

    const session = this.getOrCreateCollaborationSession(event.itemId);

    // Add event to session history
    session.events.push(event);
    session.lastActivity = new Date();

    // Handle specific event types
    switch (event.type) {
      case "user_joined":
        this.handleUserJoined(session, event);
        break;

      case "user_left":
        this.handleUserLeft(session, event);
        break;

      case "cursor_move":
      case "text_selection":
        this.handleCursorOrSelection(session, event);
        break;

      case "lock_acquired":
      case "lock_released":
        this.handleLockEvent(session, event);
        break;
    }

    this.log(`Collaboration event: ${event.type} in ${event.itemId}`);
  }

  /**
   * Gets or creates a collaboration session
   */
  private getOrCreateCollaborationSession(
    itemId: string,
  ): CollaborationSession {
    let session = this.collaborationSessions.get(itemId);

    if (!session) {
      session = {
        id: `session_${itemId}_${Date.now()}`,
        itemId,
        participants: new Map(),
        startedAt: new Date(),
        lastActivity: new Date(),
        locks: new Map(),
        events: [],
      };
      this.collaborationSessions.set(itemId, session);
      this.emit("collaboration_started", session);
    }

    return session;
  }

  /**
   * Handles user joined event
   */
  private handleUserJoined(
    session: CollaborationSession,
    event: CollaborationEvent,
  ): void {
    const userPresence: UserPresence = {
      userId: event.userId,
      displayName: event.userId, // Would come from user service
      status: "active",
      lastSeen: event.timestamp,
    };

    session.participants.set(event.userId, userPresence);
  }

  /**
   * Handles user left event
   */
  private handleUserLeft(
    session: CollaborationSession,
    event: CollaborationEvent,
  ): void {
    session.participants.delete(event.userId);

    // Clean up session if no participants
    if (session.participants.size === 0) {
      this.collaborationSessions.delete(session.itemId);
      this.emit("collaboration_ended", session.id);
    }
  }

  /**
   * Handles cursor movement and text selection
   */
  private handleCursorOrSelection(
    session: CollaborationSession,
    event: CollaborationEvent,
  ): void {
    const participant = session.participants.get(event.userId);
    if (participant) {
      if (event.type === "cursor_move" && event.data.position) {
        participant.currentPosition = event.data.position;
      } else if (event.type === "text_selection" && event.data.selection) {
        participant.currentSelection = event.data.selection;
      }
      participant.lastSeen = event.timestamp;
    }
  }

  /**
   * Handles lock acquisition and release
   */
  private handleLockEvent(
    session: CollaborationSession,
    event: CollaborationEvent,
  ): void {
    if (event.data.lock) {
      if (event.type === "lock_acquired") {
        session.locks.set(event.data.lock.section, event.data.lock);
      } else if (event.type === "lock_released") {
        session.locks.delete(event.data.lock.section);
      }
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Connects to WebSocket
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("WebSocket manager has been destroyed");
    }
    await this.client.connect();
  }

  /**
   * Disconnects from WebSocket
   */
  disconnect(): void {
    this.client.disconnect();
  }

  /**
   * Subscribes to real-time updates for a content item
   * Requirements: 9.1, 9.2, 9.3
   */
  subscribeToItem(
    itemId: string,
    options?: {
      includePresence?: boolean;
      includeCollaboration?: boolean;
    },
  ): string[] {
    const subscriptionIds: string[] = [];

    // Always subscribe to content changes
    const contentSub = this.client.subscribeToContentChanges(itemId);
    subscriptionIds.push(contentSub);

    // Subscribe to presence if enabled
    if (options?.includePresence !== false && this.config.enablePresence) {
      const presenceSub = this.client.subscribeToPresence(itemId);
      subscriptionIds.push(presenceSub);
    }

    // Subscribe to collaboration if enabled
    if (
      options?.includeCollaboration !== false &&
      this.config.enableCollaboration
    ) {
      const collaborationSub = this.client.subscribeToCollaboration(itemId);
      subscriptionIds.push(collaborationSub);
    }

    // Track subscriptions for this item
    this.activeSubscriptions.set(itemId, subscriptionIds);

    this.log(
      `Subscribed to ${itemId} with ${subscriptionIds.length} subscriptions`,
    );
    return subscriptionIds;
  }

  /**
   * Unsubscribes from all updates for a content item
   */
  unsubscribeFromItem(itemId: string): void {
    const subscriptionIds = this.activeSubscriptions.get(itemId);
    if (subscriptionIds) {
      subscriptionIds.forEach((id) => this.client.unsubscribe(id));
      this.activeSubscriptions.delete(itemId);

      // Clean up presence tracker
      this.presenceTrackers.delete(itemId);

      // Clean up collaboration session
      this.collaborationSessions.delete(itemId);

      this.log(`Unsubscribed from ${itemId}`);
    }
  }

  /**
   * Updates user presence for an item
   * Requirements: 9.3
   */
  updatePresence(itemId: string, status: "active" | "idle" | "away"): void {
    this.client.updatePresence(itemId, status);
  }

  /**
   * Sends cursor position for collaboration
   * Requirements: 9.3
   */
  sendCursorPosition(
    itemId: string,
    position: { line: number; column: number },
  ): void {
    this.client.sendCursorPosition(itemId, position);
  }

  /**
   * Sends text selection for collaboration
   * Requirements: 9.3
   */
  sendTextSelection(
    itemId: string,
    selection: { start: number; end: number; text: string },
  ): void {
    this.client.sendTextSelection(itemId, selection);
  }

  /**
   * Gets active users for an item
   */
  getActiveUsers(itemId: string): UserPresence[] {
    const tracker = this.presenceTrackers.get(itemId);
    if (!tracker) return [];

    return Array.from(tracker.activeUsers.values()).map((presence) => ({
      userId: presence.userId,
      displayName: presence.userId,
      status: presence.status,
      lastSeen: presence.timestamp,
      ...(presence.metadata?.cursorPosition && {
        currentPosition: presence.metadata.cursorPosition,
      }),
      ...(presence.metadata?.selection && {
        currentSelection: presence.metadata.selection,
      }),
    }));
  }

  /**
   * Gets collaboration session for an item
   */
  getCollaborationSession(itemId: string): CollaborationSession | undefined {
    return this.collaborationSessions.get(itemId);
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats() {
    return this.client.getConnectionStats();
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  /**
   * Registers event handler
   */
  on<K extends keyof ManagerEventMap>(
    event: K,
    handler: ManagerEventMap[K],
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Removes event handler
   */
  off<K extends keyof ManagerEventMap>(event: K): void {
    delete this.eventHandlers[event];
  }

  /**
   * Emits event to registered handlers
   */
  private emit<K extends keyof ManagerEventMap>(
    event: K,
    ...args: Parameters<ManagerEventMap[K]>
  ): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      try {
        // @ts-expect-error - TypeScript can't infer the correct handler type
        handler(...args);
      } catch (error) {
        this.log(`Error in event handler for ${event}: ${error}`);
      }
    }
  }

  // ============================================================================
  // Cleanup and Destruction
  // ============================================================================

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    this.isDestroyed = true;

    // Disconnect client
    this.client.destroy();

    // Clear all data structures
    this.presenceTrackers.clear();
    this.collaborationSessions.clear();
    this.activeSubscriptions.clear();
    this.conflictQueue.clear();
    this.eventHandlers = {};

    this.log("WebSocket manager destroyed");
  }

  /**
   * Logs messages if logging is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocketManager] ${message}`, data || "");
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new WebSocketManager instance
 */
export function createWebSocketManager(
  config?: Partial<WebSocketManagerConfig>,
): WebSocketManager {
  return new WebSocketManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalWebSocketManager: WebSocketManager | null = null;

/**
 * Gets or creates the global WebSocket manager instance
 */
export function getWebSocketManager(
  config?: Partial<WebSocketManagerConfig>,
): WebSocketManager {
  if (!globalWebSocketManager) {
    globalWebSocketManager = createWebSocketManager(config);
  }
  return globalWebSocketManager;
}

/**
 * Destroys the global WebSocket manager instance
 */
export function destroyWebSocketManager(): void {
  if (globalWebSocketManager) {
    globalWebSocketManager.destroy();
    globalWebSocketManager = null;
  }
}
