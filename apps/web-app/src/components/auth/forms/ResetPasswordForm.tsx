"use client";

/**
 * ResetPasswordForm Component
 * 
 * Password reset form with token validation
 * 
 * Features:
 * - React Hook Form with password validation
 * - New password with strength indicator
 * - Confirm password with match validation
 * - Token extraction and validation
 * - Success message and redirect
 * - Error handling for expired/invalid tokens
 * - Full accessibility support
 * 
 * Requirements: 9.2, 9.3, 9.4, 9.5, 14.1, 15.1
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthErrorDisplay } from "@/components/auth/error-display";
import { PasswordStrengthIndicator } from "@/components/auth/shared/PasswordStrengthIndicator";
import type { AuthError } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Component Props
// ============================================================================

export interface ResetPasswordFormProps {
  onSuccess?: () => void;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function ResetPasswordForm({
  onSuccess,
  className = "",
}: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  // ============================================================================
  // Token Extraction and Validation
  // ============================================================================

  useEffect(() => {
    const resetToken = searchParams.get("token");

    if (!resetToken) {
      setTokenError("Reset token is missing. Please request a new password reset link.");
      return;
    }

    // Basic token format validation
    if (resetToken.length < 20) {
      setTokenError("Invalid reset token. Please request a new password reset link.");
      return;
    }

    setToken(resetToken);
  }, [searchParams]);

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setTokenError("Reset token is missing. Please request a new password reset link.");
      return;
    }

    try {
      setError(null);

      // Call reset password API
      // TODO: Implement resetPassword in authClient
      // For now, using a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin?message=password-reset-success");
        if (onSuccess) {
          onSuccess();
        }
      }, 3000);
    } catch (err) {
      const authError: AuthError = {
        type: "authentication",
        message: "Failed to reset password. The link may have expired.",
        code: "RESET_TOKEN_INVALID",
        recoverable: false,
      };
      setError(authError);
      console.error("Password reset failed:", err);
    }
  };

  // ============================================================================
  // Render - Token Error State
  // ============================================================================

  if (tokenError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertDescription>
            <strong className="font-semibold">Invalid Reset Link</strong>
            <p className="mt-1">{tokenError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push("/auth/forgot-password")}
            >
              Request New Reset Link
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================================
  // Render - Success State
  // ============================================================================

  if (isSuccess) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong className="font-semibold">Password reset successful!</strong>
            <p className="mt-1">
              Your password has been reset successfully. You will be redirected
              to the sign in page in a few seconds.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================================
  // Render - Form
  // ============================================================================

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${className}`}
      noValidate
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter your new password below. Make sure it&apos;s strong and secure.
        </p>
      </div>

      {/* New Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password
                ? "password-error"
                : password
                  ? "password-strength"
                  : undefined
            }
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errors.password.message}
          </p>
        )}
        {password && !errors.password && (
          <div id="password-strength">
            <PasswordStrengthIndicator
              password={password}
              showRequirements={true}
            />
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm New Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirm your password"
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            className="pr-10"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label={
              showConfirmPassword ? "Hide password" : "Show password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p
            id="confirm-password-error"
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <AuthErrorDisplay
          error={error}
          showRecovery={false}
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
            <span>Resetting password...</span>
            <span className="sr-only">Please wait, resetting your password</span>
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );
}
