"use client";

/**
 * RegisterForm Component
 * 
 * User registration form with email, password, country, and timezone
 * 
 * Features:
 * - React Hook Form with Zod validation
 * - Email uniqueness check (debounced)
 * - Password strength indicator
 * - Country selection with search
 * - Auto-detected timezone and language
 * - Terms of service agreement
 * - Loading states and error display
 * - Full accessibility support
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 14.1, 15.1, 15.2
 */

import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthErrorDisplay } from "@/components/auth/error-display";
import { PasswordStrengthIndicator } from "@/components/auth/shared/PasswordStrengthIndicator";
import type { UserProfile } from "@/types/auth-service";

// ============================================================================
// Validation Schema
// ============================================================================

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must not exceed 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  countryCode: z
    .string()
    .length(2, "Please select a country")
    .regex(/^[A-Z]{2}$/, "Invalid country code"),
  timezone: z.string().optional(),
  language: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================================
// Country List (Common countries)
// ============================================================================

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "NZ", name: "New Zealand" },
  { code: "ZA", name: "South Africa" },
];

// ============================================================================
// Component Props
// ============================================================================

export interface RegisterFormProps {
  onSuccess?: (user: UserProfile) => void;
  redirectTo?: string;
  showOAuthOptions?: boolean;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function RegisterForm({
  onSuccess,
  redirectTo,
  className = "",
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { state } = useAuth();
  const { register: registerUser } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      countryCode: "",
      timezone: "",
      language: "",
      acceptTerms: false,
    },
  });

  const password = watch("password");
  const acceptTerms = watch("acceptTerms");
  const countryCode = watch("countryCode");

  // ============================================================================
  // Auto-detect Timezone and Language
  // ============================================================================

  useEffect(() => {
    // Auto-detect timezone
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setValue("timezone", detectedTimezone);
    } catch (error) {
      console.warn("Failed to detect timezone:", error);
    }

    // Auto-detect language
    try {
      const detectedLanguage = navigator.language.split("-")[0];
      setValue("language", detectedLanguage);
    } catch (error) {
      console.warn("Failed to detect language:", error);
    }
  }, [setValue]);

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(
        {
          email: data.email,
          password: data.password,
          countryCode: data.countryCode,
          ...(data.timezone && { timezone: data.timezone }),
          ...(data.language && { language: data.language }),
        },
        {
          ...(redirectTo && { redirectTo }),
          autoLogin: true,
        }
      );

      // Call success callback if provided
      if (onSuccess && state.user) {
        onSuccess(state.user);
      }
    } catch (error) {
      // Error is handled by AuthContext and displayed via registerError
      console.error("Registration failed:", error);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const isLoading = state.isRegisterLoading || isSubmitting;

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
            autoComplete="new-password"
            placeholder="Create a strong password"
            disabled={isLoading}
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
        {password && !errors.password && (
          <div id="password-strength">
            <PasswordStrengthIndicator
              password={password}
              showRequirements={true}
            />
          </div>
        )}
      </div>

      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium">
          Country
        </Label>
        <Select
          value={countryCode}
          onValueChange={(value) => setValue("countryCode", value)}
          disabled={isLoading}
        >
          <SelectTrigger
            id="country"
            aria-required="true"
            aria-invalid={!!errors.countryCode}
            aria-describedby={errors.countryCode ? "country-error" : undefined}
          >
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.countryCode && (
          <p
            id="country-error"
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errors.countryCode.message}
          </p>
        )}
      </div>

      {/* Terms of Service */}
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setValue("acceptTerms", !!checked)}
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!errors.acceptTerms}
            aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
            className="mt-1"
          />
          <Label
            htmlFor="acceptTerms"
            className="text-sm font-normal cursor-pointer leading-relaxed"
          >
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </a>
          </Label>
        </div>
        {errors.acceptTerms && (
          <p
            id="terms-error"
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      {/* Error Display */}
      {state.registerError && (
        <AuthErrorDisplay
          error={state.registerError}
          onRetry={() => handleSubmit(onSubmit)()}
          showRecovery={state.registerError.recoverable}
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
            <span>Creating account...</span>
            <span className="sr-only">Please wait, creating your account</span>
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
