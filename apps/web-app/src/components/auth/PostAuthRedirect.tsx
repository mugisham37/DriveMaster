/**
 * Post-Authentication Redirect Component
 * 
 * This component handles the seamless transition from authentication to user service.
 * It displays loading states and error handling during the redirect process.
 * 
 * Usage:
 * Place this component on pages that should automatically redirect after authentication,
 * such as the OAuth callback page or the sign-in success page.
 */

"use client";

import { useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAutoPostAuthRedirect } from "@/hooks/usePostAuthRedirect";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PostAuthRedirect() {
  const { isRedirecting, error } = useAutoPostAuthRedirect();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Redirect Failed</AlertTitle>
            <AlertDescription>
              {error.message || "An error occurred while setting up your account."}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {isRedirecting ? "Setting up your account..." : "Redirecting..."}
          </h2>
          <p className="text-muted-foreground">
            Please wait while we prepare your personalized experience.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Manual Post-Auth Redirect Component
 * 
 * This component provides manual control over the redirect process.
 * Useful for pages where you want to show additional content before redirecting.
 */

interface ManualPostAuthRedirectProps {
  onRedirectStart?: () => void;
  onRedirectComplete?: () => void;
  onError?: (error: Error) => void;
}

export function ManualPostAuthRedirect({
  onRedirectStart,
  onRedirectComplete,
  onError,
}: ManualPostAuthRedirectProps) {
  const { isRedirecting, error } = useAutoPostAuthRedirect();

  useEffect(() => {
    if (isRedirecting && onRedirectStart) {
      onRedirectStart();
    }
  }, [isRedirecting, onRedirectStart]);

  useEffect(() => {
    if (!isRedirecting && !error && onRedirectComplete) {
      onRedirectComplete();
    }
  }, [isRedirecting, error, onRedirectComplete]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return null;
}
