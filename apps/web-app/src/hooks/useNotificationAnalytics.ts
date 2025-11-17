/**
 * Notification Analytics Hook
 *
 * Provides hooks for analytics data fetching, engagement tracking,
 * and data transformation for charts and reports.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { notificationApiClient } from "@/lib/notification-service";
import { useAuth } from "./useAuth";
import { requireStringUserId } from "@/utils/user-id-helpers";
import type {
  AnalyticsQueryParams,
  AnalyticsData,
  DeliveryResult,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Query Keys
// ============================================================================

export const analyticsQueryKeys = {
  all: ["notificationAnalytics"] as const,
  data: (params: AnalyticsQueryParams) =>
    [...analyticsQueryKeys.all, "data", params] as const,
  delivery: (params: AnalyticsQueryParams) =>
    [...analyticsQueryKeys.all, "delivery", params] as const,
  engagement: (params: AnalyticsQueryParams) =>
    [...analyticsQueryKeys.all, "engagement", params] as const,
  summary: (userId?: string) =>
    [...analyticsQueryKeys.all, "summary", userId] as const,
};

// ============================================================================
// Analytics Data Hook
// ============================================================================

export interface UseNotificationAnalyticsOptions extends AnalyticsQueryParams {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseNotificationAnalyticsResult {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;
  refetch: () => void;
  // Computed metrics
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  engagementScore: number;
}

/**
 * Hook for fetching notification analytics data
 * Requirements: 14.1, 14.2, 14.3
 */
export function useNotificationAnalytics(
  options: UseNotificationAnalyticsOptions,
): UseNotificationAnalyticsResult {
  const { enabled = true, refetchInterval, ...params } = options;

  const query = useQuery({
    queryKey: analyticsQueryKeys.data(params),
    queryFn: () => notificationApiClient.getAnalytics(params),
    enabled,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    ...(refetchInterval && { refetchInterval }),
  });

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    if (!query.data || query.data.length === 0) {
      return {
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        engagementScore: 0,
      };
    }

    const totals = query.data.reduce(
      (acc, data) => {
        const metrics = data.metrics as Record<string, number>;
        return {
          sent: acc.sent + (metrics.sent || 0),
          delivered: acc.delivered + (metrics.delivered || 0),
          opened: acc.opened + (metrics.opened || 0),
          clicked: acc.clicked + (metrics.clicked || 0),
        };
      },
      { sent: 0, delivered: 0, opened: 0, clicked: 0 },
    );

    const deliveryRate =
      totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0;
    const openRate =
      totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0;
    const clickRate =
      totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0;

    // Engagement score: weighted average of open and click rates
    const engagementScore = openRate * 0.6 + clickRate * 0.4;

    return {
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
    };
  }, [query.data]);

  return {
    analyticsData: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
    ...metrics,
  };
}

// ============================================================================
// Analytics Tracking Hook
// ============================================================================

export interface UseAnalyticsTrackingResult {
  trackDelivery: (
    notificationId: string,
    result: DeliveryResult,
  ) => Promise<void>;
  trackOpen: (notificationId: string) => Promise<void>;
  trackClick: (notificationId: string, action?: string) => Promise<void>;
  isTracking: boolean;
}

/**
 * Hook for tracking notification engagement events
 * Requirements: 14.4, 14.5
 */
export function useAnalyticsTracking(): UseAnalyticsTrackingResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const trackDeliveryMutation = useMutation({
    mutationFn: ({
      notificationId,
      result,
    }: {
      notificationId: string;
      result: DeliveryResult;
    }) => notificationApiClient.trackDelivery(notificationId, result),
    onSuccess: () => {
      // Invalidate analytics queries
      queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys.all,
      });
    },
  });

  const trackOpenMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return notificationApiClient.trackOpen(
        notificationId,
        requireStringUserId(user.id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys.all,
      });
    },
  });

  const trackClickMutation = useMutation({
    mutationFn: ({
      notificationId,
      action,
    }: {
      notificationId: string;
      action?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return notificationApiClient.trackClick(
        notificationId,
        requireStringUserId(user.id),
        action,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys.all,
      });
    },
  });

  return {
    trackDelivery: (notificationId: string, result: DeliveryResult) =>
      trackDeliveryMutation.mutateAsync({ notificationId, result }),
    trackOpen: trackOpenMutation.mutateAsync,
    trackClick: (notificationId: string, action?: string) =>
      trackClickMutation.mutateAsync({ notificationId, action: action || undefined }),
    isTracking:
      trackDeliveryMutation.isPending ||
      trackOpenMutation.isPending ||
      trackClickMutation.isPending,
  };
}

// ============================================================================
// Chart Data Transformation Hook
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp?: Date;
}

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface UseChartDataTransformResult {
  transformForLineChart: (
    data: AnalyticsData[],
    metrics: string[],
  ) => TimeSeriesData;
  transformForBarChart: (
    data: AnalyticsData[],
    metric: string,
    groupBy?: string,
  ) => ChartDataPoint[];
  transformForPieChart: (
    data: AnalyticsData[],
    metric: string,
  ) => ChartDataPoint[];
  calculateTrend: (data: number[]) => {
    direction: "up" | "down" | "stable";
    percentage: number;
  };
}

/**
 * Hook for transforming analytics data for chart visualization
 * Requirements: 14.2, 14.3, 14.5
 */
