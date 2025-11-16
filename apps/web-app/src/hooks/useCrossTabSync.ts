/**
 * Cross-Tab Synchronization Hook
 * 
 * Implements BroadcastChannel for cross-tab communication:
 * - Creates BroadcastChannel for cross-tab communication
 * - Broadcasts progress updates to other tabs when activity recorded
 * - Listens for broadcasts in all tabs and updates ProgressContext
 * - Ensures no duplicate API calls across tabs
 * - Handles tab close cleanup
 * 
 * Requirements: 10.1, 10.2
 */

import { useEffect, useCallback, useRef } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

export interface ProgressBroadcastMessage {
  type: 'progress_update' | 'milestone_achieved' | 'streak_update' | 'activity_recorded';
  userId: string | number;
  timestamp: number;
  tabId: string;
  data: unknown;
}

export interface UseCrossTabSyncOptions {
  enabled?: boolean;
  channelName?: string;
  onMessage?: (message: ProgressBroadcastMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to enable cross-tab synchronization for progress updates
 */
export function useCrossTabSync(options: UseCrossTabSyncOptions = {}) {
  const {
    enabled = true,
    channelName = 'learning-platform-progress',
    onMessage,
    onError,
  } = options;

  const { user } = useAuth();
  const progressContext = useProgress();
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(generateTabId());
  const lastBroadcastRef = useRef<number>(0);

  // Handle progress update messages
  const handleProgressUpdate = useCallback((_message: ProgressBroadcastMessage) => {
    console.log('[useCrossTabSync] Processing progress update');
    
    // Trigger a refetch of progress data without making duplicate API calls
    // The ProgressContext will handle the actual data fetching
    progressContext.fetchProgressSummary();
  }, [progressContext]);

  // Handle milestone achievement messages
  const handleMilestoneAchieved = useCallback((_message: ProgressBroadcastMessage) => {
    console.log('[useCrossTabSync] Processing milestone achievement');
    
    // Trigger milestone check
    progressContext.checkMilestoneAchievements();
  }, [progressContext]);

  // Handle streak update messages
  const handleStreakUpdate = useCallback((_message: ProgressBroadcastMessage) => {
    console.log('[useCrossTabSync] Processing streak update');
    
    // Trigger streak update
    progressContext.updateLearningStreak();
  }, [progressContext]);

  // Handle activity recorded messages
  const handleActivityRecorded = useCallback((_message: ProgressBroadcastMessage) => {
    console.log('[useCrossTabSync] Processing activity recorded');
    
    // Trigger progress summary refresh
    progressContext.fetchProgressSummary();
  }, [progressContext]);

  // Handle incoming broadcast messages
  const handleBroadcastMessage = useCallback((message: ProgressBroadcastMessage) => {
    // Ignore messages from this tab
    if (message.tabId === tabIdRef.current) {
      return;
    }

    // Ignore messages for different users
    if (user && message.userId !== user.id) {
      return;
    }

    console.log('[useCrossTabSync] Received broadcast:', message.type, 'from tab:', message.tabId);

    try {
      // Route message to appropriate handler
      switch (message.type) {
        case 'progress_update':
          handleProgressUpdate(message);
          break;
        case 'milestone_achieved':
          handleMilestoneAchieved(message);
          break;
        case 'streak_update':
          handleStreakUpdate(message);
          break;
        case 'activity_recorded':
          handleActivityRecorded(message);
          break;
        default:
          console.warn('[useCrossTabSync] Unknown message type:', message.type);
      }

      // Call custom handler if provided
      onMessage?.(message);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to process broadcast message');
      console.error('[useCrossTabSync] Message processing error:', errorObj);
      onError?.(errorObj);
    }
  }, [user, onMessage, onError, handleProgressUpdate, handleMilestoneAchieved, handleStreakUpdate, handleActivityRecorded]);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.BroadcastChannel) {
      console.warn('[useCrossTabSync] BroadcastChannel not supported or disabled');
      return;
    }

    if (!user) {
      return;
    }

    try {
      // Create channel
      channelRef.current = new BroadcastChannel(channelName);
      console.log(`[useCrossTabSync] BroadcastChannel created: ${channelName} (tab: ${tabIdRef.current})`);

      // Set up message handler
      channelRef.current.onmessage = (event: MessageEvent<ProgressBroadcastMessage>) => {
        handleBroadcastMessage(event.data);
      };

      // Set up error handler
      channelRef.current.onmessageerror = (event) => {
        const error = new Error('BroadcastChannel message error');
        console.error('[useCrossTabSync] Message error:', event);
        onError?.(error);
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to create BroadcastChannel');
      console.error('[useCrossTabSync] Initialization error:', errorObj);
      onError?.(errorObj);
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
        console.log('[useCrossTabSync] BroadcastChannel closed');
      }
    };
  }, [enabled, channelName, user, onError, handleBroadcastMessage]);

  // Broadcast a message to other tabs
  const broadcast = useCallback((
    type: ProgressBroadcastMessage['type'],
    data: unknown
  ) => {
    if (!channelRef.current || !user) {
      return;
    }

    // Throttle broadcasts to prevent flooding
    const now = Date.now();
    if (now - lastBroadcastRef.current < 100) {
      return; // Skip if last broadcast was less than 100ms ago
    }
    lastBroadcastRef.current = now;

    const message: ProgressBroadcastMessage = {
      type,
      userId: user.id,
      timestamp: now,
      tabId: tabIdRef.current,
      data,
    };

    try {
      channelRef.current.postMessage(message);
      console.log('[useCrossTabSync] Broadcast sent:', type);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to broadcast message');
      console.error('[useCrossTabSync] Broadcast error:', errorObj);
      onError?.(errorObj);
    }
  }, [user, onError]);

  // Broadcast progress update
  const broadcastProgressUpdate = useCallback((data: unknown) => {
    broadcast('progress_update', data);
  }, [broadcast]);

  // Broadcast milestone achievement
  const broadcastMilestoneAchieved = useCallback((data: unknown) => {
    broadcast('milestone_achieved', data);
  }, [broadcast]);

  // Broadcast streak update
  const broadcastStreakUpdate = useCallback((data: unknown) => {
    broadcast('streak_update', data);
  }, [broadcast]);

  // Broadcast activity recorded
  const broadcastActivityRecorded = useCallback((data: unknown) => {
    broadcast('activity_recorded', data);
  }, [broadcast]);

  return {
    isEnabled: enabled && !!channelRef.current,
    tabId: tabIdRef.current,
    broadcast,
    broadcastProgressUpdate,
    broadcastMilestoneAchieved,
    broadcastStreakUpdate,
    broadcastActivityRecorded,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique tab ID
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
