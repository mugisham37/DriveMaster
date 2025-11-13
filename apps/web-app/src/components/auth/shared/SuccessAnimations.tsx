/**
 * Success Animation Components
 * Provides subtle, non-intrusive success animations for authentication flows
 */

"use client";

import React from "react";
import { CheckCircle2, Check } from "lucide-react";

interface SuccessCheckmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated checkmark for successful operations
 */
export function SuccessCheckmark({
  size = "md",
  className = "",
}: SuccessCheckmarkProps): React.ReactElement {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Success"
    >
      <CheckCircle2
        className={`${sizeClasses[size]} animate-scale-in text-green-500`}
        strokeWidth={2}
      />
      <span className="sr-only">Operation successful</span>
    </div>
  );
}

/**
 * Inline success indicator for form fields
 */
export function InlineSuccessIndicator({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`flex items-center space-x-1 text-green-600 ${className}`}
      role="status"
      aria-label="Valid"
    >
      <Check className="h-4 w-4 animate-scale-in" />
      <span className="sr-only">Field is valid</span>
    </div>
  );
}

/**
 * Success message with fade-in animation
 */
export function SuccessMessage({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`flex items-center space-x-2 rounded-md bg-green-50 p-3 text-green-800 animate-fade-in ${className}`}
      role="alert"
      aria-live="polite"
    >
      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * Success overlay for full-page operations
 */
export function SuccessOverlay({
  message = "Success!",
  onComplete,
  duration = 2000,
}: {
  message?: string;
  onComplete?: () => void;
  duration?: number;
}): React.ReactElement {
  React.useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [onComplete, duration]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in"
      role="status"
      aria-label={message}
    >
      <div className="flex flex-col items-center space-y-4 rounded-lg bg-white p-8 shadow-xl animate-scale-in">
        <CheckCircle2 className="h-16 w-16 text-green-500" strokeWidth={2} />
        <p className="text-lg font-semibold text-gray-900">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}

/**
 * Hook for managing success animations
 */
export function useSuccessAnimation(duration = 2000) {
  const [showSuccess, setShowSuccess] = React.useState(false);

  const triggerSuccess = React.useCallback(() => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), duration);
  }, [duration]);

  return {
    showSuccess,
    triggerSuccess,
    setShowSuccess,
  };
}
