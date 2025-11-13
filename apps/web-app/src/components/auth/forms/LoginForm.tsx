"use client";

/**
 * LoginForm Component
 * 
 * Email/password login form with validation and "Remember Me" functionality
 * 
 * Features:
 * - React Hook Form with Zod validation
 * - Email and password fields with validation
 * - Password visibility toggle
 * - Remember Me checkbox
 * - Loading states and error display
 * - Autocomplete attributes for password managers
 * - Full accessibility support
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 14.1, 15.1, 15.2
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthErrorDisplay } from "@/components/auth/error-display";
import type { UserProfile } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must not exceed 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

// ============================================================================
// Component Props
// ============================================================================

export interface LoginFormProps {
  onSuccess?: (user: UserProfile) => void;
  redirectTo?: string;
  showOAuthOptions?: boolean;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function LoginForm({
  onSuccess,
  redirectTo,
  className = "",
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { state } = useAuth();
  const { login } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(
        {
          email: data.email,
          password: data.password,
        },
        {
          ...(redirectTo && { redirectTo }),
          rememberMe: data.rememberMe,
        }
      );

      // Call success callback if provided
      if (onSuccess && state.user) {
        onSuccess(state.user);
      }
    } catch (error) {
      // Error is handled by AuthContext and displayed via loginError
      console.error("Login failed:", error);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const isLoading = state.isLoginLoading || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${className}`}
      noValidate
    >
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
          disabled={isLoading}
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

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
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
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
          disabled={isLoading}
          aria-label="Remember me"
        />
        <Label
          htmlFor="rememberMe"
          className="text-sm font-normal cursor-pointer"
        >
          Remember me
        </Label>
      </div>

      {/* Error Display */}
      {state.loginError && (
        <AuthErrorDisplay
          error={state.loginError}
          onRetry={() => handleSubmit(onSubmit)()}
          showRecovery={state.loginError.recoverable}
        />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Signing in...</span>
            <span className="sr-only">Please wait, signing in</span>
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
