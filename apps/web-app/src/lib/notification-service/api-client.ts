/**
 * Notification Service API Client
 *
 * Core API client for notification service integration with comprehensive
 * error handling, caching, and specialized learning notification support.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import {
  notificationServiceConfig,
  notificationServiceEndpoints,
} from "../config/notification-service";
import type {
  Notification,
  NotificationList,
  NotificationQueryParams,
  NotificationStatus,
  DeviceToken,
  DeviceTokenRequest,
  DeviceTokenResponse,
  NotificationTemplate,
  RenderedNotification,
  TemplateRenderRequest,
  ScheduledNotification,
  ScheduleNotificationRequest,
  AnalyticsQueryParams,
  AnalyticsData,
  NotificationPreferences,
  DeliveryResult,
  AchievementNotificationRequest,
  SpacedRepetitionRequest,
  StreakReminderRequest,
  MockTestReminderRequest,
  ApiResponse,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// API Client Class
// ============================================================================

export class NotificationApiClient {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      baseURL: notificationServiceConfig.baseUrl,
      timeout: notificationServiceConfig.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.setupInterceptors();
  }

  // ============================================================================
  // Setup Methods
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (config) => {
        // Add JWT token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add correlation ID for tracking
        config.headers["X-Correlation-ID"] = this.generateCorrelationId();

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const notificationError = this.transformError(error);
        return Promise.reject(notificationError);
      },
    );
  }

  private getAuthToken(): string | null {
    // Integration with existing auth system
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token")
      );
    }
    return null;
  }

  private generateCorrelationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private transformError(error: AxiosError): NotificationError {
    const baseError: NotificationError = {
      type: "network",
      message: "An error occurred",
      recoverable: true,
      timestamp: new Date(),
    };

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;

      if (status === 401) {
        return {
          ...baseError,
          type: "authentication",
          message: "Authentication required",
          code: "AUTH_REQUIRED",
          recoverable: true,
        };
      } else if (status === 403) {
        return {
          ...baseError,
          type: "authentication",
          message: "Access denied",
          code: "ACCESS_DENIED",
          recoverable: false,
        };
      } else if (status === 400) {
        return {
          ...baseError,
          type: "validation",
          message:
            ((data as Record<string, unknown>)?.message as string) ||
            "Invalid request",
          code: "VALIDATION_ERROR",
          details: (data as Record<string, unknown>)?.details as Record<
            string,
            unknown
          >,
          recoverable: false,
        };
      } else if (status >= 500) {
        return {
          ...baseError,
          type: "service",
          message: "Service temporarily unavailable",
          code: "SERVICE_ERROR",
          recoverable: true,
          retryAfter: 30000,
        };
      }
    } else if (error.request) {
      // Network error
      return {
        ...baseError,
        type: "network",
        message: "Network connection failed",
        code: "NETWORK_ERROR",
        recoverable: true,
        retryAfter: 5000,
      };
    }

    return {
      ...baseError,
      message: error.message || "Unknown error occurred",
      recoverable: false,
    };
  }

  // ============================================================================
  // Core Notification Operations
  // ============================================================================

  async getNotifications(
    params?: NotificationQueryParams,
  ): Promise<NotificationList> {
    const response = await this.httpClient.get<ApiResponse<NotificationList>>(
      notificationServiceEndpoints.notifications,
      { params },
    );
    return response.data.data!;
  }

  async getNotification(notificationId: string): Promise<Notification> {
    const response = await this.httpClient.get<ApiResponse<Notification>>(
      `${notificationServiceEndpoints.notifications}/${notificationId}`,
    );
    return response.data.data!;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.notifications}/${notificationId}/read`,
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.notifications}/read-all`,
      { userId },
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.httpClient.delete(
      `${notificationServiceEndpoints.notifications}/${notificationId}`,
    );
  }

  async updateNotificationStatus(
    notificationId: string,
    status: Partial<NotificationStatus>,
  ): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.notifications}/${notificationId}/status`,
      status,
    );
  }

  async getNotificationCounts(userId: string): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: Record<string, number>;
  }> {
    const response = await this.httpClient.get<
      ApiResponse<{
        total: number;
        unread: number;
        read: number;
        byType: Record<string, number>;
      }>
    >(`${notificationServiceEndpoints.notifications}/counts`, {
      params: { userId },
    });
    return response.data.data!;
  }

  // Batch operations for request optimization
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.notifications}/batch/read`,
      { notificationIds },
    );
  }

  async deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
    await this.httpClient.delete(
      `${notificationServiceEndpoints.notifications}/batch`,
      { data: { notificationIds } },
    );
  }

  async searchNotifications(
    query: string,
    filters?: Record<string, unknown>,
  ): Promise<NotificationList> {
    const response = await this.httpClient.get<ApiResponse<NotificationList>>(
      `${notificationServiceEndpoints.notifications}/search`,
      { params: { query, ...(filters || {}) } },
    );
    return response.data.data!;
  }

  // ============================================================================
  // Device Token Management
  // ============================================================================

  async registerDeviceToken(
    request: DeviceTokenRequest,
  ): Promise<DeviceTokenResponse> {
    const response = await this.httpClient.post<
      ApiResponse<DeviceTokenResponse>
    >(notificationServiceEndpoints.deviceTokens, request);
    return response.data.data!;
  }

  async getDeviceTokens(userId: string): Promise<DeviceToken[]> {
    const response = await this.httpClient.get<ApiResponse<DeviceToken[]>>(
      `${notificationServiceEndpoints.deviceTokens}?userId=${userId}`,
    );
    return response.data.data!;
  }

  async removeDeviceToken(tokenId: string): Promise<void> {
    await this.httpClient.delete(
      `${notificationServiceEndpoints.deviceTokens}/${tokenId}`,
    );
  }

  // ============================================================================
  // Template Operations
  // ============================================================================

  async getTemplates(type?: string): Promise<NotificationTemplate[]> {
    const response = await this.httpClient.get<
      ApiResponse<NotificationTemplate[]>
    >(notificationServiceEndpoints.templates, {
      params: type ? { type } : undefined,
    });
    return response.data.data!;
  }

  async renderTemplate(
    request: TemplateRenderRequest,
  ): Promise<RenderedNotification> {
    const response = await this.httpClient.post<
      ApiResponse<RenderedNotification>
    >(`${notificationServiceEndpoints.templates}/render`, request);
    return response.data.data!;
  }

  // ============================================================================
  // Scheduling Operations
  // ============================================================================

  async scheduleNotification(
    request: ScheduleNotificationRequest,
  ): Promise<ScheduledNotification> {
    const response = await this.httpClient.post<
      ApiResponse<ScheduledNotification>
    >(notificationServiceEndpoints.scheduling, request);
    return response.data.data!;
  }

  async cancelScheduledNotification(
    notificationId: string,
    reason?: string,
  ): Promise<void> {
    await this.httpClient.delete(
      `${notificationServiceEndpoints.scheduling}/${notificationId}`,
      { data: { reason } },
    );
  }

  async getScheduledNotifications(
    userId: string,
    filters?: Record<string, unknown>,
  ): Promise<{ notifications: ScheduledNotification[] }> {
    const response = await this.httpClient.get<
      ApiResponse<{ notifications: ScheduledNotification[] }>
    >(`${notificationServiceEndpoints.scheduling}?userId=${userId}`, {
      params: filters,
    });
    return response.data.data!;
  }

  async updateScheduledNotification(
    notificationId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.scheduling}/${notificationId}`,
      updates,
    );
  }

  async rescheduleNotification(
    notificationId: string,
    newTime: Date,
  ): Promise<void> {
    await this.httpClient.patch(
      `${notificationServiceEndpoints.scheduling}/${notificationId}/reschedule`,
      { scheduledFor: newTime.toISOString() },
    );
  }

  // ============================================================================
  // Analytics Operations
  // ============================================================================

  async trackDelivery(
    notificationId: string,
    result: DeliveryResult,
  ): Promise<void> {
    await this.httpClient.post(
      `${notificationServiceEndpoints.analytics}/delivery`,
      { notificationId, result },
    );
  }

  async trackOpen(notificationId: string, userId: string): Promise<void> {
    await this.httpClient.post(
      `${notificationServiceEndpoints.analytics}/open`,
      { notificationId, userId, timestamp: new Date().toISOString() },
    );
  }

  async trackClick(
    notificationId: string,
    userId: string,
    action?: string,
  ): Promise<void> {
    await this.httpClient.post(
      `${notificationServiceEndpoints.analytics}/click`,
      { notificationId, userId, action, timestamp: new Date().toISOString() },
    );
  }

  async getAnalytics(params: AnalyticsQueryParams): Promise<AnalyticsData[]> {
    const response = await this.httpClient.get<ApiResponse<AnalyticsData[]>>(
      notificationServiceEndpoints.analytics,
      { params },
    );
    return response.data.data!;
  }

  // ============================================================================
  // Preferences Management
  // ============================================================================

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const response = await this.httpClient.get<
      ApiResponse<NotificationPreferences>
    >(`${notificationServiceEndpoints.preferences}/${userId}`);
    return response.data.data!;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const response = await this.httpClient.patch<
      ApiResponse<NotificationPreferences>
    >(`${notificationServiceEndpoints.preferences}/${userId}`, preferences);
    return response.data.data!;
  }

  // ============================================================================
  // Specialized Learning Notifications
  // ============================================================================

  async sendAchievementNotification(
    request: AchievementNotificationRequest,
  ): Promise<void> {
    await this.httpClient.post(
      `${notificationServiceEndpoints.notifications}/achievement`,
      request,
    );
  }

  async scheduleSpacedRepetitionReminder(
    request: SpacedRepetitionRequest,
  ): Promise<ScheduledNotification> {
    const scheduleRequest: ScheduleNotificationRequest = {
      userId: request.userId,
      scheduledFor: request.dueDate,
      notification: {
        userId: request.userId,
        type: "spaced_repetition",
        title: `Review: ${request.topicName}`,
        body: `Time to review ${request.itemCount} item${request.itemCount !== 1 ? "s" : ""} in ${request.topicName}`,
        priority: "normal",
        channels: ["push", "in_app"],
        data: {
          topicName: request.topicName,
          itemCount: request.itemCount,
          difficulty: request.difficulty,
          lastReviewDate: request.lastReviewDate?.toISOString(),
          nextReviewDate: request.nextReviewDate?.toISOString(),
        },
      },
    };

    return this.scheduleNotification(scheduleRequest);
  }

  async scheduleStreakReminder(
    request: StreakReminderRequest,
  ): Promise<ScheduledNotification> {
    const scheduleRequest: ScheduleNotificationRequest = {
      userId: request.userId,
      scheduledFor: request.reminderTime,
      notification: {
        userId: request.userId,
        type: "streak_reminder",
        title: `🔥 Keep your ${request.streakType} streak alive!`,
        body:
          request.motivationalMessage ||
          `You're on a ${request.streakCount} ${request.streakType} streak. Don't break it now!`,
        priority: "normal",
        channels: ["push", "in_app"],
        data: {
          streakCount: request.streakCount,
          streakType: request.streakType,
          motivationalMessage: request.motivationalMessage,
          streakGoal: request.streakGoal,
        },
      },
    };

    return this.scheduleNotification(scheduleRequest);
  }

  async scheduleMockTestReminder(
    request: MockTestReminderRequest,
  ): Promise<ScheduledNotification> {
    const scheduleRequest: ScheduleNotificationRequest = {
      userId: request.userId,
      scheduledFor: request.reminderTime,
      notification: {
        userId: request.userId,
        type: "mock_test_reminder",
        title: `📝 ${request.testName} - Time to Practice!`,
        body: `Ready for your ${request.testType}? Current pass rate: ${request.passRate}%`,
        priority: "normal",
        channels: ["push", "in_app"],
        data: {
          testType: request.testType,
          testName: request.testName,
          passRate: request.passRate,
          preparationTips: request.preparationTips,
          estimatedDuration: request.estimatedDuration,
          difficultyLevel: request.difficultyLevel,
        },
      },
    };

    return this.scheduleNotification(scheduleRequest);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationApiClient = new NotificationApiClient();
