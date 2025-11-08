/**
 * Analytics Service Client Implementation
 *
 * Provides high-level interface for all analytics-dashboard service operations
 * including engagement metrics, progress metrics, content metrics, system metrics,
 * insights, reports, and user analytics.
 *
 * Requirements: 2.1, 2.2, 2.5
 */

import { analyticsServiceHttpClient } from "./http-client";
import type {
  // Core Metrics Types
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  RealtimeMetricsSnapshot,

  // Query Parameter Types
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,

  // Supporting Types
  Alert,
  BehaviorInsights,
  ContentGapAnalysis,
  EffectivenessReport,
  TimeSeriesData,
  HourlyEngagement,
  CohortRetention,
  UserSegment,
  UserJourney,
  BehaviorPattern,

  // Response Types
  ServiceHealthStatus,
} from "@/types/analytics-service";

// ============================================================================
// Analytics Service Client Class
// ============================================================================

export class AnalyticsServiceClient {
  constructor(private httpClient = analyticsServiceHttpClient) {}

  // ============================================================================
  // Core Analytics Metrics Methods
  // ============================================================================

  /**
   * Retrieves user engagement metrics including active users, sessions, and retention
   */
  async getEngagementMetrics(
    params?: EngagementMetricsParams,
  ): Promise<UserEngagementMetrics> {
    const queryParams = this.buildQueryParams(params);
    return this.httpClient.get<UserEngagementMetrics>(
      `/api/v1/analytics/engagement${queryParams}`,
    );
  }

  /**
   * Retrieves learning progress metrics including completions, accuracy, and performance
   */
  async getProgressMetrics(
    params?: ProgressMetricsParams,
  ): Promise<LearningProgressMetrics> {
    const queryParams = this.buildQueryParams(params);
    return this.httpClient.get<LearningProgressMetrics>(
      `/api/v1/analytics/progress${queryParams}`,
    );
  }

  /**
   * Retrieves content performance metrics including difficulty, accuracy, and gaps
   */
  async getContentMetrics(
    params?: ContentMetricsParams,
  ): Promise<ContentPerformanceMetrics> {
    const queryParams = this.buildQueryParams(params);
    return this.httpClient.get<ContentPerformanceMetrics>(
      `/api/v1/analytics/content${queryParams}`,
    );
  }

  /**
   * Retrieves system performance metrics including response times, resource usage, and health
   */
  async getSystemMetrics(
    params?: SystemMetricsParams,
  ): Promise<SystemPerformanceMetrics> {
    const queryParams = this.buildQueryParams(params);
    return this.httpClient.get<SystemPerformanceMetrics>(
      `/api/v1/analytics/system${queryParams}`,
    );
  }

  /**
   * Retrieves a real-time snapshot of all metrics
   */
  async getRealtimeSnapshot(): Promise<RealtimeMetricsSnapshot> {
    return this.httpClient.get<RealtimeMetricsSnapshot>(
      "/api/v1/analytics/realtime",
    );
  }

  // ============================================================================
  // Historical Data and Query Methods
  // ============================================================================

  /**
   * Queries historical metrics data with flexible time ranges and granularity
   */
  async queryHistoricalMetrics(
    query: HistoricalQuery,
  ): Promise<TimeSeriesData[]> {
    return this.httpClient.post<TimeSeriesData[]>(
      "/api/v1/analytics/historical",
      query,
    );
  }

  /**
   * Retrieves time series data for specific metrics
   */
  async getTimeSeriesData(
    metrics: string[],
    timeRange: { start: Date; end: Date },
    granularity: "hour" | "day" | "week" | "month" = "hour",
  ): Promise<TimeSeriesData[]> {
    const query: HistoricalQuery = {
      metrics,
      timeRange,
      granularity,
    };
    return this.queryHistoricalMetrics(query);
  }

  // ============================================================================
  // Insights and Analysis Methods
  // ============================================================================

  /**
   * Retrieves behavioral insights for a specific user or system-wide
   */
  async getBehaviorInsights(userId?: string): Promise<BehaviorInsights> {
    const url = userId
      ? `/api/v1/analytics/insights/behavior?userId=${encodeURIComponent(userId)}`
      : "/api/v1/analytics/insights/behavior";
    return this.httpClient.get<BehaviorInsights>(url);
  }

