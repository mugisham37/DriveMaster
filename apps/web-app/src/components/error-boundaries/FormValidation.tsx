'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormFieldErrorProps {
  error?: string | undefined;
  touched?: boolean;
  showIcon?: boolean;
}

/**
 * Form Field Error Component
 * Displays inline validation errors for form fields
 * Requirements: 14.2
 */
export function FormFieldError({
  error,
  touched = false,
  showIcon = true,
}: FormFieldErrorProps) {
  if (!error || !touched) {
    return null;
  }

  return (
    <div className="flex items-start gap-1 mt-1 text-sm text-red-600" role="alert">
      {showIcon && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      <span>{error}</span>
    </div>
  );
}

export interface FormFieldSuccessProps {
  message?: string | undefined;
  show?: boolean;
  showIcon?: boolean;
}

/**
 * Form Field Success Component
 * Displays success feedback for form fields
 */
export function FormFieldSuccess({
  message,
  show = false,
  showIcon = true,
}: FormFieldSuccessProps) {
  if (!show || !message) {
    return null;
  }

  return (
    <div className="flex items-start gap-1 mt-1 text-sm text-green-600">
      {showIcon && <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

export interface FormFieldWrapperProps {
  children: React.ReactNode;
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  success?: string;
  showSuccess?: boolean;
  htmlFor?: string;
}

/**
 * Form Field Wrapper Component
 * Wraps form fields with label, error, and help text
 */
export function FormFieldWrapper({
  children,
  label,
  error,
  touched = false,
  required = false,
  helpText,
  success,
  showSuccess = false,
  htmlFor,
}: FormFieldWrapperProps) {
  const hasError = error && touched;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            'block text-sm font-medium',
            hasError ? 'text-red-600' : 'text-gray-700'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {children}

      {helpText && !hasError && !showSuccess && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      <FormFieldError error={error} touched={touched} />
      <FormFieldSuccess message={success} show={showSuccess} />
    </div>
  );
}

export interface FormErrorSummaryProps {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  title?: string;
}

/**
 * Form Error Summary Component
 * Displays a summary of all form errors
 */
export function FormErrorSummary({
  errors,
  touched,
  title = 'Please fix the following errors:',
}: FormErrorSummaryProps) {
  const visibleErrors = Object.entries(errors).filter(
    ([field]) => touched[field]
  );

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div
      className="p-4 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-2">{title}</h3>
          <ul className="list-disc list-inside space-y-1">
            {visibleErrors.map(([field, error]) => (
              <li key={field} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export interface FormSuccessMessageProps {
  message: string;
  show: boolean;
  onDismiss?: () => void;
}

/**
 * Form Success Message Component
 * Displays success feedback after form submission
 */
export function FormSuccessMessage({
  message,
  show,
  onDismiss,
}: FormSuccessMessageProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="p-4 bg-green-50 border border-green-200 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
