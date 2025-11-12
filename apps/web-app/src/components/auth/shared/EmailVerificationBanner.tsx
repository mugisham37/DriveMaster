"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * EmailVerificationBanner Component
 * 
 * Displays a banner prompting users to verify their email address.
 * Shows only when user is authenticated and email is not verified.
 * Allows resending verification email and dismissing the banner.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 14.1
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if:
  // - User is not authenticated
  // - Email is already verified
  // - Banner has been dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    
    try {
      // TODO: Implement API call to resend verification email
      // await authServiceClient.resendVerificationEmail();
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Verification email sent!", {
        description: "Please check your inbox and spam folder.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (error) {
      toast.error("Failed to send verification email", {
        description: "Please try again later or contact support.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    
    // Store dismissal in preferences
    // This could be persisted to backend or localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("emailVerificationBannerDismissed", "true");
    }
    
    toast.info("Banner dismissed", {
      description: "You can verify your email anytime from your profile.",
    });
  };

  return (
    <Alert 
      className="rounded-none border-x-0 border-t-0 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
      role="alert"
      aria-live="polite"
    >
      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <AlertDescription className="flex items-center justify-between gap-4 w-full">
        <div className="flex-1">
          <span className="font-medium text-blue-900 dark:text-blue-100">
            Verify your email address
          </span>
          <span className="text-blue-700 dark:text-blue-300 ml-2">
            Check your inbox for a verification link or resend it below.
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
            className="bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900"
            aria-label="Resend verification email"
            aria-busy={isResending}
          >
            {isResending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                <span className="sr-only">Sending...</span>
                Sending...
              </>
            ) : (
              "Resend Email"
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
            aria-label="Dismiss verification banner"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
