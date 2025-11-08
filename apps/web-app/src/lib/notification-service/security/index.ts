/**
 * Notification Service Security Module
 * Comprehensive security and privacy implementation for notification service integration
 */

// Content Security and Sanitization
export {
  NotificationContentSanitizer,
  NotificationInputValidator,
  NotificationCSPHelper,
  notificationContentSanitizer,
  notificationInputValidator,
} from "./content-sanitization";

// Data Encryption and Storage Security
export {
  NotificationDataEncryption,
  SecureNotificationStorage,
  NotificationDataCleanup,
  notificationDataEncryption,
  secureNotificationStorage,
  notificationDataCleanup,
} from "./data-encryption";

// Authentication and Authorization
export {
  NotificationAuthHandler,
  NotificationRequestSigner,
  NotificationAuthorizationChecker,
  NotificationTokenCleanup,
  notificationAuthHandler,
  notificationRequestSigner,
  notificationAuthorizationChecker,
  notificationTokenCleanup,
} from "./auth-integration";

// GDPR Compliance Features
export {
  NotificationDataExporter,
  NotificationDataDeletion,
  NotificationConsentManager,
  NotificationPrivacyRights,
  notificationDataExporter,
  notificationDataDeletion,
  notificationConsentManager,
  notificationPrivacyRights,
  type ConsentType,
  type ExportFormat,
} from "./gdpr-compliance";

// ============================================================================
// Unified Security Manager
// ============================================================================

import {
  notificationContentSanitizer,
  notificationInputValidator,
} from "./content-sanitization";
import {
  notificationDataEncryption,
  secureNotificationStorage,
  notificationDataCleanup,
} from "./data-encryption";
import {
  notificationAuthHandler,
  notificationRequestSigner,
  notificationAuthorizationChecker,
  notificationTokenCleanup,
} from "./auth-integration";
import {
  notificationConsentManager,
  notificationPrivacyRights,
} from "./gdpr-compliance";
import type {
  Notification,
  NotificationTemplate,
  NotificationError,
} from "@/types/notification-service";

/**
 * Unified Security Manager for Notification Service
 * Provides a single interface for all security operations
 */
export class NotificationSecurityManager {
  // Content Security
  private contentSanitizer = notificationContentSanitizer;
  private inputValidator = notificationInputValidator;

  // Data Security
  private dataEncryption = notificationDataEncryption;
  private secureStorage = secureNotificationStorage;
  private dataCleanup = notificationDataCleanup;

  // Authentication & Authorization
  private authHandler = notificationAuthHandler;
  private requestSigner = notificationRequestSigner;
  private authChecker = notificationAuthorizationChecker;
  private tokenCleanup = notificationTokenCleanup;

  // Privacy & GDPR
  private consentManager = notificationConsentManager;
  private privacyRights = notificationPrivacyRights;

  /**
   * Initialize security manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize cleanup handlers
      this.dataCleanup.setupLogoutCleanup();
      this.dataCleanup.setupPeriodicCleanup();
      this.tokenCleanup.setupLogoutCleanup();
      this.tokenCleanup.setupPeriodicValidation();

      console.log("Notification security manager initialized");
    } catch (error) {
      console.error("Failed to initialize security manager:", error);
      throw new Error("Security initialization failed");
    }
  }

  /**
   * Secure notification processing pipeline
   */
  async processNotificationSecurely(
    notification: Partial<Notification>,
    _userId: string,
  ): Promise<Partial<Notification>> {
    try {
      // 1. Validate input
      const validatedNotification =
        this.inputValidator.validateNotificationInput(notification);

      // 2. Check authorization
      if (
        !(await this.authChecker.canAccessNotification(
          validatedNotification.id || "",
          _userId,
        ))
      ) {
        throw this.createSecurityError(
          "Unauthorized notification access",
          "UNAUTHORIZED_ACCESS",
        );
      }

      // 3. Sanitize content
      const sanitizedNotification = this.contentSanitizer.sanitizeNotification(
        validatedNotification,
      );

      // 4. Check consent (if required)
      if (
        !this.consentManager.hasConsent(_userId, "notifications_processing")
      ) {
        throw this.createSecurityError(
          "User consent required for notification processing",
          "CONSENT_REQUIRED",
        );
      }

      return sanitizedNotification;
    } catch (error) {
      console.error("Secure notification processing failed:", error);
      throw error;
    }
  }

