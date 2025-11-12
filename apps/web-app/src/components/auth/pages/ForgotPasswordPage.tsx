"use client";

/**
 * ForgotPasswordPage Component
 * 
 * Password reset request page
 * 
 * Features:
 * - Centered card layout
 * - ForgotPasswordForm integration
 * - Back to sign in link
 * - Success message display
 * - Responsive design
 * - Full accessibility
 * 
 * Requirements: 9.1, 15.1
 */

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ForgotPasswordPage() {
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
            Forgot your password?
          </CardTitle>
          <CardDescription>
            No worries, we&apos;ll send you reset instructions
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
