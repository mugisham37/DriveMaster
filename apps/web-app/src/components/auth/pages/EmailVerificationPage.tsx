"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { AuthErrorDisplay } from "../error-display";
import { FormSkeleton } from "../shared/LoadingState";
import type { AuthError } from "@/types/auth-service";

type VerificationStatus = "verifying" | "success" | "error" | "expired";

/**
 * EmailVerificationPage Component
 * 
 * Handles email verification flow:
 * - Extracts verification token from URL
 * - Validates token with API
 * - Displays success/error messages
 * - Provides resend option for expired tokens
 * - Redirects to dashboard after successful verification
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
export function EmailVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [error, setError] = useState<AuthError | null>(null);
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmailToken = async (verificationToken: string) => {
      try {
        setStatus("verifying");
        setError(null);

        // TODO: Implement API call to verify email
        // await authServiceClient.verifyEmail(verificationToken);
        
        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate success/failure based on token
        if (verificationToken === "expired") {
          setStatus("expired");
          setError({
            type: "authentication",
            message: "Verification link has expired",
            code: "TOKEN_EXPIRED",
            recoverable: true,
          });
        } else if (verificationToken === "invalid") {
          setStatus("error");
          setError({
            type: "authentication",
            message: "Invalid verification token",
            code: "INVALID_TOKEN",
            recoverable: false,
          });
        } else {
          setStatus("success");
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        }
      } catch {
        setStatus("error");
        setError({
          type: "server",
          message: "Failed to verify email. Please try again.",
          code: "VERIFICATION_FAILED",
          recoverable: true,
        });
      }
    };

    if (!token) {
      setStatus("error");
      setError({
        type: "validation",
        message: "Verification token is missing",
        code: "MISSING_TOKEN",
        recoverable: false,
      });
      return;
    }

    verifyEmailToken(token);
  }, [token, router]);

  const handleResend = async () => {
    setIsResending(true);
    
    try {
      // TODO: Implement API call to resend verification email
      // await authServiceClient.resendVerificationEmail();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatus("success");
      setError(null);
    } catch {
      setError({
        type: "server",
        message: "Failed to resend verification email",
        code: "RESEND_FAILED",
        recoverable: true,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {status === "verifying" && (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
            )}
            {(status === "error" || status === "expired") && (
              <XCircle className="h-8 w-8 text-red-600" aria-hidden="true" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === "verifying" && "Verifying Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "expired" && "Link Expired"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          
          <CardDescription>
            {status === "verifying" && "Please wait while we verify your email address..."}
            {status === "success" && "Your email has been successfully verified. Redirecting to dashboard..."}
            {status === "expired" && "This verification link has expired. Please request a new one."}
            {status === "error" && "We couldn't verify your email address."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "verifying" && (
            <FormSkeleton />
          )}

          {error && status !== "success" && (
            <AuthErrorDisplay
              error={error}
              showRecovery={error.recoverable}
            />
          )}

          {status === "expired" && (
            <div className="space-y-4">
              <Button
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
                aria-busy={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Sending...</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>
          )}

          {status === "error" && !error?.recoverable && (
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signin")}
              className="w-full"
            >
              Back to Sign In
            </Button>
          )}

          {status === "success" && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Redirecting in a moment...</p>
              <Button
                variant="link"
                onClick={() => router.push("/dashboard")}
                className="mt-2"
              >
                Go to Dashboard Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
