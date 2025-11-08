/**
 * React Hooks for Notification Analytics
 *
 * Provides hooks for tracking notification events and retrieving analytics data
 * with automatic batching, offline support, and real-time updates.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnalyticsQueryParams,
  AnalyticsData,
  DeliveryResult,
  AnalyticsMetric,
} from "../types/notification-service";
import {
  getNotificationAnalyticsService,
  AnalyticsMetrics,
} from "../lib/notification-service/analytics-service";
import { useAuth } from "./useAuth";

// ============================================================================
// Query Keys
// ============================================================================

export const analyticsQueryKeys = {
  all: ["notification-analytics"] as const,
  analytics: (params: AnalyticsQueryParams) =>
    [...analyticsQueryKeys.all, "data", params] as const,
  metrics: () => [...analyticsQueryKeys.all, "metrics"] as const,
  realtime: (params: AnalyticsQueryParams) =>
    [...analyticsQueryKeys.all, "realtime", params] as const,
};

// ============================================================================
// Hook Types
// ============================================================================

export interface UseAnalyticsTrackingResult {
  trackDelivery: (
    notificationId: string,
    result: DeliveryResult,
  ) => Promise<void>;
  trackOpen: (notificationId: string) => Promise<void>;
  trackClick: (notificationId: string, action?: string) => Promise<void>;
  trackDismiss: (notificationId: string) => Promise<void>;
  isTracking: boolean;
  metrics: AnalyticsMetrics;
}

export interface UseAnalyticsDataOptions extends AnalyticsQueryParams {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

export interface UseAnalyticsDataResult {
  data: AnalyticsData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseRealtimeAnalyticsOptions extends AnalyticsQueryParams {
  enabled?: boolean;
  updateInterval?: number;
}

export interface UseRealtimeAnalyticsResult {
  data: AnalyticsData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isConnected: boolean;
  disconnect: () => void;
}

// ============================================================================
// Analytics Tracking Hook
// ============================================================================

/**
 * Hook for tracking notification events
 * Requirements: 5.1, 5.2, 5.3
 */
export function useAnalyticsTracking(): UseAnalyticsTrackingResult {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    eventsQueued: 0,
    eventsSent: 0,
    eventsFailedToSend: 0,
    batchesSent: 0,
    averageBatchSize: 0,
    offlineQueueSize: 0,
  });

  const analyticsService = getNotificationAnalyticsService();

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(analyticsService.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [analyticsService]);

  const trackDelivery = useCallback(
    async (notificationId: string, result: DeliveryResult) => {
      if (!user?.id) return;

      setIsTracking(true);
      try {
        await analyticsService.trackDelivery(
          notificationId,
          String(user.id),
          result,
        );
      } catch (error) {
        console.error("Failed to track delivery:", error);
      } finally {
        setIsTracking(false);
      }
    },
    [user?.id, analyticsService],
  );

  const trackOpen = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;

      setIsTracking(true);
      try {
        await analyticsService.trackOpen(notificationId, String(user.id));
      } catch (error) {
        console.error("Failed to track open:", error);
      } finally {
        setIsTracking(false);
      }
    },
    [user?.id, analyticsService],
  );

  const trackClick = useCallback(
    async (notificationId: string, action?: string) => {
      if (!user?.id) return;

      setIsTracking(true);
      try {
        await analyticsService.trackClick(
          notificationId,
          String(user.id),
          action,
        );
      } catch (error) {
        console.error("Failed to track click:", error);
      } finally {
        setIsTracking(false);
      }
    },
    [user?.id, analyticsService],
  );

  const trackDismiss = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;

      setIsTracking(true);
      try {
        await analyticsService.trackDismiss(notificationId, String(user.id));
      } catch (error) {
        console.error("Failed to track dismiss:", error);
      } finally {
        setIsTracking(false);
      }
    },
    [user?.id, analyticsService],
  );

  return {
    trackDelivery,
    trackOpen,
    trackClick,
    trackDismiss,
    isTracking,
    metrics,
  };
}

// ============================================================================
// Analytics Data Hook
// ============================================================================

/**
 * Hook for fetching analytics data
 * Requirements: 5.4, 5.5
 */
