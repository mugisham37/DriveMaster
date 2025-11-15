"use client";

/**
 * VerificationBadge - Atomic Component
 * 
 * Shows verification status with icon and optional tooltip.
 * Color-coded by verification type.
 * 
 * Requirements: 12.2
 */

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, Shield, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerificationBadgeProps {
  verified: boolean;
  type: "email" | "mfa" | "identity";
  size?: "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

const typeConfig = {
  email: {
    icon: Mail,
    label: "Email Verified",
    description: "Your email address has been verified",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  mfa: {
    icon: Shield,
    label: "MFA Enabled",
    description: "Multi-factor authentication is active",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  identity: {
    icon: CheckCircle2,
    label: "Identity Verified",
    description: "Your identity has been verified",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
};

export function VerificationBadge({
  verified,
  type,
  size = "md",
  showTooltip = true,
  className,
}: VerificationBadgeProps) {
  if (!verified) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold",
        config.color,
        className,
      )}
    >
      <Icon className={sizeClasses[size]} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VerificationBadge;
