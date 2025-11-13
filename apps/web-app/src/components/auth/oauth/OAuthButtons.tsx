"use client";

/**
 * OAuthButtons Component
 * 
 * Displays OAuth provider buttons for social authentication
 * Supports login, register, and link modes
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.1, 15.1
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthErrorDisplay } from "../error-display";
import { useAuth } from "@/hooks/useAuth";
import type { OAuthProviderType, UserProfile } from "@/types/auth-service";
import { Loader2 } from "lucide-react";

// Provider configuration with brand colors and display names
const OAUTH_PROVIDERS = [
  {
    id: "google" as OAuthProviderType,
    name: "Google",
    color: "#4285F4",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: "github" as OAuthProviderType,
    name: "GitHub",
    color: "#181717",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    id: "microsoft" as OAuthProviderType,
    name: "Microsoft",
    color: "#00A4EF",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
      </svg>
    ),
  },
  {
    id: "apple" as OAuthProviderType,
    name: "Apple",
    color: "#000000",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: "facebook" as OAuthProviderType,
    name: "Facebook",
    color: "#1877F2",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
] as const;

export interface OAuthButtonsProps {
  mode?: "login" | "register" | "link";
  onSuccess?: (user: UserProfile) => void;
  redirectUrl?: string;
  excludeProviders?: OAuthProviderType[];
  className?: string;
}

export function OAuthButtons({
  mode = "login",
  onSuccess: _onSuccess, // eslint-disable-line @typescript-eslint/no-unused-vars
  redirectUrl,
  excludeProviders = [],
  className = "",
}: OAuthButtonsProps) {
  const { state } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderType | null>(null);

  // Filter out excluded providers
  const availableProviders = OAUTH_PROVIDERS.filter(
    (provider) => !excludeProviders.includes(provider.id)
  );

  const handleOAuthClick = async (provider: OAuthProviderType) => {
    setLoadingProvider(provider);
    
    try {
      // Import the OAuth client dynamically
      const { oauthClient } = await import("@/lib/auth/oauth-client");
      
      // Initiate OAuth flow
      const { authorizationUrl } = await oauthClient.initiateOAuth(
        provider,
        redirectUrl
      );
      
      // Redirect to OAuth provider
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(`OAuth ${mode} failed for ${provider}:`, error);
      setLoadingProvider(null);
    }
  };

  const getModeText = () => {
    switch (mode) {
      case "register":
        return "Sign up with";
      case "link":
        return "Link";
      default:
        return "Continue with";
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Display OAuth error if present */}
      {state.oauthError && (
        <AuthErrorDisplay
          error={state.oauthError}
          onDismiss={() => {
            // Clear OAuth error
            // This would need to be implemented in the auth context
          }}
        />
      )}

      {/* OAuth provider buttons - Stack vertically on mobile, 2 columns on larger screens */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
        {availableProviders.map((provider) => {
          const isLoading = loadingProvider === provider.id;
          const isAnyLoading = loadingProvider !== null || state.isOAuthLoading;

          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              className="w-full"
              disabled={isAnyLoading}
              onClick={() => handleOAuthClick(provider.id)}
              aria-label={`${getModeText()} ${provider.name}`}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Connecting to {provider.name}...</span>
                  <span aria-hidden="true">Connecting...</span>
                </>
              ) : (
                <>
                  <span className="mr-2" style={{ color: provider.color }} aria-hidden="true">
                    {provider.icon}
                  </span>
                  {getModeText()} {provider.name}
                </>
              )}
            </Button>
          );
        })}
      </div>

      {/* Divider for visual separation */}
      {mode !== "link" && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
