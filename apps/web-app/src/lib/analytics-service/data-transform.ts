/**
 * Data Transformation Utilities for Analytics Service
 *
 * Handles conversion between Python snake_case and JavaScript camelCase,
 * datetime transformations, and response validation.
 *
 * Requirements: 2.3, 2.4
 */

import type {
  AnalyticsServiceError,
  ValidationErrorDetail,
} from "@/types/analytics-service";

// ============================================================================
// Case Conversion Utilities
// ============================================================================

/**
 * Converts snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts object keys from snake_case to camelCase
 */
export function transformKeysToCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToCamel(item)) as T;
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformKeysToCamel(value);
    }

    return transformed as T;
  }

  return obj as T;
}

/**
 * Recursively converts object keys from camelCase to snake_case
 */
export function transformKeysToSnake<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item)) as T;
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformKeysToSnake(value);
    }

    return transformed as T;
  }

  return obj as T;
}

// ============================================================================
// DateTime Transformation Utilities
// ============================================================================

/**
 * Converts ISO datetime string to Date object
 */
export function parseDateTime(dateString: string): Date {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime string: ${dateString}`);
  }

  return date;
}

/**
 * Converts Date object to ISO datetime string
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Transforms datetime strings in an object to Date objects
 */
export function transformDateTimeFields<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[] = [
    "timestamp",
    "createdAt",
    "updatedAt",
    "lastModified",
  ],
): T {
  const transformed = { ...obj };

  for (const field of dateFields) {
    if (field in transformed && typeof transformed[field] === "string") {
      try {
        (transformed as Record<string, unknown>)[field] = parseDateTime(
          transformed[field] as string,
        );
      } catch (error) {
        console.warn(`Failed to parse datetime field ${field}:`, error);
      }
    }
  }

  return transformed;
}

/**
 * Transforms Date objects in an object to ISO datetime strings
 */
export function serializeDateTimeFields<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[] = [
    "timestamp",
    "createdAt",
    "updatedAt",
    "lastModified",
  ],
): T {
  const serialized = { ...obj };

  for (const field of dateFields) {
    if (field in serialized && serialized[field] instanceof Date) {
      (serialized as Record<string, unknown>)[field] = formatDateTime(
        serialized[field] as Date,
      );
    }
  }

  return serialized;
}

// ============================================================================
// Response Transformation Pipeline
// ============================================================================

/**
 * Complete transformation pipeline for API responses
 */
export function transformApiResponse<T = unknown>(
  response: unknown,
  options: TransformOptions = {},
): T {
  const {
    convertKeys = true,
    parseDateTimes = true,
    dateFields = ["timestamp", "createdAt", "updatedAt", "lastModified"],
    validateResponse = true,
  } = options;

  let transformed = response;

  // Convert keys from snake_case to camelCase
  if (convertKeys) {
    transformed = transformKeysToCamel(transformed);
  }

  // Parse datetime strings to Date objects
  if (parseDateTimes && transformed && typeof transformed === "object") {
    transformed = transformDateTimeFields(
      transformed as Record<string, unknown>,
      dateFields,
    );
  }

  // Validate response structure if requested
  if (validateResponse) {
    validateResponseStructure(transformed);
  }

  return transformed as T;
}

/**
 * Complete transformation pipeline for API requests
 */
export function transformApiRequest<T = unknown>(
  request: unknown,
  options: TransformOptions = {},
): T {
  const {
    convertKeys = true,
    serializeDateTimes = true,
    dateFields = ["timestamp", "createdAt", "updatedAt", "lastModified"],
    validateRequest = true,
  } = options;

  let transformed = request;

  // Serialize Date objects to ISO strings
  if (serializeDateTimes && transformed && typeof transformed === "object") {
    transformed = serializeDateTimeFields(
      transformed as Record<string, unknown>,
      dateFields,
    );
  }

  // Convert keys from camelCase to snake_case
  if (convertKeys) {
    transformed = transformKeysToSnake(transformed);
  }

  // Validate request structure if requested
  if (validateRequest) {
    validateRequestStructure(transformed);
  }

  return transformed as T;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates API response structure
 */
export function validateResponseStructure(response: unknown): void {
  if (response === null || response === undefined) {
    throw new ValidationError("Response cannot be null or undefined");
  }

  // Additional validation logic can be added here
  // For now, we just ensure the response exists
}

/**
 * Validates API request structure
 */
export function validateRequestStructure(request: unknown): void {
  if (request === null || request === undefined) {
    throw new ValidationError("Request cannot be null or undefined");
  }

  // Additional validation logic can be added here
  // For now, we just ensure the request exists
}

/**
 * Validates that required fields are present in an object
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[],
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
      errors.push({
        field,
        message: `Required field '${field}' is missing or null`,
        value: obj[field],
        expected: "non-null value",
      });
    }
  }

  return errors;
}

/**
 * Validates field types in an object
 */
export function validateFieldTypes(
  obj: Record<string, unknown>,
  fieldTypes: Record<string, string>,
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (field in obj && obj[field] !== null && obj[field] !== undefined) {
      const actualType = typeof obj[field];

      if (actualType !== expectedType) {
        errors.push({
          field,
          message: `Field '${field}' has incorrect type`,
          value: obj[field],
          expected: expectedType,
        });
      }
    }
  }

  return errors;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Transforms error responses from the analytics service
 */
export function transformErrorResponse(error: unknown): AnalyticsServiceError {
  // If it's already a properly formatted error, return it
  if (isAnalyticsServiceError(error)) {
    return error;
  }

  // Handle axios errors
  if (isAxiosError(error)) {
    const status = error.response?.status;
    return {
      type:
        status === 401
          ? "authentication"
          : status === 403
            ? "authorization"
            : status && status >= 400 && status < 500
              ? "validation"
              : status && status >= 500
                ? "service"
                : "network",
      message: error.message,
      ...(error.code && { code: error.code }),
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      },
      recoverable: status !== 401 && status !== 403,
      timestamp: new Date(),
    };
  }

  // Handle network errors
  if (error instanceof Error) {
    return {
      type: "network",
      message: error.message,
      recoverable: true,
      timestamp: new Date(),
    };
  }

  // Handle unknown errors
  return {
    type: "service",
    message: "Unknown error occurred",
    details: { originalError: error },
    recoverable: false,
    timestamp: new Date(),
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for AnalyticsServiceError
 */
function isAnalyticsServiceError(
  error: unknown,
): error is AnalyticsServiceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error &&
    "recoverable" in error
  );
}

/**
 * Type guard for axios errors
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as AxiosError).isAxiosError === true
  );
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for data transformation
 */
export interface TransformOptions {
  /** Whether to convert keys between snake_case and camelCase */
  convertKeys?: boolean;
  /** Whether to parse datetime strings to Date objects (responses) */
  parseDateTimes?: boolean;
  /** Whether to serialize Date objects to ISO strings (requests) */
  serializeDateTimes?: boolean;
  /** Fields to treat as datetime fields */
  dateFields?: string[];
  /** Whether to validate response structure */
  validateResponse?: boolean;
  /** Whether to validate request structure */
  validateRequest?: boolean;
}

/**
 * Axios error interface (simplified)
 */
interface AxiosError extends Error {
  isAxiosError: boolean;
  code?: string;
  response?: {
    status: number;
    statusText: string;
    data: unknown;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep clones an object to avoid mutation
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Safely gets a nested property from an object
 */
export function getNestedProperty(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object" && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}

/**
 * Safely sets a nested property in an object
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = keys.reduce((current, key) => {
    if (
      !(key in current) ||
      typeof current[key] !== "object" ||
      current[key] === null
    ) {
      current[key] = {};
    }
    return current[key] as Record<string, unknown>;
  }, obj);

  target[lastKey] = value;
}