export function useChartDataTransform(): UseChartDataTransformResult {
  const transformForLineChart = useCallback(
    (data: AnalyticsData[], metrics: string[]): TimeSeriesData => {
      const labels = data.map((d) => d.period);

      const datasets = metrics.map((metric) => ({
        label: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: data.map((d) => d.metrics[metric] || 0),
      }));

      return { labels, datasets };
    },
    [],
  );

  const transformForBarChart = useCallback(
    (
      data: AnalyticsData[],
      metric: string,
      groupBy?: string,
    ): ChartDataPoint[] => {
      if (groupBy && data[0]?.breakdown) {
        // Group by breakdown category
        const breakdown = data[0].breakdown;
        return Object.entries(breakdown).map(([key, values]) => ({
          label: key,
          value: values[metric] || 0,
        }));
      }

      // Default: one bar per period
      return data.map((d) => ({
        label: d.period,
        value: d.metrics[metric] || 0,
      }));
    },
    [],
  );

  const transformForPieChart = useCallback(
    (data: AnalyticsData[], metric: string): ChartDataPoint[] => {
      if (data.length === 0 || !data[0].breakdown) {
        return [];
      }

      const breakdown = data[0].breakdown;
      return Object.entries(breakdown).map(([key, values]) => ({
        label: key,
        value: values[metric] || 0,
      }));
    },
    [],
  );

  const calculateTrend = useCallback(
    (data: number[]): { direction: "up" | "down" | "stable"; percentage: number } => {
      if (data.length < 2) {
        return { direction: "stable", percentage: 0 };
      }

      const first = data[0];
      const last = data[data.length - 1];

      if (first === 0) {
        return { direction: last > 0 ? "up" : "stable", percentage: 0 };
      }

      const percentage = ((last - first) / first) * 100;

      if (Math.abs(percentage) < 5) {
        return { direction: "stable", percentage: 0 };
      }

      return {
        direction: percentage > 0 ? "up" : "down",
        percentage: Math.abs(Math.round(percentage * 100) / 100),
      };
    },
    [],
  );

  return {
    transformForLineChart,
    transformForBarChart,
    transformForPieChart,
    calculateTrend,
  };
}

// ============================================================================
// Analytics Summary Hook
// ============================================================================

export interface AnalyticsSummary {
  totalNotifications: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  engagementScore: number;
  topPerformingType: string;
  topPerformingChannel: string;
  trend: {
    direction: "up" | "down" | "stable";
    percentage: number;
  };
}

export interface UseAnalyticsSummaryResult {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;
  refetch: () => void;
}

/**
 * Hook for fetching analytics summary with key metrics
 * Requirements: 14.1, 14.2, 14.3
 */
export function useAnalyticsSummary(
  params: AnalyticsQueryParams = {},
): UseAnalyticsSummaryResult {
  const { user } = useAuth();
  const { calculateTrend } = useChartDataTransform();

  const query = useQuery({
    queryKey: analyticsQueryKeys.summary(user?.id?.toString()),
    queryFn: async () => {
      const data = await notificationApiClient.getAnalytics({
        ...params,
        userId: user?.id?.toString(),
      });

      if (data.length === 0) {
        return null;
      }

      // Calculate totals
      const totals = data.reduce(
        (acc, d) => ({
          sent: acc.sent + (d.metrics.sent || 0),
          delivered: acc.delivered + (d.metrics.delivered || 0),
          opened: acc.opened + (d.metrics.opened || 0),
          clicked: acc.clicked + (d.metrics.clicked || 0),
        }),
        { sent: 0, delivered: 0, opened: 0, clicked: 0 },
      );

      const deliveryRate =
        totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0;
      const openRate =
        totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0;
      const clickRate =
        totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0;
      const engagementScore = openRate * 0.6 + clickRate * 0.4;

      // Find top performing type and channel
      let topPerformingType = "N/A";
      const topPerformingChannel = "N/A";

      if (data[0]?.breakdown) {
        const breakdown = data[0].breakdown;

        // Find type with highest engagement
        const typeEngagement = Object.entries(breakdown).map(([key, values]) => {
          const typeOpenRate =
            values.delivered > 0 ? (values.opened / values.delivered) * 100 : 0;
          const typeClickRate =
            values.opened > 0 ? (values.clicked / values.opened) * 100 : 0;
          return {
            type: key,
            score: typeOpenRate * 0.6 + typeClickRate * 0.4,
          };
        });

        if (typeEngagement.length > 0) {
          topPerformingType = typeEngagement.sort((a, b) => b.score - a.score)[0]
            .type;
        }
      }

      // Calculate trend
      const sentOverTime = data.map((d) => d.metrics.sent || 0);
      const trend = calculateTrend(sentOverTime);

      const summary: AnalyticsSummary = {
        totalNotifications: totals.sent,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        engagementScore: Math.round(engagementScore * 100) / 100,
        topPerformingType,
        topPerformingChannel,
        trend,
      };

      return summary;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  return {
    summary: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

export interface UseAnalyticsExportResult {
  exportToCSV: (data: AnalyticsData[], filename?: string) => void;
  exportToJSON: (data: AnalyticsData[], filename?: string) => void;
}

/**
 * Hook for exporting analytics data
 * Requirements: 14.5
 */
export function useAnalyticsExport(): UseAnalyticsExportResult {
  const exportToCSV = useCallback(
    (data: AnalyticsData[], filename: string = "analytics.csv") => {
      if (data.length === 0) return;

      // Create CSV header
      const headers = ["Period", ...Object.keys(data[0].metrics)];
      const csvContent = [
        headers.join(","),
        ...data.map((d) =>
          [d.period, ...Object.values(d.metrics)].join(","),
        ),
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const exportToJSON = useCallback(
    (data: AnalyticsData[], filename: string = "analytics.json") => {
      const jsonContent = JSON.stringify(data, null, 2);

      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  return {
    exportToCSV,
    exportToJSON,
  };
}
