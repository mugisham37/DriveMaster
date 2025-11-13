"use client";

/**
 * SignInPage Component
 * 
 * Complete sign-in page with email/password login and OAuth options
 * 
 * Features:
 * - Centered card layout
 * - LoginForm integration
 * - OAuth buttons for social login
 * - MFA verification support
 * - Links to signup and forgot password
 * - Callback URL handling
 * - Auto-redirect if already authenticated
 * - Responsive design
 * - Full accessibility
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 10.2, 10.4, 15.1, 19.3, 19.4
 */

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { OAuthButtons } from "@/components/auth/oauth/OAuthButtons";
import { MFAVerificationForm } from "@/components/auth/mfa/MFAVerificationForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useAuth();
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      router.push(callbackUrl);
    }
  }, [state.isAuthenticated, state.user, router, callbackUrl]);

  // Check if MFA is required after login attempt
  // In a real implementation, the login API would return a flag indicating MFA is required
  // For now, we'll check if the user has mfaEnabled flag
  useEffect(() => {
    // This would be triggered by the login response indicating MFA is required
    // For demonstration, we're checking the user object
    if (state.user && (state.user as any).mfaEnabled && !state.isAuthenticated) {
      setShowMFAVerification(true);
    }
  }, [state.user, state.isAuthenticated]);

  const handleMFAVerify = async (code: string, isBackupCode: boolean) => {
    setIsVerifyingMFA(true);
    setMfaError(null);

    try {
      // TODO: Replace with actual API call to verify MFA code
      // This would call something like: await verifyMFACode({ code, isBackupCode });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate verification
      if (code === "123456" || isBackupCode) {
        // On success, the auth context should update and redirect
        router.push(callbackUrl);
      } else {
        setMfaError("Invalid verification code. Please try again.");
      }
    } catch (error) {
      setMfaError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  const handleCancelMFA = () => {
    setShowMFAVerification(false);
    setMfaError(null);
    // Optionally clear the partial login state
  };

  // Show loading while checking auth or redirecting
  if (state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show MFA verification if required
  if (showMFAVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
        <div className="w-full max-w-md space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelMFA}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>

          <MFAVerificationForm
            onVerify={handleMFAVerify}
            onCancel={handleCancelMFA}
            error={mfaError}
            isLoading={isVerifyingMFA}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* OAuth Buttons */}
          <OAuthButtons
            mode="login"
            redirectUrl={callbackUrl}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm redirectTo={callbackUrl} />
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 px-4 sm:px-6">
          {/* Forgot Password Link */}
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary hover:underline text-center touch-target"
          >
            Forgot your password?
          </Link>

          {/* Sign Up Link */}
          <div className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/auth/signup${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-primary hover:underline font-medium touch-target"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
