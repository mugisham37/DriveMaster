export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type FormValidationSchema = Record<string, ValidationRule>;

export function validateField(
  fieldName: string,
  value: unknown,
  rule: ValidationRule,
): ValidationResult {
  const errors: string[] = [];

  // Required validation
  if (
    rule.required &&
    (!value || (typeof value === "string" && value.trim() === ""))
  ) {
    errors.push(`${fieldName} is required`);
  }

  // Only validate other rules if value exists
  if (value && typeof value === "string") {
    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(
        `${fieldName} must be no more than ${rule.maxLength} characters`,
      );
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
  }

  // Custom validation
  if (rule.custom && value) {
    const customError = rule.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateForm(
  formData: Record<string, unknown>,
  schema: FormValidationSchema,
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  Object.keys(schema).forEach((fieldName) => {
    const value = formData[fieldName];
    const rule = schema[fieldName];
    if (rule) {
      results[fieldName] = validateField(fieldName, value, rule);
    }
  });

  return results;
}

export function isFormValid(
  results: Record<string, ValidationResult>,
): boolean {
  return Object.values(results).every((result) => result.isValid);
}

// Common validation rules
export const commonValidations = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: unknown) => {
      if (typeof value === "string" && value.length > 254) {
        return "Email address is too long";
      }
      return null;
    },
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: unknown) => {
      if (typeof value === "string") {
        if (!/(?=.*[a-z])/.test(value)) {
          return "Password must contain at least one lowercase letter";
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          return "Password must contain at least one uppercase letter";
        }
        if (!/(?=.*\d)/.test(value)) {
          return "Password must contain at least one number";
        }
      }
      return null;
    },
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    custom: (value: unknown) => {
      if (typeof value === "string" && /^[0-9]/.test(value)) {
        return "Username cannot start with a number";
      }
      return null;
    },
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  url: {
    pattern: /^https?:\/\/.+/,
    custom: (value: unknown) => {
      if (typeof value === "string" && value) {
        try {
          new URL(value);
          return null;
        } catch {
          return "Please enter a valid URL";
        }
      }
      return null;
    },
  },
};
