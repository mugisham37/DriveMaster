/**
 * Form Validation Feedback Components
 * Provides real-time validation feedback with success indicators and help text
 */

"use client";

import React from "react";
import { Check, X, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationFeedbackProps {
  isValid?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  successMessage?: string;
  helpText?: string;
  showValidation?: boolean;
  className?: string;
}

/**
 * Comprehensive validation feedback for form fields
 */
export function ValidationFeedback({
  isValid,
  isInvalid,
  errorMessage,
  successMessage,
  helpText,
  showValidation = true,
  className = "",
}: ValidationFeedbackProps): React.ReactElement | null {
  if (!showValidation && !helpText) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Help text - always shown if provided */}
      {helpText && !isInvalid && !isValid && (
        <div className="flex items-start space-x-1 text-xs text-gray-500">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>{helpText}</span>
        </div>
      )}

      {/* Error message */}
      {showValidation && isInvalid && errorMessage && (
        <div
          className="flex items-start space-x-1 text-xs text-red-600 animate-fade-in"
          role="alert"
          aria-live="polite"
        >
          <X className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success message */}
      {showValidation && isValid && successMessage && (
        <div
          className="flex items-start space-x-1 text-xs text-green-600 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <Check className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Inline validation indicator for input fields
 */
export function InlineValidationIndicator({
  isValid,
  isInvalid,
  isValidating,
  className = "",
}: {
  isValid?: boolean;
  isInvalid?: boolean;
  isValidating?: boolean;
  className?: string;
}): React.ReactElement | null {
  if (isValidating) {
    return (
      <div className={cn("absolute right-3 top-1/2 -translate-y-1/2", className)}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        <span className="sr-only">Validating...</span>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={cn("absolute right-3 top-1/2 -translate-y-1/2", className)}>
        <Check className="h-4 w-4 text-green-600 animate-scale-in" />
        <span className="sr-only">Valid</span>
      </div>
    );
  }

  if (isInvalid) {
    return (
      <div className={cn("absolute right-3 top-1/2 -translate-y-1/2", className)}>
        <X className="h-4 w-4 text-red-600 animate-scale-in" />
        <span className="sr-only">Invalid</span>
      </div>
    );
  }

  return null;
}

/**
 * Field-level requirements checklist
 */
export function FieldRequirements({
  requirements,
  className = "",
}: {
  requirements: Array<{
    label: string;
    met: boolean;
  }>;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("space-y-1", className)}>
      {requirements.map((req, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center space-x-2 text-xs transition-colors",
            req.met ? "text-green-600" : "text-gray-500"
          )}
        >
          {req.met ? (
            <Check className="h-3 w-3 animate-scale-in" />
          ) : (
            <div className="h-3 w-3 rounded-full border border-current" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Character counter for text inputs
 */
export function CharacterCounter({
  current,
  max,
  className = "",
}: {
  current: number;
  max: number;
  className?: string;
}): React.ReactElement {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = current > max;

  return (
    <div
      className={cn(
        "text-xs transition-colors",
        isOverLimit
          ? "text-red-600"
          : isNearLimit
            ? "text-yellow-600"
            : "text-gray-500",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {current} / {max}
      {isOverLimit && (
        <span className="ml-1 font-medium">
          ({current - max} over limit)
        </span>
      )}
    </div>
  );
}

/**
 * Form-level error summary
 */
export function FormErrorSummary({
  errors,
  className = "",
}: {
  errors: Array<{
    field: string;
    message: string;
  }>;
  className?: string;
}): React.ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-red-200 bg-red-50 p-4 animate-fade-in",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>
                <strong>{error.field}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for debounced validation
 */
export function useDebouncedValidation<T>(
  value: T,
  validationFn: (value: T) => Promise<boolean> | boolean,
  delay = 500
) {
  const [isValidating, setIsValidating] = React.useState(false);
  const [isValid, setIsValid] = React.useState<boolean | undefined>(undefined);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setIsValidating(true);
    setIsValid(undefined);
    setError(undefined);

    const timer = setTimeout(async () => {
      try {
        const result = await validationFn(value);
        setIsValid(result);
        if (!result) {
          setError("Validation failed");
        }
      } catch (err) {
        setIsValid(false);
        setError(err instanceof Error ? err.message : "Validation error");
      } finally {
        setIsValidating(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, validationFn, delay]);

  return {
    isValidating,
    isValid,
    error,
  };
}
