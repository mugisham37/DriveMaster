import { Suspense } from "react";
import { Metadata } from "next";
import { EmailVerificationPage } from "@/components/auth/pages/EmailVerificationPage";
import { PageSpinner } from "@/components/auth/shared/LoadingState";

/**
 * Email Verification Route
 * 
 * Handles email verification flow when users click verification link.
 * Extracts token from URL query parameters and validates it.
 * 
 * Route: /auth/verify-email?token=<verification_token>
 * 
 * Requirements: 17.1, 17.2, 17.3
 */

export const metadata: Metadata = {
  title: "Verify Email - DriveMaster",
  description: "Verify your email address to complete your account setup",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EmailVerificationPage />
    </Suspense>
  );
}
