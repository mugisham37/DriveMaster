/**
 * Content Sync Indicator Component
 *
 * Displays real-time synchronization status, conflict notifications,
 * and provides controls for manual sync and conflict resolution.
 *
 * Requirements: 9.2, 9.4
 */

"use client";

import React, { useState } from "react";
import {
  useContentSync,
  useWebSocketConnection,
} from "../../hooks/use-real-time-content";

// ============================================================================
// Types
// ============================================================================

export interface ContentSyncIndicatorProps {
  itemId: string;
  enabled?: boolean;
  showDetails?: boolean;
  autoSync?: boolean;
  className?: string;
}

export interface SyncStatusBadgeProps {
  status: "synced" | "syncing" | "conflict" | "error" | "offline";
  showText?: boolean;
  className?: string;
}

export interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (strategy: "local_wins" | "remote_wins" | "merge") => void;
  conflictDetails?: {
    localChanges: number;
    remoteChanges: number;
    lastSync: Date;
  };
}

// ============================================================================
// Sync Status Badge Component
// ============================================================================

export function SyncStatusBadge({
  status,
  showText = false,
  className = "",
}: SyncStatusBadgeProps) {
  const statusConfig = {
    synced: {
      color: "bg-green-500",
      text: "Synced",
      textColor: "text-green-700",
      icon: "✓",
    },
    syncing: {
      color: "bg-blue-500 animate-pulse",
      text: "Syncing...",
      textColor: "text-blue-700",
      icon: "↻",
    },
    conflict: {
      color: "bg-yellow-500",
      text: "Conflict",
      textColor: "text-yellow-700",
      icon: "⚠",
    },
    error: {
      color: "bg-red-500",
      text: "Error",
      textColor: "text-red-700",
      icon: "✗",
    },
    offline: {
      color: "bg-gray-500",
      text: "Offline",
      textColor: "text-gray-700",
      icon: "○",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      {showText && (
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Conflict Resolution Modal Component
// ============================================================================

export function ConflictResolutionModal({
  isOpen,
  onClose,
  onResolve,
  conflictDetails,
}: ConflictResolutionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm">
            ⚠
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Content Conflict Detected
          </h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            The content has been modified by another user while you were
            editing. Please choose how to resolve this conflict:
          </p>

          {conflictDetails && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Your changes:</span>
                <span className="font-medium">
                  {conflictDetails.localChanges}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remote changes:</span>
                <span className="font-medium">
                  {conflictDetails.remoteChanges}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last sync:</span>
                <span className="font-medium">
                  {conflictDetails.lastSync.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onResolve("local_wins")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Keep My Changes
          </button>

          <button
            onClick={() => onResolve("remote_wins")}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept Remote Changes
          </button>

          <button
            onClick={() => onResolve("merge")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try to Merge Changes
          </button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Content Sync Indicator Component
// ============================================================================

export function ContentSyncIndicator({
  itemId,
  enabled = true,
  showDetails = false,
  autoSync = true,
  className = "",
}: ContentSyncIndicatorProps) {
  const { content, isLoading, hasConflicts, lastSync, sync, resolveConflicts } =
    useContentSync({
      itemId,
      enabled,
      enableOptimisticUpdates: true,
    });

  const { isConnected, connectionState } = useWebSocketConnection();

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Determine sync status
  const getSyncStatus = ():
    | "synced"
    | "syncing"
    | "conflict"
    | "error"
    | "offline" => {
    if (!isConnected) return "offline";
    if (hasConflicts) return "conflict";
    if (isLoading || isManualSyncing) return "syncing";
    if (lastSync) return "synced";
    return "error";
  };

  const syncStatus = getSyncStatus();

  // Handle manual sync
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await sync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Handle conflict resolution
  const handleConflictResolve = async (
    strategy: "local_wins" | "remote_wins" | "merge",
  ) => {
    try {
      await resolveConflicts(strategy);
      setShowConflictModal(false);
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    }
  };

  // Show conflict modal when conflicts are detected
  React.useEffect(() => {
    if (hasConflicts && enabled) {
      setShowConflictModal(true);
    }
  }, [hasConflicts, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Sync status badge */}
        <SyncStatusBadge status={syncStatus} showText={showDetails} />

        {/* Manual sync button */}
        {isConnected && (
          <button
            onClick={handleManualSync}
            disabled={isLoading || isManualSyncing}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            title="Manual sync"
          >
            <svg
              className={`w-4 h-4 ${isManualSyncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}

        {/* Conflict indicator */}
        {hasConflicts && (
          <button
            onClick={() => setShowConflictModal(true)}
            className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full hover:bg-yellow-200 transition-colors"
          >
            Resolve Conflict
          </button>
        )}

        {/* Details */}
        {showDetails && (
          <div className="text-xs text-gray-500">
            {lastSync && (
              <span>Last sync: {lastSync.toLocaleTimeString()}</span>
            )}
            {!isConnected && (
              <span className="text-red-600">
                Offline - changes will sync when reconnected
              </span>
            )}
          </div>
        )}
      </div>

      {/* Conflict resolution modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onResolve={handleConflictResolve}
        conflictDetails={
          lastSync
            ? {
                localChanges: 1, // Would be calculated from actual changes
                remoteChanges: 1, // Would be calculated from actual changes
                lastSync,
              }
            : undefined
        }
      />
    </>
  );
}

// ============================================================================
// Connection Status Indicator Component
// ============================================================================

export interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatusIndicator({
  showDetails = false,
  className = "",
}: ConnectionStatusIndicatorProps) {
  const { isConnected, connectionState, connectionStats } =
    useWebSocketConnection();

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "text-green-600";
      case "connecting":
      case "reconnecting":
        return "text-yellow-600";
      case "disconnected":
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "reconnecting":
        return "Reconnecting...";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Connection Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
      />

      {showDetails && (
        <div className="text-xs">
          <span className={getStatusColor()}>{getStatusText()}</span>

          {connectionStats && isConnected && (
            <div className="text-gray-500 mt-1">
              Latency: {Math.round(connectionStats.averageLatency)}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Real-time Status Bar Component
// ============================================================================

export interface RealTimeStatusBarProps {
  itemId: string;
  enabled?: boolean;
  showSync?: boolean;
  showConnection?: boolean;
  showPresence?: boolean;
  className?: string;
}

export function RealTimeStatusBar({
  itemId,
  enabled = true,
  showSync = true,
  showConnection = true,
  showPresence = true,
  className = "",
}: RealTimeStatusBarProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between p-2 bg-gray-50 border-t text-sm ${className}`}
    >
      <div className="flex items-center space-x-4">
        {showSync && (
          <ContentSyncIndicator
            itemId={itemId}
            enabled={enabled}
            showDetails={true}
          />
        )}

        {showConnection && <ConnectionStatusIndicator showDetails={true} />}
      </div>

      <div className="flex items-center space-x-4">
        {showPresence && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Active users:</span>
            {/* PresenceIndicator would be imported and used here */}
          </div>
        )}
      </div>
    </div>
  );
}
