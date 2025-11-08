/**
 * Offline Support and Data Synchronization
 *
 * Provides comprehensive offline functionality including data queuing,
 * conflict resolution, and synchronization when connectivity is restored.
 *
 * Requirements: 7.4, 7.5, 1.5, 9.4
 */

import React from "react";
import type { UserServiceError } from "@/types/user-service";

// ============================================================================
// Offline Configuration and Types
// ============================================================================

export interface OfflineConfig {
  enableOfflineMode: boolean;
  maxQueueSize: number;
  syncRetryAttempts: number;
  syncRetryDelay: number;
  conflictResolutionStrategy:
    | "client-wins"
    | "server-wins"
    | "merge"
    | "manual";
  persistenceKey: string;
  enableConflictDetection: boolean;
  maxOfflineDuration: number; // milliseconds
}

export interface OfflineState {
  isOffline: boolean;
  lastOnlineTime?: Date;
  queuedOperations: number;
  syncInProgress: boolean;
  lastSyncTime?: Date;
  syncErrors: UserServiceError[];
  conflictsDetected: number;
}

export interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "profile" | "preferences" | "activity" | "progress";
  data: unknown;
  timestamp: Date;
  retryCount: number;
  clientVersion: number;
  optimisticId?: string;
}

export interface ConflictResolution {
  operationId: string;
  conflictType: "version" | "data" | "deleted";
  clientData: unknown;
  serverData: unknown;
  resolution: "client" | "server" | "merge" | "manual";
  resolvedData?: unknown;
}

export interface SyncResult {
  success: boolean;
  processedOperations: number;
  failedOperations: number;
  conflicts: ConflictResolution[];
  errors: UserServiceError[];
}

// ============================================================================
// Offline Storage Manager
// ============================================================================

export class OfflineStorageManager {
  private storageKey: string;
  private maxSize: number;

  constructor(
    storageKey: string = "user-service-offline",
    maxSize: number = 1000,
  ) {
    this.storageKey = storageKey;
    this.maxSize = maxSize;
  }

  saveQueue(operations: QueuedOperation[]): void {
    try {
      // Enforce size limit
      const limitedOps = operations.slice(-this.maxSize);

      const data = {
        operations: limitedOps,
        timestamp: new Date().toISOString(),
        version: 1,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("[OfflineStorage] Failed to save queue:", error);
    }
  }

  loadQueue(): QueuedOperation[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const data = JSON.parse(stored);

      // Validate structure
      if (!data.operations || !Array.isArray(data.operations)) {
        return [];
      }

      // Convert timestamp strings back to Date objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.operations.map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp),
      }));
    } catch (error) {
      console.error("[OfflineStorage] Failed to load queue:", error);
      return [];
    }
  }

  clearQueue(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("[OfflineStorage] Failed to clear queue:", error);
    }
  }

  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? stored.length : 0;
    } catch {
      return 0;
    }
  }
}

// ============================================================================
// Conflict Resolution Engine
// ============================================================================

export class ConflictResolver {
  private strategy: OfflineConfig["conflictResolutionStrategy"];

  constructor(strategy: OfflineConfig["conflictResolutionStrategy"] = "merge") {
    this.strategy = strategy;
  }

  resolveConflict(
    clientData: unknown,
    serverData: unknown,
    conflictType: ConflictResolution["conflictType"],
  ): ConflictResolution["resolution"] {
    switch (this.strategy) {
      case "client-wins":
        return "client";

      case "server-wins":
        return "server";

      case "merge":
        return this.canMerge(clientData, serverData, conflictType)
          ? "merge"
          : "manual";

      case "manual":
        return "manual";

      default:
        return "manual";
    }
  }

  mergeData(clientData: unknown, serverData: unknown): unknown {
    // Simple merge strategy for objects
    if (this.isObject(clientData) && this.isObject(serverData)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serverObj = serverData as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientObj = clientData as any;

      return {
        ...serverObj,
        ...clientObj,
        // Keep server timestamps for audit
        updatedAt: serverObj.updatedAt,
        version: Math.max(clientObj.version || 0, serverObj.version || 0) + 1,
      };
    }

    // For non-objects, prefer client data
    return clientData;
  }

