/**
 * Authentication and Authorization Integration for Notification Service
 * Implements secure JWT token handling, automatic refresh, and authorization checks
 */

import { integratedTokenManager } from "@/lib/auth";
import type {
  NotificationError,
  JWTPayload,
} from "@/types/notification-service";

// ============================================================================
// Configuration
// ============================================================================

const AUTH_CONFIG = {
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiration
  maxRetryAttempts: 3,
  retryDelay: 1000,
  sensitiveOperations: [
    "POST /notifications",
    "DELETE /notifications",
    "PUT /preferences",
    "POST /device-tokens",
    "DELETE /device-tokens",
    "POST /analytics/track",
  ],
};

// ============================================================================
// JWT Token Handler
// ============================================================================

export class NotificationAuthHandler {
  private tokenManager = integratedTokenManager;

  /**
   * Get valid JWT token for notification service requests
   */
  async getValidToken(): Promise<string> {
    try {
      // Use the integrated token manager's method
      return await this.tokenManager.getValidAccessToken();
    } catch (error) {
      console.error("Failed to get valid token:", error);
      throw this.createAuthError(
        "Failed to get valid authentication token",
        "TOKEN_RETRIEVAL_FAILED",
      );
    }
  }

  /**
   * Decode JWT token (basic implementation)
   */
  private decodeJWT(token: string): JWTPayload {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = parts[1];
      if (!payload) {
        throw new Error("Invalid JWT payload");
      }
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
      );
      return decoded as JWTPayload;
    } catch {
      throw new Error("Failed to decode JWT token");
    }
  }

  /**
   * Get authorization header for requests
   */
  async getAuthorizationHeader(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Check if operation requires authentication
   */
  isOperationSensitive(method: string, path: string): boolean {
    const operation = `${method.toUpperCase()} ${path}`;
    return AUTH_CONFIG.sensitiveOperations.some(
      (sensitive) =>
        operation.includes(sensitive) ||
        path.includes("/admin/") ||
        path.includes("/private/"),
    );
  }

  /**
   * Validate token permissions for specific operations
   */
  async validateTokenPermissions(operation: string): Promise<boolean> {
    try {
      const token = await this.getValidToken();
      const decoded = this.decodeJWT(token);

      // Check token expiration
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        return false;
      }

      // Check required scopes/permissions
      const requiredScopes = this.getRequiredScopes(operation);
      const tokenScopes = decoded.scopes || decoded.scope?.split(" ") || [];

      return requiredScopes.every((scope) => tokenScopes.includes(scope));
    } catch (error) {
      console.error("Token validation failed:", error);
      return false;
    }
  }

  /**
   * Get required scopes for operation
   */
  private getRequiredScopes(operation: string): string[] {
    const scopeMap: Record<string, string[]> = {
      "POST /notifications": ["notifications:write"],
      "DELETE /notifications": ["notifications:write"],
      "PUT /preferences": ["preferences:write"],
      "POST /device-tokens": ["devices:write"],
      "DELETE /device-tokens": ["devices:write"],
      "POST /analytics/track": ["analytics:write"],
      "GET /notifications": ["notifications:read"],
      "GET /preferences": ["preferences:read"],
      "GET /device-tokens": ["devices:read"],
      "GET /analytics": ["analytics:read"],
    };

    return scopeMap[operation] || ["notifications:read"];
  }

  /**
   * Create authentication error
   */
  private createAuthError(message: string, code: string): NotificationError {
    return {
      type: "authentication",
      message,
      code,
      recoverable: true,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Request Signing for Sensitive Operations
// ============================================================================

export class NotificationRequestSigner {
  private authHandler: NotificationAuthHandler;

  constructor() {
    this.authHandler = new NotificationAuthHandler();
  }

  /**
   * Sign request for sensitive operations
   */
  async signRequest(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    timestamp?: number,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    // Add authorization header
    const authHeaders = await this.authHandler.getAuthorizationHeader();
    Object.assign(headers, authHeaders);

    // Add timestamp for replay protection
    const requestTimestamp = timestamp || Date.now();
    headers["X-Request-Timestamp"] = requestTimestamp.toString();

    // Add request signature for sensitive operations
    if (this.authHandler.isOperationSensitive(method, url)) {
      const signature = await this.generateRequestSignature(
        method,
        url,
        body,
        requestTimestamp,
      );
      headers["X-Request-Signature"] = signature;
    }

    // Add correlation ID for tracing
    headers["X-Correlation-ID"] = this.generateCorrelationId();

    return headers;
  }

  /**
   * Generate request signature
   */
  private async generateRequestSignature(
    method: string,
    url: string,
    body: Record<string, unknown> | undefined,
    timestamp: number,
  ): Promise<string> {
    try {
      // Create signature payload
      const payload = {
        method: method.toUpperCase(),
        url: url,
        timestamp: timestamp,
        body: body ? JSON.stringify(body) : "",
      };

      const payloadString = JSON.stringify(payload);
      const encoder = new TextEncoder();
      const data = encoder.encode(payloadString);

      // Generate signature using Web Crypto API
      const key = await this.getSigningKey();
      const signature = await crypto.subtle.sign("HMAC", key, data);

      // Convert to base64
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
      console.error("Request signing failed:", error);
      throw new Error("Failed to sign request");
    }
  }

  /**
   * Get signing key (derived from token)
   */
  private async getSigningKey(): Promise<CryptoKey> {
    try {
      const token = await this.authHandler.getValidToken();
      const encoder = new TextEncoder();
      const keyData = encoder.encode(token.slice(-32)); // Use last 32 chars of token

      return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
    } catch {
      throw new Error("Failed to derive signing key");
    }
  }

  /**
   * Generate correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verify request signature (for testing)
   */
  async verifyRequestSignature(
    method: string,
    url: string,
    body: Record<string, unknown> | undefined,
    timestamp: number,
    signature: string,
  ): Promise<boolean> {
    try {
      const expectedSignature = await this.generateRequestSignature(
        method,
        url,
        body,
        timestamp,
      );
      return signature === expectedSignature;
    } catch {
      console.error("Signature verification failed");
      return false;
    }
  }
}

// ============================================================================
// Authorization Checker
// ============================================================================

export class NotificationAuthorizationChecker {
  private authHandler: NotificationAuthHandler;

  constructor() {
    this.authHandler = new NotificationAuthHandler();
  }

  /**
   * Check if user can access notification
   */
  async canAccessNotification(
    _notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Validate token first
      const token = await this.authHandler.getValidToken();
      const decoded = this.authHandler["decodeJWT"](token);

      // Check if user matches token
      if (decoded.sub !== userId && decoded.user_id !== userId) {
        return false;
      }

      // Additional checks can be added here (e.g., organization membership)
      return true;
    } catch (error) {
      console.error("Authorization check failed:", error);
      return false;
    }
  }

  /**
   * Check if user can manage device tokens
   */
  async canManageDeviceTokens(userId: string): Promise<boolean> {
    try {
      const token = await this.authHandler.getValidToken();
      const decoded = this.authHandler["decodeJWT"](token);

      // User can only manage their own device tokens
      return decoded.sub === userId || decoded.user_id === userId;
    } catch (error) {
      console.error("Device token authorization check failed:", error);
      return false;
    }
  }

  /**
   * Check if user can access analytics
   */
  async canAccessAnalytics(userId?: string): Promise<boolean> {
    try {
      const hasPermission =
        await this.authHandler.validateTokenPermissions("GET /analytics");

      if (userId) {
        // Check if user can access specific user's analytics
        const token = await this.authHandler.getValidToken();
        const decoded = this.authHandler["decodeJWT"](token);

        // User can access their own analytics or if they have admin role
        return (
          hasPermission &&
          (decoded.sub === userId ||
            decoded.user_id === userId ||
            decoded.role === "admin")
        );
      }

      return hasPermission;
    } catch (error) {
      console.error("Analytics authorization check failed:", error);
      return false;
    }
  }

  /**
   * Check if user has admin privileges
   */
  async hasAdminPrivileges(): Promise<boolean> {
    try {
      const token = await this.authHandler.getValidToken();
      const decoded = this.authHandler["decodeJWT"](token);

      return (
        decoded.role === "admin" ||
        decoded.roles?.includes("admin") ||
        decoded.is_admin === true
      );
    } catch (error) {
      console.error("Admin privilege check failed:", error);
      return false;
    }
  }
}

// ============================================================================
// Token Cleanup Manager
// ============================================================================

export class NotificationTokenCleanup {
  private authHandler: NotificationAuthHandler;

  constructor() {
    this.authHandler = new NotificationAuthHandler();
  }

  /**
   * Setup automatic token cleanup on logout
   */
  setupLogoutCleanup(): void {
    // Listen for logout events
    window.addEventListener("beforeunload", this.handleLogout.bind(this));

    // Listen for storage events (cross-tab logout)
    window.addEventListener("storage", (event) => {
      if (event.key === "auth_logout" && event.newValue === "true") {
        this.handleLogout();
      }
    });

    // Listen for session expiration
    document.addEventListener(
      "auth:session-expired",
      this.handleLogout.bind(this),
    );
  }

  /**
   * Handle logout cleanup
   */
  private async handleLogout(): Promise<void> {
    try {
      // Clear tokens from integrated token manager
      await integratedTokenManager.clearTokens();

      // Clear any notification-specific auth data
      this.clearNotificationAuthData();

      console.log("Notification auth data cleared on logout");
    } catch (error) {
      console.error("Failed to clear notification auth data on logout:", error);
    }
  }

  /**
   * Clear notification-specific authentication data
   */
  private clearNotificationAuthData(): void {
    try {
      // Clear any cached auth data specific to notifications
      const keysToRemove = [
        "notification_auth_cache",
        "notification_permissions_cache",
        "notification_correlation_ids",
      ];

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error("Failed to clear notification auth data:", error);
    }
  }

  /**
   * Setup periodic token validation
   */
  setupPeriodicValidation(): void {
    // Validate token every 5 minutes
    setInterval(
      async () => {
        try {
          await this.authHandler.getValidToken();
        } catch (error) {
          console.warn("Token validation failed during periodic check:", error);
          // Trigger logout if token is invalid
          document.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const notificationAuthHandler = new NotificationAuthHandler();
export const notificationRequestSigner = new NotificationRequestSigner();
export const notificationAuthorizationChecker =
  new NotificationAuthorizationChecker();
export const notificationTokenCleanup = new NotificationTokenCleanup();

// Initialize cleanup handlers
notificationTokenCleanup.setupLogoutCleanup();
notificationTokenCleanup.setupPeriodicValidation();
