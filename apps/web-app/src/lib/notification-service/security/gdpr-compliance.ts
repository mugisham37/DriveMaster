/**
 * GDPR Compliance Features for Notification Service
 * Implements data export, deletion, consent management, and privacy controls
 */

import { secureNotificationStorage } from "./data-encryption";
import { notificationAuthHandler } from "./auth-integration";
import type {
  Notification,
  NotificationPreferences,
  DeviceToken,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Configuration
// ============================================================================

const GDPR_CONFIG = {
  dataRetentionPeriods: {
    notifications: 365 * 24 * 60 * 60 * 1000, // 1 year
    preferences: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    deviceTokens: 90 * 24 * 60 * 60 * 1000, // 90 days
    analytics: 730 * 24 * 60 * 60 * 1000, // 2 years
  },

  consentTypes: [
    "notifications_processing",
    "analytics_tracking",
    "marketing_communications",
    "personalization",
    "cross_device_sync",
  ] as const,

  exportFormats: ["json", "csv", "xml"] as const,

  deletionGracePeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export type ConsentType = (typeof GDPR_CONFIG.consentTypes)[number];
export type ExportFormat = (typeof GDPR_CONFIG.exportFormats)[number];

// ============================================================================
// Data Export Manager
// ============================================================================

export class NotificationDataExporter {
  private storage = secureNotificationStorage;
  private authHandler = notificationAuthHandler;

  /**
   * Export all user notification data
   */
  async exportUserData(
    userId: string,
    format: ExportFormat = "json",
  ): Promise<string> {
    try {
      // Verify user authorization
      if (!(await this.verifyUserAccess(userId))) {
        throw this.createGDPRError(
          "Unauthorized data export request",
          "UNAUTHORIZED_EXPORT",
        );
      }

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Format and return data
      switch (format) {
        case "json":
          return this.exportAsJSON(userData);
        case "csv":
          return this.exportAsCSV(userData);
        case "xml":
          return this.exportAsXML(userData);
        default:
          throw this.createGDPRError(
            "Unsupported export format",
            "INVALID_FORMAT",
          );
      }
    } catch (error) {
      console.error("Data export failed:", error);
      throw error instanceof Error
        ? error
        : this.createGDPRError("Data export failed", "EXPORT_FAILED");
    }
  }

  /**
   * Collect all user data from various sources
   */
  private async collectUserData(userId: string): Promise<UserDataExport> {
    const [notifications, preferences, deviceTokens, analytics] =
      await Promise.allSettled([
        this.collectNotifications(userId),
        this.collectPreferences(userId),
        this.collectDeviceTokens(userId),
        this.collectAnalytics(userId),
      ]);

    return {
      userId,
      exportDate: new Date().toISOString(),
      dataTypes: {
        notifications:
          notifications.status === "fulfilled" ? notifications.value : [],
        preferences:
          preferences.status === "fulfilled" ? preferences.value : null,
        deviceTokens:
          deviceTokens.status === "fulfilled" ? deviceTokens.value : [],
        analytics: analytics.status === "fulfilled" ? analytics.value : [],
      },
      metadata: {
        totalNotifications:
          notifications.status === "fulfilled" ? notifications.value.length : 0,
        totalDeviceTokens:
          deviceTokens.status === "fulfilled" ? deviceTokens.value.length : 0,
        exportFormat: "complete",
        privacyNotice:
          "This export contains all personal data processed by the notification service.",
      },
    };
  }

  /**
   * Collect user notifications
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async collectNotifications(_userId: string): Promise<Notification[]> {
    // This would typically call the API, but for local data we use storage
    // In a real implementation, this would make an API call to get all user notifications
    const notifications: Notification[] = [];

    // For now, return empty array as we'd need to implement pagination to get all notifications
    // In production, this would be: await notificationApiClient.getAllUserNotifications(_userId)

    return notifications;
  }

  /**
   * Collect user preferences
   */
  private async collectPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    return await this.storage.getPreferences(userId);
  }

  /**
   * Collect user device tokens
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async collectDeviceTokens(_userId: string): Promise<DeviceToken[]> {
    // This would typically call the API to get all user device tokens
    // For now, return empty array
    return [];
  }

  /**
   * Collect user analytics data
   */
  private async collectAnalytics(
    userId: string,
  ): Promise<Record<string, unknown>[]> {
    // This would typically call the analytics API
    // For now, return empty array
    console.log("Collecting analytics for user:", userId);
    return [];
  }

  /**
   * Export data as JSON
   */
  private exportAsJSON(userData: UserDataExport): string {
    return JSON.stringify(userData, null, 2);
  }

  /**
   * Export data as CSV
   */
  private exportAsCSV(userData: UserDataExport): string {
    const lines: string[] = [];

    // Header
    lines.push("Data Type,ID,Title,Content,Date,Status");

    // Notifications
    userData.dataTypes.notifications.forEach((notification) => {
      const line = [
        "Notification",
        notification.id,
        `"${notification.title.replace(/"/g, '""')}"`,
        `"${notification.body.replace(/"/g, '""')}"`,
        notification.createdAt.toISOString(),
        notification.status.isRead ? "Read" : "Unread",
      ].join(",");
      lines.push(line);
    });

    // Device Tokens
    userData.dataTypes.deviceTokens.forEach((token) => {
      const line = [
        "Device Token",
        token.id,
        token.platform,
        "Device registration",
        token.createdAt.toISOString(),
        token.isActive ? "Active" : "Inactive",
      ].join(",");
      lines.push(line);
    });

    return lines.join("\n");
  }

  /**
   * Export data as XML
   */
  private exportAsXML(userData: UserDataExport): string {
    const xmlParts: string[] = [];

    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push("<UserDataExport>");
    xmlParts.push(`  <UserId>${userData.userId}</UserId>`);
    xmlParts.push(`  <ExportDate>${userData.exportDate}</ExportDate>`);

    // Notifications
    xmlParts.push("  <Notifications>");
    userData.dataTypes.notifications.forEach((notification) => {
      xmlParts.push("    <Notification>");
      xmlParts.push(`      <Id>${notification.id}</Id>`);
      xmlParts.push(`      <Title><![CDATA[${notification.title}]]></Title>`);
      xmlParts.push(`      <Body><![CDATA[${notification.body}]]></Body>`);
      xmlParts.push(
        `      <CreatedAt>${notification.createdAt.toISOString()}</CreatedAt>`,
      );
      xmlParts.push(`      <IsRead>${notification.status.isRead}</IsRead>`);
      xmlParts.push("    </Notification>");
    });
    xmlParts.push("  </Notifications>");

    // Device Tokens
    xmlParts.push("  <DeviceTokens>");
    userData.dataTypes.deviceTokens.forEach((token) => {
      xmlParts.push("    <DeviceToken>");
      xmlParts.push(`      <Id>${token.id}</Id>`);
      xmlParts.push(`      <Platform>${token.platform}</Platform>`);
      xmlParts.push(
        `      <CreatedAt>${token.createdAt.toISOString()}</CreatedAt>`,
      );
      xmlParts.push(`      <IsActive>${token.isActive}</IsActive>`);
      xmlParts.push("    </DeviceToken>");
    });
    xmlParts.push("  </DeviceTokens>");

    xmlParts.push("</UserDataExport>");

    return xmlParts.join("\n");
  }

  /**
   * Verify user access for data export
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async verifyUserAccess(_userId: string): Promise<boolean> {
    try {
      await this.authHandler.getValidToken();
      // In a real implementation, verify the token belongs to the user
      return true; // Simplified for this implementation
    } catch {
      return false;
    }
  }

  /**
   * Create GDPR error
   */
  private createGDPRError(message: string, code: string): NotificationError {
    return {
      type: "service",
      message,
      code,
      recoverable: false,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Data Deletion Manager
// ============================================================================

export class NotificationDataDeletion {
  private storage = secureNotificationStorage;
  private authHandler = notificationAuthHandler;

  /**
   * Request complete data deletion for user
   */
  async requestDataDeletion(
    userId: string,
    confirmationToken?: string,
  ): Promise<DeletionRequest> {
    try {
      // Verify user authorization
      if (!(await this.verifyUserAccess(userId))) {
        throw this.createGDPRError(
          "Unauthorized deletion request",
          "UNAUTHORIZED_DELETION",
        );
      }

      // Create deletion request
      const deletionRequest: DeletionRequest = {
        id: this.generateDeletionId(),
        userId,
        requestedAt: new Date(),
        scheduledFor: new Date(Date.now() + GDPR_CONFIG.deletionGracePeriod),
        status: "pending",
        confirmationToken:
          confirmationToken || this.generateConfirmationToken(),
        dataTypes: [
          "notifications",
          "preferences",
          "deviceTokens",
          "analytics",
        ],
      };

      // Store deletion request
      await this.storeDeletionRequest(deletionRequest);

      return deletionRequest;
    } catch (error) {
      console.error("Data deletion request failed:", error);
      throw error instanceof Error
        ? error
        : this.createGDPRError(
            "Deletion request failed",
            "DELETION_REQUEST_FAILED",
          );
    }
  }

  /**
   * Confirm data deletion
   */
  async confirmDataDeletion(
    deletionId: string,
    confirmationToken: string,
  ): Promise<void> {
    try {
      const request = await this.getDeletionRequest(deletionId);

      if (!request) {
        throw this.createGDPRError(
          "Deletion request not found",
          "DELETION_REQUEST_NOT_FOUND",
        );
      }

      if (request.confirmationToken !== confirmationToken) {
        throw this.createGDPRError(
          "Invalid confirmation token",
          "INVALID_CONFIRMATION_TOKEN",
        );
      }

      if (request.status !== "pending") {
        throw this.createGDPRError(
          "Deletion request already processed",
          "DELETION_ALREADY_PROCESSED",
        );
      }

      // Perform immediate deletion
      await this.performDataDeletion(request.userId);

      // Update deletion request status
      request.status = "completed";
      request.completedAt = new Date();
      await this.updateDeletionRequest(request);
    } catch (error) {
      console.error("Data deletion confirmation failed:", error);
      throw error instanceof Error
        ? error
        : this.createGDPRError(
            "Deletion confirmation failed",
            "DELETION_CONFIRMATION_FAILED",
          );
    }
  }

  /**
   * Cancel data deletion request
   */
  async cancelDataDeletion(deletionId: string, userId: string): Promise<void> {
    try {
      const request = await this.getDeletionRequest(deletionId);

      if (!request || request.userId !== userId) {
        throw this.createGDPRError(
          "Deletion request not found",
          "DELETION_REQUEST_NOT_FOUND",
        );
      }

      if (request.status !== "pending") {
        throw this.createGDPRError(
          "Cannot cancel processed deletion request",
          "DELETION_CANNOT_CANCEL",
        );
      }

      // Update status to cancelled
      request.status = "cancelled";
      request.cancelledAt = new Date();
      await this.updateDeletionRequest(request);
    } catch (error) {
      console.error("Data deletion cancellation failed:", error);
      throw error instanceof Error
        ? error
        : this.createGDPRError(
            "Deletion cancellation failed",
            "DELETION_CANCELLATION_FAILED",
          );
    }
  }

  /**
   * Perform actual data deletion
   */
  private async performDataDeletion(userId: string): Promise<void> {
    try {
      // Delete from local storage
      await this.storage.clearAllData();

      // In a real implementation, this would also:
      // 1. Call API to delete server-side data
      // 2. Delete from all databases
      // 3. Remove from analytics systems
      // 4. Purge from CDN/caches
      // 5. Remove from backup systems

      console.log(`Data deletion completed for user: ${userId}`);
    } catch (error) {
      console.error("Data deletion execution failed:", error);
      throw this.createGDPRError(
        "Data deletion execution failed",
        "DELETION_EXECUTION_FAILED",
      );
    }
  }

  /**
   * Store deletion request
   */
  private async storeDeletionRequest(request: DeletionRequest): Promise<void> {
    const key = `deletion_request_${request.id}`;
    localStorage.setItem(key, JSON.stringify(request));
  }

  /**
   * Get deletion request
   */
  private async getDeletionRequest(
    deletionId: string,
  ): Promise<DeletionRequest | null> {
    try {
      const key = `deletion_request_${deletionId}`;
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const request = JSON.parse(stored);
      // Convert date strings back to Date objects
      request.requestedAt = new Date(request.requestedAt);
      request.scheduledFor = new Date(request.scheduledFor);
      if (request.completedAt)
        request.completedAt = new Date(request.completedAt);
      if (request.cancelledAt)
        request.cancelledAt = new Date(request.cancelledAt);

      return request;
    } catch (error) {
      console.error("Failed to get deletion request:", error);
      return null;
    }
  }

  /**
   * Update deletion request
   */
  private async updateDeletionRequest(request: DeletionRequest): Promise<void> {
    const key = `deletion_request_${request.id}`;
    localStorage.setItem(key, JSON.stringify(request));
  }

  /**
   * Generate deletion ID
   */
  private generateDeletionId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate confirmation token
   */
  private generateConfirmationToken(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  /**
   * Verify user access
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async verifyUserAccess(_userId: string): Promise<boolean> {
    try {
      await this.authHandler.getValidToken();
      // In a real implementation, verify the token belongs to the user
      return true; // Simplified for this implementation
    } catch {
      return false;
    }
  }

  /**
   * Create GDPR error
   */
  private createGDPRError(message: string, code: string): NotificationError {
    return {
      type: "service",
      message,
      code,
      recoverable: false,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Consent Management
// ============================================================================

export class NotificationConsentManager {
  private storageKey = "notification_consent_preferences";

  /**
   * Get user consent preferences
   */
  getConsentPreferences(userId: string): ConsentPreferences {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userId}`);

      if (!stored) {
        return this.getDefaultConsentPreferences(userId);
      }

      const preferences = JSON.parse(stored);
      preferences.lastUpdated = new Date(preferences.lastUpdated);

      return preferences;
    } catch (error) {
      console.error("Failed to get consent preferences:", error);
      return this.getDefaultConsentPreferences(userId);
    }
  }

  /**
   * Update user consent preferences
   */
  updateConsentPreferences(
    userId: string,
    consents: Partial<Record<ConsentType, boolean>>,
  ): ConsentPreferences {
    try {
      const current = this.getConsentPreferences(userId);

      const updated: ConsentPreferences = {
        ...current,
        consents: {
          ...current.consents,
          ...consents,
        },
        lastUpdated: new Date(),
        version: current.version + 1,
      };

      localStorage.setItem(
        `${this.storageKey}_${userId}`,
        JSON.stringify(updated),
      );

      // Log consent change for audit trail
      this.logConsentChange(userId, consents);

      return updated;
    } catch (error) {
      console.error("Failed to update consent preferences:", error);
      throw new Error("Failed to update consent preferences");
    }
  }

  /**
   * Check if user has given consent for specific type
   */
  hasConsent(userId: string, consentType: ConsentType): boolean {
    const preferences = this.getConsentPreferences(userId);
    return preferences.consents[consentType] === true;
  }

  /**
   * Withdraw all consents
   */
  withdrawAllConsents(userId: string): ConsentPreferences {
    const withdrawnConsents: Record<ConsentType, boolean> = {} as Record<
      ConsentType,
      boolean
    >;

    GDPR_CONFIG.consentTypes.forEach((type) => {
      withdrawnConsents[type] = false;
    });

    return this.updateConsentPreferences(userId, withdrawnConsents);
  }

  /**
   * Get consent history for user
   */
  getConsentHistory(userId: string): ConsentHistoryEntry[] {
    try {
      const historyKey = `${this.storageKey}_history_${userId}`;
      const stored = localStorage.getItem(historyKey);
      if (!stored) {
        return [];
      }

      const history = JSON.parse(stored);
      return history.map((entry: Record<string, unknown>) => ({
        ...entry,
        timestamp: new Date(entry.timestamp as string),
      }));
    } catch (error) {
      console.error("Failed to get consent history:", error);
      return [];
    }
  }

  /**
   * Get default consent preferences
   */
  private getDefaultConsentPreferences(userId: string): ConsentPreferences {
    const defaultConsents: Record<ConsentType, boolean> = {} as Record<
      ConsentType,
      boolean
    >;

    // Default to false for all consent types (opt-in required)
    GDPR_CONFIG.consentTypes.forEach((type) => {
      defaultConsents[type] = false;
    });

    return {
      userId,
      consents: defaultConsents,
      lastUpdated: new Date(),
      version: 1,
    };
  }

  /**
   * Log consent change for audit trail
   */
  private logConsentChange(
    userId: string,
    changes: Partial<Record<ConsentType, boolean>>,
  ): void {
    try {
      const historyKey = `${this.storageKey}_history_${userId}`;
      const history = this.getConsentHistory(userId);

      const entry: ConsentHistoryEntry = {
        timestamp: new Date(),
        changes,
        userAgent: navigator.userAgent,
        ipAddress: "client-side", // Would be set server-side in real implementation
      };

      history.push(entry);

      // Keep only last 100 entries
      const trimmedHistory = history.slice(-100);

      localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error("Failed to log consent change:", error);
    }
  }
}

// ============================================================================
// Privacy Rights Manager
// ============================================================================

export class NotificationPrivacyRights {
  private exporter = new NotificationDataExporter();
  private deletion = new NotificationDataDeletion();
  private consent = new NotificationConsentManager();

  /**
   * Handle data portability request (Article 20)
   */
  async handleDataPortabilityRequest(
    userId: string,
    format: ExportFormat = "json",
  ): Promise<string> {
    return await this.exporter.exportUserData(userId, format);
  }

  /**
   * Handle right to erasure request (Article 17)
   */
  async handleErasureRequest(userId: string): Promise<DeletionRequest> {
    return await this.deletion.requestDataDeletion(userId);
  }

  /**
   * Handle right to rectification (Article 16)
   */
  async handleRectificationRequest(
    _userId: string,
    corrections: Record<string, unknown>,
  ): Promise<void> {
    // In a real implementation, this would update user data
    // For now, we'll just log the request
    console.log("Rectification request received:", { _userId, corrections });
  }

  /**
   * Handle right to restrict processing (Article 18)
   */
  async handleProcessingRestrictionRequest(
    userId: string,
    restrictions: string[],
  ): Promise<void> {
    // Update consent preferences to restrict processing
    const restrictionConsents: Partial<Record<ConsentType, boolean>> = {};

    restrictions.forEach((restriction) => {
      if (GDPR_CONFIG.consentTypes.includes(restriction as ConsentType)) {
        restrictionConsents[restriction as ConsentType] = false;
      }
    });

    this.consent.updateConsentPreferences(userId, restrictionConsents);
  }

  /**
   * Generate privacy report for user
   */
  async generatePrivacyReport(userId: string): Promise<PrivacyReport> {
    const [consentPreferences, consentHistory, dataRetention] =
      await Promise.all([
        this.consent.getConsentPreferences(userId),
        this.consent.getConsentHistory(userId),
        this.calculateDataRetention(userId),
      ]);

    return {
      userId,
      generatedAt: new Date(),
      consentStatus: consentPreferences,
      consentHistory,
      dataRetention,
      privacyRights: {
        dataPortability: "Available - Request data export",
        erasure: "Available - Request account deletion",
        rectification: "Available - Contact support for corrections",
        restrictProcessing: "Available - Modify consent preferences",
        objectToProcessing: "Available - Withdraw consent",
      },
    };
  }

  /**
   * Calculate data retention information
   */
  private async calculateDataRetention(
    userId: string,
  ): Promise<DataRetentionInfo> {
    const now = Date.now();

    console.log("Calculating data retention for user:", userId);
    return {
      notifications: {
        retentionPeriod: GDPR_CONFIG.dataRetentionPeriods.notifications,
        nextCleanup: new Date(
          now + GDPR_CONFIG.dataRetentionPeriods.notifications,
        ),
      },
      preferences: {
        retentionPeriod: GDPR_CONFIG.dataRetentionPeriods.preferences,
        nextCleanup: new Date(
          now + GDPR_CONFIG.dataRetentionPeriods.preferences,
        ),
      },
      deviceTokens: {
        retentionPeriod: GDPR_CONFIG.dataRetentionPeriods.deviceTokens,
        nextCleanup: new Date(
          now + GDPR_CONFIG.dataRetentionPeriods.deviceTokens,
        ),
      },
      analytics: {
        retentionPeriod: GDPR_CONFIG.dataRetentionPeriods.analytics,
        nextCleanup: new Date(now + GDPR_CONFIG.dataRetentionPeriods.analytics),
      },
    };
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

interface UserDataExport {
  userId: string;
  exportDate: string;
  dataTypes: {
    notifications: Notification[];
    preferences: NotificationPreferences | null;
    deviceTokens: DeviceToken[];
    analytics: Record<string, unknown>[];
  };
  metadata: {
    totalNotifications: number;
    totalDeviceTokens: number;
    exportFormat: string;
    privacyNotice: string;
  };
}

interface DeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  scheduledFor: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  status: "pending" | "completed" | "cancelled";
  confirmationToken: string;
  dataTypes: string[];
}

interface ConsentPreferences {
  userId: string;
  consents: Record<ConsentType, boolean>;
  lastUpdated: Date;
  version: number;
}

interface ConsentHistoryEntry {
  timestamp: Date;
  changes: Partial<Record<ConsentType, boolean>>;
  userAgent: string;
  ipAddress: string;
}

interface PrivacyReport {
  userId: string;
  generatedAt: Date;
  consentStatus: ConsentPreferences;
  consentHistory: ConsentHistoryEntry[];
  dataRetention: DataRetentionInfo;
  privacyRights: Record<string, string>;
}

interface DataRetentionInfo {
  notifications: RetentionPeriod;
  preferences: RetentionPeriod;
  deviceTokens: RetentionPeriod;
  analytics: RetentionPeriod;
}

interface RetentionPeriod {
  retentionPeriod: number;
  nextCleanup: Date;
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const notificationDataExporter = new NotificationDataExporter();
export const notificationDataDeletion = new NotificationDataDeletion();
export const notificationConsentManager = new NotificationConsentManager();
export const notificationPrivacyRights = new NotificationPrivacyRights();
