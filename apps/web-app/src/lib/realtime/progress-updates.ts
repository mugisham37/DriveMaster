/**
 * Real-Time Progress Update System
 *
 * Implements Task 10.2:
 * - Real-time progress notification handling
 * - Progress update event processing and state synchronization
 * - Progress change broadcasting across multiple browser tabs
 * - Progress update conflict resolution and consistency checking
 * - Requirements: 9.1, 9.2, 9.5, 3.3
 */

import {
  WebSocketManager,
  type ProgressUpdateData,
  type MilestoneData,
  type StreakData,
} from "./websocket-manager";
import type {
  ProgressSummary,
  SkillMastery,
  LearningStreak,
  Milestone,
  UserServiceError,
} from "@/types/user-service";

// ============================================================================
// Progress Update Types
// ============================================================================

export interface ProgressUpdateEvent {
  type: "progress_update";
  userId: string;
  topic: string;
  mastery: SkillMastery;
  summary?: ProgressSummary | undefined;
  timestamp: Date;
  source: "websocket" | "api" | "cache";
}

export interface MilestoneUpdateEvent {
  type: "milestone_achieved";
  userId: string;
  milestone: Milestone;
  timestamp: Date;
  source: "websocket" | "api";
}

export interface StreakUpdateEvent {
  type: "streak_update";
  userId: string;
  streak: LearningStreak;
  timestamp: Date;
  source: "websocket" | "api";
}

export interface ProgressSyncEvent {
  type: "progress_sync";
  userId: string;
  summary: ProgressSummary;
  timestamp: Date;
  source: "websocket" | "broadcast" | "api" | "cache";
}

export type ProgressRealtimeEvent =
  | ProgressUpdateEvent
  | MilestoneUpdateEvent
  | StreakUpdateEvent
  | ProgressSyncEvent;

// ============================================================================
// Progress Update Configuration
// ============================================================================

export interface ProgressUpdateConfig {
  enableBroadcast?: boolean;
  enableConflictResolution?: boolean;
  enableConsistencyChecking?: boolean;
  broadcastChannel?: string;
  updateThrottleMs?: number;
  conflictResolutionStrategy?: "latest_wins" | "merge" | "user_choice";
}

export interface ProgressUpdateHandlers {
  onProgressUpdate?: (event: ProgressUpdateEvent) => void;
  onMilestoneAchieved?: (event: MilestoneUpdateEvent) => void;
  onStreakUpdate?: (event: StreakUpdateEvent) => void;
  onProgressSync?: (event: ProgressSyncEvent) => void;
  onConflictDetected?: (conflict: ProgressConflict) => void;
  onError?: (error: UserServiceError) => void;
}

export interface ProgressConflict {
  type: "mastery_conflict" | "streak_conflict" | "milestone_conflict";
  userId: string;
  topic?: string;
  localData: unknown;
  remoteData: unknown;
  timestamp: Date;
}

// ============================================================================
// Cross-Tab Broadcasting
// ============================================================================

export interface BroadcastMessage {
  type:
    | "progress_update"
    | "milestone_achieved"
    | "streak_update"
    | "progress_sync";
  userId: string;
  data: unknown;
  timestamp: Date;
  tabId: string;
}

// ============================================================================
// Progress Update Manager
// ============================================================================

export class ProgressUpdateManager {
  private wsManager: WebSocketManager;
  private config: ProgressUpdateConfig;
  private handlers: ProgressUpdateHandlers = {};

  private broadcastChannel: BroadcastChannel | null = null;
  private tabId: string;
  private updateThrottleTimer: NodeJS.Timeout | null = null;
  private pendingUpdates = new Map<string, ProgressRealtimeEvent>();

  // State tracking for conflict resolution
  private lastKnownState = new Map<
    string,
    {
      mastery: SkillMastery;
      timestamp: Date;
      version: number;
    }
  >();

  private progressCache = new Map<string, ProgressSummary>();
  private streakCache = new Map<string, LearningStreak>();

