"use client";

/**
 * OAuthCallbackHandler Component
 * 
 * Handles OAuth callback after provider authentication
 * Validates state, exchanges code for tokens, and redirects user
 * 
 * Requirements: 3.3, 3.4, 3.5, 13.1, 13.2, 14.1
 */

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { OAuthProviderType } from "@/types/auth-service";

export interface OAuthCallbackHandlerProps {
  provider: OAuthProviderType;
  onSuccess?: (redirectUrl?: string) => void;
  onError?: (error: Error) => void;
}

type CallbackState = "loading" | "success" | "error";

export function OAuthCallbackHandler({
  provider,
  onSuccess,
  onError,
}: OAuthCallbackHandlerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract code and state from URL
        const code = searchParams.get("code");
        const stateParam = searchParams.get("state");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // Handle OAuth provider errors
        if (errorParam) {
          const errorMessage = getOAuthErrorMessage(errorParam, errorDescription, provider);
          setError(errorMessage);
          setState("error");
          onError?.(new Error(errorMessage));
          return;
        }

        // Validate required parameters
        if (!code || !stateParam) {
          const errorMessage = "Missing authorization code or state parameter. Please try signing in again.";
          setError(errorMessage);
          setState("error");
          onError?.(new Error(errorMessage));
          return;
        }

        // Import OAuth client and token manager
        const { oauthClient } = await import("@/lib/auth/oauth-client");
        const { integratedTokenManager } = await import("@/lib/auth/token-manager");

        // Handle OAuth callback
        const result = await oauthClient.handleCallback(provider, code, stateParam);

        // Store tokens
        await integratedTokenManager.storeTokens(result.tokens, {
          id: result.user.id,
          email: result.user.email,
          handle: result.user.handle,
          name: result.user.name,
        });

        // Get redirect URL from session storage
        const storedRedirectUrl = sessionStorage.getItem(`oauth_redirect_${provider}`);
        setRedirectUrl(storedRedirectUrl || "/dashboard");

        setState("success");

        // Call success callback
        onSuccess?.(storedRedirectUrl || undefined);

        // Redirect after a short delay to show success message
        setTimeout(() => {
          router.push(storedRedirectUrl || "/dashboard");
        }, 1500);
      } catch (err) {
        console.error("OAuth callback error:", err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : "Authentication failed. Please try again.";
        setError(errorMessage);
        setState("error");
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, searchParams, router, onSuccess, onError]);

  const handleRetry = () => {
    router.push("/auth/signin");
  };

  const handleBackToSignIn = () => {
    router.push("/auth/signin");
  };

  const getProviderDisplayName = (prov: OAuthProviderType): string => {
    const names: Record<OAuthProviderType, string> = {
      google: "Google",
      apple: "Apple",
      facebook: "Facebook",
      github: "GitHub",
      microsoft: "Microsoft",
    };
    return names[prov] || prov;
  };

  const getOAuthErrorMessage = (
    errorCode: string,
    description: string | null,
    prov: OAuthProviderType
  ): string => {
    const providerName = getProviderDisplayName(prov);

    switch (errorCode) {
      case "access_denied":
        return `You cancelled the ${providerName} sign-in. Please try again if you want to continue.`;
      case "invalid_request":
        return `There was a problem with the ${providerName} sign-in request. Please try again.`;
      case "unauthorized_client":
        return `${providerName} sign-in is not properly configured. Please contact support.`;
      case "unsupported_response_type":
      case "invalid_scope":
        return `${providerName} sign-in configuration error. Please contact support.`;
      case "server_error":
        return `${providerName} is experiencing issues. Please try again later.`;
      case "temporarily_unavailable":
        return `${providerName} is temporarily unavailable. Please try again in a few moments.`;
      default:
        return description || `${providerName} sign-in failed. Please try again.`;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {state === "loading" && "Completing Sign In"}
            {state === "success" && "Success!"}
            {state === "error" && "Sign In Failed"}
          </CardTitle>
          <CardDescription className="text-center">
            {state === "loading" && `Connecting with ${getProviderDisplayName(provider)}...`}
            {state === "success" && "You've been successfully signed in"}
            {state === "error" && "We couldn't complete your sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Loading State */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Please wait while we complete your authentication...
              </p>
              <span className="sr-only">Authenticating with {getProviderDisplayName(provider)}</span>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Redirecting you to {redirectUrl === "/dashboard" ? "your dashboard" : "your destination"}...
              </p>
              <span className="sr-only">Authentication successful</span>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription role="alert" aria-live="polite">
                  {error}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleRetry}
                  className="flex-1"
                  aria-label="Try signing in again"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleBackToSignIn}
                  variant="outline"
                  className="flex-1"
                  aria-label="Go back to sign in page"
                >
                  Back to Sign In
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                If this problem persists, try using email sign in or contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
