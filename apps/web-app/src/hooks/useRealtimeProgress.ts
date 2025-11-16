/**
 * Real-time Progress Updates Hook
 * 
 * Subscribes to user-specific progress updates via WebSocket:
 * - Subscribes to progress channel on mount
 * - Listens for progress update messages
 * - Updates ProgressContext when messages received
 * - Handles message parsing errors
 * 
 * Requirements: 10.3, 10.4
 */

import { useEffect } from 'react';
import { useProgress } from '@/contexts/ProgressContext';

export interface UseRealtimeProgressOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to subscribe to real-time progress updates
 * 
 * This hook leverages the existing ProgressContext's real-time subscription system.
 * The ProgressContext already handles WebSocket connections via ProgressChannel.
 */
export function useRealtimeProgress(options: UseRealtimeProgressOptions = {}) {
  const {
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { 
    subscribeToProgressUpdates, 
    unsubscribeFromProgressUpdates,
    state 
  } = useProgress();

  // Subscribe to progress updates on mount
  useEffect(() => {
    if (!enabled) {
      return;
    }

    try {
      subscribeToProgressUpdates();
      console.log('[useRealtimeProgress] Subscribed to progress updates');
      onConnect?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to subscribe');
      console.error('[useRealtimeProgress] Subscription error:', errorObj);
      onError?.(errorObj);
    }

    // Cleanup: unsubscribe on unmount
    return () => {
      try {
        unsubscribeFromProgressUpdates();
        console.log('[useRealtimeProgress] Unsubscribed from progress updates');
        onDisconnect?.();
      } catch (error) {
        console.error('[useRealtimeProgress] Unsubscribe error:', error);
      }
    };
  }, [enabled, subscribeToProgressUpdates, unsubscribeFromProgressUpdates, onConnect, onDisconnect, onError]);

  return {
    isConnected: state.isRealTimeConnected,
    isSubscribed: state.isRealTimeConnected,
  };
}
