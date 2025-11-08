/**
 * Security Integration Example
 * Demonstrates how to use the comprehensive security features of the notification service
 */

import {
  notificationSecurityManager,
  notificationContentSanitizer,
  notificationAuthHandler,
  notificationConsentManager,
  notificationDataExporter,
  notificationPrivacyRights,
  type ConsentType,
  type ExportFormat,
} from "./index";
import type {
  Notification,
  NotificationTemplate,
} from "@/types/notification-service";

/**
 * Example: Secure Notification Creation Workflow
 */
export async function createNotificationSecurely(
  notificationData: Partial<Notification>,
  userId: string,
): Promise<Partial<Notification>> {
  try {
    // 1. Process notification through security pipeline
    const secureNotification =
      await notificationSecurityManager.processNotificationSecurely(
        notificationData,
        userId,
      );

    console.log("Notification processed securely:", secureNotification);
    return secureNotification;
  } catch (error) {
    console.error("Secure notification creation failed:", error);
    throw error;
  }
}

/**
 * Example: Secure API Request Preparation
 */
export async function makeSecureNotificationRequest(
  method: string,
  endpoint: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<{
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}> {
  try {
    // Prepare secure request with authentication and sanitization
    const secureRequest =
      await notificationSecurityManager.prepareSecureRequest(
        method,
        endpoint,
        data,
        userId,
      );

    console.log("Secure request prepared:", {
      method,
      endpoint,
      hasAuth: !!secureRequest.headers.Authorization,
      hasSignature: !!secureRequest.headers["X-Request-Signature"],
    });

    return secureRequest;
  } catch (error) {
    console.error("Secure request preparation failed:", error);
    throw error;
  }
}

/**
 * Example: Content Sanitization
 */
export function sanitizeNotificationContent(content: string): string {
  try {
    // Sanitize HTML content to prevent XSS
    const sanitized = notificationContentSanitizer.sanitizeNotification({
      title: "Safe Title",
      body: content,
    });

    return sanitized.body || "";
  } catch (error) {
    console.error("Content sanitization failed:", error);
    return ""; // Return empty string as fallback
  }
}

/**
 * Example: User Consent Management
 */
export class NotificationConsentExample {
  /**
   * Check if user has given consent for notifications
   */
  static checkNotificationConsent(userId: string): boolean {
    return notificationConsentManager.hasConsent(
      userId,
      "notifications_processing",
    );
  }

  /**
   * Request user consent for different notification types
   */
  static async requestConsent(
    userId: string,
    consentTypes: ConsentType[],
  ): Promise<void> {
    try {
      const consents: Partial<Record<ConsentType, boolean>> = {};

      // In a real app, this would show a consent dialog to the user
      // For this example, we'll assume user grants consent
      consentTypes.forEach((type) => {
        consents[type] = true;
      });

      notificationConsentManager.updateConsentPreferences(userId, consents);
      console.log("Consent updated for user:", userId, consents);
    } catch (error) {
      console.error("Consent request failed:", error);
      throw error;
    }
  }

  /**
   * Withdraw all consents
   */
  static withdrawAllConsents(userId: string): void {
    try {
      notificationConsentManager.withdrawAllConsents(userId);
      console.log("All consents withdrawn for user:", userId);
    } catch (error) {
      console.error("Consent withdrawal failed:", error);
      throw error;
    }
  }
}

/**
 * Example: Data Export and Privacy Rights
 */
export class NotificationPrivacyExample {
  /**
   * Export user's notification data
   */
  static async exportUserData(
    userId: string,
    format: ExportFormat = "json",
  ): Promise<string> {
    try {
      const exportedData = await notificationDataExporter.exportUserData(
        userId,
        format,
      );
      console.log(`Data exported for user ${userId} in ${format} format`);
      return exportedData;
    } catch (error) {
      console.error("Data export failed:", error);
      throw error;
    }
  }

  /**
   * Request data deletion
   */
  static async requestDataDeletion(userId: string): Promise<string> {
    try {
      const deletionRequest =
        await notificationPrivacyRights.handleErasureRequest(userId);
      console.log("Data deletion requested:", deletionRequest.id);
      return deletionRequest.id;
    } catch (error) {
      console.error("Data deletion request failed:", error);
      throw error;
    }
  }

  /**
   * Generate privacy report
   */
  static async generatePrivacyReport(userId: string): Promise<void> {
    try {
      const report =
        await notificationPrivacyRights.generatePrivacyReport(userId);
      console.log("Privacy report generated:", {
        userId: report.userId,
        consentStatus: Object.keys(report.consentStatus.consents).length,
        historyEntries: report.consentHistory.length,
        generatedAt: report.generatedAt,
      });
    } catch (error) {
      console.error("Privacy report generation failed:", error);
      throw error;
    }
  }
}

/**
 * Example: Security Audit
 */
export async function performSecurityAudit(userId: string): Promise<void> {
  try {
    console.log("Starting security audit for user:", userId);

    // Get security status
    const securityStatus = notificationSecurityManager.getSecurityStatus();
    console.log("Security status:", securityStatus);

    // Perform comprehensive audit
    const auditResult =
      await notificationSecurityManager.performSecurityAudit(userId);
    console.log("Security audit completed:", {
      timestamp: auditResult.timestamp,
      results: auditResult.results,
      recommendations: auditResult.recommendations,
    });

    // Log any security recommendations
    if (auditResult.recommendations.length > 0) {
      console.warn("Security recommendations:", auditResult.recommendations);
    }
  } catch (error) {
    console.error("Security audit failed:", error);
    throw error;
  }
}

/**
 * Example: Authentication Integration
 */
export class NotificationAuthExample {
  /**
   * Get authenticated headers for API requests
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      return await notificationAuthHandler.getAuthorizationHeader();
    } catch (error) {
      console.error("Failed to get auth headers:", error);
      throw error;
    }
  }

  /**
   * Check if user can access specific notification
   */
  static async canAccessNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // This would typically be called by the API client before making requests
      const canAccess = await notificationSecurityManager[
        "authChecker"
      ].canAccessNotification(notificationId, userId);

      console.log(
        `User ${userId} can access notification ${notificationId}:`,
        canAccess,
      );
      return canAccess;
    } catch (error) {
      console.error("Authorization check failed:", error);
      return false;
    }
  }
}

