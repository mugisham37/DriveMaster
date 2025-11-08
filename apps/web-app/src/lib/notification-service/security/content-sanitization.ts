/**
 * Content Security and Sanitization for Notification Service
 * Implements XSS prevention, input validation, and content security policies
 */

import DOMPurify from "isomorphic-dompurify";
import type {
  Notification,
  NotificationTemplate,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Configuration
// ============================================================================

const SANITIZATION_CONFIG = {
  // Allowed HTML tags for notification content
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
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
    "blockquote",
  ],

  // Allowed attributes
  allowedAttributes: {
    "*": ["class", "id"],
    span: ["style"],
    div: ["style"],
  },

  // Allowed CSS properties for style attributes
  allowedStyles: {
    color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(\d+,\s*\d+,\s*\d+\)$/],
    "background-color": [/^#[0-9a-f]{3,6}$/i, /^rgb\(\d+,\s*\d+,\s*\d+\)$/],
    "font-weight": [
      "normal",
      "bold",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
    ],
    "font-style": ["normal", "italic", "oblique"],
    "text-decoration": ["none", "underline", "line-through"],
  },

  // URL validation patterns
  urlPatterns: {
    // Allow internal app URLs and HTTPS external URLs
    allowed: [
      /^\/[^\/]/, // Internal relative URLs starting with /
      /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // HTTPS external URLs
      /^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email links
    ],
    // Block dangerous protocols
    blocked: [/^javascript:/i, /^data:/i, /^vbscript:/i, /^file:/i, /^ftp:/i],
  },

  // Input validation limits
  limits: {
    title: { min: 1, max: 200 },
    body: { min: 1, max: 2000 },
    actionUrl: { max: 500 },
    templateVariable: { max: 1000 },
  },
};

// ============================================================================
// Content Sanitizer Class
// ============================================================================

export class NotificationContentSanitizer {
  private domPurify: typeof DOMPurify;

  constructor() {
    this.domPurify = DOMPurify;
    this.configureDOMPurify();
  }

  /**
   * Configure DOMPurify with our security settings
   */
  private configureDOMPurify(): void {
    // Add custom hooks for additional security
    this.domPurify.addHook("beforeSanitizeElements", (node) => {
      // Remove any script tags that might have been missed
      if ((node as Element).tagName === "SCRIPT") {
        (node as Element).remove();
      }
    });

    this.domPurify.addHook("afterSanitizeAttributes", (node) => {
      // Validate and sanitize URLs in href and src attributes
      if (node.hasAttribute("href")) {
        const href = node.getAttribute("href");
        if (href && !this.isValidUrl(href)) {
          node.removeAttribute("href");
        }
      }

      if (node.hasAttribute("src")) {
        const src = node.getAttribute("src");
        if (src && !this.isValidUrl(src)) {
          node.removeAttribute("src");
        }
      }

      // Validate style attributes
      if (node.hasAttribute("style")) {
        const style = node.getAttribute("style");
        if (style && !this.isValidStyle(style)) {
          node.removeAttribute("style");
        }
      }
    });
  }

  /**
   * Sanitize notification content
   */
  sanitizeNotification(
    notification: Partial<Notification>,
  ): Partial<Notification> {
    const sanitized = { ...notification };

    try {
      // Sanitize title
      if (sanitized.title) {
        sanitized.title = this.sanitizeText(sanitized.title, "title");
      }

      // Sanitize body (may contain HTML)
      if (sanitized.body) {
        sanitized.body = this.sanitizeHtml(sanitized.body, "body");
      }

      // Sanitize action URL
      if (sanitized.actionUrl) {
        sanitized.actionUrl = this.sanitizeUrl(sanitized.actionUrl);
      }

      // Sanitize image URLs
      if (sanitized.imageUrl) {
        sanitized.imageUrl = this.sanitizeUrl(sanitized.imageUrl);
      }

      if (sanitized.iconUrl) {
        sanitized.iconUrl = this.sanitizeUrl(sanitized.iconUrl);
      }

      // Sanitize data object
      if (sanitized.data && typeof sanitized.data === "object") {
        sanitized.data = this.sanitizeDataObject(sanitized.data);
      }

      // Sanitize template data
      if (
        sanitized.templateData &&
        typeof sanitized.templateData === "object"
      ) {
        sanitized.templateData = this.sanitizeDataObject(
          sanitized.templateData,
        );
      }

      return sanitized;
    } catch (error) {
      console.error("Content sanitization failed:", error);
      throw this.createSecurityError(
        "Content sanitization failed",
        "SANITIZATION_FAILED",
      );
    }
  }