export function useAnalyticsData(
  options: UseAnalyticsDataOptions,
): UseAnalyticsDataResult {
  const {
    enabled = true,
    refetchInterval = 60000, // 1 minute
    staleTime = 30000, // 30 seconds
    ...params
  } = options;

  const query = useQuery({
    queryKey: analyticsQueryKeys.analytics(params),
    queryFn: async () => {
      const analyticsService = getNotificationAnalyticsService();
      return analyticsService.getAnalytics(params);
    },
    enabled,
    refetchInterval,
    staleTime,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// Real-time Analytics Hook
// ============================================================================

/**
 * Hook for real-time analytics updates
 * Requirements: 5.4, 5.5
 */
export function useRealtimeAnalytics(
  options: UseRealtimeAnalyticsOptions,
): UseRealtimeAnalyticsResult {
  const { enabled = true, ...params } = options;

  const [data, setData] = useState<AnalyticsData[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnectRef = useRef<(() => void) | null>(null);
  const analyticsService = getNotificationAnalyticsService();

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    const startRealtimeUpdates = async () => {
      try {
        const cleanup = await analyticsService.getRealtimeAnalytics(
          params,
          (newData) => {
            if (isMounted) {
              setData(newData);
              setIsLoading(false);
              setIsConnected(true);
            }
          },
        );

        disconnectRef.current = cleanup;
      } catch (err) {
        if (isMounted) {
          setIsError(true);
          setError(err as Error);
          setIsLoading(false);
          setIsConnected(false);
        }
      }
    };

    startRealtimeUpdates();

    return () => {
      isMounted = false;
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, analyticsService, params]);

  const disconnect = useCallback(() => {
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    isConnected,
    disconnect,
  };
}

// ============================================================================
// Analytics Metrics Hook
// ============================================================================

/**
 * Hook for monitoring analytics service metrics
 * Requirements: 5.1, 5.3
 */
export function useAnalyticsMetrics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    eventsQueued: 0,
    eventsSent: 0,
    eventsFailedToSend: 0,
    batchesSent: 0,
    averageBatchSize: 0,
    offlineQueueSize: 0,
  });

  const analyticsService = getNotificationAnalyticsService();

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(analyticsService.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000); // Update every second

    return () => clearInterval(interval);
  }, [analyticsService]);

  const resetMetrics = useCallback(() => {
    analyticsService.resetMetrics();
    setMetrics(analyticsService.getMetrics());
  }, [analyticsService]);

  const flush = useCallback(async () => {
    await analyticsService.flush();
  }, [analyticsService]);

  return {
    metrics,
    resetMetrics,
    flush,
  };
}

// ============================================================================
// Automatic Event Tracking Hook
// ============================================================================

/**
 * Hook that automatically tracks notification interactions
 * Requirements: 5.1, 5.2
 */
export function useAutoAnalyticsTracking() {
  const { trackOpen, trackClick, trackDismiss } = useAnalyticsTracking();

  // Create event handlers that can be attached to notification components
  const createTrackingHandlers = useCallback(
    (notificationId: string) => {
      return {
        onOpen: () => trackOpen(notificationId),
        onClick: (action?: string) => trackClick(notificationId, action),
        onDismiss: () => trackDismiss(notificationId),

        // Convenience handlers for common actions
        onView: () => trackOpen(notificationId),
        onRead: () => trackClick(notificationId, "read"),
        onArchive: () => trackClick(notificationId, "archive"),
        onDelete: () => trackClick(notificationId, "delete"),
        onClose: () => trackDismiss(notificationId),
      };
    },
    [trackOpen, trackClick, trackDismiss],
  );

  return {
    createTrackingHandlers,
  };
}

// ============================================================================
// Analytics Summary Hook
// ============================================================================

/**
 * Hook for getting analytics summary data
 * Requirements: 5.4, 5.5
 */
export function useAnalyticsSummary(
  params: Omit<AnalyticsQueryParams, "metrics"> & {
    metrics?: AnalyticsMetric[];
  },
) {
  const defaultMetrics: AnalyticsMetric[] = [
    "delivery_rate",
    "open_rate",
    "click_rate",
    "conversion_rate",
  ];

  const analyticsParams: AnalyticsQueryParams = {
    ...params,
    metrics: params.metrics || defaultMetrics,
  };

  const { data, isLoading, isError, error, refetch } =
    useAnalyticsData(analyticsParams);

  // Calculate summary statistics
  const summary = data
    ? {
        totalNotifications: data.length,
        totalDeliveries: data.length,
        totalOpens: data.length,
        totalClicks: data.length,
        averageDeliveryRate:
          data.length > 0
            ? data.reduce(
                (sum, item) => sum + (item.metrics.delivery_rate || 0),
                0,
              ) / data.length
            : 0,
        averageOpenRate:
          data.length > 0
            ? data.reduce(
                (sum, item) => sum + (item.metrics.open_rate || 0),
                0,
              ) / data.length
            : 0,
        averageClickRate:
          data.length > 0
            ? data.reduce(
                (sum, item) => sum + (item.metrics.click_rate || 0),
                0,
              ) / data.length
            : 0,
        averageConversionRate:
          data.length > 0
            ? data.reduce(
                (sum, item) => sum + (item.metrics.conversion_rate || 0),
                0,
              ) / data.length
            : 0,
      }
    : null;

  return {
    data,
    summary,
    isLoading,
    isError,
    error,
    refetch,
  };
}
