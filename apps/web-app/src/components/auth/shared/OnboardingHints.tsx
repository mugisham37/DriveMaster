/**
 * Onboarding Hints Components
 * Provides tooltips and help text for first-time users
 */

"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, X, Info, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingHintProps {
  title: string;
  description: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline onboarding hint card
 */
export function OnboardingHint({
  title,
  description,
  onDismiss,
  className = "",
}: OnboardingHintProps): React.ReactElement {
  return (
    <Card className={cn("border-blue-200 bg-blue-50", className)}>
      <CardContent className="flex items-start space-x-3 p-4">
        <Lightbulb className="h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-blue-900">{title}</h4>
          <p className="text-sm text-blue-700">{description}</p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
            aria-label="Dismiss hint"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Tooltip hint for inline help
 */
export function TooltipHint({
  content,
  children,
  side = "top",
}: {
  content: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}): React.ReactElement {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p className="max-w-xs text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * "What's this?" link for complex features
 */
export function WhatsThisLink({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1 text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-label="Show more information"
      >
        <Info className="h-3 w-3" />
        <span>What&apos;s this?</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-md border border-gray-200 bg-white p-3 shadow-lg animate-fade-in">
          <div className="flex items-start justify-between space-x-2">
            <p className="text-sm text-gray-700">{content}</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Feature introduction banner
 */
export function FeatureIntro({
  title,
  description,
  features,
  onDismiss,
  className = "",
}: {
  title: string;
  description: string;
  features: string[];
  onDismiss?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-700">{description}</p>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="ml-4 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for managing dismissed hints
 */
export function useDismissibleHint(hintId: string) {
  const [isDismissed, setIsDismissed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const dismissed = localStorage.getItem(`hint-dismissed-${hintId}`);
    return dismissed === "true";
  });

  const dismiss = React.useCallback(() => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`hint-dismissed-${hintId}`, "true");
    }
  }, [hintId]);

  const reset = React.useCallback(() => {
    setIsDismissed(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`hint-dismissed-${hintId}`);
    }
  }, [hintId]);

  return {
    isDismissed,
    dismiss,
    reset,
    shouldShow: !isDismissed,
  };
}

/**
 * Predefined hints for common authentication scenarios
 */
export const AuthHints = {
  PasswordStrength: {
    title: "Create a Strong Password",
    description:
      "Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols for better security.",
  },
  RememberMe: {
    title: "Remember Me",
    description:
      "Keep you signed in on this device. Only use this on your personal devices.",
  },
  OAuth: {
    title: "Sign in with Social Accounts",
    description:
      "Connect your social media accounts for faster sign-in and additional security options.",
  },
  MFA: {
    title: "Two-Factor Authentication",
    description:
      "Add an extra layer of security by requiring a verification code in addition to your password.",
  },
  Sessions: {
    title: "Active Sessions",
    description:
      "View and manage all devices where you're currently signed in. Revoke access from any device at any time.",
  },
  LinkedProviders: {
    title: "Linked Accounts",
    description:
      "Connect multiple login methods to your account for convenience and security. You can always sign in with any linked method.",
  },
};

