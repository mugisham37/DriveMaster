/**
 * Security Validator for Content Service
 *
 * Comprehensive security validation, input sanitization, and vulnerability testing
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import DOMPurify from "isomorphic-dompurify";
import type {
  ContentItem,
  CreateItemDto,
  UpdateItemDto,
  UploadMediaDto,
  SearchRequestDto,
} from "../types";

/**
 * Security configuration
 */
export interface SecurityConfig {
  // Input validation
  maxTitleLength: number;
  maxContentLength: number;
  maxTagLength: number;
  maxTagCount: number;

  // File upload security
  allowedMimeTypes: string[];
  maxFileSize: number;
  allowedFileExtensions: string[];

  // Content security
  allowedHtmlTags: string[];
  allowedAttributes: string[];

  // Rate limiting
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;

  // Authentication
  tokenExpirationBuffer: number;
  requireHttps: boolean;
}

export const SECURITY_CONFIG: SecurityConfig = {
  maxTitleLength: 200,
  maxContentLength: 1000000, // 1MB
  maxTagLength: 50,
  maxTagCount: 20,

  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "audio/mp3",
    "audio/wav",
    "application/pdf",
    "text/plain",
    "text/csv",
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".mp4",
    ".webm",
    ".mp3",
    ".wav",
    ".pdf",
    ".txt",
    ".csv",
  ],

  allowedHtmlTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
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
    "code",
    "pre",
    "a",
    "img",
  ],
  allowedAttributes: ["href", "src", "alt", "title", "class", "id"],

  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 1000,

  tokenExpirationBuffer: 5 * 60 * 1000, // 5 minutes
  requireHttps: true,
};

/**
 * Input validation and sanitization
 */