  /**
   * Sanitize notification template
   */
  sanitizeTemplate(
    template: Partial<NotificationTemplate>,
  ): Partial<NotificationTemplate> {
    const sanitized = { ...template };

    try {
      // Sanitize template content
      if (sanitized.titleTemplate) {
        sanitized.titleTemplate = this.sanitizeTemplateString(
          sanitized.titleTemplate,
        );
      }

      if (sanitized.bodyTemplate) {
        sanitized.bodyTemplate = this.sanitizeTemplateString(
          sanitized.bodyTemplate,
        );
      }

      // Sanitize default data
      if (sanitized.defaultData && typeof sanitized.defaultData === "object") {
        sanitized.defaultData = this.sanitizeDataObject(sanitized.defaultData);
      }

      return sanitized;
    } catch (error) {
      console.error("Template sanitization failed:", error);
      throw this.createSecurityError(
        "Template sanitization failed",
        "TEMPLATE_SANITIZATION_FAILED",
      );
    }
  }

  /**
   * Sanitize plain text content
   */
  private sanitizeText(
    text: string,
    type: keyof typeof SANITIZATION_CONFIG.limits,
  ): string {
    if (typeof text !== "string") {
      throw this.createSecurityError(
        "Invalid text input type",
        "INVALID_INPUT_TYPE",
      );
    }

    // Remove any HTML tags
    const cleaned = text.replace(/<[^>]*>/g, "");

    // Validate length
    const limits = SANITIZATION_CONFIG.limits[type];
    const minLength = "min" in limits ? limits.min : 0;
    const maxLength = limits.max;
    if (cleaned.length < minLength || cleaned.length > maxLength) {
      throw this.createSecurityError(
        `Text length must be between ${minLength} and ${maxLength} characters`,
        "INVALID_TEXT_LENGTH",
      );
    }

    // Remove potentially dangerous characters
    return cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Control characters
      .trim();
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHtml(
    html: string,
    type: keyof typeof SANITIZATION_CONFIG.limits,
  ): string {
    if (typeof html !== "string") {
      throw this.createSecurityError(
        "Invalid HTML input type",
        "INVALID_INPUT_TYPE",
      );
    }

    // First pass: DOMPurify sanitization
    const sanitized = this.domPurify.sanitize(html, {
      ALLOWED_TAGS: SANITIZATION_CONFIG.allowedTags,
      ALLOWED_ATTR: Object.keys(SANITIZATION_CONFIG.allowedAttributes).reduce(
        (acc, tag) => {
          return acc.concat(
            SANITIZATION_CONFIG.allowedAttributes[
              tag as keyof typeof SANITIZATION_CONFIG.allowedAttributes
            ],
          );
        },
        [] as string[],
      ),
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
    });

    // Validate length after sanitization
    const textContent = sanitized.replace(/<[^>]*>/g, "");
    const limits = SANITIZATION_CONFIG.limits[type];
    const minLength = "min" in limits ? limits.min : 0;
    const maxLength = limits.max;
    if (textContent.length < minLength || textContent.length > maxLength) {
      throw this.createSecurityError(
        `Content length must be between ${minLength} and ${maxLength} characters`,
        "INVALID_CONTENT_LENGTH",
      );
    }

    return sanitized;
  }

  /**
   * Sanitize template strings (with variable placeholders)
   */
  private sanitizeTemplateString(template: string): string {
    if (typeof template !== "string") {
      throw this.createSecurityError(
        "Invalid template input type",
        "INVALID_INPUT_TYPE",
      );
    }

    // Validate template variable syntax: {{variableName}}
    const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const invalidVariables = template
      .match(/\{\{[^}]*\}\}/g)
      ?.filter((match) => !variablePattern.test(match));

    if (invalidVariables && invalidVariables.length > 0) {
      throw this.createSecurityError(
        `Invalid template variables: ${invalidVariables.join(", ")}`,
        "INVALID_TEMPLATE_VARIABLES",
      );
    }

    // Sanitize the template content (excluding variables)
    const withPlaceholders = template.replace(
      variablePattern,
      "___PLACEHOLDER___",
    );
    const sanitized = this.domPurify.sanitize(withPlaceholders, {
      ALLOWED_TAGS: SANITIZATION_CONFIG.allowedTags,
      ALLOWED_ATTR: Object.keys(SANITIZATION_CONFIG.allowedAttributes).reduce(
        (acc, tag) => {
          return acc.concat(
            SANITIZATION_CONFIG.allowedAttributes[
              tag as keyof typeof SANITIZATION_CONFIG.allowedAttributes
            ],
          );
        },
        [] as string[],
      ),
    });

    // Restore template variables
    let variableIndex = 0;
    const variables = template.match(variablePattern) || [];
    return sanitized.replace(
      /___PLACEHOLDER___/g,
      () => variables[variableIndex++] || "",
    );
  }

