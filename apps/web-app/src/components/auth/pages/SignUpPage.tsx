"use client";

/**
 * SignUpPage Component
 * 
 * Complete sign-up page with registration form and OAuth options
 * 
 * Features:
 * - Centered card layout
 * - RegisterForm integration
 * - OAuth buttons for social registration
 * - Link to signin page
 * - Terms of service link
 * - Callback URL handling
 * - Auto-redirect if already authenticated
 * - Responsive design
 * - Full accessibility
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 15.1
 */

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { RegisterForm } from "@/components/auth/forms/RegisterForm";
import { OAuthButtons } from "@/components/auth/oauth/OAuthButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useAuth();

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      router.push(callbackUrl);
    }
  }, [state.isAuthenticated, state.user, router, callbackUrl]);

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription className="text-sm">
            Get started with DriveMaster today
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* OAuth Buttons */}
          <OAuthButtons
            mode="register"
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

          {/* Register Form */}
          <RegisterForm redirectTo={callbackUrl} />
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 px-4 sm:px-6">
          {/* Terms of Service */}
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline touch-target"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline touch-target"
            >
              Privacy Policy
            </Link>
          </p>

          {/* Sign In Link */}
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/auth/signin${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-primary hover:underline font-medium touch-target"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