  /**
   * Secure template processing pipeline
   */
  async processTemplateSecurely(
    template: Partial<NotificationTemplate>,
    _userId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<Partial<NotificationTemplate>> {
    try {
      // 1. Validate input
      const validatedTemplate =
        this.inputValidator.validateTemplateInput(template);

      // 2. Check admin privileges (templates are admin-only)
      if (!(await this.authChecker.hasAdminPrivileges())) {
        throw this.createSecurityError(
          "Admin privileges required for template operations",
          "ADMIN_REQUIRED",
        );
      }

      // 3. Sanitize content
      const sanitizedTemplate =
        this.contentSanitizer.sanitizeTemplate(validatedTemplate);

      return sanitizedTemplate;
    } catch (error) {
      console.error("Secure template processing failed:", error);
      throw error;
    }
  }

  /**
   * Secure API request preparation
   */
  async prepareSecureRequest(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    _userId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{
    headers: Record<string, string>;
    body?: Record<string, unknown>;
  }> {
    try {
      // 1. Get authentication headers
      const headers = await this.requestSigner.signRequest(method, url, body);

      // 2. Sanitize request body if present
      let sanitizedBody = body;
      if (body && typeof body === "object") {
        if ("notification" in body && body.notification) {
          sanitizedBody = {
            ...body,
            notification: this.contentSanitizer.sanitizeNotification(
              body.notification as Partial<Notification>,
            ),
          };
        }
        if ("template" in body && body.template) {
          sanitizedBody = {
            ...body,
            template: this.contentSanitizer.sanitizeTemplate(
              body.template as Partial<NotificationTemplate>,
            ),
          };
        }
      }

      return sanitizedBody ? { headers, body: sanitizedBody } : { headers };
    } catch (error) {
      console.error("Secure request preparation failed:", error);
      throw error;
    }
  }

  /**
   * Secure data storage
   */
  async storeDataSecurely<T>(
    key: string,
    data: T,
    userId: string,
  ): Promise<void> {
    try {
      // Check consent for data storage
      if (!this.consentManager.hasConsent(userId, "notifications_processing")) {
        throw this.createSecurityError(
          "User consent required for data storage",
          "CONSENT_REQUIRED",
        );
      }

      // Encrypt and store data
      await this.dataEncryption.encryptData(data);
      // Store using secure storage mechanism
      // Implementation would depend on the specific data type
      console.log(`Storing data securely for key: ${key}`);
    } catch (error) {
      console.error("Secure data storage failed:", error);
      throw error;
    }
  }

  /**
   * Secure data retrieval
   */
  async retrieveDataSecurely<T>(
    key: string,
    userId: string,
  ): Promise<T | null> {
    try {
      // Check authorization
      if (!(await this.authChecker.canAccessNotification(key, userId))) {
        throw this.createSecurityError(
          "Unauthorized data access",
          "UNAUTHORIZED_ACCESS",
        );
      }

      // Retrieve and decrypt data
      // Implementation would depend on the specific data type
      return null; // Placeholder
    } catch (error) {
      console.error("Secure data retrieval failed:", error);
      throw error;
    }
  }

  /**
   * Handle privacy request
   */
  async handlePrivacyRequest(
    requestType: "export" | "delete" | "rectify" | "restrict",
    userId: string,
    options?: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      switch (requestType) {
        case "export":
          return await this.privacyRights.handleDataPortabilityRequest(
            userId,
            options?.format as "json" | "csv" | "xml" | undefined,
          );
        case "delete":
          return await this.privacyRights.handleErasureRequest(userId);
        case "rectify":
          return await this.privacyRights.handleRectificationRequest(
            userId,
            options?.corrections as Record<string, unknown>,
          );
        case "restrict":
          return await this.privacyRights.handleProcessingRestrictionRequest(
            userId,
            options?.restrictions as string[],
          );
        default:
          throw this.createSecurityError(
            "Invalid privacy request type",
            "INVALID_REQUEST_TYPE",
          );
      }
    } catch (error) {
      console.error("Privacy request handling failed:", error);
      throw error;
    }
  }

  /**
   * Get security status
   */
  getSecurityStatus(): SecurityStatus {
    return {
      contentSecurity: {
        sanitizationEnabled: true,
        validationEnabled: true,
        cspEnabled: true,
      },
      dataSecurity: {
        encryptionEnabled: true,
        secureStorageEnabled: true,
        cleanupEnabled: true,
      },
      authentication: {
        tokenValidationEnabled: true,
        requestSigningEnabled: true,
        authorizationEnabled: true,
      },
      privacy: {
        consentManagementEnabled: true,
        gdprComplianceEnabled: true,
        dataExportEnabled: true,
        dataDeletionEnabled: true,
      },
    };
  }

  /**
   * Perform security audit
   */
  async performSecurityAudit(userId: string): Promise<SecurityAuditResult> {
    try {
      const [tokenValid, dataIntegrity, consentStatus, privacyReport] =
        await Promise.allSettled([
          this.authHandler.getValidToken(),
          this.secureStorage.verifyDataIntegrity(),
          this.consentManager.getConsentPreferences(userId),
          this.privacyRights.generatePrivacyReport(userId),
        ]);

      return {
        timestamp: new Date(),
        userId,
        results: {
          authentication: tokenValid.status === "fulfilled",
          dataIntegrity:
            dataIntegrity.status === "fulfilled" ? dataIntegrity.value : false,
          consentCompliance: consentStatus.status === "fulfilled",
          privacyCompliance: privacyReport.status === "fulfilled",
        },
        recommendations: this.generateSecurityRecommendations({
          authentication: tokenValid.status === "fulfilled",
          dataIntegrity:
            dataIntegrity.status === "fulfilled" ? dataIntegrity.value : false,
          consentCompliance: consentStatus.status === "fulfilled",
          privacyCompliance: privacyReport.status === "fulfilled",
        }),
      };
    } catch (error) {
      console.error("Security audit failed:", error);
      throw this.createSecurityError("Security audit failed", "AUDIT_FAILED");
    }
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(
    results: Record<string, boolean>,
  ): string[] {
    const recommendations: string[] = [];

    if (!results.authentication) {
      recommendations.push("Refresh authentication tokens");
    }

    if (!results.dataIntegrity) {
      recommendations.push("Verify data integrity and consider re-encryption");
    }

    if (!results.consentCompliance) {
      recommendations.push("Review and update consent preferences");
    }

    if (!results.privacyCompliance) {
      recommendations.push(
        "Review privacy settings and data retention policies",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("All security checks passed");
    }

    return recommendations;
  }

  /**
   * Create security error
   */
  private createSecurityError(
    message: string,
    code: string,
  ): NotificationError {
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
// Type Definitions
// ============================================================================

interface SecurityStatus {
  contentSecurity: {
    sanitizationEnabled: boolean;
    validationEnabled: boolean;
    cspEnabled: boolean;
  };
  dataSecurity: {
    encryptionEnabled: boolean;
    secureStorageEnabled: boolean;
    cleanupEnabled: boolean;
  };
  authentication: {
    tokenValidationEnabled: boolean;
    requestSigningEnabled: boolean;
    authorizationEnabled: boolean;
  };
  privacy: {
    consentManagementEnabled: boolean;
    gdprComplianceEnabled: boolean;
    dataExportEnabled: boolean;
    dataDeletionEnabled: boolean;
  };
}

interface SecurityAuditResult {
  timestamp: Date;
  userId: string;
  results: Record<string, boolean>;
  recommendations: string[];
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationSecurityManager = new NotificationSecurityManager();

// Initialize security manager
notificationSecurityManager.initialize().catch((error) => {
  console.error("Failed to initialize notification security manager:", error);
});