export class InputValidator {
  /**
   * Validate and sanitize content creation data
   */
  static validateCreateItemDto(data: CreateItemDto): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: CreateItemDto;
  } {
    const errors: string[] = [];
    const sanitizedData: CreateItemDto = { ...data };

    // Validate title
    if (!data.title || typeof data.title !== "string") {
      errors.push("Title is required and must be a string");
    } else if (data.title.length > SECURITY_CONFIG.maxTitleLength) {
      errors.push(
        `Title must be less than ${SECURITY_CONFIG.maxTitleLength} characters`,
      );
    } else {
      sanitizedData.title = this.sanitizeText(data.title);
    }

    // Validate content
    if (!data.content || typeof data.content !== "object") {
      errors.push("Content is required and must be an object");
    } else {
      const contentValidation = this.validateContent(data.content);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
      } else {
        sanitizedData.content = contentValidation.sanitizedContent!;
      }
    }

    // Validate type
    if (!data.type || typeof data.type !== "string") {
      errors.push("Type is required and must be a string");
    } else if (!this.isValidContentType(data.type)) {
      errors.push("Invalid content type");
    }

    // Validate tags
    if (data.tags) {
      const tagValidation = this.validateTags(data.tags);
      if (!tagValidation.isValid) {
        errors.push(...tagValidation.errors);
      } else {
        sanitizedData.tags = tagValidation.sanitizedTags;
      }
    }

    // Validate metadata
    if (data.metadata) {
      const metadataValidation = this.validateMetadata(data.metadata);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
      } else {
        sanitizedData.metadata = metadataValidation.sanitizedMetadata;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      ...(errors.length === 0 && { sanitizedData }),
    };
  }

  /**
   * Validate and sanitize content update data
   */
  static validateUpdateItemDto(data: UpdateItemDto): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: UpdateItemDto;
  } {
    const errors: string[] = [];
    const sanitizedData: UpdateItemDto = { ...data };

    // Validate title if provided
    if (data.title !== undefined) {
      if (typeof data.title !== "string") {
        errors.push("Title must be a string");
      } else if (data.title.length > SECURITY_CONFIG.maxTitleLength) {
        errors.push(
          `Title must be less than ${SECURITY_CONFIG.maxTitleLength} characters`,
        );
      } else {
        sanitizedData.title = this.sanitizeText(data.title);
      }
    }

    // Validate content if provided
    if (data.content !== undefined) {
      const contentValidation = this.validateContent(data.content);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
      } else {
        sanitizedData.content = contentValidation.sanitizedContent!;
      }
    }

    // Validate tags if provided
    if (data.tags !== undefined) {
      const tagValidation = this.validateTags(data.tags);
      if (!tagValidation.isValid) {
        errors.push(...tagValidation.errors);
      } else {
        sanitizedData.tags = tagValidation.sanitizedTags;
      }
    }

    // Validate metadata if provided
    if (data.metadata !== undefined) {
      const metadataValidation = this.validateMetadata(data.metadata);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
      } else {
        sanitizedData.metadata = metadataValidation.sanitizedMetadata;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      ...(errors.length === 0 && { sanitizedData }),
    };
  }

  /**
   * Validate search request data
   */
  static validateSearchRequest(data: SearchRequestDto): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: SearchRequestDto;
  } {
    const errors: string[] = [];
    const sanitizedData: SearchRequestDto = { ...data };

    // Validate query
    if (!data.query || typeof data.query !== "string") {
      errors.push("Search query is required and must be a string");
    } else if (data.query.length > 500) {
      errors.push("Search query must be less than 500 characters");
    } else {
      // Sanitize search query to prevent injection attacks
      sanitizedData.query = this.sanitizeSearchQuery(data.query);
    }

    // Validate filters if provided
    if (data.filters) {
      const filterValidation = this.validateSearchFilters(data.filters);
      if (!filterValidation.isValid) {
        errors.push(...filterValidation.errors);
      } else {
        sanitizedData.filters = filterValidation.sanitizedFilters;
      }
    }

    // Validate pagination if provided
    if (data.pagination) {
      const paginationValidation = this.validatePagination(data.pagination);
      if (!paginationValidation.isValid) {
        errors.push(...paginationValidation.errors);
      } else {
        sanitizedData.pagination = paginationValidation.sanitizedPagination;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      ...(errors.length === 0 && { sanitizedData }),
    };
  }

  /**
   * Validate file upload data
   */
  static validateFileUpload(
    file: File,
    metadata?: UploadMediaDto,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate file existence
    if (!file) {
      errors.push("File is required");
      return { isValid: false, errors };
    }

    // Validate file size
    if (file.size > SECURITY_CONFIG.maxFileSize) {
      errors.push(
        `File size must be less than ${SECURITY_CONFIG.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Validate MIME type
    if (!SECURITY_CONFIG.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Validate file extension
    const extension = this.getFileExtension(file.name);
    if (!SECURITY_CONFIG.allowedFileExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Validate filename
    if (!this.isValidFilename(file.name)) {
      errors.push("Invalid filename - contains unsafe characters");
    }

    // Validate metadata if provided
    if (metadata) {
      if (metadata.metadata && typeof metadata.metadata !== "object") {
        errors.push("Metadata must be an object");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static validateContent(content: any): {
    isValid: boolean;
    errors: string[];
    sanitizedContent?: any;
  } {
    const errors: string[] = [];
    const sanitizedContent = { ...content };

    if (!content.body || typeof content.body !== "string") {
      errors.push("Content body is required and must be a string");
    } else if (content.body.length > SECURITY_CONFIG.maxContentLength) {
      errors.push(
        `Content body must be less than ${SECURITY_CONFIG.maxContentLength} characters`,
      );
    } else {
      // Sanitize HTML content
      sanitizedContent.body = this.sanitizeHtml(content.body);
    }

    if (!content.format || typeof content.format !== "string") {
      errors.push("Content format is required and must be a string");
    } else if (!["markdown", "html", "text"].includes(content.format)) {
      errors.push("Invalid content format");
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedContent: errors.length === 0 ? sanitizedContent : undefined,
    };
  }

  private static validateTags(tags: string[]): {
    isValid: boolean;
    errors: string[];
    sanitizedTags?: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(tags)) {
      errors.push("Tags must be an array");
      return { isValid: false, errors };
    }

    if (tags.length > SECURITY_CONFIG.maxTagCount) {
      errors.push(`Maximum ${SECURITY_CONFIG.maxTagCount} tags allowed`);
    }

    const sanitizedTags = tags
      .filter((tag) => typeof tag === "string")
      .map((tag) => this.sanitizeText(tag))
      .filter(
        (tag) => tag.length > 0 && tag.length <= SECURITY_CONFIG.maxTagLength,
      );

    if (sanitizedTags.length !== tags.length) {
      errors.push("Some tags were invalid and removed");
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedTags,
    };
  }

  private static validateMetadata(metadata: any): {
    isValid: boolean;
    errors: string[];
    sanitizedMetadata?: any;
  } {
    const errors: string[] = [];
    const sanitizedMetadata = { ...metadata };

    // Validate specific metadata fields
    if (
      metadata.difficulty &&
      !["beginner", "intermediate", "advanced"].includes(metadata.difficulty)
    ) {
      errors.push("Invalid difficulty level");
    }

    if (
      metadata.estimatedTime &&
      (typeof metadata.estimatedTime !== "number" || metadata.estimatedTime < 0)
    ) {
      errors.push("Estimated time must be a positive number");
    }

    if (metadata.author && typeof metadata.author === "string") {
      sanitizedMetadata.author = this.sanitizeText(metadata.author);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedMetadata: errors.length === 0 ? sanitizedMetadata : undefined,
    };
  }

  private static validateSearchFilters(filters: any): {
    isValid: boolean;
    errors: string[];
    sanitizedFilters?: any;
  } {
    const errors: string[] = [];
    const sanitizedFilters = { ...filters };

    // Validate filter values to prevent injection
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (Array.isArray(value)) {
        sanitizedFilters[key] = value.map((v) => this.sanitizeText(String(v)));
      } else if (typeof value === "string") {
        sanitizedFilters[key] = this.sanitizeText(value);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedFilters: errors.length === 0 ? sanitizedFilters : undefined,
    };
  }

  private static validatePagination(pagination: any): {
    isValid: boolean;
    errors: string[];
    sanitizedPagination?: any;
  } {
    const errors: string[] = [];
    const sanitizedPagination = { ...pagination };

    if (
      pagination.page &&
      (typeof pagination.page !== "number" || pagination.page < 1)
    ) {
      errors.push("Page must be a positive number");
    }

    if (
      pagination.limit &&
      (typeof pagination.limit !== "number" ||
        pagination.limit < 1 ||
        pagination.limit > 100)
    ) {
      errors.push("Limit must be a number between 1 and 100");
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedPagination:
        errors.length === 0 ? sanitizedPagination : undefined,
    };
  }

  private static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: URLs
      .replace(/on\w+=/gi, ""); // Remove event handlers
  }

  private static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: SECURITY_CONFIG.allowedHtmlTags,
      ALLOWED_ATTR: SECURITY_CONFIG.allowedAttributes,
      FORBID_TAGS: ["script", "object", "embed", "form", "input"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    });
  }

  private static sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, "")
      .replace(/['"]/g, "") // Remove quotes to prevent injection
      .replace(/[;]/g, "") // Remove semicolons
      .substring(0, 500); // Limit length
  }

  private static isValidContentType(type: string): boolean {
    const validTypes = [
      "lesson",
      "exercise",
      "article",
      "tutorial",
      "reference",
    ];
    return validTypes.includes(type);
  }

  private static getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf("."));
  }

  private static isValidFilename(filename: string): boolean {
    // Check for unsafe characters
    const unsafeChars = /[<>:"/\\|?*\x00-\x1f]/;
    return (
      !unsafeChars.test(filename) &&
      filename.length > 0 &&
      filename.length <= 255
    );
  }
}

/**
 * Authentication and authorization security
 */
export class AuthSecurityValidator {
  /**
   * Validate JWT token structure and expiration
   */
  static validateJwtToken(token: string): {
    isValid: boolean;
    errors: string[];
    payload?: Record<string, unknown>;
  } {
    const errors: string[] = [];

    try {
      // Basic JWT structure validation
      const parts = token.split(".");
      if (parts.length !== 3) {
        errors.push("Invalid JWT token structure");
        return { isValid: false, errors };
      }

      // Decode payload (without verification - server should verify signature)
      const payloadPart = parts[1];
      if (!payloadPart) {
        errors.push("Invalid JWT token payload");
        return { isValid: false, errors };
      }

      const payload = JSON.parse(atob(payloadPart)) as Record<string, unknown>;

      // Check expiration
      if (payload.exp && typeof payload.exp === "number") {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const bufferTime = SECURITY_CONFIG.tokenExpirationBuffer;

        if (expirationTime - bufferTime <= currentTime) {
          errors.push("Token is expired or will expire soon");
        }
      }

      // Validate required claims
      if (!payload.sub) {
        errors.push("Token missing subject claim");
      }

      if (!payload.iat) {
        errors.push("Token missing issued at claim");
      }

      const result: {
        isValid: boolean;
        errors: string[];
        payload?: Record<string, unknown>;
      } = {
        isValid: errors.length === 0,
        errors,
      };

      if (errors.length === 0) {
        result.payload = payload;
      }

      return result;
    } catch {
      errors.push("Failed to parse JWT token");
      return { isValid: false, errors };
    }
  }

  /**
   * Validate request origin and referrer
   */
  static validateRequestOrigin(
    origin: string,
    referrer?: string,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check HTTPS requirement in production
    if (SECURITY_CONFIG.requireHttps && process.env.NODE_ENV === "production") {
      if (!origin.startsWith("https://")) {
        errors.push("HTTPS is required in production");
      }
    }

    // Validate against allowed origins (would come from environment config)
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ];
    if (!allowedOrigins.includes(origin)) {
      errors.push("Origin not allowed");
    }

    // Validate referrer if provided
    if (
      referrer &&
      !allowedOrigins.some((allowed) => referrer.startsWith(allowed))
    ) {
      errors.push("Invalid referrer");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for common security headers
   */
  static validateSecurityHeaders(headers: Record<string, string>): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for CSRF protection
    if (!headers["x-csrf-token"] && !headers["x-requested-with"]) {
      warnings.push("Missing CSRF protection headers");
      recommendations.push("Add X-CSRF-Token or X-Requested-With header");
    }

    // Check for content type
    if (!headers["content-type"]) {
      warnings.push("Missing Content-Type header");
      recommendations.push("Always specify Content-Type header");
    }

    // Check for user agent
    if (!headers["user-agent"]) {
      warnings.push("Missing User-Agent header");
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations,
    };
  }
}

/**
 * Rate limiting and abuse prevention
 */
export class RateLimitValidator {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Check if request is within rate limits
   */
  static checkRateLimit(
    identifier: string,
    timeWindow: "minute" | "hour" = "minute",
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowMs = timeWindow === "minute" ? 60 * 1000 : 60 * 60 * 1000;
    const limit =
      timeWindow === "minute"
        ? SECURITY_CONFIG.maxRequestsPerMinute
        : SECURITY_CONFIG.maxRequestsPerHour;

    const key = `${identifier}:${timeWindow}`;
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}

/**
 * Security vulnerability scanner
 */
export class SecurityScanner {
  /**
   * Scan for common security vulnerabilities
   */
  static scanForVulnerabilities(): {
    vulnerabilities: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      recommendation: string;
    }>;
    score: number;
  } {
    const vulnerabilities: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      recommendation: string;
    }> = [];

    // Check environment configuration
    if (process.env.NODE_ENV === "production") {
      if (!process.env.HTTPS) {
        vulnerabilities.push({
          type: "insecure-transport",
          severity: "high",
          description: "HTTPS not enforced in production",
          recommendation: "Enable HTTPS for all production traffic",
        });
      }

      if (!process.env.CORS_ORIGINS) {
        vulnerabilities.push({
          type: "cors-misconfiguration",
          severity: "medium",
          description: "CORS origins not properly configured",
          recommendation: "Set specific allowed origins in CORS_ORIGINS",
        });
      }
    }

    // Check for debug mode in production
    if (process.env.NODE_ENV === "production" && process.env.DEBUG) {
      vulnerabilities.push({
        type: "debug-enabled",
        severity: "medium",
        description: "Debug mode enabled in production",
        recommendation: "Disable debug mode in production",
      });
    }

    // Check for default secrets
    const defaultSecrets = [
      "your-secret-key-here",
      "default-secret",
      "changeme",
    ];
    if (
      defaultSecrets.some(
        (secret) =>
          process.env.JWT_SECRET?.includes(secret) ||
          process.env.REQUEST_SIGNING_SECRET?.includes(secret),
      )
    ) {
      vulnerabilities.push({
        type: "default-secrets",
        severity: "critical",
        description: "Default secrets detected",
        recommendation: "Change all default secrets to strong, unique values",
      });
    }

    // Calculate security score
    const severityWeights = { low: 1, medium: 3, high: 7, critical: 15 };
    const totalDeductions = vulnerabilities.reduce(
      (sum, vuln) => sum + severityWeights[vuln.severity],
      0,
    );
    const score = Math.max(0, 100 - totalDeductions);

    return { vulnerabilities, score };
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(): {
    summary: string;
    score: number;
    vulnerabilities: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    recommendations: string[];
    compliance: {
      owasp: boolean;
      gdpr: boolean;
      hipaa: boolean;
    };
  } {
    const scan = this.scanForVulnerabilities();

    const recommendations = [
      "Regularly update dependencies to patch security vulnerabilities",
      "Implement proper input validation and sanitization",
      "Use HTTPS for all communications",
      "Implement proper authentication and authorization",
      "Regular security audits and penetration testing",
      "Monitor for suspicious activities and implement logging",
      "Implement proper error handling without information disclosure",
    ];

    const compliance = {
      owasp: scan.score >= 80,
      gdpr: scan.score >= 85, // Higher bar for GDPR compliance
      hipaa: scan.score >= 90, // Highest bar for HIPAA compliance
    };

    return {
      summary:
        scan.score >= 90
          ? "Excellent security posture"
          : scan.score >= 70
            ? "Good security with room for improvement"
            : scan.score >= 50
              ? "Moderate security concerns"
              : "Significant security issues require immediate attention",
      score: scan.score,
      vulnerabilities: scan.vulnerabilities,
      recommendations,
      compliance,
    };
  }
}

/**
 * Initialize security validations
 */
export function initializeSecurityValidations(): void {
  // Set up rate limit cleanup
  setInterval(
    () => {
      RateLimitValidator.cleanup();
    },
    5 * 60 * 1000,
  ); // Every 5 minutes

  // Perform initial security scan
  const report = SecurityScanner.generateSecurityReport();
  if (report.score < 70) {
    console.warn(
      "Security score is below recommended threshold:",
      report.score,
    );
    console.warn("Vulnerabilities found:", report.vulnerabilities);
  }

  console.log("Content Service security validations initialized");
}
