/**
 * Input Sanitization Utilities
 * 
 * Provides comprehensive input sanitization to prevent XSS and injection attacks
 * Implements security requirement 16.3
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove potentially dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized;
}

/**
 * Sanitize user input for display
 * Escapes HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize email input
 * Removes potentially dangerous characters while preserving valid email format
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Remove whitespace
  let sanitized = email.trim();

  // Remove any HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Only allow valid email characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9@._+-]/g, '');

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized.toLowerCase();
}

/**
 * Sanitize password input
 * Removes null bytes and limits length
 */
export function sanitizePassword(password: string): string {
  if (!password) return '';

  // Remove null bytes
  let sanitized = password.replace(/\0/g, '');

  // Limit length (max 128 characters for passwords)
  if (sanitized.length > 128) {
    sanitized = sanitized.substring(0, 128);
  }

  return sanitized;
}

/**
 * Sanitize text input
 * Removes HTML and limits length
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text) return '';

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize URL input
 * Ensures URL is safe and uses allowed protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Trim whitespace
  let sanitized = url.trim();

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Check for allowed protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  const hasProtocol = /^[a-z]+:/i.test(sanitized);

  if (hasProtocol) {
    const protocol = (sanitized.split(':')[0]?.toLowerCase() || '') + ':';
    if (!allowedProtocols.includes(protocol)) {
      // Remove dangerous protocol
      sanitized = sanitized.replace(/^[a-z]+:/i, '');
    }
  }

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/^javascript:/gi, '');
  sanitized = sanitized.replace(/^data:/gi, '');

  // Limit length
  if (sanitized.length > 2048) {
    sanitized = sanitized.substring(0, 2048);
  }

  return sanitized;
}

/**
 * Sanitize filename
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Only allow safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}

/**
 * Sanitize JSON input
 * Safely parse JSON and remove dangerous content
 */
export function sanitizeJson(jsonString: string): unknown {
  if (!jsonString) return null;

  try {
    const parsed = JSON.parse(jsonString);

    // Recursively sanitize string values
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return sanitizeText(value);
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else if (value !== null && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[sanitizeText(key, 100)] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    return sanitizeValue(parsed);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Validate and sanitize input length
 * Ensures input doesn't exceed maximum length
 */
export function validateLength(
  input: string,
  minLength: number,
  maxLength: number
): { isValid: boolean; sanitized: string; error?: string } {
  if (!input) {
    return {
      isValid: false,
      sanitized: '',
      error: `Input must be at least ${minLength} characters`,
    };
  }

  const sanitized = input.trim();

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      sanitized,
      error: `Input must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized: sanitized.substring(0, maxLength),
      error: `Input must not exceed ${maxLength} characters`,
    };
  }

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Comprehensive input sanitization
 * Applies multiple sanitization techniques
 */
export function sanitizeInput(
  input: string,
  options: {
    type?: 'text' | 'email' | 'url' | 'html' | 'filename';
    maxLength?: number;
    allowHtml?: boolean;
  } = {}
): string {
  const { type = 'text', maxLength = 1000, allowHtml = false } = options;

  if (!input) return '';

  switch (type) {
    case 'email':
      return sanitizeEmail(input);
    case 'url':
      return sanitizeUrl(input);
    case 'html':
      return allowHtml ? sanitizeHtml(input) : escapeHtml(input);
    case 'filename':
      return sanitizeFilename(input);
    case 'text':
    default:
      return sanitizeText(input, maxLength);
  }
}

/**
 * Check if input contains potential XSS
 * Returns true if suspicious patterns are detected
 */
export function containsXss(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if input contains SQL injection patterns
 * Returns true if suspicious patterns are detected
 */
export function containsSqlInjection(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /('|")\s*(OR|AND)\s*('|")/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize object properties
 * Recursively sanitizes all string properties in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
  } = {}
): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const sanitizeOptions: {
        type: 'text';
        maxLength?: number;
        allowHtml?: boolean;
      } = { type: 'text' };
      
      if (options.maxLength !== undefined) {
        sanitizeOptions.maxLength = options.maxLength;
      }
      if (options.allowHtml !== undefined) {
        sanitizeOptions.allowHtml = options.allowHtml;
      }
      
      sanitized[key] = sanitizeInput(value, sanitizeOptions);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizeInput(item, options)
          : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
