"use client";

/**
 * ForgotPasswordForm Component
 * 
 * Password reset request form
 * 
 * Features:
 * - React Hook Form with email validation
 * - Email input field
 * - Success message display
 * - Error handling
 * - Loading states
 * - Full accessibility support
 * 
 * Requirements: 9.1, 14.1, 15.1
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthErrorDisplay } from "@/components/auth/error-display";
import type { AuthError } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must not exceed 255 characters"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================================================
// Component Props
// ============================================================================

export interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function ForgotPasswordForm({
  onSuccess,
  className = "",
}: ForgotPasswordFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (_data: ForgotPasswordFormData) => {
    try {
      setError(null);
      
      // Call forgot password API
      // TODO: Implement requestPasswordReset in authClient
      // For now, using a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const authError: AuthError = {
        type: "server",
        message: "Failed to send password reset email. Please try again.",
        recoverable: true,
      };
      setError(authError);
      console.error("Forgot password failed:", err);
    }
  };

  // ============================================================================
  // Retry Handler
  // ============================================================================

  const handleRetry = () => {
    setError(null);
    handleSubmit(onSubmit)();
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isSuccess) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong className="font-semibold">Check your email</strong>
            <p className="mt-1">
              We&apos;ve sent password reset instructions to{" "}
              <strong>{getValues("email")}</strong>. Please check your inbox
              and follow the link to reset your password.
            </p>
            <p className="mt-2 text-sm">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="text-green-700 dark:text-green-300 underline hover:no-underline"
              >
                try again
              </button>
              .
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${className}`}
      noValidate
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you instructions to reset
          your password.
        </p>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p
            id="email-error"
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <AuthErrorDisplay
          error={error}
          onRetry={handleRetry}
          showRecovery={error.recoverable}
        />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Sending...</span>
            <span className="sr-only">Please wait, sending reset email</span>
          </>
        ) : (
          "Send Reset Instructions"
        )}
      </Button>
    </form>
  );
}