/**
 * Example: Complete Secure Notification Workflow
 */
export async function completeSecureNotificationWorkflow(
  userId: string,
  notificationData: Partial<Notification>,
): Promise<void> {
  try {
    console.log("Starting complete secure notification workflow...");

    // 1. Check user consent
    if (!NotificationConsentExample.checkNotificationConsent(userId)) {
      console.log("User consent required, requesting consent...");
      await NotificationConsentExample.requestConsent(userId, [
        "notifications_processing",
        "analytics_tracking",
      ]);
    }

    // 2. Sanitize and validate notification
    const secureNotification = await createNotificationSecurely(
      notificationData,
      userId,
    );

    // 3. Prepare secure API request
    const secureRequest = await makeSecureNotificationRequest(
      "POST",
      "/notifications",
      { notification: secureNotification },
      userId,
    );

    // 4. Log security status
    console.log("Secure request ready:", {
      hasValidAuth: !!secureRequest.headers.Authorization,
      contentSanitized: true,
      consentVerified: true,
    });

    // 5. Perform security audit
    await performSecurityAudit(userId);

    console.log("Complete secure notification workflow completed successfully");
  } catch (error) {
    console.error("Secure notification workflow failed:", error);
    throw error;
  }
}

/**
 * Example: Template Security Processing
 */
export async function processTemplateSecurely(
  templateData: Partial<NotificationTemplate>,
  userId: string,
): Promise<Partial<NotificationTemplate>> {
  try {
    // Process template through security pipeline (admin-only operation)
    const secureTemplate =
      await notificationSecurityManager.processTemplateSecurely(
        templateData,
        userId,
      );

    console.log("Template processed securely:", secureTemplate.name);
    return secureTemplate;
  } catch (error) {
    console.error("Secure template processing failed:", error);
    throw error;
  }
}

// Export all examples for easy usage
export const SecurityExamples = {
  createNotificationSecurely,
  makeSecureNotificationRequest,
  sanitizeNotificationContent,
  NotificationConsentExample,
  NotificationPrivacyExample,
  performSecurityAudit,
  NotificationAuthExample,
  completeSecureNotificationWorkflow,
  processTemplateSecurely,
};
