"use client";

/**
 * ResetPasswordPage Component
 * 
 * Password reset page with token validation
 * 
 * Features:
 * - Centered card layout
 * - ResetPasswordForm integration
 * - Token extraction from URL
 * - Token validation error display
 * - Success message and redirect
 * - Responsive design
 * - Full accessibility
 * 
 * Requirements: 9.2, 9.3, 9.4, 9.5, 15.1
 */

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/auth/signin">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label="Back to sign in"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset your password
          </CardTitle>
          <CardDescription>
            Enter a new password for your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