  /**
   * Retrieves content gap analysis identifying areas for improvement
   */
  async getContentGaps(): Promise<ContentGapAnalysis> {
    return this.httpClient.get<ContentGapAnalysis>(
      "/api/v1/analytics/insights/content-gaps",
    );
  }

  /**
   * Retrieves behavior patterns for analysis
   */
  async getBehaviorPatterns(userId?: string): Promise<BehaviorPattern[]> {
    const url = userId
      ? `/api/v1/analytics/insights/patterns?userId=${encodeURIComponent(userId)}`
      : "/api/v1/analytics/insights/patterns";
    return this.httpClient.get<BehaviorPattern[]>(url);
  }

  // ============================================================================
  // Reports Methods
  // ============================================================================

  /**
   * Generates effectiveness report for content and learning outcomes
   */
  async getEffectivenessReport(
    filters?: ReportFilters,
  ): Promise<EffectivenessReport> {
    const queryParams = this.buildQueryParams(filters);
    return this.httpClient.get<EffectivenessReport>(
      `/api/v1/analytics/reports/effectiveness${queryParams}`,
    );
  }

  /**
   * Generates custom report based on specified parameters
   */
  async generateCustomReport(
    reportType: string,
    filters?: ReportFilters,
  ): Promise<unknown> {
    const queryParams = this.buildQueryParams(filters);
    return this.httpClient.get(
      `/api/v1/analytics/reports/${reportType}${queryParams}`,
    );
  }

  // ============================================================================
  // System and Alert Methods
  // ============================================================================

  /**
   * Retrieves system alerts filtered by severity
   */
  async getAlerts(
    severity?: "info" | "warning" | "error" | "critical",
  ): Promise<Alert[]> {
    const url = severity
      ? `/api/v1/analytics/alerts?severity=${severity}`
      : "/api/v1/analytics/alerts";
    return this.httpClient.get<Alert[]>(url);
  }

  /**
   * Retrieves detailed system performance information
   */
  async getSystemPerformance(): Promise<SystemPerformanceMetrics> {
    return this.httpClient.get<SystemPerformanceMetrics>(
      "/api/v1/analytics/system/performance",
    );
  }

  /**
   * Retrieves current system status
   */
  async getSystemStatus(): Promise<ServiceHealthStatus> {
    return this.httpClient.get<ServiceHealthStatus>(
      "/api/v1/analytics/system/status",
    );
  }

  /**
   * Acknowledges an alert by ID
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.httpClient.post(
      `/api/v1/analytics/alerts/${alertId}/acknowledge`,
      { userId },
    );
  }

  /**
   * Resolves an alert by ID
   */
  async resolveAlert(
    alertId: string,
    userId: string,
    resolution?: string,
  ): Promise<void> {
    await this.httpClient.post(`/api/v1/analytics/alerts/${alertId}/resolve`, {
      userId,
      resolution,
    });
  }

  // ============================================================================
  // User Analytics Methods
  // ============================================================================

  /**
   * Retrieves hourly engagement data for a specific user
   */
  async getHourlyEngagement(
    userId: string,
    date?: Date,
  ): Promise<HourlyEngagement> {
    const dateParam = date ? `&date=${date.toISOString().split("T")[0]}` : "";
    return this.httpClient.get<HourlyEngagement>(
      `/api/v1/analytics/users/${encodeURIComponent(userId)}/engagement/hourly?${dateParam}`,
    );
  }

  /**
   * Retrieves cohort retention data
   */
  async getCohortRetention(cohortId: string): Promise<CohortRetention> {
    return this.httpClient.get<CohortRetention>(
      `/api/v1/analytics/cohorts/${encodeURIComponent(cohortId)}/retention`,
    );
  }

  /**
   * Retrieves available user segments
   */
  async getUserSegments(): Promise<UserSegment[]> {
    return this.httpClient.get<UserSegment[]>(
      "/api/v1/analytics/users/segments",
    );
  }

  /**
   * Retrieves user journey data
   */
  async getUserJourney(userId: string): Promise<UserJourney> {
    return this.httpClient.get<UserJourney>(
      `/api/v1/analytics/users/${encodeURIComponent(userId)}/journey`,
    );
  }

