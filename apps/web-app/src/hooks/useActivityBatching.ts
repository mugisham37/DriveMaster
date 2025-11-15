/**
 * Activity Batching Hook
 * 
 * Batches activity recording operations to reduce API calls.
 * Sends at most one request every 5 seconds or when 10 activities are queued.
 * 
 * Requirements: 9.11 (batch activity recording)
 * Task: 12.7
 */

import { useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userServiceClient } from '@/lib/user-service';
import { queryKeys } from '@/lib/cache/user-service-cache';
import type { ActivityRecord } from '@/types/user-service';

interface BatchConfig {
  maxBatchSize?: number;
  maxWaitTime?: number; // milliseconds
}

const DEFAULT_CONFIG: Required<BatchConfig> = {
  maxBatchSize: 10,
  maxWaitTime: 5000, // 5 seconds
};

/**
 * Hook for batching activity records to optimize API calls
 * 
 * Usage:
 * ```tsx
 * const { recordActivity, flush, queueSize } = useActivityBatching(userId);
 * 
 * // Record activities - they will be batched automatically
 * recordActivity({
 *   activityType: 'exercise_completed',
 *   metadata: { exerciseId: '123' }
 * });
 * 
 * // Manually flush the queue if needed
 * flush();
 * ```
 */
export function useActivityBatching(
  userId: string,
  config: BatchConfig = {}
) {
  const queryClient = useQueryClient();
  const { maxBatchSize, maxWaitTime } = { ...DEFAULT_CONFIG, ...config };

  // Queue for pending activities
  const queueRef = useRef<Pick<ActivityRecord, 'activityType' | 'metadata'>[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushing = useRef(false);

  // Mutation for sending batched activities
  const { mutate: sendBatch, isPending } = useMutation({
    mutationFn: async (activities: Pick<ActivityRecord, 'activityType' | 'metadata'>[]) => {
      // Record activities in batch
      const promises = activities.map(activity =>
        userServiceClient.recordActivity({
          ...activity,
          userId,
          id: `activity-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          deviceType: 'web',
          appVersion: '1.0.0',
          platform: navigator.platform || 'unknown',
          userAgent: navigator.userAgent || 'unknown',
          ipAddress: 'unknown', // This would typically be set by the server
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate activity-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.userActivity(userId),
      });
    },
    onError: (error: Error) => {
      console.error('Failed to send activity batch:', error);
      // Could implement retry logic here
    },
  });

  // Flush the queue and send activities
  const flush = useCallback(() => {
    if (isFlushing.current || queueRef.current.length === 0) {
      return;
    }

    isFlushing.current = true;

    // Clear any pending timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Get activities to send
    const activitiesToSend = [...queueRef.current];
    queueRef.current = [];

    // Send the batch
    sendBatch(activitiesToSend);

    isFlushing.current = false;
  }, [sendBatch]);

  // Schedule a flush
  const scheduleFl = useCallback(() => {
    if (timerRef.current) {
      return; // Timer already scheduled
    }

    timerRef.current = setTimeout(() => {
      flush();
      timerRef.current = null;
    }, maxWaitTime);
  }, [flush, maxWaitTime]);

  // Record an activity (adds to queue)
  const recordActivity = useCallback(
    (activity: Pick<ActivityRecord, 'activityType' | 'metadata'>) => {
      // Add to queue
      queueRef.current.push(activity);

      // Check if we should flush immediately
      if (queueRef.current.length >= maxBatchSize) {
        flush();
      } else {
        // Schedule a flush if not already scheduled
        scheduleFl();
      }
    },
    [maxBatchSize, flush, scheduleFl]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush any remaining activities on unmount
      if (queueRef.current.length > 0) {
        flush();
      }

      // Clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [flush]);

  // Flush on page visibility change (user leaving page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && queueRef.current.length > 0) {
        flush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flush]);

  return {
    recordActivity,
    flush,
    queueSize: queueRef.current.length,
    isPending,
  };
}

/**
 * Helper hook for recording specific activity types
 * 
 * Usage:
 * ```tsx
 * const { recordExerciseCompletion, recordPageView } = useActivityRecorder(userId);
 * 
 * recordExerciseCompletion('exercise-123', 95);
 * recordPageView('/profile');
 * ```
 */
export function useActivityRecorder(userId: string) {
  const { recordActivity } = useActivityBatching(userId);

  const recordExerciseCompletion = useCallback(
    (exerciseId: string, score: number) => {
      recordActivity({
        activityType: 'exercise_complete',
        metadata: {
          exerciseId,
          score,
          completedAt: new Date().toISOString(),
        },
      });
    },
    [recordActivity]
  );

  const recordPageView = useCallback(
    (path: string) => {
      recordActivity({
        activityType: 'navigation',
        metadata: {
          path,
          viewedAt: new Date().toISOString(),
        },
      });
    },
    [recordActivity]
  );

  const recordFeatureUsage = useCallback(
    (featureName: string, action: string) => {
      recordActivity({
        activityType: 'navigation',
        metadata: {
          featureName,
          action,
          usedAt: new Date().toISOString(),
        },
      });
    },
    [recordActivity]
  );

  const recordSessionStart = useCallback(() => {
    recordActivity({
      activityType: 'session_start',
      metadata: {
        startedAt: new Date().toISOString(),
      },
    });
  }, [recordActivity]);

  const recordSessionEnd = useCallback(
    (duration: number) => {
      recordActivity({
        activityType: 'session_end',
        metadata: {
          duration,
          endedAt: new Date().toISOString(),
        },
      });
    },
    [recordActivity]
  );

  return {
    recordExerciseCompletion,
    recordPageView,
    recordFeatureUsage,
    recordSessionStart,
    recordSessionEnd,
  };
}