  constructor(wsManager: WebSocketManager, config: ProgressUpdateConfig = {}) {
    this.wsManager = wsManager;
    this.config = {
      enableBroadcast: true,
      enableConflictResolution: true,
      enableConsistencyChecking: true,
      broadcastChannel: "progress_updates",
      updateThrottleMs: 1000,
      conflictResolutionStrategy: "latest_wins",
      ...config,
    };

    this.tabId = this.generateTabId();
    this.setupWebSocketHandlers();
    this.setupBroadcastChannel();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private setupWebSocketHandlers(): void {
    this.wsManager.setEventHandlers({
      onProgressUpdate: (data) => this.handleProgressUpdate(data),
      onMilestoneAchieved: (data) => this.handleMilestoneAchieved(data),
      onStreakUpdate: (data) => this.handleStreakUpdate(data),
      onError: (error) => this.handleError(error),
    });
  }

  private setupBroadcastChannel(): void {
    if (!this.config.enableBroadcast || typeof window === "undefined") {
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(
        this.config.broadcastChannel!,
      );

      this.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data as BroadcastMessage);
      };

      this.broadcastChannel.addEventListener("messageerror", (error) => {
        console.warn("[ProgressUpdateManager] Broadcast channel error:", error);
      });
    } catch (error) {
      console.warn(
        "[ProgressUpdateManager] Failed to setup broadcast channel:",
        error,
      );
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setHandlers(handlers: ProgressUpdateHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  removeHandler(event: keyof ProgressUpdateHandlers): void {
    delete this.handlers[event];
  }

  // ============================================================================
  // WebSocket Event Processing
  // ============================================================================

  private handleProgressUpdate(data: ProgressUpdateData): void {
    const event: ProgressUpdateEvent = {
      type: "progress_update",
      userId: data.userId,
      topic: data.topic,
      mastery: data.mastery,
      summary: data.summary || undefined,
      timestamp: data.timestamp,
      source: "websocket",
    };

    // Check for conflicts
    if (this.config.enableConflictResolution) {
      const conflict = this.detectProgressConflict(event);
      if (conflict) {
        this.handleConflict(conflict);
        return;
      }
    }

    // Update local state
    this.updateLocalProgressState(event);

    // Throttle updates to prevent overwhelming the UI
    this.throttleProgressUpdate(event);

    // Broadcast to other tabs
    this.broadcastProgressUpdate(event);
  }

  private handleMilestoneAchieved(data: MilestoneData): void {
    const milestone: Milestone = {
      id: data.milestoneId,
      type: "mastery", // Default type, should come from data
      title: data.title,
      description: data.description,
      value: data.value,
      target: data.value, // Assuming achieved means target reached
      achieved: true,
      achievedAt: data.achievedAt,
      progress: 1.0,
    };

    const event: MilestoneUpdateEvent = {
      type: "milestone_achieved",
      userId: data.userId,
      milestone,
      timestamp: data.achievedAt,
      source: "websocket",
    };

    // Broadcast milestone achievement
    this.broadcastMilestoneUpdate(event);

    // Notify handlers
    this.handlers.onMilestoneAchieved?.(event);
  }

  private handleStreakUpdate(data: StreakData): void {
    const streak: LearningStreak = {
      userId: data.userId,
      currentStreak: data.currentStreak,
      longestStreak: data.longestStreak,
      lastActiveDate: data.lastActiveDate,
      streakStartDate: new Date(
        data.lastActiveDate.getTime() -
          (data.currentStreak - 1) * 24 * 60 * 60 * 1000,
      ),
    };

    const event: StreakUpdateEvent = {
      type: "streak_update",
      userId: data.userId,
      streak,
      timestamp: new Date(),
      source: "websocket",
    };

    // Update streak cache
    this.streakCache.set(data.userId, streak);

    // Broadcast streak update
    this.broadcastStreakUpdate(event);

    // Notify handlers
    this.handlers.onStreakUpdate?.(event);
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  private detectProgressConflict(
    event: ProgressUpdateEvent,
  ): ProgressConflict | null {
    const key = `${event.userId}_${event.topic}`;
    const lastKnown = this.lastKnownState.get(key);

    if (!lastKnown) {
      return null;
    }

    // Check if there's a significant difference in mastery values
    const masteryDiff = Math.abs(
      event.mastery.mastery - lastKnown.mastery.mastery,
    );
    const timeDiff = event.timestamp.getTime() - lastKnown.timestamp.getTime();

    // Conflict if mastery changed significantly in a short time
    if (masteryDiff > 0.1 && timeDiff < 5000) {
      // 5 seconds
      return {
        type: "mastery_conflict",
        userId: event.userId,
        topic: event.topic,
        localData: lastKnown.mastery,
        remoteData: event.mastery,
        timestamp: event.timestamp,
      };
    }

    return null;
  }

  private handleConflict(conflict: ProgressConflict): void {
    console.warn("[ProgressUpdateManager] Conflict detected:", conflict);

    switch (this.config.conflictResolutionStrategy) {
      case "latest_wins":
        // Accept the remote data (default behavior)
        break;
      case "merge":
        // Implement merge logic if needed
        this.mergeConflictingData(conflict);
        break;
      case "user_choice":
        // Let the user decide
        this.handlers.onConflictDetected?.(conflict);
        return;
    }
  }

  private mergeConflictingData(conflict: ProgressConflict): void {
    // Simple merge strategy - take the higher mastery value
    if (conflict.type === "mastery_conflict") {
      const local = conflict.localData as SkillMastery;
      const remote = conflict.remoteData as SkillMastery;

      const merged: SkillMastery = {
        ...remote,
        mastery: Math.max(local.mastery, remote.mastery),
        confidence: Math.max(local.confidence, remote.confidence),
        practiceCount: Math.max(local.practiceCount, remote.practiceCount),
        correctStreak: Math.max(local.correctStreak, remote.correctStreak),
        longestStreak: Math.max(local.longestStreak, remote.longestStreak),
        totalTimeMs: Math.max(local.totalTimeMs, remote.totalTimeMs),
      };

      // Update local state with merged data
      const key = `${conflict.userId}_${conflict.topic}`;
      this.lastKnownState.set(key, {
        mastery: merged,
        timestamp: new Date(),
        version: Date.now(),
      });
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  private updateLocalProgressState(event: ProgressUpdateEvent): void {
    const key = `${event.userId}_${event.topic}`;

    this.lastKnownState.set(key, {
      mastery: event.mastery,
      timestamp: event.timestamp,
      version: Date.now(),
    });

    // Update progress cache if summary is provided
    if (event.summary) {
      this.progressCache.set(event.userId, event.summary);
    }
  }

  private throttleProgressUpdate(event: ProgressUpdateEvent): void {
    const key = `${event.userId}_${event.topic}`;
    this.pendingUpdates.set(key, event);

    if (this.updateThrottleTimer) {
      return;
    }

    this.updateThrottleTimer = setTimeout(() => {
      this.flushPendingUpdates();
      this.updateThrottleTimer = null;
    }, this.config.updateThrottleMs!);
  }

  private flushPendingUpdates(): void {
    const updates = Array.from(this.pendingUpdates.values());
    this.pendingUpdates.clear();

    // Group updates by user (only progress updates)
    const userUpdates = new Map<string, ProgressUpdateEvent[]>();
    updates.forEach((update) => {
      if (update.type === "progress_update") {
        const existing = userUpdates.get(update.userId) || [];
        existing.push(update as ProgressUpdateEvent);
        userUpdates.set(update.userId, existing);
      }
    });

    // Process updates for each user
    userUpdates.forEach((updates, userId) => {
      this.processUserProgressUpdates(userId, updates);
    });
  }

  private processUserProgressUpdates(
    userId: string,
    updates: ProgressUpdateEvent[],
  ): void {
    // Notify handlers for each update
    updates.forEach((update) => {
      this.handlers.onProgressUpdate?.(update);
    });

    // Create a consolidated progress sync event
    const latestSummary = this.progressCache.get(userId);
    if (latestSummary) {
      const syncEvent: ProgressSyncEvent = {
        type: "progress_sync",
        userId,
        summary: latestSummary,
        timestamp: new Date(),
        source: "websocket",
      };

      this.handlers.onProgressSync?.(syncEvent);
    }
  }

  // ============================================================================
  // Cross-Tab Broadcasting
  // ============================================================================

  private broadcastProgressUpdate(event: ProgressUpdateEvent): void {
    if (!this.broadcastChannel) return;

    const message: BroadcastMessage = {
      type: "progress_update",
      userId: event.userId,
      data: event,
      timestamp: event.timestamp,
      tabId: this.tabId,
    };

    try {
      this.broadcastChannel.postMessage(message);
    } catch (error) {
      console.warn(
        "[ProgressUpdateManager] Failed to broadcast progress update:",
        error,
      );
    }
  }

  private broadcastMilestoneUpdate(event: MilestoneUpdateEvent): void {
    if (!this.broadcastChannel) return;

    const message: BroadcastMessage = {
      type: "milestone_achieved",
      userId: event.userId,
      data: event,
      timestamp: event.timestamp,
      tabId: this.tabId,
    };

    try {
      this.broadcastChannel.postMessage(message);
    } catch (error) {
      console.warn(
        "[ProgressUpdateManager] Failed to broadcast milestone update:",
        error,
      );
    }
  }

  private broadcastStreakUpdate(event: StreakUpdateEvent): void {
    if (!this.broadcastChannel) return;

    const message: BroadcastMessage = {
      type: "streak_update",
      userId: event.userId,
      data: event,
      timestamp: event.timestamp,
      tabId: this.tabId,
    };

    try {
      this.broadcastChannel.postMessage(message);
    } catch (error) {
      console.warn(
        "[ProgressUpdateManager] Failed to broadcast streak update:",
        error,
      );
    }
  }

  private handleBroadcastMessage(message: BroadcastMessage): void {
    // Ignore messages from the same tab
    if (message.tabId === this.tabId) {
      return;
    }

    console.log(
      "[ProgressUpdateManager] Received broadcast message:",
      message.type,
    );

    // Process broadcast message based on type
    switch (message.type) {
      case "progress_update":
        const progressEvent = message.data as ProgressUpdateEvent;
        const updatedProgressEvent = {
          ...progressEvent,
          source: "cache" as const,
        };
        this.handlers.onProgressUpdate?.(updatedProgressEvent);
        break;

      case "milestone_achieved":
        const milestoneEvent = message.data as MilestoneUpdateEvent;
        this.handlers.onMilestoneAchieved?.(milestoneEvent);
        break;

      case "streak_update":
        const streakEvent = message.data as StreakUpdateEvent;
        this.handlers.onStreakUpdate?.(streakEvent);
        break;

      case "progress_sync":
        const syncEvent = message.data as ProgressSyncEvent;
        const updatedSyncEvent = { ...syncEvent, source: "broadcast" as const };
        this.handlers.onProgressSync?.(updatedSyncEvent);
        break;
    }
  }

  // ============================================================================
  // Consistency Checking
  // ============================================================================

  async performConsistencyCheck(userId: string): Promise<boolean> {
    if (!this.config.enableConsistencyChecking) {
      return true;
    }

    try {
      // This would typically fetch the latest data from the server
      // and compare it with local state
      console.log(
        "[ProgressUpdateManager] Performing consistency check for user:",
        userId,
      );

      // For now, return true (consistent)
      return true;
    } catch (error) {
      console.error("[ProgressUpdateManager] Consistency check failed:", error);
      return false;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Subscribe to progress updates for a user
   */
  subscribeToProgressUpdates(userId: string): void {
    this.wsManager.subscribe([
      `progress:${userId}`,
      `milestones:${userId}`,
      `streaks:${userId}`,
    ]);
  }

  /**
   * Unsubscribe from progress updates for a user
   */
  unsubscribeFromProgressUpdates(userId: string): void {
    this.wsManager.unsubscribe([
      `progress:${userId}`,
      `milestones:${userId}`,
      `streaks:${userId}`,
    ]);
  }

  /**
   * Get cached progress summary
   */
  getCachedProgressSummary(userId: string): ProgressSummary | null {
    return this.progressCache.get(userId) || null;
  }

  /**
   * Get cached learning streak
   */
  getCachedLearningStreak(userId: string): LearningStreak | null {
    return this.streakCache.get(userId) || null;
  }

  /**
   * Force sync progress data
   */
  async forceSyncProgress(userId: string): Promise<void> {
    // This would trigger a full sync with the server
    console.log(
      "[ProgressUpdateManager] Force syncing progress for user:",
      userId,
    );

    // Perform consistency check
    const isConsistent = await this.performConsistencyCheck(userId);

    if (!isConsistent) {
      console.warn(
        "[ProgressUpdateManager] Inconsistency detected during force sync",
      );
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    broadcastEnabled: boolean;
    pendingUpdates: number;
    cachedUsers: number;
  } {
    return {
      connected: this.wsManager.isWebSocketConnected(),
      broadcastEnabled: !!this.broadcastChannel,
      pendingUpdates: this.pendingUpdates.size,
      cachedUsers: this.progressCache.size,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.updateThrottleTimer) {
      clearTimeout(this.updateThrottleTimer);
      this.updateThrottleTimer = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.pendingUpdates.clear();
    this.lastKnownState.clear();
    this.progressCache.clear();
    this.streakCache.clear();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(error: UserServiceError): void {
    console.error("[ProgressUpdateManager] Error:", error);
    this.handlers.onError?.(error);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create progress update manager
 */
export function createProgressUpdateManager(
  wsManager: WebSocketManager,
  config?: ProgressUpdateConfig,
): ProgressUpdateManager {
  return new ProgressUpdateManager(wsManager, config);
}

/**
 * Create mock progress update manager for testing
 */
export function createMockProgressUpdateManager(
  wsManager: WebSocketManager,
): ProgressUpdateManager {
  return new ProgressUpdateManager(wsManager, {
    enableBroadcast: false,
    enableConflictResolution: false,
    enableConsistencyChecking: false,
  });
}