  private canMerge(
    clientData: unknown,
    serverData: unknown,
    conflictType: ConflictResolution["conflictType"],
  ): boolean {
    // Can't merge if one side is deleted
    if (conflictType === "deleted") {
      return false;
    }

    // Can merge objects with compatible structures
    if (this.isObject(clientData) && this.isObject(serverData)) {
      return this.hasCompatibleStructure(clientData, serverData);
    }

    return false;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private hasCompatibleStructure(
    obj1: Record<string, unknown>,
    obj2: Record<string, unknown>,
  ): boolean {
    // Simple compatibility check - both objects should have similar key structures
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // At least 50% of keys should overlap
    const overlap = keys1.filter((key) => keys2.includes(key)).length;
    const minKeys = Math.min(keys1.length, keys2.length);

    return minKeys === 0 || overlap / minKeys >= 0.5;
  }
}

// ============================================================================
// Offline Manager
// ============================================================================

export class OfflineManager {
  private config: OfflineConfig;
  private state: OfflineState;
  private operationQueue: QueuedOperation[] = [];
  private storage: OfflineStorageManager;
  private conflictResolver: ConflictResolver;
  private stateChangeCallbacks: ((state: OfflineState) => void)[] = [];
  private networkListeners: (() => void)[] = [];

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOfflineMode: true,
      maxQueueSize: 1000,
      syncRetryAttempts: 3,
      syncRetryDelay: 5000,
      conflictResolutionStrategy: "merge",
      persistenceKey: "user-service-offline",
      enableConflictDetection: true,
      maxOfflineDuration: 24 * 60 * 60 * 1000, // 24 hours
      ...config,
    };

    this.storage = new OfflineStorageManager(
      this.config.persistenceKey,
      this.config.maxQueueSize,
    );
    this.conflictResolver = new ConflictResolver(
      this.config.conflictResolutionStrategy,
    );

    this.state = {
      isOffline: !navigator.onLine,
      queuedOperations: 0,
      syncInProgress: false,
      syncErrors: [],
      conflictsDetected: 0,
    };

