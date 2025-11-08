/**
 * Unified Real-Time Communication System
 *
 * Integrates all real-time components for Task 10:
 * - WebSocket connection management (10.1)
 * - Real-time progress updates (10.2)
 * - Real-time activity monitoring (10.3)
 *
 * Provides a single interface for all real-time functionality
 */

import {
  WebSocketManager,
  createWebSocketManager,
  type WebSocketConfig,
} from "./websocket-manager";
import {
  ProgressUpdateManager,
  createProgressUpdateManager,
  type ProgressUpdateConfig,
  type ProgressUpdateHandlers,
} from "./progress-updates";
import {
  ActivityMonitoringManager,
  createActivityMonitoringManager,
  type ActivityMonitoringConfig,
  type ActivityMonitoringHandlers,
} from "./activity-monitoring";
import type { UserServiceError } from "@/types/user-service";

// ============================================================================
// Unified System Configuration
// ============================================================================

export interface RealtimeSystemConfig {
  websocket?: WebSocketConfig;
  progressUpdates?: ProgressUpdateConfig;
  activityMonitoring?: ActivityMonitoringConfig;
  enableAutoReconnect?: boolean;
  enableCrossTabSync?: boolean;
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

export interface RealtimeSystemHandlers
  extends ProgressUpdateHandlers,
    ActivityMonitoringHandlers {
  onSystemConnect?: () => void;
  onSystemDisconnect?: () => void;
  onSystemError?: (error: UserServiceError) => void;
  onSystemReady?: () => void;
}

// ============================================================================
// System Status Types
// ============================================================================

export interface RealtimeSystemStatus {
  connected: boolean;
  websocketStatus: {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: string[];
    queuedMessages: number;
  };
  progressUpdates: {
    connected: boolean;
    broadcastEnabled: boolean;
    pendingUpdates: number;
    cachedUsers: number;
  };
  activityMonitoring: {
    connected: boolean;
    monitoredUsers: number;
    totalActivities: number;
    activeInsights: number;
    activeRecommendations: number;
  };
  metrics: {
    totalConnections: number;
    successfulConnections: number;
    failedConnections: number;
    messagesReceived: number;
    messagesSent: number;
    uptime: number;
  };
}

// ============================================================================
// Unified Real-Time System
// ============================================================================

export class RealtimeSystem {
  private config: RealtimeSystemConfig;
  private handlers: RealtimeSystemHandlers = {};

  private wsManager!: WebSocketManager;
  private progressManager!: ProgressUpdateManager;
  private activityManager!: ActivityMonitoringManager;

  private isInitialized = false;
  private currentUserId: string | null = null;
  private currentAuthToken: string | null = null;

  private systemReadyPromise: Promise<void> | null = null;
  private systemReadyResolve: (() => void) | null = null;

