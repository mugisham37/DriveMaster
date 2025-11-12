"use client";

/**
 * OAuthCallbackPage Component
 * 
 * OAuth callback handler page for all providers
 * 
 * Features:
 * - OAuthCallbackHandler integration
 * - Loading state during callback processing
 * - Error boundary for OAuth errors
 * - Support for all OAuth providers (Google, Apple, Facebook, GitHub, Microsoft)
 * - Responsive design
 * - Full accessibility
 * 
 * Requirements: 3.3, 3.4, 3.5, 13.1, 14.1
 */

import React from "react";
import { useParams } from "next/navigation";
import { OAuthCallbackHandler } from "@/components/auth/oauth/OAuthCallbackHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OAuthProviderType } from "@/types/auth-service";

export function OAuthCallbackPage() {
  const params = useParams();
  const provider = params.provider as OAuthProviderType;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Completing sign in...
          </CardTitle>
        </CardHeader>

        <CardContent>
          <OAuthCallbackHandler provider={provider} />
        </CardContent>
      </Card>
    </div>
  );
}