  /**
   * Sanitize URLs
   */
  private sanitizeUrl(url: string): string {
    if (typeof url !== "string") {
      throw this.createSecurityError(
        "Invalid URL input type",
        "INVALID_INPUT_TYPE",
      );
    }

    // Check length
    if (url.length > SANITIZATION_CONFIG.limits.actionUrl.max) {
      throw this.createSecurityError("URL too long", "URL_TOO_LONG");
    }

    // Validate URL format
    if (!this.isValidUrl(url)) {
      throw this.createSecurityError("Invalid or dangerous URL", "INVALID_URL");
    }

    return url.trim();
  }

  /**
   * Validate URL safety
   */
  private isValidUrl(url: string): boolean {
    // Check against blocked patterns first
    for (const pattern of SANITIZATION_CONFIG.urlPatterns.blocked) {
      if (pattern.test(url)) {
        return false;
      }
    }

    // Check against allowed patterns
    for (const pattern of SANITIZATION_CONFIG.urlPatterns.allowed) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate CSS style attributes
   */
  private isValidStyle(style: string): boolean {
    // Parse CSS properties
    const properties = style
      .split(";")
      .map((prop) => prop.trim())
      .filter(Boolean);

    for (const property of properties) {
      const [name, value] = property.split(":").map((part) => part.trim());

      if (!name || !value) continue;

      const allowedValues =
        SANITIZATION_CONFIG.allowedStyles[
          name as keyof typeof SANITIZATION_CONFIG.allowedStyles
        ];
      if (!allowedValues) {
        return false; // Property not allowed
      }

      // Check if value matches allowed patterns
      const isValid = allowedValues.some((pattern) => {
        if (typeof pattern === "string") {
          return value === pattern;
        } else {
          return pattern.test(value);
        }
      });

      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize data objects recursively
   */
  private sanitizeDataObject(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Validate key
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        continue; // Skip invalid keys
      }

      // Sanitize value based on type
      if (typeof value === "string") {
        try {
          sanitized[key] = this.sanitizeText(value, "templateVariable");
        } catch {
          // Skip invalid values
          continue;
        }
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value
          .filter(
            (item) =>
              typeof item === "string" ||
              typeof item === "number" ||
              typeof item === "boolean",
          )
          .map((item) =>
            typeof item === "string"
              ? this.sanitizeText(item, "templateVariable")
              : item,
          );
      } else if (value && typeof value === "object") {
        // Recursively sanitize nested objects (with depth limit)
        sanitized[key] = this.sanitizeDataObject(
          value as Record<string, unknown>,
        );
      }
    }

    return sanitized;
  }

  /**
   * Create security error
   */
  private createSecurityError(
    message: string,
    code: string,
  ): NotificationError {
    return {
      type: "validation",
      message,
      code,
      recoverable: false,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Input Validator Class
// ============================================================================

export class NotificationInputValidator {
  private sanitizer: NotificationContentSanitizer;

  constructor() {
    this.sanitizer = new NotificationContentSanitizer();
  }

  /**
   * Validate notification creation input
   */
  validateNotificationInput(
    input: Record<string, unknown>,
  ): Partial<Notification> {
    if (!input || typeof input !== "object") {
      throw this.createValidationError(
        "Invalid notification input",
        "INVALID_INPUT",
      );
    }

    // Required fields validation
    if (!input.userId || typeof input.userId !== "string") {
      throw this.createValidationError(
        "Valid userId is required",
        "MISSING_USER_ID",
      );
    }

    if (!input.title || typeof input.title !== "string") {
      throw this.createValidationError(
        "Valid title is required",
        "MISSING_TITLE",
      );
    }

    if (!input.body || typeof input.body !== "string") {
      throw this.createValidationError(
        "Valid body is required",
        "MISSING_BODY",
      );
    }

    // Type validation
    const validTypes = [
      "achievement",
      "spaced_repetition",
      "streak_reminder",
      "mock_test_reminder",
      "system",
      "mentoring",
      "course_update",
      "community",
      "marketing",
    ];
    if (input.type && !validTypes.includes(input.type as string)) {
      throw this.createValidationError(
        "Invalid notification type",
        "INVALID_TYPE",
      );
    }

    // Priority validation
    const validPriorities = ["low", "normal", "high", "urgent"];
    if (input.priority && !validPriorities.includes(input.priority as string)) {
      throw this.createValidationError(
        "Invalid notification priority",
        "INVALID_PRIORITY",
      );
    }

    // Channels validation
    const validChannels = ["push", "email", "in_app", "sms"];
    if (input.channels && Array.isArray(input.channels)) {
      const invalidChannels = input.channels.filter(
        (channel: unknown) => !validChannels.includes(channel as string),
      );
      if (invalidChannels.length > 0) {
        throw this.createValidationError(
          `Invalid channels: ${invalidChannels.join(", ")}`,
          "INVALID_CHANNELS",
        );
      }
    }

    // Sanitize and return
    return this.sanitizer.sanitizeNotification(input);
  }

  /**
   * Validate template input
   */
  validateTemplateInput(
    input: Record<string, unknown>,
  ): Partial<NotificationTemplate> {
    if (!input || typeof input !== "object") {
      throw this.createValidationError(
        "Invalid template input",
        "INVALID_INPUT",
      );
    }

    // Required fields validation
    if (!input.name || typeof input.name !== "string") {
      throw this.createValidationError(
        "Valid name is required",
        "MISSING_NAME",
      );
    }

    if (!input.titleTemplate || typeof input.titleTemplate !== "string") {
      throw this.createValidationError(
        "Valid titleTemplate is required",
        "MISSING_TITLE_TEMPLATE",
      );
    }

    if (!input.bodyTemplate || typeof input.bodyTemplate !== "string") {
      throw this.createValidationError(
        "Valid bodyTemplate is required",
        "MISSING_BODY_TEMPLATE",
      );
    }

    // Sanitize and return
    return this.sanitizer.sanitizeTemplate(input);
  }

  /**
   * Validate search/filter parameters
   */
  validateQueryParams(
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!params || typeof params !== "object") {
      return {};
    }

    const validated: Record<string, unknown> = {};

    // Validate limit
    if (params.limit !== undefined) {
      const limitStr = String(params.limit);
      const limit = parseInt(limitStr, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw this.createValidationError(
          "Limit must be between 1 and 100",
          "INVALID_LIMIT",
        );
      }
      validated.limit = limit;
    }

    // Validate cursor (pagination)
    if (params.cursor && typeof params.cursor === "string") {
      // Basic validation for cursor format
      if (
        params.cursor.length > 100 ||
        !/^[a-zA-Z0-9+/=]*$/.test(params.cursor)
      ) {
        throw this.createValidationError(
          "Invalid cursor format",
          "INVALID_CURSOR",
        );
      }
      validated.cursor = params.cursor;
    }

    // Validate date ranges
    if (params.startDate) {
      const startDate = new Date(params.startDate as string | number | Date);
      if (isNaN(startDate.getTime())) {
        throw this.createValidationError(
          "Invalid start date",
          "INVALID_START_DATE",
        );
      }
      validated.startDate = startDate;
    }

    if (params.endDate) {
      const endDate = new Date(params.endDate as string | number | Date);
      if (isNaN(endDate.getTime())) {
        throw this.createValidationError(
          "Invalid end date",
          "INVALID_END_DATE",
        );
      }
      validated.endDate = endDate;
    }

    // Copy other safe parameters
    const safeParams = ["userId", "type", "status", "priority", "channels"];
    for (const param of safeParams) {
      if (params[param] !== undefined) {
        validated[param] = params[param];
      }
    }

    return validated;
  }

  /**
   * Create validation error
   */
  private createValidationError(
    message: string,
    code: string,
  ): NotificationError {
    return {
      type: "validation",
      message,
      code,
      recoverable: true,
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// Content Security Policy Helper
// ============================================================================

export class NotificationCSPHelper {
  /**
   * Generate CSP directives for notification content
   */
  static generateCSPDirectives(): Record<string, string> {
    return {
      "default-src": "'self'",
      "script-src": "'self' 'unsafe-inline'", // Note: Consider removing unsafe-inline in production
      "style-src": "'self' 'unsafe-inline'",
      "img-src": "'self' data: https:",
      "font-src": "'self' data:",
      "connect-src": "'self' wss: https:",
      "frame-src": "'none'",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
    };
  }

  /**
   * Generate CSP header value
   */
  static generateCSPHeader(): string {
    const directives = this.generateCSPDirectives();
    return Object.entries(directives)
      .map(([directive, value]) => `${directive} ${value}`)
      .join("; ");
  }

  /**
   * Validate content against CSP rules
   */
  static validateContentAgainstCSP(content: string): boolean {
    // Check for inline scripts
    if (/<script[^>]*>/.test(content)) {
      return false;
    }

    // Check for javascript: URLs
    if (/javascript:/i.test(content)) {
      return false;
    }

    // Check for data: URLs in dangerous contexts
    if (/<iframe[^>]*src\s*=\s*["']data:/i.test(content)) {
      return false;
    }

    return true;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const notificationContentSanitizer = new NotificationContentSanitizer();
export const notificationInputValidator = new NotificationInputValidator();