  constructor(config: RealtimeSystemConfig = {}) {
    this.config = {
      enableAutoReconnect: true,
      enableCrossTabSync: true,
      enableMetrics: true,
      enableLogging: process.env.NODE_ENV === "development",
      ...config,
    };

    this.initializeComponents();
    this.setupSystemHandlers();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeComponents(): void {
    // Create WebSocket manager
    this.wsManager = createWebSocketManager({
      enableLogging: this.config.enableLogging || false,
      enableMetrics: this.config.enableMetrics || false,
      ...this.config.websocket,
    });

    // Create progress update manager
    this.progressManager = createProgressUpdateManager(this.wsManager, {
      enableBroadcast: this.config.enableCrossTabSync || false,
      ...this.config.progressUpdates,
    });

    // Create activity monitoring manager
    this.activityManager = createActivityMonitoringManager(this.wsManager, {
      ...this.config.activityMonitoring,
    });
  }

  private setupSystemHandlers(): void {
    // WebSocket handlers
    this.wsManager.setEventHandlers({
      onConnect: () => {
        this.log("WebSocket connected");
        this.handleSystemConnect();
      },
      onDisconnect: (code, reason) => {
        this.log(`WebSocket disconnected: ${code} - ${reason}`);
        this.handleSystemDisconnect();
      },
      onError: (error) => {
        this.log("WebSocket error:", error);
        this.handleSystemError(error);
      },
    });

    // Progress update handlers
    this.progressManager.setHandlers({
      onProgressUpdate: (event) => {
        this.log("Progress update received:", event.topic);
        this.handlers.onProgressUpdate?.(event);
      },
      onMilestoneAchieved: (event) => {
        this.log("Milestone achieved:", event.milestone.title);
        this.handlers.onMilestoneAchieved?.(event);
      },
      onStreakUpdate: (event) => {
        this.log("Streak updated:", event.streak.currentStreak);
        this.handlers.onStreakUpdate?.(event);
      },
      onProgressSync: (event) => {
        this.log("Progress synced for user:", event.userId);
        this.handlers.onProgressSync?.(event);
      },
      onConflictDetected: (conflict) => {
        this.log("Progress conflict detected:", conflict.type);
        this.handlers.onConflictDetected?.(conflict);
      },
      onError: (error) => {
        this.log("Progress update error:", error);
        this.handleSystemError(error);
      },
    });

    // Activity monitoring handlers
    this.activityManager.setHandlers({
      onActivityStream: (event) => {
        this.log("Activity stream event:", event.type);
        this.handlers.onActivityStream?.(event);
      },
      onEngagementUpdate: (event) => {
        this.log("Engagement updated for user:", event.userId);
        this.handlers.onEngagementUpdate?.(event);
      },
      onInsightGenerated: (event) => {
        this.log("Insight generated:", event.insight.title);
        this.handlers.onInsightGenerated?.(event);
      },
      onRecommendationUpdate: (event) => {
        this.log("Recommendations updated:", event.recommendations.length);
        this.handlers.onRecommendationUpdate?.(event);
      },
      onBehaviorPatternDetected: (event) => {
        this.log("Behavior pattern detected:", event.pattern.name);
        this.handlers.onBehaviorPatternDetected?.(event);
      },
      onError: (error) => {
        this.log("Activity monitoring error:", error);
        this.handleSystemError(error);
      },
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Initialize and connect the real-time system
   */
  async initialize(userId: string, authToken: string): Promise<void> {
    if (this.isInitialized) {
      this.log("System already initialized");
      return;
    }

    this.currentUserId = userId;
    this.currentAuthToken = authToken;

    this.log(`Initializing real-time system for user: ${userId}`);

    // Create system ready promise
    this.systemReadyPromise = new Promise((resolve) => {
      this.systemReadyResolve = resolve;
    });

    try {
      // Connect WebSocket
      await this.wsManager.connect(userId, authToken);

      // Subscribe to user-specific channels
      this.subscribeToUserChannels(userId);

      this.isInitialized = true;
      this.log("Real-time system initialized successfully");

      // Mark system as ready
      this.systemReadyResolve?.();
      this.handlers.onSystemReady?.();
    } catch (error) {
      this.log("Failed to initialize real-time system:", error);
      this.handleSystemError({
        type: "network",
        message: "Failed to initialize real-time system",
        recoverable: true,
      });
      throw error;
    }
  }

  /**
   * Wait for system to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.systemReadyPromise) {
      await this.systemReadyPromise;
    }
  }

  /**
   * Disconnect and cleanup the real-time system
   */
  disconnect(): void {
    this.log("Disconnecting real-time system");

    this.wsManager.disconnect();
    this.progressManager.cleanup();
    this.activityManager.cleanup();

    this.isInitialized = false;
    this.currentUserId = null;
    this.currentAuthToken = null;
    this.systemReadyPromise = null;
    this.systemReadyResolve = null;
  }

  /**
   * Set event handlers for the system
   */
  setHandlers(handlers: RealtimeSystemHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Remove specific event handler
   */
  removeHandler(event: keyof RealtimeSystemHandlers): void {
    delete this.handlers[event];
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to all user-specific channels
   */
  private subscribeToUserChannels(userId: string): void {
    this.log(`Subscribing to channels for user: ${userId}`);

    // Subscribe to progress updates
    this.progressManager.subscribeToProgressUpdates(userId);

    // Subscribe to activity monitoring
    this.activityManager.subscribeToActivityMonitoring(userId);
  }

  /**
   * Subscribe to specific channels
   */
  subscribeToChannels(channels: string[]): void {
    this.wsManager.subscribe(channels);
  }

  /**
   * Unsubscribe from specific channels
   */
  unsubscribeFromChannels(channels: string[]): void {
    this.wsManager.unsubscribe(channels);
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return this.wsManager.getSubscriptions();
  }

  // ============================================================================
  // Progress Updates API
  // ============================================================================

  /**
   * Get cached progress summary
   */
  getCachedProgressSummary(userId?: string) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return null;

    return this.progressManager.getCachedProgressSummary(targetUserId);
  }

  /**
   * Get cached learning streak
   */
  getCachedLearningStreak(userId?: string) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return null;

    return this.progressManager.getCachedLearningStreak(targetUserId);
  }

  /**
   * Force sync progress data
   */
  async forceSyncProgress(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return;

    await this.progressManager.forceSyncProgress(targetUserId);
  }

  // ============================================================================
  // Activity Monitoring API
  // ============================================================================

  /**
   * Get user activity state
   */
  getUserActivityState(userId?: string) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return null;

    return this.activityManager.getUserState(targetUserId);
  }

  // ============================================================================
  // System Status and Monitoring
  // ============================================================================

  /**
   * Check if system is connected
   */
  isConnected(): boolean {
    return this.isInitialized && this.wsManager.isWebSocketConnected();
  }

  /**
   * Check if system is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isConnected();
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): RealtimeSystemStatus {
    return {
      connected: this.isConnected(),
      websocketStatus: this.wsManager.getConnectionStatus(),
      progressUpdates: this.progressManager.getConnectionStatus(),
      activityMonitoring: this.activityManager.getMonitoringStatus(),
      metrics: this.wsManager.getMetrics(),
    };
  }

  /**
   * Get system health check
   */
  getHealthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    components: {
      websocket: "healthy" | "unhealthy";
      progressUpdates: "healthy" | "unhealthy";
      activityMonitoring: "healthy" | "unhealthy";
    };
    issues: string[];
  } {
    const issues: string[] = [];
    const components = {
      websocket: this.wsManager.isWebSocketConnected()
        ? ("healthy" as const)
        : ("unhealthy" as const),
      progressUpdates: this.progressManager.getConnectionStatus().connected
        ? ("healthy" as const)
        : ("unhealthy" as const),
      activityMonitoring: this.activityManager.getMonitoringStatus().connected
        ? ("healthy" as const)
        : ("unhealthy" as const),
    };

    if (components.websocket === "unhealthy") {
      issues.push("WebSocket connection is down");
    }

    if (components.progressUpdates === "unhealthy") {
      issues.push("Progress updates are not working");
    }

    if (components.activityMonitoring === "unhealthy") {
      issues.push("Activity monitoring is not working");
    }

    const healthyComponents = Object.values(components).filter(
      (c) => c === "healthy",
    ).length;
    const totalComponents = Object.values(components).length;

    let status: "healthy" | "degraded" | "unhealthy";
    if (healthyComponents === totalComponents) {
      status = "healthy";
    } else if (healthyComponents > 0) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      components,
      issues,
    };
  }

  /**
   * Reset system metrics
   */
  resetMetrics(): void {
    this.wsManager.resetMetrics();
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleSystemConnect(): void {
    this.log("System connected");
    this.handlers.onSystemConnect?.();
  }

  private handleSystemDisconnect(): void {
    this.log("System disconnected");
    this.handlers.onSystemDisconnect?.();

    // Auto-reconnect if enabled
    if (
      this.config.enableAutoReconnect &&
      this.currentUserId &&
      this.currentAuthToken
    ) {
      this.log("Auto-reconnecting...");
      setTimeout(() => {
        this.initialize(this.currentUserId!, this.currentAuthToken!).catch(
          (error) => {
            this.log("Auto-reconnect failed:", error);
          },
        );
      }, 5000); // Wait 5 seconds before reconnecting
    }
  }

  private handleSystemError(error: UserServiceError): void {
    this.log("System error:", error);
    this.handlers.onSystemError?.(error);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log(`[RealtimeSystem] ${message}`, ...args);
    }
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create a new real-time system instance
   */
  static create(config?: RealtimeSystemConfig): RealtimeSystem {
    return new RealtimeSystem(config);
  }

  /**
   * Create a mock real-time system for testing
   */
  static createMock(): RealtimeSystem {
    return new RealtimeSystem({
      enableAutoReconnect: false,
      enableCrossTabSync: false,
      enableMetrics: false,
      enableLogging: false,
      websocket: {
        url: "ws://localhost:8080/ws",
        reconnectAttempts: 0,
        enableLogging: false,
        enableMetrics: false,
      },
    });
  }
}

// ============================================================================
// Global Instance Management
// ============================================================================

let globalRealtimeSystem: RealtimeSystem | null = null;

/**
 * Get or create the global real-time system instance
 */
export function getRealtimeSystem(
  config?: RealtimeSystemConfig,
): RealtimeSystem {
  if (!globalRealtimeSystem) {
    globalRealtimeSystem = new RealtimeSystem(config);
  }
  return globalRealtimeSystem;
}

/**
 * Initialize the global real-time system
 */
export async function initializeRealtimeSystem(
  userId: string,
  authToken: string,
  config?: RealtimeSystemConfig,
): Promise<RealtimeSystem> {
  const system = getRealtimeSystem(config);
  await system.initialize(userId, authToken);
  return system;
}

/**
 * Disconnect and cleanup the global real-time system
 */
export function disconnectRealtimeSystem(): void {
  if (globalRealtimeSystem) {
    globalRealtimeSystem.disconnect();
    globalRealtimeSystem = null;
  }
}

// ============================================================================
// React Hook Integration
// ============================================================================

/**
 * Hook for using the real-time system in React components
 * This would typically be in a separate hooks file, but included here for completeness
 */
export function useRealtimeSystem() {
  return {
    system: globalRealtimeSystem,
    isConnected: globalRealtimeSystem?.isConnected() || false,
    isReady: globalRealtimeSystem?.isReady() || false,
    status: globalRealtimeSystem?.getSystemStatus(),
    healthCheck: globalRealtimeSystem?.getHealthCheck(),
  };
}

// ============================================================================
// Export Types (moved to avoid conflicts)
// ============================================================================

export type { RealtimeSystemConfig as RTSConfig };
export type { RealtimeSystemHandlers as RTSHandlers };
export type { RealtimeSystemStatus as RTSStatus };

export { RealtimeSystem as default };