  /**
   * Retrieves user-specific behavior patterns
   */
  async getUserBehaviorPatterns(userId: string): Promise<BehaviorPattern[]> {
    return this.httpClient.get<BehaviorPattern[]>(
      `/api/v1/analytics/users/${encodeURIComponent(userId)}/patterns`,
    );
  }

  // ============================================================================
  // Aggregation and Summary Methods
  // ============================================================================

  /**
   * Retrieves dashboard summary with key metrics
   */
  async getDashboardSummary(): Promise<{
    engagement: UserEngagementMetrics;
    progress: LearningProgressMetrics;
    content: ContentPerformanceMetrics;
    system: SystemPerformanceMetrics;
    alerts: Alert[];
  }> {
    return this.httpClient.get("/api/v1/analytics/dashboard/summary");
  }

  /**
   * Retrieves metrics for multiple users in batch
   */
  async getBatchUserMetrics(userIds: string[]): Promise<
    Record<
      string,
      {
        engagement?: UserEngagementMetrics;
        progress?: LearningProgressMetrics;
      }
    >
  > {
    return this.httpClient.post("/api/v1/analytics/users/batch", { userIds });
  }

  /**
   * Retrieves aggregated metrics for a time period
   */
  async getAggregatedMetrics(
    timeRange: { start: Date; end: Date },
    aggregationType: "sum" | "avg" | "min" | "max" = "avg",
  ): Promise<{
    engagement: UserEngagementMetrics;
    progress: LearningProgressMetrics;
    content: ContentPerformanceMetrics;
    system: SystemPerformanceMetrics;
  }> {
    return this.httpClient.post("/api/v1/analytics/aggregate", {
      timeRange,
      aggregationType,
    });
  }

  // ============================================================================
  // Export and Data Methods
  // ============================================================================

  /**
   * Exports analytics data to CSV format
   */
  async exportToCsv(
    dataType: "engagement" | "progress" | "content" | "system",
    timeRange: { start: Date; end: Date },
    filters?: Record<string, unknown>,
  ): Promise<Blob> {
    const response = await this.httpClient
      .getAxiosInstance()
      .post(
        "/api/v1/analytics/export/csv",
        { dataType, timeRange, filters },
        { responseType: "blob" },
      );
    return response.data;
  }

  /**
   * Exports analytics data to JSON format
   */
  async exportToJson(
    dataType: "engagement" | "progress" | "content" | "system",
    timeRange: { start: Date; end: Date },
    filters?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.httpClient.post("/api/v1/analytics/export/json", {
      dataType,
      timeRange,
      filters,
    });
  }

  // ============================================================================
  // Configuration and Health Methods
  // ============================================================================

  /**
   * Gets the current client configuration
   */
  getConfig() {
    return this.httpClient.getConfig();
  }

  /**
   * Gets service health status
   */
  async getHealthStatus(): Promise<ServiceHealthStatus> {
    return this.httpClient.get<ServiceHealthStatus>("/health");
  }

  /**
   * Performs a connectivity test
   */
  async testConnectivity(): Promise<{ success: boolean; latency: number }> {
    const startTime = Date.now();
    try {
      await this.getHealthStatus();
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch {
      return {
        success: false,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Gets circuit breaker and queue statistics
   */
  getClientStats() {
    return {
      circuitBreaker: this.httpClient.getCircuitBreakerStats(),
      requestQueue: this.httpClient.getRequestQueueStats(),
      isServiceAvailable: this.httpClient.isServiceAvailable(),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Builds query parameters string from object
   */
  private buildQueryParams(
    params?:
      | Record<string, unknown>
      | EngagementMetricsParams
      | ProgressMetricsParams
      | ContentMetricsParams
      | SystemMetricsParams
      | ReportFilters,
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return "";
    }

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          searchParams.append(key, value.toISOString());
        } else if (typeof value === "object") {
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  /**
   * Creates a time range for common periods
   */
  createTimeRange(period: "hour" | "day" | "week" | "month" | "year"): {
    start: Date;
    end: Date;
  } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case "hour":
        start.setHours(start.getHours() - 1);
        break;
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsServiceClient = new AnalyticsServiceClient();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new analytics service client instance
 */
export function createAnalyticsServiceClient(): AnalyticsServiceClient {
  return new AnalyticsServiceClient();
}