    this.initializeOfflineSupport();
  }

  // ============================================================================
  // Initialization and Event Handling
  // ============================================================================

  private initializeOfflineSupport(): void {
    // Load persisted queue
    this.operationQueue = this.storage.loadQueue();
    this.updateState({ queuedOperations: this.operationQueue.length });

    // Set up network event listeners
    const handleOnline = () => {
      this.updateState({
        isOffline: false,
        lastOnlineTime: new Date(),
      });

      // Automatically sync when coming back online
      if (this.operationQueue.length > 0) {
        this.syncWhenOnline();
      }
    };

    const handleOffline = () => {
      this.updateState({ isOffline: true });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    this.networkListeners.push(
      () => window.removeEventListener("online", handleOnline),
      () => window.removeEventListener("offline", handleOffline),
    );

    // Initial state
    if (!navigator.onLine) {
      this.updateState({ isOffline: true });
    }
  }

  // ============================================================================
  // Operation Queueing
  // ============================================================================

  queueOperation(
    type: QueuedOperation["type"],
    entity: QueuedOperation["entity"],
    data: unknown,
    optimisticId?: string,
  ): string {
    if (!this.config.enableOfflineMode) {
      throw new Error("Offline mode is disabled");
    }

    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      entity,
      data,
      timestamp: new Date(),
      retryCount: 0,
      clientVersion: Date.now(), // Simple versioning
      ...(optimisticId && { optimisticId }),
    };

    this.operationQueue.push(operation);

    // Enforce queue size limit
    if (this.operationQueue.length > this.config.maxQueueSize) {
      this.operationQueue = this.operationQueue.slice(
        -this.config.maxQueueSize,
      );
    }

    this.persistQueue();
    this.updateState({ queuedOperations: this.operationQueue.length });

    console.log("[OfflineManager] Queued operation:", {
      id: operation.id,
      type: operation.type,
      entity: operation.entity,
    });

    return operation.id;
  }

  removeOperation(operationId: string): boolean {
    const initialLength = this.operationQueue.length;
    this.operationQueue = this.operationQueue.filter(
      (op) => op.id !== operationId,
    );

    if (this.operationQueue.length !== initialLength) {
      this.persistQueue();
      this.updateState({ queuedOperations: this.operationQueue.length });
      return true;
    }

    return false;
  }

  clearQueue(): void {
    this.operationQueue = [];
    this.storage.clearQueue();
    this.updateState({ queuedOperations: 0 });
  }

  // ============================================================================
  // Data Synchronization
  // ============================================================================

  async syncWhenOnline(): Promise<SyncResult> {
    if (this.state.isOffline || this.state.syncInProgress) {
      return {
        success: false,
        processedOperations: 0,
        failedOperations: 0,
        conflicts: [],
        errors: [
          {
            type: "service",
            message: "Cannot sync while offline or sync in progress",
            code: "SYNC_UNAVAILABLE",
            recoverable: true,
          },
        ],
      };
    }

    this.updateState({ syncInProgress: true, syncErrors: [] });

    try {
      const result = await this.performSync();

      this.updateState({
        syncInProgress: false,
        lastSyncTime: new Date(),
        conflictsDetected: result.conflicts.length,
      });

      return result;
    } catch (error) {
      const syncError = this.classifyError(error);

      this.updateState({
        syncInProgress: false,
        syncErrors: [syncError],
      });

      return {
        success: false,
        processedOperations: 0,
        failedOperations: this.operationQueue.length,
        conflicts: [],
        errors: [syncError],
      };
    }
  }

  private async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      processedOperations: 0,
      failedOperations: 0,
      conflicts: [],
      errors: [],
    };

    const operationsToProcess = [...this.operationQueue];
    const processedIds: string[] = [];

    for (const operation of operationsToProcess) {
      try {
        const syncResult = await this.syncOperation(operation);

        if (syncResult.success) {
          processedIds.push(operation.id);
          result.processedOperations++;
        } else {
          result.failedOperations++;
          if (syncResult.error) {
            result.errors.push(syncResult.error);
          }
        }

        if (syncResult.conflict) {
          result.conflicts.push(syncResult.conflict);
        }
      } catch (error) {
        result.failedOperations++;
        result.errors.push(this.classifyError(error));

        // Increment retry count
        operation.retryCount++;

        // Remove operation if max retries exceeded
        if (operation.retryCount >= this.config.syncRetryAttempts) {
          processedIds.push(operation.id);
        }
      }
    }

    // Remove successfully processed operations
    this.operationQueue = this.operationQueue.filter(
      (op) => !processedIds.includes(op.id),
    );
    this.persistQueue();
    this.updateState({ queuedOperations: this.operationQueue.length });

    result.success = result.failedOperations === 0;

    console.log("[OfflineManager] Sync completed:", result);
    return result;
  }

  private async syncOperation(operation: QueuedOperation): Promise<{
    success: boolean;
    error?: UserServiceError;
    conflict?: ConflictResolution;
  }> {
    // This would integrate with your actual API client
    // For now, we'll simulate the sync process

    try {
      // Simulate API call based on operation type and entity
      const apiResult = await this.callAPI(operation);

      // Check for conflicts
      if (this.config.enableConflictDetection && apiResult.conflict) {
        const conflict = this.resolveConflict(operation, apiResult.serverData);

        if (conflict.resolution === "manual") {
          return { success: false, conflict };
        }

        // Apply resolved data
        if (conflict.resolution === "merge" && conflict.resolvedData) {
          await this.callAPI({
            ...operation,
            data: conflict.resolvedData,
          });
        }

        return { success: true, conflict };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  private async callAPI(operation: QueuedOperation): Promise<{
    success: boolean;
    serverData?: unknown;
    conflict?: boolean;
  }> {
    // This is a placeholder - integrate with your actual UserServiceClient
    // The implementation would depend on your API structure

    const endpoint = this.getAPIEndpoint(operation.entity, operation.type);
    const method = this.getHTTPMethod(operation.type);

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Add authentication headers here
      },
      ...(operation.type !== "delete" && {
        body: JSON.stringify(operation.data),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    // Detect conflicts based on version or timestamp
    const conflict = this.detectConflict(operation, result);

    return {
      success: true,
      serverData: result,
      conflict,
    };
  }

  private getAPIEndpoint(entity: string, type: string): string {
    // Map entity and operation type to API endpoints
    const baseURL = "/api/users";

    console.log("Getting API endpoint for entity:", entity, "type:", type);
    switch (entity) {
      case "profile":
        return `${baseURL}/profile`;
      case "preferences":
        return `${baseURL}/preferences`;
      case "activity":
        return `${baseURL}/activities`;
      case "progress":
        return `${baseURL}/progress`;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  }

  private getHTTPMethod(type: string): string {
    switch (type) {
      case "create":
        return "POST";
      case "update":
        return "PUT";
      case "delete":
        return "DELETE";
      default:
        return "POST";
    }
  }

  private detectConflict(operation: QueuedOperation, serverData: unknown): boolean {
    if (!this.config.enableConflictDetection) {
      return false;
    }

    // Simple version-based conflict detection
    const clientData = operation.data as Record<string, unknown> | undefined;
    const clientVersion = (
      clientData && "version" in clientData ? clientData.version : 0
    ) as number;
    const serverVersion = (
      serverData && typeof serverData === "object" && "version" in serverData
        ? (serverData as Record<string, unknown>).version
        : 0
    ) as number;

    return serverVersion > clientVersion;
  }

  private resolveConflict(
    operation: QueuedOperation,
    serverData: unknown,
  ): ConflictResolution {
    const conflictType: ConflictResolution["conflictType"] =
      serverData === null ? "deleted" : "version";

    const resolution = this.conflictResolver.resolveConflict(
      operation.data,
      serverData,
      conflictType,
    );

    const conflict: ConflictResolution = {
      operationId: operation.id,
      conflictType,
      clientData: operation.data,
      serverData,
      resolution,
    };

    if (resolution === "merge") {
      conflict.resolvedData = this.conflictResolver.mergeData(
        operation.data,
        serverData,
      );
    }

    return conflict;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private persistQueue(): void {
    this.storage.saveQueue(this.operationQueue);
  }

  private updateState(updates: Partial<OfflineState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(this.state);
      } catch (error) {
        console.error(
          "[OfflineManager] Error in state change callback:",
          error,
        );
      }
    }
  }

  private classifyError(error: unknown): UserServiceError {
    if (error instanceof Error) {
      return {
        type: "service",
        message: error.message,
        code: "SYNC_ERROR",
        recoverable: true,
      };
    }

    return {
      type: "service",
      message: "Unknown sync error",
      code: "UNKNOWN_SYNC_ERROR",
      recoverable: true,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getState(): OfflineState {
    return { ...this.state };
  }

  getQueuedOperations(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  isOffline(): boolean {
    return this.state.isOffline;
  }

  canQueue(): boolean {
    return (
      this.config.enableOfflineMode &&
      this.operationQueue.length < this.config.maxQueueSize
    );
  }

  onStateChange(callback: (state: OfflineState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  offStateChange(callback: (state: OfflineState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  cleanup(): void {
    // Remove network listeners
    for (const removeListener of this.networkListeners) {
      removeListener();
    }
    this.networkListeners = [];

    // Clear callbacks
    this.stateChangeCallbacks = [];

    // Persist final state
    this.persistQueue();
  }
}

// ============================================================================
// Offline UI Components
// ============================================================================

export interface OfflineIndicatorProps {
  state: OfflineState;
  className?: string;
}

export function OfflineIndicator({
  state,
  className = "",
}: OfflineIndicatorProps) {
  if (!state.isOffline && state.queuedOperations === 0) {
    return null;
  }

  return React.createElement(
    "div",
    {
      className: `flex items-center space-x-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-md text-sm ${className}`,
    },
    [
      React.createElement(
        "div",
        {
          key: "status",
          className: "flex items-center space-x-1",
        },
        [
          state.isOffline
            ? [
                React.createElement("div", {
                  key: "offline-dot",
                  className: "w-2 h-2 bg-red-500 rounded-full",
                }),
                React.createElement(
                  "span",
                  {
                    key: "offline-text",
                    className: "text-orange-800 font-medium",
                  },
                  "Offline",
                ),
              ]
            : [
                React.createElement("div", {
                  key: "syncing-dot",
                  className: "w-2 h-2 bg-yellow-500 rounded-full animate-pulse",
                }),
                React.createElement(
                  "span",
                  {
                    key: "syncing-text",
                    className: "text-orange-800 font-medium",
                  },
                  "Syncing",
                ),
              ],
        ],
      ),

      state.queuedOperations > 0 &&
        React.createElement(
          "span",
          {
            key: "queue-count",
            className: "text-orange-700",
          },
          `${state.queuedOperations} pending change${state.queuedOperations !== 1 ? "s" : ""}`,
        ),

      state.syncInProgress &&
        React.createElement(
          "span",
          {
            key: "sync-status",
            className: "text-orange-700",
          },
          "Synchronizing...",
        ),
    ].filter(Boolean),
  );
}

// ============================================================================
// React Hook
// ============================================================================

export function useOfflineManager(config?: Partial<OfflineConfig>) {
  const [manager] = React.useState(() => new OfflineManager(config));
  const [state, setState] = React.useState<OfflineState>(manager.getState());

  React.useEffect(() => {
    const handleStateChange = (newState: OfflineState) => {
      setState(newState);
    };

    manager.onStateChange(handleStateChange);

    return () => {
      manager.offStateChange(handleStateChange);
      manager.cleanup();
    };
  }, [manager]);

  const queueOperation = React.useCallback(
    (
      type: QueuedOperation["type"],
      entity: QueuedOperation["entity"],
      data: unknown,
      optimisticId?: string,
    ) => {
      return manager.queueOperation(type, entity, data, optimisticId);
    },
    [manager],
  );

  const syncWhenOnline = React.useCallback(() => {
    return manager.syncWhenOnline();
  }, [manager]);

  return {
    state,
    queueOperation,
    syncWhenOnline,
    isOffline: manager.isOffline(),
    canQueue: manager.canQueue(),
    getQueuedOperations: manager.getQueuedOperations.bind(manager),
    clearQueue: manager.clearQueue.bind(manager),
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const offlineManager = new OfflineManager();
