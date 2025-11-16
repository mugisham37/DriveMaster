/**
 * Form Validation Hook
 * 
 * Comprehensive form validation with support for various validation rules,
 * async validation, and field-level and form-level validation.
 * 
 * Requirements: 14.2
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ValidationRule<T = unknown> = {
  validate: (value: T, formValues?: Record<string, unknown>) => boolean | Promise<boolean>;
  message: string;
};

export type FieldValidation<T = unknown> = {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  email?: boolean | string;
  url?: boolean | string;
  custom?: ValidationRule<T>[];
};

export type FormValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldValidation<T[K]>;
};

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
}

export interface UseFormValidationOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validationSchema?: FormValidationSchema<T>;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useFormValidation<T extends Record<string, unknown>>({
  initialValues,
  validationSchema = {},
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
  validateOnMount = false,
}: UseFormValidationOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    submitCount: 0,
  });

  // Validate on mount if enabled
  useEffect(() => {
    if (validateOnMount) {
      validateForm(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Validates a single field
   */
  const validateField = useCallback(
    async (
      fieldName: keyof T,
      value: unknown,
      formValues: T
    ): Promise<string | undefined> => {
      const fieldValidation = validationSchema[fieldName];
      if (!fieldValidation) return undefined;

      // Required validation
      if (fieldValidation.required) {
        if (value === undefined || value === null || value === '') {
          const message =
            typeof fieldValidation.required === 'string'
              ? fieldValidation.required
              : 'This field is required';
          return message;
        }
      }

      const stringValue = String(value);

      // Min length validation
      if (fieldValidation.minLength && stringValue.length < fieldValidation.minLength.value) {
        return fieldValidation.minLength.message;
      }

      // Max length validation
      if (fieldValidation.maxLength && stringValue.length > fieldValidation.maxLength.value) {
        return fieldValidation.maxLength.message;
      }

      // Min value validation
      if (fieldValidation.min && typeof value === 'number' && value < fieldValidation.min.value) {
        return fieldValidation.min.message;
      }

      // Max value validation
      if (fieldValidation.max && typeof value === 'number' && value > fieldValidation.max.value) {
        return fieldValidation.max.message;
      }

      // Pattern validation
      if (fieldValidation.pattern && !fieldValidation.pattern.value.test(stringValue)) {
        return fieldValidation.pattern.message;
      }

      // Email validation
      if (fieldValidation.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(stringValue)) {
          const message =
            typeof fieldValidation.email === 'string'
              ? fieldValidation.email
              : 'Please enter a valid email address';
          return message;
        }
      }

      // URL validation
      if (fieldValidation.url) {
        try {
          new URL(stringValue);
        } catch {
          const message =
            typeof fieldValidation.url === 'string'
              ? fieldValidation.url
              : 'Please enter a valid URL';
          return message;
        }
      }

      // Custom validation rules
      if (fieldValidation.custom) {
        for (const rule of fieldValidation.custom) {
          const isValid = await rule.validate(value as T[keyof T], formValues);
          if (!isValid) {
            return rule.message;
          }
        }
      }

      return undefined;
    },
    [validationSchema]
  );

  /**
   * Validates all fields
   */
  const validateForm = useCallback(
    async (values: T): Promise<boolean> => {
      setState((prev) => ({ ...prev, isValidating: true }));

      const errors: Partial<Record<keyof T, string>> = {};

      for (const fieldName of Object.keys(validationSchema) as Array<keyof T>) {
        const error = await validateField(fieldName, values[fieldName], values);
        if (error) {
          errors[fieldName] = error;
        }
      }

      setState((prev) => ({
        ...prev,
        errors,
        isValidating: false,
      }));

      return Object.keys(errors).length === 0;
    },
    [validationSchema, validateField]
  );

  /**
   * Handles field value change
   */
  const handleChange = useCallback(
    async <K extends keyof T>(fieldName: K, value: T[K]) => {
      const newValues = { ...state.values, [fieldName]: value };

      setState((prev) => ({
        ...prev,
        values: newValues,
      }));

      // Validate on change if enabled
      if (validateOnChange) {
        const error = await validateField(fieldName, value, newValues);
        setState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fieldName]: error,
          },
        }));
      }
    },
    [state.values, validateOnChange, validateField]
  );

  /**
   * Handles field blur
   */
  const handleBlur = useCallback(
    async (fieldName: keyof T) => {
      setState((prev) => ({
        ...prev,
        touched: {
          ...prev.touched,
          [fieldName]: true,
        },
      }));

      // Validate on blur if enabled
      if (validateOnBlur) {
        const error = await validateField(
          fieldName,
          state.values[fieldName],
          state.values
        );
        setState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fieldName]: error,
          },
        }));
      }
    },
    [state.values, validateOnBlur, validateField]
  );

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      const allTouched = Object.keys(state.values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      );

      setState((prev) => ({
        ...prev,
        touched: allTouched,
        isSubmitting: true,
        submitCount: prev.submitCount + 1,
      }));

      // Validate form
      const isValid = await validateForm(state.values);

      if (!isValid) {
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      // Submit form
      try {
        await onSubmit(state.values);
        setState((prev) => ({ ...prev, isSubmitting: false }));
      } catch (error) {
        console.error('[FormValidation] Submit error:', error);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [state.values, validateForm, onSubmit]
  );

  /**
   * Resets form to initial values
   */
  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValidating: false,
      submitCount: 0,
    });
  }, [initialValues]);

  /**
   * Sets field value
   */
  const setFieldValue = useCallback(<K extends keyof T>(fieldName: K, value: T[K]) => {
    handleChange(fieldName, value);
  }, [handleChange]);

  /**
   * Sets field error
   */
  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error,
      },
    }));
  }, []);

  /**
   * Sets field touched
   */
  const setFieldTouched = useCallback((fieldName: keyof T, touched: boolean) => {
    setState((prev) => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName]: touched,
      },
    }));
  }, []);

  /**
   * Gets field props for easy integration
   */
  const getFieldProps = useCallback(
    <K extends keyof T>(fieldName: K) => ({
      name: String(fieldName),
      value: state.values[fieldName] as string | number | readonly string[] | undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleChange(fieldName, e.target.value as T[K]),
      onBlur: () => handleBlur(fieldName),
      'aria-invalid': state.touched[fieldName] && !!state.errors[fieldName],
      'aria-describedby': state.errors[fieldName]
        ? `${String(fieldName)}-error`
        : undefined,
    }),
    [state.values, state.touched, state.errors, handleChange, handleBlur]
  );

  const isValid = Object.keys(state.errors).length === 0;
  const isDirty = JSON.stringify(state.values) !== JSON.stringify(initialValues);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    submitCount: state.submitCount,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    getFieldProps,
    validateField,
    validateForm,
  };
}

// ============================================================================
// Common Validation Rules
// ============================================================================

export const commonValidations = {
  /**
   * Validates that a value matches another field
   */
  matchesField: <T extends Record<string, unknown>>(
    fieldName: keyof T,
    message: string
  ): ValidationRule => ({
    validate: (value, formValues) => {
      return value === (formValues as T)?.[fieldName];
    },
    message,
  }),

  /**
   * Validates file size
   */
  fileSize: (maxSizeInMB: number, message?: string): ValidationRule<File> => ({
    validate: (file) => {
      if (!(file instanceof File)) return true;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      return file.size <= maxSizeInBytes;
    },
    message: message || `File size must be less than ${maxSizeInMB}MB`,
  }),

  /**
   * Validates file type
   */
  fileType: (allowedTypes: string[], message?: string): ValidationRule<File> => ({
    validate: (file) => {
      if (!(file instanceof File)) return true;
      return allowedTypes.includes(file.type);
    },
    message: message || `File type must be one of: ${allowedTypes.join(', ')}`,
  }),

  /**
   * Async validation (e.g., check if username is available)
   */
  async: (
    asyncFn: (value: unknown) => Promise<boolean>,
    message: string
  ): ValidationRule => ({
    validate: asyncFn,
    message,
  }),
};
