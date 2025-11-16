"use client";

/**
 * Cross-Tab Synchronization Context
 * 
 * Provides cross-tab synchronization at the application level:
 * - Manages BroadcastChannel for cross-tab communication
 * - Provides broadcast functions to child components
 * - Handles message routing and processing
 * 
 * Requirements: 10.1, 10.2
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCrossTabSync, type ProgressBroadcastMessage } from '@/hooks/useCrossTabSync';

// ============================================================================
// Context Types
// ============================================================================

export interface CrossTabSyncContextValue {
  isEnabled: boolean;
  tabId: string;
  broadcast: (type: ProgressBroadcastMessage['type'], data: unknown) => void;
  broadcastProgressUpdate: (data: unknown) => void;
  broadcastMilestoneAchieved: (data: unknown) => void;
  broadcastStreakUpdate: (data: unknown) => void;
  broadcastActivityRecorded: (data: unknown) => void;
}

const CrossTabSyncContext = createContext<CrossTabSyncContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface CrossTabSyncProviderProps {
  children: ReactNode;
  enabled?: boolean;
  channelName?: string;
  onMessage?: (message: ProgressBroadcastMessage) => void;
  onError?: (error: Error) => void;
}

export function CrossTabSyncProvider({ 
  children, 
  enabled = true,
  channelName,
  onMessage,
  onError,
}: CrossTabSyncProviderProps) {
  const {
    isEnabled,
    tabId,
    broadcast,
    broadcastProgressUpdate,
    broadcastMilestoneAchieved,
    broadcastStreakUpdate,
    broadcastActivityRecorded,
  } = useCrossTabSync({
    enabled,
    ...(channelName && { channelName }),
    ...(onMessage && { onMessage }),
    ...(onError && { onError }),
  });

  const contextValue: CrossTabSyncContextValue = {
    isEnabled,
    tabId,
    broadcast,
    broadcastProgressUpdate,
    broadcastMilestoneAchieved,
    broadcastStreakUpdate,
    broadcastActivityRecorded,
  };

  return (
    <CrossTabSyncContext.Provider value={contextValue}>
      {children}
    </CrossTabSyncContext.Provider>
  );
}

// ============================================================================
// Hook to use CrossTabSync context
// ============================================================================

export function useCrossTabSyncContext(): CrossTabSyncContextValue {
  const context = useContext(CrossTabSyncContext);

  if (!context) {
    throw new Error('useCrossTabSyncContext must be used within a CrossTabSyncProvider');
  }

  return context;
}
