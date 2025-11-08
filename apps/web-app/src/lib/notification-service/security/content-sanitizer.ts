/**
 * Content Security and Sanitization for Notification Service
 * Implements XSS prevention, input validation, and content sanitization
 */

import DOMPurify from "isomorphic-dompurify";
import type {
  Notification,
  NotificationTemplate,
  RenderedNotification,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Configuration and Constants
// ============================================================================

const SANITIZATION_CONFIG = {
  // Maximum lengths for different content types
  maxLengths: {
    title: 200,
    body: 1000,
    actionUrl: 2048,
    imageUrl: 2048,
    iconUrl: 2048,
    templateVariable: 500,
  },

  // Allowed HTML tags for rich notifications
  allowedTags: [
    "b",
    "i",
    "em",
    "strong",
    "u",
    "br",
    "p",
    "span",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
  ],

  // Allowed attributes
  allowedAttributes: {
    "*": ["class", "id"],
    a: ["href", "title", "target"],
    img: ["src", "alt", "title", "width", "height"],
  },

  // URL schemes that are allowed
  allowedSchemes: ["http", "https", "mailto", "tel"],

  // Suspicious patterns to detect
  suspiciousPatterns: [
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /about:/i,
    /<script[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /import\s*\(/i,
  ],
};

// ============================================================================
// Content Sanitizer Class
// ============================================================================

export class NotificationContentSanitizer {
  private dompurify: typeof DOMPurify;

  constructor() {
    this.dompurify = DOMPurify;
    this.configureDOMPurify();
  }

  /**
   * Configure DOMPurify with notification-specific settings
   */
  private configureDOMPurify(): void {
    this.dompurify.addHook("beforeSanitizeElements", (node) => {
      // Remove any data attributes that could be used for XSS
      if (node.nodeType === 1) {
        // Element node
        const element = node as Element;
        const attributes = Array.from(element.attributes);

        attributes.forEach((attr) => {
          if (
            attr.name.startsWith("data-") &&
            this.containsSuspiciousContent(attr.value)
          ) {
            element.removeAttribute(attr.name);
          }
        });
      }
    });

    this.dompurify.addHook("afterSanitizeAttributes", (node) => {
      // Ensure all links open in new tab for security
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  /**
   * Sanitize notification content
   */
  sanitizeNotification(
    notification: Partial<Notification>,
  ): Partial<Notification> {
    const sanitized: Partial<Notification> = { ...notification };

    // Sanitize text content
    if (sanitized.title) {
      sanitized.title = this.sanitizeText(sanitized.title, "title");
    }

    if (sanitized.body) {
      sanitized.body = this.sanitizeRichText(sanitized.body, "body");
    }

    // Sanitize URLs
    if (sanitized.actionUrl) {
      sanitized.actionUrl = this.sanitizeUrl(sanitized.actionUrl, "actionUrl");
    }

    if (sanitized.imageUrl) {
      sanitized.imageUrl = this.sanitizeUrl(sanitized.imageUrl, "imageUrl");
    }

    if (sanitized.iconUrl) {
      sanitized.iconUrl = this.sanitizeUrl(sanitized.iconUrl, "iconUrl");
    }

    // Sanitize data object
    if (sanitized.data) {
      sanitized.data = this.sanitizeDataObject(sanitized.data);
    }

    // Sanitize template data
    if (sanitized.templateData) {
      sanitized.templateData = this.sanitizeDataObject(sanitized.templateData);
    }

    return sanitized;
  }

  /**
   * Sanitize notification template
   */
  sanitizeTemplate(
    template: Partial<NotificationTemplate>,
  ): Partial<NotificationTemplate> {
    const sanitized: Partial<NotificationTemplate> = { ...template };

    if (sanitized.titleTemplate) {
      sanitized.titleTemplate = this.sanitizeText(
        sanitized.titleTemplate,
        "titleTemplate",
      );
    }

    if (sanitized.bodyTemplate) {
      sanitized.bodyTemplate = this.sanitizeRichText(
        sanitized.bodyTemplate,
        "bodyTemplate",
      );
    }

    if (sanitized.defaultData) {
      sanitized.defaultData = this.sanitizeDataObject(sanitized.defaultData);
    }

    return sanitized;
  }

  /**
   * Sanitize rendered notification
   */
  sanitizeRenderedNotification(
    rendered: RenderedNotification,
  ): RenderedNotification {
    const sanitized: RenderedNotification = {
      title: this.sanitizeText(rendered.title, "title"),
      body: this.sanitizeRichText(rendered.body, "body"),
    };

    if (rendered.actionUrl) {
      sanitized.actionUrl = this.sanitizeUrl(rendered.actionUrl, "actionUrl");
    }

    if (rendered.imageUrl) {
      sanitized.imageUrl = this.sanitizeUrl(rendered.imageUrl, "imageUrl");
    }

    if (rendered.iconUrl) {
      sanitized.iconUrl = this.sanitizeUrl(rendered.iconUrl, "iconUrl");
    }

    if (rendered.data) {
      sanitized.data = this.sanitizeDataObject(rendered.data);
    }

    return sanitized;
  }

  /**
   * Sanitize plain text content
   */
  sanitizeText(text: string, fieldName: string): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    // Check length
    const maxLength =
      SANITIZATION_CONFIG.maxLengths[
        fieldName as keyof typeof SANITIZATION_CONFIG.maxLengths
      ] || 1000;
    if (text.length > maxLength) {
      throw this.createValidationError(
        fieldName,
        `Content too long (max ${maxLength} characters)`,
        "CONTENT_TOO_LONG",
      );
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(text)) {
      throw this.createValidationError(
        fieldName,
        "Content contains suspicious patterns",
        "SUSPICIOUS_CONTENT",
      );
    }

    // Remove null bytes and control characters
    let sanitized = text
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // HTML escape for plain text
    sanitized = this.htmlEscape(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize rich text content (HTML)
   */
  private sanitizeRichText(html: string, fieldName: string): string {
    if (!html || typeof html !== "string") {
      return "";
    }

    // Check length
    const maxLength =
      SANITIZATION_CONFIG.maxLengths[
        fieldName as keyof typeof SANITIZATION_CONFIG.maxLengths
      ] || 1000;
    if (html.length > maxLength) {
      throw this.createValidationError(
        fieldName,
        `Content too long (max ${maxLength} characters)`,
        "CONTENT_TOO_LONG",
      );
    }

    // Use DOMPurify to sanitize HTML
    const sanitized = this.dompurify.sanitize(html, {
      ALLOWED_TAGS: SANITIZATION_CONFIG.allowedTags,
      ALLOWED_ATTR: Object.keys(SANITIZATION_CONFIG.allowedAttributes).reduce(
        (acc, tag) => {
          const attrs =
            SANITIZATION_CONFIG.allowedAttributes[
              tag as keyof typeof SANITIZATION_CONFIG.allowedAttributes
            ];
          return [...acc, ...attrs];
        },
        [] as string[],
      ),
      ALLOW_DATA_ATTR: false,
      FORBID_CONTENTS: ["script", "style"],
      FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
      ],
      FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onfocus",
        "onblur",
      ],
      USE_PROFILES: { html: true },
    });

    return sanitized.trim();
  }

  /**
   * Sanitize URL
   */
  private sanitizeUrl(url: string, fieldName: string): string {
    if (!url || typeof url !== "string") {
      return "";
    }

    // Check length
    const maxLength =
      SANITIZATION_CONFIG.maxLengths[
        fieldName as keyof typeof SANITIZATION_CONFIG.maxLengths
      ] || 2048;
    if (url.length > maxLength) {
      throw this.createValidationError(
        fieldName,
        `URL too long (max ${maxLength} characters)`,
        "URL_TOO_LONG",
      );
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(url)) {
      throw this.createValidationError(
        fieldName,
        "URL contains suspicious patterns",
        "SUSPICIOUS_URL",
      );
    }

    try {
      const parsedUrl = new URL(url);

      // Check allowed schemes
      if (
        !SANITIZATION_CONFIG.allowedSchemes.includes(
          parsedUrl.protocol.slice(0, -1),
        )
      ) {
        throw this.createValidationError(
          fieldName,
          "URL scheme not allowed",
          "INVALID_URL_SCHEME",
        );
      }

      // Prevent localhost and private IP ranges in production
      if (process.env.NODE_ENV === "production") {
        const hostname = parsedUrl.hostname.toLowerCase();
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
        ) {
          throw this.createValidationError(
            fieldName,
            "Private URLs not allowed",
            "PRIVATE_URL",
          );
        }
      }

      return parsedUrl.toString();
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid URL")) {
        throw this.createValidationError(
          fieldName,
          "Invalid URL format",
          "INVALID_URL_FORMAT",
        );
      }
      throw error;
    }
  }

  /**
   * Sanitize data object (recursive)
   */
  sanitizeDataObject(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeObjectKey(key);

      if (typeof value === "string") {
        sanitized[sanitizedKey] = this.sanitizeText(value, "templateVariable");
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map((item) =>
          typeof item === "string"
            ? this.sanitizeText(item, "templateVariable")
            : item,
        );
      } else if (value && typeof value === "object") {
        // Recursive sanitization for nested objects (with depth limit)
        sanitized[sanitizedKey] = this.sanitizeDataObject(
          value as Record<string, unknown>,
        );
      } else {
        // Skip null, undefined, functions, etc.
        continue;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize object key
   */
  private sanitizeObjectKey(key: string): string {
    // Prevent prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw this.createValidationError(
        "data",
        "Invalid object key",
        "INVALID_OBJECT_KEY",
      );
    }

    // Only allow alphanumeric characters, underscores, and hyphens
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, "");

    if (sanitized !== key) {
      throw this.createValidationError(
        "data",
        "Object key contains invalid characters",
        "INVALID_KEY_CHARACTERS",
      );
    }

    return sanitized;
  }

  /**
   * Check if content contains suspicious patterns
   */
  private containsSuspiciousContent(content: string): boolean {
    const lowerContent = content.toLowerCase();

    return SANITIZATION_CONFIG.suspiciousPatterns.some((pattern) =>
      pattern.test(lowerContent),
    );
  }

  /**
   * HTML escape utility
   */
  private htmlEscape(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create validation error
   */
  private createValidationError(
    field: string,
    message: string,
    code: string,
  ): NotificationError {
    return {
      type: "validation",
      message,
      code,
      details: { field },
      recoverable: false,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Input Validation Functions
// ============================================================================

/**
 * Validate notification form inputs
 */
export function validateNotificationInput(
  input: unknown,
  fieldName: string,
): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const sanitizer = new NotificationContentSanitizer();
  return sanitizer.sanitizeText(input, fieldName);
}

/**
 * Validate notification preferences input
 */
export function validatePreferencesInput(
  preferences: unknown,
): Record<string, unknown> {
  if (!preferences || typeof preferences !== "object") {
    throw new Error("Preferences must be an object");
  }

  const sanitizer = new NotificationContentSanitizer();
  return sanitizer.sanitizeDataObject(preferences as Record<string, unknown>);
}

/**
 * Validate device token input
 */
export function validateDeviceTokenInput(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("Device token is required");
  }

  if (token.length > 4096) {
    throw new Error("Device token too long");
  }

  // For now, accept any non-empty string that doesn't contain suspicious content
  const sanitizer = new NotificationContentSanitizer();
  if (sanitizer["containsSuspiciousContent"](token)) {
    throw new Error("Device token contains invalid characters");
  }

  return token.trim();
}

// ============================================================================
// Content Security Policy Helpers
// ============================================================================

/**
 * Generate CSP directives for notification content
 */
export function generateNotificationCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Needed for notification actions
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss: ws:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join("; ");
}

/**
 * Validate CSP compliance for notification content
 */
export function validateCSPCompliance(content: string): boolean {
  // Check for inline scripts or styles
  const inlineScriptPattern = /<script[^>]*>.*?<\/script>/gi;
  const inlineStylePattern = /<style[^>]*>.*?<\/style>/gi;
  const eventHandlerPattern = /on\w+\s*=/gi;

  return !(
    inlineScriptPattern.test(content) ||
    inlineStylePattern.test(content) ||
    eventHandlerPattern.test(content)
  );
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationContentSanitizer = new NotificationContentSanitizer();
